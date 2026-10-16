import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { runTransaction, setDoc, updateDoc, writeBatch } from "./tracked-firestore";
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
  type ExpenseCategory,
  type PassengerPayment,
  type PaymentMethod,
  type Registration,
} from "./types";
import { legacyImportDocumentId, type LegacyRegistrationDraft } from "./legacy-import";
import { validateProofFile } from "./proof-policy";
import { isDemoIdentity } from "./demo-identities";

const legacyReservationIdsCleared = new Set<string>();

export async function findCaravan(slug: string): Promise<Caravan | null> {
  if (!db || !firebaseConfigured)
    throw new Error("A agenda de viagens ainda não está disponível.");
  const snap = await getDocs(
    query(
      collection(db, "caravans"),
      where("slug", "==", slug),
      where("status", "==", "published"),
    ),
  );
  return snap.empty
    ? null
    : ({ ...snap.docs[0].data(), id: snap.docs[0].id } as Caravan);
}
export async function listPublishedCaravans(): Promise<Caravan[]> {
  if (!db || !firebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, "caravans"), where("status", "==", "published")),
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
): Promise<string> {
  if (!db || !firebaseConfigured)
    throw new Error("O serviço de reservas ainda não está configurado.");
  if (caravan.organizationId === "demo")
    throw new Error(
      "Esta caravana de demonstração não recebe inscrições.",
    );
  const database = db;
  if (isDemoIdentity(form.email)) assertIdentityAllowed(form.email);
  const id =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  // The public caravan may expose this nonce; only the private receipt knows the registration ID.
  const reservationNonce =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  const caravanRef = doc(database, "caravans", caravan.id);
  const registrationRef = doc(database, "registrations", id);
  const receiptRef = doc(database, "reservationReceipts", reservationNonce);
  const { cpf, birthDate, guardianName, guardianPhone, ...registrationDetails } = form;
  await runTransaction(database, async (tx) => {
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
      id,
      reservationNonce,
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
    uploadedAt: serverTimestamp(),
  });
  batch.update(registrationRef, {
    proofId: "current",
    paymentStatus: "awaiting_review",
    registrationStatus: "awaiting_review",
    proofUploadedAt: serverTimestamp(),
  });
  await batch.commit();
}
export async function reviewPayment(
  reg: Registration,
  approve: boolean,
  reason = "",
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  await setDoc(
    doc(db, "registrations", reg.id),
    approve
      ? {
          paymentStatus: "approved",
          registrationStatus: "confirmed",
          approvedBy: auth.currentUser.uid,
          approvedAt: serverTimestamp(),
        }
      : {
          paymentStatus: "rejected",
          registrationStatus: "rejected",
          rejectedBy: auth.currentUser.uid,
          rejectedAt: serverTimestamp(),
          rejectionReason: reason,
        },
    { merge: true },
  );
}
export async function toggleCheckin(
  reg: Registration,
  checked: boolean,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  await setDoc(
    doc(db, "registrations", reg.id),
    checked
      ? { checkedInAt: serverTimestamp(), checkedInBy: auth.currentUser.uid }
      : { checkedInAt: null, checkedInBy: null },
    { merge: true },
  );
}
export async function cancelRegistration(reg: Registration): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  const database = db;
  const userId = auth.currentUser.uid;
  await runTransaction(database, async (tx) => {
    const regRef = doc(database, "registrations", reg.id);
    const current = await tx.get(regRef);
    if (!current.exists()) throw new Error("Inscrição não encontrada.");
    if (current.data().registrationStatus === "cancelled") return;
    const caravanRef = doc(
      database,
      "caravans",
      String(current.data().caravanId),
    );
    const caravanSnap = await tx.get(caravanRef);
    if (!caravanSnap.exists()) throw new Error("Caravana não encontrada.");
    const seats = Number(caravanSnap.data().reservedSeats || 0);
    tx.update(regRef, {
      registrationStatus: "cancelled",
      cancelledBy: userId,
      cancelledAt: serverTimestamp(),
    });
    tx.update(caravanRef, {
      reservedSeats: Math.max(0, seats - 1),
      updatedAt: serverTimestamp(),
    });
  });
}
export async function createCaravan(
  orgId: string,
  payload: Omit<Caravan, "id" | "organizationId" | "reservedSeats">,
): Promise<void> {
  if (!db) throw new Error("Firebase não está configurado.");
  const caravanRef = doc(collection(db, "caravans"));
  await setDoc(caravanRef, {
    ...payload,
    organizationId: orgId,
    reservedSeats: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateCaravan(
  id: string,
  patch: Partial<Caravan>,
): Promise<void> {
  if (!db) throw new Error("Firebase não está configurado.");
  await setDoc(
    doc(db, "caravans", id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
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
  await setDoc(
    doc(db, "registrations", registration.id),
    { authorizationStatus: status, authorizationUpdatedAt: serverTimestamp() },
    { merge: true },
  );
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
  await setDoc(
    doc(db, "registrations", registration.id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function importLegacyRegistrations(
  caravanId: string,
  organizationId: string,
  rows: LegacyRegistrationDraft[],
  batchId: string,
): Promise<{ imported: number; skipped: number }> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  if (rows.length === 0) return { imported: 0, skipped: 0 };
  if (rows.length > 400)
    throw new Error("Importe no máximo 400 passageiros por vez.");

  const database = db;
  if (!/^[a-f0-9]{32}$/.test(batchId))
    throw new Error("Identificador de importação inválido. Selecione o arquivo novamente.");
  const registrationRefs = await Promise.all(
    rows.map(async (row) => {
      const id = await legacyImportDocumentId(batchId, row.line);
      return doc(database, "registrations", id);
    }),
  );
  const caravanRef = doc(database, "caravans", caravanId);
  const importedAt = new Date().toISOString();
  let imported = 0;

  await runTransaction(database, async (tx) => {
    const snapshot = await tx.get(caravanRef);
    const existingSnapshots = await Promise.all(
      registrationRefs.map((reference) => tx.get(reference)),
    );
    if (!snapshot.exists()) throw new Error("Caravana não encontrada.");
    const caravan = snapshot.data() as Caravan;
    if (caravan.organizationId !== organizationId)
      throw new Error("Esta caravana pertence a outra organização.");
    const newRows = rows
      .map((row, index) => ({ row, reference: registrationRefs[index], existing: existingSnapshots[index] }))
      .filter(({ existing }) => {
        if (!existing.exists()) return true;
        if (existing.data().importBatchId !== batchId)
          throw new Error("Conflito de identificador na importação. Selecione o arquivo novamente.");
        return false;
      });
    const available = caravan.capacity - caravan.reservedSeats;
    if (newRows.length > available) {
      throw new Error(
        `Há somente ${Math.max(0, available)} vagas disponíveis. Restam ${newRows.length} passageiros para importar.`,
      );
    }

    imported = newRows.length;
    if (newRows.length) {
      tx.update(caravanRef, {
        reservedSeats: caravan.reservedSeats + newRows.length,
        updatedAt: serverTimestamp(),
      });
    }
    newRows.forEach(({ row, reference }) => {
      const { line, ...registration } = row;
      void line;
      tx.set(reference, {
        ...registration,
        id: reference.id,
        importedFromLegacy: true,
        importBatchId: batchId,
        organizationId,
        caravanId,
        caravanName: caravan.name,
        createdAt: importedAt,
      });
    });
  });
  return { imported, skipped: rows.length - imported };
}

export interface PassengerPaymentInput {
  amountCents: number;
  method: PaymentMethod;
  paymentDate?: string;
  notes: string;
}

export function watchPassengerPayments(
  registrationId: string,
  callback: (items: PassengerPayment[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    query(
      collection(db, "registrations", registrationId, "payments"),
      orderBy("createdAt", "desc"),
    ),
    (snapshot) =>
      callback(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as PassengerPayment)),
    fail,
  );
}

export async function recordPassengerPayment(
  registration: Registration,
  input: PassengerPaymentInput,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
    throw new Error("Informe um valor positivo em centavos.");
  if (!input.notes.trim() && input.notes.length > 500)
    throw new Error("A observação pode ter no máximo 500 caracteres.");
  if (input.notes.length > 500)
    throw new Error("A observação pode ter no máximo 500 caracteres.");
  if (input.paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate))
    throw new Error("A data do pagamento é inválida.");

  const database = db;
  const userId = auth.currentUser.uid;
  const registrationRef = doc(database, "registrations", registration.id);
  const paymentRef = doc(collection(database, "registrations", registration.id, "payments"));
  await runTransaction(database, async (tx) => {
    const [registrationSnapshot, existingPayment] = await Promise.all([
      tx.get(registrationRef),
      tx.get(paymentRef),
    ]);
    if (!registrationSnapshot.exists()) throw new Error("Inscrição não encontrada.");
    if (existingPayment.exists()) throw new Error("Este pagamento já foi registrado.");
    const current = registrationSnapshot.data();
    if (current.registrationStatus === "cancelled")
      throw new Error("Não é possível registrar pagamento para uma inscrição cancelada.");
    const paid = Number(current.paymentTotalCents || 0);
    const due = current.amountCents;
    if (
      Number.isSafeInteger(due) &&
      due > 0 &&
      paid + input.amountCents > due
    ) {
      throw new Error("O pagamento ultrapassa o saldo conhecido da inscrição.");
    }
    tx.set(paymentRef, {
      id: paymentRef.id,
      registrationId: registration.id,
      organizationId: current.organizationId,
      caravanId: current.caravanId,
      amountCents: input.amountCents,
      method: input.method,
      ...(input.paymentDate ? { paymentDate: input.paymentDate } : {}),
      notes: input.notes.trim(),
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: userId,
    });
    tx.update(registrationRef, {
      paymentTotalCents: paid + input.amountCents,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function voidPassengerPayment(
  registrationId: string,
  paymentId: string,
  reason: string,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  const note = reason.trim();
  if (note.length < 3 || note.length > 300)
    throw new Error("Explique a correção em 3 a 300 caracteres.");
  const database = db;
  const userId = auth.currentUser.uid;
  const registrationRef = doc(database, "registrations", registrationId);
  const paymentRef = doc(database, "registrations", registrationId, "payments", paymentId);
  await runTransaction(database, async (tx) => {
    const [registrationSnapshot, paymentSnapshot] = await Promise.all([
      tx.get(registrationRef),
      tx.get(paymentRef),
    ]);
    if (!registrationSnapshot.exists() || !paymentSnapshot.exists())
      throw new Error("Pagamento ou inscrição não encontrado.");
    const payment = paymentSnapshot.data();
    if (payment.status === "voided") return;
    const paid = Number(registrationSnapshot.data().paymentTotalCents || 0);
    const nextPaid = paid - Number(payment.amountCents || 0);
    if (nextPaid < 0) throw new Error("O total registrado está inconsistente.");
    tx.update(registrationRef, {
      paymentTotalCents: nextPaid,
      updatedAt: serverTimestamp(),
    });
    tx.update(paymentRef, {
      status: "voided",
      voidReason: note,
      voidedAt: serverTimestamp(),
      voidedBy: userId,
    });
  });
}

export function watchCaravanExpenses(
  caravanId: string,
  callback: (items: CaravanExpense[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(
    query(collection(db, "caravans", caravanId, "expenses"), orderBy("date", "desc")),
    (snapshot) =>
      callback(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as CaravanExpense)),
    fail,
  );
}

export interface CaravanExpenseInput {
  description: string;
  category: ExpenseCategory;
  amountCents: number;
  date: string;
  notes: string;
}

export async function createCaravanExpense(
  caravanId: string,
  organizationId: string,
  input: CaravanExpenseInput,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  validateExpenseInput(input);
  const reference = doc(collection(db, "caravans", caravanId, "expenses"));
  const userId = auth.currentUser.uid;
  await setDoc(reference, {
    id: reference.id,
    organizationId,
    caravanId,
    ...input,
    description: input.description.trim(),
    notes: input.notes.trim(),
    createdAt: new Date().toISOString(),
    createdBy: userId,
  });
}

export async function updateCaravanExpense(
  caravanId: string,
  expenseId: string,
  input: CaravanExpenseInput,
): Promise<void> {
  if (!db || !auth?.currentUser)
    throw new Error("Sessão administrativa não encontrada.");
  validateExpenseInput(input);
  await updateDoc(doc(db, "caravans", caravanId, "expenses", expenseId), {
    ...input,
    description: input.description.trim(),
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.uid,
  });
}

function validateExpenseInput(input: CaravanExpenseInput) {
  if (input.description.trim().length < 3 || input.description.length > 120)
    throw new Error("A descrição deve ter entre 3 e 120 caracteres.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
    throw new Error("Informe um valor positivo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new Error("Informe uma data válida.");
  if (input.notes.length > 500)
    throw new Error("A observação pode ter no máximo 500 caracteres.");
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
