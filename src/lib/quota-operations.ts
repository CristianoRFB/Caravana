import { doc, getDocFromServer, serverTimestamp, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { importDigest } from "./import-identity";
import type { Caravan } from "./types";
import type { PublicEntitlements } from "./commercial-data";
export const quotaOperationId = () => crypto.randomUUID().replaceAll("-", "");
interface Counters { publishedCaravans: number; activeMembers: number; activeOwners: number }
export function quotaGrowthAllowed(policy: PublicEntitlements | null, now = Date.now()) { return Boolean(policy?.growthEnabled && (!policy.growthUntil || policy.growthUntil.toMillis() > now)); }
function counters(data: DocumentData): Counters {
  const value = { publishedCaravans: data.publishedCaravans, activeMembers: data.activeMembers, activeOwners: data.activeOwners };
  if (data.version !== "commercial-v1" || Object.values(value).some((count) => !Number.isSafeInteger(count) || count < 0) || value.activeOwners < 1 || value.activeOwners > value.activeMembers) throw new Error("O inventário comercial precisa ser conferido. Nenhum contador foi alterado.");
  return value;
}
function validTrip(data: DocumentData): asserts data is DocumentData & Pick<Caravan, "status" | "capacity" | "reservedSeats"> {
  if (!["draft", "published", "archived"].includes(data.status) || !Number.isSafeInteger(data.capacity) || data.capacity < 1 || data.capacity > 1000 || !Number.isSafeInteger(data.reservedSeats) || data.reservedSeats < 0 || data.reservedSeats > data.capacity) throw new Error("Confira situação e capacidade da caravana.");
}
async function changeCaravan(organizationId: string, caravanId: string, payload: Partial<Caravan>, creating: boolean, operationId: string) {
  return trackWrite(async () => {
    if (!db || !auth?.currentUser) throw new Error("Entre com a conta da organização.");
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Sem conexão. Nenhuma caravana foi confirmada.");
    if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Operação inválida.");
    const database = db; const actorUid = auth.currentUser.uid; const entityId = creating ? operationId : caravanId;
    const action = creating ? "caravan_created" : "caravan_updated"; const requestHash = await importDigest({ organizationId, caravanId, payload, creating });
    const audit = doc(database, "tenantQuotaOperations", operationId); const target = doc(database, "caravans", entityId);
    const matches = (event: DocumentData) => event.actorUid === actorUid && event.entityId === entityId && event.requestHash === requestHash && event.action === action;
    try {
      await runTransaction(database, async (tx) => {
        const prior = await tx.get(audit); if (prior.exists()) { if (!matches(prior.data())) throw new Error("Operação já utilizada com outros dados."); return; }
        const current = await tx.get(target);
        if (creating ? current.exists() : !current.exists()) throw new Error(creating ? "Este identificador já foi utilizado." : "Caravana não encontrada.");
        const original = current.exists() ? current.data() : null; const orgId = original?.organizationId || organizationId;
        if (!orgId || (organizationId && orgId !== organizationId) || (payload.organizationId && payload.organizationId !== orgId) || "reservedSeats" in payload || "id" in payload) throw new Error("Contexto da caravana inválido.");
        const usageRef = doc(database, "tenantUsage", orgId);
        const [policySnapshot, usage] = await Promise.all([tx.get(doc(database, "tenantEntitlements", orgId)), tx.get(usageRef)]);
        if (!usage.exists()) throw new Error("A organização precisa de inventário comercial validado. Nenhum contador foi criado automaticamente.");
        const before = counters(usage.data()); const after = { ...before };
        const policy = policySnapshot.exists() ? policySnapshot.data() as PublicEntitlements : null;
        const data = { ...(original || {}), ...payload, organizationId: orgId, reservedSeats: original?.reservedSeats ?? 0 };
        validTrip(data);
        if ((creating || "priceCents" in payload) && (!Number.isSafeInteger(data.priceCents) || (data.priceCents ?? -1) < 0)) throw new Error("Informe um preço válido em centavos.");
        const beforePublished = original?.status === "published"; const afterPublished = data.status === "published";
        const growth = creating || (!beforePublished && afterPublished) || (original && data.capacity > original.capacity);
        if (growth && (!quotaGrowthAllowed(policy) || data.capacity > policy!.limits.passengersPerCaravan)) throw new Error("O plano atual não permite esta criação, capacidade ou reativação. Confira os limites da organização.");
        after.publishedCaravans += Number(afterPublished) - Number(beforePublished);
        if (after.publishedCaravans < 0 || (after.publishedCaravans > before.publishedCaravans && after.publishedCaravans > policy!.limits.activeCaravans)) throw new Error("O limite de caravanas publicadas foi atingido ou o inventário está inconsistente.");
        tx.set(target, { ...data, ...(creating ? { createdAt: serverTimestamp(), creationRequestHash: requestHash } : {}), updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        if (after.publishedCaravans !== before.publishedCaravans) tx.update(usageRef, { ...after, updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        tx.set(audit, { organizationId: orgId, entityId, kind: "caravan", action, actorUid, at: serverTimestamp(), requestHash, reason: "Configuração de caravana", before, after, beforeStatus: original?.status || "absent", afterStatus: data.status, beforeRole: "", afterRole: "" });
      });
    } catch (cause) { try { const confirmed = await getDocFromServer(audit); if (confirmed.exists() && matches(confirmed.data())) return entityId; } catch { /* original failure remains */ } throw cause; }
    return entityId;
  });
}
export const createLimitedCaravan = (organizationId: string, payload: Omit<Caravan, "id" | "organizationId" | "reservedSeats">, operationId = quotaOperationId()) => changeCaravan(organizationId, "", payload, true, operationId);
export const updateLimitedCaravan = (caravanId: string, payload: Partial<Caravan>, operationId = quotaOperationId()) => changeCaravan("", caravanId, payload, false, operationId);
export async function saveInternalMember(organizationId: string, uid: string, role: "tenant_owner" | "staff", status: "active" | "revoked", reason: string, operationId = quotaOperationId()) {
  return trackWrite(async () => {
    if (!db || !auth?.currentUser) throw new Error("Entre com a conta da organização.");
    if (!/^[^/]{1,128}$/.test(uid) || [".", ".."].includes(uid) || !["tenant_owner", "staff"].includes(role) || !["active", "revoked"].includes(status) || reason.trim().length < 3 || reason.length > 300 || !/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Confira o UID existente, papel, situação e motivo.");
    const database = db; const actorUid = auth.currentUser.uid; const note = reason.trim(); const requestHash = await importDigest({ organizationId, uid, role, status, reason: note });
    const audit = doc(database, "tenantQuotaOperations", operationId); const target = doc(database, "memberships", uid, "organizations", organizationId); const usageRef = doc(database, "tenantUsage", organizationId);
    const matches = (event: DocumentData) => event.actorUid === actorUid && event.organizationId === organizationId && event.entityId === uid && event.action === "member_saved" && event.requestHash === requestHash;
    try {
      await runTransaction(database, async (tx) => {
        const prior = await tx.get(audit); if (prior.exists()) { if (!matches(prior.data())) throw new Error("Operação já utilizada com outros dados."); return; }
        const [current, usage, policySnapshot] = await Promise.all([tx.get(target), tx.get(usageRef), tx.get(doc(database, "tenantEntitlements", organizationId))]);
        if (!usage.exists()) throw new Error("A equipe precisa de inventário comercial validado antes de ser alterada.");
        const original = current.exists() ? current.data() : null;
        if (!original && status === "revoked") throw new Error("Não há acesso existente para revogar.");
        if (original && (original.uid !== uid || original.organizationId !== organizationId || !["tenant_owner", "staff"].includes(original.role) || !["active", "revoked"].includes(original.status))) throw new Error("Membership existente precisa de revisão; nenhum dado foi substituído.");
        if (original?.role === role && original.status === status) return;
        const before = counters(usage.data()); const after = { ...before };
        const wasActive = original?.status === "active"; const willBeActive = status === "active";
        after.activeMembers += Number(willBeActive) - Number(wasActive);
        after.activeOwners += Number(willBeActive && role === "tenant_owner") - Number(wasActive && original?.role === "tenant_owner");
        const policy = policySnapshot.exists() ? policySnapshot.data() as PublicEntitlements : null;
        if (after.activeOwners < 1) throw new Error("Mantenha pelo menos um responsável ativo na organização.");
        if (after.activeMembers < after.activeOwners || after.activeMembers < 0 || (after.activeMembers > before.activeMembers && (!quotaGrowthAllowed(policy) || after.activeMembers > policy!.limits.internalUsers))) throw new Error("O plano não permite incluir mais pessoas na equipe ou o inventário está inconsistente.");
        const member = { ...(original || {}), uid, organizationId, role, status, ...(!original ? { createdAt: serverTimestamp() } : {}), updatedAt: serverTimestamp(), lastQuotaOperationId: operationId };
        tx.set(target, member); tx.set(doc(database, "tenantTeam", organizationId, "members", uid), { uid, organizationId, role, status, updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        if (after.activeMembers !== before.activeMembers || after.activeOwners !== before.activeOwners) tx.update(usageRef, { ...after, updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        tx.set(audit, { organizationId, entityId: uid, kind: "member", action: "member_saved", actorUid, at: serverTimestamp(), requestHash, reason: note, before, after, beforeStatus: original?.status || "absent", afterStatus: status, beforeRole: original?.role || "", afterRole: role });
      });
    } catch (cause) { try { const confirmed = await getDocFromServer(audit); if (confirmed.exists() && matches(confirmed.data())) return; } catch { /* original failure remains */ } throw cause; }
  });
}
