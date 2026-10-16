import { describe, expect, it } from "vitest";
import { chooseTenant, tenantPreferenceKey } from "../src/lib/tenant-preference";
describe("tenant preference is never authority", () => {
  it("resumes only an available organization and rejects stale or forged preferences", () => {
    const available = [{ organizationId: "a" }, { organizationId: "b" }];
    expect(chooseTenant(available, null, "b")).toBe("b");
    expect(chooseTenant(available, "a", "b")).toBe("a");
    expect(chooseTenant(available.slice(0, 1), "b", "b")).toBe("a");
    expect(chooseTenant([], "b", "b")).toBeNull();
    expect(tenantPreferenceKey("user-a")).not.toBe(tenantPreferenceKey("user-b"));
  });
});
