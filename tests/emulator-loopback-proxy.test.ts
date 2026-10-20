import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { isSyntheticFirestoreRead } = createRequire(import.meta.url)("../scripts/emulator-loopback-proxy.cjs") as {
  isSyntheticFirestoreRead: (request: { origin: string; path: string; method: string }) => boolean;
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
