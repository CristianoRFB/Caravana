import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("synthetic migration CLI boundary", () => {
  it.each(["", "firestore.googleapis.com:443", "localhost:8080"])("refuses a non-exact emulator endpoint (%s) before changing evidence", (endpoint) => {
    const before = readFileSync("docs/evidence/2026-10-16/f2-membership-plan.synthetic.json", "utf8");
    const result = spawnSync(process.execPath, ["scripts/simulate-membership-migration.mjs", "--apply-synthetic"], {
      env: { ...process.env, FIRESTORE_EMULATOR_HOST: endpoint }, encoding: "utf8", timeout: 5000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("requires the exact local demo emulator");
    expect(readFileSync("docs/evidence/2026-10-16/f2-membership-plan.synthetic.json", "utf8")).toBe(before);
  });
  it("offers no production target or arbitrary snapshot flag", () => {
    const result = spawnSync(process.execPath, ["scripts/simulate-membership-migration.mjs", "--project", "caravana-af306"], { encoding: "utf8", timeout: 5000 });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("production is forbidden");
  });
});
