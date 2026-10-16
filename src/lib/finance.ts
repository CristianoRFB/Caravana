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
function sumSafeCents(values: number[]): number {
  let total = 0;
  for (const value of values) { if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(total + value)) return NaN; total += value; }
  return total;
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
  const expectedCents = sumSafeCents(expectedRows.map((item) => item.amountCents!));
  const receivableCents = sumSafeCents(active.map((item) => {
    if (
      !Number.isSafeInteger(item.amountCents) ||
      (item.amountCents || 0) <= 0 ||
      (item.paymentReportedUnreconciled && (item.paymentTotalCents || 0) === 0)
    ) {
      return 0;
    }
    const paid = item.paymentTotalCents ?? 0;
    return Number.isSafeInteger(paid) && paid >= 0 ? Math.max(0, item.amountCents! - paid) : NaN;
  }));
  const receivedCents = sumSafeCents(registrations.map((item) => item.paymentTotalCents ?? 0));
  const expenseCents = sumSafeCents(expenses.filter((item) => item.status !== "voided").map((item) => item.amountCents ?? 0));

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
  const [whole, fraction = ""] = trimmed.replace(",", ".").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return cents > 0n && cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
export function moneyInputValue(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) return "";
  const value = BigInt(cents);
  return `${value / 100n},${String(value % 100n).padStart(2, "0")}`;
}
