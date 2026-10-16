import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { activeSupport, closeSupport, grantSupport, openSupport, revokeSupport, SUPPORT_SCOPE, type SupportGrant, type SupportSession } from "../src/lib/support";

const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
const op = (n: number) => n.toString(16).padStart(32, "0");
function as(uid: string) { runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid).firestore(); return runtime.db; }
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "platformOwners/operator"), { status: "active" });
    for (const suffix of ["a", "b"]) {
      await setDoc(doc(db, `organizations/org-${suffix}`), { name: `Synthetic ${suffix}` });
      await setDoc(doc(db, `memberships/owner-${suffix}/organizations/org-${suffix}`), { uid: `owner-${suffix}`, organizationId: `org-${suffix}`, status: "active", role: "tenant_owner" });
      await setDoc(doc(db, `caravans/trip-${suffix}`), { organizationId: `org-${suffix}`, name: `Private synthetic ${suffix}`, status: "draft", capacity: 25, reservedSeats: 1 });
      await setDoc(doc(db, `registrations/private-${suffix}`), { organizationId: `org-${suffix}`, caravanId: `trip-${suffix}`, passengerName: "Synthetic passenger", paymentTotalCents: 2500 });
      await setDoc(doc(db, `registrations/private-${suffix}/proofs/current`), { content: "SYNTHETIC" });
      await setDoc(doc(db, `registrations/private-${suffix}/payments/old`), { amountCents: 2500, status: "active" });
      await setDoc(doc(db, `caravans/trip-${suffix}/expenses/old`), { amountCents: 1000 });
    }
    await setDoc(doc(db, "memberships/staff/organizations/org-a"), { uid: "staff", organizationId: "org-a", status: "active", role: "staff" });
  });
  as("owner-a");
}
async function consentAndOpen() {
  await seed(); await grantSupport("org-a", "operator", "Diagnóstico sintético", 30, op(1));
  as("operator"); await openSupport("org-a", op(2));
}
describe("explicit limited support, server authority and immutable consent trail", () => {
  it("requires consent AND explicit opening, then only reads scoped caravan configuration", async () => {
    await seed(); as("operator");
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    await expect(openSupport("org-a", op(2))).rejects.toThrow("autorização válida");
    as("owner-a"); await grantSupport("org-a", "operator", "Diagnóstico sintético", 30, op(1));
    await grantSupport("org-a", "operator", "Diagnóstico sintético", 30, op(1));
    await expect(grantSupport("org-a", "operator", "Outro motivo", 30, op(1))).rejects.toThrow("outros dados");
    as("operator"); await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    await openSupport("org-a", op(2)); await openSupport("org-a", op(2));
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.name).toBe("Private synthetic a");
    expect((await getDocs(query(collection(runtime.db!, "caravans"), where("organizationId", "==", "org-a")))).size).toBe(1);
    await assertFails(getDocs(collection(runtime.db!, "caravans")));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-b")));
    for (const path of ["registrations/private-a", "registrations/private-a/proofs/current", "registrations/private-a/payments/old", "caravans/trip-a/expenses/old"]) {
      await assertFails(getDoc(doc(runtime.db!, path)));
      await assertFails(updateDoc(doc(runtime.db!, path), { tampered: true }));
    }
    await assertFails(updateDoc(doc(runtime.db!, "caravans/trip-a"), { capacity: 999 }));
    as("owner-a"); expect((await getDocs(collection(runtime.db!, "supportGrants/org-a/audit"))).size).toBe(2);
    expect((await getDoc(doc(runtime.db!, "registrations/private-a"))).data()?.paymentTotalCents).toBe(2500);
  });
  it.each(["staff", "owner-b", "operator", "stranger"])("%s cannot grant itself or others tenant support", async (uid) => {
    await seed(); as(uid); await assertFails(grantSupport("org-a", "operator", "Diagnóstico sintético", 30, op(1)));
  });
  it("rejects non-platform operators, missing audit, excessive TTL and enlarged scope even in atomic writes", async () => {
    await seed(); await assertFails(grantSupport("org-a", "stranger", "Diagnóstico sintético", 30, op(1)));
    const base = { organizationId: "org-a", operatorUid: "operator", status: "active", scope: SUPPORT_SCOPE, purpose: "Synthetic diagnosis", approvedBy: "owner-a", grantedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 1800000), consentId: op(3), lastEventId: op(3) };
    await assertFails(setDoc(doc(runtime.db!, "supportGrants/org-a/operators/operator"), base));
    for (const override of [{ expiresAt: Timestamp.fromMillis(Date.now() + 7200000) }, { scope: "all_private_data" }, { operatorUid: "someone-else" }, { organizationId: "org-b" }]) {
      const data = { ...base, ...override };
      const batch = writeBatch(runtime.db!);
      batch.set(doc(runtime.db!, "supportGrants/org-a/operators/operator"), data);
      batch.set(doc(runtime.db!, `supportGrants/org-a/audit/${op(3)}`), { organizationId: "org-a", operatorUid: "operator", actorUid: "owner-a", action: "support_granted", at: serverTimestamp(), consentId: op(3), scope: data.scope, expiresAt: data.expiresAt, purpose: data.purpose });
      await assertFails(batch.commit());
    }
  });
  it("revokes immediately; renewed consent requires a fresh opening and audit cannot be altered or fabricated", async () => {
    await consentAndOpen(); as("owner-a"); await revokeSupport("org-a", "operator", op(3)); await revokeSupport("org-a", "operator", op(3));
    as("operator"); await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    as("owner-a"); await grantSupport("org-a", "operator", "Novo diagnóstico", 15, op(4));
    as("operator"); await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a"))); await openSupport("org-a", op(5));
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).exists()).toBe(true);
    for (const uid of ["operator", "owner-a"]) {
      as(uid);
      await assertFails(updateDoc(doc(runtime.db!, `supportGrants/org-a/audit/${op(1)}`), { purpose: "erased" }));
      await assertFails(deleteDoc(doc(runtime.db!, `supportGrants/org-a/audit/${op(1)}`)));
      await assertFails(setDoc(doc(runtime.db!, `supportGrants/org-a/audit/${op(8)}`), { organizationId: "org-a", operatorUid: "operator", actorUid: uid, action: "support_opened", at: serverTimestamp(), consentId: op(4), scope: SUPPORT_SCOPE, purpose: "Novo diagnóstico", expiresAt: Timestamp.fromMillis(Date.now() + 10000) }));
    }
  });
  it("rejects session writes without audit, foreign UID, expanded scope or expiry, and keeps owner audit tenant-scoped", async () => {
    await seed(); await grantSupport("org-a", "operator", "Diagnóstico sintético", 30, op(1));
    as("operator");
    const grant = (await getDoc(doc(runtime.db!, "supportGrants/org-a/operators/operator"))).data()!;
    const base = { organizationId: "org-a", operatorUid: "operator", status: "active", scope: SUPPORT_SCOPE, purpose: grant.purpose, openedAt: serverTimestamp(), expiresAt: grant.expiresAt, consentId: op(1), lastEventId: op(2) };
    await assertFails(setDoc(doc(runtime.db!, "supportSessions/operator"), base));
    for (const override of [{ expiresAt: Timestamp.fromMillis(Date.now() + 7200000) }, { scope: "all_private_data" }, { operatorUid: "another" }, { consentId: op(8) }, { organizationId: "org-b" }]) {
      const data = { ...base, ...override };
      const batch = writeBatch(runtime.db!);
      batch.set(doc(runtime.db!, "supportSessions/operator"), data);
      batch.set(doc(runtime.db!, `supportGrants/org-a/audit/${op(2)}`), { organizationId: "org-a", operatorUid: "operator", actorUid: "operator", action: "support_opened", at: serverTimestamp(), consentId: data.consentId, scope: data.scope, expiresAt: data.expiresAt, purpose: data.purpose });
      await assertFails(batch.commit());
    }
    await assertFails(setDoc(doc(runtime.db!, "supportSessions/another"), base));
    as("owner-b"); await assertFails(getDocs(collection(runtime.db!, "supportGrants/org-a/audit")));
    as("staff"); await assertFails(getDocs(collection(runtime.db!, "supportGrants/org-a/audit")));
  });
  it("closes safely, only one organization can be active and global revocation overrides consent", async () => {
    await consentAndOpen(); await closeSupport("org-a", op(3)); await closeSupport("org-a", op(3));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    await openSupport("org-a", op(4));
    as("owner-b"); await grantSupport("org-b", "operator", "Diagnóstico B", 15, op(5));
    as("operator"); await openSupport("org-b", op(6));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    expect((await getDoc(doc(runtime.db!, "caravans/trip-b"))).exists()).toBe(true);
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "platformOwners/operator"), { status: "revoked" }));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-b")));
  });
  it("expired grants deny reads and opening at the server; UI validity has strict time and consent bounds", async () => {
    await consentAndOpen();
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "supportSessions/operator"), { expiresAt: Timestamp.fromMillis(Date.now() - 10000) }));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "supportGrants/org-a/operators/operator"), { expiresAt: Timestamp.fromMillis(Date.now() - 10000) }));
    await assertFails(getDoc(doc(runtime.db!, "caravans/trip-a")));
    await expect(openSupport("org-a", op(3))).rejects.toThrow("autorização válida");
    const grant: SupportGrant = { operatorUid: "operator", organizationId: "org-a", scope: SUPPORT_SCOPE, purpose: "Synthetic", status: "active", consentId: op(1), expiresAt: Timestamp.fromMillis(2000) };
    const session: SupportSession = { ...grant, lastEventId: op(2) };
    expect(activeSupport(grant, session, "org-a", 1999)).toBe(true);
    expect(activeSupport(grant, session, "org-a", 2000)).toBe(false);
    expect(activeSupport(grant, { ...session, consentId: op(9) }, "org-a", 1000)).toBe(false);
    expect(activeSupport(grant, { ...session, expiresAt: Timestamp.fromMillis(3000) }, "org-a", 1000)).toBe(false);
    expect(activeSupport(grant, session, "org-b", 1000)).toBe(false);
  });
});
