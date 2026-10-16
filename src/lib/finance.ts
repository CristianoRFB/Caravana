import type { CaravanExpense, Registration } from "./types";

export type PassengerFinancialStatus =
  | "pending"
  | "partial"
  | "paid"
  | "reported"
  | "unknown";

export interface FinanceSummary {
  passengerCount: number;
  paidPassengerCount: number;
  partialPassengerCount: number;
  pendingPassengerCount: number;
  reportedPassengerCount: number;
  unknownFareCount: number;
  expectedCents: number;
  receivedCents: number;
  receivableCents: number;
  uncertainReceivableCount: number;
  expenseCents: number;
  recordedBalanceCents: number;
  projectedResultCents: number;
}

export function passengerFinancialStatus(
  registration: Pick<
    Registration,
    "amountCents" | "paymentTotalCents" | "paymentReportedUnreconciled"
  >,
): PassengerFinancialStatus {
  const paid = Number.isSafeInteger(registration.paymentTotalCents)
    ? Math.max(0, registration.paymentTotalCents || 0)
    : 0;
  if (registration.paymentReportedUnreconciled && paid === 0) return "reported";

  const due = registration.amountCents;
  if (!Number.isSafeInteger(due) || (due || 0) <= 0) return "unknown";
  if (paid <= 0) return "pending";
  if (paid < due!) return "partial";
  return "paid";
}

export function calculateFinanceSummary(
  registrations: Registration[],
  expenses: CaravanExpense[],
): FinanceSummary {
  const active = registrations.filter((item) => item.registrationStatus !== "cancelled");
  const statuses = active.map(passengerFinancialStatus);
  const expectedRows = active.filter(
    (item) => Number.isSafeInteger(item.amountCents) && (item.amountCents || 0) > 0,
  );
  const uncertain = active.filter(
    (item) =>
      item.paymentReportedUnreconciled &&
      (item.paymentTotalCents || 0) === 0,
  );
  const expectedCents = expectedRows.reduce(
    (total, item) => total + (item.amountCents || 0),
    0,
  );
  const receivableCents = active.reduce((total, item) => {
    if (
      !Number.isSafeInteger(item.amountCents) ||
      (item.amountCents || 0) <= 0 ||
      (item.paymentReportedUnreconciled && (item.paymentTotalCents || 0) === 0)
    ) {
      return total;
    }
    return total + Math.max(0, item.amountCents! - (item.paymentTotalCents || 0));
  }, 0);
  const receivedCents = registrations.reduce(
    (total, item) => total + Math.max(0, item.paymentTotalCents || 0),
    0,
  );
  const expenseCents = expenses.reduce(
    (total, item) => total + Math.max(0, item.amountCents || 0),
    0,
  );

  return {
    passengerCount: active.length,
    paidPassengerCount: statuses.filter((status) => status === "paid").length,
    partialPassengerCount: statuses.filter((status) => status === "partial").length,
    pendingPassengerCount: statuses.filter((status) => status === "pending").length,
    reportedPassengerCount: statuses.filter((status) => status === "reported").length,
    unknownFareCount: active.filter(
      (item) => !Number.isSafeInteger(item.amountCents) || (item.amountCents || 0) <= 0,
    ).length,
    expectedCents,
    receivedCents,
    receivableCents,
    uncertainReceivableCount: uncertain.length,
    expenseCents,
    recordedBalanceCents: receivedCents - expenseCents,
    projectedResultCents: expectedCents - expenseCents,
  };
}

export function validMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !/^\d+(?:[,.]\d{1,2})?$/.test(trimmed)) return null;
  const amount = Number(trimmed.replace(",", "."));
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
