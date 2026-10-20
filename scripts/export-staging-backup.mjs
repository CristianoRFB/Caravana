import { stagingAdmin } from "./staging-admin.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const admin = await stagingAdmin(); const prefix = `/projects/${admin.projectId}`; const documents = []; let inspected = 0;
async function walk(parent, depth = 0) {
  if (depth > 12 || inspected > 500) throw new Error("Synthetic backup traversal limit reached; no partial backup accepted.");
  let collectionPage;
  do {
    const response = await admin.request("firestore", "post", `${parent}:listCollectionIds`, { pageSize: 100, ...(collectionPage ? { pageToken: collectionPage } : {}) });
    for (const collection of response.collectionIds || []) {
      if (!/^[a-zA-Z0-9_-]+$/.test(collection)) throw new Error("Unexpected collection identifier."); let page;
      do {
        const listing = await admin.request("firestore", "get", `${parent}/${collection}`, undefined, { pageSize: 100, showMissing: true, ...(page ? { pageToken: page } : {}) });
        for (const document of listing.documents || []) {
          inspected++;
          if (!document.name.startsWith(`projects/${admin.projectId}/databases/(default)/documents/`) || document.name.split("/").some((part) => [".", ".."].includes(part))) throw new Error("Foreign or unsafe document reference.");
          const path = document.name.split("/documents/")[1];
          if (document.createTime) {
            if (/^registrations\/[^/]+$/.test(path) && !document.fields?.passengerName?.stringValue?.startsWith("Pessoa Fictícia")) throw new Error("Unexpected passenger content; only this synthetic dataset may be exported.");
            documents.push({ path, fields: document.fields || {} });
          }
          await walk(`/${document.name}`, depth + 1);
        }
        page = listing.nextPageToken;
      } while (page);
    }
    collectionPage = response.nextPageToken;
  } while (collectionPage);
}
await walk(`${prefix}/databases/(default)/documents`);
const users = await admin.request("auth", "get", `${prefix}/accounts:batchGet`, undefined, { maxResults: 1000 });
if (users.nextPageToken || users.users?.some((user) => !user.email?.endsWith("@caravana77.invalid"))) throw new Error("Only known synthetic Auth metadata may enter this backup.");
const backup = { version: "staging-synthetic-backup-v1", projectId: admin.projectId, exportedAt: new Date().toISOString(), synthetic: true, documents: documents.sort((a, b) => a.path.localeCompare(b.path)), authMetadata: users.users.map((user) => ({ uid: user.localId, email: user.email })) };
const bytes = JSON.stringify(backup); const sha256 = createHash("sha256").update(bytes).digest("hex"); await mkdir(".firebase/backups", { recursive: true });
await writeFile(".firebase/backups/staging-synthetic.json", bytes);
const manifest = { version: backup.version, projectId: admin.projectId, exportedAt: backup.exportedAt, documentCount: documents.length, syntheticAuthMetadataCount: backup.authMetadata.length, bytes: Buffer.byteLength(bytes), sha256, sourceWrites: 0, productionAccess: false, rawBackupIgnored: true, containsAuthSecrets: false, restoreStatus: "TODO" };
await writeFile("docs/evidence/2026-10-20/staging-backup-manifest.json", JSON.stringify(manifest, null, 2) + "\n"); console.log(JSON.stringify(manifest, null, 2));
