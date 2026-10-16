import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { membershipPath } from "../src/lib/memberships";
import { watchTenantAccess, type TenantAccess } from "../src/lib/tenant-access";

const runtime = vi.hoisted(() => ({ db: null as Firestore | null }));
vi.mock("../src/lib/firebase", () => runtime);
let env: RulesTestEnvironment;
let stop: (() => void) | undefined;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { stop?.(); stop = undefined; runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());

async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "organizations/a"), { name: "Synthetic A" });
    await setDoc(doc(db, "organizations/b"), { name: "Synthetic B" });
    await setDoc(doc(db, "admins/multi"), { organizationId: "a", role: "admin" });
    for (const org of ["a", "b"]) {
      await setDoc(doc(db, membershipPath("multi", org)), { uid: "multi", organizationId: org, role: org === "a" ? "tenant_owner" : "staff", status: "active", createdAt: "2026-10-16", updatedAt: "2026-10-16" });
    }
  });
  runtime.db = env.authenticatedContext("multi").firestore();
}

describe("live tenant resolver on synthetic emulator data", () => {
  it("observes active roles, revokes access immediately and never falls back through a legacy admin", async () => {
    await seed();
    let access: TenantAccess[] | undefined;
    const errors: string[] = [];
    stop = watchTenantAccess("multi", (value) => { access = value; }, (error) => errors.push(error.message));
    await vi.waitFor(() => expect(access?.map((item) => [item.organizationId, item.role, item.source])).toEqual([["a", "tenant_owner", "membership"], ["b", "staff", "membership"]]));
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), membershipPath("multi", "a")), { status: "revoked" }));
    await vi.waitFor(() => expect(access?.map((item) => item.organizationId)).toEqual(["b"]));
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), membershipPath("multi", "b")), { status: "revoked" }));
    await vi.waitFor(() => expect(access).toEqual([]));
    expect(errors).toEqual([]);
  });
  it("preserves legacy access without implicit mutation and handles an explicit cutover policy", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations/a"), { name: "Synthetic A" });
      await setDoc(doc(context.firestore(), "admins/legacy"), { organizationId: "a", role: "admin" });
    });
    runtime.db = env.authenticatedContext("legacy").firestore();
    let access: TenantAccess[] | undefined;
    stop = watchTenantAccess("legacy", (value) => { access = value; }, () => undefined);
    await vi.waitFor(() => expect(access).toEqual([{ organizationId: "a", role: "tenant_owner", source: "legacy" }]));
    await env.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), "organizations/a"), { legacyAdminAccessEnabled: false }));
    await vi.waitFor(() => expect(access).toEqual([]));
  });
});
