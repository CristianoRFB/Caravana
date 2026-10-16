import { collection, doc, onSnapshot, Timestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { isActiveMembership, type TenantRole } from "./memberships";

export interface TenantAccess {
  organizationId: string;
  role: TenantRole;
  source: "membership" | "legacy";
}

// The resolver supplies UI context only. Firestore Rules independently authorize every read/write.
export function watchTenantAccess(uid: string, callback: (access: TenantAccess[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  const database = db;
  let active = true;
  let membershipsReady = false;
  let adminReady = false;
  let policyReady = false;
  let legacyOrg = "";
  let policy: Record<string, unknown> | null = null;
  let memberships = new Map<string, Record<string, unknown>>();
  let stopPolicy: Unsubscribe = () => undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  function publish() {
    if (!active || !membershipsReady || !adminReady || (legacyOrg && !policyReady)) return;
    if (expiryTimer) clearTimeout(expiryTimer);
    const access: TenantAccess[] = [];
    for (const [organizationId, data] of memberships) {
      if (isActiveMembership(data, uid, organizationId)) access.push({ organizationId, role: data.role, source: "membership" });
    }
    const deadline = policy?.legacyAdminAccessUntil;
    const deadlineValid = deadline === undefined || deadline instanceof Timestamp;
    const remaining = deadline instanceof Timestamp ? deadline.toMillis() - Date.now() : undefined;
    if (legacyOrg && !memberships.has(legacyOrg) && policy !== null && policy.legacyAdminAccessEnabled !== false && deadlineValid && (remaining === undefined || remaining > 0)) {
      access.push({ organizationId: legacyOrg, role: "tenant_owner", source: "legacy" });
      if (remaining !== undefined) expiryTimer = setTimeout(publish, Math.min(remaining + 1, 2147483647));
    }
    callback(access.sort((a, b) => a.organizationId.localeCompare(b.organizationId)));
  }
  const stopMemberships = onSnapshot(collection(database, "memberships", uid, "organizations"), (snapshot) => {
    memberships = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
    membershipsReady = true;
    publish();
  }, (error) => { if (active) fail(error); });
  const stopAdmin = onSnapshot(doc(database, "admins", uid), (snapshot) => {
    stopPolicy();
    if (expiryTimer) clearTimeout(expiryTimer);
    const value = snapshot.data()?.organizationId;
    legacyOrg = typeof value === "string" ? value : "";
    adminReady = true;
    policyReady = !legacyOrg;
    policy = null;
    if (legacyOrg) {
      const expectedOrg = legacyOrg;
      stopPolicy = onSnapshot(doc(database, "organizations", legacyOrg), (organization) => {
        if (!active || expectedOrg !== legacyOrg) return;
        policy = organization.data() || {};
        policyReady = true;
        publish();
      }, () => {
        if (!active || expectedOrg !== legacyOrg) return;
        policy = null;
        policyReady = true;
        publish();
      });
    }
    publish();
  }, (error) => { if (active) fail(error); });
  return () => {
    active = false;
    stopMemberships(); stopAdmin(); stopPolicy();
    if (expiryTimer) clearTimeout(expiryTimer);
  };
}
