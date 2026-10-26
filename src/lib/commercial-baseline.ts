import { validatePlanAssignment, type ManualPlanAssignment } from "./plan-catalog.ts";
export interface CommercialUsage { organizationId: string; publishedCaravans: number; activeMembers: number; activeOwners: number; version: "commercial-v1" }
interface CaravanInventory { id: string; organizationId: string; status: string; capacity: number; reservedSeats: number }
interface MemberInventory { uid: string; organizationId: string; role: string; status: string }
export interface CommercialBaselineInput {
  organizations: string[]; caravans: CaravanInventory[]; members: MemberInventory[];
  existingUsage: Record<string, CommercialUsage>; existingAssignments: Record<string, ManualPlanAssignment>;
  requestedAssignments: ManualPlanAssignment[];
}
export interface CommercialBaselinePlan { usageCreates: CommercialUsage[]; assignmentCreates: ManualPlanAssignment[]; unchanged: string[]; conflicts: { organizationId: string; reason: string }[] }
const comparable = (value: ManualPlanAssignment) => JSON.stringify({ organizationId: value.organizationId, planId: value.planId, status: value.status, reason: value.reason.trim(), setupWaived: value.setupWaived, trialEndsAtMillis: value.trialEndsAtMillis ?? null, override: value.override ? { monthlyCents: value.override.monthlyCents, expiresAtMillis: value.override.expiresAtMillis, reason: value.override.reason.trim() } : null });
// Additive dry-run only. Customer records, passenger fares and memberships are inputs, never migration targets here.
export function planCommercialBaseline(input: CommercialBaselineInput, nowMillis: number): CommercialBaselinePlan {
  const plan: CommercialBaselinePlan = { usageCreates: [], assignmentCreates: [], unchanged: [], conflicts: [] };
  for (const organizationId of [...new Set(input.organizations)].sort()) {
    const conflicts: string[] = [];
    const trips = input.caravans.filter((trip) => trip.organizationId === organizationId);
    const members = input.members.filter((member) => member.organizationId === organizationId);
    const requested = input.requestedAssignments.filter((assignment) => assignment.organizationId === organizationId);
    if (new Set(trips.map((trip) => trip.id)).size !== trips.length || new Set(members.map((member) => member.uid)).size !== members.length) conflicts.push("Inventário duplicado; não adivinhar contagens.");
    if (trips.some((trip) => !["draft", "published", "archived"].includes(trip.status) || !Number.isSafeInteger(trip.capacity) || !Number.isSafeInteger(trip.reservedSeats) || trip.capacity <= 0 || trip.reservedSeats < 0 || trip.reservedSeats > trip.capacity)) conflicts.push("Caravana com capacidade/estado inconsistente.");
    if (members.some((member) => !["tenant_owner", "staff"].includes(member.role) || !["active", "revoked"].includes(member.status))) conflicts.push("Membership com papel/status desconhecido.");
    const usage: CommercialUsage = { organizationId, publishedCaravans: trips.filter((trip) => trip.status === "published").length, activeMembers: members.filter((member) => member.status === "active").length, activeOwners: members.filter((member) => member.status === "active" && member.role === "tenant_owner").length, version: "commercial-v1" };
    if (usage.activeOwners < 1) conflicts.push("Organização sem owner ativo; resolver antes de habilitar crescimento.");
    const existing = Object.hasOwn(input.existingUsage, organizationId) ? input.existingUsage[organizationId] : undefined;
    if (existing && (existing.organizationId !== organizationId || existing.version !== usage.version || existing.publishedCaravans !== usage.publishedCaravans || existing.activeMembers !== usage.activeMembers || existing.activeOwners !== usage.activeOwners)) conflicts.push("Baseline existente diverge; não zerar ou sobrescrever.");
    if (requested.length > 1) conflicts.push("Mais de uma atribuição solicitada para a organização.");
    let assignment: ManualPlanAssignment | null = null;
    if (requested.length === 1) {
      const prior = Object.hasOwn(input.existingAssignments, organizationId) ? input.existingAssignments[organizationId] : null;
      if (prior) { if (comparable(prior) === comparable(requested[0])) assignment = prior; else conflicts.push("Plano existente diferente; ajuste exige operação comercial auditada, não backfill."); }
      else { try { assignment = validatePlanAssignment(requested[0], nowMillis); } catch { conflicts.push("Atribuição solicitada inválida."); } }
    }
    if (conflicts.length) { plan.conflicts.push(...conflicts.map((reason) => ({ organizationId, reason }))); continue; }
    if (!existing) plan.usageCreates.push(usage);
    if (assignment && !Object.hasOwn(input.existingAssignments, organizationId)) plan.assignmentCreates.push(assignment);
    if (existing && (!assignment || Object.hasOwn(input.existingAssignments, organizationId))) plan.unchanged.push(organizationId);
  }
  return plan;
}
