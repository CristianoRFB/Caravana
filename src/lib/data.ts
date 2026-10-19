import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { runTransaction, updateDoc, writeBatch } from "./tracked-firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, db, firebaseConfigured, assertIdentityAllowed } from "./firebase";
import {
  ageOnDate,
  type AuthorizationStatus,
  type Caravan,
  type CaravanExpense,
  type PassengerPayment,
  type Registration,
} from "./types";

import { validateProofFile } from "./proof-policy";
import { isDemoIdentity } from "./demo-identities";
import { getDocumentPolicy, reviewAuthorization, updatePassengerWithAuthorizationReset } from "./documents";
import { createReservationAttempt, reservationRequestHash, ReservationAttemptConflict, validReservationAttempt, type ReservationAttempt } from "./reservation-attempt";
import { createLimitedCaravan, updateLimitedCaravan } from "./quota-operations";
import { importDigest } from "./import-identity";
import { completeQuotaAttempt, getQuotaAttempt } from "./quota-attempt";
import { trackWrite } from "./pending-writes";

const legacyReservationIdsCleared = new Set<string>();

export async function findCaravan(slug: string, organizationId?: string): Promise<Caravan | null> {
  if (!db || !firebaseConfigured)
    throw new Error("A agenda de viagens ainda não está disponível.");
  if (!organizationId) {
    const alias = await getDocFromServer(doc(db, "legacyTripAliases", slug));
    if (alias.exists()) {
      const target = await getCaravanById(String(alias.data().caravanId || ""));
      if (!target || target.slug !== slug || target.organizationId !== alias.data().organizationId || target.status !== "published") throw new Error("O endereço histórico desta caravana precisa ser conferido pela organização.");
      return target;
    }
  }
  const snap = await getDocs(
    query(
      collection(db, "caravans"),
      where("slug", "==", slug),
      where("status", "==", "published"),
      ...(organizationId ? [where("organizationId", "==", organizationId)] : []),
    ),
  );
  if (snap.size > 1) throw new Error("Há mais de uma caravana com este endereço. Use o link completo da organização.");
  return snap.empty
    ? null
    : ({ ...snap.docs[0].data(), id: snap.docs[0].id } as Caravan);
}
export async function listPublishedCaravans(organizationId?: string): Promise<Caravan[]> {
  if (!db || !firebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, "caravans"), where("status", "==", "published"), ...(organizationId ? [where("organizationId", "==", organizationId)] : [])),
  );
  return snap.docs.map((item) => ({ ...item.data(), id: item.id }) as Caravan);
}
export async function getCaravanById(id: string): Promise<Caravan | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "caravans", id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Caravan) : null;
}
export function watchAdminCaravans(
  orgId: string,
  callback: (items: Caravan[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    query(collection(db, "caravans"), where("organizationId", "==", orgId)),
    (snap) =>
      callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Caravan)),
    fail,
  );
}
export function watchRegistrations(
  orgId: string,
  caravanId: string,
  callback: (items: Registration[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    query(
      collection(db, "registrations"),
      where("organizationId", "==", orgId),
      where("caravanId", "==", caravanId),
    ),
    (snap) =>
      callback(
        snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Registration),
      ),
    fail,
  );
}
export function watchOrganizationRegistrations(
  orgId: string,
  callback: (items: Registration[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    query(collection(db, "registrations"), where("organizationId", "==", orgId)),
    (snap) =>
      callback(
        snap.docs.map((item) => ({ ...item.data(), id: item.id }) as Registration),
      ),
    fail,
  );
}
export async function reserveSeat(
  caravan: Caravan,
  form: Pick<
    Registration,
    | "passengerName"
    | "cpf"
    | "birthDate"
    | "phone"
    | "email"
    | "city"
    | "boardingPointId"
    | "boardingPointName"
    | "emergencyContact"
    | "notes"
    | "guardianName"
    | "guardianPhone"
  >,
  attempt: ReservationAttempt = createReservationAttempt(),
): Promise<string> {
  if (!db || !firebaseConfigured)
    throw new Error("O serviço de reservas ainda não está configurado.");
  if (caravan.organizationId === "demo")
    throw new Error(
      "Esta caravana de demonstração não recebe inscrições.",
    );
  const database = db;
  if (isDemoIdentity(form.email)) assertIdentityAllowed(form.email);
  if (!validReservationAttempt(attempt)) throw new Error("Tentativa de reserva inválida.");
  const id = attempt.registrationId;
  // The public caravan may expose this nonce; only the private receipt knows the registration ID.
  const reservationNonce = attempt.reservationNonce;
  const requestHash = await reservationRequestHash(caravan.id, form);
  const caravanRef = doc(database, "caravans", caravan.id);
  const registrationRef = doc(database, "registrations", id);
  const receiptRef = doc(database, "reservationReceipts", reservationNonce);
  const { cpf, birthDate, guardianName, guardianPhone, ...registrationDetails } = form;
  const matchesAttempt = (saved: Record<string, unknown>) => saved.caravanId === caravan.id && saved.reservationNonce === reservationNonce && saved.reservationRequestHash === requestHash;
  try {
    await runTransaction(database, async (tx) => {
      const existing = await tx.get(registrationRef);
      if (existing.exists()) {
        const saved = existing.data();
        if (!matchesAttempt(saved)) throw new ReservationAttemptConflict(id);
        return;
      }
      const snap = await tx.get(caravanRef);
      if (!snap.exists())
        throw new Error("Esta caravana não está mais disponível.");
      const current = snap.data() as Caravan;
      if (typeof current.organizationId !== "string" || !current.organizationId.trim() ||
          typeof current.name !== "string" || !current.name.trim() ||
          !Number.isSafeInteger(current.priceCents) || current.priceCents < 0 ||
          !Number.isSafeInteger(current.capacity) || current.capacity <= 0 ||
          !Number.isSafeInteger(current.reservedSeats) || current.reservedSeats < 0) {
        throw new Error("Esta caravana está com dados incompletos. Fale com a organização.");
      }
      const availability = await tx.get(doc(database, "organizationAvailability", current.organizationId));
      if (availability.data()?.status === "suspended") throw new Error("Novas reservas estão temporariamente suspensas pela organização.");
      if (
        current.status !== "published" ||
        current.reservedSeats >= current.capacity
      )
        throw new Error("As vagas desta caravana foram preenchidas.");
      const boardingPoint = (Array.isArray(current.boardingPoints) ? current.boardingPoints : []).find(
        (point) => point.id === form.boardingPointId,
      );
      if (!boardingPoint || typeof boardingPoint.name !== "string" || !boardingPoint.name.trim())
        throw new Error(
          "Este ponto de embarque não está mais disponível. Atualize a página e tente novamente.",
        );
      let minorForThisTrip = false;
      if (current.requiresMinorAuthorization) {
        if (!birthDate) {
          throw new Error("Informe a data de nascimento para esta viagem.");
        }
        const age = ageOnDate(birthDate, current.date);
        if (age === null) {
          throw new Error("Confira a data de nascimento informada.");
        }
        minorForThisTrip = age < 18;
        if (
          minorForThisTrip &&
          (!form.guardianName?.trim() || !form.guardianPhone?.trim())
        ) {
          throw new Error(
            "Para passageiro menor, informe nome e telefone do responsável.",
          );
        }
      }
      if (current.lastReservationNonce) {
        tx.delete(
          doc(database, "reservationReceipts", current.lastReservationNonce),
        );
      }
      tx.update(caravanRef, {
        reservedSeats: current.reservedSeats + 1,
        lastReservationNonce: reservationNonce,
        lastReservationId: deleteField(),
        updatedAt: serverTimestamp(),
    });
    tx.set(registrationRef, {
      ...registrationDetails,
      ...(cpf ? { cpf: cpf.replace(/\D/g, "") } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(current.requiresMinorAuthorization
        ? {
            isMinor: minorForThisTrip,
            authorizationStatus: minorForThisTrip
              ? ("not_sent" as const)
              : ("not_required" as const),
          }
        : {}),
      ...(minorForThisTrip
        ? {
            guardianName: guardianName?.trim(),
            guardianPhone: guardianPhone?.trim(),
          }
        : {}),
      boardingPointName: boardingPoint.name,
      boardingPointSnapshot: boardingPoint,
      id,
      reservationNonce,
      reservationRequestHash: requestHash,
      organizationId: current.organizationId,
      caravanId: caravanRef.id,
      caravanName: current.name,
      amountCents: current.priceCents,
      registrationStatus: "awaiting_payment",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    });
    tx.set(receiptRef, {
      registrationId: id,
      organizationId: current.organizationId,
      caravanId: caravanRef.id,
    });
    });
  } catch (cause) {
    // Concurrent same-operation creates may be rejected by Rules before SDK conflict retry.
    // A fresh server read is the only acceptable evidence that this exact request committed.
    try {
      const committed = await getDocFromServer(registrationRef);
      if (committed.exists() && matchesAttempt(committed.data())) return id;
    } catch { /* no confirmed receipt: preserve the original failure and pending attempt */ }
    throw cause;
  }
  return id;
}
export async function getRegistration(
  id: string,
): Promise<Registration | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "registrations", id));
  return snap.exists()
    ? ({ ...snap.data(), id: snap.id } as Registration)
    : null;
}
export function watchRegistration(
  id: string,
  callback: (registration: Registration | null) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    doc(db, "registrations", id),
    (snap) =>
      callback(
        snap.exists()
          ? ({ ...snap.data(), id: snap.id } as Registration)
          : null,
      ),
    fail,
  );
}
export async function setPortalAccessRevoked(registrationId: string, revoked: boolean): Promise<void> {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  await updateDoc(doc(db, "registrations", registrationId), {
    portalAccessRevoked: revoked,
    portalAccessUpdatedAt: serverTimestamp(),
    portalAccessUpdatedBy: auth.currentUser.uid,
  });
}

