import { collection, doc, getDocFromServer, onSnapshot, Timestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { isActiveMembership, type TenantRole } from "./memberships";

export interface TenantAccess {
  organizationId: string;
  role: TenantRole;
  source: "membership" | "legacy";
}

// A local self-revocation must refresh the open resolver after commit even if
// the shared watch stream is simultaneously losing its tenant-only listeners.
const refreshers = new Map<string, Set<(organizationId: string) => Promise<void>>>();
export async function refreshOwnTenantAccess(uid: string, organizationId: string): Promise<void> {
  await Promise.all([...(refreshers.get(uid) || [])].map((refresh) => refresh(organizationId)));
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
  const refresh = async (organizationId: string) => {
    try {
      const snapshot = await getDocFromServer(doc(database, "memberships", uid, "organizations", organizationId));
      if (!active) return;
      if (snapshot.exists()) memberships.set(organizationId, snapshot.data()); else memberships.delete(organizationId);
      membershipsReady = true;
      publish();
    } catch (error) {
      if (active) { callback([]); fail(error instanceof Error ? error : new Error("Não foi possível confirmar seu acesso.")); }
    }
  };
  const forUser = refreshers.get(uid) || new Set<(organizationId: string) => Promise<void>>();
  forUser.add(refresh); refreshers.set(uid, forUser);
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
    forUser.delete(refresh); if (!forUser.size) refreshers.delete(uid);
    stopMemberships(); stopAdmin(); stopPolicy();
    if (expiryTimer) clearTimeout(expiryTimer);
  };
}
