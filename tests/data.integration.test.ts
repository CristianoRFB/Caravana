import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch, type Firestore } from "firebase/firestore";
import { assertFails } from "@firebase/rules-unit-testing";
import { PROOF_POLICY } from "../src/lib/proof-policy";
import { legacyImportDocumentId } from "../src/lib/legacy-import";
import type { Caravan, Registration } from "../src/lib/types";

const runtime = vi.hoisted(() => ({
  db: null as Firestore | null,
  auth: { currentUser: { uid: "admin-a" } },
  firebaseConfigured: true,
}));
vi.mock("../src/lib/firebase", () => runtime);
import { cancelRegistration, getCaravanById, getRegistration, importLegacyRegistrations, recordPassengerPayment, reserveSeat, reviewPayment, setPortalAccessRevoked, toggleCheckin, uploadProof, voidPassengerPayment } from "../src/lib/data";

let env: RulesTestEnvironment;
beforeAll(async () => {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || "")) {
    throw new Error("These operations may run only against the local Firestore Emulator.");
  }
  env = await initializeTestEnvironment({
    projectId: "demo-caravana77-test",
    firestore: { rules: readFileSync(resolve("firestore.rules"), "utf8") },
  });
});
afterEach(async () => { runtime.db = null; await env.clearFirestore(); });
afterAll(async () => env.cleanup());

async function seedTrip(extra: Record<string, unknown> = {}) {
  const fields = {
    organizationId: "org-a", name: "Viagem sintética A", slug: "viagem-a",
    status: "published", capacity: 2, reservedSeats: 0, priceCents: 8500,
    date: "2026-10-18", boardingPoints: [{ id: "point-a", name: "Embarque de teste", address: "", time: "06:00" }],
    ...extra,
  };
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "caravans/ride-a"), fields);
    await setDoc(doc(context.firestore(), "admins/admin-a"), { organizationId: "org-a", role: "admin" });
  });
  runtime.db = env.unauthenticatedContext().firestore();
  return { ...fields, id: "ride-a" } as Caravan;
}
const passenger = {
  passengerName: "Pessoa Sintética", phone: "11900000000", email: "", city: "",
  boardingPointId: "point-a", boardingPointName: "Embarque de teste", emergencyContact: "", notes: "",
};

async function seedRegistration(extra: Partial<Registration> = {}) {
  await seedTrip({ reservedSeats: 1 });
  const registration: Registration = {
    id: "a".repeat(64), organizationId: "org-a", caravanId: "ride-a", caravanName: "Viagem sintética A",
    ...passenger, amountCents: 8500, paymentTotalCents: 0,
    registrationStatus: "awaiting_review", paymentStatus: "awaiting_review", createdAt: "2026-10-16T12:00:00.000Z",
    ...extra,
  };
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `registrations/${registration.id}`), registration);
  });
  runtime.db = env.authenticatedContext("admin-a").firestore();
  return registration;
}

