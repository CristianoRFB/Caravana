import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, setDoc, terminate, updateDoc, where } from "firebase/firestore";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { PlanCatalog } from "../src/lib/plan-catalog";
import { DEMO_ACCOUNTS } from "../src/lib/demo-identities";
import { seedDemoAccounts } from "../scripts/seed-demo.mjs";

let env: RulesTestEnvironment;
let seed: Awaited<ReturnType<typeof seedDemoAccounts>>;
const apps: FirebaseApp[] = [];
beforeAll(async () => {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19099") throw new Error("Local Auth emulator required.");
  env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  seed = await seedDemoAccounts();
});
afterEach(async () => { for (const app of apps.splice(0)) { await terminate(getFirestore(app)); await deleteApp(app); } });
afterAll(async () => env.cleanup());

async function signIn(key: keyof typeof DEMO_ACCOUNTS) {
  const app = initializeApp({ projectId: "demo-caravana77-test", apiKey: "synthetic-api-key", authDomain: "demo-caravana77-test.firebaseapp.com" }, `demo-${key}-${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
  const account = DEMO_ACCOUNTS[key];
  const credential = await signInWithEmailAndPassword(auth, account.email, account.password);
  expect(credential.user.uid).toBe(seed.accounts[key].uid);
  return { db, uid: credential.user.uid };
}

describe("fixed demonstration accounts with actual Auth sign-in and enforced Firestore Rules", () => {
  it("is idempotent and does not overwrite financial or operational demo edits", async () => {
    const { db } = await signIn("owner");
    await updateDoc(doc(db, "caravans/demo-ride-a"), { name: "Rascunho fictício preservado" });
    const again = await seedDemoAccounts();
    expect(again.accounts).toEqual(seed.accounts);
    expect(again.created).toBe(0);
    expect(again.platformOwnersCreated).toBe(0);
    expect((await getDoc(doc(db, "caravans/demo-ride-a"))).data()?.name).toBe("Rascunho fictício preservado");
  });
  it.each(["owner", "ownerB"] as const)("%s uses persisted membership and cannot query another organization's registrations or finance", async (key) => {
    const { db, uid } = await signIn(key);
    const organizationId = key === "owner" ? "demo-org-a" : "demo-org-b";
    const foreignOrganization = key === "owner" ? "demo-org-b" : "demo-org-a";
    const membership = await getDoc(doc(db, `memberships/${uid}/organizations/${organizationId}`));
    expect(membership.data()?.role).toBe("tenant_owner");
    expect((await getDoc(doc(db, `admins/${uid}`))).exists()).toBe(false);
    expect((await getDoc(doc(db, `platformOwners/${uid}`))).exists()).toBe(false);
    expect((await getDocs(query(collection(db, "registrations"), where("organizationId", "==", organizationId)))).size).toBeGreaterThan(0);
    await expect(getDocs(query(collection(db, "registrations"), where("organizationId", "==", foreignOrganization)))).rejects.toMatchObject({ code: "permission-denied" });
    const foreignTrip = key === "owner" ? "demo-ride-b" : "demo-ride-a";
    await expect(getDocs(collection(db, `caravans/${foreignTrip}/expenses`))).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("passenger has an own profile, no admin membership and no private list or global access", async () => {
    const { db, uid } = await signIn("passenger");
    const profile = await getDoc(doc(db, `profiles/${uid}`));
    expect(profile.data()?.role).toBe("passenger");
    expect(profile.data()?.registrationIds).toEqual([seed.registrationIds.passenger]);
    expect((await getDocs(collection(db, `memberships/${uid}/organizations`))).empty).toBe(true);
    await expect(getDocs(collection(db, "registrations"))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(getDoc(doc(db, `profiles/${seed.accounts.owner.uid}`))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(getDocs(collection(db, "organizations"))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(updateDoc(doc(db, `profiles/${uid}`), { role: "tenant_owner" })).rejects.toMatchObject({ code: "permission-denied" });
    await expect(setDoc(doc(db, `memberships/${uid}/organizations/demo-org-a`), { uid, organizationId: "demo-org-a", role: "tenant_owner", status: "active" })).rejects.toMatchObject({ code: "permission-denied" });
  });
});


describe("commercial demonstration with explicit A/B plans", () => {
  it.each(["owner", "ownerB"] as const)("%s reads its own contract and public limits without exposing the foreign contract", async (key) => {
    const { db, uid } = await signIn(key);
    const suffix = key === "owner" ? "a" : "b";
    const organizationId = `demo-org-${suffix}`;
    const plan = PlanCatalog[key === "owner" ? "essencial" : "pro"];
    const subscription = (await getDoc(doc(db, `subscriptions/${organizationId}`))).data();
    expect(subscription).toMatchObject({ organizationId, planId: plan.id, status: "demo", monthlyCatalogCents: plan.monthlyCents, setupFeeCents: 0 });
    const publicPolicy = (await getDoc(doc(db, `tenantEntitlements/${organizationId}`))).data();
    expect(publicPolicy).toMatchObject({ organizationId, limits: plan.limits, growthEnabled: true, growthUntil: null });
    expect(publicPolicy).not.toHaveProperty("monthlyCatalogCents");
    expect(publicPolicy).not.toHaveProperty("updatedBy");
    expect((await getDoc(doc(db, `tenantUsage/${organizationId}`))).data()).toMatchObject({ publishedCaravans: 1, activeMembers: 1, activeOwners: 1 });
    expect((await getDoc(doc(db, `tenantTeam/${organizationId}/members/${uid}`))).data()).toMatchObject({ uid, role: "tenant_owner", status: "active" });
    const foreignId = key === "owner" ? "demo-org-b" : "demo-org-a";
    await expect(getDoc(doc(db, `subscriptions/${foreignId}`))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(updateDoc(doc(db, `tenantUsage/${organizationId}`), { publishedCaravans: 0 })).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("preserves edited commercial status, counters and brand instead of resetting them on reseed", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "subscriptions/demo-org-a"), { status: "suspended" });
      await updateDoc(doc(ctx.firestore(), "tenantEntitlements/demo-org-a"), { growthEnabled: false });
      await updateDoc(doc(ctx.firestore(), "tenantUsage/demo-org-a"), { publishedCaravans: 2 });
      await updateDoc(doc(ctx.firestore(), "publicTenantSettings/demo-org-a"), { publicName: "Marca fictícia editada" });
    });
    expect((await seedDemoAccounts()).created).toBe(0);
    const { db } = await signIn("owner");
    expect((await getDoc(doc(db, "subscriptions/demo-org-a"))).data()?.status).toBe("suspended");
    expect((await getDoc(doc(db, "tenantEntitlements/demo-org-a"))).data()?.growthEnabled).toBe(false);
    expect((await getDoc(doc(db, "tenantUsage/demo-org-a"))).data()?.publishedCaravans).toBe(2);
    expect((await getDoc(doc(db, "publicTenantSettings/demo-org-a"))).data()?.publicName).toBe("Marca fictícia editada");
  });
  it("refuses to reactivate an existing revoked member and leaves every fixture unchanged", async () => {
    const memberPath = `memberships/${seed.accounts.ownerB.uid}/organizations/demo-org-b`;
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), memberPath), { status: "revoked" }); });
    await expect(seedDemoAccounts()).rejects.toThrow("Demo fixture conflict");
    await env.withSecurityRulesDisabled(async (ctx) => {
      expect((await getDoc(doc(ctx.firestore(), memberPath))).data()?.status).toBe("revoked");
      expect((await getDoc(doc(ctx.firestore(), "tenantUsage/demo-org-a"))).data()?.publishedCaravans).toBe(2);
    });
  });
});
