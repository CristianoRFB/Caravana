import { collection, doc, getDocFromServer, onSnapshot, query, where, orderBy, limit, serverTimestamp, Timestamp, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { importDigest } from "./import-identity";
import { counters, quotaGrowthAllowed, quotaOperationId } from "./quota-operations";
import type { PublicEntitlements } from "./commercial-data";
import type { TenantRole } from "./memberships";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export interface TeamInvitation {
  organizationId: string; uid: string; role: TenantRole; generation: number; status: InvitationStatus;
  issuedBy: string; issuedAt: Timestamp; expiresAt: Timestamp; acceptedAt: Timestamp | null; updatedAt: Timestamp; lastOperationId: string;
}
export interface TeamMember { uid: string; organizationId: string; role: TenantRole; status: "active" | "revoked" }
export const invitationStatus = (value: TeamInvitation, now = Date.now()): InvitationStatus => value.status === "pending" && value.expiresAt.toMillis() <= now ? "expired" : value.status;
function validate(organizationId: string, uid: string, role: TenantRole, operationId: string) {
  if (![organizationId, uid].every((id) => id && id.length <= 128 && !id.includes("/") && ![".", ".."].includes(id)) || !["tenant_owner", "staff"].includes(role) || !/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Confira a organização, o UID e o papel permitido.");
}
function context() {
  if (!db || !auth?.currentUser) throw new Error("Entre com sua conta para continuar.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Sem conexão. Aguarde para confirmar a operação de equipe.");
  return { database: db, actorUid: auth.currentUser.uid };
}
function confirmedPolicy(snapshot: { exists(): boolean; data(): DocumentData | undefined }) { return snapshot.exists() ? snapshot.data() as PublicEntitlements : null; }
export function watchTeamInvitations(organizationId: string, callback: (items: TeamInvitation[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "tenantInvitations", organizationId, "users"), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.docs.map((item) => item.data() as TeamInvitation)); }, fail);
}
export function watchInvitationInbox(uid: string, callback: (items: TeamInvitation[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "invitationInboxes", uid, "organizations"), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.docs.map((item) => item.data() as TeamInvitation)); }, fail);
}
export function watchTeamMembers(organizationId: string, callback: (items: TeamMember[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "tenantTeam", organizationId, "members"), (snapshot) => callback(snapshot.docs.map((item) => item.data() as TeamMember)), fail);
}
export async function issueTeamInvitation(organizationId: string, uid: string, role: TenantRole, expectedGeneration: number, expiresAtMillis: number, reason: string, operationId = quotaOperationId()) {
  return trackWrite(async () => {
    const { database, actorUid } = context(); validate(organizationId, uid, role, operationId);
    if (uid === actorUid || !Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0 || reason.trim().length < 3 || reason.length > 300) throw new Error("Confira o destinatário, a geração e o motivo do convite. Não convide sua própria conta.");
    const requestHash = await importDigest({ organizationId, uid, role, expectedGeneration, expiresAtMillis, reason: reason.trim() });
    const receipt = doc(database, "tenantInvitations", organizationId, "events", operationId);
    const target = doc(database, "tenantInvitations", organizationId, "users", uid);
    const matches = (event: DocumentData) => event.actorUid === actorUid && event.uid === uid && event.organizationId === organizationId && event.action === "invitation_issued" && event.requestHash === requestHash;
    try {
      return await runTransaction(database, async (tx) => {
        const event = await tx.get(receipt); if (event.exists()) { if (!matches(event.data())) throw new Error("Operação já utilizada com outros dados."); return Number(event.data().after.generation); }
        const [current, member, usage, policy, organization] = await Promise.all([tx.get(target), tx.get(doc(database, "memberships", uid, "organizations", organizationId)), tx.get(doc(database, "tenantUsage", organizationId)), tx.get(doc(database, "tenantEntitlements", organizationId)), tx.get(doc(database, "organizations", organizationId))]);
        if (!Number.isSafeInteger(expiresAtMillis) || expiresAtMillis <= Date.now() || expiresAtMillis > Date.now() + 7 * 86400000) throw new Error("O convite precisa de prazo futuro de até sete dias.");
        if (!usage.exists()) throw new Error("É necessário inventário comercial validado para gerenciar a equipe."); counters(usage.data());
        if (organization.data()?.status === "suspended") throw new Error("A organização está suspensa para novos convites.");
        if (!quotaGrowthAllowed(confirmedPolicy(policy))) throw new Error("O plano não permite novos convites no momento.");
        if (member.data()?.status === "active") throw new Error("Este usuário já integra a equipe. Altere o acesso existente.");
        const before = current.exists() ? current.data() : null;
        if ((before?.generation || 0) !== expectedGeneration) throw new Error("O convite mudou. Confira a geração atual antes de reenviar.");
        const after = { organizationId, uid, role, generation: expectedGeneration + 1, status: "pending", issuedBy: actorUid, issuedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(expiresAtMillis), acceptedAt: null, updatedAt: serverTimestamp(), lastOperationId: operationId };
        tx.set(target, after); tx.set(doc(database, "invitationInboxes", uid, "organizations", organizationId), after);
        tx.set(receipt, { organizationId, uid, actorUid, action: "invitation_issued", at: serverTimestamp(), requestHash, reason: reason.trim(), before, after });
        return after.generation;
      });
    } catch (cause) { try { const event = await getDocFromServer(receipt); if (event.exists() && matches(event.data())) return Number(event.data().after.generation); } catch { /* keep original failure */ } throw cause; }
  });
}
export async function closeTeamInvitation(organizationId: string, uid: string, generation: number, status: "revoked" | "expired", reason: string, operationId = quotaOperationId()) {
  return trackWrite(async () => {
    const { database, actorUid } = context(); validate(organizationId, uid, "staff", operationId);
    if (!["revoked", "expired"].includes(status) || !Number.isSafeInteger(generation) || generation < 1 || reason.trim().length < 3 || reason.length > 300) throw new Error("Confira a geração, a situação e o motivo.");
    const requestHash = await importDigest({ organizationId, uid, generation, status, reason: reason.trim() });
    const target = doc(database, "tenantInvitations", organizationId, "users", uid); const receipt = doc(database, "tenantInvitations", organizationId, "events", operationId);
    const matches = (event: DocumentData) => event.actorUid === actorUid && event.uid === uid && event.organizationId === organizationId && event.action === `invitation_${status}` && event.requestHash === requestHash;
    try {
      await runTransaction(database, async (tx) => {
        const event = await tx.get(receipt); if (event.exists()) { if (!matches(event.data())) throw new Error("Operação já utilizada com outros dados."); return; }
        const current = await tx.get(target); const before = current.data();
        if (!before || before.generation !== generation) throw new Error("Convite inexistente ou geração obsoleta.");
        if (before.status === status) return;
        if (before.status !== "pending") throw new Error("Somente convites pendentes podem ser encerrados. Para retirar acesso aceito, revogue o integrante.");
        if (status === "expired" && before.expiresAt.toMillis() > Date.now()) throw new Error("O convite ainda está no prazo de aceite.");
        const after = { ...before, status, updatedAt: serverTimestamp(), lastOperationId: operationId };
        tx.set(target, after); tx.set(doc(database, "invitationInboxes", uid, "organizations", organizationId), after);
        tx.set(receipt, { organizationId, uid, actorUid, action: `invitation_${status}`, at: serverTimestamp(), requestHash, reason: reason.trim(), before, after });
      });
    } catch (cause) { try { const event = await getDocFromServer(receipt); if (event.exists() && matches(event.data())) return; } catch { /* keep original failure */ } throw cause; }
  });
}
export async function acceptTeamInvitation(organizationId: string, uid: string, generation: number, role: TenantRole, operationId = quotaOperationId()) {
  return trackWrite(async () => {
    const { database, actorUid } = context(); validate(organizationId, uid, role, operationId);
    if (actorUid !== uid || !Number.isSafeInteger(generation) || generation < 1) throw new Error("O convite pertence a outro usuário ou geração.");
    const requestHash = await importDigest({ organizationId, uid, generation, role });
    const target = doc(database, "tenantInvitations", organizationId, "users", uid); const receipt = doc(database, "tenantQuotaOperations", operationId);
    const matches = (event: DocumentData) => event.actorUid === actorUid && event.entityId === uid && event.organizationId === organizationId && event.action === "member_accepted" && event.requestHash === requestHash && event.invitationGeneration === generation;
    try {
      return await runTransaction(database, async (tx) => {
        const event = await tx.get(receipt); if (event.exists()) { if (!matches(event.data())) throw new Error("Operação já utilizada com outros dados."); return generation; }
        const invitation = await tx.get(target); const beforeInvitation = invitation.data();
        if (!beforeInvitation || beforeInvitation.generation !== generation || beforeInvitation.role !== role || beforeInvitation.uid !== uid || beforeInvitation.organizationId !== organizationId) throw new Error("Convite inexistente, papel diferente ou geração obsoleta.");
        if (beforeInvitation.status === "accepted") return generation; // historical acknowledgement; never reactivates revoked membership
        if (beforeInvitation.status !== "pending" || beforeInvitation.expiresAt.toMillis() <= Date.now()) throw new Error("O convite está revogado ou expirado. Peça um novo convite.");
        const memberRef = doc(database, "memberships", uid, "organizations", organizationId); const usageRef = doc(database, "tenantUsage", organizationId);
        const [member, usage, policy, availability] = await Promise.all([tx.get(memberRef), tx.get(usageRef), tx.get(doc(database, "tenantEntitlements", organizationId)), tx.get(doc(database, "organizationAvailability", organizationId))]);
        const original = member.data();
        if (original?.status === "active") throw new Error("O acesso já está ativo. O convite não pode substituir um papel existente.");
        if (original && (original.uid !== uid || original.organizationId !== organizationId || original.status !== "revoked" || !["tenant_owner", "staff"].includes(original.role))) throw new Error("O acesso existente precisa de revisão antes do aceite.");
        if (!usage.exists()) throw new Error("O inventário de equipe precisa ser conferido.");
        const before = counters(usage.data()); const after = { ...before, activeMembers: before.activeMembers + 1, activeOwners: before.activeOwners + Number(role === "tenant_owner") };
        const limits = confirmedPolicy(policy);
        if (availability.data()?.status === "suspended") throw new Error("A organização está suspensa para novos integrantes.");
        if (!quotaGrowthAllowed(limits) || after.activeMembers > limits!.limits.internalUsers) throw new Error("O plano está sem vaga na equipe. O convite continua pendente até haver espaço.");
        const accepted = { ...beforeInvitation, status: "accepted", acceptedAt: serverTimestamp(), updatedAt: serverTimestamp(), lastOperationId: operationId };
        tx.set(target, accepted); tx.set(doc(database, "invitationInboxes", uid, "organizations", organizationId), accepted);
        tx.set(memberRef, { ...(original || {}), uid, organizationId, role, status: "active", ...(!original ? { createdAt: serverTimestamp() } : {}), invitationGeneration: generation, updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        tx.set(doc(database, "tenantTeam", organizationId, "members", uid), { uid, organizationId, role, status: "active", updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        tx.update(usageRef, { ...after, updatedAt: serverTimestamp(), lastQuotaOperationId: operationId });
        tx.set(receipt, { organizationId, entityId: uid, kind: "member", action: "member_accepted", actorUid, at: serverTimestamp(), requestHash, reason: "Aceite do convite pelo destinatário", before, after, beforeStatus: original?.status || "absent", afterStatus: "active", beforeRole: original?.role || "", afterRole: role, invitationGeneration: generation });
        return generation;
      });
    } catch (cause) { try { const event = await getDocFromServer(receipt); if (event.exists() && matches(event.data())) return generation; } catch { /* keep original failure */ } throw cause; }
  });
}

export interface TeamHistory { id: string; action: string; uid: string; actorUid: string; at: Timestamp; reason: string; generation: number | null }
export function watchTeamHistory(organizationId: string, callback: (items: TeamHistory[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  let invitations: TeamHistory[] = []; let quota: TeamHistory[] = [];
  const publish = () => callback([...invitations, ...quota].sort((a, b) => (b.at?.toMillis() || 0) - (a.at?.toMillis() || 0)).slice(0, 20));
  const stops = [onSnapshot(query(collection(db, "tenantInvitations", organizationId, "events"), orderBy("at", "desc"), limit(20)), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    invitations = snapshot.docs.map((item) => { const data = item.data(); return { id: item.id, action: data.action, uid: data.uid, actorUid: data.actorUid, at: data.at, reason: data.reason, generation: data.after.generation }; }); publish();
  }, fail), onSnapshot(query(collection(db, "tenantQuotaOperations"), where("organizationId", "==", organizationId), orderBy("at", "desc"), limit(40)), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    quota = snapshot.docs.filter((item) => item.data().kind === "member").map((item) => { const data = item.data(); return { id: item.id, action: data.action, uid: data.entityId, actorUid: data.actorUid, at: data.at, reason: data.reason, generation: data.invitationGeneration || null }; }); publish();
  }, fail)];
  return () => stops.forEach((stop) => stop());
}
