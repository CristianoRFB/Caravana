import { doc, setDoc, type Firestore } from "firebase/firestore";
import { PlanCatalog, type PlanId } from "../../src/lib/plan-catalog";
// Explicit fixture preparation through Rules-disabled test context; never an application fallback.
export async function seedSyntheticEntitlements(database: Firestore, organizationId: string, planId: PlanId) {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" || (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== "demo-caravana77-test")) throw new Error("Synthetic commercial fixtures require the isolated emulator");
  await setDoc(doc(database, "tenantEntitlements", organizationId), { organizationId, limits: PlanCatalog[planId].limits, growthEnabled: true, growthUntil: null });
}
