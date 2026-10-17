import { doc, getDocFromServer, onSnapshot, serverTimestamp, Timestamp, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { importDigest } from "./import-identity";
import { COMMERCIAL_POLICY, PlanCatalog, validatePlanAssignment, type Limits, type ManualPlanAssignment, type PlanId, type SubscriptionStatus } from "./plan-catalog";
export const commercialOperationId = () => crypto.randomUUID().replaceAll("-", "");
export interface PublicEntitlements { organizationId: string; limits: Limits; growthEnabled: boolean; growthUntil: Timestamp | null }
export interface CommercialSubscription { organizationId: string; planId: PlanId; status: SubscriptionStatus; monthlyCatalogCents: number; setupWaived: boolean; setupFeeCents: number; overrideMonthlyCents: number | null; overrideExpiresAt: Timestamp | null; overrideReason: string; trialEndsAt: Timestamp | null; revision: number; reason: string; lastCommercialOperationId: string }
export function commercialDocuments(input: ManualPlanAssignment, operationId: string, actorUid: string, revision: number) {
  const plan = PlanCatalog[input.planId]; const time = serverTimestamp();
  const trialEndsAt = input.status === "trial" ? Timestamp.fromMillis(input.trialEndsAtMillis!) : null;
  const subscription = { organizationId: input.organizationId, planId: input.planId, status: input.status, monthlyCatalogCents: plan.monthlyCents, setupWaived: input.setupWaived, setupFeeCents: input.setupWaived ? 0 : COMMERCIAL_POLICY.setupCents,
    overrideMonthlyCents: input.override?.monthlyCents ?? null, overrideExpiresAt: input.override ? Timestamp.fromMillis(input.override.expiresAtMillis) : null, overrideReason: input.override?.reason || "", trialEndsAt, revision, reason: input.reason,
    updatedAt: time, updatedBy: actorUid, lastCommercialOperationId: operationId };
  const entitlements = { organizationId: input.organizationId, limits: { ...plan.limits }, growthEnabled: ["active", "trial", "demo"].includes(input.status), growthUntil: trialEndsAt, updatedAt: time, lastCommercialOperationId: operationId };
  return { subscription, entitlements };
}
export function watchPublicEntitlements(organizationId: string, callback: (value: PublicEntitlements | null) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(doc(db, "tenantEntitlements", organizationId), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.exists() ? snapshot.data() as PublicEntitlements : null); }, fail);
}
export function watchCommercialSubscription(organizationId: string, callback: (value: CommercialSubscription | null) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(doc(db, "subscriptions", organizationId), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.exists() ? snapshot.data() as CommercialSubscription : null); }, fail);
}
export function subscriptionAssignment(subscription: CommercialSubscription): ManualPlanAssignment {
  return { organizationId: subscription.organizationId, planId: subscription.planId, status: subscription.status, reason: subscription.reason, setupWaived: subscription.setupWaived,
    ...(subscription.trialEndsAt ? { trialEndsAtMillis: subscription.trialEndsAt.toMillis() } : {}),
    ...(subscription.overrideMonthlyCents !== null && subscription.overrideExpiresAt ? { override: { monthlyCents: subscription.overrideMonthlyCents, expiresAtMillis: subscription.overrideExpiresAt.toMillis(), reason: subscription.overrideReason } } : {}) };
}
export async function assignTenantPlan(input: ManualPlanAssignment, operationId = commercialOperationId(), expectedRevision?: number) {
  return trackWrite(async () => {
    if (!db || !auth?.currentUser) throw new Error("Entre com a conta da plataforma.");
    if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Operação inválida.");
    const database = db; const actorUid = auth.currentUser.uid; const payloadHash = await importDigest({ input, expectedRevision: expectedRevision ?? null });
    const audit = doc(database, "commercialOperations", operationId); const subscriptionRef = doc(database, "subscriptions", input.organizationId);
    const matches = (data: DocumentData) => data.organizationId === input.organizationId && data.actorUid === actorUid && data.payloadHash === payloadHash && data.action === "plan_assigned";
    try {
      return await runTransaction(database, async (tx) => {
        const priorEvent = await tx.get(audit);
        if (priorEvent.exists()) { if (!matches(priorEvent.data())) throw new Error("Operação já utilizada com outros dados."); return Number(priorEvent.data().subscription.revision); }
        const data = validatePlanAssignment(input, Date.now());
        const [organization, current, usage] = await Promise.all([tx.get(doc(database, "organizations", data.organizationId)), tx.get(subscriptionRef), tx.get(doc(database, "tenantUsage", data.organizationId))]);
        if (!organization.exists()) throw new Error("Organização não encontrada.");
        if (!usage.exists() || usage.data().version !== "commercial-v1") throw new Error("A organização precisa de inventário comercial validado antes de atribuir um plano. Nenhum contador foi alterado.");
        const revision = current.exists() ? current.data().revision + 1 : 1;
        if (expectedRevision !== undefined && revision !== expectedRevision + 1) throw new Error("O plano mudou desde a conferência. Recarregue a condição atual antes de alterar.");
        if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Histórico comercial inconsistente; confira antes de alterar.");
        const { subscription, entitlements } = commercialDocuments(data, operationId, actorUid, revision);
        tx.set(subscriptionRef, subscription); tx.set(doc(database, "tenantEntitlements", data.organizationId), entitlements);
        tx.set(audit, { organizationId: data.organizationId, actorUid, at: serverTimestamp(), action: "plan_assigned", payloadHash, previous: current.exists() ? current.data() : null, subscription });
        return revision;
      });
    } catch (cause) {
      try { const confirmed = await getDocFromServer(audit); if (confirmed.exists() && matches(confirmed.data())) return Number(confirmed.data().subscription.revision); } catch { /* original failure remains */ }
      throw cause;
    }
  });
}
