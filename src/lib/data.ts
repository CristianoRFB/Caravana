import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, db, firebaseConfigured, storage } from "./firebase";
import { demoCaravan, type Caravan, type Registration } from "./types";

export async function findCaravan(slug: string): Promise<Caravan | null> {
  if (!db || !firebaseConfigured)
    return slug === demoCaravan.slug ? demoCaravan : null;
  const snap = await getDocs(
    query(
      collection(db, "caravans"),
      where("slug", "==", slug),
      where("status", "==", "published"),
    ),
  );
  return snap.empty
    ? null
    : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Caravan);
}
export async function listPublishedCaravans(): Promise<Caravan[]> {
  if (!db || !firebaseConfigured) return [demoCaravan];
  const snap = await getDocs(
    query(collection(db, "caravans"), where("status", "==", "published")),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Caravan);
}
export async function getCaravanById(id: string): Promise<Caravan | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "caravans", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Caravan) : null;
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
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Caravan)),
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
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Registration),
      ),
    fail,
  );
}
export async function reserveSeat(
  caravan: Caravan,
  form: Pick<
    Registration,
    | "passengerName"
    | "phone"
    | "email"
    | "city"
    | "boardingPointId"
    | "boardingPointName"
    | "emergencyContact"
    | "notes"
  >,
): Promise<string> {
  if (!db || caravan.organizationId === "demo")
    throw new Error(
      "Esta caravana de demonstração não recebe inscrições. Cadastre uma caravana no painel para usar o fluxo real.",
    );
  const id =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  const caravanRef = doc(db, "caravans", caravan.id);
  const registrationRef = doc(db, "registrations", id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(caravanRef);
    if (!snap.exists())
      throw new Error("Esta caravana não está mais disponível.");
    const current = snap.data() as Caravan;
    if (
      current.status !== "published" ||
      current.reservedSeats >= current.capacity
    )
      throw new Error("As vagas desta caravana foram preenchidas.");
    tx.update(caravanRef, {
      reservedSeats: current.reservedSeats + 1,
      lastReservationId: id,
      updatedAt: serverTimestamp(),
    });
    tx.set(registrationRef, {
      ...form,
      id,
      organizationId: current.organizationId,
      caravanId: current.id,
      caravanName: current.name,
      amountCents: current.priceCents,
      registrationStatus: "awaiting_payment",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
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
    ? ({ id: snap.id, ...snap.data() } as Registration)
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
          ? ({ id: snap.id, ...snap.data() } as Registration)
          : null,
      ),
    fail,
  );
}
export async function uploadProof(
  registration: Registration,
  file: File,
): Promise<void> {
  if (!db || !storage) throw new Error("Firebase não está configurado.");
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(file.type))
    throw new Error("Envie um arquivo JPG, PNG ou PDF.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("O arquivo deve ter no máximo 8 MB.");
  const fileRef = ref(
    storage,
    `proofs/${registration.organizationId}/${registration.caravanId}/${registration.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`,
  );
  await uploadBytes(fileRef, file, { contentType: file.type });
  await setDoc(
    doc(db, "registrations", registration.id),
    {
      proofPath: fileRef.fullPath,
      paymentStatus: "awaiting_review",
      registrationStatus: "awaiting_review",
      proofUploadedAt: serverTimestamp(),
    },
    { merge: true },
  );
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
  if (!storage || !reg.proofPath)
    throw new Error("Comprovante não encontrado.");
  const bytes = await getBytes(ref(storage, reg.proofPath), 8 * 1024 * 1024);
  const type = reg.proofPath.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : reg.proofPath.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  return new Blob([bytes], { type });
}
export async function login(email: string, password: string): Promise<User> {
  if (!auth) throw new Error("Firebase ainda não está configurado.");
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}
export async function registerAdmin(
  email: string,
  password: string,
): Promise<User> {
  if (!auth) throw new Error("Firebase ainda não está configurado.");
  return (await createUserWithEmailAndPassword(auth, email, password)).user;
}
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
export const watchAuth = (callback: (user: User | null) => void) =>
  auth ? onAuthStateChanged(auth, callback) : () => undefined;
export async function getAdminOrganization(
  uid: string,
): Promise<string | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists() ? String(snap.data().organizationId || "") : null;
}
