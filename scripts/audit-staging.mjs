import { stagingAdmin } from "./staging-admin.mjs";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const admin = await stagingAdmin(); const prefix = `/projects/${admin.projectId}`;
const [collections, users, config, release, indexes] = await Promise.all([
  admin.request("firestore", "post", `${prefix}/databases/(default)/documents:listCollectionIds`, {}),
  admin.request("auth", "get", `${prefix}/accounts:batchGet`, undefined, { maxResults: 1000 }),
  admin.request("authConfig", "get", `${prefix}/config`),
  admin.request("rules", "get", `${prefix}/releases/cloud.firestore`),
  admin.request("firestore", "get", `${prefix}/databases/(default)/collectionGroups/-/indexes`),
]);
if (!release.rulesetName?.startsWith(`projects/${admin.projectId}/rulesets/`)) throw new Error("Rules release does not belong to staging.");
const ruleset = await admin.request("rules", "get", `/${release.rulesetName}`);
const directory = "docs/evidence/2026-10-20/staging-baseline"; await mkdir(directory, { recursive: true });
for (const file of ruleset.source.files) {
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) throw new Error("Unsafe Rules filename.");
  await writeFile(`${directory}/${file.name}`, file.content);
}
const summary = { checkedOn: new Date().toISOString(), projectId: admin.projectId, projectNumber: admin.projectNumber,
  billingEnabled: false, billingAccountLinked: false, databaseEdition: admin.database.databaseEdition, freeTier: admin.database.freeTier, locationId: admin.database.locationId,
  collectionIds: collections.collectionIds || [], authUserCountFirstPage: users.users?.length || 0, authUsersHaveNextPage: Boolean(users.nextPageToken),
  emailPasswordEnabled: config.signIn?.email?.enabled === true && config.signIn?.email?.passwordRequired === true,
  authorizedDomains: config.authorizedDomains || [], rulesRelease: release.name, rulesetName: release.rulesetName,
  rulesFiles: ruleset.source.files.map((file) => ({ name: file.name, sha256: createHash("sha256").update(file.content).digest("hex") })),
  compositeIndexes: indexes.indexes || [], writesPerformed: 0, productionAccess: false };
await writeFile(`${directory}/metadata.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
