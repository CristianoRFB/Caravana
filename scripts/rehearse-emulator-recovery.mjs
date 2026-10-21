// Opt-in recovery rehearsal. No real Firebase target, credentials or CLI flags.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.length !== 2 || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_TOKEN) {
  throw new Error("Recovery accepts no arguments or remote credential selectors.");
}
process.umask(0o077);
const parent = path.join(root, ".firebase", "recovery-rehearsal");
mkdirSync(parent, { recursive: true, mode: 0o700 });
const directory = mkdtempSync(path.join(parent, "synthetic-"));
const snapshot = path.join(directory, "snapshot");
const cli = path.join(root, "node_modules/firebase-tools/lib/bin/firebase.js");
const env = { ...process.env, CARAVANA_RECOVERY_RUN: directory };
async function phase(name, option) {
  const args = ["--require", path.join(root, "scripts/emulator-loopback-proxy.cjs"), cli,
    "emulators:exec", "--config", "firebase.test.json", "--project", "demo-caravana77-test",
    "--only", "firestore,auth,storage", option,
    `node scripts/verify-emulator-recovery.mjs ${name}`];
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => resolve(code));
  });
  if (code !== 0) throw new Error(`Synthetic recovery ${name} failed; no PASS report.`);
}
await phase("seed", `--export-on-exit=${snapshot}`);
if (!existsSync(path.join(snapshot, "firebase-export-metadata.json"))) throw new Error("Emulator export incomplete despite CLI exit status; recovery not approved.");
const exported = JSON.parse(readFileSync(path.join(snapshot, "firebase-export-metadata.json"), "utf8"));
if (!["firestore", "auth", "storage"].every(key => exported[key])) throw new Error("Incomplete emulator export.");
await phase("verify", `--import=${snapshot}`);
console.log(readFileSync(path.join(directory, "result.json"), "utf8"));
console.log("Private synthetic export retained under .firebase/recovery-rehearsal (ignored by Git).");
