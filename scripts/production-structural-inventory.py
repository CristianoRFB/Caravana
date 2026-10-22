#!/usr/bin/env python3
"""Read production relationships into private Cloud Shell RAM; emit aggregates only.

No file export, mutation, Auth account listing, object download or raw diagnostics.
Unknown collection/field names and all document IDs/values are omitted from output.
"""
import collections
import importlib.util
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SPEC = importlib.util.spec_from_file_location("production", Path(__file__).with_name("production-readonly-preflight.py"))
production = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(production)
PREFIX = "projects/caravana-af306/databases/(default)/documents"
API = "https://firestore.googleapis.com/v1/"
KNOWN = {"organizations", "caravans", "registrations", "admins", "payments", "expenses", "proofs", "authorizations", "financialOperations", "registrationEvents", "memberships", "users", "settings", "publicTenantSettings", "tenantSlugs", "tenantUsage", "tenantEntitlements", "subscriptions", "platformAudit", "platformAdmins", "legacyTripAliases", "legacyNamespaces", "namespaceBootstrap", "namespaceClaims", "organizationAvailability", "tenantDirectory", "tenantInvitations", "invitationInboxes", "reports", "worklists", "toolEvents", "checkinEvents", "importBatches", "importRows", "reservationAttempts", "supportSessions"}
KNOWN.add("reservationReceipts")  # Present in the recovered legacy Rules.
AUTH_METADATA_URL = "https://identitytoolkit.googleapis.com/v1/projects/caravana-af306/accounts:batchGet?" + urllib.parse.urlencode({
    "maxResults": 1000, "fields": "users(localId,disabled,providerUserInfo(providerId)),nextPageToken"})


def private_runtime():
    if os.name != "posix" or not Path("/proc/swaps").exists() or len(Path("/proc/swaps").read_text().strip().splitlines()) != 1:
        raise production.Blocked("private_linux_no_swap_runtime_required")
    import resource
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def safe_name(name):
    if not isinstance(name, str) or not name.startswith(PREFIX + "/"):
        raise production.Blocked("foreign_document_reference")
    parts = name[len(PREFIX) + 1:].split("/")
    if len(parts) % 2 or any(not p or p in {".", ".."} for p in parts):
        raise production.Blocked("unsafe_document_reference")
    return name


class Inventory:
    def __init__(self, token):
        self.token, self.documents, self.calls, self.bytes = token, {}, 0, 0

    def request(self, parent, collection=None, page=None):
        if parent != PREFIX:
            safe_name(parent)
        path = "/".join(urllib.parse.quote(p, safe="()") for p in parent.split("/"))
        body = None
        if collection is None:
            url, method = API + path + ":listCollectionIds", "POST"
            body = json.dumps({"pageSize": 100, **({"pageToken": page} if page else {})}).encode()
        else:
            if not isinstance(collection, str) or not collection or collection in {".", ".."} or "/" in collection:
                raise production.Blocked("invalid_collection_identifier")
            url, method = API + path + "/" + urllib.parse.quote(collection, safe=""), "GET"
            url += "?" + urllib.parse.urlencode({"pageSize": 100, "showMissing": "true", **({"pageToken": page} if page else {})})
        self.calls += 1
        if self.calls > 10000:
            raise production.Blocked("inventory_request_bound_exceeded_no_partial_approval")
        req = urllib.request.Request(url, data=body, headers={"Authorization": "Bearer " + self.token, "Content-Type": "application/json"}, method=method)
        try:
            with urllib.request.build_opener(production.NoRedirect).open(req, timeout=30) as response:
                data = response.read(16_000_001)
                if response.status != 200 or len(data) > 16_000_000:
                    raise production.Blocked("inventory_response_bound_exceeded")
                return json.loads(data)
        except production.Blocked:
            raise
        except Exception:
            raise production.Blocked("inventory_read_failed_raw_details_suppressed") from None

    def walk(self, parent=PREFIX, depth=0):
        if depth > 12 or len(self.documents) > 5000 or self.bytes > 64_000_000:
            raise production.Blocked("inventory_size_bound_exceeded_no_partial_approval")
        page = None
        seen = set()
        while True:
            groups = self.request(parent, page=page)
            for group in groups.get("collectionIds", []):
                doc_page, doc_seen = None, set()
                while True:
                    listing = self.request(parent, group, doc_page)
                    for document in listing.get("documents", []):
                        name = safe_name(document.get("name"))
                        if not name.startswith(parent + "/" + group + "/"):
                            raise production.Blocked("listing_parent_mismatch")
                        if document.get("createTime"):
                            if name in self.documents:
                                raise production.Blocked("duplicate_document_in_pagination")
                            self.documents[name] = document.get("fields", {})
                            self.bytes += len(json.dumps(document).encode())
                        self.walk(name, depth + 1)
                    doc_page = listing.get("nextPageToken")
                    if not doc_page:
                        break
                    if doc_page in doc_seen:
                        raise production.Blocked("repeated_document_page")
                    doc_seen.add(doc_page)
            page = groups.get("nextPageToken")
            if not page:
                break
            if page in seen:
                raise production.Blocked("repeated_collection_page")
            seen.add(page)


