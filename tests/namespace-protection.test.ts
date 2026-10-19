import { describe, expect, it } from "vitest";
import { NAMESPACE_SOURCES, planNamespaceProtection, type NamespaceInventory } from "../src/lib/namespace-protection";
const inventory = (): NamespaceInventory => ({ complete: true, coveredSources: [...NAMESPACE_SOURCES], references: [{ organizationId: "Legacy_ID", source: "caravans" }, { organizationId: "Legacy_ID", source: "tenantSlugs", namespace: "old-public-link" }, { organizationId: "orphan-b", source: "registrations" }], existing: [] });
describe("historical namespace protection offline planner", () => {
  it("reserves exact historical IDs, orphan references and public aliases without granting any access", () => {
    const input = inventory(); const before = JSON.stringify(input); const plan = planNamespaceProtection(input);
    expect(plan.readyForSyntheticRehearsal).toBe(true); expect(plan.creates).toHaveLength(3);
    expect(plan.creates).toContainEqual({ namespace: "old-public-link", organizationId: "Legacy_ID", state: "reserved", version: "namespace-v1" });
    expect(JSON.stringify(input)).toBe(before);
    const replay = planNamespaceProtection({ ...input, existing: plan.creates }); expect(replay.creates).toEqual([]); expect(replay.unchanged).toHaveLength(3);
  });
  it("fails closed for incomplete inventories and conflicting references, without replacing active bindings", () => {
    expect(planNamespaceProtection({ ...inventory(), complete: false }).creates).toEqual([]);
    expect(planNamespaceProtection({ ...inventory(), coveredSources: ["organizations"] }).readyForSyntheticRehearsal).toBe(false);
    const plan = planNamespaceProtection({ ...inventory(), existing: [{ namespace: "old-public-link", organizationId: "other", state: "active", version: "namespace-v1" }] });
    expect(plan.readyForSyntheticRehearsal).toBe(false); expect(plan.creates).toEqual([]); expect(plan.conflicts).toContain("Namespace conflitante: old-public-link");
  });
  it("does not guess malformed IDs or unrecognized inventory sources", () => {
    const input = inventory(); input.references.push({ organizationId: "wrong/id", source: "memberships" }, { organizationId: "guess", source: "unknown" });
    expect(planNamespaceProtection(input).creates).toEqual([]); expect(planNamespaceProtection(input).conflicts).toHaveLength(2);
  });
});
