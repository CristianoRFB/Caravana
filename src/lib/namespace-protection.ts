export const NAMESPACE_SOURCES = Object.freeze(["organizations", "admins", "memberships", "caravans", "registrations", "payments", "expenses", "proofs", "legacyTripAliases", "tenantSlugs", "subscriptions", "tenantUsage"] as const);
export interface ProtectedNamespace { namespace: string; organizationId: string; state: "reserved" | "active"; version: "namespace-v1" }
export interface NamespaceInventory {
  complete: boolean; coveredSources: string[];
  references: { organizationId: string; source: string; namespace?: string }[];
  existing: ProtectedNamespace[];
}
const validId = (value: string) => typeof value === "string" && value.length > 0 && value.length <= 1500 && value === value.trim() && !value.includes("/") && ![".", ".."].includes(value);
// Offline planner only. Completeness is an explicit trusted-export precondition, not inferred here.
// Reserve orphan references too; never normalize historical IDs or grant membership/ownership.
export function planNamespaceProtection(input: NamespaceInventory) {
  const conflicts: string[] = []; const creates: ProtectedNamespace[] = []; const unchanged: string[] = [];
  const bindings = new Map<string, string>(); const existing = new Map<string, ProtectedNamespace>();
  if (!input.complete || NAMESPACE_SOURCES.some((source) => !input.coveredSources.includes(source))) conflicts.push("Inventário incompleto: onboarding deve continuar bloqueado.");
  function bind(namespace: string, organizationId: string) {
    if (!validId(namespace) || !validId(organizationId)) { conflicts.push("Identificador histórico inválido: revisar sem renomear."); return; }
    if (bindings.has(namespace) && bindings.get(namespace) !== organizationId) conflicts.push(`Namespace conflitante: ${namespace}`);
    else bindings.set(namespace, organizationId);
  }
  for (const entry of input.existing) {
    if (existing.has(entry.namespace) || entry.version !== "namespace-v1" || !["reserved", "active"].includes(entry.state)) conflicts.push("Registro de namespace duplicado ou inválido.");
    existing.set(entry.namespace, entry); bind(entry.namespace, entry.organizationId);
  }
  for (const reference of input.references) {
    if (!NAMESPACE_SOURCES.some((source) => source === reference.source)) { conflicts.push("Origem de referência não reconhecida."); continue; }
    bind(reference.organizationId, reference.organizationId);
    if (reference.namespace !== undefined) bind(reference.namespace, reference.organizationId);
  }
  for (const [namespace, organizationId] of [...bindings.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (existing.has(namespace)) unchanged.push(namespace);
    else creates.push({ namespace, organizationId, state: "reserved", version: "namespace-v1" });
  }
  // A partial/conflicting inventory must never produce an apparently executable bootstrap.
  return { readyForSyntheticRehearsal: conflicts.length === 0, creates: conflicts.length ? [] : creates, unchanged, conflicts };
}
