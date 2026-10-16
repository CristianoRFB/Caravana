import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== "--serve")) throw new Error("Only the local demonstration can be started.");
const run = (entry, args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [entry, ...args], { cwd: workspace, stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 1));
});
if (process.argv[2] === "--serve") {
  const { seedDemoAccounts } = await import("./seed-demo.mjs");
  const result = await seedDemoAccounts();
  console.log(`Demonstração local pronta: ${result.created} documentos criados, ${result.preserved} preservados. Contas em docs/TEST_ACCOUNTS.txt.`);
  process.exitCode = await run(path.join(workspace, "node_modules/vite/bin/vite.js"), ["--mode", "e2e", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]);
} else {
  if (!existsSync(path.join(workspace, "node_modules/firebase-tools/lib/bin/firebase.js")) || !existsSync(path.join(workspace, "node_modules/vite/bin/vite.js"))) {
    if (!process.env.npm_execpath) throw new Error("Start with npm run demo so dependencies can be installed from package-lock.json.");
    const installed = await run(process.env.npm_execpath, ["ci"]);
    if (installed !== 0) process.exit(installed);
  }
  process.exitCode = await run(path.join(workspace, "scripts/run-local-tests.mjs"), ["demo"]);
}
