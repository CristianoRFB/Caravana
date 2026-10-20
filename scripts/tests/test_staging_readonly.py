import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
import urllib.error

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("staging_readonly", ROOT / "scripts/staging-readonly-audit.py")
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


def fixture():
    indexes = json.loads((ROOT / "firestore.indexes.json").read_text())["indexes"]
    remote = [{"name": f"projects/{audit.PROJECT}/databases/(default)/collectionGroups/{item['collectionGroup']}/indexes/test-{index}", "state": "READY", "queryScope": item["queryScope"], "fields": item["fields"] + [{"fieldPath": "__name__", "order": "ASCENDING"}]} for index, item in enumerate(indexes)]
    return {
        "identity": {"email": audit.PRINCIPAL, "email_verified": True, "name": "DO_NOT_REPORT_IDENTITY_PROFILE"},
        "project": {"projectId": audit.PROJECT, "projectNumber": audit.PROJECT_NUMBER, "state": "ACTIVE"},
        "billing": {"billingEnabled": False},
        "database": {"name": f"projects/{audit.PROJECT}/databases/(default)", "databaseEdition": "STANDARD", "freeTier": True},
        "release": {"rulesetName": f"projects/{audit.PROJECT}/rulesets/synthetic-rules"},
        "ruleset": {"source": {"files": [{"name": "firestore.rules", "content": (ROOT / "firestore.rules").read_text()}]}},
        "indexes": {"indexes": remote},
        "auth": {"signIn": {"email": {"enabled": True, "passwordRequired": True}}, "emailPrivacyConfig": {"enableImprovedEmailPrivacy": True}, "passwordPolicyConfig": {"passwordPolicyEnforcementState": "ENFORCE", "passwordPolicyVersions": [{"customStrengthOptions": {"minPasswordLength": 12}}]}, "authorizedDomains": ["caravana77-staging.pages.dev", "DO_NOT_REPORT_EXTRA_DOMAIN"]},
    }


class FakeReader:
    def __init__(self, data):
        self.data, self.calls = data, []

    def read(self, resource, url):
        if not audit.allowed_url(url):
            raise AssertionError("Guard missing")
        self.calls.append(resource)
        return copy.deepcopy(self.data[resource])


