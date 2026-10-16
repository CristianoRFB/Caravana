import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from "firebase/firestore";
import type { Caravan, Registration } from "../src/lib/types";

const runtime = vi.hoisted(() => ({
  db: null as Firestore | null,
  auth: { currentUser: { uid: "admin-a" } },
  firebaseConfigured: true,
}));
vi.mock("../src/lib/firebase", () => runtime);
import { cancelRegistration, getCaravanById, getRegistration, recordPassengerPayment, reserveSeat, reviewPayment, toggleCheckin, uploadProof, voidPassengerPayment } from "../src/lib/data";

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
});
