import { describe, expect, it } from "vitest";
import { planCommercialBaseline, type CommercialBaselineInput } from "../src/lib/commercial-baseline";
const now = Date.parse("2026-10-16T12:00:00Z");
function input(): CommercialBaselineInput { return { organizations: ["italo-synthetic"], caravans: [{ id: "ORIGINAL_TRIP", organizationId: "italo-synthetic", status: "published", capacity: 25, reservedSeats: 8 }], members: [{ uid: "ORIGINAL_OWNER", organizationId: "italo-synthetic", role: "tenant_owner", status: "active" }], existingUsage: {}, existingAssignments: {}, requestedAssignments: [{ organizationId: "italo-synthetic", planId: "pro", status: "active", reason: "Condição sintética revisada", setupWaived: true, override: { monthlyCents: 9000, expiresAtMillis: now + 86400000, reason: "Pro90 temporário sintético" } }] }; }
describe("commercial baseline additive simulation", () => {
  it("preserves original IDs/inputs, simulates additive baseline and replays without creating duplicates", () => {
    const source = input(); const before = JSON.stringify(source); const first = planCommercialBaseline(source, now);
    expect(first.conflicts).toEqual([]); expect(first.usageCreates[0]).toMatchObject({ publishedCaravans: 1, activeMembers: 1, activeOwners: 1 });
    expect(first.assignmentCreates[0].override?.monthlyCents).toBe(9000); expect(JSON.stringify(source)).toBe(before);
    const replay = planCommercialBaseline({ ...source, existingUsage: { "italo-synthetic": first.usageCreates[0] }, existingAssignments: { "italo-synthetic": first.assignmentCreates[0] } }, now);
    expect(replay.usageCreates).toEqual([]); expect(replay.assignmentCreates).toEqual([]); expect(replay.conflicts).toEqual([]);
    const afterExpiry = planCommercialBaseline({ ...source, existingUsage: { "italo-synthetic": first.usageCreates[0] }, existingAssignments: { "italo-synthetic": first.assignmentCreates[0] } }, now + 86400001);
    expect(afterExpiry.conflicts).toEqual([]); expect(afterExpiry.assignmentCreates).toEqual([]);
  });
  it("never repairs a divergent counter, guesses a duplicate, invents a plan or removes over-limit history", () => {
    const source = input(); const baseline = planCommercialBaseline(source, now).usageCreates[0];
    expect(planCommercialBaseline({ ...source, existingUsage: { "italo-synthetic": { ...baseline, publishedCaravans: 0 } } }, now).usageCreates).toEqual([]);
    expect(planCommercialBaseline({ ...source, caravans: [...source.caravans, ...source.caravans] }, now).conflicts.length).toBeGreaterThan(0);
    expect(planCommercialBaseline({ ...source, requestedAssignments: [] }, now).assignmentCreates).toEqual([]);
    const hugeHistory = { ...source, caravans: Array.from({ length: 6 }, (_, index) => ({ ...source.caravans[0], id: `trip-${index}` })), requestedAssignments: [{ ...source.requestedAssignments[0], planId: "essencial" as const }] };
    expect(planCommercialBaseline(hugeHistory, now).usageCreates[0].publishedCaravans).toBe(6); expect(hugeHistory.caravans).toHaveLength(6);
  });
});
