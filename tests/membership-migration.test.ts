import { describe, expect, it } from "vitest";
import { membershipPath, isActiveMembership } from "../src/lib/memberships";
import { planMembershipMigration, simulateMembershipMigration, type SnapshotDocument } from "../src/lib/membership-migration";

const at = "2026-10-16T17:15:00.000Z";
const fixture: SnapshotDocument[] = [
  { path: "organizations/org-a", data: { name: "Organização sintética A", untouched: true } },
  { path: "organizations/org-b", data: { name: "Organização sintética B" } },
  { path: "admins/synthetic-owner-a", data: { organizationId: "org-a", role: "admin" } },
  { path: "admins/synthetic-owner-b", data: { organizationId: "org-b", role: "admin" } },
  { path: "caravans/legacy-trip-id", data: { organizationId: "org-a", slug: "legacy-slug", capacity: 25 } },
  { path: "registrations/legacy-passenger-id", data: { organizationId: "org-a", caravanId: "legacy-trip-id", paymentTotalCents: 8500 } },
  { path: "registrations/legacy-passenger-id/payments/legacy-payment-id", data: { amountCents: 8500, status: "active" } },
  { path: "registrations/legacy-passenger-id/proofs/current", data: { content: "SYNTHETIC", contentType: "application/pdf" } },
];

describe("additive membership migration planning with synthetic snapshots", () => {
  it("plans only memberships, does not mutate input and preserves every original path and field", () => {
    const before = structuredClone(fixture);
    const plan = planMembershipMigration(fixture, at);
    expect(plan.mode).toBe("dry-run");
    expect(plan.conflicts).toEqual([]);
    expect(plan.creates).toHaveLength(2);
    expect(plan.creates.every((operation) => operation.path.startsWith("memberships/") && operation.before === null)).toBe(true);
    expect(fixture).toEqual(before);
    const after = simulateMembershipMigration(fixture, plan);
    expect(after.slice(0, fixture.length)).toEqual(before);
    expect(after).toHaveLength(fixture.length + 2);
    expect(planMembershipMigration(after, at).creates).toEqual([]);
    expect(planMembershipMigration(after, at).skipped).toHaveLength(2);
  });
  it.each(["revoked", "staff", "foreign-uid"])("never overwrites an existing %s membership", (variation) => {
    const existing = { uid: "synthetic-owner-a", organizationId: "org-a", role: "tenant_owner", status: "active", createdAt: at, updatedAt: at };
    if (variation === "revoked") existing.status = "revoked";
    if (variation === "staff") existing.role = "staff";
    if (variation === "foreign-uid") existing.uid = "foreign";
    const documents = [...fixture, { path: membershipPath("synthetic-owner-a", "org-a"), data: existing }];
    const plan = planMembershipMigration(documents, at);
    expect(plan.conflicts).toHaveLength(1);
    expect(() => simulateMembershipMigration(documents, plan)).toThrow("BLOCKED");
  });
  it("reports orphan admins, unknown roles and duplicate paths without writing", () => {
    const plan = planMembershipMigration([
      ...fixture,
      fixture[0],
      { path: "admins/orphan", data: { organizationId: "absent", role: "admin" } },
      { path: "admins/unmapped", data: { organizationId: "org-a", role: "platform_owner" } },
    ], at);
    expect(plan.conflicts).toHaveLength(3);
    expect(() => simulateMembershipMigration(fixture, plan)).toThrow("BLOCKED");
  });
  it("refuses stale plans instead of replacing documents added after planning", () => {
    const plan = planMembershipMigration(fixture, at);
    const conflict = { path: plan.creates[0].path, data: { status: "revoked" } };
    expect(() => simulateMembershipMigration([...fixture, conflict], plan)).toThrow("precondition");
  });
  it("uses unambiguous nested paths without changing original UID or organization ID", () => {
    expect(membershipPath("a__b", "c")).not.toBe(membershipPath("a", "b__c"));
    expect(membershipPath("synthetic-owner-a", "org-a")).toBe("memberships/synthetic-owner-a/organizations/org-a");
    expect(() => membershipPath("", "org-a")).toThrow();
    expect(() => membershipPath("u", "a/b")).toThrow();
  });
  it("segregates platform roles and rejects revoked, malformed or foreign memberships", () => {
    const data = { uid: "u", organizationId: "a", role: "tenant_owner", status: "active" };
    expect(isActiveMembership(data, "u", "a")).toBe(true);
    for (const patch of [{ uid: "other" }, { organizationId: "b" }, { status: "revoked" }, { role: "platform_owner" }]) {
      expect(isActiveMembership({ ...data, ...patch }, "u", "a")).toBe(false);
    }
  });
});
