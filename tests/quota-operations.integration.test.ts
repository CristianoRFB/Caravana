import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
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
});
