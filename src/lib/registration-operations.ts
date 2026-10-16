import { doc, getDocFromServer, serverTimestamp, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { ageOnDate, type Registration } from "./types";

export type RegistrationAction = "review_approved" | "review_rejected" | "cancelled" | "import_rolled_back" | "checked_in" | "checkin_reversed";
export const registrationOperationId = () => crypto.randomUUID().replaceAll("-", "");
const activeStates = ["awaiting_payment", "awaiting_review", "confirmed", "rejected"];
class OperationConflict extends Error {}
async function operate(reg: Registration, action: RegistrationAction, reason: string, operationId: string) {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Sem conexão. Nenhuma operação foi confirmada.");
  if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Identificador de operação inválido.");
  const note = reason.trim();
  if (note.length > 300 || (action === "review_rejected" && note.length < 3)) throw new Error("Informe o motivo em 3 a 300 caracteres.");
  const database = db; const actorUid = auth.currentUser.uid;
  const ref = doc(database, "registrations", reg.id);
  const audit = doc(database, "registrationOperations", operationId);
  const matches = (event: DocumentData) => event.registrationId === reg.id && event.organizationId === reg.organizationId
    && event.caravanId === reg.caravanId && event.action === action && event.actorUid === actorUid && event.reason === note;
  try {
    await runTransaction(database, async (tx) => {
      const previous = await tx.get(audit);
      if (previous.exists()) {
        if (!matches(previous.data())) throw new OperationConflict("Operação já utilizada com outros dados.");
        return;
      }
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) throw new Error("Inscrição não encontrada.");
      const current = snapshot.data();
      if (current.organizationId !== reg.organizationId || current.caravanId !== reg.caravanId) throw new Error("A inscrição pertence a outro contexto.");
      const checkedBefore = Boolean(current.checkedInAt);
      let registrationStatus = current.registrationStatus;
      let paymentStatus = current.paymentStatus;
      let checkedAfter = checkedBefore;
      let patch: DocumentData = {};
      if (action === "cancelled" || action === "import_rolled_back") {
        if (current.registrationStatus === "cancelled") return;
        if (action === "import_rolled_back") {
          if (!current.importOperationId || (current.paymentTotalCents || 0) > 0 || current.proofId || checkedBefore) throw new Error("Rollback bloqueado: existe movimentação ou revisão posterior; use a operação específica.");
          const original = await tx.get(doc(database, "importOperations", current.importOperationId));
          if (!original.exists() || JSON.stringify(current) !== JSON.stringify(original.data().rows?.[reg.id])) {
            // Firestore field order is not a business invariant; compare keyed values below.
            const data = original.data()?.rows?.[reg.id];
            if (!data || Object.keys(current).length !== Object.keys(data).length || Object.keys(current).some((key) => JSON.stringify(current[key]) !== JSON.stringify(data[key]))) throw new Error("Rollback bloqueado: cadastro foi alterado após a importação.");
          }
        }
        if (!activeStates.includes(current.registrationStatus)) throw new Error("Estado da inscrição requer revisão da organização.");
        const caravanRef = doc(database, "caravans", current.caravanId);
        const trip = await tx.get(caravanRef);
        if (!trip.exists() || trip.data().organizationId !== current.organizationId) throw new Error("Caravana não encontrada neste contexto.");
        const seats = trip.data().reservedSeats;
        if (!Number.isSafeInteger(seats) || seats < 1) throw new Error("Contagem de vagas inconsistente. Nenhum dado foi alterado.");
        tx.update(caravanRef, { reservedSeats: seats - 1, lastSeatOperationId: operationId, updatedAt: serverTimestamp() });
        registrationStatus = "cancelled"; checkedAfter = false;
        patch = { registrationStatus, cancelledBy: actorUid, cancelledAt: serverTimestamp(), checkedInAt: null, checkedInBy: null };
      } else if (action === "checked_in" || action === "checkin_reversed") {
        checkedAfter = action === "checked_in";
        if (checkedAfter === checkedBefore) return;
        if (checkedAfter && (current.registrationStatus !== "confirmed" || (current.isMinor === true && current.authorizationStatus !== "approved"))) throw new Error("Confirme a inscrição e a autorização do menor antes do embarque.");
        if (checkedAfter) {
          const trip = await tx.get(doc(database, "caravans", current.caravanId));
          if (!trip.exists() || trip.data().organizationId !== current.organizationId) throw new Error("Caravana não encontrada neste contexto.");
          const age = current.birthDate && trip.data().date ? ageOnDate(current.birthDate, trip.data().date) : null;
          if (trip.data().requiresMinorAuthorization && age === null) throw new Error("Idade não verificada. Confira nascimento e data da viagem antes do embarque.");
          const needsAuthorization = current.isMinor === true || (trip.data().requiresMinorAuthorization && age !== null && age < 18);
          if (needsAuthorization && current.authorizationStatus !== "approved") throw new Error("Confirme a autorização do responsável antes do embarque.");
          if (needsAuthorization && current.authorizationId === "current") {
            const file = await tx.get(doc(database, "registrations", reg.id, "authorizations", "current"));
            if (!file.exists() || !Number.isInteger(file.data().retentionDays) || Date.now() >= file.data().uploadedAt.toMillis() + file.data().retentionDays * 86400000) throw new Error("Autorização indisponível ou com prazo encerrado; solicite nova conferência.");
          }
        }
        patch = { checkedInAt: checkedAfter ? serverTimestamp() : null, checkedInBy: checkedAfter ? actorUid : null };
      } else {
        if (current.registrationStatus === "cancelled") throw new Error("Inscrição cancelada não pode ser reaberta por uma revisão.");
        registrationStatus = action === "review_approved" ? "confirmed" : "rejected";
        paymentStatus = action === "review_approved" ? "approved" : "rejected";
        if (current.registrationStatus === registrationStatus && current.paymentStatus === paymentStatus) return;
        if (!activeStates.includes(current.registrationStatus) || (checkedBefore && action === "review_rejected")) throw new Error("Desfaça o check-in antes de recusar esta inscrição.");
        patch = action === "review_approved"
          ? { registrationStatus, paymentStatus, approvedBy: actorUid, approvedAt: serverTimestamp() }
          : { registrationStatus, paymentStatus, rejectedBy: actorUid, rejectedAt: serverTimestamp(), rejectionReason: note };
      }
      tx.update(ref, { ...patch, lastOperationalId: operationId });
      tx.set(audit, { registrationId: reg.id, organizationId: current.organizationId, caravanId: current.caravanId, actorUid,
        action, at: serverTimestamp(), reason: note, beforeStatus: current.registrationStatus, afterStatus: registrationStatus,
        beforePaymentStatus: current.paymentStatus, afterPaymentStatus: paymentStatus, checkedBefore, checkedAfter,
        seatDelta: action === "cancelled" || action === "import_rolled_back" ? -1 : 0 });
    });
  } catch (cause) {
    if (cause instanceof OperationConflict) throw cause;
    // Never use a cached passenger record as proof that a privileged operation committed.
    try { const committed = await getDocFromServer(audit); if (committed.exists() && matches(committed.data())) return; } catch { /* original error remains */ }
    throw cause;
  }
}
export const reviewPayment = (reg: Registration, approve: boolean, reason = "", operationId = registrationOperationId()) => operate(reg, approve ? "review_approved" : "review_rejected", reason, operationId);
export const toggleCheckin = (reg: Registration, checked: boolean, operationId = registrationOperationId()) => operate(reg, checked ? "checked_in" : "checkin_reversed", "", operationId);
export const cancelRegistration = (reg: Registration, operationId = registrationOperationId()) => operate(reg, "cancelled", "", operationId);
export const rollbackImportedRegistration = (reg: Registration, reason: string, operationId = registrationOperationId()) => operate(reg, "import_rolled_back", reason, operationId);
