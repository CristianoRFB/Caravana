import { describe, expect, it } from "vitest";
import { EntitlementService, PlanCatalog, CORE_FEATURES } from "../src/lib/plan-catalog";
import { operationalReportCsv, operationalSummary, reportFilter, validateWorklist } from "../src/lib/operational-tools";
import type { Caravan, CaravanExpense, Registration } from "../src/lib/types";
const filter = { title: "Fechamento sintético", from: "2026-10-01", to: "2026-10-31", caravanId: "" };
describe("cumulative commercial tools with the entire existing core preserved", () => {
  it("keeps prices, all original core rights and differentiates actual tool capabilities", () => {
    expect(Object.values(PlanCatalog).map((p) => p.monthlyCents)).toEqual([8900,14900,21900]);
    for (const plan of Object.values(PlanCatalog)) for (const feature of CORE_FEATURES) expect(plan.features).toContain(feature);
    expect(PlanCatalog.essencial.features).not.toContain("report_library"); expect(PlanCatalog.pro.features).toContain("report_library"); expect(PlanCatalog.pro.features).not.toContain("worklists");
    for (const feature of PlanCatalog.pro.features) expect(PlanCatalog.premium.features).toContain(feature);
    expect(PlanCatalog.premium.features).toContain("worklists");
  });
  it("blocks new commercial tools on suspension/expiry without disabling core finance or promoting a price override", () => {
    for (const status of ["past_due", "suspended", "cancelled"] as const) {
      const policy = EntitlementService.resolve({ organizationId: "a", planId: "premium", status, reason: "Sintético", setupWaived: true }, Date.now());
      expect(EntitlementService.featureAllowed(policy, "worklists", true)).toBe(false); expect(EntitlementService.featureAllowed(policy, "finance", true)).toBe(true);
    }
    const policy = EntitlementService.resolve({ organizationId: "a", planId: "pro", status: "active", reason: "Sintético", setupWaived: true, override: { monthlyCents: 0, expiresAtMillis: Date.now()+60000, reason: "Concessão sintética" } }, Date.now());
    expect(EntitlementService.featureAllowed(policy, "worklists", true)).toBe(false);
  });
  it("builds a trip-date cohort, includes cancelled receipts in history and excludes voided expenses", () => {
    const trips = [{id:"trip",organizationId:"a",date:"2026-10-20",capacity:60,requiresMinorAuthorization:true},{id:"other",organizationId:"a",date:"2026-11-20",capacity:60}] as Caravan[];
    const registrations = [{organizationId:"a",caravanId:"trip",registrationStatus:"confirmed",amountCents:8500,paymentTotalCents:2500,checkedInAt:"2026-10-20"},{organizationId:"a",caravanId:"trip",registrationStatus:"cancelled",amountCents:8500,paymentTotalCents:1000},{organizationId:"a",caravanId:"other",registrationStatus:"confirmed",amountCents:9999}] as Registration[];
    const costs = [{organizationId:"a",caravanId:"trip",amountCents:500,status:"active"},{organizationId:"a",caravanId:"trip",amountCents:9000,status:"voided"}] as CaravanExpense[];
    const report = operationalSummary("a",filter,trips,registrations,costs);
    expect(report).toMatchObject({trips:1,capacity:60,boarded:1,finance:{passengerCount:1,receivedCents:3500,expectedCents:8500,expenseCents:500,recordedBalanceCents:3000}});
    const csv = operationalReportCsv({...filter,title:"=formula"},report); expect(csv).toContain("'=formula"); expect(csv).not.toContain("passengerName");
    expect(() => operationalSummary("b",filter,trips,registrations,costs)).toThrow("outra organização");
  });
  it("rejects invalid dates, ranges, overflows, invalid worklists and duplicate tasks", () => {
    expect(() => reportFilter({...filter,from:"2026-02-30"})).toThrow(); expect(() => reportFilter({...filter,from:"2027-01-01"})).toThrow();
    expect(() => operationalSummary("a",filter,[{id:"trip",organizationId:"a",date:"2026-10-20",capacity:NaN}] as Caravan[],[],[])).toThrow("inconsistentes");
    const input={title:"Preparação sintética",kind:"template" as const,caravanId:null,items:[{label:"Confirmar horário",done:false}],archived:false};
    expect(validateWorklist(input).items).toHaveLength(1); expect(() => validateWorklist({...input,items:Array(21).fill(input.items[0])})).toThrow(); expect(() => validateWorklist({...input,items:[input.items[0],input.items[0]]})).toThrow("duplicadas");
  });
});