describe("production data functions on synthetic emulator fixtures", () => {
  it("keeps legacy bearer links readable until explicitly revoked; revocation denies reads, uploads and guest reactivation", async () => {
    const registration = await seedRegistration();
    runtime.db = env.unauthenticatedContext().firestore();
    expect((await getRegistration(registration.id))?.passengerName).toBe(passenger.passengerName);
    await assertFails(setPortalAccessRevoked(registration.id, true));
    runtime.db = env.authenticatedContext("admin-a").firestore();
    await setPortalAccessRevoked(registration.id, true);
    const preserved = await getRegistration(registration.id);
    expect(preserved?.portalAccessRevoked).toBe(true);
    expect(preserved?.registrationStatus).toBe(registration.registrationStatus);
    expect(preserved?.paymentTotalCents).toBe(0);
    runtime.db = env.authenticatedContext("foreign-admin").firestore();
    await assertFails(getRegistration(registration.id));
    await assertFails(setPortalAccessRevoked(registration.id, false));
    runtime.db = env.unauthenticatedContext().firestore();
    await assertFails(getRegistration(registration.id));
    await assertFails(uploadProof(registration, new File(["%PDF-1.4\nsynthetic"], "proof.pdf", { type: "application/pdf" })));
    await assertFails(setPortalAccessRevoked(registration.id, false));
    runtime.db = env.authenticatedContext("admin-a").firestore();
    await setPortalAccessRevoked(registration.id, false);
    runtime.db = env.unauthenticatedContext().firestore();
    expect((await getRegistration(registration.id))?.id).toBe(registration.id);
  });
  it("books a document without a stored id and links both registration and private receipt to its reference", async () => {
    const trip = await seedTrip();
    const id = await reserveSeat(trip, passenger);
    const registration = await getRegistration(id);
    expect(registration?.caravanId).toBe("ride-a");
    await env.withSecurityRulesDisabled(async (context) => {
      const receipt = await getDoc(doc(context.firestore(), `reservationReceipts/${registration!.reservationNonce}`));
      expect(receipt.data()?.caravanId).toBe("ride-a");
      expect(receipt.data()?.registrationId).toBe(id);
    });
  });

  it("ignores a misleading stored id in the booking transaction", async () => {
    const trip = await seedTrip({ id: "wrong-ride" });
    const id = await reserveSeat(trip, passenger);
    expect((await getRegistration(id))?.caravanId).toBe("ride-a");
  });

  it("reads the canonical caravan document id even when legacy data contains a different id", async () => {
    await seedTrip({ id: "stale-id" });
    expect((await getCaravanById("ride-a"))?.id).toBe("ride-a");
  });

  it("allows only one real reserveSeat call to claim the final seat", async () => {
    const trip = await seedTrip({ capacity: 1 });
    const outcomes = await Promise.allSettled([reserveSeat(trip, passenger), reserveSeat(trip, { ...passenger, passengerName: "Outra Pessoa Sintética" })]);
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await getDoc(doc(runtime.db!, "caravans/ride-a"))).data()?.reservedSeats).toBe(1);
  });

  it("cancels twice without releasing the same seat twice or losing received amounts", async () => {
    const registration = await seedRegistration({ paymentTotalCents: 2500 });
    await cancelRegistration(registration);
    await cancelRegistration(registration);
    const current = await getRegistration(registration.id);
    expect(current?.registrationStatus).toBe("cancelled");
    expect(current?.paymentTotalCents).toBe(2500);
    expect((await getDoc(doc(runtime.db!, "caravans/ride-a"))).data()?.reservedSeats).toBe(0);
  });

  it("reviews proof and updates check-in without creating a monetary receipt", async () => {
    const registration = await seedRegistration();
    await reviewPayment(registration, true);
    await toggleCheckin(registration, true);
    const current = await getRegistration(registration.id);
    expect(current?.registrationStatus).toBe("confirmed");
    expect(current?.paymentTotalCents).toBe(0);
    expect(current?.checkedInAt).toBeTruthy();
    await toggleCheckin(registration, false);
    expect((await getRegistration(registration.id))?.checkedInAt).toBeNull();
  });

  it("records partial receipts, rejects overpayment and preserves an idempotent void history", async () => {
    const registration = await seedRegistration();
    await recordPassengerPayment(registration, { amountCents: 2500, method: "pix", notes: "Valor sintético" });
    await recordPassengerPayment(registration, { amountCents: 6000, method: "cash", notes: "Valor sintético" });
    await expect(recordPassengerPayment(registration, { amountCents: 1, method: "pix", notes: "" })).rejects.toThrow("ultrapassa");
    const payments = await getDocs(collection(runtime.db!, `registrations/${registration.id}/payments`));
    const first = payments.docs.find((entry) => entry.data().amountCents === 2500)!;
    await voidPassengerPayment(registration.id, first.id, "Correção sintética");
    await voidPassengerPayment(registration.id, first.id, "Mesma correção sintética");
    expect((await getRegistration(registration.id))?.paymentTotalCents).toBe(6000);
    expect((await getDoc(first.ref)).data()?.status).toBe("voided");
    expect((await getDocs(payments.query)).size).toBe(2);
  });

  it("submits a valid PDF privately and rejects a file whose declared type differs from its signature", async () => {
    const registration = await seedRegistration({ registrationStatus: "awaiting_payment", paymentStatus: "pending" });
    runtime.db = env.unauthenticatedContext().firestore();
    await uploadProof(registration, new File(["%PDF-1.4\nSYNTHETIC"], "synthetic.pdf", { type: "application/pdf" }));
    expect((await getRegistration(registration.id))?.registrationStatus).toBe("awaiting_review");
    await expect(uploadProof(registration, new File(["not a PDF"], "invalid.pdf", { type: "application/pdf" }))).rejects.toThrow("conteúdo");
  });

  it("rejects incomplete persisted trip data without consuming a seat", async () => {
    const trip = await seedTrip({ priceCents: "invalid" });
    await expect(reserveSeat(trip, passenger)).rejects.toThrow("dados incompletos");
    expect((await getDoc(doc(runtime.db!, "caravans/ride-a"))).data()?.reservedSeats).toBe(0);
  });

  it("requires guardian details for a minor according to the persisted trip policy", async () => {
    const trip = await seedTrip({ requiresMinorAuthorization: true });
    await expect(reserveSeat(trip, { ...passenger, birthDate: "2010-01-01" })).rejects.toThrow("responsável");
    const id = await reserveSeat(trip, { ...passenger, birthDate: "2010-01-01", guardianName: "Responsável Sintético", guardianPhone: "11900000001" });
    expect((await getRegistration(id))?.authorizationStatus).toBe("not_sent");
  });

  it("replays a historical import batch without duplicating records or seats", async () => {
    await seedTrip();
    runtime.db = env.authenticatedContext("admin-a").firestore();
    const rows = [{ ...passenger, line: 2, amountCents: 8500, paymentTotalCents: 0, registrationStatus: "awaiting_payment" as const, paymentStatus: "pending" as const }];
    const batchId = "e".repeat(32);
    expect(await importLegacyRegistrations("ride-a", "org-a", rows, batchId)).toEqual({ imported: 1, skipped: 0 });
    expect(await importLegacyRegistrations("ride-a", "org-a", rows, batchId)).toEqual({ imported: 0, skipped: 1 });
    expect((await getDoc(doc(runtime.db!, "caravans/ride-a"))).data()?.reservedSeats).toBe(1);
    const id = await legacyImportDocumentId(batchId, 2);
    expect((await getRegistration(id))?.paymentTotalCents).toBe(0);
  });

  it("rejects an import larger than remaining capacity atomically", async () => {
    await seedTrip({ capacity: 1 });
    runtime.db = env.authenticatedContext("admin-a").firestore();
    const rows = [2, 3].map((line) => ({ ...passenger, passengerName: `Pessoa Sintética ${line}`, line, registrationStatus: "awaiting_payment" as const, paymentStatus: "pending" as const }));
    const batchId = "f".repeat(32);
    await expect(importLegacyRegistrations("ride-a", "org-a", rows, batchId)).rejects.toThrow("vagas disponíveis");
    expect((await getDoc(doc(runtime.db!, "caravans/ride-a"))).data()?.reservedSeats).toBe(0);
    expect((await getRegistration(await legacyImportDocumentId(batchId, 2)))).toBeNull();
  });

  it.each([
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
  ] as const)("accepts a synthetic %s signature under the active inline proof rules", async (type, signature) => {
    const registration = await seedRegistration();
    runtime.db = env.unauthenticatedContext().firestore();
    await uploadProof(registration, new File([new Uint8Array(signature)], "synthetic-image", { type }));
    expect((await getRegistration(registration.id))?.paymentStatus).toBe("awaiting_review");
  });

  it("accepts exactly 600 KiB and denies a larger base64 payload even when bypassing the client", async () => {
    const registration = await seedRegistration();
    runtime.db = env.unauthenticatedContext().firestore();
    const allowed = new Uint8Array(PROOF_POLICY.maxBytes).fill(32);
    allowed.set(new TextEncoder().encode("%PDF-1.4\nSYNTHETIC"));
    await uploadProof(registration, new File([allowed], "boundary.pdf", { type: "application/pdf" }));
    const oversized = new Uint8Array(PROOF_POLICY.maxBytes + 1).fill(32);
    oversized.set(allowed);
    const batch = writeBatch(runtime.db!);
    batch.set(doc(runtime.db!, `registrations/${registration.id}/proofs/current`), {
      registrationId: registration.id, organizationId: "org-a", caravanId: "ride-a",
      contentType: "application/pdf", fileName: "too-big.pdf", content: Buffer.from(oversized).toString("base64"), uploadedAt: serverTimestamp(),
    });
    batch.update(doc(runtime.db!, `registrations/${registration.id}`), { proofId: "current", paymentStatus: "awaiting_review", registrationStatus: "awaiting_review", proofUploadedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
});
