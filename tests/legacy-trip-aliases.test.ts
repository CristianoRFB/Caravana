import { describe, expect, it } from "vitest";
import { planLegacyTripAliases, type LegacyPublicTrip } from "../src/lib/legacy-trip-aliases";
const trip: LegacyPublicTrip = { id: "ORIGINAL_ID", organizationId: "ITALO_SYNTHETIC", slug: "anime-spirit-2026", status: "published" };
describe("nondestructive historical URL alias planner", () => {
  it("plans original IDs without touching input, skips identical aliases on replay and never deletes extras", () => {
    const existing = { older: { organizationId: "old", caravanId: "historical" } }; const before = JSON.stringify({ trip, existing });
    const first = planLegacyTripAliases([trip], existing); expect(first.creates[trip.slug]).toEqual({ caravanId: trip.id, organizationId: trip.organizationId });
    const simulated = { ...existing, ...first.creates }; const replay = planLegacyTripAliases([trip], simulated);
    expect(replay.creates).toEqual({}); expect(replay.unchanged).toEqual([trip.slug]); expect(simulated.older).toEqual(existing.older); expect(JSON.stringify({ trip, existing })).toBe(before);
    expect(planLegacyTripAliases([{ ...trip, slug: "constructor" }], {}).creates.constructor).toEqual({ caravanId: trip.id, organizationId: trip.organizationId });
  });
  it("never guesses conflicting destinations or overwrites a preexisting mapping", () => {
    const conflict = planLegacyTripAliases([trip, { ...trip, id: "OTHER", organizationId: "OTHER_TENANT" }], {}); expect(conflict.creates).toEqual({}); expect(conflict.conflicts).toHaveLength(1);
    expect(planLegacyTripAliases([trip], { [trip.slug]: { organizationId: "OTHER", caravanId: "OTHER" } }).conflicts).toHaveLength(1);
    expect(planLegacyTripAliases([{ ...trip, slug: "../admin" }], {}).creates).toEqual({});
  });
});
