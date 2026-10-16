import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDemoIdentityAllowed, DEMO_ACCOUNTS } from "../src/lib/demo-identities";
import { assertDemoSeedEnvironment, seedDemoAccounts } from "../scripts/seed-demo.mjs";

afterEach(() => vi.unstubAllEnvs());

describe("demonstration identity restrictions", () => {
  it.each(Object.values(DEMO_ACCOUNTS))("allows $email only on the exact local demo target", ({ email }) => {
    expect(() => assertDemoIdentityAllowed(email, true, "demo-caravana77-test", "localhost")).not.toThrow();
    expect(() => assertDemoIdentityAllowed(email, false, "caravana-af306", "caravana-77.pages.dev")).toThrow("exclusivamente");
    expect(() => assertDemoIdentityAllowed(email, true, "caravana-af306", "localhost")).toThrow();
    expect(() => assertDemoIdentityAllowed(email, true, "demo-caravana77-test", "example.com")).toThrow();
  });
  it("does not block real non-demo customer identities", () => {
    expect(() => assertDemoIdentityAllowed("pessoa@dominio.com.br", false, "caravana-af306", "caravana-77.pages.dev")).not.toThrow();
  });
  it("refuses demo seeding on remote endpoints or real project selection before importing the SDK", async () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "firestore.googleapis.com:443");
    expect(assertDemoSeedEnvironment).toThrow("restricted");
    await expect(seedDemoAccounts()).rejects.toThrow("restricted");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:18080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:19099");
    vi.stubEnv("GCLOUD_PROJECT", "caravana-af306");
    expect(assertDemoSeedEnvironment).toThrow("restricted");
  });
});
