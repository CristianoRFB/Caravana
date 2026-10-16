import { describe, expect, it } from "vitest";
import {
  calculateFinanceSummary,
  passengerFinancialStatus,
  validMoneyInput,
} from "../src/lib/finance";
import type { CaravanExpense, Registration } from "../src/lib/types";
import { money } from "../src/lib/types";

function registration(
  id: string,
  amountCents?: number,
  paymentTotalCents = 0,
  extras: Partial<Registration> = {},
): Registration {
  return {
    id,
    organizationId: "org-test",
    caravanId: "ride-test",
    caravanName: "Viagem de teste",
    passengerName: `Pessoa ${id}`,
    phone: "",
    email: "",
    city: "",
    boardingPointId: "",
    boardingPointName: "Não informado",
    emergencyContact: "",
    notes: "",
    ...(amountCents === undefined ? {} : { amountCents }),
    paymentTotalCents,
    registrationStatus: "confirmed",
    paymentStatus: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extras,
  };
}

function expense(amountCents: number): CaravanExpense {
  return {
    id: "expense-test",
    organizationId: "org-test",
    caravanId: "ride-test",
    description: "Custo de teste",
    category: "transporte",
    amountCents,
    date: "2026-01-01",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "admin-test",
  };
}

describe("finance calculations", () => {
  it("derives pending, partial, paid and unquantified reported Pix states", () => {
    expect(passengerFinancialStatus(registration("pending", 8500))).toBe("pending");
    expect(passengerFinancialStatus(registration("partial", 8500, 5000))).toBe("partial");
    expect(passengerFinancialStatus(registration("paid", 8500, 8500))).toBe("paid");
    expect(
      passengerFinancialStatus(
        registration("reported", undefined, 0, {
          paymentStatus: "reported",
          paymentReportedMethod: "pix",
          paymentReportedUnreconciled: true,
        }),
      ),
    ).toBe("reported");
  });

  it("calculates the documented trip totals without floating point currency", () => {
    const passengers = [
      ...Array.from({ length: 8 }, (_, index) => registration(`paid-${index}`, 8500, 8500)),
      registration("partial", 8500, 2000),
      registration("pending", 8500),
    ];
    const summary = calculateFinanceSummary(passengers, [expense(40000)]);
    expect(summary.passengerCount).toBe(10);
    expect(summary.paidPassengerCount).toBe(8);
    expect(summary.partialPassengerCount).toBe(1);
    expect(summary.pendingPassengerCount).toBe(1);
    expect(summary.expectedCents).toBe(85000);
    expect(summary.receivedCents).toBe(70000);
    expect(summary.receivableCents).toBe(15000);
    expect(summary.expenseCents).toBe(40000);
    expect(summary.recordedBalanceCents).toBe(30000);
    expect(summary.projectedResultCents).toBe(45000);
  });

  it("keeps unknown fare and claimed Pix separate from reconciled totals", () => {
    const summary = calculateFinanceSummary(
      [
        registration("reported", undefined, 0, {
          paymentStatus: "reported",
          paymentReportedMethod: "pix",
          paymentReportedUnreconciled: true,
        }),
      ],
      [],
    );
    expect(summary.reportedPassengerCount).toBe(1);
    expect(summary.unknownFareCount).toBe(1);
    expect(summary.uncertainReceivableCount).toBe(1);
    expect(summary.expectedCents).toBe(0);
    expect(summary.receivedCents).toBe(0);
    expect(summary.receivableCents).toBe(0);
    expect(Number.isNaN(summary.projectedResultCents)).toBe(false);
  });

  it("does not count cancelled fares as expected, but retains recorded money received", () => {
    const summary = calculateFinanceSummary(
      [
        registration("active", 8500, 1000),
        registration("cancelled", 8500, 3000, { registrationStatus: "cancelled" }),
      ],
      [],
    );
    expect(summary.passengerCount).toBe(1);
    expect(summary.expectedCents).toBe(8500);
    expect(summary.receivedCents).toBe(4000);
    expect(summary.receivableCents).toBe(7500);
  });

  it("accepts positive Brazilian currency values and rejects invalid input", () => {
    expect(validMoneyInput("85,00")).toBe(8500);
    expect(validMoneyInput("50.5")).toBe(5050);
    expect(validMoneyInput("0")).toBeNull();
    expect(validMoneyInput("-12,00")).toBeNull();
    expect(validMoneyInput("1,2,3")).toBeNull();
    expect(validMoneyInput("NaN")).toBeNull();
  });
  it("preserves every cent at the safe integer boundary without binary decimal rounding", () => {
    expect(validMoneyInput("90071992547409.90")).toBe(9007199254740990);
    expect(validMoneyInput("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
    expect(validMoneyInput("90071992547409.92")).toBeNull();
    expect(money(Number.MAX_SAFE_INTEGER)).toContain("90.071.992.547.409,91");
    expect(money(-1)).toContain("0,01"); expect(money(-1)).toContain("-");
  });
  it("surfaces an unsafe aggregate instead of presenting a rounded or invented balance", () => {
    const summary = calculateFinanceSummary([registration("a", Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), registration("b", 1, 1)], []);
    expect(Number.isNaN(summary.receivedCents)).toBe(true); expect(Number.isNaN(summary.expectedCents)).toBe(true);
    expect(money(summary.receivedCents)).toBe("Valor inválido");
  });
});
