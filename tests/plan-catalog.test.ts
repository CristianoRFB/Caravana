import { describe, expect, it } from "vitest";
import { COMMERCIAL_POLICY, EntitlementService, PlanCatalog, validatePlanAssignment, type ManualPlanAssignment } from "../src/lib/plan-catalog";
const now = Date.parse("2026-10-16T12:00:00Z");
const assignment: ManualPlanAssignment = { organizationId: "italo-synthetic", planId: "pro", status: "active", reason: "Condição sintética", setupWaived: false };
describe("approved commercial catalog foundation (F6, server integration pending)", () => {
  it("preserves approved prices, deferred annual offer and exact limits without billing or public trial", () => {
    expect(Object.values(PlanCatalog).map((plan) => [plan.monthlyCents, plan.annualCents, ...Object.values(plan.limits)])).toEqual([[8900, 89000, 2, 60, 2], [14900, 149000, 5, 200, 5], [21900, 219000, 15, 500, 15]]);
    expect(COMMERCIAL_POLICY).toMatchObject({ setupCents: 10000, setupWaiverAllowed: true, automaticBilling: false, publicTrial: false, annualLaunchEnabled: false });
  });
  it("keeps the temporary Pro90 override separate from catalog and passenger fare, then expires it", () => {
    const override = { monthlyCents: 9000, expiresAtMillis: now + 86400000, reason: "Promoção sintética temporária" };
    const valid = validatePlanAssignment({ ...assignment, override }, now);
    expect(EntitlementService.resolve(valid, now)).toMatchObject({ monthlyCents: 9000, promotional: true, limits: PlanCatalog.pro.limits });
    expect(EntitlementService.resolve(valid, override.expiresAtMillis)).toMatchObject({ monthlyCents: 14900, promotional: false }); expect(PlanCatalog.pro.monthlyCents).toBe(14900);
    expect(() => validatePlanAssignment({ ...assignment, override: { ...override, expiresAtMillis: now } }, now)).toThrow();
  });
  it("fails closed for an unassigned tenant, checks all three feature conditions and preserves history on downgrade", () => {
    expect(EntitlementService.resolve(null, now)).toMatchObject({ status: "unassigned", growthAllowed: false, limits: { activeCaravans: 0 } });
    const pro = EntitlementService.resolve(assignment, now); expect(EntitlementService.featureAllowed(pro, "finance", true)).toBe(true); expect(EntitlementService.featureAllowed(pro, "finance", false)).toBe(false); expect(EntitlementService.featureAllowed(pro, "finance", true, false)).toBe(false);
    const history = { activeCaravans: 5, receipts: [1000, 2000] }; const before = JSON.stringify(history);
    expect(EntitlementService.resolve({ ...assignment, planId: "essencial" }, now).limits.activeCaravans).toBe(2); expect(JSON.stringify(history)).toBe(before);
    for (const status of ["past_due", "suspended", "cancelled"] as const) expect(EntitlementService.resolve({ ...assignment, status }, now).growthAllowed).toBe(false);
  });
});
