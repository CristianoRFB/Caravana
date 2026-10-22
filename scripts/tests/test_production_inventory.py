import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

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


if __name__ == "__main__":
    unittest.main()