def string(fields, key):
    return fields.get(key, {}).get("stringValue")


def summarize(documents):
    counts = collections.Counter()
    missing_org, missing_trip, crossed, external_refs, inline_pdf, invalid_money = 0, 0, 0, 0, 0, 0
    organizations = {name.split("/")[-1] for name in documents if len(name.split("/")) == len(PREFIX.split("/")) + 2 and name.startswith(PREFIX + "/organizations/")}
    trips = {name.split("/")[-1]: fields for name, fields in documents.items() if name.startswith(PREFIX + "/caravans/") and len(name.split("/")) == len(PREFIX.split("/")) + 2}
    for name, fields in documents.items():
        safe_name(name)
        parts = name[len(PREFIX) + 1:].split("/")
        group = parts[-2]
        counts[group if group in KNOWN else "UNRECOGNIZED_COLLECTION"] += 1
        if len(parts) == 2 and group in {"caravans", "registrations", "admins"}:
            org = string(fields, "organizationId")
            if not org or org not in organizations:
                missing_org += 1
            if group == "registrations":
                trip = trips.get(string(fields, "caravanId"))
                if trip is None:
                    missing_trip += 1
                elif string(trip, "organizationId") != org:
                    crossed += 1
        for key in ["amountCents", "paymentTotalCents", "priceCents"]:
            if key in fields:
                amount = fields[key].get("integerValue")
                if not isinstance(amount, str) or not re.fullmatch(r"[0-9]{1,16}", amount):
                    invalid_money += 1
        # Values remain only in this process; emit counts, never URLs or bytes.
        serialized = json.dumps(fields, ensure_ascii=False)
        external_refs += sum(serialized.count(prefix) for prefix in ["gs://", "firebasestorage.googleapis.com", "storage.googleapis.com"])
        inline_pdf += serialized.count("data:application/pdf") + serialized.count("JVBERi0")
    return {"documentCount": len(documents), "collectionCounts": dict(sorted(counts.items())),
            "relationships": {"missingOrganizationReferences": missing_org, "missingCaravanReferences": missing_trip, "crossOrganizationReferences": crossed},
            "invalidCentFields": invalid_money, "externalStorageReferenceOccurrences": external_refs, "inlinePdfOccurrences": inline_pdf,
            "financialReconciliation": financial_reconciliation(documents),
            "authUidContinuityVerified": False, "storageObjectsVerified": False, "financialTotalsVerified": False}


def financial_reconciliation(documents):
    def cents(value):
        raw = value.get("integerValue") if isinstance(value, dict) else None
        return int(raw) if isinstance(raw, str) and re.fullmatch(r"[0-9]{1,16}", raw) else None
    regs = {n: f for n, f in documents.items() if n.startswith(PREFIX + "/registrations/") and len(n[len(PREFIX) + 1:].split("/")) == 2}
    paid = collections.Counter()
    bad_payments, orphan_payments, missing_totals, matches, mismatches = 0, 0, 0, 0, 0
    for name, fields in documents.items():
        parts = name[len(PREFIX) + 1:].split("/")
        if len(parts) == 4 and parts[0] == "registrations" and parts[2] == "payments":
            parent = PREFIX + "/" + "/".join(parts[:2])
            if parent not in regs:
                orphan_payments += 1
            amount = cents(fields.get("amountCents"))
            status = string(fields, "status")
            if amount is None or status not in {None, "active", "voided"}:
                bad_payments += 1
            elif status != "voided":
                paid[parent] += amount
    for name, fields in regs.items():
        total = cents(fields.get("paymentTotalCents"))
        if total is None:
            missing_totals += 1
        elif total == paid[name]:
            matches += 1
        else:
            mismatches += 1
    return {"registrationCount": len(regs), "storedTotalsMatchPaymentRecords": matches, "storedTotalsMismatchPaymentRecords": mismatches,
            "registrationsWithoutVerifiableStoredTotal": missing_totals, "paymentsWithoutParent": orphan_payments,
            "unverifiablePaymentRecords": bad_payments, "individualAndAggregateAmountsDisclosed": False,
            "bankSettlementVerified": False, "migrationPreservationVerified": False}


