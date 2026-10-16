import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { getDocumentPolicy, inspectDocumentRetention, loadMinorAuthorization, purgeExpiredDocument, reviewAuthorization, saveDocumentPolicy, updatePassengerWithAuthorizationReset, uploadMinorAuthorization } from "../src/lib/documents";
import { planDocumentRetention } from "../src/lib/document-policy";
import { toggleCheckin } from "../src/lib/registration-operations";
import { uploadProof } from "../src/lib/data";
import { pendingWrites } from "../src/lib/pending-writes";
import type { Registration } from "../src/lib/types";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } }, firebaseConfigured: true }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
const id = "a".repeat(64); const reg = { id, organizationId: "a", caravanId: "trip-a" } as Registration;
const op = (n: number) => n.toString(16).padStart(32, "0");
const pdf = () => new File(["%PDF-1.4\nSYNTHETIC AUTHORIZATION"], "synthetic.pdf", { type: "application/pdf" });
function as(uid: string | null) { runtime.auth.currentUser.uid = uid || "guest"; runtime.db = uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore(); }
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { vi.restoreAllMocks(); expect(pendingWrites()).toBe(0); runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed(extra: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "caravans/trip-a"), { organizationId: "a", name: "Synthetic trip", date: "2026-11-05", status: "published", capacity: 25, reservedSeats: 1, requiresMinorAuthorization: true });
    for (const [uid, org, role] of [["owner-a", "a", "tenant_owner"], ["staff-a", "a", "staff"], ["owner-b", "b", "tenant_owner"]]) await setDoc(doc(db, `memberships/${uid}/organizations/${org}`), { uid, organizationId: org, role, status: "active" });
    await setDoc(doc(db, "platformOwners/global"), { status: "active" });
    await setDoc(doc(db, `registrations/${id}`), { ...reg, registrationStatus: "confirmed", paymentStatus: "approved", paymentTotalCents: 2500, isMinor: true, birthDate: "2010-01-01", authorizationStatus: "not_sent", guardianName: "Responsável fictício", guardianPhone: "11900000001", ...extra });
  }); as("owner-a");
}
async function ageFile(kind: "proofs" | "authorizations", days: number) {
  await env.withSecurityRulesDisabled(async (context) => {
    const time = Timestamp.fromMillis(Date.now() - days * 86400000);
    await updateDoc(doc(context.firestore(), `registrations/${id}/${kind}/current`), { uploadedAt: time });
    await updateDoc(doc(context.firestore(), `registrations/${id}`), { [kind === "proofs" ? "proofUploadedAt" : "authorizationUploadedAt"]: time });
  });
}
describe("consent, authorization privacy and controlled retention", () => {
  it("owner policy is audited, public metadata excludes identity, replay is safe and staff/B cannot mutate", async () => {
    await seed(); expect(await getDocumentPolicy("a")).toEqual({ proofDays: 90, authorizationDays: 90 });
    await saveDocumentPolicy("a", { proofDays: 30, authorizationDays: 60 }, op(1)); await saveDocumentPolicy("a", { proofDays: 30, authorizationDays: 60 }, op(1));
    await expect(saveDocumentPolicy("a", { proofDays: 1, authorizationDays: 60 }, op(1))).rejects.toThrow("outros dados");
    await assertFails(deleteDoc(doc(runtime.db!, `documentEvents/${op(1)}`)));
    as(null); const policy = (await getDoc(doc(runtime.db!, "documentPolicies/a"))).data()!; expect(policy).not.toHaveProperty("actorUid");
    await assertFails(getDocs(collection(runtime.db!, "documentPolicies")));
    for (const uid of ["staff-a", "owner-b", "global"]) { as(uid); await assertFails(saveDocumentPolicy("a", { proofDays: 1, authorizationDays: 1 }, op(2))); }
  });
  it("requires explicit consent, valid PDF and current displayed retention; bearer cannot download raw content", async () => {
    await seed(); as(null);
    await expect(uploadMinorAuthorization(reg, pdf(), false)).rejects.toThrow("Confirme");
    await expect(uploadMinorAuthorization(reg, new File(["not pdf"], "bad.pdf", { type: "application/pdf" }), true)).rejects.toThrow("conteúdo");
    await expect(uploadMinorAuthorization(reg, pdf(), true, 30)).rejects.toThrow("prazo foi atualizado");
    await uploadMinorAuthorization(reg, pdf(), true, 90);
    await assertFails(loadMinorAuthorization(id));
    expect((await getDoc(doc(runtime.db!, `registrations/${id}`))).data()?.authorizationStatus).toBe("pending");
    for (const uid of ["owner-a", "staff-a"]) { as(uid); expect(await (await loadMinorAuthorization(id)).text()).toContain("SYNTHETIC"); }
    for (const uid of ["owner-b", "global"]) { as(uid); await assertFails(loadMinorAuthorization(id)); }
  });
  it("manual PDF review gates boarding and profile changes reset approval without deleting the PDF", async () => {
    await seed(); as(null); await uploadMinorAuthorization(reg, pdf(), true); as("staff-a");
    await expect(toggleCheckin(reg, true)).rejects.toThrow("Confirme");
    await reviewAuthorization(reg, "approved", op(1)); await toggleCheckin(reg, true);
    await expect(updatePassengerWithAuthorizationReset(reg, { guardianName: "Outro responsável fictício", isMinor: true })).rejects.toThrow("Desfaça");
    await toggleCheckin(reg, false); await updatePassengerWithAuthorizationReset(reg, { guardianName: "Outro responsável fictício", isMinor: true });
    expect((await getDoc(doc(runtime.db!, `registrations/${id}`))).data()?.authorizationStatus).toBe("not_sent");
    expect((await getDoc(doc(runtime.db!, `registrations/${id}/authorizations/current`))).exists()).toBe(true);
    await assertFails(updateDoc(doc(runtime.db!, `registrations/${id}`), { authorizationStatus: "approved" }));
  });
  it("paper review remains available and unknown or falsified minor flags do not bypass trip age policy", async () => {
    await seed(); await reviewAuthorization(reg, "approved"); await toggleCheckin(reg, true); await toggleCheckin(reg, false);
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `registrations/${id}`), { isMinor: false, authorizationStatus: "not_sent" }));
    await expect(toggleCheckin(reg, true)).rejects.toThrow("autorização");
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `registrations/${id}`), { birthDate: "" }));
    await expect(toggleCheckin(reg, true)).rejects.toThrow("Idade não verificada");
  });
  it("server rejects forged boarding for unknown/invalid/minor birthdays and accepts the exact eighteenth birthday", async () => {
    await seed({ isMinor: false });
    for (const birthDate of ["", "2000-02-31", "2008-11-06"]) {
      await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `registrations/${id}`), { birthDate }));
      const write = writeBatch(runtime.db!);
      write.update(doc(runtime.db!, `registrations/${id}`), { checkedInAt: serverTimestamp(), checkedInBy: "owner-a", lastOperationalId: op(9) });
      write.set(doc(runtime.db!, `registrationOperations/${op(9)}`), { registrationId: id, organizationId: "a", caravanId: "trip-a", actorUid: "owner-a", action: "checked_in", at: serverTimestamp(), reason: "", beforeStatus: "confirmed", afterStatus: "confirmed", beforePaymentStatus: "approved", afterPaymentStatus: "approved", checkedBefore: false, checkedAfter: true, seatDelta: 0 });
      await assertFails(write.commit());
    }
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `registrations/${id}`), { birthDate: "2008-11-05" }));
    await toggleCheckin(reg, true);
    expect((await getDoc(doc(runtime.db!, `registrations/${id}`))).data()?.checkedInAt).toBeTruthy();
  });
  it("retention planner has a strict expiry boundary and never selects unsupported legacy metadata", () => {
    const row = { id, proofId: "current", proofUploadedAt: Timestamp.fromMillis(10000), proofRetentionDays: 1 };
    expect(planDocumentRetention([row], 86409999)).toEqual([]);
    expect(planDocumentRetention([row], 86410000)).toMatchObject([{ registrationId: id, kind: "proofs", days: 1 }]);
    expect(planDocumentRetention([{ ...row, proofRetentionDays: 0 }], 999999999)).toEqual([]);
  });
  it("only expired new-policy files can be purged; money, registration and legacy files remain intact", async () => {
    await seed({ registrationStatus: "awaiting_payment", paymentStatus: "pending", isMinor: false });
    await saveDocumentPolicy("a", { proofDays: 1, authorizationDays: 1 }, op(1));
    as(null); await uploadProof(reg, pdf()); as("owner-a");
    await expect(purgeExpiredDocument(id, "proofs", op(2))).rejects.toThrow("Prazo não encerrado");
    await assertFails(deleteDoc(doc(runtime.db!, `registrations/${id}/proofs/current`)));
    await ageFile("proofs", 2); expect((await inspectDocumentRetention("a")).length).toBe(1);
    await purgeExpiredDocument(id, "proofs", op(2)); await purgeExpiredDocument(id, "proofs", op(2));
    const parent = (await getDoc(doc(runtime.db!, `registrations/${id}`))).data()!;
    expect(parent.paymentTotalCents).toBe(2500); expect(parent.registrationStatus).toBe("awaiting_review"); expect(parent.proofId).toBeUndefined();
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), `registrations/${id}/proofs/current`), { registrationId: id, organizationId: "a", caravanId: "trip-a", uploadedAt: Timestamp.fromMillis(1), content: "LEGACY_SYNTHETIC" }));
    await assertFails(deleteDoc(doc(runtime.db!, `registrations/${id}/proofs/current`)));
    expect(planDocumentRetention([{ id, proofId: "current", proofUploadedAt: Timestamp.fromMillis(1) }], Date.now())).toEqual([]);
  });
  it("client clock and later policy shortening cannot expire an earlier file; server denies early delete", async () => {
    await seed(); await uploadMinorAuthorization(reg, pdf(), true); await ageFile("authorizations", 2);
    await saveDocumentPolicy("a", { proofDays: 1, authorizationDays: 1 }, op(1));
    expect(await inspectDocumentRetention("a")).toEqual([]);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 100 * 86400000);
    await assertFails(purgeExpiredDocument(id, "authorizations", op(2)));
  });
  it("direct SDK cannot claim consent absent, wrong organization, or forged authorization state", async () => {
    await seed(); as(null);
    const batch = writeBatch(runtime.db!);
    batch.set(doc(runtime.db!, `registrations/${id}/authorizations/current`), { registrationId: id, organizationId: "b", caravanId: "trip-a", contentType: "application/pdf", content: "JVBERi0xLjQ=", fileName: "synthetic.pdf", uploadedAt: serverTimestamp(), retentionDays: 90 });
    batch.update(doc(runtime.db!, `registrations/${id}`), { authorizationId: "current", authorizationStatus: "pending", authorizationUploadedAt: serverTimestamp(), authorizationRetentionDays: 90 });
    await assertFails(batch.commit());
    await assertFails(updateDoc(doc(runtime.db!, `registrations/${id}`), { authorizationStatus: "approved" }));
    as("owner-b"); await assertFails(getDocs(query(collection(runtime.db!, "documentEvents"), where("organizationId", "==", "a"))));
  });
});
