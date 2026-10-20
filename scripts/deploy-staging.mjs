import { stagingAdmin } from "./staging-admin.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const admin = await stagingAdmin();
const evidence = JSON.parse(await readFile("docs/evidence/2026-10-20/staging-predeploy-evidence.json", "utf8"));
if (admin.projectId !== "bdall-e3585" || evidence.projectId !== admin.projectId || evidence.security !== "PASS" || evidence.team !== "PASS") throw new Error("Exact staging target and passing security evidence required.");
for (const path of ["firestore.rules", "firestore.indexes.json"]) {
  const hash = createHash("sha256").update(await readFile(path)).digest("hex");
  if (evidence.files[path] !== hash) throw new Error(`Source changed after security verification: ${path}`);
}
const config = JSON.parse(await readFile("firebase.staging.json", "utf8"));
if (Object.keys(config).some((key) => key !== "firestore") || config.firestore.database !== "(default)" || config.firestore.rules !== "firestore.rules" || config.firestore.indexes !== "firestore.indexes.json") throw new Error("Staging deployment config differs from the reviewed Firestore-only scope.");
console.log(`Verified ${admin.projectId}, billing disabled, free Standard database. Deploying only reviewed Firestore Rules/indexes.`);
execFileSync(process.execPath, ["node_modules/firebase-tools/lib/bin/firebase.js", "deploy", "--project", "bdall-e3585", "--account", process.env.STAGING_FIREBASE_ACCOUNT, "--config", "firebase.staging.json", "--only", "firestore:rules,firestore:indexes", "--non-interactive"], { stdio: "inherit" });
