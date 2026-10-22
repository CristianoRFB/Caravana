import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("reconcile", ROOT / "scripts/reconcile-staging-rules.py")
reconcile = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reconcile)


class ReconcileTests(unittest.TestCase):
    def test_exact_reviewed_crlf_source_converts_to_exact_git_bytes(self):
        content = (ROOT / "firestore.rules").read_bytes().decode("utf-8")
        original = content.replace("\n", "\r\n")
        self.assertEqual(reconcile.sha(original), reconcile.OLD_HASH)
        source = {"files": [{"name": "firestore.rules", "content": original}]}
        result = reconcile.candidate(source)
        self.assertEqual(result["files"][0]["content"], content)
        self.assertEqual(reconcile.sha(content), reconcile.audit.RULES_SHA256)
        self.assertEqual(source["files"][0]["content"], original)

    def test_modified_or_additional_rules_cannot_be_deployed(self):
        content = (ROOT / "firestore.rules").read_bytes().decode("utf-8")
        for files in [[], [{"name": "storage.rules", "content": content}],
                      [{"name": "firestore.rules", "content": content + "\n"}],
                      [{"name": "firestore.rules", "content": content}] * 2]:
            with self.assertRaises(reconcile.audit.Blocked):
                reconcile.candidate({"files": files})

    def test_missing_preflight_cannot_be_approved(self):
        with self.assertRaises(reconcile.audit.Blocked):
            reconcile.require_preflight({})

    def test_foreign_or_unlisted_write_never_sends_request(self):
        with patch.object(reconcile.urllib.request, "build_opener") as opener:
            for method, url in [("DELETE", reconcile.CREATE_URL), ("POST", reconcile.CREATE_URL.replace("bdall-e3585", "caravana-af306")),
                                ("PATCH", reconcile.CREATE_URL), ("POST", reconcile.audit.ROUTES["auth"])]:
                with self.assertRaises(reconcile.audit.Blocked):
                    reconcile.write_request("SYNTHETIC", method, url, {})
            opener.assert_not_called()

    def test_concurrent_release_change_never_overwrites(self):
        reader = Mock()
        reader.read.return_value = {"rulesetName": "projects/bdall-e3585/rulesets/other"}
        with patch.object(reconcile, "write_request") as write:
            with self.assertRaisesRegex(reconcile.audit.Blocked, "release_changed"):
                reconcile.point_release("SYNTHETIC", reader, "projects/bdall-e3585/rulesets/before", "projects/bdall-e3585/rulesets/after")
            write.assert_not_called()

    def test_foreign_rollback_pointer_stops_before_network(self):
        reader = Mock()
        with self.assertRaises(reconcile.audit.Blocked):
            reconcile.point_release("SYNTHETIC", reader, "projects/bdall-e3585/rulesets/before", "projects/caravana-af306/rulesets/after")
        reader.read.assert_not_called()

    def test_write_failure_suppresses_sensitive_remote_error(self):
        with patch.object(reconcile.urllib.request, "build_opener") as opener:
            opener.return_value.open.side_effect = ValueError("PRIVATE_TOKEN_OR_PAYLOAD")
            with self.assertRaisesRegex(reconcile.audit.Blocked, "^rules_write_failed_raw_details_suppressed$"):
                reconcile.write_request("SYNTHETIC", "POST", reconcile.CREATE_URL, {})


if __name__ == "__main__":
    unittest.main()
