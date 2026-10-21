import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { isSyntheticFirestoreRead, isSyntheticRecoveryRequest } = createRequire(import.meta.url)("../scripts/emulator-loopback-proxy.cjs") as {
  isSyntheticFirestoreRead: (request: { origin: string; path: string; method: string }) => boolean;
  isSyntheticRecoveryRequest: (request: { origin: string; path: string; method: string }, enabled: boolean) => boolean;
};
const request = { origin: "http://127.0.0.1:18080", path: "/v1/projects/demo-caravana77-test/databases/(default)/documents/memberships/synthetic/organizations/a", method: "GET" };
describe("Storage emulator loopback routing without changing external proxies", () => {
  it("routes only the exact synthetic Firestore document read locally", () => { expect(isSyntheticFirestoreRead(request)).toBe(true); });
  it.each([
    { origin: "https://firestore.googleapis.com" },
    { origin: "http://127.0.0.1:8080" },
    { origin: "http://localhost:18080" },
    { origin: "https://127.0.0.1:18080" },
    { origin: "http://user:pass@127.0.0.1:18080" },
    { path: "/v1/projects/real-project/databases/(default)/documents/memberships/user" },
    { path: "https://example.com/private" },
    { path: "/v1/projects/demo-caravana77-test/databases/(default)/documents/../../other" },
    { path: "/emulator/v1/projects/demo-caravana77-test/databases/(default)/documents" },
    { method: "POST" }, { method: "DELETE" }, { method: "PATCH" },
  ])("keeps unrelated origins, projects, endpoints and writes on their original dispatcher: %j", (patch) => {
    expect(isSyntheticFirestoreRead({ ...request, ...patch })).toBe(false);
  });
});

describe("opt-in synthetic recovery routing keeps external requests proxied", () => {
  it("permits only the fixed local hub and demo export/tenant endpoints", () => {
    for (const request of [
      { origin: "http://127.0.0.1:14400", path: "/", method: "GET" },
      { origin: "http://127.0.0.1:14400", path: "/_admin/export", method: "POST" },
      { origin: "http://127.0.0.1:19199", path: "/internal/export", method: "POST" },
      { origin: "http://127.0.0.1:18080", path: "/emulator/v1/projects/demo-caravana77-test:export", method: "POST" },
      { origin: "http://127.0.0.1:19099", path: "/identitytoolkit.googleapis.com/v2/projects/demo-caravana77-test/tenants", method: "GET" },
    ]) {
      expect(isSyntheticRecoveryRequest(request, true)).toBe(true);
      expect(isSyntheticRecoveryRequest(request, false)).toBe(false);
    }
  });
  it("rejects external origins, other projects, methods, credentials, queries and traversal", () => {
    const base = { origin: "http://127.0.0.1:18080", path: "/emulator/v1/projects/demo-caravana77-test:export", method: "POST" };
    for (const patch of [
      { origin: "https://firestore.googleapis.com" }, { origin: "http://localhost:18080" },
      { origin: "http://user:pass@127.0.0.1:18080" }, { path: "/emulator/v1/projects/caravana-af306:export" },
      { path: "/emulator/v1/projects/bdall-e3585:export" }, { method: "DELETE" },
      { path: base.path + "?project=caravana-af306" }, { path: "https://example.invalid/private" },
      { path: "/emulator/v1/projects/../../:export" },
    ]) expect(isSyntheticRecoveryRequest({ ...base, ...patch }, true)).toBe(false);
  });
});
