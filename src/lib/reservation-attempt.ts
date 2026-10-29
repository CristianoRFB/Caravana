export interface ReservationAttempt { registrationId: string; reservationNonce: string; }
type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
const key = (caravanId: string) => `caravana77:reservation-attempt:v1:${caravanId}`;
export function createReservationAttempt(): ReservationAttempt { return { registrationId: token(), reservationNonce: token() }; }
export function validReservationAttempt(value: unknown): value is ReservationAttempt {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.registrationId === "string" && /^[a-f0-9]{64}$/.test(data.registrationId)
    && typeof data.reservationNonce === "string" && /^[a-f0-9]{64}$/.test(data.reservationNonce)
    && data.registrationId !== data.reservationNonce;
}
export function readReservationAttempt(caravanId: string, storage: AttemptStorage): ReservationAttempt | null {
  try {
    const raw = storage.getItem(key(caravanId));
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (!validReservationAttempt(value)) throw new Error("Invalid attempt");
    return value;
  } catch { throw new Error("Não foi possível recuperar a tentativa de reserva desta aba. Consulte a organização antes de iniciar outra inscrição."); }
}
export function getReservationAttempt(caravanId: string, storage: AttemptStorage): ReservationAttempt {
  const saved = readReservationAttempt(caravanId, storage);
  if (saved) return saved;
  const attempt = createReservationAttempt();
  saveReservationAttempt(caravanId, attempt, storage);
  return attempt;
}
export function saveReservationAttempt(caravanId: string, attempt: ReservationAttempt, storage: AttemptStorage): void {
  if (!validReservationAttempt(attempt)) throw new Error('Tentativa de reserva inválida.');
  const prior = readReservationAttempt(caravanId, storage);
  if (prior && (prior.registrationId !== attempt.registrationId || prior.reservationNonce !== attempt.reservationNonce)) throw new Error('Já existe uma tentativa pendente para esta caravana.');
  try { storage.setItem(key(caravanId), JSON.stringify(attempt)); }
  catch { throw new Error("Permita o armazenamento desta aba para reservar com segurança e tentar novamente sem duplicar sua inscrição."); }
}
export function completeReservationAttempt(caravanId: string, attempt: ReservationAttempt, storage: AttemptStorage): void {
  // Failure to clear is safe: a future retry returns the committed registration.
  try {
    const saved = readReservationAttempt(caravanId, storage);
    if (saved?.registrationId === attempt.registrationId && saved.reservationNonce === attempt.reservationNonce) storage.removeItem(key(caravanId));
  } catch { /* retain the committed operation */ }
}
export async function reservationRequestHash(caravanId: string, form: object): Promise<string> {
  const data = form as Record<string, unknown>;
  const fields = ["passengerName", "cpf", "birthDate", "phone", "email", "city", "boardingPointId", "emergencyContact", "notes", "guardianName", "guardianPhone"];
  const payload = fields.map((field) => field === "cpf" ? String(data[field] ?? "").replace(/\D/g, "") : String(data[field] ?? "").trim());
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["reservation-v1", caravanId, ...payload])));
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}
export class ReservationAttemptConflict extends Error {
  constructor(public readonly registrationId: string) { super("Esta tentativa já criou uma inscrição com outros dados. Consulte a inscrição existente antes de reservar outra vaga."); }
}