class AuditTests(unittest.TestCase):
    def test_complete_readonly_audit_and_sanitized_report(self):
        reader, report = FakeReader(fixture()), {}
        audit.audit(reader, report)
        self.assertEqual(report["status"], "PASS_STAGING_READONLY_CONFIGURATION")
        self.assertEqual(reader.calls, ["identity", "project", "billing", "database", "release", "ruleset", "indexes", "auth"])
        self.assertNotIn("DO_NOT_REPORT", json.dumps(report))
        self.assertEqual(report["compositeIndexes"]["ready"], 11)

    def test_no_production_or_unlisted_route_is_allowed(self):
        urls = [
            audit.ROUTES["project"].replace(audit.PROJECT, "caravana-af306"),
            audit.ROUTES["project"] + "/documents",
            audit.ROUTES["project"] + "?project=caravana-af306",
            audit.ROUTES["project"].replace("https:", "http:"),
            "https://firebase.googleapis.com.evil.invalid/",
            "https://firestore.googleapis.com/v1/projects/bdall-e3585/databases/(default)/documents",
        ]
        for url in urls:
            with self.subTest(url=url):
                self.assertFalse(audit.allowed_url(url))
                opener = Mock()
                with self.assertRaises(audit.Blocked):
                    audit.Reader("SYNTHETIC_TOKEN", opener).read("project", url)
                opener.open.assert_not_called()

    def test_foreign_ruleset_never_receives_authorization(self):
        data = fixture()
        for name in ["projects/caravana-af306/rulesets/other", "projects/bdall-e3585/rulesets/../../production", "projects/bdall-e3585/rulesets/test?x=1"]:
            data["release"]["rulesetName"] = name
            reader = FakeReader(data)
            with self.assertRaisesRegex(audit.Blocked, "foreign_or_invalid_ruleset"):
                audit.audit(reader, {})
            self.assertNotIn("ruleset", reader.calls)

    def test_identity_checked_before_any_project_request(self):
        for identity in [{"email": "other@example.invalid", "email_verified": True}, {"email": audit.PRINCIPAL, "email_verified": False}]:
            data = fixture()
            data["identity"] = identity
            reader = FakeReader(data)
            with self.assertRaises(audit.Blocked):
                audit.audit(reader, {})
            self.assertEqual(reader.calls, ["identity"])

    def test_wrong_project_number_stops_before_billing(self):
        data = fixture()
        data["project"]["projectNumber"] = "123"
        reader = FakeReader(data)
        with self.assertRaisesRegex(audit.Blocked, "project_identity"):
            audit.audit(reader, {})
        self.assertEqual(reader.calls, ["identity", "project"])

    def test_paid_or_wrong_database_stops_early(self):
        for key, value in [("billing", {"billingEnabled": True}), ("billing", {"billingEnabled": False, "billingAccountName": "synthetic"}), ("database", {"name": f"projects/{audit.PROJECT}/databases/(default)", "databaseEdition": "ENTERPRISE", "freeTier": True})]:
            data = fixture()
            data[key] = value
            reader = FakeReader(data)
            with self.assertRaises(audit.Blocked):
                audit.audit(reader, {})
            self.assertNotIn("release", reader.calls)

    def test_rules_or_index_drift_is_blocked_without_fixing_remote_resources(self):
        for change in ["rules", "fields", "state", "pagination"]:
            data = fixture()
            if change == "rules":
                data["ruleset"]["source"]["files"][0]["content"] += "\n"
            elif change == "fields":
                data["indexes"]["indexes"][0]["fields"][0]["order"] = "DESCENDING"
            elif change == "state":
                data["indexes"]["indexes"][0]["state"] = "CREATING"
            else:
                data["indexes"]["nextPageToken"] = "DO_NOT_REPORT_PAGE_TOKEN"
            with self.subTest(change=change), self.assertRaises(audit.Blocked):
                audit.audit(FakeReader(data), {})

    def test_auth_policy_drift_does_not_receive_pass(self):
        data = fixture()
        data["auth"]["signIn"]["anonymous"] = {"enabled": True}
        report = {}
        with self.assertRaisesRegex(audit.Blocked, "auth_configuration"):
            audit.audit(FakeReader(data), report)
        self.assertNotIn("status", report)

    def test_http_is_get_and_errors_never_echo_secrets(self):
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError(audit.ROUTES["project"], 403, "SYNTHETIC_TOKEN", {}, io.BytesIO(b"PRIVATE_RESPONSE"))
        reader = audit.Reader("SYNTHETIC_TOKEN", opener)
        with self.assertRaises(audit.Blocked) as caught:
            reader.read("project", audit.ROUTES["project"])
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(str(caught.exception), "project_http_403")
        self.assertIsNone(audit.NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.invalid"))

    def test_index_request_matches_cli_without_optional_parameters(self):
        self.assertEqual(audit.ROUTES["indexes"], "https://firestore.googleapis.com/v1/projects/bdall-e3585/databases/(default)/collectionGroups/-/indexes")
        self.assertFalse(audit.allowed_url(audit.ROUTES["indexes"] + "?pageSize=100"))

    def test_structured_http_diagnostic_drops_messages_metadata_and_unknown_fields(self):
        body = {"error": {"status": "INVALID_ARGUMENT", "message": "PRIVATE_RESPONSE", "details": [
            {"@type": "type.googleapis.com/google.rpc.BadRequest", "fieldViolations": [{"field": "page_size", "description": "PRIVATE_RESPONSE"}, {"field": "PRIVATE_RESPONSE"}]},
            {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "SERVICE_DISABLED", "metadata": {"token": "PRIVATE_RESPONSE"}},
            {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "PRIVATE_RESPONSE"},
        ]}}
        opener = Mock()
        opener.open.side_effect = urllib.error.HTTPError(audit.ROUTES["indexes"], 400, "PRIVATE_RESPONSE", {}, io.BytesIO(json.dumps(body).encode()))
        reader = audit.Reader("SYNTHETIC_TOKEN", opener)
        with self.assertRaisesRegex(audit.Blocked, "indexes_http_400"):
            reader.read("indexes", audit.ROUTES["indexes"])
        self.assertEqual(reader.diagnostics, [{"resource": "indexes", "httpStatus": 400, "googleStatus": "INVALID_ARGUMENT", "invalidFields": ["page_size"], "googleReasons": ["SERVICE_DISABLED"]}])
        self.assertNotIn("PRIVATE_RESPONSE", json.dumps(reader.diagnostics))

    def test_malformed_large_or_untrusted_error_payload_is_not_reported(self):
        for body in [b"PRIVATE_RESPONSE", b"x" * 32769, b'{"error":{"status":"PRIVATE_RESPONSE"}}', b'[]']:
            error = urllib.error.HTTPError(audit.ROUTES["indexes"], 400, "PRIVATE_RESPONSE", {}, io.BytesIO(body))
            self.assertEqual(audit.http_diagnostic("indexes", error), {"resource": "indexes", "httpStatus": 400})

    def test_line_ending_difference_is_reported_but_does_not_bypass_gate(self):
        data, report = fixture(), {}
        data["ruleset"]["source"]["files"][0]["content"] = data["ruleset"]["source"]["files"][0]["content"].replace("\n", "\r\n")
        with self.assertRaisesRegex(audit.Blocked, "deployed_rules_or_indexes"):
            audit.audit(FakeReader(data), report)
        self.assertFalse(report["firestoreRules"]["candidateMatch"])
        self.assertTrue(report["firestoreRules"]["lfNormalizedCandidateMatch"])
        self.assertNotIn("status", report)

    def test_gcloud_uses_exact_account_and_project_without_exposing_output(self):
        with patch.object(audit.subprocess, "run") as run:
            run.return_value.stdout = "SYNTHETIC_TOKEN\n"
            self.assertEqual(audit.gcloud_command(["auth", "print-access-token", f"--account={audit.PRINCIPAL}"]), "SYNTHETIC_TOKEN")
            self.assertEqual(run.call_args.args[0], ["gcloud", "auth", "print-access-token", f"--account={audit.PRINCIPAL}", "--quiet", "--project=bdall-e3585"])
            self.assertTrue(run.call_args.kwargs["capture_output"])

    def test_no_managed_identity_or_wrong_account_fails_without_network(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(audit.shutil, "which", return_value=None):
            with self.assertRaisesRegex(audit.Blocked, "gcloud_not_available"):
                audit.managed_token("gcloud")
            with self.assertRaisesRegex(audit.Blocked, "not_configured"):
                audit.managed_token("managed-adc")
        with patch.dict(os.environ, {}, clear=True), patch.object(audit.shutil, "which", return_value="gcloud"), patch.object(audit, "gcloud_command", return_value="wrong@example.invalid") as command:
            with self.assertRaisesRegex(audit.Blocked, "account_mismatch"):
                audit.managed_token("gcloud")
            self.assertEqual(command.call_count, 1)

    def test_legacy_token_and_emulators_are_rejected(self):
        for key in ["FIREBASE_TOKEN", "FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]:
            with patch.dict(os.environ, {key: "SYNTHETIC_VALUE"}, clear=True), self.assertRaisesRegex(audit.Blocked, "rejected"):
                audit.managed_token("gcloud")

    def test_managed_manifest_must_select_one_complete_gcp_connection(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest = Path(folder) / "manifest.json"
            for contents in [{"version": 2}, {"version": 1, "connections": []}, {"version": 1, "connections": [{"alias": "test-alias", "provider_kind": "gcp"}]}]:
                manifest.write_text(json.dumps(contents))
                with patch.dict(os.environ, {"OIC_MANIFEST_PATH": str(manifest), "CARAVANA_GCP_IDENTITY_ALIAS": "test-alias"}, clear=True), self.assertRaises(audit.Blocked):
                    audit.managed_token("managed-adc")

    def test_contract_hashes_match_repository_and_server_implicit_fields(self):
        self.assertEqual(hashlib.sha256((ROOT / "firestore.rules").read_bytes()).hexdigest(), audit.RULES_SHA256)
        self.assertEqual(audit.index_fingerprint(list(reversed(fixture()["indexes"]["indexes"]))), audit.INDEXES_SHA256)

    def test_managed_adc_rejects_private_key_credentials_before_refresh(self):
        import google.auth
        from google.oauth2 import service_account
        with tempfile.TemporaryDirectory() as folder:
            manifest = Path(folder) / "manifest.json"
            manifest.write_text(json.dumps({"version": 1, "connections": [{"alias": "test-alias", "provider_kind": "gcp", "credentials_file": "/not-read.json", "config_dir": folder, "configuration_name": "test-profile"}]}))
            credentials = Mock(spec=service_account.Credentials)
            with patch.dict(os.environ, {"OIC_MANIFEST_PATH": str(manifest), "CARAVANA_GCP_IDENTITY_ALIAS": "test-alias"}, clear=True), patch.object(google.auth, "default", return_value=(credentials, None)) as default:
                with self.assertRaisesRegex(audit.Blocked, "private_key_not_supported"):
                    audit.managed_token("managed-adc")
                credentials.refresh.assert_not_called()
                self.assertIn("https://www.googleapis.com/auth/cloud-platform.read-only", default.call_args.kwargs["scopes"])

    def test_failure_report_masks_exceptions_and_atomic_file_is_private(self):
        with patch.object(audit, "managed_token", side_effect=RuntimeError("SYNTHETIC_TOKEN")), patch("sys.stdout", new_callable=io.StringIO) as output:
            self.assertEqual(audit.main([]), 1)
            report = json.loads(output.getvalue())
            self.assertEqual(report["requests"], [])
            self.assertNotIn("SYNTHETIC_TOKEN", output.getvalue())
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / "report.json"
            destination.write_text("old report")
            destination.chmod(0o644)
            audit.write_report(destination, report)
            self.assertEqual(json.loads(destination.read_text()), report)
            if os.name != "nt":
                self.assertEqual(destination.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
