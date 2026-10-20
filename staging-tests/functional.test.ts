import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnv } from "vite";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut, type Auth } from "firebase/auth";
import { collection, doc, getDocFromServer, getDocsFromServer, getFirestore, query, setDoc, updateDoc, where, terminate, setLogLevel, type Firestore } from "firebase/firestore";
import type { Caravan, Registration } from "../src/lib/types";
import { assertStagingBuild } from "../scripts/staging-target.mjs";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: null as Auth | null, firebaseConfigured: true, assertIdentityAllowed: () => undefined }));
vi.mock("../src/lib/firebase", () => runtime);
import { reserveSeat, setPortalAccessRevoked, uploadProof, loadProof } from "../src/lib/data";
import { uploadMinorAuthorization, loadMinorAuthorization, reviewAuthorization } from "../src/lib/documents";
import { createReservationAttempt } from "../src/lib/reservation-attempt";
import { onboardTenant } from "../src/lib/platform";
import { createLimitedCaravan, updateLimitedCaravan, saveInternalMember } from "../src/lib/quota-operations";
import { issueTeamInvitation, acceptTeamInvitation } from "../src/lib/team-invitations";
import { recordPassengerPayment, createCaravanExpense, voidCaravanExpense } from "../src/lib/financial-operations";
import { reviewPayment, toggleCheckin, cancelRegistration } from "../src/lib/registration-operations";
import { importLegacyRegistrationsDetailed, rollbackImportBatch } from "../src/lib/import-operations";
import { assignTenantPlan } from "../src/lib/commercial-data";
interface Account { email: string; password: string; uid: string }
interface Client { app: FirebaseApp; auth: Auth; db: Firestore }
const clients = new Map<string, Client>(); let accounts: Record<string, Account>; let config: Record<string, string>;
let tripA: Caravan; let regId: string; let cancelledId: string; const runId = randomUUID().replaceAll("-", "");
const operation = () => randomUUID().replaceAll("-", "");
function syntheticPdf() {
  const content = "BT /F1 12 Tf 40 760 Td (COMPROVANTE FICTICIO STAGING - SEM VALOR BANCARIO) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const start = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return new File([pdf], "comprovante-ficticio-staging.pdf", { type: "application/pdf" });
}
const publicForm = { passengerName: "Pessoa Fictícia Homologação", birthDate: "1990-01-01", phone: "00000000000", email: "passenger@caravana77.invalid", city: "Cidade fictícia", boardingPointId: "staging-point", boardingPointName: "Terminal fictício", emergencyContact: "Contato fictício sem valor real", notes: "STAGING: pessoa e operação fictícias. Nenhum pagamento bancário." };
async function client(key: string) {
  const existing = clients.get(key); if (existing) return existing;
  const app = initializeApp(config, `staging-${runId}-${key}`); const auth = initializeAuth(app, { persistence: inMemoryPersistence }); const db = getFirestore(app);
  if (key !== "guest") {
    const account = accounts[key];
    try { const result = await signInWithEmailAndPassword(auth, account.email, account.password); if (result.user.uid !== account.uid) throw new Error("UID mismatch"); }
    catch { throw new Error(`Staging login failed for synthetic ${key}; credential diagnostics suppressed.`); }
  }
  const value = { app, auth, db }; clients.set(key, value); return value;
}
async function as(key: string) { const value = await client(key); runtime.db = value.db; runtime.auth = value.auth; return value; }
async function read(path: string, db = runtime.db!) { return (await getDocFromServer(doc(db, path))).data()!; }
const registration = async () => ({ ...await read(`registrations/${regId}`), id: regId }) as Registration;
async function deny(promise: Promise<unknown>) { let code: unknown; try { await promise; } catch (cause) { code = (cause as { code?: unknown }).code; } expect(code).toBe("permission-denied"); }

