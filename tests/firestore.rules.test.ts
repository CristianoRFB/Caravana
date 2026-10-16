import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  query,
  writeBatch,
} from "firebase/firestore";

let env: RulesTestEnvironment;
const secretA = "a".repeat(64);
const secretB = "b".repeat(64);
const nonceA = "c".repeat(64);
const nonceB = "d".repeat(64);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "caravana-rules-test",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});
afterEach(async () => env.clearFirestore());
afterAll(async () => env.cleanup());

async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "caravans/ride-a"), {
      organizationId: "org-a",
      name: "Viagem A",
      slug: "viagem-a",
      status: "published",
      capacity: 1,
      reservedSeats: 0,
      priceCents: 8500,
    });
    await setDoc(doc(db, "caravans/ride-b"), {
      organizationId: "org-b",
      name: "Viagem B",
      slug: "viagem-b",
      status: "draft",
      capacity: 10,
      reservedSeats: 0,
    });
    await setDoc(doc(db, `registrations/${secretA}`), {
      id: secretA,
      organizationId: "org-a",
      caravanId: "ride-a",
      passengerName: "Pessoa Exemplo",
      phone: "11999999999",
      registrationStatus: "awaiting_payment",
      paymentStatus: "pending",
    });
    await setDoc(doc(db, "admins/admin-a"), {
      organizationId: "org-a",
      role: "admin",
    });
    await setDoc(doc(db, "admins/admin-b"), {
      organizationId: "org-b",
      role: "admin",
    });
  });
}

