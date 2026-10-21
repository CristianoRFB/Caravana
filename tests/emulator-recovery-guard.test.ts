import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

function invoke(script: string, args: string[], patch: Record<string, string>) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 10000,
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
      FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:19199", GCLOUD_PROJECT: "demo-caravana77-test", ...patch } });
}
describe("synthetic coordinated recovery has no real target override", () => {
  it("rejects real projects and external service endpoints before SDK setup", () => {
    for (const patch of [{ GCLOUD_PROJECT: "caravana-af306" }, { GCLOUD_PROJECT: "bdall-e3585" },
      { FIRESTORE_EMULATOR_HOST: "example.invalid:443" }, { FIREBASE_AUTH_EMULATOR_HOST: "example.invalid:443" },
      { FIREBASE_STORAGE_EMULATOR_HOST: "example.invalid:443" }]) {
      const result = invoke("scripts/verify-emulator-recovery.mjs", ["verify"], patch);
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/exact local|AssertionError/);
    }
  });
  it("rejects remote credential selectors without reading any credential file", () => {
    for (const patch of [{ GOOGLE_APPLICATION_CREDENTIALS: "/never-read-synthetic.json" }, { FIREBASE_TOKEN: "SYNTHETIC_DO_NOT_AUTHENTICATE" }]) {
      const result = invoke("scripts/rehearse-emulator-recovery.mjs", [], patch);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Recovery accepts no arguments or remote credential selectors");
    }
  });
  it("does not accept target or import path arguments", () => {
    const result = invoke("scripts/rehearse-emulator-recovery.mjs", ["--project", "caravana-af306"], {});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Recovery accepts no arguments or remote credential selectors");
  });
});
