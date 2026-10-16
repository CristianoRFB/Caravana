import { describe, expect, it } from "vitest";
import { completeFinancialAttempt, getFinancialAttempt } from "../src/lib/financial-attempt";
describe("opaque financial attempt persistence", () => {
  it("survives a new UI instance, separates tenant/action/entity and clears only the confirmed ID", () => {
    const entries = new Map<string, string>(); const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
    const id = getFinancialAttempt("uid:a:payment:1", storage);
    expect(getFinancialAttempt("uid:a:payment:1", storage)).toBe(id);
    expect(getFinancialAttempt("uid:b:payment:1", storage)).not.toBe(id);
    completeFinancialAttempt("uid:a:payment:1", "f".repeat(32), storage); expect(getFinancialAttempt("uid:a:payment:1", storage)).toBe(id);
    completeFinancialAttempt("uid:a:payment:1", id, storage); expect(getFinancialAttempt("uid:a:payment:1", storage)).not.toBe(id);
    expect(Array.from(entries.values()).every((value) => /^[a-f0-9]{32}$/.test(value))).toBe(true);
  });
  it("fails closed when storage is blocked or corrupt instead of silently starting another operation", () => {
    const blocked = { getItem: () => null, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
    expect(() => getFinancialAttempt("scope", blocked)).toThrow("preservar");
    expect(() => getFinancialAttempt("scope", { ...blocked, getItem: () => "broken" })).toThrow("preservar");
  });
});
