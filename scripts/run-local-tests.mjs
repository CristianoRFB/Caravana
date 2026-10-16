import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startedAt = new Date().toISOString();
const command = path.join(workspace, "node_modules/firebase-tools/lib/bin/firebase.js");
const suite = process.argv[2] || "unit";
const commands = {
  unit: "vitest run",
  security: "vitest run tests/firestore.rules.test.ts tests/membership-rules.test.ts tests/tenant-access.integration.test.ts tests/data.integration.test.ts tests/demo-identities.test.ts",
  e2e: "playwright test",
  "demo-e2e": "playwright test e2e/demo.spec.ts --project desktop-1440 --project mobile-320",
  "demo-auth": "vitest run --config vitest.auth.config.ts",
  demo: "node scripts/start-demo.mjs --serve",
  migration: "node scripts/simulate-membership-migration.mjs --apply-synthetic",
};
if (!Object.hasOwn(commands, suite) || process.argv.length > 3) throw new Error("Choose a documented local suite.");
const withAuth = ["e2e", "demo-e2e", "demo-auth", "demo"].includes(suite);
const args = ["emulators:exec", "--config", "firebase.test.json", "--project", "demo-caravana77-test", "--only", withAuth ? "firestore,auth" : "firestore", commands[suite]];
let exitCode = 1;
try {
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, ...args], { cwd: workspace, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  if (process.platform === "win32") {
    // Firebase CLI can leave its Java child listening after emulators:exec on Windows.
    // Match this workspace, demo project and invocation start; never stop pre-existing emulators.
    const query = "Get-CimInstance Win32_Process -Filter \"Name = 'java.exe'\" | Select-Object ProcessId,CommandLine,@{Name='StartedAt';Expression={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress";
    const result = await promisify(execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", query]);
    const found = result.stdout.trim() ? JSON.parse(result.stdout) : [];
    for (const candidate of Array.isArray(found) ? found : [found]) {
      const commandLine = candidate.CommandLine || "";
      if (commandLine.includes("cloud-firestore-emulator-") &&
          commandLine.includes("--project_id demo-caravana77-test") &&
          commandLine.includes(path.join(workspace, "firestore.rules")) &&
          Date.parse(candidate.StartedAt) >= Date.parse(startedAt)) {
        try {
          process.kill(candidate.ProcessId);
          console.log(`Stopped test emulator started by this run (PID ${candidate.ProcessId}).`);
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
    }
  }
}
process.exitCode = exitCode;
