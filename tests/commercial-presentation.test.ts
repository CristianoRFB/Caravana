import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { COMMERCIAL_FEATURE_LABELS, PLAN_PRESENTATION, commercialPresentationConsistent } from "../src/lib/commercial-presentation";
import { CORE_FEATURES, IMPLEMENTED_FEATURES, PlanCatalog } from "../src/lib/plan-catalog";
describe("truthful cumulative commercial presentation",()=>{
  it("announces only canonical implemented features and never withdraws old core rights",()=>{
    expect(commercialPresentationConsistent()).toBe(true);
    expect(Object.keys(COMMERCIAL_FEATURE_LABELS).sort()).toEqual([...IMPLEMENTED_FEATURES].sort());
    for(const plan of Object.values(PlanCatalog))for(const feature of CORE_FEATURES)expect(plan.features).toContain(feature);
    expect(PLAN_PRESENTATION.pro.previous).toBe("Tudo do Essencial, mais");expect(PLAN_PRESENTATION.premium.previous).toBe("Tudo do Pro, mais");
    for(const feature of PlanCatalog.pro.features)expect(PlanCatalog.premium.features).toContain(feature);
  });
  it("connects every exclusive announced tool to its actual UI, protected service, Rules and authorization cases",()=>{
    const app=readFileSync("src/App.tsx","utf8"),rules=readFileSync("firestore.rules","utf8"),service=readFileSync("src/lib/operational-tools-data.ts","utf8"),tests=readFileSync("tests/operational-tools.integration.test.ts","utf8");
    expect(app).toContain('/admin/relatorios');expect(app).toContain('/admin/roteiros');
    for(const feature of ["report_library","worklists"]){expect(rules).toContain(`functionalGrowth(orgId, '${feature}')`);expect(service).toContain(feature);}
    for(const functionName of ["saveOperationalReport","saveWorklist"]){expect(service).toContain(`function ${functionName}`);expect(tests).toContain(functionName);}
    expect(tests).toContain("direct SDK");expect(tests).toContain("downgrade");expect(tests).toContain("maximum twenty-task");
  });
  it("keeps monthly prices and approved capacities exact and avoids speculative plan benefits",()=>{
    expect(Object.values(PlanCatalog).map(p=>[p.monthlyCents,...Object.values(p.limits)])).toEqual([[8900,2,60,2],[14900,5,200,5],[21900,15,500,15]]);
    const text=JSON.stringify(PLAN_PRESENTATION);for(const word of ["checkout","domínio próprio","integração bancária","trial","ilimitado","garantido"]){expect(text.toLowerCase()).not.toContain(word);}
  });
});
