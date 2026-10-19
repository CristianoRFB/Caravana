import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { publicAvailability } from "../src/lib/public-availability";
import type { PublicEntitlements } from "../src/lib/commercial-data";
const trip = { status: "published" as const, capacity: 100, reservedSeats: 59 };
const policy: PublicEntitlements = { organizationId: "a", growthEnabled: true, growthUntil: null, limits: { activeCaravans: 2, passengersPerCaravan: 60, internalUsers: 2 } };
describe("public seat availability matches the commercial reservation ceiling", () => {
  it("caps displayed availability at the lower of physical and commercial capacity", () => {
    expect(publicAvailability(trip, policy, false, true)).toMatchObject({ availableSeats: 1, capacityLimit: 60, canReserve: true });
    expect(publicAvailability({ ...trip, capacity: 60, reservedSeats: 2 }, { ...policy, limits: { ...policy.limits, passengersPerCaravan: 200 } }, false, true).availableSeats).toBe(58);
  });
  it("preserves over-limit history after downgrade and displays zero instead of negative seats", () => {
    expect(publicAvailability({ ...trip, reservedSeats: 75 }, policy, false, true)).toMatchObject({ availableSeats: 0, canReserve: false, label: "Vagas esgotadas" });
  });
  it("does not advertise physical vacancies without a confirmed usable policy", () => {
    for (const [value, suspended, confirmed] of [[null, false, true], [policy, true, true], [policy, false, false], [{ ...policy, growthEnabled: false }, false, true]] as const) {
      expect(publicAvailability(trip, value, suspended, confirmed)).toMatchObject({ availableSeats: null, canReserve: false });
    }
  });
  it("expires at the deadline, including equality, without granting a final extra seat", () => {
    const expiring = { ...policy, growthUntil: Timestamp.fromMillis(1000) };
    expect(publicAvailability(trip, expiring, false, true, 999).canReserve).toBe(true);
    expect(publicAvailability(trip, expiring, false, true, 1000).canReserve).toBe(false);
    expect(publicAvailability(trip, expiring, false, true, 1001).availableSeats).toBeNull();
  });
  it("refuses invalid counters, archived trips and invalid limits", () => {
    expect(publicAvailability({ ...trip, reservedSeats: -1 }, policy, false, true).canReserve).toBe(false);
    expect(publicAvailability({ ...trip, status: "archived" }, policy, false, true).canReserve).toBe(false);
    expect(publicAvailability(trip, { ...policy, limits: { ...policy.limits, passengersPerCaravan: 0 } }, false, true).canReserve).toBe(false);
  });
});
