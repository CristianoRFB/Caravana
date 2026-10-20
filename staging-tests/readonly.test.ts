import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnv } from "vite";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDocFromServer, getDocsFromServer, getFirestore, query, where, terminate, setLogLevel } from "firebase/firestore";
import { assertStagingBuild } from "../scripts/staging-target.mjs";

it("verifies refreshed Node dependencies against existing synthetic staging without document writes", async () => {
  if (process.env.STAGING_CONFIRM_PROJECT !== "bdall-e3585" || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_TOKEN) throw new Error("Exact staging confirmation required; emulator/admin credentials forbidden.");
  const environment = loadEnv("staging", process.cwd(), "VITE_"); assertStagingBuild(environment);
  const saved = JSON.parse(readFileSync(".firebase/staging-accounts.json", "utf8"));
  if (saved.projectId !== "bdall-e3585") throw new Error("Foreign credential target.");
  const configuration = { projectId: "bdall-e3585", apiKey: environment.VITE_FIREBASE_API_KEY, authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN, appId: environment.VITE_FIREBASE_APP_ID };
  setLogLevel("silent");
  for (const [key, organizationId, plan] of [["ownerA", "staging-org-a", "essencial"], ["ownerB", "staging-org-b", "pro"]]) {
    const account = saved.accounts[key];
    if (!account.email.endsWith("@caravana77.invalid")) throw new Error("Synthetic identities only.");
    const app = initializeApp(configuration, `readonly-${randomUUID()}`); const auth = initializeAuth(app, { persistence: inMemoryPersistence }); const database = getFirestore(app);
    try {
      try { await signInWithEmailAndPassword(auth, account.email, account.password); } catch { throw new Error("Synthetic login failed; credential diagnostics suppressed."); }
      expect(auth.currentUser?.uid).toBe(account.uid);
      expect((await auth.currentUser!.getIdTokenResult()).claims.aud).toBe("bdall-e3585");
      expect((await getDocFromServer(doc(database, `subscriptions/${organizationId}`))).data()?.planId).toBe(plan);
      const own = await getDocsFromServer(query(collection(database, "registrations"), where("organizationId", "==", organizationId)));
      expect(own.docs.every((item) => item.data().passengerName.startsWith("Pessoa Fictícia"))).toBe(true);
      const foreign = organizationId === "staging-org-a" ? "staging-org-b" : "staging-org-a";
      await expect(getDocFromServer(doc(database, `subscriptions/${foreign}`))).rejects.toMatchObject({ code: "permission-denied" });
      await expect(getDocsFromServer(query(collection(database, "registrations"), where("organizationId", "==", foreign)))).rejects.toMatchObject({ code: "permission-denied" });
    } finally { await signOut(auth); await terminate(database); await deleteApp(app); }
  }
});
