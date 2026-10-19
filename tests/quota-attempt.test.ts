import { describe, expect, it } from "vitest";
import { completeQuotaAttempt, getQuotaAttempt } from "../src/lib/quota-attempt";
const digest = "a".repeat(64);
function memory() { const values = new Map<string, string>(); return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } }; }
describe("durable quota command identity", () => {
  it("keeps an uncertain command stable, isolates user/tenant/entity/payload and clears only its exact success", () => {
    const storage = memory(); const scope = "uid:a:new"; const id = getQuotaAttempt(scope, digest, storage);
    expect(getQuotaAttempt(scope, digest, storage)).toBe(id);
    expect(getQuotaAttempt("uid:b:new", digest, storage)).not.toBe(id);
    expect(getQuotaAttempt("other:a:new", digest, storage)).not.toBe(id);
    expect(getQuotaAttempt(scope, "b".repeat(64), storage)).not.toBe(id);
    completeQuotaAttempt(scope, digest, "0".repeat(32), storage); expect(getQuotaAttempt(scope, digest, storage)).toBe(id);
    completeQuotaAttempt(scope, digest, id, storage); expect(getQuotaAttempt(scope, digest, storage)).not.toBe(id);
  });
  it("fails closed on blocked/corrupt storage rather than creating an untracked command", () => {
    const storage = memory(); getQuotaAttempt("a", digest, storage); storage.values.set([...storage.values.keys()][0], "corrupt");
    expect(() => getQuotaAttempt("a", digest, storage)).toThrow("preservar");
    expect(() => getQuotaAttempt("a", digest, { ...storage, setItem: () => { throw new Error("blocked"); }, getItem: () => null })).toThrow("preservar");
    expect(() => getQuotaAttempt("a", "invalid", storage)).toThrow("preservar");
  });
});
