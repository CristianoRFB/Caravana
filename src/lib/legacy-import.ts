import { ageOnDate, type Caravan, type Registration } from "./types";

export type LegacyRegistrationDraft = Pick<
  Registration,
  | "passengerName"
  | "phone"
  | "email"
  | "cpf"
  | "documentRecords"
  | "birthDate"
  | "isMinor"
  | "guardianName"
  | "guardianPhone"
  | "authorizationStatus"
  | "city"
  | "boardingPointId"
  | "boardingPointName"
  | "emergencyContact"
  | "notes"
  | "amountCents"
  | "paymentTotalCents"
  | "registrationStatus"
  | "paymentStatus"
  | "paymentReportedMethod"
  | "paymentReportedUnreconciled"
> & { line: number };

export type LegacyRegistrationInput = Omit<LegacyRegistrationDraft, "line">;

const MAX_IMPORT_ROWS = 400;

export interface LegacyImportOptions {
  historicalArchive?: boolean;
}

export async function legacyImportDocumentId(batchId: string, line: number) {
  if (!/^[a-f0-9]{32}$/.test(batchId) || !Number.isInteger(line) || line < 2)
    throw new Error("Identificador de importação inválido.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${batchId}:${line}`),
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function firstRecordEnd(source: string) {
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && (character === "\n" || character === "\r")) {
      return index;
    }
  }
  return source.length;
}

