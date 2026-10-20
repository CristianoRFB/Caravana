import { describe, expect, it } from "vitest";
import { assertStagingBuild } from "../scripts/staging-target.mjs";
const config = { VITE_APP_ENV: "staging", VITE_USE_EMULATORS: "false", VITE_FIREBASE_PROJECT_ID: "bdall-e3585", VITE_FIREBASE_AUTH_DOMAIN: "bdall-e3585.firebaseapp.com", VITE_FIREBASE_API_KEY: "synthetic-key", VITE_FIREBASE_MESSAGING_SENDER_ID: "123", VITE_FIREBASE_APP_ID: "1:123:web:synthetic" };
describe("isolated staging build target", () => {
  it("accepts only explicit complete staging Web configuration", () => { expect(assertStagingBuild(config)).toMatchObject({ projectId: "bdall-e3585", emulator: false }); });
  it.each([{ VITE_FIREBASE_PROJECT_ID: "caravana-af306" }, { VITE_USE_EMULATORS: "true" }, { VITE_APP_ENV: "production" }, { VITE_FIREBASE_AUTH_DOMAIN: "caravana-af306.firebaseapp.com" }, { VITE_FIREBASE_API_KEY: "" }, { VITE_FIREBASE_APP_ID: "1:456:web:other" }])("rejects mismatched or incomplete settings %j", (change) => { expect(() => assertStagingBuild({ ...config, ...change })).toThrow(); });
});
