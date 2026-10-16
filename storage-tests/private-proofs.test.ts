import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { connectStorageEmulator, deleteObject, getBytes, getMetadata, getStorage, listAll, ref, uploadBytes } from "firebase/storage";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { DEMO_ACCOUNTS } from "../src/lib/demo-identities";
import { assertDemoSeedEnvironment, seedDemoAccounts } from "../scripts/seed-demo.mjs";

const bucket = "demo-caravana77-test.appspot.com";
const pathA = `proofs/demo-org-a/demo-ride-a/${"d".repeat(64)}/historico.pdf`;
const pathB = `proofs/demo-org-b/demo-ride-b/${"f".repeat(64)}/historico.pdf`;
const bytes = new TextEncoder().encode("%PDF-1.4\nSYNTHETIC PRIVATE PROOF");
const apps: FirebaseApp[] = [];
let env: RulesTestEnvironment;
let seed: Awaited<ReturnType<typeof seedDemoAccounts>>;

beforeAll(async () => {
  assertDemoSeedEnvironment();
  env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { host: "127.0.0.1", port: 18080, rules: readFileSync("firestore.rules", "utf8") }, storage: { host: "127.0.0.1", port: 19199, rules: readFileSync("storage.rules", "utf8") } });
  seed = await seedDemoAccounts();
  await env.withSecurityRulesDisabled(async (context) => {
    for (const path of [pathA, pathB]) await context.storage(`gs://${bucket}`).ref(path).put(bytes, { contentType: "application/pdf" });
  });
});
afterEach(async () => { for (const app of apps.splice(0)) await deleteApp(app); });
afterAll(async () => env.cleanup());

async function storageFor(account?: keyof typeof DEMO_ACCOUNTS) {
  const app = initializeApp({ projectId: "demo-caravana77-test", apiKey: "synthetic-api-key", storageBucket: bucket }, `storage-${account || "guest"}-${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  const storage = getStorage(app);
  connectStorageEmulator(storage, "127.0.0.1", 19199);
  if (account) await signInWithEmailAndPassword(auth, DEMO_ACCOUNTS[account].email, DEMO_ACCOUNTS[account].password);
  return storage;
}

describe("legacy Storage paths under active membership authority", () => {
  it("reads the existing original path with owner A while denying B metadata/content", async () => {
    const storage = await storageFor("owner");
    expect((await getMetadata(ref(storage, pathA))).contentType).toBe("application/pdf");
    expect(new Uint8Array(await getBytes(ref(storage, pathA)))).toEqual(bytes);
    await expect(getMetadata(ref(storage, pathB))).rejects.toMatchObject({ code: "storage/unauthorized" });
    await expect(getBytes(ref(storage, pathB))).rejects.toMatchObject({ code: "storage/unauthorized" });
  });
  it("owner B can read B without private access to A", async () => {
    const storage = await storageFor("ownerB");
    expect(new Uint8Array(await getBytes(ref(storage, pathB)))).toEqual(bytes);
    await expect(getMetadata(ref(storage, pathA))).rejects.toMatchObject({ code: "storage/unauthorized" });
  });
  it("staff reads its organization's original file, but cannot list a bucket or delete history", async () => {
    const uid = seed.accounts.owner.uid;
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `memberships/${uid}/organizations/demo-org-a`), { role: "staff" }));
    try {
      const storage = await storageFor("owner");
      expect(new Uint8Array(await getBytes(ref(storage, pathA)))).toEqual(bytes);
      await expect(listAll(ref(storage, "proofs/demo-org-a"))).rejects.toMatchObject({ code: "storage/unauthorized" });
      await expect(deleteObject(ref(storage, pathA))).rejects.toMatchObject({ code: "storage/unauthorized" });
      await expect(getBytes(ref(storage, pathB))).rejects.toMatchObject({ code: "storage/unauthorized" });
    } finally {
      await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), `memberships/${uid}/organizations/demo-org-a`), { role: "tenant_owner" }));
    }
  });
  it("denies passenger and anonymous reads, including guessed raw HTTP download URLs", async () => {
    for (const account of [undefined, "passenger"] as const) {
      const storage = await storageFor(account);
      await expect(getMetadata(ref(storage, pathA))).rejects.toMatchObject({ code: "storage/unauthorized" });
    }
    const url = `http://127.0.0.1:19199/v0/b/${bucket}/o/${encodeURIComponent(pathA)}?alt=media`;
    expect((await fetch(url)).status).toBe(403);
    expect((await fetch(`${url}&token=invalid-synthetic-token`)).status).toBe(403);
  });
  it("denies a forged registration association and all client Storage mutations; active proof uploads remain in Firestore", async () => {
    const storage = await storageFor("owner");
    const forged = `proofs/demo-org-a/demo-ride-a/${"f".repeat(64)}/historico.pdf`;
    await env.withSecurityRulesDisabled(async (context) => context.storage(`gs://${bucket}`).ref(forged).put(bytes, { contentType: "application/pdf" }));
    await expect(getMetadata(ref(storage, forged))).rejects.toMatchObject({ code: "storage/unauthorized" });
    await expect(uploadBytes(ref(storage, pathA), bytes, { contentType: "application/pdf" })).rejects.toMatchObject({ code: "storage/unauthorized" });
    await expect(deleteObject(ref(storage, pathA))).rejects.toMatchObject({ code: "storage/unauthorized" });
    const guest = await storageFor();
    await expect(uploadBytes(ref(guest, pathA.replace("historico", "novo")), bytes, { contentType: "application/pdf" })).rejects.toMatchObject({ code: "storage/unauthorized" });
  });
  it("revocation cannot fall back to a preserved legacy admin record", async () => {
    const storage = await storageFor("owner");
    const uid = seed.accounts.owner.uid;
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `admins/${uid}`), { organizationId: "demo-org-a", role: "admin" });
      await updateDoc(doc(context.firestore(), `memberships/${uid}/organizations/demo-org-a`), { status: "revoked" });
    });
    await expect(getMetadata(ref(storage, pathA))).rejects.toMatchObject({ code: "storage/unauthorized" });
  });
});
