import { describe, expect, it } from "vitest";
import { observePendingWrites, pendingWrites, trackWrite } from "../src/lib/pending-writes";

describe("tenant switching waits for acknowledged mutations", () => {
  it("tracks overlapping operations and clears failed as well as successful writes", async () => {
    let finish!: () => void;
    let reject!: (error: Error) => void;
    const observed: number[] = [];
    const stop = observePendingWrites(() => observed.push(pendingWrites()));
    const one = trackWrite(() => new Promise<void>((resolve) => { finish = resolve; }));
    const two = trackWrite(() => new Promise<void>((_, fail) => { reject = fail; }));
    expect(pendingWrites()).toBe(2);
    finish(); await one;
    expect(pendingWrites()).toBe(1);
    const expectedFailure = expect(two).rejects.toThrow("synthetic failure");
    reject(new Error("synthetic failure")); await expectedFailure;
    expect(pendingWrites()).toBe(0);
    stop();
    expect(observed).toEqual([1, 2, 1, 0]);
  });
  it("unsubscribes observers and releases synchronous errors without claiming to cancel committed writes", async () => {
    let calls = 0;
    const stop = observePendingWrites(() => calls++);
    stop();
    await expect(trackWrite(() => { throw new Error("before SDK"); })).rejects.toThrow("before SDK");
    expect(pendingWrites()).toBe(0);
    expect(calls).toBe(0);
  });
});
