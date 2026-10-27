#!/usr/bin/env python3
"""Read-only staging metadata audit; no Firebase login codes or private keys.

Default: Google Cloud Shell's existing managed gcloud session.
Optional: an explicitly selected managed GCP connection using ADC.
Neither mode grants IAM permissions, enables APIs, or reads business documents.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
import urllib.error
import urllib.request

PROJECT = "bdall-e3585"
PROJECT_NUMBER = "146882624278"
PRINCIPAL = "crisf.bueno10@gmail.com"
RULES_SHA256 = "c605fcf1b1d3a4dee7b1ade56369ac4c4174e3752c16888b28e9c5fc72382d81"
INDEXES_SHA256 = "63d6eb0d3ccae2def9399f9a4fbe91b1e051ce4bc7373b39e3940f7efc835238"
IDENTITY_URL = "https://openidconnect.googleapis.com/v1/userinfo"
ROUTES = {
    "project": f"https://firebase.googleapis.com/v1beta1/projects/{PROJECT}",
    "billing": f"https://cloudbilling.googleapis.com/v1/projects/{PROJECT}/billingInfo",
    "database": f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)",
    "release": f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/releases/cloud.firestore",
    # Match the official Firebase CLI listIndexes request (no optional query).
    "indexes": f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/collectionGroups/-/indexes",
    "auth": f"https://identitytoolkit.googleapis.com/admin/v2/projects/{PROJECT}/config",
}


class Blocked(Exception):
    """Only fixed, non-sensitive reason codes may reach the report."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def http_diagnostic(resource, error):
    """Expose only fixed enums; never echo remote messages, metadata or URLs."""
    result = {"resource": resource, "httpStatus": error.code}
    try:
        payload = error.read(32769)
        if len(payload) > 32768:
            return result
        body = json.loads(payload).get("error", {})
        status = body.get("status")
        if status in {"INVALID_ARGUMENT", "PERMISSION_DENIED", "UNAUTHENTICATED", "NOT_FOUND", "FAILED_PRECONDITION", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"}:
            result["googleStatus"] = status
        fields = set()
        reasons = set()
        services = set()
        consumers = set()
        permissions = set()
        for detail in body.get("details", []):
            if detail.get("@type") == "type.googleapis.com/google.rpc.BadRequest":
                for violation in detail.get("fieldViolations", []):
                    field = violation.get("field")
                    if field in {"page_size", "pageSize", "page_token", "pageToken", "parent", "filter"}:
                        fields.add(field)
            elif detail.get("@type") == "type.googleapis.com/google.rpc.ErrorInfo":
                reason = detail.get("reason")
                if reason in {"SERVICE_DISABLED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "IAM_PERMISSION_DENIED", "BILLING_DISABLED", "RATE_LIMIT_EXCEEDED", "CONSUMER_INVALID"}:
                    reasons.add(reason)
                metadata = detail.get("metadata", {})
                if not isinstance(metadata, dict):
                    continue
                service = metadata.get("service")
                if isinstance(service, str) and service in {"identitytoolkit.googleapis.com", "firebase.googleapis.com", "firebaserules.googleapis.com", "firestore.googleapis.com", "cloudbilling.googleapis.com", "serviceusage.googleapis.com"}:
                    services.add(service)
                consumer = metadata.get("consumer")
                if consumer in (f"projects/{PROJECT}", f"projects/{PROJECT_NUMBER}"):
                    consumers.add("STAGING_PROJECT")
                elif isinstance(consumer, str) and re.fullmatch(r"projects/[0-9]{1,20}", consumer):
                    consumers.add("OTHER_PROJECT")
                elif consumer is not None:
                    consumers.add("UNRECOGNIZED")
                permission = metadata.get("permission")
                if isinstance(permission, str) and permission in {"firebaseauth.configs.get", "serviceusage.services.use", "datastore.indexes.list", "datastore.databases.get", "firebase.projects.get", "resourcemanager.projects.get", "firebaserules.releases.get", "firebaserules.rulesets.get"}:
                    permissions.add(permission)
        if fields:
            result["invalidFields"] = sorted(fields)
        if reasons:
            result["googleReasons"] = sorted(reasons)
        if services:
            result["googleServices"] = sorted(services)
        if consumers:
            result["consumerProjects"] = sorted(consumers)
        if permissions:
            result["googlePermissions"] = sorted(permissions)
    except Exception:
        pass  # Malformed/oversized bodies remain a sanitized HTTP status only.
    return result


def ruleset_url(name):
    if not isinstance(name, str) or not re.fullmatch(
        rf"projects/{PROJECT}/rulesets/[A-Za-z0-9_-]{{1,128}}", name
    ):
        raise Blocked("foreign_or_invalid_ruleset")
    return f"https://firebaserules.googleapis.com/v1/{name}"


def allowed_url(url):
    if url in [IDENTITY_URL, *ROUTES.values()]:
        return True
    prefix = "https://firebaserules.googleapis.com/v1/"
    if not url.startswith(prefix):
        return False
    try:
        return ruleset_url(url[len(prefix):]) == url
    except Blocked:
        return False


class Reader:
    def __init__(self, token, opener=None):
        if not isinstance(token, str) or not re.fullmatch(r"[^\s]{1,16384}", token):
            raise Blocked("invalid_managed_token")
        self._token = token
        self._opener = opener or urllib.request.build_opener(NoRedirect)
        self.calls = []
        self.diagnostics = []

    def read(self, resource, url):
        if not allowed_url(url):
            raise Blocked("request_outside_readonly_allowlist")
        request = urllib.request.Request(
            url, headers={"Authorization": "Bearer " + self._token}, method="GET"
        )
        # Explicit user-approved selection, limited to the exact staging Auth GET.
        # No persistent gcloud/ADC quota configuration is changed.
        if url == ROUTES["auth"]:
            request.add_header("x-goog-user-project", PROJECT)
        self.calls.append(resource)
        try:
            with self._opener.open(request, timeout=20) as response:
                if response.status != 200:
                    raise Blocked(f"{resource}_unexpected_http_status")
                data = response.read(2_000_001)
                if len(data) > 2_000_000:
                    raise Blocked(f"{resource}_response_too_large")
                result = json.loads(data)
                if not isinstance(result, dict):
                    raise Blocked(f"{resource}_invalid_json_object")
                return result
        except urllib.error.HTTPError as error:
            self.diagnostics.append(http_diagnostic(resource, error))
            raise Blocked(f"{resource}_http_{error.code}") from None
        except Blocked:
            raise
        except Exception:
            raise Blocked(f"{resource}_transport_or_json_error") from None


def gcloud_command(arguments):
    try:
        return subprocess.run(
            ["gcloud", *arguments, "--quiet", f"--project={PROJECT}"],
            capture_output=True, text=True, check=True, timeout=30,
        ).stdout.strip()
    except Exception:
        raise Blocked("managed_gcloud_session_unavailable") from None


def managed_token(source):
    # Long-lived, manually supplied bearer tokens are deliberately unsupported.
    if os.environ.get("FIREBASE_TOKEN") or os.environ.get("FIRESTORE_EMULATOR_HOST") or os.environ.get("FIREBASE_AUTH_EMULATOR_HOST"):
        raise Blocked("legacy_token_or_emulator_environment_rejected")
    if source == "gcloud":
        if not shutil.which("gcloud"):
            raise Blocked("gcloud_not_available_use_google_cloud_shell")
        active = gcloud_command(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
        if active != PRINCIPAL:
            raise Blocked("active_google_account_mismatch")
        return gcloud_command(["auth", "print-access-token", f"--account={PRINCIPAL}"])

    manifest_path = os.environ.get("OIC_MANIFEST_PATH")
    alias = os.environ.get("CARAVANA_GCP_IDENTITY_ALIAS")
    if not manifest_path or not alias:
        raise Blocked("managed_gcp_connection_not_configured")
    try:
        manifest = json.loads(Path(manifest_path).read_text())  # Non-secret runtime manifest only.
        matches = [c for c in manifest.get("connections", []) if c.get("alias") == alias and c.get("provider_kind") == "gcp"]
        if manifest.get("version") != 1 or len(matches) != 1:
            raise Blocked("managed_gcp_identity_selection_invalid")
        selected = matches[0]
        selectors = {"GOOGLE_APPLICATION_CREDENTIALS": "credentials_file", "CLOUDSDK_CONFIG": "config_dir", "CLOUDSDK_ACTIVE_CONFIG_NAME": "configuration_name"}
        if any(not isinstance(selected.get(field), str) or not selected[field] for field in selectors.values()):
            raise Blocked("managed_gcp_identity_setup_incomplete")
        for variable, field in selectors.items():
            os.environ[variable] = selected[field]
        os.environ["GOOGLE_CLOUD_PROJECT"] = PROJECT
        import google.auth
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
        credentials, _ = google.auth.default(scopes=[
            "https://www.googleapis.com/auth/cloud-platform.read-only",
            "openid", "https://www.googleapis.com/auth/userinfo.email",
        ])
        if isinstance(credentials, service_account.Credentials):
            raise Blocked("service_account_private_key_not_supported")
        credentials.refresh(Request())
        return credentials.token
    except Blocked:
        raise
    except ImportError:
        raise Blocked("install_pinned_managed_adc_dependencies") from None
    except Exception:
        raise Blocked("managed_adc_authentication_failed") from None


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def index_fingerprint(indexes):
    descriptors = []
    for index in indexes:
        name = index.get("name", "")
        found = re.fullmatch(rf"projects/{PROJECT}/databases/\(default\)/collectionGroups/([A-Za-z0-9_-]+)/indexes/[A-Za-z0-9_-]+", name)
        if not found:
            raise Blocked("foreign_or_invalid_index")
        # __name__ is added implicitly by the Firestore API.
        fields = [field for field in index.get("fields", []) if field.get("fieldPath") != "__name__"]
        descriptors.append({"collectionGroup": found[1], "queryScope": index.get("queryScope"), "fields": fields})
    return digest(sorted(descriptors, key=lambda item: json.dumps(item, sort_keys=True, separators=(",", ":"))))


def audit(reader, report):
    identity = reader.read("identity", IDENTITY_URL)
    if identity.get("email") != PRINCIPAL or identity.get("email_verified") is not True:
        raise Blocked("verified_google_identity_mismatch")
    report["identityVerified"] = True
    project = reader.read("project", ROUTES["project"])
    if (project.get("projectId"), str(project.get("projectNumber")), project.get("state")) != (PROJECT, PROJECT_NUMBER, "ACTIVE"):
        raise Blocked("staging_project_identity_mismatch")
    report["projectIdentityVerified"] = True
    billing = reader.read("billing", ROUTES["billing"])
    if billing.get("billingEnabled") is not False or billing.get("billingAccountName"):
        raise Blocked("staging_free_billing_guard_failed")
    report["billingEnabled"] = False
    database = reader.read("database", ROUTES["database"])
    if database.get("name") != f"projects/{PROJECT}/databases/(default)" or database.get("databaseEdition") != "STANDARD" or database.get("freeTier") is not True:
        raise Blocked("staging_database_identity_or_free_tier_mismatch")
    report["standardFreeTierVerified"] = True
    release = reader.read("release", ROUTES["release"])
    rules = reader.read("ruleset", ruleset_url(release.get("rulesetName")))
    files = rules.get("source", {}).get("files", [])
    if len(files) != 1 or not isinstance(files[0].get("content"), str):
        raise Blocked("firestore_rules_source_requires_review")
    rules_hash = hashlib.sha256(files[0]["content"].encode()).hexdigest()
    content = files[0]["content"]
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    crlf = content.count("\r\n")
    report["firestoreRules"] = {
        "sha256": rules_hash, "candidateMatch": rules_hash == RULES_SHA256,
        "lfNormalizedSha256": hashlib.sha256(normalized.encode()).hexdigest(),
        "lfNormalizedCandidateMatch": hashlib.sha256(normalized.encode()).hexdigest() == RULES_SHA256,
        "utf8Bytes": len(content.encode()),
        "lineEndings": {"crlf": crlf, "loneCr": content.count("\r") - crlf,
                        "loneLf": content.count("\n") - crlf},
    }
    result = reader.read("indexes", ROUTES["indexes"])
    if result.get("nextPageToken"):
        raise Blocked("index_inventory_incomplete_no_partial_approval")
    indexes = result.get("indexes", [])
    signature = index_fingerprint(indexes)
    ready = sum(index.get("state") == "READY" for index in indexes)
    report["compositeIndexes"] = {"count": len(indexes), "ready": ready, "sha256": signature, "candidateMatch": signature == INDEXES_SHA256}
    report["requestedAuthConsumer"] = "STAGING_PROJECT"
    auth = reader.read("auth", ROUTES["auth"])
    policy = auth.get("passwordPolicyConfig", {})
    versions = policy.get("passwordPolicyVersions", [])
    minimum = versions[0].get("customStrengthOptions", {}).get("minPasswordLength") if versions else None
    report["auth"] = {
        "emailPasswordEnabled": auth.get("signIn", {}).get("email", {}).get("enabled") is True and auth.get("signIn", {}).get("email", {}).get("passwordRequired") is True,
        "anonymousEnabled": auth.get("signIn", {}).get("anonymous", {}).get("enabled") is True,
        "emailEnumerationProtection": auth.get("emailPrivacyConfig", {}).get("enableImprovedEmailPrivacy") is True,
        "passwordPolicyEnforced": policy.get("passwordPolicyEnforcementState") == "ENFORCE",
        "passwordMinimumLength": minimum,
        "stagingDomainAuthorized": "caravana77-staging.pages.dev" in auth.get("authorizedDomains", []),
    }
    if rules_hash != RULES_SHA256 or signature != INDEXES_SHA256 or ready != len(indexes):
        raise Blocked("deployed_rules_or_indexes_require_comparison")
    if not all([report["auth"]["emailPasswordEnabled"], not report["auth"]["anonymousEnabled"], report["auth"]["emailEnumerationProtection"], report["auth"]["passwordPolicyEnforced"], isinstance(minimum, int) and minimum >= 12, report["auth"]["stagingDomainAuthorized"]]):
        raise Blocked("staging_auth_configuration_requires_review")
    report["status"] = "PASS_STAGING_READONLY_CONFIGURATION"


def write_report(destination, report):
    target = Path(destination)
    fd, temporary = tempfile.mkstemp(prefix=".caravana-audit-", dir=target.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(report, stream, indent=2)
            stream.write("\n")
        os.replace(temporary, target)  # Report only; never a credential cache.
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--auth-source", choices=["gcloud", "managed-adc"], default="gcloud")
    parser.add_argument("--output", help="Optional sanitized JSON report; never contains credentials.")
    arguments = parser.parse_args(argv)
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "projectId": PROJECT, "expectedPrincipal": PRINCIPAL, "authSource": arguments.auth_source, "scriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "status": "BLOCKED", "projectWrites": 0, "productionAccess": False, "businessDocumentsRead": False, "credentialsExported": False}
    reader = None
    try:
        reader = Reader(managed_token(arguments.auth_source))
        audit(reader, report)
    except Blocked as error:
        report["reason"] = str(error)
    except Exception:
        report["reason"] = "unexpected_local_audit_failure_details_suppressed"
    report["requests"] = reader.calls if reader else []
    if reader and reader.diagnostics:
        report["httpDiagnostics"] = reader.diagnostics
    if arguments.output:
        write_report(arguments.output, report)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS_STAGING_READONLY_CONFIGURATION" else 1


if __name__ == "__main__":
    sys.exit(main())
