import { describe, expect, it } from "vitest";
import { ageOnDate } from "../src/lib/types";

describe("ageOnDate", () => {
  it("uses the travel date to distinguish minors from adults", () => {
    expect(ageOnDate("2008-10-19", "2026-10-18")).toBe(17);
    expect(ageOnDate("2008-10-18", "2026-10-18")).toBe(18);
  });

  it("rejects impossible dates and birth dates after the trip", () => {
    expect(ageOnDate("2008-02-30", "2026-10-18")).toBeNull();
    expect(ageOnDate("2026-10-19", "2026-10-18")).toBeNull();
  });
});
