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
  "staging-restore": "vitest run --config vitest.restore.config.ts",
  "functional-tools": "vitest run tests/operational-tools.test.ts tests/operational-tools.integration.test.ts tests/commercial-presentation.test.ts tests/commercial-data.integration.test.ts tests/platform.integration.test.ts --reporter verbose",
  "functional-tools-e2e": "playwright test e2e/functional-tools.spec.ts e2e/commercial-landing.spec.ts",
  "functional-tools-ui-focus": "playwright test e2e/functional-tools.spec.ts --project desktop-1440 --project mobile-320",
  diagnostics: "vitest run tests/diagnostics.test.ts tests/pending-writes.test.ts tests/staging-health.test.ts",
  "cutover-rehearsal": "vitest run tests/synthetic-cutover.test.ts tests/membership-migration.test.ts tests/commercial-baseline.test.ts tests/namespace-protection.test.ts",
  "diagnostics-e2e": "playwright test e2e/diagnostics.spec.ts e2e/commercial-landing.spec.ts",
  "release-smoke-e2e": "playwright test e2e/finance-ledger.spec.ts e2e/team.spec.ts e2e/responsive-gutter.spec.ts --project desktop-1440 --project mobile-320",
  "recovery-smoke-e2e": "playwright test e2e/finance-ledger.spec.ts e2e/team.spec.ts e2e/responsive-gutter.spec.ts e2e/functional-tools.spec.ts e2e/commercial-landing.spec.ts",
  "staging-rules": "vitest run tests/team-invitations.integration.test.ts tests/quota-operations.integration.test.ts tests/membership-rules.test.ts tests/platform.integration.test.ts tests/namespace-protection.test.ts",
  "finance-ledger-e2e": "playwright test e2e/finance-ledger.spec.ts",
  "team-e2e": "playwright test e2e/team.spec.ts --project desktop-1440 --project mobile-320",
  team: "vitest run tests/team-invitations.integration.test.ts tests/quota-operations.integration.test.ts tests/membership-rules.test.ts --reporter verbose",
  "landing-e2e": "playwright test e2e/commercial-landing.spec.ts",
  "public-availability": "vitest run tests/public-availability.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts",
  "public-availability-e2e": "playwright test e2e/public-availability.spec.ts e2e/reservation.spec.ts e2e/demo.spec.ts e2e/branding.spec.ts --project desktop-1440 --project mobile-320",
  security: "vitest run tests/firestore.rules.test.ts tests/membership-rules.test.ts tests/tenant-access.integration.test.ts tests/data.integration.test.ts tests/demo-identities.test.ts",
  e2e: "playwright test",
  "responsive-gutter-e2e": "playwright test e2e/responsive-gutter.spec.ts --project desktop-1440 --project mobile-320",
  "demo-e2e": "playwright test e2e/demo.spec.ts --project desktop-1440 --project mobile-320",
  "demo-auth": "vitest run --config vitest.auth.config.ts",
  storage: "vitest run --config vitest.storage.config.ts",
  platform: "vitest run tests/platform.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts tests/data.integration.test.ts",
  onboarding: "vitest run tests/onboarding-payload.test.ts tests/platform.integration.test.ts",
  "quota-growth": "vitest run tests/quota-operations.integration.test.ts tests/membership-rules.test.ts tests/import-operations.integration.test.ts tests/platform.integration.test.ts",
  support: "vitest run tests/support.integration.test.ts",
  booking: "vitest run tests/reservation-attempt.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts tests/platform.integration.test.ts",
  operations: "vitest run tests/tenant-preference.test.ts tests/registration-operations.integration.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts tests/tenant-access.integration.test.ts",
  csv: "vitest run tests/import-operations.integration.test.ts tests/legacy-import.test.ts tests/registration-operations.integration.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts",
  "finance-e2e": "playwright test e2e/finance-ledger.spec.ts e2e/baseline.spec.ts --grep \"finance|pending write|staff can read\" --project desktop-1440 --project mobile-320",
  "branding-visual": "playwright test e2e/branding.spec.ts --grep \"tenant namespaces\"",
  "branding-all": "playwright test e2e/branding.spec.ts",
  "branding-e2e": "playwright test e2e/branding.spec.ts --project desktop-1440 --project mobile-320",
  "commercial-e2e": "playwright test e2e/commercial.spec.ts e2e/platform.spec.ts --project desktop-1440 --project mobile-320",
  "tenant-plan-e2e": "playwright test e2e/commercial.spec.ts --project desktop-1440 --project mobile-320",
  quotas: "vitest run tests/quota-attempt.test.ts tests/quota-operations.integration.test.ts tests/membership-rules.test.ts tests/platform.integration.test.ts",
  "quota-team": "vitest run tests/quota-operations.integration.test.ts --testNamePattern \"protects final internal\" --reporter verbose",
  "quota-downgrade": "vitest run tests/import-operations.integration.test.ts --testNamePattern \"over-limit historical\"",
  "namespace-guard": "vitest run tests/namespace-protection.test.ts tests/tenant-branding.integration.test.ts --testNamePattern \"historical namespace protection|historical organization or orphan\"",
  "quota-passenger-e2e": "playwright test e2e/reservation.spec.ts e2e/import.spec.ts --project desktop-1440 --project mobile-320",
  "quota-passenger-focus": "playwright test e2e/reservation.spec.ts --grep \"commercial passenger quota\" --project desktop-1440 --project mobile-320",
  commercial: "vitest run tests/plan-catalog.test.ts tests/commercial-baseline.test.ts tests/commercial-data.integration.test.ts tests/platform.integration.test.ts tests/membership-rules.test.ts",
  branding: "vitest run tests/legacy-trip-aliases.test.ts tests/tenant-branding.test.ts tests/tenant-branding.integration.test.ts tests/platform.integration.test.ts tests/data.integration.test.ts tests/membership-rules.test.ts",
  finance: "vitest run tests/financial-attempt.test.ts tests/financial-diagnostics.test.ts tests/financial-operations.integration.test.ts tests/finance.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts",
  documents: "vitest run tests/documents.integration.test.ts tests/proof-policy.test.ts tests/registration-operations.integration.test.ts tests/data.integration.test.ts tests/firestore.rules.test.ts tests/membership-rules.test.ts",
  "documents-e2e": "playwright test e2e/documents.spec.ts --project desktop-1440 --project mobile-320",
  "csv-security": "vitest run tests/import-operations.integration.test.ts --testNamePattern \"direct SDK|worst-case|retry intent\"",
  "csv-e2e": "playwright test e2e/import.spec.ts --project desktop-1440 --project mobile-320",
  "operations-e2e": "playwright test e2e/operations.spec.ts --project desktop-1440 --project mobile-320",
  "booking-e2e": "playwright test e2e/reservation.spec.ts --project desktop-1440 --project mobile-320",
  "support-e2e": "playwright test e2e/support.spec.ts --project desktop-1440 --project mobile-320",
  "platform-e2e": "playwright test e2e/platform.spec.ts --project desktop-1440 --project mobile-320",
  "tenant-writes": "vitest run tests/pending-writes.test.ts tests/data.integration.test.ts tests/membership-rules.test.ts tests/tenant-access.integration.test.ts",
  "tenant-e2e": "playwright test e2e/baseline.spec.ts --grep \"switching organizations|pending write\" --project desktop-1440 --project mobile-320",
  demo: "node scripts/start-demo.mjs --serve",
  migration: "node scripts/simulate-membership-migration.mjs --apply-synthetic",
};
if (!Object.hasOwn(commands, suite) || process.argv.length > 3) throw new Error("Choose a documented local suite.");
const withAuth = commands[suite].startsWith("playwright test") || ["demo-auth", "demo"].includes(suite);
const args = ["emulators:exec", "--config", "firebase.test.json", "--project", "demo-caravana77-test", "--only", suite === "storage" ? "firestore,auth,storage" : withAuth ? "firestore,auth" : "firestore", commands[suite]];
let exitCode = 1;
try {
  exitCode = await new Promise((resolve, reject) => {
    const runtimeArgs = suite === "storage" ? ["--require", path.join(workspace, "scripts/emulator-loopback-proxy.cjs"), command, ...args] : [command, ...args];
    // Direct `node scripts/run-local-tests.mjs …` invocations need the same
    // pinned local executables that npm scripts add to PATH automatically.
    const env = { ...process.env, PATH: [path.join(workspace, "node_modules", ".bin"), process.env.PATH].filter(Boolean).join(path.delimiter) };
    const child = spawn(process.execPath, runtimeArgs, { cwd: workspace, stdio: "inherit", env });
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
