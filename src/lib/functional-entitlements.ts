import { doc, getDocFromServer, onSnapshot, type Timestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { EntitlementService, type CommercialFeature, type PlanId, type SubscriptionStatus } from "./plan-catalog";
export interface FunctionalEntitlements { organizationId: string; version: string; planId: PlanId; features: CommercialFeature[]; status: SubscriptionStatus; validUntil: Timestamp | null }
export function functionalFeatureAllowed(policy: FunctionalEntitlements | null, feature: CommercialFeature, now = Date.now()): boolean {
  if (!policy || policy.version !== "features-v1" || !Array.isArray(policy.features) || !policy.features.includes(feature)) return false;
  const resolved = EntitlementService.resolve({ organizationId: policy.organizationId, planId: policy.planId, status: policy.status, reason: "Resolução de capacidades", setupWaived: true, ...(policy.validUntil ? { trialEndsAtMillis: policy.validUntil.toMillis() } : {}) }, now);
  return EntitlementService.featureAllowed(resolved, feature, true);
}
export function watchFunctionalEntitlements(organizationId: string, callback: (policy: FunctionalEntitlements | null) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não configurado.");
  return onSnapshot(doc(db, "organizations", organizationId, "commercialFeatures", "current"), { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.exists() ? snapshot.data() as FunctionalEntitlements : null);
  }, fail);
}
export async function requireFunctionalFeature(organizationId: string, feature: CommercialFeature) {
  if (!db) throw new Error("Firebase não configurado.");
  const snapshot = await getDocFromServer(doc(db, "organizations", organizationId, "commercialFeatures", "current"));
  if (!snapshot.exists() || !functionalFeatureAllowed(snapshot.data() as FunctionalEntitlements, feature)) throw new Error("Este recurso requer um plano habilitado. Seu histórico permanece disponível; confira Plano e limites.");
}
