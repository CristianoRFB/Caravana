import { collection, deleteField, doc, getDocFromServer, getDocsFromServer, query, serverTimestamp, where, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction, writeBatch } from "./tracked-firestore";
import { validateProofFile } from "./proof-policy";
import { DEFAULT_DOCUMENT_DAYS, DOCUMENT_CONSENT_VERSION, documentDays, planDocumentRetention, type DocumentPolicy, type PrivateDocumentKind } from "./document-policy";
import type { AuthorizationStatus, Registration } from "./types";
export async function getDocumentPolicy(organizationId: string): Promise<DocumentPolicy> {
  if (!db) throw new Error("Firebase não está configurado.");
  const snapshot = await getDocFromServer(doc(db, "documentPolicies", organizationId));
  return { proofDays: documentDays(snapshot.data()?.proofDays ?? DEFAULT_DOCUMENT_DAYS), authorizationDays: documentDays(snapshot.data()?.authorizationDays ?? DEFAULT_DOCUMENT_DAYS) };
}
export async function saveDocumentPolicy(organizationId: string, input: DocumentPolicy, operationId: string) {
  if (!db || !auth?.currentUser || !/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Sessão ou operação inválida.");
  const database = db; const actorUid = auth.currentUser.uid;
  const policy = { proofDays: documentDays(input.proofDays), authorizationDays: documentDays(input.authorizationDays) };
  await runTransaction(database, async (tx) => {
    const ref = doc(database, "documentEvents", operationId); const previous = await tx.get(ref);
    if (previous.exists()) {
      if (previous.data().action !== "policy_updated" || previous.data().organizationId !== organizationId || previous.data().actorUid !== actorUid || previous.data().proofDays !== policy.proofDays || previous.data().authorizationDays !== policy.authorizationDays) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    tx.set(doc(database, "documentPolicies", organizationId), { ...policy, organizationId, consentVersion: DOCUMENT_CONSENT_VERSION, updatedAt: serverTimestamp(), lastDocumentOperationId: operationId });
    tx.set(ref, { action: "policy_updated", organizationId, actorUid, at: serverTimestamp(), ...policy });
  });
}
export async function uploadMinorAuthorization(registration: Registration, file: File, consent: boolean, expectedDays?: number) {
  if (!db || !consent) throw new Error("Confirme a autorização para tratar este documento nesta viagem.");
  if (file.type !== "application/pdf") throw new Error("Envie a autorização em PDF.");
  const bytes = await validateProofFile(file); const policy = await getDocumentPolicy(registration.organizationId);
  if (expectedDays !== undefined && expectedDays !== policy.authorizationDays) throw new Error("O prazo foi atualizado. Confira a nova informação e confirme o consentimento novamente.");
  let binary = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  const batch = writeBatch(db);
  batch.set(doc(db, "registrations", registration.id, "authorizations", "current"), { registrationId: registration.id, organizationId: registration.organizationId, caravanId: registration.caravanId, contentType: "application/pdf", fileName: file.name.normalize("NFKC").replace(/[^\w.-]/g, "_").slice(0, 100) || "autorizacao.pdf", content: btoa(binary), uploadedAt: serverTimestamp(), consentedAt: serverTimestamp(), consentVersion: DOCUMENT_CONSENT_VERSION, retentionDays: policy.authorizationDays });
  batch.update(doc(db, "registrations", registration.id), { authorizationId: "current", authorizationStatus: "pending", authorizationUploadedAt: serverTimestamp(), authorizationRetentionDays: policy.authorizationDays });
  await batch.commit();
}
export async function loadMinorAuthorization(registrationId: string): Promise<Blob> {
  if (!db) throw new Error("Firebase não está configurado.");
  const file = await getDocFromServer(doc(db, "registrations", registrationId, "authorizations", "current"));
  if (!file.exists()) throw new Error("Autorização não encontrada.");
  return new Blob([Uint8Array.from(atob(file.data().content), (character) => character.charCodeAt(0))], { type: "application/pdf" });
}
export async function reviewAuthorization(registration: Registration, status: AuthorizationStatus, operationId = crypto.randomUUID().replaceAll("-", "")) {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  const database = db; const actorUid = auth.currentUser.uid;
  await runTransaction(database, async (tx) => {
    const audit = doc(database, "documentEvents", operationId); const previous = await tx.get(audit);
    if (previous.exists()) {
      if (previous.data().action !== "authorization_reviewed" || previous.data().registrationId !== registration.id || previous.data().status !== status || previous.data().actorUid !== actorUid) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    const ref = doc(database, "registrations", registration.id); const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== registration.organizationId) throw new Error("Inscrição não encontrada neste contexto.");
    const current = snapshot.data();
    if (current.authorizationStatus === status) return;
    if (current.checkedInAt && status !== "approved") throw new Error("Desfaça o embarque antes de retirar a aprovação da autorização.");
    if (current.registrationStatus === "cancelled") throw new Error("Inscrição cancelada.");
    const method = current.authorizationId === "current" ? "pdf" : "paper";
    if (method === "pdf" && status === "approved") {
      const file = await tx.get(doc(database, "registrations", registration.id, "authorizations", "current"));
      if (!file.exists() || Date.now() >= file.data().uploadedAt.toMillis() + file.data().retentionDays * 86400000) throw new Error("Documento indisponível ou prazo encerrado; solicite novo envio ou confira o documento apresentado em papel após a exclusão controlada.");
    }
    tx.update(ref, { authorizationStatus: status, authorizationUpdatedAt: serverTimestamp(), lastDocumentOperationId: operationId });
    tx.set(audit, { action: "authorization_reviewed", registrationId: registration.id, organizationId: current.organizationId, caravanId: current.caravanId, actorUid, at: serverTimestamp(), status, previousStatus: current.authorizationStatus || "not_sent", method });
  });
}
export async function inspectDocumentRetention(organizationId: string) {
  if (!db) throw new Error("Firebase não está configurado.");
  const rows = await getDocsFromServer(query(collection(db, "registrations"), where("organizationId", "==", organizationId)));
  return planDocumentRetention(rows.docs.map((item) => ({ ...item.data(), id: item.id })), Date.now());
}
export async function updatePassengerWithAuthorizationReset(registration: Registration, patch: Partial<Registration>) {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  const database = db; const actorUid = auth.currentUser.uid; const operationId = crypto.randomUUID().replaceAll("-", "");
  await runTransaction(database, async (tx) => {
    const ref = doc(database, "registrations", registration.id); const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== registration.organizationId) throw new Error("Inscrição não encontrada neste contexto.");
    const current = snapshot.data();
    const sensitive = ["birthDate", "guardianName", "guardianPhone", "isMinor"].some((field) => Object.hasOwn(patch, field) && (patch as DocumentData)[field] !== current[field]);
    if (Object.hasOwn(patch, "boardingPointId") || Object.hasOwn(patch, "boardingPointName")) {
      const trip = await tx.get(doc(database, "caravans", current.caravanId));
      const point = (trip.data()?.boardingPoints || []).find((item: { id: string }) => item.id === (patch.boardingPointId ?? current.boardingPointId));
      if (!trip.exists() || trip.data().organizationId !== current.organizationId || !point) throw new Error("Ponto de embarque indisponível. Atualize a caravana antes de salvar.");
      patch = { ...patch, boardingPointId: point.id, boardingPointName: point.name, boardingPointSnapshot: point };
    }
    const statusChanged = patch.authorizationStatus !== undefined && patch.authorizationStatus !== current.authorizationStatus;
    if (!sensitive && !statusChanged) { tx.update(ref, { ...patch, updatedAt: serverTimestamp() }); return; }
    if (current.checkedInAt) throw new Error("Desfaça o embarque antes de alterar os dados da autorização.");
    const status = patch.isMinor === true ? "not_sent" : "not_required";
    tx.update(ref, { ...patch, authorizationStatus: status, authorizationUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp(), lastDocumentOperationId: operationId });
    tx.set(doc(database, "documentEvents", operationId), { action: "authorization_reviewed", registrationId: registration.id, organizationId: current.organizationId, caravanId: current.caravanId, actorUid, at: serverTimestamp(), status, previousStatus: current.authorizationStatus || "not_sent", method: "profile" });
  });
}
export async function purgeExpiredDocument(registrationId: string, kind: PrivateDocumentKind, operationId = crypto.randomUUID().replaceAll("-", "")) {
  if (!db || !auth?.currentUser || !["proofs", "authorizations"].includes(kind)) throw new Error("Sessão ou documento inválido.");
  const database = db; const actorUid = auth.currentUser.uid;
  await runTransaction(database, async (tx) => {
    const audit = doc(database, "documentEvents", operationId); const old = await tx.get(audit);
    if (old.exists()) { if (old.data().action !== "file_expired" || old.data().registrationId !== registrationId || old.data().kind !== kind || old.data().actorUid !== actorUid) throw new Error("Operação já utilizada com outros dados."); return; }
    const ref = doc(database, "registrations", registrationId); const fileRef = doc(database, "registrations", registrationId, kind, "current");
    const [registration, file] = await Promise.all([tx.get(ref), tx.get(fileRef)]);
    if (!registration.exists() || !file.exists()) throw new Error("Documento não encontrado; nenhum cadastro foi substituído.");
    const data = file.data(); const current = registration.data();
    if (!Number.isInteger(data.retentionDays) || !data.uploadedAt?.toMillis || Date.now() < data.uploadedAt.toMillis() + data.retentionDays * 86400000) throw new Error("Prazo não encerrado ou arquivo legado sem política; exclusão automática bloqueada.");
    if (kind === "authorizations" && current.checkedInAt) throw new Error("Desfaça o embarque antes de excluir a autorização.");
    const patch: DocumentData = kind === "proofs" ? { proofId: deleteField(), proofRetentionDays: deleteField(), proofExpiredAt: serverTimestamp() } : { authorizationId: deleteField(), authorizationRetentionDays: deleteField(), authorizationStatus: "not_sent", authorizationExpiredAt: serverTimestamp() };
    tx.delete(fileRef); tx.update(ref, { ...patch, lastDocumentOperationId: operationId });
    tx.set(audit, { action: "file_expired", registrationId, organizationId: current.organizationId, caravanId: current.caravanId, kind, actorUid, at: serverTimestamp(), retentionDays: data.retentionDays, uploadedAt: data.uploadedAt });
  });
}
