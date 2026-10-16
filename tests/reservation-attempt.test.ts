import { describe, expect, it } from "vitest";
import { completeReservationAttempt, createReservationAttempt, getReservationAttempt, readReservationAttempt, reservationRequestHash, validReservationAttempt } from "../src/lib/reservation-attempt";
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
describe("reservation retry identity", () => {
  it("persists opaque tokens only, resumes across remounts and isolates caravans", () => {
    const saved = storage(); const first = getReservationAttempt("a", saved);
    expect(validReservationAttempt(first)).toBe(true);
    expect(getReservationAttempt("a", saved)).toEqual(first);
    expect(getReservationAttempt("b", saved)).not.toEqual(first);
    expect(Object.keys(JSON.parse([...saved.values.values()][0]))).toEqual(["registrationId", "reservationNonce"]);
    completeReservationAttempt("a", first, saved);
    expect(readReservationAttempt("a", saved)).toBeNull();
    expect(readReservationAttempt("b", saved)).not.toBeNull();
  });
  it("does not silently replace corrupt attempts or proceed when persistence fails", () => {
    const saved = storage(); saved.setItem("caravana77:reservation-attempt:v1:a", "invalid");
    expect(() => getReservationAttempt("a", saved)).toThrow("recuperar");
    expect(() => getReservationAttempt("b", { ...saved, setItem() { throw new Error("blocked"); } })).toThrow("armazenamento");
    expect(validReservationAttempt({ registrationId: "a".repeat(64), reservationNonce: "a".repeat(64) })).toBe(false);
  });
  it("does not clear a newer operation and tolerates cleanup failure after commit", () => {
    const saved = storage(); const first = getReservationAttempt("a", saved);
    completeReservationAttempt("a", createReservationAttempt(), saved);
    expect(readReservationAttempt("a", saved)).toEqual(first);
    completeReservationAttempt("a", first, { ...saved, removeItem() { throw new Error("blocked"); } });
    expect(readReservationAttempt("a", saved)).toEqual(first);
  });
  it("hashes the semantic request and caravan, ignoring client boarding label and CPF punctuation", async () => {
    const form = { passengerName: "Synthetic", cpf: "123.456.789-00", boardingPointId: "a", boardingPointName: "Old label" };
    const hash = await reservationRequestHash("a", form);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await reservationRequestHash("a", { ...form, cpf: "12345678900", boardingPointName: "New label" })).toBe(hash);
    expect(await reservationRequestHash("b", form)).not.toBe(hash);
    expect(await reservationRequestHash("a", { ...form, passengerName: "Another" })).not.toBe(hash);
  });
});
