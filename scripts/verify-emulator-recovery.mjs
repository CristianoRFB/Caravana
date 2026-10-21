// Called only by the fixed local recovery runner; all accounts and bytes fictitious.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDemoSeedEnvironment, seedDemoAccounts } from "./seed-demo.mjs";
import { DEMO_ACCOUNTS } from "../src/lib/demo-identities.ts";

assertDemoSeedEnvironment();
assert.equal(process.env.GCLOUD_PROJECT, "demo-caravana77-test");
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, "127.0.0.1:19199");
assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
assert.equal(process.env.FIREBASE_TOKEN, undefined);
const phase = process.argv[2];
assert.ok(["seed", "verify"].includes(phase) && process.argv.length === 3);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = realpathSync(process.env.CARAVANA_RECOVERY_RUN);
assert.equal(path.dirname(directory), realpathSync(path.join(root, ".firebase", "recovery-rehearsal")));
const { initializeTestEnvironment } = await import("@firebase/rules-unit-testing");
const { initializeApp, deleteApp } = await import("firebase/app");
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = await import("firebase/auth");
const { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, updateDoc, terminate } = await import("firebase/firestore");
const { getStorage, connectStorageEmulator, ref, getBytes, getMetadata, listAll, deleteObject } = await import("firebase/storage");
const bucket = "demo-caravana77-test.appspot.com";
const bytes = new TextEncoder().encode("%PDF-1.4\nSYNTHETIC RECOVERY PROOF - NO BANK VALUE");
const digest = value => createHash("sha256").update(value).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const proof = suffix => `proofs/demo-org-${suffix}/demo-ride-${suffix}/${(suffix === "a" ? "d" : "f").repeat(64)}/recovery.pdf`;
const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test",
  firestore: { rules: readFileSync(path.join(root, "firestore.rules"), "utf8") },
  storage: { host: "127.0.0.1", port: 19199, rules: readFileSync(path.join(root, "storage.rules"), "utf8") } });
const apps = [];
try {
  let expected;
  if (phase === "seed") {
    const seeded = await seedDemoAccounts();
    await env.withSecurityRulesDisabled(async context => {
      for (const suffix of ["a", "b"]) await context.storage(`gs://${bucket}`).ref(proof(suffix)).put(bytes, { contentType: "application/pdf" });
    });
    expected = { accounts: seeded.accounts };
  } else {
    expected = JSON.parse(readFileSync(path.join(directory, "expected.json"), "utf8"));
  }
  const paths = ["organizations/demo-org-a", "organizations/demo-org-b", "tenantUsage/demo-org-a", "tenantUsage/demo-org-b",
    `memberships/${expected.accounts.owner.uid}/organizations/demo-org-a`, `memberships/${expected.accounts.ownerB.uid}/organizations/demo-org-b`,
    `registrations/${"d".repeat(64)}`, `registrations/${"d".repeat(64)}/proofs/current`,
    `registrations/${"d".repeat(64)}/payments/demo-payment`, "caravans/demo-ride-a/expenses/demo-expense"];
  const documents = [];
  for (const document of paths) {
    const response = await fetch(`http://127.0.0.1:18080/v1/projects/demo-caravana77-test/databases/(default)/documents/${document}`, { headers: { Authorization: "Bearer owner" } });
    assert.equal(response.status, 200);
    documents.push({ path: document, fields: (await response.json()).fields });
  }
  const documentHash = digest(JSON.stringify(canonical(documents)));
  if (phase === "seed") {
    writeFileSync(path.join(directory, "expected.json"), JSON.stringify({ ...expected, documentHash }), { mode: 0o600 });
  } else {
    assert.equal(documentHash, expected.documentHash);
    async function client(key) {
      const app = initializeApp({ projectId: "demo-caravana77-test", apiKey: "synthetic-api-key", storageBucket: bucket }, `recovery-${key}`);
      apps.push(app);
      const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
      connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 18080);
      connectStorageEmulator(storage, "127.0.0.1", 19199);
      const result = await signInWithEmailAndPassword(auth, DEMO_ACCOUNTS[key].email, DEMO_ACCOUNTS[key].password);
      assert.equal(result.user.uid, expected.accounts[key].uid);
      return { db, storage };
    }
    const a = await client("owner"), b = await client("ownerB"), passenger = await client("passenger");
    for (const [own, foreign, suffix] of [[a, b, "a"], [b, a, "b"]]) {
      assert.deepEqual(new Uint8Array(await getBytes(ref(own.storage, proof(suffix)))), bytes);
      assert.equal((await getMetadata(ref(own.storage, proof(suffix)))).contentType, "application/pdf");
      await assert.rejects(getBytes(ref(foreign.storage, proof(suffix))), { code: "storage/unauthorized" });
      await assert.rejects(getBytes(ref(passenger.storage, proof(suffix))), { code: "storage/unauthorized" });
    }
    const payment = `registrations/${"d".repeat(64)}/payments/demo-payment`;
    assert.equal((await getDocFromServer(doc(a.db, payment))).data().amountCents, 2500);
    await assert.rejects(getDocFromServer(doc(b.db, payment)), { code: "permission-denied" });
    await assert.rejects(listAll(ref(a.storage, "proofs/demo-org-a")), { code: "storage/unauthorized" });
    await assert.rejects(deleteObject(ref(a.storage, proof("a"))), { code: "storage/unauthorized" });
    await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), `memberships/${expected.accounts.owner.uid}/organizations/demo-org-a`), { status: "revoked" }));
    await assert.rejects(getBytes(ref(a.storage, proof("a"))), { code: "storage/unauthorized" });
    await assert.rejects(getDocFromServer(doc(a.db, payment)), { code: "permission-denied" });
    const report = { checkedAt: new Date().toISOString(), status: "PASS_SYNTHETIC_EMULATOR_RECOVERY", projectId: "demo-caravana77-test",
      authPasswordSignInAndUidPreserved: 3, firestoreDocumentsCompared: paths.length, firestoreFieldsSha256: documentHash,
      restoredStorageObjectsVerified: 2, storageBytesSha256: digest(bytes), mimePreserved: true,
      crossTenantDenial: true, passengerDenial: true, listAndDeleteDenied: true, immediateRevocationAfterRestore: true,
      candidateRulesLoadedFromRepository: true,
      productionAccess: false, realClientRecoveryVerified: false,
      limitations: ["Rules loaded from the repository, not recovered from the export.", "Synthetic emulator exports only; no real Auth provider/password-hash, Storage IAM/download-token inventory or production backup/rollback verification."] };
    writeFileSync(path.join(directory, "result.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  }
} finally {
  for (const app of apps) { await terminate(getFirestore(app)); await deleteApp(app); }
  await env.cleanup();
}
