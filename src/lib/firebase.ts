import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { assertFirebaseEnvironment } from "./firebase-environment";
import { assertDemoIdentityAllowed } from "./demo-identities";
import { stagingAppCheckSiteKey } from "./staging-appcheck";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
export const assertIdentityAllowed = (email: string) => assertDemoIdentityAllowed(email, useEmulators, config.projectId, typeof window === "undefined" ? undefined : window.location.hostname);
assertFirebaseEnvironment(typeof window === "undefined" ? undefined : window.location.hostname, config.projectId, useEmulators, import.meta.env.DEV, import.meta.env.VITE_APP_ENV);

export const firebaseConfigured = Object.values(config).every(Boolean);
const app = firebaseConfigured ? initializeApp(config) : null;
const appCheckKey = stagingAppCheckSiteKey({
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_STAGING_APPCHECK_ENABLED: import.meta.env.VITE_STAGING_APPCHECK_ENABLED,
  VITE_STAGING_APPCHECK_SITE_KEY: import.meta.env.VITE_STAGING_APPCHECK_SITE_KEY,
}, {
  hostname: typeof window === "undefined" ? undefined : window.location.hostname,
  projectId: config.projectId, emulators: useEmulators, development: import.meta.env.DEV,
  debugToken: (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown }).FIREBASE_APPCHECK_DEBUG_TOKEN,
});
// Must run synchronously before Auth/Firestore service initialization.
if (app && appCheckKey) initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true,
});
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (useEmulators) {
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  if (db) connectFirestoreEmulator(db, "127.0.0.1", 18080);
}
