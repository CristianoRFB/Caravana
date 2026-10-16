import { membershipPath, type Membership } from "./memberships.ts";

export interface SnapshotDocument {
  path: string;
  data: Record<string, unknown>;
}
export interface MembershipMigrationPlan {
  version: 1;
  mode: "dry-run";
  creates: { path: string; before: null; after: Membership }[];
  skipped: string[];
  conflicts: { path: string; reason: string }[];
}

// Pure planner: no Firebase SDK, credentials, filesystem or writes.
// It never rewrites admins, organizations or operational/financial documents.
export function planMembershipMigration(documents: readonly SnapshotDocument[], timestamp: string): MembershipMigrationPlan {
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error("A migration timestamp is required.");
  const plan: MembershipMigrationPlan = { version: 1, mode: "dry-run", creates: [], skipped: [], conflicts: [] };
  const byPath = new Map<string, SnapshotDocument>();
  for (const document of documents) {
    if (byPath.has(document.path)) plan.conflicts.push({ path: document.path, reason: "Duplicate snapshot path" });
    byPath.set(document.path, document);
  }
  for (const admin of [...byPath.values()].filter((document) => /^admins\/[^/]+$/.test(document.path)).sort((a, b) => a.path.localeCompare(b.path))) {
    const uid = admin.path.slice("admins/".length);
    const organizationId = admin.data.organizationId;
    if (typeof organizationId !== "string" || !organizationId || !byPath.has(`organizations/${organizationId}`)) {
      plan.conflicts.push({ path: admin.path, reason: "Missing organization; preserve legacy admin for investigation" });
      continue;
    }
    // Unknown legacy roles require review rather than silently granting owner authority.
    if (admin.data.role !== "admin" && admin.data.role !== "owner") {
      plan.conflicts.push({ path: admin.path, reason: "Unmapped legacy role; no privilege granted" });
      continue;
    }
    let path: string;
    try { path = membershipPath(uid, organizationId); }
    catch { plan.conflicts.push({ path: admin.path, reason: "Invalid legacy document identifier" }); continue; }
    const existing = byPath.get(path);
    if (existing) {
      const data = existing.data;
      if (data.uid === uid && data.organizationId === organizationId && data.role === "tenant_owner" && data.status === "active") {
        plan.skipped.push(path);
      } else {
        plan.conflicts.push({ path, reason: "Existing membership differs; never overwrite, reactivate or elevate" });
      }
      continue;
    }
    plan.creates.push({ path, before: null, after: {
      uid, organizationId, role: "tenant_owner", status: "active", createdAt: timestamp, updatedAt: timestamp, legacySourcePath: admin.path,
    } });
  }
  return plan;
}

export function simulateMembershipMigration(documents: readonly SnapshotDocument[], plan: MembershipMigrationPlan): SnapshotDocument[] {
  if (plan.conflicts.length) throw new Error("Migration BLOCKED: resolve conflicts before simulating application.");
  const before = new Map(documents.map((document) => [document.path, document]));
  const additions: SnapshotDocument[] = [];
  for (const operation of plan.creates) {
    if (operation.before !== null || before.has(operation.path) || additions.some((item) => item.path === operation.path)) {
      throw new Error("Migration BLOCKED: an additive precondition changed.");
    }
    if (operation.path !== membershipPath(operation.after.uid, operation.after.organizationId) || operation.after.role !== "tenant_owner" || operation.after.status !== "active") {
      throw new Error("Migration BLOCKED: invalid membership operation.");
    }
    additions.push({ path: operation.path, data: { ...operation.after } });
  }
  return structuredClone([...documents, ...additions]);
}
