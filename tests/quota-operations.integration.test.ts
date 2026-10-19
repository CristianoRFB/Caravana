import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { pendingWrites } from "../src/lib/pending-writes";
import type { Caravan } from "../src/lib/types";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } })); vi.mock("../src/lib/firebase", () => runtime);
import { createLimitedCaravan, updateLimitedCaravan, saveInternalMember, quotaOperationId } from "../src/lib/quota-operations";
let env: RulesTestEnvironment;
const payload: Omit<Caravan, "id" | "organizationId" | "reservedSeats"> = { name: "Caravana sintética", slug: "same-slug", event: "Fictício", description: "Dados sintéticos", date: "2026-11-05", departureTime: "06:00", returnTime: "22:00", city: "Cidade fictícia", destination: "Destino fictício", address: "Local fictício", priceCents: 8500, capacity: 60, status: "published", pixKey: "", pixReceiver: "", whatsapp: "", boardingPoints: [{ id: "point", name: "Terminal fictício", address: "", time: "06:00" }], benefits: [], rules: [], faqs: [], announcements: [] };
beforeAll(async () => { if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Synthetic emulator only"); env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); await env.clearFirestore(); runtime.db = null; runtime.auth.currentUser.uid = "owner-a"; }); afterAll(async () => env.cleanup());
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    for (const org of ["a", "b"]) {
      await setDoc(doc(database, `organizations/${org}`), { name: `Sintético ${org}` });
      await setDoc(doc(database, `memberships/owner-${org}/organizations/${org}`), { uid: `owner-${org}`, organizationId: org, role: "tenant_owner", status: "active", createdAt: "2026-10-16" });
      await setDoc(doc(database, `tenantUsage/${org}`), { organizationId: org, publishedCaravans: 1, activeMembers: 1, activeOwners: 1, version: "commercial-v1" });
      await setDoc(doc(database, `tenantEntitlements/${org}`), { organizationId: org, limits: { activeCaravans: 2, passengersPerCaravan: 60, internalUsers: 2 }, growthEnabled: true, growthUntil: null });
      await setDoc(doc(database, `caravans/base-${org}`), { ...payload, organizationId: org, reservedSeats: 1 });
    }
  }); runtime.db = env.authenticatedContext("owner-a").firestore();
}
async function read(path: string) { return (await getDoc(doc(runtime.db!, path))).data()!; }
describe("quota-linked caravan and internal membership operations", () => {
  it("serializes the final published slot, replays creation and never reopens an archived caravan", async () => {
    await seed(); const id = quotaOperationId(); const other = quotaOperationId();
    const results = await Promise.allSettled([createLimitedCaravan("a", payload, id), createLimitedCaravan("a", payload, other)]);
    expect(results.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    const accepted = results[0].status === "fulfilled" ? id : other;
    expect((await read("tenantUsage/a")).publishedCaravans).toBe(2);
    expect(await createLimitedCaravan("a", payload, accepted)).toBe(accepted);
    await expect(createLimitedCaravan("a", { ...payload, name: "Different" }, accepted)).rejects.toThrow("outros dados");
    const archive = quotaOperationId(); await updateLimitedCaravan(accepted, { status: "archived" }, archive); await updateLimitedCaravan(accepted, { status: "archived" }, archive);
    await createLimitedCaravan("a", payload, accepted); expect((await read(`caravans/${accepted}`)).status).toBe("archived"); expect((await read("tenantUsage/a")).publishedCaravans).toBe(1);
  });
  it("requires a plan for new growth but keeps configuration/history and decrements exact published count", async () => {
    await seed(); await env.withSecurityRulesDisabled(async (context) => { await updateDoc(doc(context.firestore(), "tenantEntitlements/a"), { growthEnabled: false }); });
    await expect(createLimitedCaravan("a", payload)).rejects.toThrow("plano");
    await updateLimitedCaravan("base-a", { name: "Histórico preservado" }); await updateLimitedCaravan("base-a", { status: "archived" });
    expect((await read("tenantUsage/a")).publishedCaravans).toBe(0); expect((await read("caravans/base-a")).reservedSeats).toBe(1);
    await expect(updateLimitedCaravan("base-a", { status: "published" })).rejects.toThrow("plano");
  });
  it("protects final internal slot, allows audited revoke/reactivate and never removes the last owner", async () => {
    await seed(); await saveInternalMember("a", "staff-one", "staff", "active", "Convite sintético conferido");
    await expect(saveInternalMember("a", "staff-two", "staff", "active", "Outro convite sintético")).rejects.toThrow("plano");
    await expect(saveInternalMember("a", "owner-a", "staff", "active", "Troca de papel")).rejects.toThrow("responsável ativo");
    const revoke = quotaOperationId(); await saveInternalMember("a", "staff-one", "staff", "revoked", "Revogação sintética", revoke); await saveInternalMember("a", "staff-one", "staff", "revoked", "Revogação sintética", revoke);
    expect((await read("tenantUsage/a")).activeMembers).toBe(1); expect((await read("memberships/staff-one/organizations/a")).status).toBe("revoked");
    await saveInternalMember("a", "staff-two", "staff", "active", "Novo convite conferido"); expect((await read("tenantUsage/a")).activeMembers).toBe(2);
  });
  it("denies direct owner counter/status bypass and rejects B/global writes into the existing tenant", async () => {
    await seed(); await assertFails(updateDoc(doc(runtime.db!, "caravans/base-a"), { status: "archived" })); await assertFails(updateDoc(doc(runtime.db!, "tenantUsage/a"), { publishedCaravans: 0 }));
    await assertFails(setDoc(doc(runtime.db!, "caravans/forged"), { ...payload, organizationId: "a", reservedSeats: 0 }));
    runtime.db = env.authenticatedContext("owner-b").firestore(); runtime.auth.currentUser.uid = "owner-b";
    await expect(createLimitedCaravan("a", payload)).rejects.toBeDefined(); await expect(saveInternalMember("a", "owner-b", "tenant_owner", "active", "Tentativa B")).rejects.toBeDefined();
  });
  it("rejects fabricated counter audits, last-owner removal and historical baseline replacement through the SDK", async () => {
    await seed();
    const op = quotaOperationId(); const before = { publishedCaravans: 1, activeMembers: 1, activeOwners: 1 };
    const after = { ...before, publishedCaravans: 0 };
    const batch = writeBatch(runtime.db!);
    batch.update(doc(runtime.db!, "tenantUsage/a"), { ...after, lastQuotaOperationId: op, updatedAt: serverTimestamp() });
    batch.set(doc(runtime.db!, `tenantQuotaOperations/${op}`), { organizationId: "a", entityId: "base-a", kind: "caravan", action: "caravan_updated", actorUid: "owner-a", at: serverTimestamp(), requestHash: "a".repeat(64), reason: "Contador falso", before, after, beforeStatus: "published", afterStatus: "published", beforeRole: "", afterRole: "" });
    await assertFails(batch.commit());
    await assertFails(updateDoc(doc(runtime.db!, "memberships/owner-a/organizations/a"), { role: "staff" }));
    await assertFails(setDoc(doc(runtime.db!, "tenantUsage/a"), { organizationId: "a", version: "commercial-v1", publishedCaravans: 0, activeMembers: 100, activeOwners: 100 }));
    await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "platformOwners/platform"), { status: "active" }); });
    runtime.db = env.authenticatedContext("platform").firestore(); runtime.auth.currentUser.uid = "platform";
    await expect(saveInternalMember("a", "platform", "tenant_owner", "active", "Escalada global proibida")).rejects.toBeDefined();
  });
  it("serializes competing members at the last internal slot", async () => {
    await seed();
    const results = await Promise.allSettled([saveInternalMember("a", "one", "staff", "active", "Convite sintético um"), saveInternalMember("a", "two", "staff", "active", "Convite sintético dois")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await read("tenantUsage/a")).activeMembers).toBe(2);
  });
  it("serializes simultaneous owner revocations and preserves a responsible owner", async () => {
    await seed(); await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "memberships/owner-two/organizations/a"), { uid: "owner-two", organizationId: "a", role: "tenant_owner", status: "active" });
      await updateDoc(doc(context.firestore(), "tenantUsage/a"), { activeMembers: 2, activeOwners: 2 });
    });
    const first = saveInternalMember("a", "owner-a", "tenant_owner", "revoked", "Saída sintética um");
    runtime.db = env.authenticatedContext("owner-two").firestore(); runtime.auth.currentUser.uid = "owner-two";
    const second = saveInternalMember("a", "owner-two", "tenant_owner", "revoked", "Saída sintética dois");
    const results = await Promise.allSettled([first, second]); expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await env.withSecurityRulesDisabled(async (context) => { const state = (await getDoc(doc(context.firestore(), "tenantUsage/a"))).data()!; expect(state.activeOwners).toBe(1); expect(state.activeMembers).toBe(1); });
  });
});
