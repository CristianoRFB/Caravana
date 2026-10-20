import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { pendingWrites } from "../src/lib/pending-writes";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } }));
vi.mock("../src/lib/firebase", () => runtime);
import { acceptTeamInvitation, closeTeamInvitation, issueTeamInvitation } from "../src/lib/team-invitations";
import { watchTenantAccess, type TenantAccess } from "../src/lib/tenant-access";
import { quotaOperationId, saveInternalMember } from "../src/lib/quota-operations";
let env: RulesTestEnvironment;
const future = () => Date.now() + 86400000;
const as = (uid: string) => { runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid).firestore(); return runtime.db; };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); await env.clearFirestore(); runtime.db = null; });
afterAll(async () => env?.cleanup());
async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const org of ["a", "b"]) {
      await setDoc(doc(db, "organizations", org), { status: "active", name: `Organização sintética ${org}` });
      await setDoc(doc(db, "organizationAvailability", org), { organizationId: org, status: "active" });
      await setDoc(doc(db, "memberships", `owner-${org}`, "organizations", org), { uid: `owner-${org}`, organizationId: org, role: "tenant_owner", status: "active", createdAt: "2026-10-16" });
      await setDoc(doc(db, "tenantTeam", org, "members", `owner-${org}`), { uid: `owner-${org}`, organizationId: org, role: "tenant_owner", status: "active" });
      await setDoc(doc(db, "tenantUsage", org), { organizationId: org, version: "commercial-v1", publishedCaravans: 0, activeMembers: 1, activeOwners: 1 });
      await setDoc(doc(db, "tenantEntitlements", org), { organizationId: org, limits: { activeCaravans: 2, passengersPerCaravan: 60, internalUsers: 2 }, growthEnabled: true, growthUntil: null });
    }
  }); as("owner-a");
}
async function inspect(path: string) {
  let value: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => { value = (await getDoc(doc(ctx.firestore(), path))).data(); }); return value;
}
const invite = (uid: string, role: "staff" | "tenant_owner" = "staff", generation = 0) => issueTeamInvitation("a", uid, role, generation, future(), "Convite sintético conferido");
async function rawAcceptance(db: Firestore, uid: string, role = "staff", generation = 1, actorUid = uid) {
  const old = (await inspect(`tenantInvitations/a/users/${uid}`))!; const usage = (await inspect("tenantUsage/a"))!;
  const op = quotaOperationId(); const batch = writeBatch(db);
  const before = { publishedCaravans: usage.publishedCaravans, activeMembers: usage.activeMembers as number, activeOwners: usage.activeOwners as number };
  const after = { ...before, activeMembers: before.activeMembers + 1, activeOwners: before.activeOwners + Number(role === "tenant_owner") };
  const accepted = { ...old, status: "accepted", generation, updatedAt: serverTimestamp(), acceptedAt: serverTimestamp(), lastOperationId: op };
  batch.set(doc(db, "tenantInvitations/a/users", uid), accepted); batch.set(doc(db, "invitationInboxes", uid, "organizations/a"), accepted);
  batch.set(doc(db, "memberships", uid, "organizations/a"), { uid, organizationId: "a", role, status: "active", createdAt: serverTimestamp(), updatedAt: serverTimestamp(), invitationGeneration: generation, lastQuotaOperationId: op });
  batch.set(doc(db, "tenantTeam/a/members", uid), { uid, organizationId: "a", role, status: "active", updatedAt: serverTimestamp(), lastQuotaOperationId: op });
  batch.update(doc(db, "tenantUsage/a"), { ...after, updatedAt: serverTimestamp(), lastQuotaOperationId: op });
  batch.set(doc(db, "tenantQuotaOperations", op), { organizationId: "a", entityId: uid, kind: "member", action: "member_accepted", actorUid, at: serverTimestamp(), requestHash: "a".repeat(64), reason: "Aceite SDK sintético", before, after, beforeStatus: "absent", afterStatus: "active", beforeRole: "", afterRole: role, invitationGeneration: generation });
  return batch;
}
describe("UID-bound tenant invitations with transactional consent and quotas", () => {
  it("issues without granting access, accepts once, keeps membership/directory/inbox/counters consistent", async () => {
    await seed(); const op = quotaOperationId(); const deadline = future();
    expect(await issueTeamInvitation("a", "guest", "staff", 0, deadline, "Conta conferida", op)).toBe(1);
    expect(await issueTeamInvitation("a", "guest", "staff", 0, deadline, "Conta conferida", op)).toBe(1);
    expect(await inspect("memberships/guest/organizations/a")).toBeUndefined();
    expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(1);
    as("guest"); const accepted = quotaOperationId(); expect(await acceptTeamInvitation("a", "guest", 1, "staff", accepted)).toBe(1);
    expect(await acceptTeamInvitation("a", "guest", 1, "staff", accepted)).toBe(1);
    expect(await acceptTeamInvitation("a", "guest", 1, "staff")).toBe(1);
    expect(await inspect("memberships/guest/organizations/a")).toMatchObject({ role: "staff", status: "active", invitationGeneration: 1 });
    expect(await inspect("tenantTeam/a/members/guest")).toMatchObject({ role: "staff", status: "active" });
    expect(await inspect("invitationInboxes/guest/organizations/a")).toMatchObject({ status: "accepted", generation: 1 });
    expect(await inspect("tenantUsage/a")).toMatchObject({ activeMembers: 2, activeOwners: 1 });
    as("owner-a"); expect((await getDocs(query(collection(runtime.db!, "tenantQuotaOperations"), where("organizationId", "==", "a")))).size).toBe(1);
  });
  it("accepts a complete valid SDK transaction and denies unlinked writes or receipt reuse", async () => {
    await seed(); await invite("guest"); as("guest");
    await assertFails(updateDoc(doc(runtime.db!, "tenantInvitations/a/users/guest"), { status: "accepted", acceptedAt: serverTimestamp(), updatedAt: serverTimestamp(), lastOperationId: quotaOperationId() }));
    await assertFails(updateDoc(doc(runtime.db!, "invitationInboxes/guest/organizations/a"), { role: "tenant_owner" }));
    await (await rawAcceptance(runtime.db!, "guest")).commit();
    const membership = await inspect("memberships/guest/organizations/a");
    await assertFails(updateDoc(doc(runtime.db!, "memberships/guest/organizations/a"), { role: "tenant_owner", updatedAt: serverTimestamp(), lastQuotaOperationId: membership!.lastQuotaOperationId }));
    await assertFails(updateDoc(doc(runtime.db!, "tenantQuotaOperations", membership!.lastQuotaOperationId as string), { afterRole: "tenant_owner" }));
    expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(2);
  });
  it("refreshes the issuer's open resolver after self revocation", async () => {
    await seed(); await invite("second-owner", "tenant_owner"); as("second-owner"); await acceptTeamInvitation("a", "second-owner", 1, "tenant_owner");
    as("owner-a"); let access: TenantAccess[] = []; const stop = watchTenantAccess("owner-a", (value) => { access = value; }, () => undefined);
    try {
      await vi.waitFor(() => expect(access).toHaveLength(1));
      await saveInternalMember("a", "owner-a", "tenant_owner", "revoked", "Transferência conferida");
      expect(await inspect("memberships/owner-a/organizations/a")).toMatchObject({ status: "revoked" });
      await vi.waitFor(() => expect(access).toEqual([]), { timeout: 10000 });
    } finally { stop(); }
  });
  it("cannot attach another UID's canonical invitation to a valid expiry event", async () => {
    await seed(); await invite("guest");
    await env.withSecurityRulesDisabled(async (ctx) => { for (const path of ["tenantInvitations/a/users/guest", "invitationInboxes/guest/organizations/a"]) await updateDoc(doc(ctx.firestore(), path), { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }); });
    as("guest"); const before = (await inspect("tenantInvitations/a/users/guest"))!; const op = quotaOperationId();
    const after = { ...before, status: "expired", updatedAt: serverTimestamp(), lastOperationId: op };
    const batch = writeBatch(runtime.db!);
    batch.set(doc(runtime.db!, "tenantInvitations/a/users/guest"), after);
    batch.set(doc(runtime.db!, "invitationInboxes/guest/organizations/a"), after);
    batch.set(doc(runtime.db!, "tenantInvitations/a/events", op), { organizationId: "a", uid: "guest", actorUid: "guest", action: "invitation_expired", at: serverTimestamp(), requestHash: "a".repeat(64), reason: "Expiração pelo destinatário", before, after });
    // The caller has no owner authority. A valid event for guest must not
    // authorize an unaudited owner invitation for a second account it controls.
    batch.set(doc(runtime.db!, "tenantInvitations/a/users/rogue"), { ...before, uid: "rogue", role: "tenant_owner", status: "pending", expiresAt: Timestamp.fromMillis(future()), lastOperationId: op });
    await assertFails(batch.commit());
    expect(await inspect("tenantInvitations/a/users/rogue")).toBeUndefined();
    expect((await inspect("tenantInvitations/a/users/guest"))?.status).toBe("pending");
    await closeTeamInvitation("a", "guest", 1, "expired", "Expiração legítima isolada");
    expect((await inspect("tenantInvitations/a/users/guest"))?.status).toBe("expired");
  });
  it("binds issuer identity and limits roles in a fully linked issuance batch", async () => {
    await seed();
    await expect(invite("owner-a")).rejects.toThrow("própria conta");
    for (const patch of [{ issuedBy: "owner-b" }, { role: "platform_owner" }, { generation: 9 }]) {
      const op = quotaOperationId(); const after = { organizationId: "a", uid: "forged", role: "staff", status: "pending", generation: 1, issuedBy: "owner-a", issuedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(future()), acceptedAt: null, updatedAt: serverTimestamp(), lastOperationId: op, ...patch };
      const batch = writeBatch(runtime.db!); batch.set(doc(runtime.db!, "tenantInvitations/a/users/forged"), after); batch.set(doc(runtime.db!, "invitationInboxes/forged/organizations/a"), after);
      batch.set(doc(runtime.db!, "tenantInvitations/a/events", op), { organizationId: "a", uid: "forged", actorUid: "owner-a", action: "invitation_issued", at: serverTimestamp(), requestHash: "a".repeat(64), reason: "Emissão SDK forjada", before: null, after });
      await assertFails(batch.commit());
    }
    expect(await inspect("tenantInvitations/a/users/forged")).toBeUndefined();
  });
  it("keeps the last owner after a second owner genuinely accepts and protects membership history", async () => {
    await seed(); await invite("second-owner", "tenant_owner"); as("second-owner"); await acceptTeamInvitation("a", "second-owner", 1, "tenant_owner");
    as("owner-a"); await saveInternalMember("a", "owner-a", "staff", "active", "Transferência entre owners");
    as("second-owner"); await expect(saveInternalMember("a", "second-owner", "staff", "active", "Tentativa último owner")).rejects.toThrow("responsável ativo");
    await saveInternalMember("a", "owner-a", "staff", "revoked", "Revogação após transferência");
    expect(await inspect("tenantUsage/a")).toMatchObject({ activeMembers: 1, activeOwners: 1 });
    expect(await inspect("tenantInvitations/a/users/second-owner")).toMatchObject({ status: "accepted" });
  });
  it("rejects the wrong UID, role and a complete SDK privilege-escalation batch", async () => {
    await seed(); await invite("guest"); as("other");
    await expect(acceptTeamInvitation("a", "guest", 1, "staff")).rejects.toThrow("outro usuário");
    as("guest"); await expect(acceptTeamInvitation("a", "guest", 1, "tenant_owner")).rejects.toThrow("papel diferente");
    await assertFails((await rawAcceptance(runtime.db!, "guest", "tenant_owner")).commit());
    as("owner-a"); await assertFails((await rawAcceptance(runtime.db!, "guest", "staff", 1, "owner-a")).commit());
    expect(await inspect("memberships/guest/organizations/a")).toBeUndefined();
  });
  it("resends in a new generation, rejects stale acceptance and preserves both immutable issue receipts", async () => {
    await seed(); await invite("guest"); await invite("guest", "tenant_owner", 1);
    await expect(invite("guest", "staff", 1)).rejects.toThrow("geração atual");
    as("guest"); await expect(acceptTeamInvitation("a", "guest", 1, "staff")).rejects.toThrow("obsoleta");
    await assertFails((await rawAcceptance(runtime.db!, "guest", "staff", 1)).commit());
    await acceptTeamInvitation("a", "guest", 2, "tenant_owner");
    expect(await inspect("tenantUsage/a")).toMatchObject({ activeMembers: 2, activeOwners: 2 });
    as("owner-a"); expect((await getDocs(collection(runtime.db!, "tenantInvitations/a/events"))).size).toBe(2);
  });
  it("revokes idempotently, prevents acceptance, then permits a genuinely new generation", async () => {
    await seed(); await invite("guest"); const op = quotaOperationId();
    await closeTeamInvitation("a", "guest", 1, "revoked", "Revogado por owner", op); await closeTeamInvitation("a", "guest", 1, "revoked", "Revogado por owner", op);
    await closeTeamInvitation("a", "guest", 1, "revoked", "Revogação repetida");
    as("guest"); await expect(acceptTeamInvitation("a", "guest", 1, "staff")).rejects.toThrow("revogado");
    as("owner-a"); await invite("guest", "staff", 1); as("guest"); await acceptTeamInvitation("a", "guest", 2, "staff");
    expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(2);
  });
  it("rejects expired invitation through service and SDK; records expiry and allows owner reissue", async () => {
    await seed(); await invite("guest");
    await env.withSecurityRulesDisabled(async (ctx) => { const patch = { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }; await updateDoc(doc(ctx.firestore(), "tenantInvitations/a/users/guest"), patch); await updateDoc(doc(ctx.firestore(), "invitationInboxes/guest/organizations/a"), patch); });
    as("guest"); await expect(acceptTeamInvitation("a", "guest", 1, "staff")).rejects.toThrow("expirado");
    await assertFails((await rawAcceptance(runtime.db!, "guest")).commit());
    await closeTeamInvitation("a", "guest", 1, "expired", "Prazo sintético encerrado");
    as("owner-a"); await invite("guest", "staff", 1);
    expect(await inspect("tenantInvitations/a/users/guest")).toMatchObject({ status: "pending", generation: 2 });
  });
  it("serializes two guests at the final team slot and leaves the loser pending until a member is revoked", async () => {
    await seed(); await invite("one"); await invite("two");
    as("one"); const first = acceptTeamInvitation("a", "one", 1, "staff"); as("two"); const second = acceptTeamInvitation("a", "two", 1, "staff");
    const results = await Promise.allSettled([first, second]); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const winner = results[0].status === "fulfilled" ? "one" : "two"; const loser = winner === "one" ? "two" : "one";
    expect(await inspect(`tenantInvitations/a/users/${loser}`)).toMatchObject({ status: "pending" });
    expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(2);
    as("owner-a"); await saveInternalMember("a", winner, "staff", "revoked", "Liberar a última vaga");
    as(loser); await acceptTeamInvitation("a", loser, 1, "staff"); expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(2);
  });
  it("does not reactivate a revoked member by replaying historical acceptance; requires a new invitation", async () => {
    await seed(); await invite("guest"); as("guest"); const op = quotaOperationId(); await acceptTeamInvitation("a", "guest", 1, "staff", op);
    as("owner-a"); await saveInternalMember("a", "guest", "staff", "revoked", "Revogar acesso aceito");
    as("guest"); await acceptTeamInvitation("a", "guest", 1, "staff", op); await acceptTeamInvitation("a", "guest", 1, "staff");
    expect(await inspect("memberships/guest/organizations/a")).toMatchObject({ status: "revoked" });
    as("owner-a"); await invite("guest", "staff", 1); as("guest"); await acceptTeamInvitation("a", "guest", 2, "staff");
    expect(await inspect("memberships/guest/organizations/a")).toMatchObject({ status: "active", invitationGeneration: 2 });
  });
  it("enforces authoritative suspension even if public policy/projection are stale and retains pending invitations", async () => {
    await seed(); await invite("guest");
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), "organizations/a"), { status: "suspended" }); });
    as("guest"); await expect(acceptTeamInvitation("a", "guest", 1, "staff")).rejects.toBeDefined();
    await assertFails((await rawAcceptance(runtime.db!, "guest")).commit());
    as("owner-a"); await expect(invite("another")).rejects.toThrow("suspensa");
    await closeTeamInvitation("a", "guest", 1, "revoked", "Revogar durante suspensão");
    expect((await inspect("tenantUsage/a"))?.activeMembers).toBe(1);
  });
  it("blocks acceptance after downgrade/quota exhaustion while permitting revocation and retaining history", async () => {
    await seed(); await invite("one"); await invite("two"); as("one"); await acceptTeamInvitation("a", "one", 1, "staff"); as("two");
    await expect(acceptTeamInvitation("a", "two", 1, "staff")).rejects.toThrow("continua pendente");
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), "tenantEntitlements/a"), { growthEnabled: false }); });
    await assertFails((await rawAcceptance(runtime.db!, "two")).commit());
    as("owner-a"); await saveInternalMember("a", "one", "staff", "revoked", "Revogar preservando histórico");
    expect(await inspect("tenantInvitations/a/users/one")).toMatchObject({ status: "accepted" });
  });
  it("isolates A/B/global/staff and rejects inbox or audit forgery", async () => {
    await seed(); await invite("guest");
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), "platformOwners/platform"), { status: "active" }); await setDoc(doc(ctx.firestore(), "memberships/staff/organizations/a"), { uid: "staff", organizationId: "a", role: "staff", status: "active" }); });
    for (const uid of ["owner-b", "platform", "staff", "other"]) {
      const db = as(uid); await expect(invite("new-person")).rejects.toBeDefined();
      await assertFails(getDoc(doc(db, "tenantInvitations/a/users/guest")));
      await assertFails(getDocs(collection(db, "invitationInboxes/guest/organizations")));
      await assertFails(updateDoc(doc(db, "invitationInboxes/guest/organizations/a"), { role: "tenant_owner" }));
    }
    as("owner-a"); const events = await getDocs(collection(runtime.db!, "tenantInvitations/a/events"));
    await assertFails(updateDoc(events.docs[0].ref, { actorUid: "other" }));
    await expect(saveInternalMember("a", "new-person", "staff", "active", "Bypass de consentimento")).rejects.toThrow("convite");
    await expect(saveInternalMember("a", "owner-a", "staff", "active", "Último owner")).rejects.toThrow("responsável ativo");
  });
});