describe("Firestore security rules", () => {
  it("allows published trip reads and secret-link reads, but blocks public listing", async () => {
    await seed();
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(guest, "caravans/ride-a")));
    await assertSucceeds(getDoc(doc(guest, `registrations/${secretA}`)));
    await assertFails(getDocs(collection(guest, "registrations")));
  });

  it("keeps unpublished organization data private to its own staff", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    await assertSucceeds(getDoc(doc(staff, "caravans/ride-a")));
    await assertFails(getDoc(doc(staff, "caravans/ride-b")));
    await assertFails(
      setDoc(doc(staff, "admins/other-user"), { organizationId: "org-a" }),
    );
  });

  it("allows only one of two concurrent reservations for the final seat", async () => {
    await seed();
    const guest = env.unauthenticatedContext().firestore();
    const reserve = async (id: string, nonce: string) =>
      runTransaction(guest, async (tx) => {
        const caravanRef = doc(guest, "caravans/ride-a");
        const snapshot = await tx.get(caravanRef);
        const current = snapshot.data()!;
        if (current.reservedSeats >= current.capacity) throw new Error("full");
        tx.update(caravanRef, {
          reservedSeats: current.reservedSeats + 1,
          lastReservationNonce: nonce,
        });
        tx.set(doc(guest, `registrations/${id}`), {
          id,
          reservationNonce: nonce,
          organizationId: "org-a",
          caravanId: "ride-a",
          caravanName: "Viagem A",
          passengerName: `Pessoa ${id[0]}`,
          phone: "11999999999",
          email: "",
          city: "São Paulo",
          boardingPointId: "p1",
          boardingPointName: "Terminal",
          emergencyContact: "Contato 11999999999",
          notes: "",
          amountCents: 8500,
          registrationStatus: "awaiting_payment",
          paymentStatus: "pending",
          createdAt: new Date().toISOString(),
        });
        tx.set(doc(guest, `reservationReceipts/${nonce}`), {
          registrationId: id,
          organizationId: "org-a",
          caravanId: "ride-a",
        });
      });
    const results = await Promise.allSettled([
      reserve(secretA, nonceA),
      reserve(secretB, nonceB),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    let reserved = 0;
    await env.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(
        doc(context.firestore(), "caravans/ride-a"),
      );
      reserved = Number(snapshot.data()?.reservedSeats || 0);
    });
    expect(reserved).toBe(1);
  });

  it("accepts optional CPF and birth date only in the validated formats", async () => {
    await seed();
    const guest = env.unauthenticatedContext().firestore();
    const reserve = async (
      id: string,
      cpf: string,
      birthDate: string,
      nonce: string,
    ) =>
      runTransaction(guest, async (tx) => {
        const caravanRef = doc(guest, "caravans/ride-a");
        const snapshot = await tx.get(caravanRef);
        tx.update(caravanRef, {
          reservedSeats: snapshot.data()!.reservedSeats + 1,
          lastReservationNonce: nonce,
        });
        tx.set(doc(guest, `registrations/${id}`), {
          id,
          reservationNonce: nonce,
          organizationId: "org-a",
          caravanId: "ride-a",
          caravanName: "Viagem A",
          passengerName: "Pessoa Teste",
          cpf,
          birthDate,
          phone: "11999999999",
          email: "",
          city: "São Paulo",
          boardingPointId: "p1",
          boardingPointName: "Terminal",
          emergencyContact: "Contato 11999999999",
          notes: "",
          amountCents: 8500,
          registrationStatus: "awaiting_payment",
          paymentStatus: "pending",
          createdAt: new Date().toISOString(),
        });
        tx.set(doc(guest, `reservationReceipts/${nonce}`), {
          registrationId: id,
          organizationId: "org-a",
          caravanId: "ride-a",
        });
      });
    await expect(
      reserve(secretA, "123", "2000-01-01", nonceA),
    ).rejects.toBeTruthy();
    await expect(
      reserve(secretB, "12345678901", "2000-01-01", nonceB),
    ).resolves.toBeUndefined();
  });

  it("requires responsible contact data for a minor reservation", async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "caravans/ride-a"), {
        requiresMinorAuthorization: true,
        eventDate: "2026-10-18",
      });
    });
    const guest = env.unauthenticatedContext().firestore();
    const reserveMinor = async (
      id: string,
      nonce: string,
      includeGuardian: boolean,
    ) =>
      runTransaction(guest, async (tx) => {
        const caravanRef = doc(guest, "caravans/ride-a");
        const snapshot = await tx.get(caravanRef);
        tx.update(caravanRef, {
          reservedSeats: snapshot.data()!.reservedSeats + 1,
          lastReservationNonce: nonce,
        });
        tx.set(doc(guest, `registrations/${id}`), {
          id,
          reservationNonce: nonce,
          organizationId: "org-a",
          caravanId: "ride-a",
          caravanName: "Viagem A",
          passengerName: "Pessoa Menor",
          birthDate: "2010-10-19",
          isMinor: true,
          ...(includeGuardian
            ? { guardianName: "Responsável", guardianPhone: "11999999999" }
            : {}),
          authorizationStatus: "not_sent",
          phone: "11999999999",
          email: "",
          city: "São Paulo",
          boardingPointId: "p1",
          boardingPointName: "Terminal",
          emergencyContact: "Contato 11999999999",
          notes: "",
          amountCents: 8500,
          registrationStatus: "awaiting_payment",
          paymentStatus: "pending",
          createdAt: new Date().toISOString(),
        });
        tx.set(doc(guest, `reservationReceipts/${nonce}`), {
          registrationId: id,
          organizationId: "org-a",
          caravanId: "ride-a",
        });
      });

    await expect(reserveMinor(secretB, nonceA, false)).rejects.toBeTruthy();
    await expect(reserveMinor(secretB, nonceA, true)).resolves.toBeUndefined();
  });

  it("does not let a passenger approve their own payment", async () => {
    await seed();
    const guest = env.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(guest, `registrations/${secretA}`), {
        paymentStatus: "approved",
        registrationStatus: "confirmed",
      }),
    );
    const staff = env.authenticatedContext("admin-a").firestore();
    await assertSucceeds(
      updateDoc(doc(staff, `registrations/${secretA}`), {
        paymentStatus: "approved",
        registrationStatus: "confirmed",
        approvedBy: "admin-a",
      }),
    );
  });

  it("scopes admin queries to the signed-in organization", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    const scoped = query(
      collection(staff, "caravans"),
      where("organizationId", "==", "org-a"),
    );
    const results = await assertSucceeds(getDocs(scoped));
    expect(results.docs.map((item) => item.id)).toEqual(["ride-a"]);
  });

  it("accepts private PDF proofs and limits reads to organization staff", async () => {
    await seed();
    const guest = env.unauthenticatedContext();
    const guestDb = guest.firestore();
    const registrationRef = doc(guestDb, `registrations/${secretA}`);
    const proofRef = doc(guestDb, `registrations/${secretA}/proofs/current`);
    const batch = writeBatch(guestDb);
    batch.set(proofRef, {
      registrationId: secretA,
      organizationId: "org-a",
      caravanId: "ride-a",
      contentType: "application/pdf",
      fileName: "comprovante.pdf",
      content: "JVBERi0xLjQ=",
      uploadedAt: serverTimestamp(),
    });
    batch.update(registrationRef, {
      proofId: "current",
      paymentStatus: "awaiting_review",
      registrationStatus: "awaiting_review",
      proofUploadedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
    await assertFails(getDoc(proofRef));
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("admin-a").firestore(),
          `registrations/${secretA}/proofs/current`,
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("admin-b").firestore(),
          `registrations/${secretA}/proofs/current`,
        ),
      ),
    );
  });

  it("blocks unsupported and oversized receipt files", async () => {
    await seed();
    const guestDb = env.unauthenticatedContext().firestore();
    const registrationRef = doc(guestDb, `registrations/${secretA}`);
    const proofRef = doc(guestDb, `registrations/${secretA}/proofs/current`);
    const invalid = writeBatch(guestDb);
    invalid.set(proofRef, {
      registrationId: secretA,
      organizationId: "org-a",
      caravanId: "ride-a",
      contentType: "text/plain",
      fileName: "comprovante.txt",
      content: "cGF5bWVudG8=",
      uploadedAt: serverTimestamp(),
    });
    invalid.update(registrationRef, {
      proofId: "current",
      paymentStatus: "awaiting_review",
      registrationStatus: "awaiting_review",
      proofUploadedAt: serverTimestamp(),
    });
    await assertFails(invalid.commit());

    const oversized = writeBatch(guestDb);
    oversized.set(proofRef, {
      registrationId: secretA,
      organizationId: "org-a",
      caravanId: "ride-a",
      contentType: "application/pdf",
      fileName: "comprovante.pdf",
      content: "JVBERi0" + "A".repeat(820001),
      uploadedAt: serverTimestamp(),
    });
    oversized.update(registrationRef, {
      proofId: "current",
      paymentStatus: "awaiting_review",
      registrationStatus: "awaiting_review",
      proofUploadedAt: serverTimestamp(),
    });
    await assertFails(oversized.commit());
  });

  it("allows an organization admin to import a contactless historical Pix report without a known amount", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    const importedId = "e".repeat(64);
    const batchId = "f".repeat(32);
    await assertSucceeds(
      runTransaction(staff, async (tx) => {
        const caravanRef = doc(staff, "caravans/ride-a");
        const caravan = await tx.get(caravanRef);
        tx.update(caravanRef, { reservedSeats: caravan.data()!.reservedSeats + 1 });
        tx.set(doc(staff, `registrations/${importedId}`), {
          id: importedId,
          importedFromLegacy: true,
          importBatchId: batchId,
          organizationId: "org-a",
          caravanId: "ride-a",
          caravanName: "Viagem A",
          passengerName: "Pessoa Histórica",
          phone: "",
          email: "",
          city: "",
          boardingPointId: "",
          boardingPointName: "Não informado",
          emergencyContact: "",
          notes: "",
          documentRecords: [{ label: "Documento", value: "ID-123" }],
          paymentTotalCents: 0,
          paymentReportedMethod: "pix",
          paymentReportedUnreconciled: true,
          registrationStatus: "confirmed",
          paymentStatus: "reported",
          createdAt: new Date().toISOString(),
        });
      }),
    );
  });

  it("lets staff check missing candidate import IDs without exposing absent records publicly", async () => {
    await seed();
    const missingId = "9".repeat(64);
    const staff = env.authenticatedContext("admin-a").firestore();
    const guest = env.unauthenticatedContext().firestore();
    const staffResult = await assertSucceeds(
      getDoc(doc(staff, `registrations/${missingId}`)),
    );
    expect(staffResult.exists()).toBe(false);
    await assertFails(getDoc(doc(guest, `registrations/${missingId}`)));
  });

  it("keeps sequential partial payments in history, reconciles the total, and blocks overpayment", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    const registrationRef = doc(staff, `registrations/${secretA}`);
    await updateDoc(registrationRef, { amountCents: 8500, paymentTotalCents: 0 });

    const record = async (id: string, amountCents: number) =>
      runTransaction(staff, async (tx) => {
        const paymentRef = doc(staff, `registrations/${secretA}/payments/${id}`);
        const [registration, payment] = await Promise.all([
          tx.get(registrationRef),
          tx.get(paymentRef),
        ]);
        if (payment.exists()) throw new Error("duplicate payment");
        const nextTotal = Number(registration.data()?.paymentTotalCents || 0) + amountCents;
        tx.set(paymentRef, {
          id,
          registrationId: secretA,
          organizationId: "org-a",
          caravanId: "ride-a",
          amountCents,
          method: "pix",
          notes: "",
          status: "active",
          createdAt: new Date().toISOString(),
          createdBy: "admin-a",
        });
        tx.update(registrationRef, { paymentTotalCents: nextTotal });
      });

    await assertFails(record("overpay", 8501));
    await assertSucceeds(record("partial-a", 5000));
    await assertSucceeds(record("partial-b", 3500));

    const registration = await getDoc(registrationRef);
    const history = await getDocs(collection(staff, `registrations/${secretA}/payments`));
    expect(registration.data()?.paymentTotalCents).toBe(8500);
    expect(history.docs.map((payment) => payment.data().amountCents).sort((a, b) => a - b)).toEqual([3500, 5000]);
    expect(history.docs.every((payment) => payment.data().status === "active")).toBe(true);
  });

  it("restricts passenger payment history and caravan expenses to the matching organization admin", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    const paymentRef = doc(staff, `registrations/${secretA}/payments/payment-a`);
    await assertSucceeds(
      runTransaction(staff, async (tx) => {
        const registrationRef = doc(staff, `registrations/${secretA}`);
        const registration = await tx.get(registrationRef);
        tx.set(paymentRef, {
          id: "payment-a",
          registrationId: secretA,
          organizationId: "org-a",
          caravanId: "ride-a",
          amountCents: 2500,
          method: "pix",
          notes: "Pagamento parcial",
          status: "active",
          createdAt: new Date().toISOString(),
          createdBy: "admin-a",
        });
        tx.update(registrationRef, {
          paymentTotalCents: Number(registration.data()?.paymentTotalCents || 0) + 2500,
        });
      }),
    );

    const expenseRef = doc(staff, "caravans/ride-a/expenses/expense-a");
    await assertSucceeds(
      setDoc(expenseRef, {
        id: "expense-a",
        organizationId: "org-a",
        caravanId: "ride-a",
        description: "Sinal do ônibus",
        category: "transporte",
        amountCents: 10000,
        date: "2026-01-01",
        notes: "",
        createdAt: new Date().toISOString(),
        createdBy: "admin-a",
      }),
    );

    const guest = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(guest, `registrations/${secretA}/payments/payment-a`)));
    await assertFails(getDoc(doc(guest, "caravans/ride-a/expenses/expense-a")));
    await assertFails(
      setDoc(doc(env.authenticatedContext("admin-b").firestore(), "caravans/ride-a/expenses/expense-b"), {
        id: "expense-b",
        organizationId: "org-a",
        caravanId: "ride-a",
        description: "Outro custo",
        category: "outros",
        amountCents: 100,
        date: "2026-01-01",
        notes: "",
        createdAt: new Date().toISOString(),
        createdBy: "admin-b",
      }),
    );
  });

  it("rejects invalid amounts and fields for caravan expenses", async () => {
    await seed();
    const staff = env.authenticatedContext("admin-a").firestore();
    const base = {
      organizationId: "org-a",
      caravanId: "ride-a",
      description: "Pedágio da viagem",
      category: "pedagio",
      amountCents: 100,
      date: "2026-01-01",
      notes: "",
      createdAt: new Date().toISOString(),
      createdBy: "admin-a",
    };
    const invalidExpenses = [
      { ...base, id: "expense-zero", amountCents: 0 },
      { ...base, id: "expense-negative", amountCents: -1 },
      { ...base, id: "expense-fractional", amountCents: 1.5 },
      { ...base, id: "expense-description", description: "ab" },
      { ...base, id: "expense-category", category: "fuel" },
      { ...base, id: "expense-date", date: "2026-1-1" },
      { ...base, id: "expense-notes", notes: "x".repeat(501) },
    ];

    for (const expense of invalidExpenses) {
      await assertFails(
        setDoc(doc(staff, `caravans/ride-a/expenses/${expense.id}`), expense),
      );
    }
  });
});
