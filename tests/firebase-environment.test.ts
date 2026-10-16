import { describe, expect, it } from "vitest";
import { assertFirebaseEnvironment } from "../src/lib/firebase-environment";

describe("Firebase environment boundary before SDK initialization", () => {
  it.each(["localhost", "127.0.0.1", "::1", "[::1]"])("refuses real Firebase on %s even in a compiled build", (hostname) => {
    expect(() => assertFirebaseEnvironment(hostname, "caravana-af306", false, false)).toThrow();
  });
  it("refuses real Firebase during development, including a LAN hostname", () => {
    expect(() => assertFirebaseEnvironment("192.168.1.50", "caravana-af306", false, true)).toThrow();
  });
  it.each([true, false])("permits only the exact synthetic local target (development=%s)", (development) => {
    expect(() => assertFirebaseEnvironment("127.0.0.1", "demo-caravana77-test", true, development)).not.toThrow();
    expect(() => assertFirebaseEnvironment("127.0.0.1", "caravana-af306", true, development)).toThrow();
    expect(() => assertFirebaseEnvironment("127.0.0.1", "demo-other", true, development)).toThrow();
    expect(() => assertFirebaseEnvironment("caravana-77.pages.dev", "demo-caravana77-test", true, development)).toThrow();
  });
  it("keeps published production initialization compatible", () => {
    expect(() => assertFirebaseEnvironment("caravana-77.pages.dev", "caravana-af306", false, false)).not.toThrow();
  });
});
