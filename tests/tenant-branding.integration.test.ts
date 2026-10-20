import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch, type Firestore } from "firebase/firestore";
import { pendingWrites } from "../src/lib/pending-writes";
import { type TenantBranding } from "../src/lib/tenant-branding";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } }, firebaseConfigured: true }));
vi.mock("../src/lib/firebase", () => runtime);
import { saveTenantBranding, resolveTenantSlug, brandingOperationId } from "../src/lib/tenant-branding-data";
import { findCaravan, listPublishedCaravans } from "../src/lib/data";
let env: RulesTestEnvironment;
const brand = (org: string): TenantBranding => ({ organizationId: org, slug: `sintetico-${org}`, publicName: `Organização sintética ${org}`, description: "Marca fictícia", primaryColor: "#0f766e", logo: "", website: "https://example.com", contactEmail: "contato@example.com", whatsapp: "5511999999999", operationalMessage: "Conferência manual" });
beforeAll(async () => { if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Local emulator only"); env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); runtime.db = null; runtime.auth.currentUser.uid = "owner-a"; await env.clearFirestore(); }); afterAll(async () => env.cleanup());
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    for (const org of ["a", "b"]) {
      await setDoc(doc(context.firestore(), `organizations/${org}`), { name: `Organização sintética ${org}`, status: "active" });
      await setDoc(doc(context.firestore(), `memberships/owner-${org}/organizations/${org}`), { organizationId: org, uid: `owner-${org}`, role: "tenant_owner", status: "active" });
      await setDoc(doc(context.firestore(), `caravans/ride-${org}`), { organizationId: org, slug: "same-slug", name: "Mesmo nome", status: "published" });
    }
    await setDoc(doc(context.firestore(), "memberships/staff-a/organizations/a"), { organizationId: "a", uid: "staff-a", role: "staff", status: "active" });
  }); runtime.db = env.authenticatedContext("owner-a").firestore();
}
describe("public tenant branding and authoritative route mapping", () => {
  it("does not bootstrap an orphan organization through an otherwise valid branding write", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => { await deleteDoc(doc(context.firestore(), "organizations/a")); });
    await expect(saveTenantBranding(brand("a"))).rejects.toBeDefined();
    expect(await resolveTenantSlug(brand("a").slug)).toBeNull();
    await env.withSecurityRulesDisabled(async (context) => {
      expect((await getDoc(doc(context.firestore(), "publicTenantSettings/a"))).exists()).toBe(false);
      expect((await getDoc(doc(context.firestore(), "organizations/a"))).exists()).toBe(false);
    });
  });
  it("cannot claim another historical organization or orphan namespace as a new public slug", async () => {
    await seed(); await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations/historical-root"), { name: "Raiz histórica fictícia B" });
      await setDoc(doc(context.firestore(), "tenantNamespaces/historical-orphan"), { namespace: "historical-orphan", organizationId: "b", state: "reserved", version: "namespace-v1" });
    });
    await expect(saveTenantBranding({ ...brand("a"), slug: "historical-root" }, brandingOperationId())).rejects.toBeDefined();
    await expect(saveTenantBranding({ ...brand("a"), slug: "historical-orphan" }, brandingOperationId())).rejects.toBeDefined();
    expect(await resolveTenantSlug("historical-root")).toBeNull(); expect(await resolveTenantSlug("historical-orphan")).toBeNull();
  });
  it("validates content against a forged complete SDK audit, not merely the absence of an audit", async () => {
    await seed(); await saveTenantBranding(brand("a"));
    for (const patch of [{ primaryColor: "red;background:url(javascript:x)" }, { logo: "data:image/svg+xml,<svg/>" }, { website: "https://user:pass@example.com/x" }, { contactEmail: "a@example.com\nBcc:other@example.com" }, { passengerIds: ["secret"] }]) {
      const id = brandingOperationId(); const settings = { ...brand("a"), ...patch, updatedAt: serverTimestamp(), lastBrandOperationId: id };
      const batch = writeBatch(runtime.db!); batch.set(doc(runtime.db!, "publicTenantSettings/a"), settings);
      batch.set(doc(runtime.db!, `tenantBrandOperations/${id}`), { organizationId: "a", actorUid: "owner-a", at: serverTimestamp(), action: "branding_saved", slug: settings.slug, settings });
      await assertFails(batch.commit());
    }
  });
  it("saves public fields and private immutable audit, replays safely and resolves a trusted slug", async () => {
    await seed(); const id = brandingOperationId(); await saveTenantBranding(brand("a"), id); await saveTenantBranding(brand("a"), id);
    await expect(saveTenantBranding({ ...brand("a"), publicName: "Other name" }, id)).rejects.toThrow("outros dados");
    const ref = doc(runtime.db!, `tenantBrandOperations/${id}`); expect((await getDoc(ref)).data()?.actorUid).toBe("owner-a"); await assertFails(updateDoc(ref, { actorUid: "owner-b" }));
    runtime.db = env.unauthenticatedContext().firestore(); expect(await resolveTenantSlug("sintetico-a")).toBe("a"); expect(await resolveTenantSlug("unknown-slug")).toBeNull();
    const settings = (await getDoc(doc(runtime.db!, "publicTenantSettings/a"))).data()!;
    expect(settings.publicName).toBe("Organização sintética a"); expect(settings.actorUid).toBeUndefined(); expect(settings.ownerUid).toBeUndefined();
    await assertFails(getDoc(doc(runtime.db!, `tenantBrandOperations/${id}`)));
  });
  it("preserves stable URLs and atomically prevents two tenants claiming the same slug", async () => {
    await seed(); await saveTenantBranding(brand("a"));
    await expect(saveTenantBranding({ ...brand("a"), slug: "new-address" })).rejects.toThrow("preservado");
    runtime.db = env.authenticatedContext("owner-b").firestore(); runtime.auth.currentUser.uid = "owner-b";
    await expect(saveTenantBranding({ ...brand("b"), slug: brand("a").slug })).rejects.toThrow("outra organização");
    await saveTenantBranding(brand("b")); expect(await resolveTenantSlug(brand("b").slug)).toBe("b");
  });
  it("denies unauthorized config/mapping and direct SDK CSS, SVG, credentials and timestamp forgery", async () => {
    await seed(); await saveTenantBranding(brand("a"));
    for (const uid of ["staff-a", "owner-b", "guest"]) {
      runtime.db = uid === "guest" ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid).firestore(); runtime.auth.currentUser.uid = uid;
      await expect(saveTenantBranding({ ...brand("a"), publicName: "Forged" })).rejects.toBeDefined();
      await assertFails(setDoc(doc(runtime.db!, "tenantSlugs/forged-address"), { slug: "forged-address", organizationId: "a" }));
    }
    runtime.db = env.authenticatedContext("owner-a").firestore(); runtime.auth.currentUser.uid = "owner-a";
    for (const patch of [{ primaryColor: "red; background:url(x)" }, { logo: "data:image/svg+xml,<svg/>" }, { logo: "https://user:pass@example.com/x.png" }, { publicName: "x" }, { website: "javascript:alert(1)" }, { updatedAt: new Date("2020-01-01") }]) await assertFails(updateDoc(doc(runtime.db!, "publicTenantSettings/a"), patch));
    await assertFails(deleteDoc(doc(runtime.db!, "tenantSlugs/sintetico-a")));
  });
  it("scopes duplicate caravan slugs and never selects an arbitrary tenant for a legacy URL", async () => {
    await seed(); runtime.db = env.unauthenticatedContext().firestore();
    expect((await findCaravan("same-slug", "a"))?.id).toBe("ride-a"); expect((await findCaravan("same-slug", "b"))?.id).toBe("ride-b");
    expect((await listPublishedCaravans("a")).map((trip) => trip.id)).toEqual(["ride-a"]);
    await expect(findCaravan("same-slug")).rejects.toThrow("link completo");
    await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "legacyTripAliases/same-slug"), { organizationId: "a", caravanId: "ride-a" }); });
    expect((await findCaravan("same-slug"))?.id).toBe("ride-a");
    await assertFails(setDoc(doc(env.authenticatedContext("owner-b").firestore(), "legacyTripAliases/same-slug"), { organizationId: "b", caravanId: "ride-b" }));
  });
});
