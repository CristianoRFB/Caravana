export type PlanId = "essencial" | "pro" | "premium";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled" | "demo";
export interface Limits { activeCaravans: number; passengersPerCaravan: number; internalUsers: number }
export const CORE_FEATURES = ["caravans", "registrations", "proofs", "checkin", "csv_import", "finance", "branding"] as const;
export const IMPLEMENTED_FEATURES = [...CORE_FEATURES, "report_library", "worklists"] as const;
export type CommercialFeature = typeof IMPLEMENTED_FEATURES[number];
export interface Plan { id: PlanId; name: string; monthlyCents: number; annualCents: number; annualDeferred: true; limits: Readonly<Limits>; features: readonly CommercialFeature[] }
const plan = (id: PlanId, name: string, monthlyCents: number, annualCents: number, activeCaravans: number, passengersPerCaravan: number, internalUsers: number): Readonly<Plan> => Object.freeze({ id, name, monthlyCents, annualCents, annualDeferred: true, limits: Object.freeze({ activeCaravans, passengersPerCaravan, internalUsers }), features: Object.freeze([...CORE_FEATURES, ...(id !== "essencial" ? ["report_library" as const] : []), ...(id === "premium" ? ["worklists" as const] : [])]) });
export const PlanCatalog: Readonly<Record<PlanId, Readonly<Plan>>> = Object.freeze({
  essencial: plan("essencial", "Essencial", 8900, 89000, 2, 60, 2),
  pro: plan("pro", "Pro", 14900, 149000, 5, 200, 5),
  premium: plan("premium", "Premium", 21900, 219000, 15, 500, 15),
});
export const COMMERCIAL_POLICY = Object.freeze({ setupCents: 10000, setupWaiverAllowed: true, publicTrial: false, automaticBilling: false, annualLaunchEnabled: false });
export interface TenantOverrides { monthlyCents: number; expiresAtMillis: number; reason: string }
export interface ManualPlanAssignment {
  organizationId: string; planId: PlanId; status: SubscriptionStatus; reason: string; setupWaived: boolean;
  trialEndsAtMillis?: number; override?: TenantOverrides;
}
export function validatePlanAssignment(input: ManualPlanAssignment, nowMillis: number): ManualPlanAssignment {
  if (!Object.hasOwn(PlanCatalog, input.planId) || !["trial", "active", "past_due", "suspended", "cancelled", "demo"].includes(input.status)
    || !input.organizationId || input.organizationId.includes("/") || typeof input.setupWaived !== "boolean" || input.reason.trim().length < 3 || input.reason.length > 300) throw new Error("Confira organização, plano, status e motivo da atribuição.");
  if (input.status === "trial" && (!Number.isSafeInteger(input.trialEndsAtMillis) || input.trialEndsAtMillis! <= nowMillis)) throw new Error("A concessão assistida precisa de prazo futuro. Não há trial público.");
  if (input.override && (!Number.isSafeInteger(input.override.monthlyCents) || input.override.monthlyCents < 0 || !Number.isSafeInteger(input.override.expiresAtMillis)
    || input.override.expiresAtMillis <= nowMillis || input.override.reason.trim().length < 3 || input.override.reason.length > 300)) throw new Error("A condição promocional precisa de valor inteiro, motivo e prazo futuro.");
  return { ...input, reason: input.reason.trim(), ...(input.override ? { override: { ...input.override, reason: input.override.reason.trim() } } : {}) };
}
export interface Entitlements { planId: PlanId | null; status: SubscriptionStatus | "unassigned"; limits: Readonly<Limits>; growthAllowed: boolean; monthlyCents: number | null; promotional: boolean }
const zeroLimits: Readonly<Limits> = Object.freeze({ activeCaravans: 0, passengersPerCaravan: 0, internalUsers: 0 });
export const EntitlementService = {
  resolve(assignment: ManualPlanAssignment | null, nowMillis: number): Entitlements {
    if (!assignment || !Object.hasOwn(PlanCatalog, assignment.planId)) return { planId: null, status: "unassigned", limits: zeroLimits, growthAllowed: false, monthlyCents: null, promotional: false };
    const catalog = PlanCatalog[assignment.planId];
    const promotional = Boolean(assignment.override && assignment.override.expiresAtMillis > nowMillis);
    const growthAllowed = ["active", "demo"].includes(assignment.status) || (assignment.status === "trial" && (assignment.trialEndsAtMillis || 0) > nowMillis);
    return { planId: assignment.planId, status: assignment.status, limits: catalog.limits, growthAllowed, monthlyCents: promotional ? assignment.override!.monthlyCents : catalog.monthlyCents, promotional };
  },
  featureAllowed(entitlements: Entitlements, feature: CommercialFeature, configured: boolean, implemented = IMPLEMENTED_FEATURES.includes(feature)): boolean {
    const core = (CORE_FEATURES as readonly string[]).includes(feature);
    return Boolean(entitlements.planId && PlanCatalog[entitlements.planId].features.includes(feature) && configured && implemented && (core || entitlements.growthAllowed));
  },
};