export async function uploadProof(
  registration: Registration,
  file: File,
): Promise<void> {
  if (!db) throw new Error("Firebase não está configurado.");
  const bytes = await validateProofFile(file);
  const policy = await getDocumentPolicy(registration.organizationId);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const content = btoa(binary);
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const fileName =
    file.name.normalize("NFKC").replace(/[^\w.-]/g, "_").slice(0, 100) ||
    `comprovante.${extension}`;
  const database = db;
  const proofRef = doc(database, "registrations", registration.id, "proofs", "current");
  const registrationRef = doc(database, "registrations", registration.id);
  const batch = writeBatch(database);
  batch.set(proofRef, {
    registrationId: registration.id,
    organizationId: registration.organizationId,
    caravanId: registration.caravanId,
    contentType: file.type,
    fileName,
    content,
    retentionDays: policy.proofDays,
    uploadedAt: serverTimestamp(),
  });
  batch.update(registrationRef, {
    proofId: "current",
    paymentStatus: "awaiting_review",
    registrationStatus: "awaiting_review",
    proofUploadedAt: serverTimestamp(),
    proofRetentionDays: policy.proofDays,
  });
  await batch.commit();
}
export { reviewPayment, toggleCheckin, cancelRegistration } from "./registration-operations";
async function caravanCommand(scope: string, payload: unknown, operationId: string | undefined, execute: (id?: string) => Promise<unknown>): Promise<void> {
  return trackWrite(async () => {
    if (operationId || typeof window === "undefined") { await execute(operationId); return; }
    if (!auth?.currentUser) throw new Error("Entre com a conta da organização.");
    const actorScope = `${auth.currentUser.uid}:${scope}`; const digest = await importDigest(payload);
    const id = getQuotaAttempt(actorScope, digest, window.sessionStorage);
    await execute(id); completeQuotaAttempt(actorScope, digest, id, window.sessionStorage);
  });
}
export async function createCaravan(
  orgId: string,
  payload: Omit<Caravan, "id" | "organizationId" | "reservedSeats">,
  operationId?: string,
): Promise<void> {
  await caravanCommand(`${orgId}:caravan:new`, payload, operationId, (id) => createLimitedCaravan(orgId, payload, id));
}
export async function updateCaravan(
  id: string,
  patch: Partial<Caravan>,
  operationId?: string,
): Promise<void> {
  await caravanCommand(`caravan:${id}`, patch, operationId, (op) => updateLimitedCaravan(id, patch, op));
}
export async function loadProof(reg: Registration): Promise<Blob> {
  if (!db || !reg.proofId)
    throw new Error("Comprovante não encontrado.");
  const snapshot = await getDoc(
    doc(db, "registrations", reg.id, "proofs", reg.proofId),
  );
  if (!snapshot.exists()) throw new Error("Comprovante não encontrado.");
  const proof = snapshot.data();
  const raw = atob(String(proof.content || ""));
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  const type = String(proof.contentType || "application/octet-stream");
  return new Blob([bytes], { type });
}
export async function login(email: string, password: string): Promise<User> {
  assertIdentityAllowed(email);
  if (!auth) throw new Error("Firebase ainda não está configurado.");
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}
export async function registerAdmin(
  email: string,
  password: string,
): Promise<User> {
  assertIdentityAllowed(email);
  if (!auth) throw new Error("Firebase ainda não está configurado.");
  return (await createUserWithEmailAndPassword(auth, email, password)).user;
}
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
export const watchAuth = (callback: (user: User | null) => void) =>
  auth ? onAuthStateChanged(auth, (user) => {
    try {
      if (user?.email && isDemoIdentity(user.email)) assertIdentityAllowed(user.email);
      callback(user);
    } catch {
      callback(null);
      if (auth) void signOut(auth).catch(() => undefined);
    }
  }) : () => undefined;

