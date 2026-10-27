import { calculateFinanceSummary, type FinanceSummary } from "./finance";
import type { Caravan, CaravanExpense, Registration } from "./types";
export interface ReportFilter { title: string; from: string; to: string; caravanId: string }
export interface OperationalSummary { trips: number; capacity: number; boarded: number; pendingAuthorizations: number; finance: FinanceSummary }
export interface WorkItem { label: string; done: boolean }
export interface WorklistInput { title: string; kind: "template" | "trip"; caravanId: string | null; items: WorkItem[]; archived: boolean }
export function validReportDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
export function reportFilter(input: ReportFilter): ReportFilter {
  if (!input || typeof input.title !== "string" || input.title.trim().length < 3 || input.title.trim().length > 100 || typeof input.caravanId !== "string" || input.caravanId.length > 128 || input.caravanId.includes("/")
    || typeof input.from !== "string" || typeof input.to !== "string" || (input.from && !validReportDate(input.from)) || (input.to && !validReportDate(input.to)) || (input.from && input.to && input.from > input.to)) throw new Error("Confira título, caravana e período do relatório.");
  return { title: input.title.trim(), caravanId: input.caravanId, from: input.from, to: input.to };
}
export function operationalSummary(organizationId: string, filter: ReportFilter, trips: Caravan[], registrations: Registration[], expenses: CaravanExpense[]): OperationalSummary {
  reportFilter(filter);
  if ([...trips, ...registrations, ...expenses].some((item) => item.organizationId !== organizationId)) throw new Error("Dados de outra organização não podem integrar este relatório.");
  const selected = trips.filter((trip) => (!filter.caravanId || trip.id === filter.caravanId) && (!filter.from || trip.date >= filter.from) && (!filter.to || trip.date <= filter.to));
  const ids = new Set(selected.map((trip) => trip.id));
  const passengers = registrations.filter((item) => ids.has(item.caravanId));
  const summary = { trips: selected.length, capacity: selected.reduce((sum, trip) => sum + trip.capacity, 0), boarded: passengers.filter((item) => item.registrationStatus !== "cancelled" && item.checkedInAt).length,
    pendingAuthorizations: passengers.filter((item) => item.registrationStatus !== "cancelled" && item.isMinor && selected.some((trip) => trip.id === item.caravanId && trip.requiresMinorAuthorization) && item.authorizationStatus !== "approved").length,
    finance: calculateFinanceSummary(passengers, expenses.filter((item) => ids.has(item.caravanId))) };
  if ([summary.trips, summary.capacity, summary.boarded, summary.pendingAuthorizations, ...Object.values(summary.finance)].some((value) => !Number.isSafeInteger(value) || Math.abs(value) > 9000000000000)) throw new Error("Valores inconsistentes ou acima do limite seguro de cálculo. Confira os lançamentos antes de salvar.");
  return summary;
}
export function validateWorklist(input: WorklistInput): WorklistInput {
  if (!input || typeof input.title !== "string" || input.title.trim().length < 3 || input.title.trim().length > 100 || !["template", "trip"].includes(input.kind) || typeof input.archived !== "boolean"
    || (input.kind === "template" ? input.caravanId !== null : typeof input.caravanId !== "string" || !input.caravanId || input.caravanId.length > 128 || input.caravanId.includes("/"))
    || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20 || input.items.some((item) => typeof item.label !== "string" || !item.label.trim() || item.label.trim().length > 120 || /[\r\n]/.test(item.label) || typeof item.done !== "boolean")) throw new Error("Use um título, até20 tarefas válidas e uma caravana para o roteiro.");
  const items = input.items.map((item) => ({ label: item.label.trim(), done: item.done }));
  if (new Set(items.map((item) => item.label.toLocaleLowerCase("pt-BR"))).size !== items.length) throw new Error("Evite tarefas duplicadas no mesmo roteiro.");
  return { title: input.title.trim(), kind: input.kind, caravanId: input.caravanId, items, archived: input.archived };
}
export function safeCsvCell(value: unknown) { if (typeof value === "number" && Number.isSafeInteger(value)) return String(value); const text = String(value ?? ""); return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`; }
const reportLabels: Record<keyof FinanceSummary,string> = { passengerCount:"Passageiros ativos",paidPassengerCount:"Passageiros pagos",partialPassengerCount:"Passageiros parciais",pendingPassengerCount:"Passageiros pendentes",reportedPassengerCount:"Pix informado sem conciliação",unknownPaymentCount:"Totais de recebimento não conciliados",unknownFareCount:"Tarifas desconhecidas",expectedCents:"Previsto conhecido (centavos)",receivedCents:"Recebido registrado (centavos)",receivableCents:"A receber calculável (centavos)",uncertainReceivableCount:"Recebimentos não conciliados",expenseCents:"Despesas registradas (centavos)",recordedBalanceCents:"Saldo registrado (centavos)",projectedResultCents:"Resultado previsto (centavos)" };
export function operationalReportCsv(filter: ReportFilter, summary: OperationalSummary): string {
  const rows = [["Relatório", filter.title], ["Critério", "Data da viagem; valores históricos conhecidos das viagens selecionadas. Valores monetários em centavos. Sem conciliação bancária."], ["De", filter.from], ["Até", filter.to], ["Caravanas", summary.trips], ["Lugares físicos", summary.capacity], ["Embarcados", summary.boarded], ["Autorizações pendentes", summary.pendingAuthorizations], ...Object.entries(summary.finance).map(([key, value]) => [reportLabels[key as keyof FinanceSummary], Number.isNaN(value) && summary.finance.unknownPaymentCount ? "UNKNOWN" : value])];
  return "\uFEFF" + rows.map((row) => row.map(safeCsvCell).join(";")).join("\r\n");
}
