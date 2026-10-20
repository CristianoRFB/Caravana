import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { assertFirebaseEnvironment } from "./firebase-environment";
import { assertDemoIdentityAllowed } from "./demo-identities";

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
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (useEmulators) {
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  if (db) connectFirestoreEmulator(db, "127.0.0.1", 18080);
}
