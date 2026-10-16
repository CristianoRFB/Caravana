import { doc, getDocFromServer, serverTimestamp, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { importDigest } from "./import-identity";
import type { ExpenseCategory, PaymentMethod, Registration } from "./types";

export interface PassengerPaymentInput { amountCents: number; method: PaymentMethod; paymentDate?: string; notes: string }
export interface CaravanExpenseInput { description: string; category: ExpenseCategory; amountCents: number; date: string; notes: string }
export const financialOperationId = () => crypto.randomUUID().replaceAll("-", "");
const methods = ["pix", "transfer", "cash", "card", "other"];
const categories = ["transporte", "alimentacao", "pedagio", "estacionamento", "outros"];
export const validFinancialDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(0, 4)) >= 1900 && Number(date.slice(0, 4)) <= 2200 && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
function cents(value: unknown): asserts value is number { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error("Valor financeiro inconsistente; confira o histórico."); }
function positive(value: number) { cents(value); if (value === 0) throw new Error("Informe um valor positivo em centavos."); }
function reasonText(reason: string) { const text = reason.trim(); if (text.length < 3 || text.length > 300) throw new Error("Explique a correção em 3 a 300 caracteres."); return text; }
class FinancialConflict extends Error {}
type Action = "payment_recorded" | "payment_voided" | "expense_recorded" | "expense_voided" | "expense_corrected" | "fare_adjusted";
type FinancialInput = PassengerPaymentInput | CaravanExpenseInput | { amountCents: number } | null;
function operate(action: Action, registrationId: string, caravanId: string, organizationId: string, sourceId: string, input: FinancialInput, reason: string, operationId: string) {
  return trackWrite(() => perform(action, registrationId, caravanId, organizationId, sourceId, input, reason, operationId));
}
async function perform(action: Action, registrationId: string, caravanId: string, organizationId: string, sourceId: string, input: FinancialInput, reason: string, operationId: string) {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Sem conexão. Nenhum lançamento foi confirmado.");
  if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Identificador de operação inválido.");
  const database = db; const actorUid = auth.currentUser.uid;
  const audit = doc(database, "financialOperations", operationId);
  const payloadHash = await importDigest({ action, registrationId, caravanId, organizationId, sourceId, input, reason });
  const matches = (data: DocumentData) => data.actorUid === actorUid && data.payloadHash === payloadHash && data.action === action;
  try {
    await runTransaction(database, async (tx) => {
      const previous = await tx.get(audit);
      if (previous.exists()) { if (!matches(previous.data())) throw new FinancialConflict("Operação já utilizada com outros dados. Confira o histórico antes de iniciar outro lançamento."); return; }
      const payment = action.startsWith("payment_");
      const registrationAction = payment || action === "fare_adjusted";
      const parentRef = registrationAction ? doc(database, "registrations", registrationId) : doc(database, "caravans", caravanId);
      const parentSnapshot = await tx.get(parentRef);
      if (!parentSnapshot.exists()) throw new Error("Cadastro não encontrado.");
      const parent = parentSnapshot.data();
      const orgId = parent.organizationId; const tripId = registrationAction ? parent.caravanId : caravanId;
      if ((organizationId && organizationId !== orgId) || (caravanId && caravanId !== tripId)) throw new Error("O cadastro pertence a outro contexto.");
      if (action === "fare_adjusted") {
        const beforeCents = parent.amountCents ?? 0; const afterCents = input!.amountCents; const paid = parent.paymentTotalCents ?? 0;
        cents(beforeCents); cents(afterCents); cents(paid);
        if (afterCents > 0 && afterCents < paid) throw new Error("O valor previsto não pode ser menor que o recebimento registrado.");
        if (beforeCents === afterCents) return;
        tx.update(parentRef, { amountCents: afterCents, updatedAt: serverTimestamp(), lastFinancialOperationId: operationId });
        tx.set(audit, { action, organizationId: orgId, caravanId: tripId, registrationId, entityId: registrationId, sourceId: "", actorUid, at: serverTimestamp(), payloadHash, reason, beforeCents, afterCents });
        return;
      }
      const path = payment ? `registrations/${registrationId}/payments` : `caravans/${tripId}/expenses`;
      const isVoid = action.endsWith("voided"); const correction = action === "expense_corrected";
      const entityId = isVoid ? sourceId : operationId;
      const targetRef = doc(database, path, entityId);
      const oldRef = sourceId ? doc(database, path, sourceId) : null;
      const oldSnapshot = oldRef ? await tx.get(oldRef) : null;
      if (oldRef && !oldSnapshot?.exists()) throw new Error("Lançamento original não encontrado.");
      const old = oldSnapshot?.data();
      if (old && (old.organizationId !== orgId || old.caravanId !== tripId || (payment && old.registrationId !== registrationId))) throw new Error("Lançamento original pertence a outro contexto.");
      if (old?.status === "voided") {
        // State-idempotent cancellation never subtracts twice; correction of a voided entry needs a new explicit entry.
        if (isVoid) return;
        throw new Error("Despesa já anulada; confira a substituição no histórico.");
      }
      if (old) positive(old.amountCents);
      const beforeCents = payment ? parent.paymentTotalCents ?? 0 : old?.amountCents ?? 0;
      cents(beforeCents);
      const amount = input?.amountCents ?? old?.amountCents;
      positive(amount);
      const afterCents = payment ? beforeCents + (isVoid ? -amount : amount) : isVoid ? 0 : amount;
      cents(afterCents);
      if (payment && !isVoid) {
        if (parent.registrationStatus === "cancelled") throw new Error("Não é possível registrar pagamento para uma inscrição cancelada.");
        if (Number.isSafeInteger(parent.amountCents) && parent.amountCents > 0 && afterCents > parent.amountCents) throw new Error("O pagamento ultrapassa o saldo conhecido da inscrição.");
      }
      const event = { action, organizationId: orgId, caravanId: tripId, registrationId, entityId, sourceId, actorUid, at: serverTimestamp(), payloadHash, reason, beforeCents, afterCents };
      if (isVoid || correction) tx.update(oldRef!, { status: "voided", voidReason: reason, voidedAt: serverTimestamp(), voidedBy: actorUid, lastFinancialOperationId: operationId, ...(correction ? { replacementId: entityId } : {}) });
      if (!isVoid) tx.set(targetRef, { ...input, id: entityId, organizationId: orgId, caravanId: tripId, ...(payment ? { registrationId } : {}), status: "active", createdAt: new Date().toISOString(), createdBy: actorUid, postedAt: serverTimestamp(), lastFinancialOperationId: operationId, ...(correction ? { replacesId: sourceId } : {}) });
      if (payment) tx.update(parentRef, { paymentTotalCents: afterCents, updatedAt: serverTimestamp(), lastFinancialOperationId: operationId });
      tx.set(audit, event);
    });
  } catch (cause) {
    if (cause instanceof FinancialConflict) throw cause;
    try { const committed = await getDocFromServer(audit); if (committed.exists() && matches(committed.data())) return; } catch { /* preserve original failure */ }
    throw cause;
  }
}
export function recordPassengerPayment(reg: Registration, input: PassengerPaymentInput, operationId = financialOperationId()) {
  positive(input.amountCents);
  if (!methods.includes(input.method) || input.notes.length > 500 || (input.paymentDate && !validFinancialDate(input.paymentDate))) throw new Error("Revise método, data e observação do pagamento.");
  return operate("payment_recorded", reg.id, reg.caravanId, reg.organizationId, "", { ...input, notes: input.notes.trim() }, "", operationId);
}
export function voidPassengerPayment(registrationId: string, paymentId: string, reason: string, operationId = financialOperationId()) {
  return operate("payment_voided", registrationId, "", "", paymentId, null, reasonText(reason), operationId);
}
function expenseInput(input: CaravanExpenseInput) {
  positive(input.amountCents);
  if (input.description.trim().length < 3 || input.description.length > 120 || input.notes.length > 500 || !categories.includes(input.category) || !validFinancialDate(input.date)) throw new Error("Revise descrição, categoria, data e observação da despesa.");
  return { ...input, description: input.description.trim(), notes: input.notes.trim() };
}
export function createCaravanExpense(caravanId: string, organizationId: string, input: CaravanExpenseInput, operationId = financialOperationId()) { return operate("expense_recorded", "", caravanId, organizationId, "", expenseInput(input), "", operationId); }
export function updateCaravanExpense(caravanId: string, expenseId: string, input: CaravanExpenseInput, reason: string, operationId = financialOperationId()) { return operate("expense_corrected", "", caravanId, "", expenseId, expenseInput(input), reasonText(reason), operationId); }
export function voidCaravanExpense(caravanId: string, expenseId: string, reason: string, operationId = financialOperationId()) { return operate("expense_voided", "", caravanId, "", expenseId, null, reasonText(reason), operationId); }
export function adjustRegistrationFare(registration: Registration, amountCents: number, reason: string, operationId = financialOperationId()) {
  cents(amountCents);
  return operate("fare_adjusted", registration.id, registration.caravanId, registration.organizationId, "", { amountCents }, reasonText(reason), operationId);
}
