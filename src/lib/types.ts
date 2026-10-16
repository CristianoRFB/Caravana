export type CaravanStatus = "draft" | "published" | "archived";
export type RegistrationStatus =
  | "awaiting_payment"
  | "awaiting_review"
  | "confirmed"
  | "rejected"
  | "cancelled";
export type PaymentStatus =
  | "pending"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "reported";
export type PaymentMethod = "pix" | "transfer" | "cash" | "card" | "other";
export type ExpenseCategory =
  | "transporte"
  | "alimentacao"
  | "pedagio"
  | "estacionamento"
  | "outros";

export interface DocumentRecord {
  label: string;
  value: string;
}

export interface PassengerPayment {
  id: string;
  registrationId: string;
  organizationId: string;
  caravanId: string;
  amountCents: number;
  method: PaymentMethod;
  paymentDate?: string;
  notes: string;
  status: "active" | "voided";
  createdAt: string;
  createdBy: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
}

export interface CaravanExpense {
  id: string;
  organizationId: string;
  caravanId: string;
  description: string;
  category: ExpenseCategory;
  amountCents: number;
  date: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
export type AuthorizationStatus =
  | "unknown"
  | "not_required"
  | "not_sent"
  | "pending"
  | "received"
  | "approved";

export interface BoardingPoint {
  id: string;
  name: string;
  address: string;
  time: string;
}
export interface Caravan {
  id: string;
  organizationId: string;
  organizerName?: string;
  name: string;
  slug: string;
  event: string;
  description: string;
  date: string;
  departureTime: string;
  returnTime: string;
  city: string;
  destination: string;
  address: string;
  priceCents: number;
  capacity: number;
  reservedSeats: number;
  lastReservationNonce?: string;
  requiresMinorAuthorization?: boolean;
  paymentMethod?: string;
  paymentInstructions?: string;
  paymentDeadline?: string;
  pixKey: string;
  pixReceiver: string;
  whatsapp: string;
  status: CaravanStatus;
  boardingPoints: BoardingPoint[];
  benefits: string[];
  rules: string[];
  faqs: { question: string; answer: string }[];
  announcements: { title: string; body: string; createdAt?: string }[];
}
export interface Registration {
  id: string;
  portalAccessRevoked?: boolean;
  reservationNonce?: string;
  reservationRequestHash?: string;
  importedFromLegacy?: boolean;
  importBatchId?: string;
  importOperationId?: string;
  importIdentityKeys?: string[];
  organizationId: string;
  caravanId: string;
  caravanName: string;
  passengerName: string;
  cpf?: string;
  documentRecords?: DocumentRecord[];
  birthDate?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  authorizationStatus?: AuthorizationStatus;
  phone: string;
  email: string;
  city: string;
  boardingPointId: string;
  boardingPointName: string;
  emergencyContact: string;
  notes: string;
  amountCents?: number;
  paymentTotalCents?: number;
  paymentReportedMethod?: "pix";
  paymentReportedUnreconciled?: boolean;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  proofId?: string;
  rejectionReason?: string;
  createdAt: string;
  checkedInAt?: string;
}

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));

export function ageOnDate(birthDate: string, eventDate: string): number | null {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const event = new Date(`${eventDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(event.getTime()) ||
    birth.toISOString().slice(0, 10) !== birthDate ||
    event.toISOString().slice(0, 10) !== eventDate ||
    event < birth
  ) {
    return null;
  }
  let age = event.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    event.getUTCMonth() < birth.getUTCMonth() ||
    (event.getUTCMonth() === birth.getUTCMonth() &&
      event.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}