def auth_metadata(token, documents, opener=None):
    # UID/provider metadata only. This exact projection excludes email, password
    # hashes, salts, names, phone numbers and refresh tokens at the API boundary.
    req = urllib.request.Request(AUTH_METADATA_URL, headers={"Authorization": "Bearer " + token,
                                "x-goog-user-project": "caravana-af306"}, method="GET")
    try:
        with (opener or urllib.request.build_opener(production.NoRedirect)).open(req, timeout=30) as response:
            raw = response.read(2_000_001)
            if response.status != 200 or len(raw) > 2_000_000:
                raise production.Blocked("auth_metadata_response_bound")
            data = json.loads(raw)
        if data.get("nextPageToken"):
            raise production.Blocked("auth_metadata_inventory_incomplete")
        users = data.get("users", [])
        uids = {u["localId"] for u in users}
        admins = {n.split("/")[-1] for n in documents if n.startswith(PREFIX + "/admins/") and len(n[len(PREFIX) + 1:].split("/")) == 2}
        providers = collections.Counter()
        for user in users:
            for provider in user.get("providerUserInfo", []):
                name = provider.get("providerId")
                providers[name if name in {"password", "google.com", "facebook.com", "apple.com", "github.com", "phone", "microsoft.com"} else "OTHER_PROVIDER"] += 1
        return {"status": "PASS_AUTH_UID_METADATA_ONLY", "authUserCount": len(users), "disabledCount": sum(u.get("disabled") is True for u in users),
                "providerCounts": dict(providers), "adminDocumentCount": len(admins), "adminUidsPresentInAuth": len(admins & uids), "adminUidsMissingFromAuth": len(admins - uids),
                "passwordRecoveryVerified": False, "authRestoreVerified": False}
    except production.Blocked:
        raise
    except Exception:
        raise production.Blocked("auth_metadata_read_failed_raw_details_suppressed") from None


if __name__ == "__main__":
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "target": "caravana-af306", "operation": "bounded_structural_inventory",
              "identity": "managed_exact_account", "classification": "read-only GET and listCollectionIds POST", "projectWrites": 0,
              "rawFilesCreated": 0, "rawValuesReported": False, "backupCreated": False}
    try:
        private_runtime()
        token = production.managed_token()
        metadata = {}
        production.preflight(production.Reader(token), metadata)
        if not metadata.get("identityVerified") or metadata.get("projectNumber") != "742921744156" or metadata.get("billingEnabled") is not False or metadata.get("billingAccountLinked") or metadata.get("database", {}).get("freeTier") is not True:
            raise production.Blocked("production_identity_or_zero_cost_preflight_failed")
        inventory = Inventory(token)
        inventory.walk()
        report.update(summarize(inventory.documents))
        try:
            report["authUidMetadata"] = auth_metadata(token, inventory.documents)
        except production.Blocked as error:
            report["authUidMetadata"] = {"status": "BLOCKED", "reason": str(error)}
        report.update(status="PASS_BOUNDED_FIRESTORE_STRUCTURAL_INVENTORY", estimatedFirestorePayloadBytes=inventory.bytes, readRequests=inventory.calls, consistentSnapshotVerified=False)
    except production.Blocked as error:
        report.update(status="BLOCKED", reason=str(error))
    except Exception:
        report.update(status="BLOCKED", reason="unexpected_failure_raw_details_suppressed")
    print(json.dumps(report, separators=(",", ":")))
    raise SystemExit(0 if report.get("status") == "PASS_BOUNDED_FIRESTORE_STRUCTURAL_INVENTORY" else 1)
