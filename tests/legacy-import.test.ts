import { describe, expect, it } from "vitest";
import {
  legacyImportDocumentId,
  parseLegacyRegistrationCsv,
} from "../src/lib/legacy-import";
import type { Caravan, Registration } from "../src/lib/types";

const caravan: Caravan = {
  id: "ride-test",
  organizationId: "org-test",
  name: "Viagem de teste",
  slug: "viagem-de-teste",
  event: "Evento de teste",
  description: "",
  date: "2026-10-18",
  departureTime: "06:00",
  returnTime: "21:00",
  city: "São Paulo",
  destination: "São Paulo",
  address: "",
  priceCents: 8500,
  capacity: 25,
  reservedSeats: 0,
  pixKey: "",
  pixReceiver: "",
  whatsapp: "",
  status: "published",
  boardingPoints: [{ id: "p1", name: "Terminal", address: "", time: "06:00" }],
  benefits: [],
  rules: [],
  faqs: [],
  announcements: [],
};

const headers = "Nome;Telefone;E-mail;CPF;Tipo documento 1;Número documento 1;Tipo documento 2;Número documento 2;Pagamento informado;Cidade;Ponto de embarque;Data de nascimento;Nome do responsável;Telefone do responsável;Contato de emergência;Valor combinado;Observações";

function registrationWithDocument(value: string): Registration {
  return {
    id: "existing-test",
    organizationId: "org-test",
    caravanId: "ride-test",
    caravanName: "Viagem de teste",
    passengerName: "Pessoa Exemplo",
    phone: "",
    email: "",
    city: "",
    boardingPointId: "",
    boardingPointName: "Não informado",
    emergencyContact: "",
    notes: "",
    registrationStatus: "confirmed",
    paymentStatus: "reported",
    createdAt: "2026-01-01T00:00:00.000Z",
    documentRecords: [{ label: "Documento", value }],
  };
}

describe("legacy passenger imports", () => {
  it("preserves raw document labels and unquantified Pix reports without filling missing fields", () => {
    const csv = `${headers}\nPessoa Exemplo;;;;Identidade antiga;AB-12.345;;;Pix;Vila Teste;;;;;;;;`;
    const result = parseLegacyRegistrationCsv(csv, caravan, [], { historicalArchive: true });
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      passengerName: "Pessoa Exemplo",
      phone: "",
      email: "",
      city: "Vila Teste",
      boardingPointId: "",
      boardingPointName: "Não informado",
      documentRecords: [{ label: "Identidade antiga", value: "AB-12.345" }],
      paymentReportedMethod: "pix",
      paymentReportedUnreconciled: true,
      paymentStatus: "reported",
      registrationStatus: "confirmed",
      paymentTotalCents: 0,
    });
    expect(result.rows[0].amountCents).toBeUndefined();
  });

  it("rejects contactless imports by default and catches repeated document identifiers", () => {
    const csv = `${headers}\nPessoa Exemplo;;;;Documento;AB-12.345;;;;Vila Teste;;;;;;;;\nPessoa Dois;;;;Documento;AB-12.345;;;;Cidade Exemplo;;;;;;;;`;
    const strict = parseLegacyRegistrationCsv(csv, caravan, []);
    expect(strict.errors[0]).toContain("telefone ou e-mail");

    const historical = parseLegacyRegistrationCsv(csv, caravan, [], { historicalArchive: true });
    expect(historical.rows).toHaveLength(1);
    expect(historical.errors).toHaveLength(1);
    expect(historical.errors[0]).toContain("duplicado");
  });

  it("does not import an identifier that already belongs to this trip", () => {
    const csv = `${headers}\nPessoa Exemplo;;;;Documento;AB-12.345;;;;Vila Teste;;;;;;;;`;
    const existing = registrationWithDocument("AB-12.345");
    const result = parseLegacyRegistrationCsv(csv, caravan, [existing], { historicalArchive: true });
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("duplicado");
  });

  it("keeps age and authorization unverified when a historical list has no birth date", () => {
    const trip = { ...caravan, requiresMinorAuthorization: true };
    const csv = `${headers}\nPessoa Exemplo;;;;Documento;AB-12.345;;;;Vila Teste;;;;;;;;`;
    const result = parseLegacyRegistrationCsv(csv, trip, [], { historicalArchive: true });
    expect(result.errors).toEqual([]);
    expect(result.rows[0].birthDate).toBeUndefined();
    expect(result.rows[0].isMinor).toBeUndefined();
    expect(result.rows[0].authorizationStatus).toBe("unknown");
  });

  it("derives stable private record IDs for retries of the same import batch", async () => {
    const batchId = "a".repeat(32);
    const first = await legacyImportDocumentId(batchId, 2);
    expect(await legacyImportDocumentId(batchId, 2)).toBe(first);
    expect(await legacyImportDocumentId(batchId, 3)).not.toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    await expect(legacyImportDocumentId("invalid", 2)).rejects.toThrow();
  });
});
