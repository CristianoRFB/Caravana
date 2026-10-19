import { doc, setDoc, type Firestore } from "firebase/firestore";
import { NAMESPACE_INVENTORY_VERSION, NAMESPACE_SOURCES, planNamespaceProtection } from "../../src/lib/namespace-protection";
import { importDigest } from "../../src/lib/import-identity";
// Trusted fixture inventory of this explicitly isolated dataset. This is not a production migration.
export async function seedSyntheticNamespaceBootstrap(database: Firestore, organizationIds: string[]) {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" || (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== "demo-caravana77-test")) throw new Error("Synthetic namespace bootstrap only");
  const plan = planNamespaceProtection({ complete: true, coveredSources: [...NAMESPACE_SOURCES], references: organizationIds.map((organizationId) => ({ organizationId, source: "organizations" })), existing: [] });
  if (!plan.readyForSyntheticRehearsal) throw new Error("Invalid synthetic namespace inventory");
  for (const namespace of plan.creates) await setDoc(doc(database, "tenantNamespaces", namespace.namespace), namespace);
  await setDoc(doc(database, "namespaceBootstrap", "state"), { version: "namespace-v1", coverageVersion: NAMESPACE_INVENTORY_VERSION, inventoryComplete: true, manifestHash: await importDigest(plan.creates) });
}
