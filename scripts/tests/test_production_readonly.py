import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock

SPEC = importlib.util.spec_from_file_location("production", Path(__file__).resolve().parents[1] / "production-readonly-preflight.py")
production = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(production)


class ProductionMetadataTests(unittest.TestCase):
    def test_only_exact_metadata_routes_can_receive_credentials(self):
        for url in [*production.URLS.values(), "https://firebaserules.googleapis.com/v1/projects/caravana-af306/rulesets/test-id"]:
            self.assertTrue(production.allowed(url))
        for url in [production.URLS["project"].replace("caravana-af306", "bdall-e3585"),
                    "https://firestore.googleapis.com/v1/projects/caravana-af306/databases/(default)/documents",
                    "https://identitytoolkit.googleapis.com/v1/projects/caravana-af306/accounts:batchGet",
                    production.URLS["project"] + "?foreign=true", "https://evil.invalid/"]:
            opener = Mock()
            with self.assertRaises(production.Blocked):
                production.Reader("SYNTHETIC", opener).read("test", url)
            opener.open.assert_not_called()

    def test_wrong_identity_stops_before_project_or_business_data(self):
        reader = Mock()
        reader.read.return_value = {"email": "other@example.invalid", "email_verified": True}
        with self.assertRaisesRegex(production.Blocked, "identity_mismatch"):
            production.preflight(reader, {})
        self.assertEqual(reader.read.call_count, 1)

    def test_wrong_project_stops_before_billing_or_rules(self):
        reader = Mock()
        reader.read.side_effect = [{"email": production.PRINCIPAL, "email_verified": True}, {"projectId": "bdall-e3585", "state": "ACTIVE", "projectNumber": "123"}]
        with self.assertRaisesRegex(production.Blocked, "project_identity_mismatch"):
            production.preflight(reader, {})
        self.assertEqual(reader.read.call_count, 2)

    def test_http_failure_does_not_disclose_payload_or_token(self):
        opener = Mock()
        opener.open.side_effect = ValueError("SECRET_OR_PERSONAL_DATA")
        with self.assertRaisesRegex(production.Blocked, "^project_transport_error_raw_details_suppressed$"):
            production.Reader("SYNTHETIC", opener).read("project", production.URLS["project"])
        request = opener.open.call_args.args[0]
        self.assertEqual(request.method, "GET")
        self.assertNotIn("X-goog-user-project", request.headers)

    def test_fixed_consumer_header_is_limited_to_exact_production_auth_config(self):
        opener = Mock()
        opener.open.side_effect = ValueError("PRIVATE_RESPONSE")
        for resource, url in production.URLS.items():
            with self.assertRaises(production.Blocked):
                production.Reader("SYNTHETIC", opener).read(resource, url)
            headers = {k.lower(): v for k, v in opener.open.call_args.args[0].header_items()}
            if resource == "authConfig":
                self.assertEqual(headers["x-goog-user-project"], "caravana-af306")
            else:
                self.assertNotIn("x-goog-user-project", headers)


if __name__ == "__main__":
    unittest.main()
