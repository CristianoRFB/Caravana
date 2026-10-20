import { stagingAdmin } from "./staging-admin.mjs";
import { assertStagingBuild, STAGING_PAGES } from "./staging-target.mjs";
import { loadEnv } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { PlanCatalog } from "../src/lib/plan-catalog.ts";
import { NAMESPACE_INVENTORY_VERSION, NAMESPACE_SOURCES, planNamespaceProtection } from "../src/lib/namespace-protection.ts";

const admin = await stagingAdmin(); const prefix = `/projects/${admin.projectId}`;
const environment = loadEnv("staging", process.cwd(), "VITE_"); assertStagingBuild(environment);
const config = { apiKey: environment.VITE_FIREBASE_API_KEY, authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN, projectId: environment.VITE_FIREBASE_PROJECT_ID, messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: environment.VITE_FIREBASE_APP_ID };
const hash = (value) => createHash("sha256").update(value).digest("hex");
const documentName = (path) => `projects/${admin.projectId}/databases/(default)/documents/${path}`;
const collections = await admin.request("firestore", "post", `${prefix}/databases/(default)/documents:listCollectionIds`, {});
const existing = (collections.collectionIds || []).length > 0;
if (existing) {
  const control = await admin.request("firestore", "get", `${prefix}/databases/(default)/documents/stagingControl/bootstrap`);
  if (control.fields?.projectId?.stringValue !== admin.projectId || control.fields?.version?.stringValue !== "staging-v1") throw new Error("Nonempty staging lacks this fixture's control record. No data may be replaced.");
}
await mkdir(".firebase", { recursive: true });
const credentialsPath = ".firebase/staging-accounts.json";
let credentials;
try { credentials = JSON.parse(await readFile(credentialsPath, "utf8")); } catch (cause) { if (cause.code !== "ENOENT") throw cause; }
if (!credentials) {
  if (existing) throw new Error("Existing staging requires its original local synthetic credential file. Accounts will not be reset.");
  credentials = { projectId: admin.projectId, version: "staging-v1", accounts: Object.fromEntries(["platform", "ownerA", "ownerB", "staffA", "passenger"].map((key) => [key, { email: `${key.toLowerCase()}@caravana77.invalid`, password: `Staging-${randomBytes(18).toString("base64url")}` }])) };
  await writeFile(credentialsPath, JSON.stringify(credentials, null, 2) + "\n");
}
if (credentials.projectId !== admin.projectId || credentials.version !== "staging-v1") throw new Error("Synthetic credential target mismatch.");
for (const [key, account] of Object.entries(credentials.accounts)) {
  if (!account.email.endsWith("@caravana77.invalid") || account.password.length < 24) throw new Error("Only strong synthetic staging accounts are allowed.");
  const app = initializeApp(config, `staging-bootstrap-${key}`); const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  try {
    let result;
    try { result = await createUserWithEmailAndPassword(auth, account.email, account.password); }
    catch (cause) { if (cause.code !== "auth/email-already-in-use") throw new Error(`Synthetic ${key} signup failed; credentials suppressed.`); result = await signInWithEmailAndPassword(auth, account.email, account.password); }
    if (account.uid && account.uid !== result.user.uid) throw new Error("Existing synthetic UID changed. No reset permitted.");
    account.uid = result.user.uid; await writeFile(credentialsPath, JSON.stringify(credentials, null, 2) + "\n"); await signOut(auth);
  } finally { await deleteApp(app); }
}
const accounts = credentials.accounts;
const users = await admin.request("auth", "get", `${prefix}/accounts:batchGet`, undefined, { maxResults: 1000 });
if (users.nextPageToken || (users.users || []).some((user) => !Object.values(accounts).some((account) => account.uid === user.localId))) throw new Error("Unknown Auth users found in staging. No bulk replacement or deletion permitted.");
const authConfig = await admin.request("authConfig", "get", `${prefix}/config`);
const domain = `${STAGING_PAGES}.pages.dev`;
if (!authConfig.authorizedDomains?.includes(domain)) await admin.request("authConfig", "patch", `${prefix}/config`, { authorizedDomains: [...(authConfig.authorizedDomains || []), domain] }, { updateMask: "authorizedDomains" });

