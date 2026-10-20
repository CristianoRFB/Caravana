import { afterAll, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, getDocsFromServer } from "firebase/firestore";
// This suite is opt-in; normal CI does not need the protected, synthetic staging export.
let environment: RulesTestEnvironment | undefined;
afterAll(async () => { await environment?.cleanup(); });
describe("protected synthetic staging backup restored only into an isolated emulator", () => {
  it("restores all fields with matching hashes, relationships, counters, totals and ACLs", async () => {
    if (process.env.STAGING_RESTORE_CONFIRM !== "demo-caravana77-test" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" || process.env.GCLOUD_PROJECT !== "demo-caravana77-test") throw new Error("Exact local emulator destination and explicit confirmation required.");
    const bytes = readFileSync(".firebase/backups/staging-synthetic.json"); const manifest = JSON.parse(readFileSync("docs/evidence/2026-10-20/staging-backup-manifest.json", "utf8"));
    const backup = JSON.parse(bytes.toString()); expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.sha256);
    expect(backup.projectId).toBe("bdall-e3585"); expect(backup.synthetic).toBe(true); expect(backup.documents.length).toBe(manifest.documentCount); expect(backup.documents.length).toBeLessThanOrEqual(500);
    const root = "http://127.0.0.1:18080/v1/projects/demo-caravana77-test/databases/(default)/documents";
    for (const document of backup.documents) if (!document.path || document.path.split("/").some((part: string) => [".", ".."].includes(part)) || /[?#\\]/.test(document.path)) throw new Error("Unsafe protected backup path.");
    const response = await fetch(`${root}:commit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: JSON.stringify({ writes: backup.documents.map((document: { path: string; fields: unknown }) => ({ update: { name: `projects/demo-caravana77-test/databases/(default)/documents/${document.path}`, fields: document.fields }, currentDocument: { exists: false } })) }) });
    expect(response.status).toBe(200);
    function value(data: Record<string, unknown>): unknown {
      if ("nullValue" in data) return null;
      if ("stringValue" in data) return data.stringValue;
      if ("booleanValue" in data) return data.booleanValue;
      if ("integerValue" in data) return `int:${data.integerValue}`;
      if ("doubleValue" in data) return `double:${data.doubleValue}`;
      if ("timestampValue" in data) return String(data.timestampValue).replace(/(\.\d*?)0+Z$/, "$1Z").replace(".Z", "Z");
      if ("arrayValue" in data) return ((data.arrayValue as { values?: Record<string, unknown>[] }).values || []).map(value);
      if ("mapValue" in data) return fields((data.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields || {});
      throw new Error("Unsupported field type; no partial fidelity PASS.");
    }
    function fields(data: Record<string, Record<string, unknown>>): Record<string, unknown> { return Object.fromEntries(Object.keys(data).sort().map((key) => [key, value(data[key])])); }
    for (const document of backup.documents) {
      const restored = await fetch(`${root}/${document.path}`, { headers: { Authorization: "Bearer owner" } }); expect(restored.status).toBe(200);
      const current = await restored.json(); expect(fields(current.fields || {}), document.path).toEqual(fields(document.fields));
    }
    const documents: Map<string, Record<string, unknown>> = new Map(backup.documents.map((document: { path: string; fields: Record<string, Record<string, unknown>> }) => [document.path, fields(document.fields)]));
    const count = (value: unknown) => Number(String(value).replace(/^int:/, ""));
    for (const [path, usage] of documents) if (path.startsWith("tenantUsage/")) {
      const org = path.split("/")[1]; const trips = [...documents].filter(([key, data]) => /^caravans\/[^/]+$/.test(key) && data.organizationId === org);
      const members = [...documents].filter(([key, data]) => /^memberships\/[^/]+\/organizations\/[^/]+$/.test(key) && data.organizationId === org && data.status === "active");
      expect(count(usage.publishedCaravans), org).toBe(trips.filter(([, data]) => data.status === "published").length);
      expect(count(usage.activeMembers), org).toBe(members.length); expect(count(usage.activeOwners), org).toBe(members.filter(([, data]) => data.role === "tenant_owner").length);
      for (const [tripPath, trip] of trips) expect(count(trip.reservedSeats), tripPath).toBe([...documents].filter(([key, data]) => /^registrations\/[^/]+$/.test(key) && data.caravanId === tripPath.split("/")[1] && ["awaiting_payment", "awaiting_review", "confirmed"].includes(String(data.registrationStatus))).length);
    }
    let activePayments = 0n; let activeExpenses = 0n;
    for (const [path, data] of documents) {
      if (/^registrations\/[^/]+$/.test(path)) { const trip = documents.get(`caravans/${data.caravanId}`); expect(trip?.organizationId).toBe(data.organizationId); }
      if (/^registrations\/[^/]+\/payments\/[^/]+$/.test(path) && data.status === "active") activePayments += BigInt(count(data.amountCents));
      if (/^caravans\/[^/]+\/expenses\/[^/]+$/.test(path) && data.status !== "voided") activeExpenses += BigInt(count(data.amountCents));
    }
    const ownerA = backup.authMetadata.find((user: { email: string }) => user.email === "ownera@caravana77.invalid"); const ownerB = backup.authMetadata.find((user: { email: string }) => user.email === "ownerb@caravana77.invalid");
    environment = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
    const dbA = environment.authenticatedContext(ownerA.uid, { email: ownerA.email }).firestore(); const dbB = environment.authenticatedContext(ownerB.uid, { email: ownerB.email }).firestore();
    const owned = [...documents.keys()].find((path) => /^registrations\/[^/]+$/.test(path) && documents.get(path)?.organizationId === "staging-org-a")!;
    await getDocsFromServer(collection(dbA, `${owned}/payments`)); await assertFails(getDocsFromServer(collection(dbB, `${owned}/payments`)));
    const result = { checkedOn: new Date().toISOString(), sourceProject: "bdall-e3585", destinationProject: "demo-caravana77-test", destinationHost: "127.0.0.1:18080", restoredDocuments: backup.documents.length, exactFieldFidelity: true, tenantCountersAndRelationships: "PASS", aclOwnReadAndCrossTenantDenial: "PASS", activePaymentCents: activePayments.toString(), activeExpenseCents: activeExpenses.toString(), backupSha256: manifest.sha256, productionAccess: false, realProductionBackupVerified: false };
    writeFileSync("docs/evidence/2026-10-20/staging-backup-restore.json", JSON.stringify(result, null, 2) + "\n");
  }, 45000);
});
