export const STAGING_PROJECT = "bdall-e3585";
export const STAGING_PAGES = "caravana77-staging";
export function assertStagingBuild(environment) {
  if (environment.VITE_APP_ENV !== "staging" || environment.VITE_FIREBASE_PROJECT_ID !== STAGING_PROJECT || environment.VITE_USE_EMULATORS !== "false") throw new Error("Refusing build: exact isolated staging target required.");
  if (environment.VITE_FIREBASE_AUTH_DOMAIN !== `${STAGING_PROJECT}.firebaseapp.com`) throw new Error("Refusing build: staging Auth domain mismatch.");
  for (const key of ["API_KEY", "MESSAGING_SENDER_ID", "APP_ID"]) if (!environment[`VITE_FIREBASE_${key}`]?.trim()) throw new Error(`Missing staging Web configuration: ${key}`);
  if (!/^\d+$/.test(environment.VITE_FIREBASE_MESSAGING_SENDER_ID) || !environment.VITE_FIREBASE_APP_ID.startsWith(`1:${environment.VITE_FIREBASE_MESSAGING_SENDER_ID}:web:`)) throw new Error("Staging Web app and project number do not match.");
  return { projectId: STAGING_PROJECT, pagesProject: STAGING_PAGES, emulator: false, environment: "staging" };
}
