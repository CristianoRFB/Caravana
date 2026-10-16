import type { CaravanExpense, PassengerPayment, Registration } from "./types";
import { calculateFinanceSummary, type FinanceSummary } from "./finance";

export interface FinancialDiagnostic { registrationId: string; kind: "unitemized_total" | "ledger_exceeds_total" | "invalid_amount" | "foreign_entry"; differenceCents: number | null }
// Read-only evidence: a missing legacy ledger is a discrepancy to investigate, never permission to invent a receipt.
export function diagnoseFinancialLedger(registrations: Registration[], payments: PassengerPayment[]): FinancialDiagnostic[] {
  const issues: FinancialDiagnostic[] = [];
  const parents = new Map(registrations.map((reg) => [reg.id, reg]));
  for (const payment of payments) {
    const reg = parents.get(payment.registrationId);
    if (!reg || payment.organizationId !== reg.organizationId || payment.caravanId !== reg.caravanId) issues.push({ registrationId: payment.registrationId, kind: "foreign_entry", differenceCents: null });
  }
  for (const reg of registrations) {
    const entries = payments.filter((entry) => entry.registrationId === reg.id && entry.organizationId === reg.organizationId && entry.caravanId === reg.caravanId && entry.status === "active");
    const total = reg.paymentTotalCents ?? 0;
    if (!Number.isSafeInteger(total) || total < 0 || entries.some((entry) => !Number.isSafeInteger(entry.amountCents) || entry.amountCents <= 0)) {
      issues.push({ registrationId: reg.id, kind: "invalid_amount", differenceCents: null }); continue;
    }
    const ledger = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
    if (!Number.isSafeInteger(ledger)) { issues.push({ registrationId: reg.id, kind: "invalid_amount", differenceCents: null }); continue; }
    if (total !== ledger) issues.push({ registrationId: reg.id, kind: total > ledger ? "unitemized_total" : "ledger_exceeds_total", differenceCents: total - ledger });
  }
  return issues;
}
export function redactedFinanceCsv(registrations: Registration[], expenses: CaravanExpense[]): string {
  const summary = calculateFinanceSummary(registrations, expenses);
  // Fixed keys and numeric cells only: no passenger, document, contact, bearer URL, tenant or caravan identifier.
  return "metric,value\r\n" + (Object.entries(summary) as [keyof FinanceSummary, number][]).map(([key, value]) => `${key},${Number.isSafeInteger(value) ? value : "INVALID"}`).join("\r\n") + "\r\n";
}
