import { collection, doc, getDocFromServer, limit, onSnapshot, orderBy, query, serverTimestamp, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { membershipPath } from "./memberships";
import { NAMESPACE_INVENTORY_VERSION } from "./namespace-protection";
import { onboardingPayload, type OnboardTenant } from "./onboarding-payload";
import { commercialDocuments } from "./commercial-data";
import { importDigest } from "./import-identity";
import { trackWrite } from "./pending-writes";
export type { OnboardTenant } from "./onboarding-payload";

export interface PlatformTenant { id: string; name: string; status: "active" | "suspended" | "unknown"; }
export interface PlatformEvent { id: string; organizationId: string; actorUid: string; action: string; status: string; }
export const platformOperationId = () => crypto.randomUUID().replaceAll("-", "");
function session(operationId: string) {
  if (!db || !auth?.currentUser) throw new Error("Entre com a conta da plataforma.");
  if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Identificador de operação inválido.");
  return { database: db, actorUid: auth.currentUser.uid };
}
export function watchPlatformAccess(uid: string, callback: (allowed: boolean) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(doc(db, "platformOwners", uid), (snapshot) => callback(snapshot.data()?.status === "active"), fail);
}
export function watchPlatformTenants(callback: (tenants: PlatformTenant[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "organizations"), (snapshot) => callback(snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, name: typeof data.name === "string" ? data.name : item.id, status: data.status === undefined || data.status === "active" ? "active" : data.status === "suspended" ? "suspended" : "unknown" };
  })), fail);
}
export function watchPlatformAudit(callback: (events: PlatformEvent[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(query(collection(db, "platformAudit"), orderBy("at", "desc"), limit(50)), (snapshot) => callback(snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, organizationId: String(data.organizationId || ""), actorUid: String(data.actorUid || ""), action: String(data.action || ""), status: String(data.status || "") };
  })), fail);
}
export async function onboardTenant(input: OnboardTenant, operationId: string): Promise<string> {
  return trackWrite(async () => {
  const { database, actorUid } = session(operationId);
  const payload = onboardingPayload(input); const { name, slug, ownerUid } = payload;
  const requestHash = await importDigest(payload);
  const memberPath = membershipPath(ownerUid, slug);
  const organization = doc(database, "organizations", slug);
  const audit = doc(database, "platformAudit", operationId);
  const matches = (data: DocumentData) => data.actorUid === actorUid && data.action === "tenant_created" && data.organizationId === slug && data.details?.requestHash === requestHash;
  try { await runTransaction(database, async (transaction) => {
    const previousEvent = await transaction.get(audit);
    if (previousEvent.exists()) {
      const data = previousEvent.data();
      if (!matches(data)) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    if ((await transaction.get(organization)).exists()) throw new Error("Já existe uma organizadora com esse identificador. Nenhum dado foi substituído.");
    const namespace = doc(database, "tenantNamespaces", slug);
    const [bootstrap, protectedId, publicSlug] = await Promise.all([transaction.get(doc(database, "namespaceBootstrap", "state")), transaction.get(namespace), transaction.get(doc(database, "tenantSlugs", slug))]);
    if (!bootstrap.exists() || bootstrap.data().version !== "namespace-v1" || bootstrap.data().coverageVersion !== NAMESPACE_INVENTORY_VERSION || bootstrap.data().inventoryComplete !== true || !/^[a-f0-9]{64}$/.test(bootstrap.data().manifestHash)) throw new Error("Onboarding bloqueado: inventário de namespaces históricos ainda não validado. Nenhum dado foi criado.");
    if (protectedId.exists() || publicSlug.exists()) throw new Error("Identificador histórico reservado ou endereço público já utilizado. Nenhum dado foi substituído.");
    const time = serverTimestamp();
    const { subscription, entitlements, features } = commercialDocuments(payload.assignment, operationId, actorUid, 1);
    const branding = { ...payload.branding, updatedAt: time, lastBrandOperationId: operationId };
    transaction.set(namespace, { namespace: slug, organizationId: slug, state: "active", version: "namespace-v1", createdAt: time, actorUid, lastPlatformOperationId: operationId });
    transaction.set(organization, { name, slug, ownerUid, status: "active", createdAt: time, createdBy: actorUid, updatedAt: time, updatedBy: actorUid, lastPlatformOperationId: operationId });
    transaction.set(doc(database, memberPath), { uid: ownerUid, organizationId: slug, role: "tenant_owner", status: "active", createdAt: time, updatedAt: time, lastPlatformOperationId: operationId });
    transaction.set(doc(database, "tenantTeam", slug, "members", ownerUid), { uid: ownerUid, organizationId: slug, role: "tenant_owner", status: "active", updatedAt: time, lastPlatformOperationId: operationId });
    transaction.set(doc(database, "tenantUsage", slug), { organizationId: slug, version: "commercial-v1", publishedCaravans: 0, activeMembers: 1, activeOwners: 1, updatedAt: time, lastPlatformOperationId: operationId });
    transaction.set(doc(database, "subscriptions", slug), subscription);
    transaction.set(doc(database, "tenantEntitlements", slug), entitlements);
    transaction.set(doc(database, "organizations", slug, "commercialFeatures", "current"), features);
    transaction.set(doc(database, "publicTenantSettings", slug), branding);
    transaction.set(doc(database, "tenantSlugs", slug), { slug, organizationId: slug });
    transaction.set(doc(database, "organizationAvailability", slug), { organizationId: slug, status: "active", updatedAt: time, lastPlatformOperationId: operationId });
    transaction.set(audit, { organizationId: slug, actorUid, action: "tenant_created", at: time, previousStatus: "absent", status: "active", details: { name, slug, ownerUid, ownerUidConfirmed: true, requestHash, subscription, branding } });
  }); } catch (cause) {
    try { const confirmed = await getDocFromServer(audit); if (confirmed.exists() && matches(confirmed.data())) return slug; } catch { /* original error remains */ }
    throw cause;
  }
  return slug;
  });
}
export async function changeTenantStatus(organizationId: string, status: "active" | "suspended", operationId: string): Promise<void> {
  const { database, actorUid } = session(operationId);
  if (!["active", "suspended"].includes(status)) throw new Error("Situação inválida.");
  const organization = doc(database, "organizations", organizationId);
  const audit = doc(database, "platformAudit", operationId);
  await runTransaction(database, async (transaction) => {
    const previous = await transaction.get(audit);
    if (previous.exists()) {
      if (previous.data().actorUid !== actorUid || previous.data().action !== "tenant_status_changed" || previous.data().organizationId !== organizationId || previous.data().status !== status) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const current = await transaction.get(organization);
    if (!current.exists()) throw new Error("Organizadora não encontrada.");
    const previousStatus = current.data().status ?? "active";
    if (!["active", "suspended"].includes(previousStatus)) throw new Error("Situação legada precisa de revisão antes da alteração.");
    if (previousStatus === status) return;
    const time = serverTimestamp();
    transaction.update(organization, { status, updatedAt: time, updatedBy: actorUid, lastPlatformOperationId: operationId });
    transaction.set(doc(database, "organizationAvailability", organizationId), { organizationId, status, updatedAt: time, lastPlatformOperationId: operationId });
    transaction.set(audit, { organizationId, actorUid, action: "tenant_status_changed", at: time, previousStatus, status, details: {} });
  });
}