export async function getOwnProfile(): Promise<{ displayName: string; registrationIds: string[] } | null> {
  if (!db || !auth?.currentUser) return null;
  const snapshot = await getDoc(doc(db, "profiles", auth.currentUser.uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { displayName: typeof data.displayName === "string" ? data.displayName : "", registrationIds: Array.isArray(data.registrationIds) ? data.registrationIds.filter((value): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value)) : [] };
}
export async function getAdminOrganization(
  uid: string,
): Promise<string | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists() ? String(snap.data().organizationId || "") : null;
}

export async function updateAuthorizationStatus(
  registration: Registration,
  status: AuthorizationStatus,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  await reviewAuthorization(registration, status);
}

export async function updatePassengerDetails(
  registration: Registration,
  patch: Pick<
    Registration,
    | "passengerName"
    | "phone"
    | "email"
    | "birthDate"
    | "boardingPointId"
    | "boardingPointName"
    | "emergencyContact"
    | "guardianName"
    | "guardianPhone"
    | "isMinor"
    | "authorizationStatus"
  >,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  await updatePassengerWithAuthorizationReset(registration, patch);
}

export { importLegacyRegistrations } from "./import-operations";

export { recordPassengerPayment, voidPassengerPayment, createCaravanExpense, updateCaravanExpense, voidCaravanExpense } from "./financial-operations";
export type { PassengerPaymentInput, CaravanExpenseInput } from "./financial-operations";