beforeAll(async () => {
  if (process.env.STAGING_CONFIRM_PROJECT !== "bdall-e3585" || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_TOKEN) throw new Error("Explicit isolated staging confirmation required; no emulator/admin credentials accepted by SDK tests.");
  const environment = loadEnv("staging", process.cwd(), "VITE_"); assertStagingBuild(environment);
  const saved = JSON.parse(readFileSync(".firebase/staging-accounts.json", "utf8")); if (saved.projectId !== "bdall-e3585") throw new Error("Foreign credential target."); accounts = saved.accounts;
  config = { apiKey: environment.VITE_FIREBASE_API_KEY, authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN, projectId: "bdall-e3585", messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: environment.VITE_FIREBASE_APP_ID };
  setLogLevel("silent"); await as("ownerA"); tripA = { ...await read("caravans/staging-ride-a"), id: "staging-ride-a" } as Caravan;
  await as("platform"); const contract = await read("subscriptions/staging-org-a");
  if (contract.status === "past_due" && contract.reason === "Homologação fictícia de suspensão comercial") await assignTenantPlan({ organizationId: "staging-org-a", planId: "essencial", status: "active", setupWaived: true, reason: "Retomada do teste fictício interrompido" }, operation(), contract.revision);
  writeFileSync(".firebase/staging-last-run.json", JSON.stringify({ projectId: "bdall-e3585", runId, status: "IN_PROGRESS", startedAt: new Date().toISOString() }));
});
afterAll(async () => { for (const item of clients.values()) { await signOut(item.auth); await terminate(item.db); await deleteApp(item.app); } runtime.db = null; runtime.auth = null; });

