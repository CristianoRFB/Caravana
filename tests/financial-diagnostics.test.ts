import { describe, expect, it } from "vitest";
import { diagnoseFinancialLedger, redactedFinanceCsv } from "../src/lib/financial-diagnostics";
import { calculateFinanceSummary } from "../src/lib/finance";
import type { Registration, PassengerPayment, CaravanExpense } from "../src/lib/types";
const reg = { id: "BEARER_SECRET", organizationId: "a", caravanId: "trip", passengerName: "=PRIVATE_NAME", cpf: "PRIVATE_DOC", phone: "PRIVATE_PHONE", registrationStatus: "confirmed", paymentTotalCents: 3000, amountCents: 8500 } as Registration;
const entry = { registrationId: reg.id, organizationId: "a", caravanId: "trip", amountCents: 2500, status: "active" } as PassengerPayment;
describe("read-only finance diagnostics and redacted export", () => {
  it("identifies unitemized legacy total without synthesizing money or changing source", () => {
    const source = JSON.stringify(reg); const findings = diagnoseFinancialLedger([reg], [entry]);
    expect(findings).toEqual([{ registrationId: reg.id, kind: "unitemized_total", differenceCents: 500 }]); expect(JSON.stringify(reg)).toBe(source);
    expect(diagnoseFinancialLedger([reg], [])).toEqual([{ registrationId: reg.id, kind: "unitemized_total", differenceCents: 3000 }]);
  });
  it("detects negative discrepancies, unsafe values, and foreign ledger records", () => {
    expect(diagnoseFinancialLedger([{ ...reg, paymentTotalCents: 1000 }], [entry])[0].kind).toBe("ledger_exceeds_total");
    expect(diagnoseFinancialLedger([{ ...reg, paymentTotalCents: -1 }], [entry])[0].kind).toBe("invalid_amount");
    expect(diagnoseFinancialLedger([reg], [{ ...entry, organizationId: "b" }])[0].kind).toBe("foreign_entry");
    expect(diagnoseFinancialLedger([{ ...reg, paymentTotalCents: undefined }], [])).toEqual([{ registrationId: reg.id, kind: "unknown_total", differenceCents: null }]);
    expect(redactedFinanceCsv([{ ...reg, paymentTotalCents: null }], [])).toContain("receivedCents,UNKNOWN");
  });
  it("exports only fixed metrics, excludes voided expenses, preserves cancelled receipts and zero data", () => {
    const expenses = [{ amountCents: 500 }, { amountCents: 1000, status: "voided" }] as CaravanExpense[];
    const csv = redactedFinanceCsv([reg], expenses);
    expect(csv).toContain("receivedCents,3000"); expect(csv).toContain("expenseCents,500");
    for (const secret of [reg.id, reg.passengerName, reg.cpf!, reg.phone, "trip"]) expect(csv).not.toContain(secret);
    expect(redactedFinanceCsv([], [])).toContain("recordedBalanceCents,0");
    expect(calculateFinanceSummary([{ ...reg, registrationStatus: "cancelled" }], expenses).receivedCents).toBe(3000);
  });
});
