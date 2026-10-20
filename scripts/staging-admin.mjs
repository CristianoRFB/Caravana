import { createRequire } from "node:module";
import { STAGING_PROJECT } from "./staging-target.mjs";
const require = createRequire(import.meta.url);
// Administrative responses may contain credentials or document payloads.
require("firebase-tools/lib/logger").logger.silent = true;
const origins = {
  firebase: ["https://firebase.googleapis.com", "v1beta1"],
  billing: ["https://cloudbilling.googleapis.com", "v1"],
  firestore: ["https://firestore.googleapis.com", "v1"],
  rules: ["https://firebaserules.googleapis.com", "v1"],
  auth: ["https://identitytoolkit.googleapis.com", "v1"],
  authConfig: ["https://identitytoolkit.googleapis.com", "admin/v2"],
};
export async function stagingAdmin() {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_TOKEN) throw new Error("Staging admin requires the official interactive CLI session, without emulator endpoints or permanent keys.");
  const accountEmail = process.env.STAGING_FIREBASE_ACCOUNT;
  const auth = require("firebase-tools/lib/auth"); const { requireAuth } = require("firebase-tools/lib/requireAuth"); const { Client } = require("firebase-tools/lib/apiv2");
  const account = accountEmail && auth.getAllAccounts().find((item) => item.user.email === accountEmail);
  if (!account) throw new Error("Set STAGING_FIREBASE_ACCOUNT to the authorized CLI account. Never print login:list JSON.");
  const options = { project: STAGING_PROJECT, nonInteractive: true }; auth.setActiveAccount(options, account);
  await requireAuth(options).catch(() => { throw new Error("Official staging CLI authentication failed; raw diagnostics suppressed."); });
  const clients = Object.fromEntries(Object.entries(origins).map(([service, [urlPrefix, apiVersion]]) => [service, new Client({ urlPrefix, apiVersion })]));
  async function request(service, method, path, body, queryParams) {
    if (!Object.hasOwn(clients, service) || !(path === `/projects/${STAGING_PROJECT}` || path.startsWith(`/projects/${STAGING_PROJECT}/`)) || !["get", "post", "patch"].includes(method)) throw new Error("Refusing request outside the exact staging project.");
    try {
      const response = method === "get" ? await clients[service].get(path, { queryParams }) : await clients[service][method](path, body, { queryParams });
      return response.body;
    } catch (cause) { throw new Error(`Staging ${service} ${method.toUpperCase()} request failed (HTTP ${Number(cause.status || cause.context?.response?.statusCode) || "unknown"}); raw diagnostics suppressed.`); }
  }
  const project = await request("firebase", "get", `/projects/${STAGING_PROJECT}`);
  if (project.projectId !== STAGING_PROJECT || project.projectNumber !== "146882624278" || project.state !== "ACTIVE") throw new Error("Staging project identity mismatch.");
  const billing = await request("billing", "get", `/projects/${STAGING_PROJECT}/billingInfo`);
  if (billing.billingEnabled !== false || billing.billingAccountName) throw new Error("Staging requires disabled billing and no linked billing account. No writes performed.");
  const database = await request("firestore", "get", `/projects/${STAGING_PROJECT}/databases/(default)`);
  if (database.name !== `projects/${STAGING_PROJECT}/databases/(default)` || database.databaseEdition !== "STANDARD" || database.freeTier !== true) throw new Error("Staging requires the existing Standard free-tier database.");
  return { request, projectId: STAGING_PROJECT, projectNumber: project.projectNumber, database, billingEnabled: false };
}