describe("real isolated Spark staging — synthetic SDK journeys only", () => {
  it("authenticates the synthetic owner and verifies server-backed plans, brands and counters", async () => {
    const { auth } = await as("ownerA"); const token = await auth.currentUser!.getIdTokenResult(true); expect(token.claims.aud).toBe("bdall-e3585");
    expect((await read("subscriptions/staging-org-a")).planId).toBe("essencial"); expect((await read("tenantUsage/staging-org-a")).activeOwners).toBe(1);
    await as("guest"); expect((await read("publicTenantSettings/staging-org-a")).primaryColor).toBe("#1d4ed8"); expect((await read("publicTenantSettings/staging-org-b")).primaryColor).toBe("#166534");
    await deny(getDocFromServer(doc(runtime.db!, "subscriptions/staging-org-a")));
    await as("ownerB"); expect((await read("subscriptions/staging-org-b")).planId).toBe("pro"); await deny(getDocFromServer(doc(runtime.db!, "subscriptions/staging-org-a")));
  });
  it("reserves once through Auth/Firestore and preserves the exact retry receipt", async () => {
    await as("passenger"); const attempt = createReservationAttempt(); const before = (await read("caravans/staging-ride-a")).reservedSeats;
    regId = await reserveSeat(tripA, publicForm, attempt); expect(await reserveSeat(tripA, publicForm, attempt)).toBe(regId);
    expect((await read("caravans/staging-ride-a")).reservedSeats).toBe(before + 1);
    expect((await read(`registrations/${regId}`)).passengerName).toBe(publicForm.passengerName);
    writeFileSync(".firebase/staging-last-run.json", JSON.stringify({ projectId: "bdall-e3585", runId, regId, attempt, status: "IN_PROGRESS" }));
  });
  it("denies B/global/anonymous private ledger access, self-grants and mutable seat counters", async () => {
    // An active opaque passenger link is a separate capability, preserved by the existing contract.
    for (const key of ["ownerB", "platform", "guest"]) { await as(key); await deny(getDocsFromServer(collection(runtime.db!, `registrations/${regId}/payments`))); await deny(getDocFromServer(doc(runtime.db!, `registrations/${regId}/proofs/current`))); }
    await as("platform"); await deny(setDoc(doc(runtime.db!, "memberships", accounts.platform.uid, "organizations", "staging-org-a"), { uid: accounts.platform.uid, organizationId: "staging-org-a", role: "tenant_owner", status: "active" }));
    await as("ownerA"); await deny(updateDoc(doc(runtime.db!, "tenantUsage/staging-org-a"), { publishedCaravans: 0 })); await deny(updateDoc(doc(runtime.db!, "caravans/staging-ride-a"), { reservedSeats: 0 }));
    await as("guest"); await deny(getDocsFromServer(query(collection(runtime.db!, "registrations"), where("organizationId", "==", "staging-org-a"))));
  });
  it("stores a tiny synthetic PDF privately in free-tier Firestore with MIME and size validation", async () => {
    await as("passenger"); const reg = await registration(); const file = syntheticPdf(); expect(file.size).toBeLessThan(1024);
    await expect(uploadProof(reg, new File(["<html>not a PDF</html>"], "bad.pdf", { type: "application/pdf" }))).rejects.toThrow("conteúdo");
    await expect(uploadProof(reg, new File([new Uint8Array(614401)], "too-large.pdf", { type: "application/pdf" }))).rejects.toThrow("600 KB");
    await uploadProof(reg, file);
    for (const key of ["guest", "ownerB", "platform"]) { await as(key); await deny(getDocFromServer(doc(runtime.db!, `registrations/${regId}/proofs/current`))); }
    await as("ownerA"); const current = await registration(); expect(current.paymentStatus).toBe("awaiting_review");
    expect(await (await loadProof(current)).text()).toContain("COMPROVANTE FICTICIO STAGING");
    const stored = await read(`registrations/${regId}/proofs/current`); expect(stored.contentType).toBe("application/pdf"); expect(stored.retentionDays).toBeGreaterThan(0);
  });
  it("creates a complete organization with the real Rules and safely replays onboarding", async () => {
    await as("platform"); const id = operation(); const slug = `staging-nova-${runId.slice(0, 10)}`;
    const input = { name: "Nova Organizadora Fictícia STAGING", slug, ownerUid: accounts.ownerA.uid, ownerUidConfirmed: true, planId: "pro" as const, setupWaived: true };
    expect(await onboardTenant(input, id)).toBe(slug); expect(await onboardTenant(input, id)).toBe(slug);
    expect((await read(`tenantUsage/${slug}`))).toMatchObject({ publishedCaravans: 0, activeMembers: 1, activeOwners: 1 });
    await as("ownerA"); expect((await read(`subscriptions/${slug}`)).planId).toBe("pro");
    await as("guest"); expect((await read(`tenantSlugs/${slug}`)).organizationId).toBe(slug);
  });
  it("serializes the final published caravan slot and archives without removing history", async () => {
    await as("ownerA"); const ids = [operation(), operation()];
    const payload = { name: "Caravana Fictícia de Quota", slug: `staging-quota-${runId.slice(0, 8)}`, event: "Fictício", description: "Homologação sem pagamentos.", date: "2026-12-15", departureTime: "06:00", returnTime: "22:00", city: "Cidade fictícia", destination: "Destino fictício", address: "Local fictício", priceCents: 8500, capacity: 25, status: "published" as const, pixKey: "", pixReceiver: "", whatsapp: "", boardingPoints: tripA.boardingPoints, benefits: [], rules: [], faqs: [], announcements: [] };
    const results = await Promise.allSettled(ids.map((id) => createLimitedCaravan("staging-org-a", payload, id))); expect(results.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    const winner = results[0].status === "fulfilled" ? ids[0] : ids[1]; expect((await read("tenantUsage/staging-org-a")).publishedCaravans).toBe(2);
    const archive = operation(); await updateLimitedCaravan(winner, { status: "archived" }, archive); await updateLimitedCaravan(winner, { status: "archived" }, archive);
    expect((await read("tenantUsage/staging-org-a")).publishedCaravans).toBe(1); expect((await read(`caravans/${winner}`)).status).toBe("archived");
  });
  it("records only fictitious ledger entries, reviews and reverses an audited idempotent check-in", async () => {
    await as("ownerA"); const reg = await registration(); const payment = operation();
    const input = { amountCents: 2500, method: "other" as const, paymentDate: "2026-10-20", notes: "LANÇAMENTO FICTÍCIO. Nenhuma transação bancária." };
    await recordPassengerPayment(reg, input, payment); await recordPassengerPayment(reg, input, payment);
    expect((await registration()).paymentTotalCents).toBe(2500);
    const review = operation(); await reviewPayment(reg, true, "Conferência fictícia manual", review); await reviewPayment(reg, true, "Conferência fictícia manual", review);
    const checkin = operation(); await toggleCheckin(reg, true, checkin); const at = (await registration()).checkedInAt;
    await toggleCheckin(reg, true, checkin); expect((await registration()).checkedInAt).toEqual(at);
    await toggleCheckin(reg, false, operation()); expect((await registration()).checkedInAt).toBeNull();
    const expense = operation(); await createCaravanExpense(tripA.id, tripA.organizationId, { description: "Despesa fictícia de homologação", category: "outros", amountCents: 1000, date: "2026-10-20", notes: "Sem pagamento real" }, expense);
    await voidCaravanExpense(tripA.id, expense, "Anulação fictícia auditada", operation()); expect((await read(`caravans/${tripA.id}/expenses/${expense}`)).status).toBe("voided");
    await deny(updateDoc(doc(runtime.db!, "financialOperations", payment), { actorUid: "forged" }));
  });
  it("cancels and rolls back CSV through real transactions without deleting historical records", async () => {
    await as("passenger"); cancelledId = await reserveSeat(tripA, { ...publicForm, passengerName: "Pessoa Fictícia Cancelamento" });
    await as("ownerA"); const cancelled = { ...await read(`registrations/${cancelledId}`), id: cancelledId } as Registration; const cancel = operation();
    await cancelRegistration(cancelled, cancel); await cancelRegistration(cancelled, cancel); expect((await read(`registrations/${cancelledId}`)).registrationStatus).toBe("cancelled");
    await setPortalAccessRevoked(cancelledId, true); await as("guest"); await deny(getDocFromServer(doc(runtime.db!, `registrations/${cancelledId}`))); await as("ownerA");
    const rows = [1, 2].map((n) => ({ line: n + 1, passengerName: `Pessoa Fictícia CSV ${runId.slice(0, 4)} ${n}`, phone: "", email: "", city: "Cidade fictícia", boardingPointId: "staging-point", boardingPointName: "Terminal fictício", emergencyContact: "", notes: `STAGING CSV ${runId}`, amountCents: 8500, paymentTotalCents: 0, paymentStatus: "pending" as const, registrationStatus: "awaiting_payment" as const, cpf: `${runId.replace(/\D/g, "").slice(0, 9).padEnd(9, "0")}${String(n).padStart(2, "0")}` }));
    const batch = operation(); const first = await importLegacyRegistrationsDetailed(tripA.id, tripA.organizationId, rows, batch); expect(first).toMatchObject({ imported: 2, rejected: 0 });
    expect(await importLegacyRegistrationsDetailed(tripA.id, tripA.organizationId, rows, operation())).toMatchObject({ imported: 0, skipped: 2 });
    await rollbackImportBatch(tripA.organizationId, tripA.id, batch, "Rollback fictício controlado");
    const historical = await getDocsFromServer(query(collection(runtime.db!, "registrations"), where("organizationId", "==", tripA.organizationId), where("caravanId", "==", tripA.id)));
    expect(historical.docs.filter((item) => item.data().notes === `STAGING CSV ${runId}`).map((item) => item.data().registrationStatus)).toEqual(["cancelled", "cancelled"]);
  });
  it("activates the invited UID exactly once, denies staff escalation and enforces immediate revocation", async () => {
    await as("ownerA"); const uid = accounts.staffA.uid; const prior = await getDocFromServer(doc(runtime.db!, "tenantInvitations/staging-org-a/users", uid)); const generation = prior.data()?.generation || 0;
    await issueTeamInvitation("staging-org-a", uid, "staff", generation, Date.now() + 86400000, "Convite fictício conferido", operation());
    await as("staffA"); const accept = operation(); await acceptTeamInvitation("staging-org-a", uid, generation + 1, "staff", accept); await acceptTeamInvitation("staging-org-a", uid, generation + 1, "staff", accept);
    expect((await read(`registrations/${regId}`)).organizationId).toBe("staging-org-a");
    expect(await (await loadProof(await registration())).text()).toContain("COMPROVANTE FICTICIO STAGING");
    await deny(updateDoc(doc(runtime.db!, "memberships", uid, "organizations", "staging-org-a"), { role: "tenant_owner" }));
    await as("ownerA"); expect((await read("tenantUsage/staging-org-a")).activeMembers).toBe(2); await saveInternalMember("staging-org-a", uid, "staff", "revoked", "Revogação fictícia auditada", operation());
    await as("staffA"); await deny(loadProof(await registration())); await deny(getDocsFromServer(collection(runtime.db!, `registrations/${regId}/payments`))); await deny(getDocsFromServer(query(collection(runtime.db!, "registrations"), where("organizationId", "==", "staging-org-a"))));
    await as("ownerA"); await expect(saveInternalMember("staging-org-a", accounts.ownerA.uid, "staff", "active", "Teste de último owner", operation())).rejects.toThrow("responsável ativo");
  });
  it("blocks growth on manual subscription suspension and preserves the ledger through reload", async () => {
    await as("platform"); const current = await read("subscriptions/staging-org-a"); const input = { organizationId: "staging-org-a", planId: "essencial" as const, status: "past_due" as const, setupWaived: true, reason: "Homologação fictícia de suspensão comercial" };
    await assignTenantPlan(input, operation(), current.revision);
    try { await as("passenger"); await expect(reserveSeat(tripA, { ...publicForm, passengerName: "Crescimento Fictício Bloqueado" })).rejects.toThrow(/indisponíveis|plano/); }
    finally { await as("platform"); const suspended = await read("subscriptions/staging-org-a"); await assignTenantPlan({ ...input, status: "active", reason: "Reativação fictícia após teste" }, operation(), suspended.revision); }
    const fresh = await client("ownerA"); const app = initializeApp(config, `reload-${runId}`); const auth = initializeAuth(app, { persistence: inMemoryPersistence }); await signInWithEmailAndPassword(auth, accounts.ownerA.email, accounts.ownerA.password); const database = getFirestore(app);
    expect((await read(`registrations/${regId}`, database)).paymentTotalCents).toBe(2500); expect((await read("tenantUsage/staging-org-a", database)).activeOwners).toBe(1);
    await signOut(auth); await terminate(database); await deleteApp(app); expect(fresh.auth.currentUser?.uid).toBe(accounts.ownerA.uid);
  });
  it("requires minor consent and private PDF approval before boarding, preserving the historical record", async () => {
    await as("ownerA"); await updateLimitedCaravan(tripA.id, { requiresMinorAuthorization: true });
    try {
      await as("passenger"); const id = await reserveSeat(tripA, { ...publicForm, passengerName: "Pessoa Fictícia Menor STAGING", birthDate: "2010-01-01", guardianName: "Responsável Fictício STAGING", guardianPhone: "00000000000" });
      const minor = { ...await read(`registrations/${id}`), id } as Registration; expect(minor.isMinor).toBe(true);
      await expect(uploadMinorAuthorization(minor, syntheticPdf(), false)).rejects.toThrow("Confirme"); await uploadMinorAuthorization(minor, syntheticPdf(), true);
      for (const key of ["guest", "ownerB", "platform"]) { await as(key); await deny(loadMinorAuthorization(id)); }
      await as("ownerA"); expect(await (await loadMinorAuthorization(id)).text()).toContain("FICTICIO STAGING"); await reviewPayment(minor, true, "Confirmação fictícia");
      await expect(toggleCheckin(minor, true)).rejects.toThrow("autorização"); await reviewAuthorization(minor, "approved"); await toggleCheckin(minor, true); await toggleCheckin(minor, false); await cancelRegistration(minor);
      expect((await read(`registrations/${id}`)).registrationStatus).toBe("cancelled");
    } finally { await as("ownerA"); await updateLimitedCaravan(tripA.id, { requiresMinorAuthorization: false }); }
  });
});