function detectDelimiter(source: string) {
  const record = source.slice(0, firstRecordEnd(source));
  const counts = new Map<string, number>([[";", 0], [",", 0], ["\t", 0]]);
  let quoted = false;
  for (let index = 0; index < record.length; index++) {
    const character = record[index];
    if (character === '"') {
      if (quoted && record[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && counts.has(character)) {
      counts.set(character, (counts.get(character) || 0) + 1);
    }
  }
  return [...counts].sort((left, right) => right[1] - left[1])[0]?.[0] || ",";
}

function parseRecords(source: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      if (character === "\r" && source[index + 1] === "\n") index++;
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("Há aspas sem fechamento no arquivo CSV.");
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function validCpf(value: string) {
  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number) => {
    const sum = Array.from(value.slice(0, length)).reduce(
      (total, character, index) =>
        total + Number(character) * (length + 1 - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}

function dateValue(value: string) {
  const trimmed = value.trim();
  let iso = trimmed;
  const brazilian = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (brazilian) {
    iso = `${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}

function amountCents(value: string, fallback: number) {
  if (!value.trim()) return fallback;
  let amount = value.replace(/[^\d,.-]/g, "");
  if (amount.includes(",")) {
    amount = amount.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(amount)) {
    amount = amount.replace(/\./g, "");
  }
  const parsed = Number(amount);
  const cents = Math.round(parsed * 100);
  return Number.isFinite(parsed) && cents > 0 && Number.isSafeInteger(cents)
    ? cents
    : null;
}

const columnAliases = {
  passengerName: ["nome", "nomecompleto", "passageiro", "passageironome", "passengername"],
  phone: ["telefone", "celular", "whatsapp", "phone", "telefoneprincipal"],
  email: ["email", "correioeletronico"],
  cpf: ["cpf"],
  city: ["cidade", "city"],
  boardingPoint: ["embarque", "pontodeembarque", "localdeembarque", "boardingpoint", "boardingpointname"],
  emergencyContact: ["contatodeemergencia", "emergencia", "emergencycontact"],
  birthDate: ["nascimento", "datadenascimento", "birthdate"],
  guardianName: ["nomedoresponsavel", "responsavel", "guardianname"],
  guardianPhone: ["telefonedoresponsavel", "contatodoresponsavel", "guardianphone"],
  amount: ["valor", "valorcombinado", "valorinscricao", "amount"],
  notes: ["observacao", "observacoes", "notes"],
  reportedPayment: ["pagamentoinformado", "formadepagamentoinformada", "pagamentodeclarado"],
} as const;

function getValue(row: string[], columns: Map<string, number>, field: keyof typeof columnAliases) {
  for (const alias of columnAliases[field]) {
    const index = columns.get(alias);
    if (index !== undefined) return (row[index] || "").trim();
  }
  return "";
}

function documentKey(value: string) {
  return normalize(value);
}

type PassengerIdentity = Pick<Registration, "passengerName" | "phone" | "email" | "cpf"> &
  Pick<Registration, "documentRecords">;

function samePassenger(left: PassengerIdentity, right: PassengerIdentity) {
  if (left.cpf && right.cpf && left.cpf.replace(/\D/g, "") === right.cpf.replace(/\D/g, "")) {
    return true;
  }
  const leftDocuments = [
    ...(left.documentRecords || []).map((item) => documentKey(item.value)),
    ...(left.cpf ? [documentKey(left.cpf)] : []),
  ].filter(Boolean);
  const rightDocuments = [
    ...(right.documentRecords || []).map((item) => documentKey(item.value)),
    ...(right.cpf ? [documentKey(right.cpf)] : []),
  ].filter(Boolean);
  if (leftDocuments.some((value) => rightDocuments.includes(value))) return true;
  const sameName = normalize(left.passengerName) === normalize(right.passengerName);
  const leftPhone = left.phone.replace(/\D/g, "");
  const rightPhone = right.phone.replace(/\D/g, "");
  const sameEmail = normalize(left.email) !== "" && normalize(left.email) === normalize(right.email);
  return sameName && ((leftPhone !== "" && leftPhone === rightPhone) || sameEmail);
}

export function parseLegacyRegistrationCsv(
  input: string,
  caravan: Caravan,
  existing: Registration[],
  options: LegacyImportOptions = {},
) {
  const source = input.replace(/^\uFEFF/, "");
  const records = parseRecords(source, detectDelimiter(source));
  const header = records.shift();
  if (!header) return { rows: [] as LegacyRegistrationDraft[], errors: ["O arquivo está vazio."] };
  const columns = new Map(header.map((value, index) => [normalize(value), index]));
  if (!columnAliases.passengerName.some((alias) => columns.has(alias))) {
    return { rows: [] as LegacyRegistrationDraft[], errors: ["Inclua uma coluna Nome ou Nome completo no cabeçalho."] };
  }
  if (records.length > MAX_IMPORT_ROWS) {
    return {
      rows: [] as LegacyRegistrationDraft[],
      errors: [`O limite é de ${MAX_IMPORT_ROWS} passageiros por arquivo. Divida a lista em arquivos menores.`],
    };
  }

  const rows: LegacyRegistrationDraft[] = [];
  const errors: string[] = [];
  const seen: PassengerIdentity[] = [];
  const points = caravan.boardingPoints || [];

  records.forEach((record, index) => {
    const line = index + 2;
    const passengerName = getValue(record, columns, "passengerName");
    const phone = getValue(record, columns, "phone");
    const email = getValue(record, columns, "email");
    const cpfDigits = getValue(record, columns, "cpf").replace(/\D/g, "");
    const documentRecords: NonNullable<Registration["documentRecords"]> = [];
    for (const number of [1, 2]) {
      const labelIndex = columns.get(normalize(`Tipo documento ${number}`));
      const valueIndex = columns.get(normalize(`Número documento ${number}`));
      const label = labelIndex === undefined ? "" : (record[labelIndex] || "").trim();
      const value = valueIndex === undefined ? "" : (record[valueIndex] || "").trim();
      if (label || value) {
        if (!label || !value) {
          errors.push(`Registro ${line}: informe o tipo e o número de cada documento juntos.`);
          return;
        }
        if (label.length > 60 || value.length > 80) {
          errors.push(`Registro ${line}: o tipo ou número do documento excede o limite.`);
          return;
        }
        documentRecords.push({ label, value });
      }
    }
    const birthInput = getValue(record, columns, "birthDate");
    const birthDate = birthInput ? dateValue(birthInput) : "";
    const pointName = getValue(record, columns, "boardingPoint");
    const guardianName = getValue(record, columns, "guardianName");
    const guardianPhone = getValue(record, columns, "guardianPhone");
    const errorsForRow: string[] = [];

    if (passengerName.length < 2 || passengerName.length > 120) {
      errorsForRow.push("nome inválido (2 a 120 caracteres)");
    }
    if (phone && (phone.replace(/\D/g, "").length < 8 || phone.length > 30)) {
      errorsForRow.push("telefone inválido");
    }
    if (email && (!/^.+@.+\..+$/.test(email) || email.length > 254)) {
      errorsForRow.push("e-mail inválido");
    }
    if (!phone && !email && !options.historicalArchive) errorsForRow.push("informe telefone ou e-mail para enviar o link privado da inscrição");
    if (cpfDigits && !validCpf(cpfDigits)) errorsForRow.push("CPF inválido");
    if (birthInput && !birthDate) errorsForRow.push("data de nascimento inválida; use DD/MM/AAAA ou AAAA-MM-DD");
    if (caravan.requiresMinorAuthorization && !birthDate && !options.historicalArchive) {
      errorsForRow.push("esta caravana exige a data de nascimento");
    }

    const point = pointName
      ? points.find((item) => normalize(item.name) === normalize(pointName))
      : !options.historicalArchive && points.length === 1
        ? points[0]
        : undefined;
    if (!point && !options.historicalArchive) errorsForRow.push(points.length > 1 ? "informe um ponto de embarque existente" : "nenhum ponto de embarque está cadastrado");

    const age = birthDate ? ageOnDate(birthDate, caravan.date) : null;
    if (birthDate && age === null) errorsForRow.push("data de nascimento incompatível com a data da viagem");
    const isMinor = Boolean(caravan.requiresMinorAuthorization && age !== null && age < 18);
    if (isMinor && (guardianName.trim().length < 2 || guardianPhone.replace(/\D/g, "").length < 8)) {
      errorsForRow.push("menor de idade: informe nome e telefone do responsável");
    }
    if (guardianName.length > 120 || guardianPhone.length > 30) {
      errorsForRow.push("dados do responsável muito longos");
    }

    const city = getValue(record, columns, "city");
    const emergencyContact = getValue(record, columns, "emergencyContact");
    const notes = getValue(record, columns, "notes");
    if (city.length > 120 || emergencyContact.length > 120 || notes.length > 1000) {
      errorsForRow.push("cidade, contato de emergência ou observações excedem o limite");
    }
    const amountInput = getValue(record, columns, "amount");
    const cents = amountCents(
      amountInput,
      options.historicalArchive ? 0 : caravan.priceCents,
    );
    if (cents === null) errorsForRow.push("valor combinado inválido");
    const reportedPayment = normalize(getValue(record, columns, "reportedPayment"));
    if (reportedPayment && !(options.historicalArchive && ["pix", "pixinformado", "pixinformada"].includes(reportedPayment))) {
      errorsForRow.push("forma de pagamento informada inválida; o histórico aceita somente Pix declarado");
    }
    if (options.historicalArchive && !phone && !email && !documentRecords.length && !cpfDigits) {
      errorsForRow.push("informe um documento para identificar o passageiro nesta lista sem contato");
    }

    const identity = { passengerName, phone, email, cpf: cpfDigits, documentRecords };
    if (passengerName && (seen.some((item) => samePassenger(item, identity)) || existing.some((item) => item.registrationStatus !== "cancelled" && samePassenger(item, identity)))) {
      errorsForRow.push("passageiro duplicado no arquivo ou já cadastrado nesta caravana");
    }
    if (passengerName) seen.push(identity);

    if (errorsForRow.length) {
      errors.push(`Registro ${line}: ${errorsForRow.join("; ")}.`);
      return;
    }

    rows.push({
      line,
      passengerName,
      phone,
      email,
      ...(cpfDigits ? { cpf: cpfDigits } : {}),
      ...(documentRecords.length ? { documentRecords } : {}),
      ...(birthDate ? { birthDate } : {}),
      ...(isMinor
        ? {
            isMinor: true,
            guardianName: guardianName.trim(),
            guardianPhone: guardianPhone.trim(),
            authorizationStatus: "not_sent" as const,
          }
        : caravan.requiresMinorAuthorization && birthDate
          ? { isMinor: false, authorizationStatus: "not_required" as const }
          : options.historicalArchive && caravan.requiresMinorAuthorization
            ? { authorizationStatus: "unknown" as const }
          : {}),
      city,
      boardingPointId: point?.id || "",
      boardingPointName: point?.name || "Não informado",
      emergencyContact,
      notes,
      ...(cents ? { amountCents: cents } : {}),
      paymentTotalCents: 0,
      ...(reportedPayment
        ? {
            paymentReportedMethod: "pix" as const,
            paymentReportedUnreconciled: true,
            paymentStatus: "reported" as const,
            registrationStatus: "confirmed" as const,
          }
        : {
            paymentStatus: "pending" as const,
            registrationStatus: "awaiting_payment" as const,
          }),
    });
  });

  if (records.length === 0) errors.push("Adicione pelo menos uma linha de passageiro após o cabeçalho.");
  return { rows, errors };
}
