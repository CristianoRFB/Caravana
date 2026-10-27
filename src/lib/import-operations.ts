import { collection, doc, getDocFromServer, getDocsFromServer, query, serverTimestamp, where, type DocumentData } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { legacyImportDocumentId, samePassenger, type LegacyRegistrationDraft } from "./legacy-import";
import { importDigest, importIdentityKeys } from "./import-identity";
import { rollbackImportedRegistration } from "./registration-operations";
import type { Caravan, Registration } from "./types";
import type { PublicEntitlements } from "./commercial-data";
import { quotaGrowthAllowed } from "./quota-operations";
export interface ImportRowResult { line: number; status: "imported" | "skipped" | "rejected"; reason: string; }
export interface ImportReport { imported: number; skipped: number; rejected: number; rowResults: ImportRowResult[]; }
export function importFailureMessage(cause: unknown): string {
  const message = typeof cause === "string" ? cause : cause instanceof Error ? cause.message : "Operação não confirmada.";
  const code = typeof cause === "object" && cause !== null ? String((cause as { code?: unknown }).code || "") : "";
  if (code.includes("permission-denied") || /PERMISSION_DENIED|insufficient permissions|maximum of 1000 expressions/i.test(message)) return "Operação não confirmada. Confira seu acesso e atualize a página antes de tentar novamente.";
  if (/unavailable|deadline-exceeded|network-request-failed/.test(code)) return "A conexão não confirmou a operação. Atualize o estado antes de tentar novamente.";
  return message;
}
const CHUNK_SIZE = 2;
async function executeImport(caravanId: string, organizationId: string, rows: LegacyRegistrationDraft[], batchId: string, attemptId = batchId): Promise<ImportReport> {
  if (!db || !auth?.currentUser) throw new Error("Sessão administrativa não encontrada.");
  if (!/^[a-f0-9]{32}$/.test(batchId) || !/^[a-f0-9]{32}$/.test(attemptId) || rows.length > 400 || new Set(rows.map((row) => row.line)).size !== rows.length) throw new Error("Confira o lote: até400 linhas únicas por importação.");
  if (!rows.length) return { imported: 0, skipped: 0, rejected: 0, rowResults: [] };
  const database = db; const actorUid = auth.currentUser.uid;
  const caravanRef = doc(database, "caravans", caravanId); const registryRef = doc(database, "importRegistries", caravanId);
  // Owner-only access is checked before querying the legacy baseline.
  await getDocFromServer(registryRef);
  const snapshot = await getDocFromServer(caravanRef);
  if (!snapshot.exists() || snapshot.data().organizationId !== organizationId) throw new Error("Esta caravana pertence a outra organização.");
  const baselineNonce = snapshot.data().lastReservationNonce || "";
  const baseline = await getDocsFromServer(query(collection(database, "registrations"), where("organizationId", "==", organizationId), where("caravanId", "==", caravanId)));
  const known = baseline.docs.map((entry) => ({ ...entry.data(), id: entry.id }) as Registration);
  const preflightSkipped = new Set<number>();
  const seen: Parameters<typeof samePassenger>[0][] = [...known];
  for (const row of rows) {
    if (seen.some((item) => samePassenger(item, row))) preflightSkipped.add(row.line);
    else seen.push(row);
  }
  const commercial = await getDocFromServer(doc(database, "tenantEntitlements", organizationId));
  const policy = commercial.exists() ? commercial.data() as PublicEntitlements : null;
  const organization = await getDocFromServer(doc(database, "organizations", organizationId));
  if (rows.length > preflightSkipped.size && organization.data()?.status === "suspended") throw new Error("A organização está suspensa para novas inscrições. O histórico foi preservado.");
  if (rows.length > preflightSkipped.size && !quotaGrowthAllowed(policy)) throw new Error("O plano atual não permite novas inscrições. O histórico foi preservado.");
  const remaining = Math.min(snapshot.data().capacity, policy?.limits.passengersPerCaravan ?? snapshot.data().reservedSeats) - snapshot.data().reservedSeats;
  if (rows.length > preflightSkipped.size && rows.length - preflightSkipped.size > remaining) throw new Error(`Há somente ${Math.max(0, remaining)} vagas disponíveis. Nenhuma linha deste envio foi importada.`);
  const results: ImportRowResult[] = [];
  for (let offset = 0; offset < rows.length;) {
    const candidate = rows.slice(offset, offset + CHUNK_SIZE);
    const identityCost = candidate.reduce((sum, row) => sum + importIdentityKeys(row).filter(Boolean).length, 0);
    const chunk = identityCost > 6 ? candidate.slice(0, 1) : candidate;
    const chunkOffset = offset;
    offset += chunk.length;
    const payloadHash = await importDigest(chunk);
    const operationId = (await importDigest(["import-v1", batchId, attemptId, chunkOffset])).slice(0, 32);
    const operationRef = doc(database, "importOperations", operationId);
    const refs = await Promise.all(chunk.map(async (row) => doc(database, "registrations", await legacyImportDocumentId(batchId, row.line))));
    let committed: ImportRowResult[] = [];
    try {
      for (let retry = 0; retry < 2; retry++) {
        try {
          await runTransaction(database, async (tx) => {
            const operation = await tx.get(operationRef);
            if (operation.exists()) {
              const old = operation.data();
              if (old.payloadHash !== payloadHash || old.organizationId !== organizationId || old.caravanId !== caravanId || old.actorUid !== actorUid) throw new Error("Lote já utilizado com outros dados.");
              committed = old.rowResults.map((row: ImportRowResult) => ({ ...row, status: row.status === "imported" ? "skipped" : row.status, reason: row.status === "imported" ? "Já importado neste lote." : row.reason }));
              return;
            }
            const [tripSnapshot, registry, commercialSnapshot, organizationSnapshot, ...existing] = await Promise.all([tx.get(caravanRef), tx.get(registryRef), tx.get(doc(database, "tenantEntitlements", organizationId)), tx.get(doc(database, "organizations", organizationId)), ...refs.map((ref) => tx.get(ref))]);
            if (!tripSnapshot.exists()) throw new Error("Caravana não encontrada.");
            const trip = tripSnapshot.data() as Caravan;
            if (trip.organizationId !== organizationId) throw new Error("Organização divergente.");
            if ((tripSnapshot.data().lastReservationNonce || "") !== baselineNonce) throw new Error("Uma reserva entrou durante a conferência. Atualize a prévia antes de repetir o envio.");
            const beforeClaims: Record<string, boolean> = registry.data()?.claims || {};
            let claims = { ...beforeClaims }; let additions: Record<string, boolean> = {}; let documents: Record<string, DocumentData> = {};
            committed = chunk.map((row, index) => {
              const keys = importIdentityKeys(row);
              if (!keys.some(Boolean)) throw new Error(`Linha ${row.line}: falta identificação do passageiro.`);
              if (preflightSkipped.has(row.line) || keys.some((key) => key && claims[key]) || existing[index].exists()) return { line: row.line, status: "skipped", reason: "Passageiro já cadastrado, inclusive em lote anterior ou inscrição cancelada." };
              const { line, ...input } = row; void line;
              if (input.paymentTotalCents !== undefined && input.paymentTotalCents !== 0) throw new Error("Importação não registra recebimentos. Use o financeiro auditado.");
              const point = trip.boardingPoints?.find((item) => item.id === input.boardingPointId);
              if (input.boardingPointId && !point) throw new Error(`Linha ${row.line}: ponto de embarque não está disponível.`);
              documents[refs[index].id] = { ...input, ...(point ? { boardingPointName: point.name, boardingPointSnapshot: point } : {}), id: refs[index].id, importedFromLegacy: true, importBatchId: batchId, importOperationId: operationId, importIdentityKeys: keys,
                organizationId, caravanId, caravanName: trip.name, paymentTotalCents: 0, createdAt: new Date().toISOString() };
              keys.filter(Boolean).forEach((key) => { additions[key] = true; claims[key] = true; });
              return { line: row.line, status: "imported", reason: "Importação confirmada." };
            });
            const currentPolicy = commercialSnapshot.exists() ? commercialSnapshot.data() as PublicEntitlements : null;
            if (Object.keys(documents).length > 0 && (!quotaGrowthAllowed(currentPolicy) || organizationSnapshot.data()?.status === "suspended")) throw new Error("O plano ou a situação da organização mudou durante o envio. Novas inscrições bloqueadas; etapas anteriores foram preservadas.");
            if (Object.keys(documents).length > Math.min(trip.capacity, currentPolicy?.limits.passengersPerCaravan ?? trip.reservedSeats) - trip.reservedSeats) {
              documents = {}; additions = {}; claims = { ...beforeClaims };
              committed = committed.map((row) => row.status === "imported" ? { ...row, status: "rejected", reason: "As vagas foram ocupadas durante o envio. Nenhuma inscrição desta etapa foi criada." } : row);
            }
            const ids = Object.keys(documents);
            for (const id of ids) tx.set(doc(database, "registrations", id), documents[id]);
            tx.set(registryRef, { organizationId, caravanId, claims, lastImportOperationId: operationId });
            tx.update(caravanRef, { reservedSeats: trip.reservedSeats + ids.length, lastImportOperationId: operationId, updatedAt: serverTimestamp() });
            tx.set(operationRef, { organizationId, caravanId, batchId, attemptId, actorUid, at: serverTimestamp(), payloadHash, registrationIds: ids,
              rows: documents, claims: additions, rowResults: committed, seatBefore: trip.reservedSeats, seatAfter: trip.reservedSeats + ids.length });
          });
          break;
        } catch (cause) { if (retry === 1 || !(cause instanceof Error) || !["permission-denied", "aborted"].includes(String((cause as { code?: string }).code))) throw cause; }
      }
      results.push(...committed);
    } catch (cause) { results.push(...chunk.map((row): ImportRowResult => ({ line: row.line, status: "rejected", reason: cause instanceof Error ? cause.message : "Etapa não confirmada; repita o mesmo lote." }))); }
  }
  return { imported: results.filter((row) => row.status === "imported").length, skipped: results.filter((row) => row.status === "skipped").length, rejected: results.filter((row) => row.status === "rejected").length, rowResults: results };
}
export const importLegacyRegistrationsDetailed = (...args: Parameters<typeof executeImport>) => trackWrite(() => executeImport(...args));
export async function importLegacyRegistrations(caravanId: string, organizationId: string, rows: LegacyRegistrationDraft[], batchId: string) {
  const result = await importLegacyRegistrationsDetailed(caravanId, organizationId, rows, batchId);
  if (result.rejected) throw new Error(`${result.imported} importados; ${result.rejected} não confirmados. ${result.rowResults.find((row) => row.status === "rejected")?.reason}`);
  return { imported: result.imported, skipped: result.skipped };
}
async function executeRollback(organizationId: string, caravanId: string, batchId: string, reason: string) {
  if (!db || !auth?.currentUser || reason.trim().length < 3 || reason.trim().length > 300) throw new Error("Informe o motivo do rollback em 3 a 300 caracteres.");
  const database = db;
  const operations = await getDocsFromServer(query(collection(database, "importOperations"), where("organizationId", "==", organizationId), where("caravanId", "==", caravanId), where("batchId", "==", batchId)));
  const result: { registrationId: string; status: "cancelled" | "blocked"; reason: string }[] = [];
  for (const operation of operations.docs) for (const id of operation.data().registrationIds as string[]) {
    try {
      const registration = (await getDocFromServer(doc(database, "registrations", id))).data();
      if (!registration) throw new Error("Inscrição não encontrada; nenhum dado substituído.");
      const opId = (await importDigest(["rollback-v1", batchId, id])).slice(0, 32);
      await rollbackImportedRegistration({ ...registration, id } as Registration, reason, opId);
      result.push({ registrationId: id, status: "cancelled", reason: "Cancelamento auditado; histórico preservado." });
    } catch (cause) { result.push({ registrationId: id, status: "blocked", reason: cause instanceof Error ? cause.message : "Inscrição não alterada." }); }
  }
  return result;
}
export const rollbackImportBatch = (...args: Parameters<typeof executeRollback>) => trackWrite(() => executeRollback(...args));
