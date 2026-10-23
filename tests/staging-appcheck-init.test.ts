import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ events: [] as string[] }));
vi.mock("firebase/app", () => ({ initializeApp: () => { state.events.push("app"); return {}; } }));
vi.mock("firebase/app-check", () => ({
  ReCaptchaEnterpriseProvider: class { constructor() { state.events.push("provider"); } },
  initializeAppCheck: (_app: unknown, options: {isTokenAutoRefreshEnabled: boolean}) => {
    expect(options.isTokenAutoRefreshEnabled).toBe(true); state.events.push("appcheck");
  },
}));
vi.mock("firebase/auth", () => ({ getAuth: () => { state.events.push("auth"); return {}; }, connectAuthEmulator: vi.fn() }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => { state.events.push("firestore"); return {}; }, connectFirestoreEmulator: vi.fn() }));
// Environment isolation is tested separately; these tests exercise bootstrap
// ordering without creating any SDK connection, token or provider assessment.
vi.mock("../src/lib/firebase-environment", () => ({ assertFirebaseEnvironment: vi.fn() }));

beforeEach(() => {
  vi.resetModules(); state.events.length = 0;
  for (const [key,value] of Object.entries({ VITE_APP_ENV:"staging", VITE_USE_EMULATORS:"false", VITE_FIREBASE_PROJECT_ID:"bdall-e3585", VITE_FIREBASE_AUTH_DOMAIN:"bdall-e3585.firebaseapp.com", VITE_FIREBASE_API_KEY:"SYNTHETIC_PUBLIC_API", VITE_FIREBASE_MESSAGING_SENDER_ID:"146882624278", VITE_FIREBASE_APP_ID:"SYNTHETIC_APP_ID", VITE_STAGING_APPCHECK_ENABLED:"true", VITE_STAGING_APPCHECK_SITE_KEY:"6L_SYNTHETIC_PUBLIC_SITE_KEY_ONLY" })) vi.stubEnv(key,value);
  vi.stubEnv("DEV", false);
  vi.stubGlobal("window", {location:{hostname:"caravana77-staging.pages.dev"}});
  vi.stubGlobal("FIREBASE_APPCHECK_DEBUG_TOKEN", undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("initializes attestation before any Auth/Firestore service", async () => {
  await import("../src/lib/firebase");
  expect(state.events).toEqual(["app","provider","appcheck","auth","firestore"]);
});
it("does not instantiate a provider when disabled", async () => {
  vi.stubEnv("VITE_STAGING_APPCHECK_ENABLED","false"); vi.stubEnv("VITE_STAGING_APPCHECK_SITE_KEY","");
  await import("../src/lib/firebase");
  expect(state.events).toEqual(["app","auth","firestore"]);
});
it("fails before service initialization on a production hostname", async () => {
  vi.stubGlobal("window",{location:{hostname:"caravana-77.pages.dev"}});
  await expect(import("../src/lib/firebase")).rejects.toThrow("canonical isolated staging");
  expect(state.events).toEqual(["app"]);
});
