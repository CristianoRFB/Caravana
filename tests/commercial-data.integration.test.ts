import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch, type Firestore } from "firebase/firestore";
import { pendingWrites } from "../src/lib/pending-writes";
import { EntitlementService, type ManualPlanAssignment } from "../src/lib/plan-catalog";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "platform" } } })); vi.mock("../src/lib/firebase", () => runtime);
import { assignTenantPlan, commercialDocuments, commercialOperationId, subscriptionAssignment, type CommercialSubscription } from "../src/lib/commercial-data";
let env: RulesTestEnvironment;
const input: ManualPlanAssignment = { organizationId: "a", planId: "pro", status: "active", setupWaived: false, reason: "Plano sintético aprovado" };
beforeAll(async () => { if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Synthetic emulator only"); env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); await env.clearFirestore(); runtime.db = null; runtime.auth.currentUser.uid = "platform"; }); afterAll(async () => env.cleanup());
async function seed(withUsage = true) {
  await env.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore(); await setDoc(doc(database, "platformOwners/platform"), { status: "active" });
    for (const org of ["a", "b"]) {
      await setDoc(doc(database, `organizations/${org}`), { name: `Organização sintética ${org}` });
      await setDoc(doc(database, `memberships/owner-${org}/organizations/${org}`), { uid: `owner-${org}`, organizationId: org, role: "tenant_owner", status: "active" });
      if (withUsage) await setDoc(doc(database, `tenantUsage/${org}`), { organizationId: org, publishedCaravans: 6, activeMembers: 1, activeOwners: 1, version: "commercial-v1" });
    }
    await setDoc(doc(database, "memberships/staff-a/organizations/a"), { uid: "staff-a", organizationId: "a", role: "staff", status: "active" });
    await setDoc(doc(database, "registrations/ORIGINAL_CUSTOMER_ID"), { organizationId: "a", caravanId: "ORIGINAL_TRIP_ID", amountCents: 8500, paymentTotalCents: 2500, passengerName: "Pessoa fictícia preservada" });
  }); runtime.db = env.authenticatedContext("platform", { aud: "demo-caravana77-test" }).firestore();
}
async function read(path: string) { return (await getDoc(doc(runtime.db!, path))).data()!; }
describe("manual commercial assignment actual SDK/candidate Rules", () => {
  it("blocks a second stale manual editor while retaining exact operation replay", async () => {
    await seed(); const id = commercialOperationId(); expect(await assignTenantPlan(input, id, 0)).toBe(1);
    await expect(assignTenantPlan({ ...input, planId: "premium" }, commercialOperationId(), 0)).rejects.toThrow("mudou desde");
    expect(await assignTenantPlan(input, id, 0)).toBe(1); expect((await read("subscriptions/a")).planId).toBe("pro");
  });
  it("atomically assigns canonical catalog and public limits with private audit and replay", async () => {
    await seed(); const id = commercialOperationId(); await Promise.all([assignTenantPlan(input, id), assignTenantPlan(input, id)]); await assignTenantPlan(input, id);
    const subscription = await read("subscriptions/a"); expect(subscription.monthlyCatalogCents).toBe(14900); expect(subscription.revision).toBe(1); expect(subscription.updatedAt.isEqual((await read(`commercialOperations/${id}`)).at)).toBe(true);
    await expect(assignTenantPlan({ ...input, planId: "premium" }, id)).rejects.toThrow("outros dados");
    expect((await getDocs(collection(runtime.db!, "commercialOperations"))).size).toBe(1);
    runtime.db = env.unauthenticatedContext().firestore(); const limits = await read("tenantEntitlements/a");
    expect(limits.limits).toEqual({ activeCaravans: 5, passengersPerCaravan: 200, internalUsers: 5 });
    for (const key of ["status", "planId", "monthlyCatalogCents", "overrideMonthlyCents", "actorUid", "ownerUid"]) expect(limits[key]).toBeUndefined();
    await assertFails(getDoc(doc(runtime.db!, "subscriptions/a"))); await assertFails(getDoc(doc(runtime.db!, `commercialOperations/${id}`)));
  });
  it("keeps promotional Pro90 temporary and downgrade/status do not rewrite customer records or counters", async () => {
    await seed(); const expiresAtMillis = Date.now() + 86400000;
    await assignTenantPlan({ ...input, setupWaived: true, override: { monthlyCents: 9000, expiresAtMillis, reason: "Promoção temporária sintética" } });
    const data = await read("subscriptions/a"); expect(data.monthlyCatalogCents).toBe(14900); expect(data.overrideMonthlyCents).toBe(9000); expect(data.setupFeeCents).toBe(0);
    expect(EntitlementService.resolve(subscriptionAssignment(data as CommercialSubscription), expiresAtMillis).monthlyCents).toBe(14900);
    await assignTenantPlan({ ...input, planId: "essencial" }); expect((await read("tenantUsage/a")).publishedCaravans).toBe(6);
    for (const status of ["past_due", "suspended", "cancelled"] as const) { await assignTenantPlan({ ...input, status }); expect((await read("tenantEntitlements/a")).growthEnabled).toBe(false); }
    let original: Record<string, unknown> | undefined; await env.withSecurityRulesDisabled(async (context) => { original = (await getDoc(doc(context.firestore(), "registrations/ORIGINAL_CUSTOMER_ID"))).data(); });
    expect(original).toMatchObject({ amountCents: 8500, paymentTotalCents: 2500, passengerName: "Pessoa fictícia preservada" });
    await assertFails(getDoc(doc(runtime.db!, "registrations/ORIGINAL_CUSTOMER_ID")));
  });
  it("denies tenant owners/staff/B/guest assignment and protects counters and audits even from platform client resets", async () => {
    await seed(); const id = commercialOperationId(); await assignTenantPlan(input, id);
    for (const uid of ["owner-a", "staff-a", "owner-b", "guest"]) {
      runtime.db = uid === "guest" ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid).firestore(); runtime.auth.currentUser.uid = uid;
      await expect(assignTenantPlan({ ...input, planId: "premium" })).rejects.toBeDefined();
      if (uid !== "owner-a") await assertFails(getDoc(doc(runtime.db!, "subscriptions/a")));
    }
    runtime.db = env.authenticatedContext("platform").firestore(); runtime.auth.currentUser.uid = "platform";
    await assertFails(updateDoc(doc(runtime.db!, "tenantUsage/a"), { publishedCaravans: 0 })); await assertFails(deleteDoc(doc(runtime.db!, "tenantUsage/a")));
    await assertFails(updateDoc(doc(runtime.db!, `commercialOperations/${id}`), { reason: "Forged" })); await assertFails(updateDoc(doc(runtime.db!, "subscriptions/a"), { monthlyCatalogCents: 1 }));
  });
  it("refuses existing tenant assignment without a trusted baseline instead of inventing an empty count", async () => {
    await seed(false); await expect(assignTenantPlan(input)).rejects.toThrow("inventário comercial"); expect((await getDoc(doc(runtime.db!, "subscriptions/a"))).exists()).toBe(false);
  });
  it("rejects forged complete SDK audit with invalid catalog, limits, override, setup or trusted actor", async () => {
    await seed();
    for (const kind of ["catalog", "limits", "override", "setup", "actor"]) {
      const id = commercialOperationId(); const { subscription, entitlements } = commercialDocuments(input, id, "platform", 1);
      if (kind === "catalog") subscription.monthlyCatalogCents = 1;
      if (kind === "limits") entitlements.limits.passengersPerCaravan = 999999;
      if (kind === "override") subscription.overrideMonthlyCents = -1;
      if (kind === "setup") subscription.setupFeeCents = 0;
      if (kind === "actor") subscription.updatedBy = "owner-a";
      const batch = writeBatch(runtime.db!); batch.set(doc(runtime.db!, "subscriptions/a"), subscription); batch.set(doc(runtime.db!, "tenantEntitlements/a"), entitlements);
      batch.set(doc(runtime.db!, `commercialOperations/${id}`), { organizationId: "a", actorUid: "platform", at: serverTimestamp(), action: "plan_assigned", payloadHash: "f".repeat(64), previous: null, subscription }); await assertFails(batch.commit());
    }
    expect((await getDoc(doc(runtime.db!, "subscriptions/a"))).exists()).toBe(false);
  });
});
