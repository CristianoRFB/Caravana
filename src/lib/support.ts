import { collection, doc, onSnapshot, serverTimestamp, Timestamp, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";

export const SUPPORT_SCOPE = "caravan_configuration_read";
export interface SupportGrant {
  operatorUid: string; organizationId: string; scope: string; purpose: string;
  status: string; consentId: string; expiresAt: Timestamp;
}
export interface SupportSession extends SupportGrant { lastEventId: string; }
export interface SupportAudit { id: string; action: string; actorUid: string; operatorUid: string; }
export const supportOperationId = () => crypto.randomUUID().replaceAll("-", "");
function connection(eventId: string) {
  if (!db || !auth?.currentUser) throw new Error("Sessão não encontrada.");
  if (!/^[a-f0-9]{32}$/.test(eventId)) throw new Error("Operação inválida.");
  return { database: db, actorUid: auth.currentUser.uid };
}
function record(data: DocumentData | undefined): SupportGrant | null {
  return data && data.expiresAt instanceof Timestamp ? data as SupportGrant : null;
}
export function activeSupport(grant: SupportGrant | null, session: SupportSession | null, organizationId: string, now: number): boolean {
  return Boolean(grant && session && grant.status === "active" && session.status === "active"
    && grant.scope === SUPPORT_SCOPE && session.scope === SUPPORT_SCOPE
    && grant.organizationId === organizationId && session.organizationId === organizationId
    && grant.operatorUid === session.operatorUid && grant.consentId === session.consentId
    && grant.expiresAt.toMillis() > now && session.expiresAt.toMillis() > now
    && session.expiresAt.toMillis() <= grant.expiresAt.toMillis());
}
export function watchSupportGrants(orgId: string, callback: (grants: SupportGrant[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "supportGrants", orgId, "operators"), (snapshot) => callback(snapshot.docs.map((item) => record(item.data())).filter((item): item is SupportGrant => item !== null)), fail);
}
export function watchOwnSupport(orgId: string, callback: (grant: SupportGrant | null, session: SupportSession | null) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db || !auth?.currentUser) throw new Error("Sessão não encontrada.");
  const uid = auth.currentUser.uid;
  let grant: SupportGrant | null = null;
  let session: SupportSession | null = null;
  let grantReady = false;
  let sessionReady = false;
  const publish = () => { if (grantReady && sessionReady) callback(grant, session); };
  const stopGrant = onSnapshot(doc(db, "supportGrants", orgId, "operators", uid), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    grant = record(snapshot.data()); grantReady = true; publish();
  }, fail);
  const stopSession = onSnapshot(doc(db, "supportSessions", uid), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    session = record(snapshot.data()) as SupportSession | null; sessionReady = true; publish();
  }, fail);
  return () => { stopGrant(); stopSession(); };
}
export function watchSupportAudit(orgId: string, callback: (events: SupportAudit[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(collection(db, "supportGrants", orgId, "audit"), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, action: String(item.data().action), actorUid: String(item.data().actorUid), operatorUid: String(item.data().operatorUid) }))), fail);
}
export async function grantSupport(orgId: string, operatorUid: string, purpose: string, minutes: number, eventId: string): Promise<void> {
  const { database, actorUid } = connection(eventId);
  if (!operatorUid || operatorUid.length > 128 || operatorUid.includes("/") || [".", ".."].includes(operatorUid) || ![15, 30, 60].includes(minutes) || purpose.trim().length < 3 || purpose.trim().length > 200) throw new Error("Confira operador, motivo e prazo.");
  const grant = doc(database, "supportGrants", orgId, "operators", operatorUid);
  const audit = doc(database, "supportGrants", orgId, "audit", eventId);
  await runTransaction(database, async (transaction) => {
    const previous = await transaction.get(audit);
    if (previous.exists()) {
      if (previous.data().action !== "support_granted" || previous.data().actorUid !== actorUid || previous.data().operatorUid !== operatorUid || previous.data().purpose !== purpose.trim()) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const expiresAt = Timestamp.fromMillis(Date.now() + minutes * 60000);
    transaction.set(grant, { organizationId: orgId, operatorUid, scope: SUPPORT_SCOPE, purpose: purpose.trim(), status: "active", approvedBy: actorUid, grantedAt: serverTimestamp(), expiresAt, consentId: eventId, lastEventId: eventId });
    transaction.set(audit, { organizationId: orgId, operatorUid, actorUid, action: "support_granted", at: serverTimestamp(), consentId: eventId, scope: SUPPORT_SCOPE, expiresAt, purpose: purpose.trim() });
  });
}
export async function revokeSupport(orgId: string, operatorUid: string, eventId: string): Promise<void> {
  const { database, actorUid } = connection(eventId);
  const grant = doc(database, "supportGrants", orgId, "operators", operatorUid);
  const audit = doc(database, "supportGrants", orgId, "audit", eventId);
  await runTransaction(database, async (transaction) => {
    const previous = await transaction.get(audit);
    if (previous.exists()) {
      if (previous.data().action !== "support_revoked" || previous.data().actorUid !== actorUid || previous.data().operatorUid !== operatorUid) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const current = await transaction.get(grant);
    if (!current.exists()) throw new Error("Autorização não encontrada.");
    if (current.data().status === "revoked") return;
    const data = current.data();
    transaction.update(grant, { status: "revoked", lastEventId: eventId });
    transaction.set(audit, { organizationId: orgId, operatorUid, actorUid, action: "support_revoked", at: serverTimestamp(), consentId: data.consentId, scope: data.scope, expiresAt: data.expiresAt, purpose: data.purpose });
  });
}
export async function openSupport(orgId: string, eventId: string): Promise<void> {
  const { database, actorUid } = connection(eventId);
  const audit = doc(database, "supportGrants", orgId, "audit", eventId);
  await runTransaction(database, async (transaction) => {
    const previous = await transaction.get(audit);
    if (previous.exists()) {
      if (previous.data().action !== "support_opened" || previous.data().actorUid !== actorUid) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const grant = await transaction.get(doc(database, "supportGrants", orgId, "operators", actorUid));
    const data = record(grant.data());
    if (!data || data.status !== "active" || data.scope !== SUPPORT_SCOPE || data.expiresAt.toMillis() <= Date.now()) throw new Error("Solicite uma autorização válida à organizadora.");
    transaction.set(doc(database, "supportSessions", actorUid), { organizationId: orgId, operatorUid: actorUid, status: "active", scope: data.scope, purpose: data.purpose, openedAt: serverTimestamp(), expiresAt: data.expiresAt, consentId: data.consentId, lastEventId: eventId });
    transaction.set(audit, { organizationId: orgId, operatorUid: actorUid, actorUid, action: "support_opened", at: serverTimestamp(), consentId: data.consentId, scope: data.scope, expiresAt: data.expiresAt, purpose: data.purpose });
  });
}
export async function closeSupport(orgId: string, eventId: string): Promise<void> {
  const { database, actorUid } = connection(eventId);
  const audit = doc(database, "supportGrants", orgId, "audit", eventId);
  await runTransaction(database, async (transaction) => {
    const previous = await transaction.get(audit);
    if (previous.exists()) {
      if (previous.data().action !== "support_closed" || previous.data().actorUid !== actorUid) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const session = doc(database, "supportSessions", actorUid);
    const current = await transaction.get(session);
    if (!current.exists() || current.data().status === "closed") return;
    const data = current.data();
    if (data.organizationId !== orgId) throw new Error("A sessão atual pertence a outra organizadora.");
    transaction.update(session, { status: "closed", lastEventId: eventId });
    transaction.set(audit, { organizationId: orgId, operatorUid: actorUid, actorUid, action: "support_closed", at: serverTimestamp(), consentId: data.consentId, scope: data.scope, expiresAt: data.expiresAt, purpose: data.purpose });
  });
}