export function watchPassengerPayments(
  registrationId: string,
  callback: (items: PassengerPayment[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    collection(db, "registrations", registrationId, "payments"),
    (snapshot) =>
      callback(snapshot.docs.map((item) => {
        const data = item.data();
        return { ...data, id: item.id, createdAt: data.postedAt?.toDate?.().toISOString() || String(data.createdAt || "") } as PassengerPayment;
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    fail,
  );
}

export function watchCaravanExpenses(
  caravanId: string,
  callback: (items: CaravanExpense[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    collection(db, "caravans", caravanId, "expenses"),
    (snapshot) =>
      callback(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as CaravanExpense).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))),
    fail,
  );
}

export async function clearLegacyReservationIds(
  organizationId: string,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  if (legacyReservationIdsCleared.has(organizationId)) return;
  const snapshot = await getDocs(
    query(
      collection(db, "caravans"),
      where("organizationId", "==", organizationId),
    ),
  );
  const legacyDocs = snapshot.docs.filter((item) =>
    Object.hasOwn(item.data(), "lastReservationId"),
  );
  for (let start = 0; start < legacyDocs.length; start += 450) {
    const batch = writeBatch(db);
    for (const item of legacyDocs.slice(start, start + 450)) {
      batch.update(item.ref, {
        lastReservationId: deleteField(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  legacyReservationIdsCleared.add(organizationId);
}
