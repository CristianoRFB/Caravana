import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { planMembershipMigration, simulateMembershipMigration } from "../src/lib/membership-migration.ts";

const applySynthetic = process.argv[2] === "--apply-synthetic";
if (process.argv.length > 3 || (process.argv[2] && !applySynthetic)) throw new Error("Only dry-run or --apply-synthetic is supported; production is forbidden.");
if (applySynthetic && process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Rehearsal requires the exact local demo emulator.");
const fixture = JSON.parse(await readFile(new URL("./fixtures/membership-migration.synthetic.json", import.meta.url), "utf8"));
if (fixture.source !== "SYNTHETIC_ONLY" || fixture.projectId !== "demo-caravana77-test") throw new Error("Only the fixed synthetic fixture is allowed.");
const evidence = new URL("../docs/evidence/2026-10-16/", import.meta.url);
const sorted = (value) => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])) : value;
const checksum = (documents) => createHash("sha256").update(JSON.stringify(sorted([...documents].sort((a, b) => a.path.localeCompare(b.path))))).digest("hex");
const before = structuredClone(fixture.documents);
const plan = planMembershipMigration(before, fixture.timestamp);
const after = simulateMembershipMigration(before, plan);
assert.deepEqual(after.slice(0, before.length), before);
assert.equal(planMembershipMigration(after, fixture.timestamp).creates.length, 0);
const report = {
  source: fixture.source, projectId: fixture.projectId, mode: applySynthetic ? "emulator-rehearsal" : "offline-dry-run",
  beforeSha256: checksum(before), afterSha256: checksum(after), originalDocuments: before.length,
  creates: plan.creates.length, conflicts: plan.conflicts, replayCreates: 0,
  productionWrites: "FORBIDDEN", originalIdsAndDocumentsPreserved: true,
};
await writeFile(new URL("f2-membership-before.synthetic.json", evidence), JSON.stringify({ source: fixture.source, documents: before }, null, 2));
await writeFile(new URL("f2-membership-plan.synthetic.json", evidence), JSON.stringify(plan, null, 2));
await writeFile(new URL("f2-membership-after.synthetic.json", evidence), JSON.stringify({ source: fixture.source, documents: after }, null, 2));

if (applySynthetic) {
  // Validate before importing/initializing any Firebase code. No ADC or real project accepted.
  const { initializeTestEnvironment } = await import("@firebase/rules-unit-testing");
  const { collection, doc, getDoc, getDocs, runTransaction, setDoc } = await import("firebase/firestore");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // Refuse to reuse populated collections; this runner starts a fresh isolated emulator.
      for (const name of ["organizations", "admins", "caravans", "registrations", "memberships"]) {
        if (!(await getDocs(collection(db, name))).empty) throw new Error("Rehearsal requires a fresh empty demo database; no existing data will be replaced.");
      }
      for (const document of before) await setDoc(doc(db, document.path), document.data);
      const readSnapshot = async (paths) => Promise.all(paths.map(async (path) => {
        const snapshot = await getDoc(doc(db, path));
        assert(snapshot.exists(), `Missing synthetic path ${path}`);
        return { path, data: snapshot.data() };
      }));
      assert.equal(checksum(await readSnapshot(before.map((document) => document.path))), report.beforeSha256);
      await runTransaction(db, async (transaction) => {
        // No update/delete operation. Every target must still be absent.
        for (const operation of plan.creates) assert(!(await transaction.get(doc(db, operation.path))).exists(), "Additive target changed; abort");
        for (const operation of plan.creates) transaction.set(doc(db, operation.path), operation.after);
      });
      const actualAfter = await readSnapshot(after.map((document) => document.path));
      assert.equal(checksum(actualAfter), report.afterSha256);
      assert.equal(checksum(await readSnapshot(before.map((document) => document.path))), report.beforeSha256);
      const replay = planMembershipMigration(actualAfter, fixture.timestamp);
      assert.equal(replay.creates.length, 0);
      assert.equal(replay.conflicts.length, 0);
      report.emulatorApply = "PASS";
    });
    // Restore rehearsal is destructive ONLY inside this freshly created exact demo emulator.
    // No restore/export endpoint for production exists in this script.
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const backup = JSON.parse(await readFile(new URL("f2-membership-before.synthetic.json", evidence), "utf8"));
      assert.equal(backup.source, "SYNTHETIC_ONLY");
      assert.equal(checksum(backup.documents), report.beforeSha256);
      for (const document of backup.documents) await setDoc(doc(db, document.path), document.data);
      const restored = await Promise.all(backup.documents.map(async ({ path }) => ({ path, data: (await getDoc(doc(db, path))).data() })));
      assert.equal(checksum(restored), report.beforeSha256);
      for (const operation of plan.creates) assert(!(await getDoc(doc(db, operation.path))).exists());
      report.restoreSha256 = checksum(restored);
      report.restore = "PASS";
    });
  } finally { await env.cleanup(); }
}
await writeFile(new URL(applySynthetic ? "f2-membership-rehearsal.json" : "f2-membership-dry-run.json", evidence), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
