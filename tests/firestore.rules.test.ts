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
  setDoc,
  updateDoc,
  where,
  query,
} from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

let env: RulesTestEnvironment;
const secretA = "a".repeat(64);
const secretB = "b".repeat(64);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "caravana-rules-test",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
    storage: {
      rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8"),
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
    const reserve = async (id: string) =>
      runTransaction(guest, async (tx) => {
        const caravanRef = doc(guest, "caravans/ride-a");
        const snapshot = await tx.get(caravanRef);
        const current = snapshot.data()!;
        if (current.reservedSeats >= current.capacity) throw new Error("full");
        tx.update(caravanRef, {
          reservedSeats: current.reservedSeats + 1,
          lastReservationId: id,
        });
        tx.set(doc(guest, `registrations/${id}`), {
          id,
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
      });
    const results = await Promise.allSettled([
      reserve(secretA),
      reserve(secretB),
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

  it("accepts private image proofs up to 8 MiB and limits reads to organization staff", async () => {
    await seed();
    const guest = env.unauthenticatedContext();
    const proofPath = `proofs/org-a/ride-a/${secretA}/proof.png`;
    await assertSucceeds(
      uploadBytes(
        ref(guest.storage(), proofPath),
        new Uint8Array([137, 80, 78, 71]),
        { contentType: "image/png" },
      ),
    );
    await assertFails(getBytes(ref(guest.storage(), proofPath)));
    await assertSucceeds(
      getBytes(ref(env.authenticatedContext("admin-a").storage(), proofPath)),
    );
    await assertFails(
      uploadBytes(
        ref(guest.storage(), `proofs/org-a/ride-a/${secretA}/bad.txt`),
        new Uint8Array([1, 2]),
        { contentType: "text/plain" },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(guest.storage(), `proofs/org-a/ride-a/${secretA}/too-large.png`),
        new Uint8Array(8 * 1024 * 1024 + 1),
        { contentType: "image/png" },
      ),
    );
  });
});
