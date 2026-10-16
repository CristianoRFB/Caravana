import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
const app = firebaseConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  const loopback = typeof window !== "undefined" && ["127.0.0.1", "localhost"].includes(window.location.hostname);
  if (!import.meta.env.DEV || !loopback || !config.projectId?.startsWith("demo-")) {
    throw new Error("O modo de testes exige execução local com um projeto Firebase demo.");
  }
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  if (db) connectFirestoreEmulator(db, "127.0.0.1", 18080);
}
