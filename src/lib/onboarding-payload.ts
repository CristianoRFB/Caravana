import { validatePlanAssignment, type PlanId } from "./plan-catalog";
import { validateTenantBranding, type TenantBranding } from "./tenant-branding";
export interface OnboardTenant {
  name: string; slug: string; ownerUid: string; ownerUidConfirmed: boolean; planId: PlanId; setupWaived: boolean;
  branding?: Partial<Omit<TenantBranding, "organizationId" | "slug">>;
}
export function onboardingPayload(input: OnboardTenant) {
  const name = input.name.trim(); const slug = input.slug.trim().toLowerCase(); const ownerUid = input.ownerUid.trim();
  if (name.length < 2 || name.length > 120 || !/^[^/]{1,128}$/.test(ownerUid) || [".", ".."].includes(ownerUid)) throw new Error("Confira nome, identificador e UID do responsável.");
  if (input.ownerUidConfirmed !== true) throw new Error("Confirme a conferência do UID de uma conta existente. A verificação Auth é assistida.");
  const assignment = validatePlanAssignment({ organizationId: slug, planId: input.planId, status: "active", setupWaived: input.setupWaived, reason: "Implantação assistida de nova organizadora" }, Date.now());
  const branding = validateTenantBranding({ publicName: name, description: "", primaryColor: "#6d4aff", logo: "", website: "", contactEmail: "", whatsapp: "", operationalMessage: "As inscrições são confirmadas pela organização após conferência manual do comprovante. Este site não processa pagamentos.", ...input.branding, organizationId: slug, slug });
  return { name, slug, ownerUid, ownerUidConfirmed: true, assignment, branding };
}
