import { doc, getDocFromServer, serverTimestamp, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import type { Registration } from "./types";

export type RegistrationAction = "review_approved" | "review_rejected" | "cancelled" | "checked_in" | "checkin_reversed";
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
      if (action === "cancelled") {
        if (current.registrationStatus === "cancelled") return;
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
        seatDelta: action === "cancelled" ? -1 : 0 });
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
