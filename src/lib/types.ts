export type CaravanStatus = "draft" | "published" | "archived";
export type RegistrationStatus =
  | "awaiting_payment"
  | "awaiting_review"
  | "confirmed"
  | "rejected"
  | "cancelled";
export type PaymentStatus =
  "pending" | "awaiting_review" | "approved" | "rejected";

export interface BoardingPoint {
  id: string;
  name: string;
  address: string;
  time: string;
}
export interface Caravan {
  id: string;
  organizationId: string;
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
  organizationId: string;
  caravanId: string;
  caravanName: string;
  passengerName: string;
  cpf?: string;
  birthDate?: string;
  phone: string;
  email: string;
  city: string;
  boardingPointId: string;
  boardingPointName: string;
  emergencyContact: string;
  notes: string;
  amountCents: number;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  proofPath?: string;
  rejectionReason?: string;
  createdAt: string;
  checkedInAt?: string;
}

export const demoCaravan: Caravan = {
  id: "demo-anime-friends-2026",
  organizationId: "demo",
  name: "Caravana Anime Friends 2026",
  slug: "anime-friends-2026",
  event: "Anime Friends 2026",
  description:
    "Uma viagem tranquila para curtir o maior encontro de cultura pop da América Latina com a galera da Caravana 77.",
  date: "2026-07-04",
  departureTime: "06:00",
  returnTime: "21:30",
  city: "São Paulo - SP",
  destination: "Distrito Anhembi",
  address: "Av. Olavo Fontoura, 1209 — Santana, São Paulo - SP",
  priceCents: 8500,
  capacity: 50,
  reservedSeats: 0,
  pixKey: "",
  pixReceiver: "",
  whatsapp: "",
  status: "published",
  boardingPoints: [
    {
      id: "tiete",
      name: "Terminal Tietê",
      address: "Av. Cruzeiro do Sul, 1800",
      time: "06:00",
    },
    {
      id: "jabaquara",
      name: "Metrô Jabaquara",
      address: "R. dos Jequitibás, s/n",
      time: "06:45",
    },
  ],
  benefits: [
    "Transporte ida e volta",
    "Acompanhamento da equipe",
    "Brinde exclusivo da caravana",
  ],
  rules: [
    "Chegue 15 minutos antes do horário do embarque.",
    "Leve documento com foto e ingresso do evento.",
  ],
  faqs: [
    {
      question: "Posso levar comida?",
      answer: "Sim. Leve lanches e bebidas não alcoólicas para o trajeto.",
    },
    {
      question: "Que horas voltamos?",
      answer:
        "A saída do evento está prevista para 19h30, com chegada estimada às 21h30.",
    },
  ],
  announcements: [
    {
      title: "Bem-vindo à caravana!",
      body: "Acompanhe esta página para receber atualizações importantes sobre a viagem.",
    },
  ],
};

export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
