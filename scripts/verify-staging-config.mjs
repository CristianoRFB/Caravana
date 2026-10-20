import { stagingAdmin } from "./staging-admin.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NAMESPACE_INVENTORY_VERSION } from "../src/lib/namespace-protection.ts";
const admin = await stagingAdmin(); const prefix = `/projects/${admin.projectId}`;
const release = await admin.request("rules", "get", `${prefix}/releases/cloud.firestore`);
if (!release.rulesetName?.startsWith(`projects/${admin.projectId}/rulesets/`)) throw new Error("Foreign Rules release.");
const [ruleset, indexes, config, marker] = await Promise.all([
  admin.request("rules", "get", `/${release.rulesetName}`),
  admin.request("firestore", "get", `${prefix}/databases/(default)/collectionGroups/-/indexes`),
  admin.request("authConfig", "get", `${prefix}/config`),
  admin.request("firestore", "get", `${prefix}/databases/(default)/documents/namespaceBootstrap/state`),
]);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const source = ruleset.source.files.find((file) => file.name === "firestore.rules");
if (!source || sha(source.content) !== sha(await readFile("firestore.rules"))) throw new Error("Deployed staging Rules differ from the reviewed candidate.");
if (marker.fields.coverageVersion.stringValue !== NAMESPACE_INVENTORY_VERSION) throw new Error("Staging namespace inventory is obsolete.");
const summary = { checkedOn: new Date().toISOString(), projectId: admin.projectId, billingEnabled: false, databaseEdition: admin.database.databaseEdition, freeTier: true, rulesMatchCandidate: true, rulesetName: release.rulesetName, rulesSha256: sha(source.content),
  indexes: (indexes.indexes || []).map((index) => ({ name: index.name, state: index.state, queryScope: index.queryScope, fields: index.fields })),
  allIndexesReady: (indexes.indexes || []).every((index) => index.state === "READY"), emailPasswordEnabled: config.signIn?.email?.enabled === true && config.signIn?.email?.passwordRequired === true,
  stagingDomainAuthorized: config.authorizedDomains.includes("caravana77-staging.pages.dev"), namespaceCoverage: NAMESPACE_INVENTORY_VERSION, storageEnabledByThisWork: false, productionWrites: 0 };
await writeFile("docs/evidence/2026-10-20/staging-config-verified.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, indexes: summary.indexes.map((index) => ({ state: index.state, fields: index.fields.map((field) => field.fieldPath) })) }, null, 2));
