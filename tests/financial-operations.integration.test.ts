import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, deleteDoc, query, where, writeBatch, type Firestore } from "firebase/firestore";
import type { Registration } from "../src/lib/types";
import { pendingWrites } from "../src/lib/pending-writes";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "owner-a" } } }));
vi.mock("../src/lib/firebase", () => runtime);
import { adjustRegistrationFare, createCaravanExpense, updateCaravanExpense, voidCaravanExpense, recordPassengerPayment, voidPassengerPayment, financialOperationId, validFinancialDate } from "../src/lib/financial-operations";
let env: RulesTestEnvironment;
const registration = { id: "a".repeat(64), organizationId: "a", caravanId: "trip-a", registrationStatus: "confirmed", paymentStatus: "approved", amountCents: 8500, paymentTotalCents: 0 } as Registration;
const expense = { description: "Ônibus sintético", category: "transporte" as const, amountCents: 3000, date: "2026-10-16", notes: "" };
const payment = { amountCents: 2500, method: "pix" as const, notes: "Sintético", paymentDate: "2026-10-16" };
beforeAll(async () => { if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || "")) throw new Error("Local emulator only"); env = await initializeTestEnvironment({ projectId: "demo-caravana77-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterEach(async () => { expect(pendingWrites()).toBe(0); runtime.db = null; runtime.auth.currentUser.uid = "owner-a"; await env.clearFirestore(); });
afterAll(async () => env.cleanup());
async function seed(patch = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    for (const org of ["a", "b"]) {
      await setDoc(doc(context.firestore(), `memberships/owner-${org}/organizations/${org}`), { organizationId: org, uid: `owner-${org}`, role: "tenant_owner", status: "active" });
      await setDoc(doc(context.firestore(), `caravans/trip-${org}`), { organizationId: org, name: "Mesmo nome", slug: "mesmo-slug", status: "published", capacity: 60, reservedSeats: 1 });
    }
    await setDoc(doc(context.firestore(), "memberships/staff-a/organizations/a"), { organizationId: "a", uid: "staff-a", role: "staff", status: "active" });
    await setDoc(doc(context.firestore(), `registrations/${registration.id}`), { ...registration, ...patch });
  });
  runtime.db = env.authenticatedContext("owner-a").firestore();
}
async function read(path: string) { return (await getDoc(doc(runtime.db!, path))).data()!; }
describe("financial ledger actual SDK and candidate Rules", () => {
  it("rejects forged SDK money, date, actor and trusted timestamps even when a complete audit is supplied", async () => {
    await seed();
    for (const patch of [{ amountCents: 1.5 }, { amountCents: -1 }, { amountCents: 9000 }, { amountCents: Number.MAX_SAFE_INTEGER + 1 }, { paymentDate: "2026-02-30" }, { postedAt: new Date("2020-01-01") }, { createdBy: "owner-b" }]) {
      const id = financialOperationId(); const fields = { ...payment, ...patch };
      const batch = writeBatch(runtime.db!);
      batch.set(doc(runtime.db!, `registrations/${registration.id}/payments/${id}`), { id, registrationId: registration.id, organizationId: "a", caravanId: "trip-a", status: "active", createdAt: "2026-10-16", createdBy: "owner-a", postedAt: serverTimestamp(), lastFinancialOperationId: id, ...fields });
      batch.update(doc(runtime.db!, `registrations/${registration.id}`), { paymentTotalCents: fields.amountCents, updatedAt: serverTimestamp(), lastFinancialOperationId: id });
      batch.set(doc(runtime.db!, `financialOperations/${id}`), { action: "payment_recorded", organizationId: "a", caravanId: "trip-a", registrationId: registration.id, entityId: id, sourceId: "", actorUid: "owner-a", at: serverTimestamp(), payloadHash: "a".repeat(64), reason: "", beforeCents: 0, afterCents: fields.amountCents });
      await assertFails(batch.commit());
    }
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(0);
  });
  it("adjusts unknown historical fare with reason and audit without inventing receipts or clearing reported Pix", async () => {
    await seed({ amountCents: 0, paymentTotalCents: 1000, paymentReportedUnreconciled: true }); const id = financialOperationId();
    await adjustRegistrationFare(registration, 8500, "Valor histórico conferido", id); await adjustRegistrationFare(registration, 8500, "Valor histórico conferido", id);
    const current = await read(`registrations/${registration.id}`);
    expect(current.amountCents).toBe(8500); expect(current.paymentTotalCents).toBe(1000); expect(current.paymentReportedUnreconciled).toBe(true);
    expect((await read(`financialOperations/${id}`)).beforeCents).toBe(0);
    await expect(adjustRegistrationFare(registration, 500, "Abaixo do recebido")).rejects.toThrow("menor");
    await adjustRegistrationFare(registration, 0, "Valor voltou a ser desconhecido");
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(1000);
    runtime.db = env.authenticatedContext("staff-a").firestore(); runtime.auth.currentUser.uid = "staff-a";
    await expect(adjustRegistrationFare(registration, 5000, "Staff não autorizado")).rejects.toBeDefined();
  });
  it("records one payment under concurrent retries, recovers its operation and rejects changed intent", async () => {
    await seed(); const id = financialOperationId();
    await Promise.all([recordPassengerPayment(registration, payment, id), recordPassengerPayment(registration, payment, id)]);
    await recordPassengerPayment(registration, payment, id);
    await expect(recordPassengerPayment(registration, { ...payment, amountCents: 2000 }, id)).rejects.toThrow("outros dados");
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(2500);
    expect((await getDocs(collection(runtime.db!, `registrations/${registration.id}/payments`))).size).toBe(1);
    const entry = await read(`registrations/${registration.id}/payments/${id}`);
    expect(entry.postedAt.toMillis()).toBeGreaterThan(0);
    expect((await read(`financialOperations/${id}`)).at.isEqual(entry.postedAt)).toBe(true);
  });
  it("preserves a legacy unitemized opening total and never subtracts a void twice", async () => {
    await seed({ paymentTotalCents: 1000 }); const id = financialOperationId();
    await recordPassengerPayment(registration, payment, id);
    const voidId = financialOperationId();
    await Promise.all([voidPassengerPayment(registration.id, id, "Correção sintética", voidId), voidPassengerPayment(registration.id, id, "Correção sintética", voidId)]);
    await voidPassengerPayment(registration.id, id, "Já anulado");
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(1000);
    expect((await read(`registrations/${registration.id}/payments/${id}`)).amountCents).toBe(2500);
    expect((await getDocs(query(collection(runtime.db!, "financialOperations"), where("organizationId", "==", "a")))).size).toBe(2);
  });
  it("serializes competing payments at the known balance; unknown fare remains explicit", async () => {
    await seed({ amountCents: 2500 });
    const results = await Promise.allSettled([recordPassengerPayment(registration, payment), recordPassengerPayment(registration, payment)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(2500);
    await env.withSecurityRulesDisabled(async (context) => { await updateDoc(doc(context.firestore(), `registrations/${registration.id}`), { amountCents: 0 }); });
    await recordPassengerPayment(registration, { ...payment, amountCents: 500 });
    expect((await read(`registrations/${registration.id}`)).paymentTotalCents).toBe(3000);
  });
  it("corrects an expense by linked void and replacement, then voids the replacement idempotently", async () => {
    await seed(); const original = financialOperationId(); const correction = financialOperationId();
    await createCaravanExpense("trip-a", "a", expense, original);
    await updateCaravanExpense("trip-a", original, { ...expense, amountCents: 2000 }, "Valor corrigido", correction);
    await updateCaravanExpense("trip-a", original, { ...expense, amountCents: 2000 }, "Valor corrigido", correction);
    const old = await read(`caravans/trip-a/expenses/${original}`); const next = await read(`caravans/trip-a/expenses/${correction}`);
    expect(old.amountCents).toBe(3000); expect(old.status).toBe("voided"); expect(old.replacementId).toBe(correction); expect(next.replacesId).toBe(original);
    await voidCaravanExpense("trip-a", correction, "Cancelamento sintético"); await voidCaravanExpense("trip-a", correction, "Repetição sintética");
    expect((await getDocs(query(collection(runtime.db!, "financialOperations"), where("organizationId", "==", "a")))).size).toBe(3);
  });
  it("corrects a legacy expense without replacing its ID or creation metadata", async () => {
    await seed(); await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "caravans/trip-a/expenses/legacy"), { ...expense, id: "legacy", caravanId: "trip-a", organizationId: "a", createdAt: "2020-01-01", createdBy: "legacy-owner" }); });
    await updateCaravanExpense("trip-a", "legacy", { ...expense, amountCents: 500 }, "Correção de legado");
    const old = await read("caravans/trip-a/expenses/legacy"); expect(old.createdAt).toBe("2020-01-01"); expect(old.createdBy).toBe("legacy-owner"); expect(old.status).toBe("voided");
  });
  it("rejects direct aggregate, fare and report mutations, silent expense edits and audit forgery", async () => {
    await seed(); const id = financialOperationId(); await createCaravanExpense("trip-a", "a", expense, id);
    for (const patch of [{ paymentTotalCents: 999 }, { amountCents: 1 }, { paymentReportedUnreconciled: false }]) await assertFails(updateDoc(doc(runtime.db!, `registrations/${registration.id}`), patch));
    await assertFails(updateDoc(doc(runtime.db!, `caravans/trip-a/expenses/${id}`), { amountCents: 1 }));
    await assertFails(deleteDoc(doc(runtime.db!, `caravans/trip-a/expenses/${id}`)));
    await assertFails(updateDoc(doc(runtime.db!, `financialOperations/${id}`), { reason: "Adulterado" }));
    await assertFails(setDoc(doc(runtime.db!, `financialOperations/${financialOperationId()}`), { ...(await read(`financialOperations/${id}`)), entityId: id }));
  });
  it("denies staff, guest and tenant B monetary writes and private A reads", async () => {
    await seed(); const id = financialOperationId(); await createCaravanExpense("trip-a", "a", expense, id);
    for (const uid of ["staff-a", "owner-b", "guest"]) {
      runtime.db = uid === "guest" ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid).firestore(); runtime.auth.currentUser.uid = uid;
      await expect(recordPassengerPayment(registration, payment)).rejects.toBeDefined();
      await expect(createCaravanExpense("trip-a", "a", expense)).rejects.toBeDefined();
      if (uid !== "staff-a") { await assertFails(getDoc(doc(runtime.db!, `financialOperations/${id}`))); await assertFails(getDoc(doc(runtime.db!, `caravans/trip-a/expenses/${id}`))); }
    }
  });
  it("rejects invalid dates, unsafe cents, cancellation and inconsistent legacy totals without writes", async () => {
    await seed({ registrationStatus: "cancelled" }); await expect(recordPassengerPayment(registration, payment)).rejects.toThrow("cancelada");
    for (const date of ["2026-02-30", "2025-02-29", "2026-13-01", "0000-01-01"]) expect(validFinancialDate(date)).toBe(false);
    expect(validFinancialDate("2028-02-29")).toBe(true);
    for (const amountCents of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) expect(() => recordPassengerPayment(registration, { ...payment, amountCents })).toThrow();
    expect(() => createCaravanExpense("trip-a", "a", { ...expense, date: "2026-02-30" })).toThrow();
    expect((await getDocs(collection(runtime.db!, `registrations/${registration.id}/payments`))).size).toBe(0);
  });
});
