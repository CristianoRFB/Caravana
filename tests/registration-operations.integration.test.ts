import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, type Firestore } from "firebase/firestore";
import { cancelRegistration, reviewPayment, toggleCheckin } from "../src/lib/registration-operations";
import { pendingWrites } from "../src/lib/pending-writes";
import type { Registration } from "../src/lib/types";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
const op = (n: number) => n.toString(16).padStart(32, "0");
const reg = { id: "a".repeat(64), organizationId: "a", caravanId: "trip-a" } as Registration;
function as(uid: string) { runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid).firestore(); }
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed(extra: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const org of ["a", "b"]) {
      await setDoc(doc(db, `organizations/${org}`), { name: `Synthetic ${org}` });
      for (const role of ["tenant_owner", "staff"]) {
        const uid = `${role === "staff" ? "staff" : "owner"}-${org}`;
        await setDoc(doc(db, `memberships/${uid}/organizations/${org}`), { uid, organizationId: org, role, status: "active" });
      }
      await setDoc(doc(db, `caravans/trip-${org}`), { organizationId: org, name: "Synthetic trip", status: "published", capacity: 25, reservedSeats: 1 });
    }
    await setDoc(doc(db, `registrations/${reg.id}`), { id: reg.id, organizationId: "a", caravanId: "trip-a", registrationStatus: "awaiting_review", paymentStatus: "awaiting_review", paymentTotalCents: 2500, ...extra });
    await setDoc(doc(db, `registrations/${reg.id}/payments/old`), { amountCents: 2500, status: "active" });
  }); as("owner-a");
}
const current = async () => (await getDoc(doc(runtime.db!, `registrations/${reg.id}`))).data()!;
const events = async () => (await getDocs(query(collection(runtime.db!, "registrationOperations"), where("organizationId", "==", "a")))).docs;
describe("audited persisted registration transitions", () => {
  it.each(["owner-a", "staff-a"])("%s approves and checks in/reverses idempotently with immutable timestamps and audit", async (uid) => {
    await seed(); as(uid);
    await reviewPayment(reg, true, "", op(1)); await reviewPayment(reg, true, "", op(1));
    await toggleCheckin(reg, true, op(2)); const first = await current();
    await toggleCheckin(reg, true, op(3)); expect((await current()).checkedInAt.toMillis()).toBe(first.checkedInAt.toMillis());
    await toggleCheckin(reg, false, op(4)); await toggleCheckin(reg, true, op(2));
    expect((await current()).checkedInAt).toBeNull();
    expect((await events()).map((event) => event.data().action).sort()).toEqual(["checked_in", "checkin_reversed", "review_approved"]);
    expect((await current()).paymentTotalCents).toBe(2500);
    await assertFails(updateDoc(doc(runtime.db!, `registrationOperations/${op(2)}`), { actorUid: "forged" }));
    await assertFails(deleteDoc(doc(runtime.db!, `registrationOperations/${op(2)}`)));
    await expect(toggleCheckin(reg, false, op(2))).rejects.toThrow("outros dados");
  });
  it("cancel is atomic and replay-safe, clears boarding but preserves money and terminal state", async () => {
    await seed({ registrationStatus: "confirmed", paymentStatus: "approved" }); as("staff-a");
    await toggleCheckin(reg, true, op(1));
    await Promise.all([cancelRegistration(reg, op(2)), cancelRegistration(reg, op(2))]);
    await cancelRegistration(reg, op(3));
    expect((await current()).registrationStatus).toBe("cancelled"); expect((await current()).checkedInAt).toBeNull();
    expect((await current()).paymentTotalCents).toBe(2500);
    expect((await getDoc(doc(runtime.db!, "caravans/trip-a"))).data()?.reservedSeats).toBe(0);
    expect((await events()).length).toBe(2);
    await expect(reviewPayment(reg, true)).rejects.toThrow("cancelada"); await expect(toggleCheckin(reg, true)).rejects.toThrow("Confirme");
  });
  it("blocks inconsistent cancellation counts, direct state resets and orphan/smuggled audit", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "caravans/trip-a"), { reservedSeats: 0 }));
    await expect(cancelRegistration(reg)).rejects.toThrow("inconsistente");
    expect((await current()).registrationStatus).toBe("awaiting_review");
    await assertFails(updateDoc(doc(runtime.db!, `registrations/${reg.id}`), { registrationStatus: "cancelled" }));
    await assertFails(updateDoc(doc(runtime.db!, `registrations/${reg.id}`), { checkedInAt: serverTimestamp() }));
    await assertFails(setDoc(doc(runtime.db!, `registrationOperations/${op(1)}`), { registrationId: reg.id, organizationId: "a", action: "cancelled", actorUid: "owner-a", at: serverTimestamp() }));
    await assertFails(deleteDoc(doc(runtime.db!, "caravans/trip-a")));
  });
  it("requires confirmed state and approved minor authorization; review rejection cannot undo boarding silently", async () => {
    await seed({ isMinor: true, authorizationStatus: "not_sent" });
    await expect(toggleCheckin(reg, true)).rejects.toThrow("Confirme");
    await reviewPayment(reg, true);
    await expect(toggleCheckin(reg, true)).rejects.toThrow("Confirme");
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `registrations/${reg.id}`), { authorizationStatus: "approved" }));
    await toggleCheckin(reg, true);
    await expect(reviewPayment(reg, false, "Unreadable synthetic proof")).rejects.toThrow("Desfaça");
    await toggleCheckin(reg, false); await reviewPayment(reg, false, "Unreadable synthetic proof");
    expect((await current()).registrationStatus).toBe("rejected");
  });
  it.each(["owner-b", "staff-b", "stranger"])("%s cannot mutate A or read its audit", async (uid) => {
    await seed(); as(uid);
    await assertFails(reviewPayment(reg, true, "", op(1)));
    await assertFails(cancelRegistration(reg, op(2)));
    await assertFails(getDocs(query(collection(runtime.db!, "registrationOperations"), where("organizationId", "==", "a"))));
  });
});
