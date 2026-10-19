import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { seedSyntheticEntitlements } from "./fixtures/commercial-policy";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { importLegacyRegistrationsDetailed as importRows, rollbackImportBatch } from "../src/lib/import-operations";
import { reviewPayment } from "../src/lib/registration-operations";
import { importIdentityKeys } from "../src/lib/import-identity";
import { legacyImportDocumentId, type LegacyRegistrationDraft } from "../src/lib/legacy-import";
import { pendingWrites } from "../src/lib/pending-writes";
import type { Registration } from "../src/lib/types";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
const batch = (n: number) => n.toString(16).padStart(32, "0");
const row = (n: number): LegacyRegistrationDraft => ({ line: n + 2, passengerName: `Pessoa fictícia ${n}`, phone: `1190000000${n}`, email: "", city: "", boardingPointId: "point", boardingPointName: "Label stale", emergencyContact: "", notes: "", amountCents: 8500, paymentTotalCents: 0, paymentStatus: "pending", registrationStatus: "awaiting_payment", cpf: String(n).padStart(11, "0") });
function as(uid: string) { runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid).firestore(); }
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed(capacity = 25) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const org of ["a", "b"]) {
      await seedSyntheticEntitlements(db, org, "premium");
      await setDoc(doc(db, `organizations/${org}`), { name: `Synthetic ${org}` });
      await setDoc(doc(db, `memberships/owner-${org}/organizations/${org}`), { uid: `owner-${org}`, organizationId: org, role: "tenant_owner", status: "active" });
      await setDoc(doc(db, `caravans/trip-${org}`), { organizationId: org, name: "Synthetic same name", status: "published", capacity, reservedSeats: 0, boardingPoints: [{ id: "point", name: "Current point" }] });
    }
    await setDoc(doc(db, "memberships/staff/organizations/a"), { uid: "staff", organizationId: "a", role: "staff", status: "active" });
    await setDoc(doc(db, "admins/legacy"), { organizationId: "a", role: "admin" });
  }); as("owner-a");
}
async function count() { return (await getDocs(query(collection(runtime.db!, "registrations"), where("organizationId", "==", "a")))).size; }
describe("CSV private registry, atomic chunks and controlled rollback", () => {
  it("applies the commercial passenger ceiling and preserves replay and controlled rollback after downgrade", async () => {
    await seed(100);
    await env.withSecurityRulesDisabled(async (context) => { await seedSyntheticEntitlements(context.firestore(), "a", "essencial"); await updateDoc(doc(context.firestore(), "caravans/trip-a"), { reservedSeats: 59 }); });
    await expect(importRows("trip-a", "a", [row(1), row(2)], batch(1))).rejects.toThrow("somente 1");
    expect((await importRows("trip-a", "a", [row(1)], batch(1))).imported).toBe(1);
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "tenantEntitlements/a"), { growthEnabled: false }));
    expect((await importRows("trip-a", "a", [row(1)], batch(1))).skipped).toBe(1);
    await expect(importRows("trip-a", "a", [row(2)], batch(2))).rejects.toThrow("plano");
    const result = await rollbackImportBatch("a", "trip-a", batch(1), "Rollback sintético após downgrade");
    expect(result).toBeDefined(); expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(59);
    expect(await count()).toBe(1);
  });
  it("does not erase over-limit historical passengers on a downgrade and allows exact replay and rollback", async () => {
    await seed(200); await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "caravans/trip-a"), { reservedSeats: 99 }));
    expect((await importRows("trip-a", "a", [row(1)], batch(1))).imported).toBe(1);
    await env.withSecurityRulesDisabled(async (context) => seedSyntheticEntitlements(context.firestore(), "a", "essencial"));
    expect((await importRows("trip-a", "a", [row(1)], batch(1))).skipped).toBe(1);
    await expect(importRows("trip-a", "a", [row(2)], batch(2))).rejects.toThrow("somente 0");
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(100);
    await rollbackImportBatch("a", "trip-a", batch(1), "Reversão de linha sintética acima do limite");
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(99); expect(await count()).toBe(1);
  });
  it("direct SDK cannot reuse a claimed identity or fabricate a counter increment with a forged manifest", async () => {
    await seed(); await importRows("trip-a", "a", [row(1)], batch(1));
    const original = (await getDoc(doc(runtime.db!, `registrations/${await legacyImportDocumentId(batch(1), row(1).line)}`))).data()!;
    const registry = (await getDoc(doc(runtime.db!, "importRegistries/trip-a"))).data()!;
    const opId = batch(9); const id = "f".repeat(64); const forged = { ...original, id, importBatchId: batch(2), importOperationId: opId };
    const claims = Object.fromEntries(importIdentityKeys(row(1)).filter(Boolean).map((key) => [key, true]));
    const write = writeBatch(runtime.db!);
    write.set(doc(runtime.db!, `registrations/${id}`), forged);
    write.set(doc(runtime.db!, "importRegistries/trip-a"), { ...registry, claims: { ...registry.claims, ...claims }, lastImportOperationId: opId });
    write.update(doc(runtime.db!, "caravans/trip-a"), { reservedSeats: 2, lastImportOperationId: opId });
    write.set(doc(runtime.db!, `importOperations/${opId}`), { organizationId: "a", caravanId: "trip-a", batchId: batch(2), attemptId: batch(2), actorUid: "owner-a", at: serverTimestamp(), payloadHash: "a".repeat(64), registrationIds: [id], rows: { [id]: forged }, claims, rowResults: [{ line: 3, status: "imported", reason: "Forged" }], seatBefore: 1, seatAfter: 2 });
    await assertFails(write.commit()); expect(await count()).toBe(1);
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(1);
  });
  it("direct SDK cannot roll back a changed passenger, even with paired audit and seat update", async () => {
    await seed(); await importRows("trip-a", "a", [row(1)], batch(1));
    const id = await legacyImportDocumentId(batch(1), row(1).line); const opId = batch(9);
    await updateDoc(doc(runtime.db!, `registrations/${id}`), { passengerName: "Correção sintética posterior" });
    const write = writeBatch(runtime.db!);
    write.update(doc(runtime.db!, `registrations/${id}`), { registrationStatus: "cancelled", cancelledBy: "owner-a", cancelledAt: serverTimestamp(), checkedInAt: null, checkedInBy: null, lastOperationalId: opId });
    write.update(doc(runtime.db!, "caravans/trip-a"), { reservedSeats: 0, lastSeatOperationId: opId });
    write.set(doc(runtime.db!, `registrationOperations/${opId}`), { registrationId: id, organizationId: "a", caravanId: "trip-a", actorUid: "owner-a", action: "import_rolled_back", at: serverTimestamp(), reason: "Forged rollback", beforeStatus: "awaiting_payment", afterStatus: "cancelled", beforePaymentStatus: "pending", afterPaymentStatus: "pending", checkedBefore: false, checkedAfter: false, seatDelta: -1 });
    await assertFails(write.commit()); expect((await getDoc(doc(runtime.db!, `registrations/${id}`))).data()?.registrationStatus).toBe("awaiting_payment");
  });
  it("worst-case two rows with six identity aliases stay inside the Rules evaluation budget", async () => {
    await seed(); const rows = [1, 2].map((n) => ({ ...row(n), passengerName: `José Fictício ${n}`, email: `synthetic${n}@example.test`, documentRecords: [1, 2, 3].map((d) => ({ label: "Documento fictício", value: `SYNTHETIC-${n}-${d}` })) }));
    const report = await importRows("trip-a", "a", rows, batch(1));
    expect(report.rejected, JSON.stringify(report.rowResults)).toBe(0);
    expect(report.imported).toBe(2);
    expect(await count()).toBe(2);
  });
  it("retry intent keeps durable row IDs after capacity races and rejects changed payload replay", async () => {
    await seed(1); const attempts = [{ rows: [row(1)], batchId: batch(1) }, { rows: [row(2)], batchId: batch(2) }];
    const first = await Promise.allSettled(attempts.map((attempt) => importRows("trip-a", "a", attempt.rows, attempt.batchId)));
    expect(await count()).toBe(1);
    const missing = first.findIndex((item) => item.status === "rejected" || item.value.imported === 0);
    expect(missing).toBeGreaterThanOrEqual(0);
    await updateDoc(doc(runtime.db!, "caravans/trip-a"), { capacity: 2 });
    const selected = attempts[missing];
    expect(await importRows("trip-a", "a", selected.rows, selected.batchId, batch(8))).toMatchObject({ imported: 1, rejected: 0 });
    expect(await importRows("trip-a", "a", selected.rows, selected.batchId, batch(8))).toMatchObject({ imported: 0, skipped: 1 });
    expect(await importRows("trip-a", "a", [{ ...selected.rows[0], notes: "Changed payload" }], selected.batchId, batch(8))).toMatchObject({ imported: 0, rejected: 1 });
    expect(await count()).toBe(2);
  });
  it.each(["owner-a", "legacy"])("%s imports multiple chunks, safely replays and deduplicates CPF across batches", async (uid) => {
    await seed(); as(uid); const rows = [row(1), row(2), row(3)];
    expect(await importRows("trip-a", "a", rows, batch(1))).toMatchObject({ imported: 3, skipped: 0, rejected: 0 });
    expect(await importRows("trip-a", "a", rows, batch(1))).toMatchObject({ imported: 0, skipped: 3, rejected: 0 });
    expect(await importRows("trip-a", "a", [{ ...row(1), passengerName: "Nome alterado", phone: "11900000009" }], batch(2))).toMatchObject({ imported: 0, skipped: 1, rejected: 0 });
    expect(await count()).toBe(3);
    const first = await getDoc(doc(runtime.db!, `registrations/${await legacyImportDocumentId(batch(1), 3)}`));
    expect(first.data()?.boardingPointName).toBe("Current point");
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(3);
    await assertFails(updateDoc(doc(runtime.db!, "caravans/trip-a"), { reservedSeats: 4 }));
    await assertFails(updateDoc(doc(runtime.db!, "importRegistries/trip-a"), { claims: {} }));
  });
  it("normalizes document/contact identities and preserves contactless historical Pix as reported", async () => {
    await seed();
    const historical = { ...row(1), cpf: undefined, phone: "", amountCents: undefined, documentRecords: [{ label: "RG informado", value: "12.345-6" }], boardingPointId: "", boardingPointName: "Não informado", paymentStatus: "reported", registrationStatus: "confirmed", paymentReportedMethod: "pix", paymentReportedUnreconciled: true } as LegacyRegistrationDraft;
    // Mimic parser output: omitted optional fields, never undefined SDK fields.
    const clean = JSON.parse(JSON.stringify(historical));
    expect(await importRows("trip-a", "a", [clean], batch(1))).toMatchObject({ imported: 1, rejected: 0 });
    expect(await importRows("trip-a", "a", [{ ...clean, documentRecords: [{ label: "Documento antigo", value: "123456" }] }], batch(2))).toMatchObject({ skipped: 1 });
    expect(importIdentityKeys({ ...row(1), passengerName: "JOSÉ" })[4]).toBe(importIdentityKeys({ ...row(1), passengerName: "José" })[4]);
  });
  it("concurrent batches claiming one CPF create one passenger and capacity never overflows", async () => {
    await seed(2);
    const results = await Promise.all([importRows("trip-a", "a", [row(1)], batch(1)), importRows("trip-a", "a", [row(1)], batch(2))]);
    expect(results.reduce((sum, item) => sum + item.imported, 0)).toBe(1); expect(await count()).toBe(1);
    const additional = await Promise.all([importRows("trip-a", "a", [row(2)], batch(3)), importRows("trip-a", "a", [row(3)], batch(4))]);
    expect(additional.reduce((sum, item) => sum + item.imported, 0)).toBe(1);
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(2);
  });
  it("rollback cancels only intact imports, preserves reviewed rows, is replay-safe and never deletes", async () => {
    await seed(); await importRows("trip-a", "a", [row(1), row(2)], batch(1));
    const id = await legacyImportDocumentId(batch(1), row(2).line);
    const registration = { ...(await getDoc(doc(runtime.db!, `registrations/${id}`))).data(), id } as Registration;
    await reviewPayment(registration, true);
    const results = await rollbackImportBatch("a", "trip-a", batch(1), "Correção sintética do lote");
    expect(results.map((item) => item.status).sort()).toEqual(["blocked", "cancelled"]);
    const replay = await rollbackImportBatch("a", "trip-a", batch(1), "Correção sintética do lote");
    expect(replay.map((item) => item.status).sort()).toEqual(["blocked", "cancelled"]);
    expect(await count()).toBe(2); expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(1);
    const manifests = await getDocs(query(collection(runtime.db!, "importOperations"), where("organizationId", "==", "a")));
    await assertFails(deleteDoc(manifests.docs[0].ref));
    expect(await importRows("trip-a", "a", [row(1)], batch(2))).toMatchObject({ skipped: 1, imported: 0 });
  });
  it.each(["owner-b", "staff", "stranger"])("%s cannot import A, change counters or read manifests/registry", async (uid) => {
    await seed(); as(uid); await assertFails(importRows("trip-a", "a", [row(1)], batch(1)));
    await assertFails(updateDoc(doc(runtime.db!, "caravans/trip-a"), { reservedSeats: 1 }));
    await assertFails(getDoc(doc(runtime.db!, "importRegistries/trip-a")));
    await assertFails(getDocs(query(collection(runtime.db!, "importOperations"), where("organizationId", "==", "a"))));
  });
});
