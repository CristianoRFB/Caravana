import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import { membershipPath } from "../src/lib/memberships";

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => env.clearFirestore());
afterAll(async () => env.cleanup());

const member = (uid: string, organizationId: string, role = "tenant_owner", status = "active") => ({ uid, organizationId, role, status, createdAt: "2026-10-16", updatedAt: "2026-10-16" });
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const org of ["a", "b"]) {
      await setDoc(doc(db, `organizations/${org}`), { name: `Organização sintética ${org}` });
      await setDoc(doc(db, membershipPath(`owner-${org}`, org)), member(`owner-${org}`, org));
      await setDoc(doc(db, `caravans/trip-${org}`), { organizationId: org, status: "draft", capacity: 25, reservedSeats: 1 });
      await setDoc(doc(db, `registrations/private-${org}`), { organizationId: org, caravanId: `trip-${org}`, passengerName: `Pessoa sintética ${org}`, registrationStatus: "confirmed", paymentStatus: "approved", amountCents: 8500, paymentTotalCents: 2500 });
      await setDoc(doc(db, `registrations/private-${org}/proofs/current`), { registrationId: `private-${org}`, organizationId: org, caravanId: `trip-${org}`, content: "SYNTHETIC" });
    }
    await setDoc(doc(db, membershipPath("staff-a", "a")), member("staff-a", "a", "staff"));
    await setDoc(doc(db, "admins/legacy-a"), { organizationId: "a", role: "admin" });
    await setDoc(doc(db, "platformOwners/platform"), { status: "active" });
  });
}

describe("membership authority and cross-organization boundaries", () => {
  it.each(["owner-a", "staff-a"])("allows %s own scoped queries and proof reads while denying B or unscoped private queries", async (uid) => {
    await seed();
    const db = env.authenticatedContext(uid).firestore();
    expect((await assertSucceeds(getDocs(query(collection(db, "registrations"), where("organizationId", "==", "a"))))).size).toBe(1);
    await assertSucceeds(getDoc(doc(db, "registrations/private-a/proofs/current")));
    await assertFails(getDocs(collection(db, "registrations")));
    await assertFails(getDocs(query(collection(db, "registrations"), where("organizationId", "==", "b"))));
    await assertFails(getDoc(doc(db, "registrations/private-b")));
    await assertFails(getDoc(doc(db, "registrations/private-b/proofs/current")));
    await assertFails(getDoc(doc(db, "caravans/trip-b")));
  });
  it("denies revocation bypass through a remaining legacy admin or spoofed auth claims", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), membershipPath("legacy-a", "a")), member("legacy-a", "a", "tenant_owner", "revoked"));
    });
    const db = env.authenticatedContext("legacy-a", { organizationId: "a", role: "tenant_owner" }).firestore();
    await assertFails(getDocs(query(collection(db, "registrations"), where("organizationId", "==", "a"))));
    await assertFails(updateDoc(doc(db, "registrations/private-a"), { checkedInAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, membershipPath("legacy-a", "a")), { status: "active" }));
  });
  it("keeps legacy access until explicitly disabled or expired; active membership survives cutover", async () => {
    await seed();
    const legacy = env.authenticatedContext("legacy-a").firestore();
    await assertSucceeds(getDoc(doc(legacy, "registrations/private-a")));
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "organizations/a"), { legacyAdminAccessUntil: Timestamp.fromMillis(1) });
    });
    await assertFails(getDoc(doc(legacy, "registrations/private-a")));
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "organizations/a"), { legacyAdminAccessUntil: Timestamp.fromMillis(4102444800000), legacyAdminAccessEnabled: false });
    });
    await assertFails(getDoc(doc(legacy, "registrations/private-a")));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("owner-a").firestore(), "registrations/private-a")));
  });
  it("cannot self-grant memberships, platform authority or read someone else's membership list", async () => {
    await seed();
    const db = env.authenticatedContext("unassigned", { role: "platform_owner", organizationId: "a" }).firestore();
    await assertFails(setDoc(doc(db, membershipPath("unassigned", "a")), member("unassigned", "a")));
    await assertFails(setDoc(doc(db, "platformOwners/unassigned"), { status: "active" }));
    await assertFails(getDocs(collection(db, "memberships/owner-a/organizations")));
    await assertSucceeds(getDocs(collection(db, "memberships/unassigned/organizations")));
    await assertFails(getDoc(doc(db, "organizations/a")));
    await assertFails(getDocs(query(collection(db, "registrations"), where("organizationId", "==", "a"))));
  });
  it("platform authority can list organization metadata without private passenger/proof or tenant writes", async () => {
    await seed();
    const db = env.authenticatedContext("platform").firestore();
    expect((await assertSucceeds(getDocs(collection(db, "organizations")))).size).toBe(2);
    await assertFails(getDoc(doc(db, "registrations/private-a")));
    await assertFails(getDoc(doc(db, "registrations/private-a/proofs/current")));
    await assertFails(updateDoc(doc(db, "caravans/trip-a"), { capacity: 50 }));
    await assertFails(updateDoc(doc(db, "organizations/a"), { name: "Bypass" }));
  });
  it("owner cannot reassign private documents to a different tenant or caravan", async () => {
    await seed();
    const db = env.authenticatedContext("owner-a").firestore();
    await assertFails(updateDoc(doc(db, "caravans/trip-a"), { organizationId: "b" }));
    await assertFails(updateDoc(doc(db, "registrations/private-a"), { organizationId: "b" }));
    await assertFails(updateDoc(doc(db, "registrations/private-a"), { caravanId: "trip-b" }));
    await assertSucceeds(updateDoc(doc(db, "caravans/trip-a"), { capacity: 30 }));
  });
  it("staff can operate check-in but cannot change fares, received totals, caravan capacity or expense writes", async () => {
    await seed();
    const db = env.authenticatedContext("staff-a").firestore();
    await assertSucceeds(updateDoc(doc(db, "registrations/private-a"), { checkedInAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "registrations/private-a"), { amountCents: 1 }));
    await assertFails(updateDoc(doc(db, "registrations/private-a"), { paymentTotalCents: 999999 }));
    await assertFails(updateDoc(doc(db, "caravans/trip-a"), { capacity: 50 }));
    await assertFails(setDoc(doc(db, "caravans/trip-a/expenses/new"), { id: "new", organizationId: "a", caravanId: "trip-a", description: "Despesa sintética", category: "outros", amountCents: 100, date: "2026-10-16", notes: "", createdAt: "2026-10-16", createdBy: "staff-a" }));
  });
  it("rejects membership documents with a foreign UID, foreign organization or global role", async () => {
    await seed();
    for (const [uid, patch] of [["foreign-uid", { uid: "other" }], ["foreign-org", { organizationId: "b" }], ["global-role", { role: "platform_owner" }]] as const) {
      await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), membershipPath(uid, "a")), { ...member(uid, "a"), ...patch }));
      await assertFails(getDoc(doc(env.authenticatedContext(uid).firestore(), "registrations/private-a")));
    }
  });
});
