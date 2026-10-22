import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch, Mock, MagicMock

SPEC = importlib.util.spec_from_file_location("inventory", Path(__file__).resolve().parents[1] / "production-structural-inventory.py")
inventory = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inventory)


def text(value):
    return {"stringValue": value}


class InventoryTests(unittest.TestCase):
    def test_report_contains_counts_without_private_values_ids_or_unknown_names(self):
        root = inventory.PREFIX
        data = {root + "/organizations/PRIVATE_ORG": {},
                root + "/caravans/PRIVATE_TRIP": {"organizationId": text("PRIVATE_ORG")},
                root + "/registrations/PRIVATE_REG": {"organizationId": text("PRIVATE_ORG"), "caravanId": text("PRIVATE_TRIP"), "passengerName": text("PRIVATE_NAME"), "phone": text("PRIVATE_PHONE"), "amountCents": {"integerValue": "10000"}},
                root + "/PRIVATE_COLLECTION/PRIVATE_DOC": {"PRIVATE_FIELD": text("PRIVATE_PAYLOAD")}}
        result = inventory.summarize(data)
        self.assertNotIn("PRIVATE", json.dumps(result))
        self.assertNotIn("10000", json.dumps(result))
        self.assertEqual(result["documentCount"], 4)
        self.assertEqual(result["relationships"], {"missingOrganizationReferences": 0, "missingCaravanReferences": 0, "crossOrganizationReferences": 0})
        self.assertEqual(result["collectionCounts"]["UNRECOGNIZED_COLLECTION"], 1)

    def test_missing_and_cross_tenant_relationships_are_not_approved(self):
        root = inventory.PREFIX
        result = inventory.summarize({root + "/organizations/a": {}, root + "/organizations/b": {},
            root + "/caravans/trip": {"organizationId": text("a")},
            root + "/registrations/one": {"organizationId": text("b"), "caravanId": text("trip")},
            root + "/registrations/two": {"organizationId": text("absent"), "caravanId": text("absent")}})
        self.assertEqual(result["relationships"], {"missingOrganizationReferences": 1, "missingCaravanReferences": 1, "crossOrganizationReferences": 1})

    def test_foreign_or_traversal_reference_stops_before_network(self):
        with patch.object(inventory.urllib.request, "build_opener") as opener:
            for name in [inventory.PREFIX.replace("caravana-af306", "bdall-e3585") + "/a/b", inventory.PREFIX + "/../bad", inventory.PREFIX + "/a/b/c"]:
                with self.assertRaises(inventory.production.Blocked):
                    inventory.Inventory("SYNTHETIC").request(name)
            opener.assert_not_called()

    def test_full_export_or_consistent_snapshot_are_never_claimed_by_summary(self):
        result = inventory.summarize({})
        self.assertFalse(result["authUidContinuityVerified"])
        self.assertFalse(result["storageObjectsVerified"])
        self.assertFalse(result["financialTotalsVerified"])

    def test_auth_projection_is_fixed_and_report_drops_uid_and_extra_values(self):
        opener, response = MagicMock(), MagicMock()
        response.status = 200
        response.read.return_value = json.dumps({"users": [{"localId": "PRIVATE_UID", "email": "PRIVATE_EMAIL", "passwordHash": "PRIVATE_HASH", "providerUserInfo": [{"providerId": "password"}]}]}).encode()
        opener.open.return_value.__enter__.return_value = response
        report = inventory.auth_metadata("SYNTHETIC", {inventory.PREFIX + "/admins/PRIVATE_UID": {}}, opener)
        self.assertNotIn("PRIVATE", json.dumps(report))
        self.assertEqual(report["adminUidsPresentInAuth"], 1)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, inventory.AUTH_METADATA_URL)
        self.assertNotIn("passwordHash", request.full_url)
        self.assertEqual(request.method, "GET")

    def test_auth_metadata_pagination_cannot_be_approved_partially(self):
        opener, response = MagicMock(), MagicMock()
        response.status = 200
        response.read.return_value = b'{"users":[],"nextPageToken":"PRIVATE_TOKEN"}'
        opener.open.return_value.__enter__.return_value = response
        with self.assertRaisesRegex(inventory.production.Blocked, "^auth_metadata_inventory_incomplete$"):
            inventory.auth_metadata("SYNTHETIC", {}, opener)

    def test_financial_reconciliation_preserves_legacy_active_records_and_ignores_voids(self):
        r = inventory.PREFIX + "/registrations/private"
        report = inventory.financial_reconciliation({r: {"paymentTotalCents": {"integerValue": "2500"}},
            r + "/payments/one": {"amountCents": {"integerValue": "2500"}},
            r + "/payments/two": {"amountCents": {"integerValue": "9000"}, "status": text("voided")}})
        self.assertEqual(report["storedTotalsMatchPaymentRecords"], 1)
        self.assertNotIn("2500", json.dumps(report))
        self.assertNotIn("9000", json.dumps(report))

    def test_financial_mismatch_and_missing_parent_are_reported_without_values(self):
        r = inventory.PREFIX + "/registrations/private"
        report = inventory.financial_reconciliation({r: {"paymentTotalCents": {"integerValue": "2500"}},
            r + "/payments/one": {"amountCents": {"integerValue": "1000"}},
            inventory.PREFIX + "/registrations/absent/payments/orphan": {"amountCents": {"integerValue": "1000"}}})
        self.assertEqual(report["storedTotalsMismatchPaymentRecords"], 1)
        self.assertEqual(report["paymentsWithoutParent"], 1)
        self.assertFalse(report["migrationPreservationVerified"])

    def test_consistent_timestamp_is_sent_to_both_discovery_and_document_listing(self):
        timestamp = "2026-10-22T19:00:00.000000Z"
        response = MagicMock()
        response.status = 200
        response.read.return_value = b'{}'
        with patch.object(inventory.urllib.request, "build_opener") as opener:
            opener.return_value.open.return_value.__enter__.return_value = response
            client = inventory.Inventory("SYNTHETIC", timestamp)
            client.request(inventory.PREFIX)
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(json.loads(request.data)["readTime"], timestamp)
            self.assertEqual(request.method, "POST")
            client.request(inventory.PREFIX, "registrations")
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(inventory.urllib.parse.parse_qs(inventory.urllib.parse.urlsplit(request.full_url).query)["readTime"], [timestamp])
            self.assertEqual(request.method, "GET")


if __name__ == "__main__":
    unittest.main()
