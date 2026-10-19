import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { seedSyntheticEntitlements } from "./fixtures/commercial-policy";
import { seedSyntheticNamespaceBootstrap } from "./fixtures/namespace-bootstrap";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { onboardTenant, changeTenantStatus } from "../src/lib/platform";
import { reserveSeat } from "../src/lib/data";
import type { Caravan } from "../src/lib/types";

const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "platform-actor" } }, firebaseConfigured: true }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
const createId = "1".repeat(32);
const statusId = "2".repeat(32);
const input = { name: "Organizadora Fictícia Nova", slug: "synthetic-new", ownerUid: "new-owner" };
const passenger = { passengerName: "Pessoa Fictícia", phone: "11900000000", email: "", city: "", boardingPointId: "point", boardingPointName: "Local fictício", emergencyContact: "Contato fictício", notes: "" };
const trip = { id: "legacy-trip", organizationId: "legacy-org", name: "Viagem fictícia legada", slug: "legacy-synthetic", status: "published", capacity: 25, reservedSeats: 0, priceCents: 8500, boardingPoints: [{ id: "point", name: "Local fictício" }] } as Caravan;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { runtime.db = null; runtime.auth.currentUser.uid = "platform-actor"; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await seedSyntheticEntitlements(db, "legacy-org", "premium");
    await seedSyntheticNamespaceBootstrap(db, ["legacy-org"]);
    await setDoc(doc(db, "platformOwners/platform-actor"), { status: "active" });
    await setDoc(doc(db, "organizations/legacy-org"), { name: "Cliente fictício legado", untouched: "original metadata" });
    await setDoc(doc(db, "admins/legacy-owner"), { organizationId: "legacy-org", role: "admin" });
    await setDoc(doc(db, "caravans/legacy-trip"), trip);
    await setDoc(doc(db, "registrations/private-legacy"), { organizationId: "legacy-org", caravanId: "legacy-trip", passengerName: "Pessoa fictícia histórica", paymentTotalCents: 2500 });
    await setDoc(doc(db, "registrations/private-legacy/payments/historical"), { amountCents: 2500, status: "active" });
    await setDoc(doc(db, "registrations/private-legacy/proofs/current"), { registrationId: "private-legacy", organizationId: "legacy-org", caravanId: "legacy-trip", content: "SYNTHETIC" });
  });
  runtime.db = env.authenticatedContext("platform-actor").firestore();
}
describe("platform operations enforce server-side authority and immutable atomic audit", () => {
  it("blocks onboarding without a trusted complete inventory and forbids client bootstrap publication", async () => {
    await seed(); await assertFails(setDoc(doc(runtime.db!, "namespaceBootstrap/state"), { version: "namespace-v1", inventoryComplete: true, manifestHash: "a".repeat(64) }));
    await env.withSecurityRulesDisabled(async (context) => deleteDoc(doc(context.firestore(), "namespaceBootstrap/state")));
    await expect(onboardTenant(input, createId)).rejects.toThrow("inventário de namespaces");
    expect((await getDoc(doc(runtime.db!, `organizations/${input.slug}`))).exists()).toBe(false);
  });
  it("reserves orphan historical namespaces even when their root organization is absent", async () => {
    await seed(); await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "tenantNamespaces/orphan-history"), { namespace: "orphan-history", organizationId: "orphan-history", version: "namespace-v1", state: "reserved" });
      await setDoc(doc(context.firestore(), "registrations/historical-orphan"), { organizationId: "orphan-history", passengerName: "Histórico fictício preservado", paymentTotalCents: 2500 });
    });
    await expect(onboardTenant({ ...input, slug: "orphan-history" }, createId)).rejects.toThrow("histórico reservado");
    const batch = writeBatch(runtime.db!); const time = serverTimestamp(); const slug = "orphan-history";
    batch.set(doc(runtime.db!, "organizations", slug), { name: input.name, slug, ownerUid: input.ownerUid, status: "active", createdAt: time, createdBy: "platform-actor", updatedAt: time, updatedBy: "platform-actor", lastPlatformOperationId: createId });
    batch.set(doc(runtime.db!, "tenantNamespaces", slug), { namespace: slug, organizationId: slug, version: "namespace-v1", state: "active", createdAt: time, actorUid: "platform-actor", lastPlatformOperationId: createId });
    batch.set(doc(runtime.db!, "memberships", input.ownerUid, "organizations", slug), { uid: input.ownerUid, organizationId: slug, role: "tenant_owner", status: "active", createdAt: time, updatedAt: time });
    batch.set(doc(runtime.db!, "organizationAvailability", slug), { organizationId: slug, status: "active", updatedAt: time, lastPlatformOperationId: createId });
    batch.set(doc(runtime.db!, "platformAudit", createId), { organizationId: slug, actorUid: "platform-actor", action: "tenant_created", at: time, previousStatus: "absent", status: "active", details: { name: input.name, slug, ownerUid: input.ownerUid } });
    await assertFails(batch.commit()); await assertFails(getDoc(doc(runtime.db!, "registrations/historical-orphan")));
    await env.withSecurityRulesDisabled(async (context) => expect((await getDoc(doc(context.firestore(), "registrations/historical-orphan"))).data()?.paymentTotalCents).toBe(2500));
    expect((await getDoc(doc(runtime.db!, "organizations", slug))).exists()).toBe(false);
  });
  it("creates organization, availability, owner membership and audit atomically, then safely replays", async () => {
    await seed();
    expect(await onboardTenant(input, createId)).toBe(input.slug);
    await onboardTenant(input, createId);
    expect((await getDocs(collection(runtime.db!, "platformAudit"))).size).toBe(1);
    const owner = env.authenticatedContext("new-owner").firestore();
    const membership = await getDoc(doc(owner, `memberships/new-owner/organizations/${input.slug}`));
    expect(membership.data()?.role).toBe("tenant_owner");
    expect(membership.data()?.createdAt.toMillis()).toBeGreaterThan(0);
    expect((await getDoc(doc(owner, `organizations/${input.slug}`))).data()?.name).toBe(input.name);
    const guest = env.unauthenticatedContext().firestore();
    expect((await getDoc(doc(guest, `organizationAvailability/${input.slug}`))).data()?.status).toBe("active");
    await assertFails(getDocs(collection(guest, "organizationAvailability")));
    await expect(onboardTenant({ ...input, name: "Outra operação" }, createId)).rejects.toThrow("outros dados");
    await expect(onboardTenant(input, "3".repeat(32))).rejects.toThrow("Nenhum dado foi substituído");
  });
  it("changes status with audit and public projection while preserving legacy IDs, admins and financial history", async () => {
    await seed();
    await changeTenantStatus("legacy-org", "suspended", statusId);
    await changeTenantStatus("legacy-org", "suspended", statusId);
    expect((await getDocs(collection(runtime.db!, "platformAudit"))).size).toBe(1);
    const owner = env.authenticatedContext("legacy-owner").firestore();
    expect((await getDoc(doc(owner, "organizations/legacy-org"))).data()?.untouched).toBe("original metadata");
    expect((await getDoc(doc(owner, "admins/legacy-owner"))).data()?.organizationId).toBe("legacy-org");
    expect((await getDoc(doc(owner, "registrations/private-legacy"))).data()?.paymentTotalCents).toBe(2500);
    expect((await getDoc(doc(owner, "registrations/private-legacy/payments/historical"))).data()?.amountCents).toBe(2500);
    expect((await getDoc(doc(owner, "registrations/private-legacy/proofs/current"))).data()?.content).toBe("SYNTHETIC");
    runtime.db = env.unauthenticatedContext().firestore();
    await expect(reserveSeat(trip, passenger)).rejects.toThrow("temporariamente suspensas");
    runtime.db = env.authenticatedContext("platform-actor").firestore();
    await changeTenantStatus("legacy-org", "active", "4".repeat(32));
    runtime.db = env.unauthenticatedContext().firestore();
    expect(await reserveSeat(trip, passenger)).toMatch(/^[a-f0-9]{64}$/);
  });
  it("denies a booking at the Rules layer even with a stale public active projection", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "organizations/legacy-org"), { status: "suspended" });
      await setDoc(doc(context.firestore(), "organizationAvailability/legacy-org"), { status: "active" });
    });
    runtime.db = env.unauthenticatedContext().firestore();
    await assertFails(reserveSeat(trip, passenger));
    expect((await getDoc(doc(runtime.db!, "caravans/legacy-trip"))).data()?.reservedSeats).toBe(0);
  });
  it("requires the companion audit and rejects mutation/deletion of audit, organization and platform privileges", async () => {
    await seed();
    await assertFails(updateDoc(doc(runtime.db!, "organizations/legacy-org"), { status: "suspended", updatedAt: serverTimestamp(), updatedBy: "platform-actor", lastPlatformOperationId: statusId }));
    await onboardTenant(input, createId);
    await assertFails(updateDoc(doc(runtime.db!, `platformAudit/${createId}`), { actorUid: "forged" }));
    await assertFails(deleteDoc(doc(runtime.db!, `platformAudit/${createId}`)));
    await assertFails(deleteDoc(doc(runtime.db!, `organizations/${input.slug}`)));
    await assertFails(setDoc(doc(runtime.db!, "platformOwners/self-grant"), { status: "active" }));
    await assertFails(updateDoc(doc(runtime.db!, `organizations/${input.slug}`), { name: "Silent replacement" }));
    await assertFails(getDoc(doc(runtime.db!, "registrations/private-legacy")));
    await assertFails(getDoc(doc(runtime.db!, "registrations/private-legacy/proofs/current")));
  });
  it.each(["legacy-owner", "unassigned"])("%s cannot onboard, alter platform status or fabricate audit", async (uid) => {
    await seed(); runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid, { role: "platform_owner" }).firestore();
    await assertFails(onboardTenant(input, createId));
    await assertFails(changeTenantStatus("legacy-org", "suspended", statusId));
    await assertFails(setDoc(doc(runtime.db!, `platformAudit/${statusId}`), { action: "tenant_status_changed", organizationId: "legacy-org", actorUid: uid, at: serverTimestamp(), status: "suspended", previousStatus: "active", details: {} }));
  });
  it("rejects a partial onboarding without its owner membership and cannot smuggle a plan or passenger data", async () => {
    await seed();
    const db = runtime.db!;
    const time = serverTimestamp();
    const partial = () => {
      const batch = writeBatch(db);
      batch.set(doc(db, `organizations/${input.slug}`), { ...input, status: "active", createdAt: time, updatedAt: time, createdBy: "platform-actor", updatedBy: "platform-actor", lastPlatformOperationId: createId });
      batch.set(doc(db, `organizationAvailability/${input.slug}`), { organizationId: input.slug, status: "active", updatedAt: time, lastPlatformOperationId: createId });
      batch.set(doc(db, `platformAudit/${createId}`), { organizationId: input.slug, actorUid: "platform-actor", action: "tenant_created", at: time, previousStatus: "absent", status: "active", details: input });
      return batch;
    };
    await assertFails(partial().commit());
    const orphanPath = `memberships/${input.ownerUid}/organizations/${input.slug}`;
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), orphanPath), { uid: "forged", organizationId: input.slug, role: "tenant_owner", status: "active", createdAt: "old" }));
    await assertFails(partial().commit());
    await env.withSecurityRulesDisabled(async (context) => deleteDoc(doc(context.firestore(), orphanPath)));
    expect((await getDoc(doc(db, `organizations/${input.slug}`))).exists()).toBe(false);
    await onboardTenant(input, createId);
    await assertFails(updateDoc(doc(db, `organizations/${input.slug}`), { plan: "free-forever", passengers: ["PRIVATE"] }));
  });
  it("revoked platform authority cannot reuse a session to perform new operations", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "platformOwners/platform-actor"), { status: "revoked" }));
    await assertFails(onboardTenant(input, createId));
    await assertFails(changeTenantStatus("legacy-org", "suspended", statusId));
  });
});
