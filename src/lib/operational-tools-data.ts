import { collection, doc, getDocFromServer, getDocsFromServer, limit, onSnapshot, orderBy, query, serverTimestamp, where, type DocumentData, type Timestamp, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { trackWrite } from "./pending-writes";
import { importDigest } from "./import-identity";
import { requireFunctionalFeature } from "./functional-entitlements";
import { operationalSummary, reportFilter, validateWorklist, type OperationalSummary, type ReportFilter, type WorklistInput } from "./operational-tools";
import type { Caravan, CaravanExpense, Registration } from "./types";
export const toolOperationId = () => crypto.randomUUID().replaceAll("-", "");
interface Saved { id: string; organizationId: string; revision: number; updatedAt: Timestamp; updatedBy: string; createdAt: Timestamp; createdBy: string; lastToolOperationId: string }
export interface SavedReport extends Saved, ReportFilter { summary: OperationalSummary }
export interface SavedWorklist extends Saved, WorklistInput {}
export function decodedWorklist(data: DocumentData): SavedWorklist {
  return { ...data, items: String(data.tasksText).split("\n").map((label, index) => ({ label, done: String(data.doneMask)[index] === "1" })) } as SavedWorklist;
}
type ToolKind = "report" | "worklist";
function session(organizationId: string, operationId: string) {
  if (!db || !auth?.currentUser || !organizationId || organizationId.includes("/") || !/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Confira a organização, a sessão e a identificação da tentativa.");
  return { database: db, actorUid: auth.currentUser.uid };
}
export function watchTools<T extends Saved>(organizationId: string, kind: ToolKind, callback: (items: T[]) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não configurado.");
  return onSnapshot(query(collection(db, "organizations", organizationId, kind === "report" ? "reports" : "worklists"), orderBy("updatedAt", "desc"), limit(30)), { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) callback(snapshot.docs.map((item) => (kind === "worklist" ? decodedWorklist({ ...item.data(), id: item.id }) : { ...item.data(), id: item.id }) as T));
  }, fail);
}
async function saveTool(organizationId: string, kind: ToolKind, entityId: string, operationId: string, input: object, expectedRevision: number | null, loadValue: () => Promise<DocumentData>) {
  return trackWrite(async () => {
    const { database, actorUid } = session(organizationId, operationId);
    if (!/^[a-f0-9]{32}$/.test(entityId)) throw new Error("Identificador de documento inválido.");
    const payloadHash = await importDigest({ kind, entityId, input, expectedRevision });
    const audit = doc(database, "organizations", organizationId, "toolEvents", operationId);
    const target = doc(database, "organizations", organizationId, kind === "report" ? "reports" : "worklists", entityId);
    const matches = (value: DocumentData) => value.organizationId === organizationId && value.actorUid === actorUid && value.kind === kind && value.entityId === entityId && value.payloadHash === payloadHash;
    const prior = await getDocFromServer(audit);
    if (prior.exists()) { if (!matches(prior.data())) throw new Error("Tentativa já utilizada com outros dados."); return entityId; }
    await requireFunctionalFeature(organizationId, kind === "report" ? "report_library" : "worklists");
    const value = await loadValue();
    try { return await runTransaction(database, async (transaction) => {
      const [event, current] = await Promise.all([transaction.get(audit), transaction.get(target)]);
      if (event.exists()) { if (!matches(event.data())) throw new Error("Tentativa já utilizada com outros dados."); return entityId; }
      if (expectedRevision === null ? current.exists() : !current.exists() || current.data().revision !== expectedRevision) throw new Error("O documento mudou. Recarregue antes de salvar; nenhuma edição foi sobrescrita.");
      const time = serverTimestamp();
      const after = { ...value, organizationId, revision: expectedRevision === null ? 1 : expectedRevision + 1, createdAt: current.exists() ? current.data().createdAt : time, createdBy: current.exists() ? current.data().createdBy : actorUid, updatedAt: time, updatedBy: actorUid, lastToolOperationId: operationId };
      transaction.set(target, after);
      transaction.set(audit, { organizationId, actorUid, at: time, kind, entityId, payloadHash, before: current.exists() ? current.data() : null, after });
      return entityId;
    }); } catch (cause) {
      try { const receipt = await getDocFromServer(audit); if (receipt.exists() && matches(receipt.data())) return entityId; } catch { /* Preserve the original failure. */ }
      throw cause;
    }
  });
}
export async function saveOperationalReport(organizationId: string, input: ReportFilter, operationId = toolOperationId()) {
  const filter = reportFilter(input);
  return saveTool(organizationId, "report", operationId, operationId, filter, null, async () => {
    const { database } = session(organizationId, operationId);
    const tripsQuery = query(collection(database, "caravans"), where("organizationId", "==", organizationId), limit(501));
    const allTrips = (await getDocsFromServer(tripsQuery)).docs.map((item) => ({ ...item.data(), id: item.id }) as Caravan);
    if (allTrips.length > 500) throw new Error("Inventário extenso: selecione um período menor em um procedimento de relatório adequado.");
    const trips = allTrips.filter((trip) => (!filter.caravanId || trip.id === filter.caravanId) && (!filter.from || trip.date >= filter.from) && (!filter.to || trip.date <= filter.to));
    if (trips.length > 50) throw new Error("Selecione um período ou caravana com até50 viagens para esta fotografia.");
    const registrations: Registration[] = []; const expenses: CaravanExpense[] = [];
    for (const trip of trips) {
      const [people, costs] = await Promise.all([
        getDocsFromServer(query(collection(database, "registrations"), where("organizationId", "==", organizationId), where("caravanId", "==", trip.id), limit(1001))),
        getDocsFromServer(query(collection(database, "caravans", trip.id, "expenses"), limit(1001))),
      ]);
      if (people.size > 1000 || costs.size > 1000) throw new Error("Histórico extenso para esta fotografia; nenhum resultado parcial foi salvo.");
      registrations.push(...people.docs.map((item) => ({ ...item.data(), id: item.id }) as Registration));
      expenses.push(...costs.docs.map((item) => ({ ...item.data(), id: item.id }) as CaravanExpense));
    }
    return { ...filter, summary: operationalSummary(organizationId, filter, trips, registrations, expenses) };
  });
}
export async function saveWorklist(organizationId: string, input: WorklistInput, operationId = toolOperationId(), current?: Pick<SavedWorklist, "id" | "revision">) {
  const value = validateWorklist(input);
  const { items, ...fields } = value;
  return saveTool(organizationId, "worklist", current?.id || operationId, operationId, value, current?.revision ?? null, async () => ({ ...fields, tasksText: items.map(item => item.label).join("\n"), doneMask: items.map(item => item.done ? "1" : "0").join("") }));
}
export function applyWorklistTemplate(template: SavedWorklist, caravanId: string): WorklistInput {
  return validateWorklist({ title: template.title, kind: "trip", caravanId, archived: false, items: template.items.map((item) => ({ label: item.label, done: false })) });
}