const documents = []; const add = (path, data) => documents.push({ path, data }); const now = new Date();
const references = [];
for (const [suffix, owner] of [["a", accounts.ownerA], ["b", accounts.ownerB]]) {
  const org = `staging-org-${suffix}`; const slug = `staging-organizadora-${suffix}`; const trip = `staging-ride-${suffix}`; const operation = hash(`staging-initial-${suffix}`).slice(0, 32); const plan = PlanCatalog[suffix === "a" ? "essencial" : "pro"];
  references.push({ organizationId: org, source: "organizations" }, { organizationId: org, source: "tenantSlugs", namespace: slug });
  const branding = { organizationId: org, slug, publicName: `Organizadora Fictícia ${suffix.toUpperCase()} · STAGING`, description: "Homologação exclusivamente com dados fictícios.", primaryColor: suffix === "a" ? "#1d4ed8" : "#166534", logo: "", website: "", contactEmail: "", whatsapp: "", operationalMessage: "AMBIENTE DE TESTES. Não realize pagamentos nem envie dados ou documentos reais. A confirmação é manual e usa registros fictícios.", updatedAt: now, lastBrandOperationId: operation };
  const subscription = { organizationId: org, planId: plan.id, status: "active", monthlyCatalogCents: plan.monthlyCents, setupWaived: true, setupFeeCents: 0, overrideMonthlyCents: null, overrideExpiresAt: null, overrideReason: "", trialEndsAt: null, revision: 1, reason: "Homologação fictícia sem cobrança", updatedAt: now, updatedBy: accounts.platform.uid, lastCommercialOperationId: operation };
  add(`organizations/${org}`, { name: branding.publicName, slug: org, ownerUid: owner.uid, status: "active", synthetic: true, createdAt: now, createdBy: accounts.platform.uid, updatedAt: now, updatedBy: accounts.platform.uid, lastPlatformOperationId: operation });
  add(`memberships/${owner.uid}/organizations/${org}`, { uid: owner.uid, organizationId: org, role: "tenant_owner", status: "active", createdAt: now, updatedAt: now, lastPlatformOperationId: operation });
  add(`tenantTeam/${org}/members/${owner.uid}`, { uid: owner.uid, organizationId: org, role: "tenant_owner", status: "active", updatedAt: now, lastPlatformOperationId: operation });
  add(`tenantUsage/${org}`, { organizationId: org, version: "commercial-v1", publishedCaravans: 1, activeMembers: 1, activeOwners: 1, updatedAt: now, lastPlatformOperationId: operation });
  add(`subscriptions/${org}`, subscription);
  add(`tenantEntitlements/${org}`, { organizationId: org, limits: { ...plan.limits }, growthEnabled: true, growthUntil: null, updatedAt: now, lastCommercialOperationId: operation });
  add(`publicTenantSettings/${org}`, branding); add(`tenantSlugs/${slug}`, { slug, organizationId: org });
  add(`organizationAvailability/${org}`, { organizationId: org, status: "active", updatedAt: now, lastPlatformOperationId: operation });
  add(`platformAudit/${operation}`, { organizationId: org, actorUid: accounts.platform.uid, action: "tenant_created", at: now, previousStatus: "absent", status: "active", details: { name: branding.publicName, slug: org, ownerUid: owner.uid, ownerUidConfirmed: true, requestHash: hash(`trusted-staging-fixture-${suffix}`), subscription, branding } });
  add(`caravans/${trip}`, { organizationId: org, name: `Caravana Fictícia ${suffix.toUpperCase()} · STAGING`, slug: `staging-viagem-${suffix}`, organizerName: branding.publicName, event: "Evento fictício sem valor real", description: "Viagem fictícia para homologação. Não efetue pagamentos.", date: "2026-12-15", departureTime: "06:00", returnTime: "22:00", city: "Cidade fictícia", destination: "Destino fictício", address: "Local fictício", priceCents: suffix === "a" ? 8500 : 12000, capacity: 25, reservedSeats: 0, status: "published", paymentMethod: "Registro fictício", paymentInstructions: "Nenhum pagamento deve ser realizado. Confirmação manual exclusivamente com informações fictícias.", paymentDeadline: "2026-12-14", pixKey: "", pixReceiver: "", whatsapp: "", boardingPoints: [{ id: "staging-point", name: "Terminal fictício", address: "Local fictício", time: "06:00" }], benefits: ["Transporte fictício"], rules: ["Somente dados sintéticos"], faqs: [], announcements: [], createdAt: now, updatedAt: now });
}
const protection = planNamespaceProtection({ complete: true, coveredSources: [...NAMESPACE_SOURCES], references, existing: [] });
if (!protection.readyForSyntheticRehearsal) throw new Error("Synthetic namespace plan has conflicts.");
for (const entry of protection.creates) add(`tenantNamespaces/${entry.namespace}`, entry);
add("namespaceBootstrap/state", { version: "namespace-v1", coverageVersion: NAMESPACE_INVENTORY_VERSION, inventoryComplete: true, manifestHash: hash(JSON.stringify(protection.creates)) });
add(`platformOwners/${accounts.platform.uid}`, { status: "active", synthetic: true });
add("stagingControl/bootstrap", { projectId: admin.projectId, version: "staging-v1", synthetic: true, createdAt: now, fixtureCount: documents.length + 1 });
function encode(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (value && typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  throw new Error("Unsupported synthetic value.");
}
if (!existing) await admin.request("firestore", "post", `${prefix}/databases/(default)/documents:commit`, { writes: documents.map(({ path, data }) => ({ update: { name: documentName(path), fields: encode(data).mapValue.fields }, currentDocument: { exists: false } })) });
const summary = { checkedOn: new Date().toISOString(), projectId: admin.projectId, billingEnabled: false, authAccounts: Object.keys(accounts), authUserCount: users.users.length, createdFixtureDocuments: existing ? 0 : documents.length, preservedExistingData: existing, authorizedDomain: domain, storageEnabled: false, productionWrites: 0, credentialFile: ".firebase/staging-accounts.json (ignored; never publish)" };
await writeFile("docs/evidence/2026-10-20/staging-bootstrap.json", JSON.stringify(summary, null, 2) + "\n"); console.log(JSON.stringify(summary, null, 2));
