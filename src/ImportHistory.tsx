import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./lib/firebase";
import { importFailureMessage, rollbackImportBatch } from "./lib/import-operations";
interface Batch { id: string; imported: number; }
export default function ImportHistory({ organizationId, caravanId }: { organizationId: string; caravanId: string }) {
  const [batches, setBatches] = useState<Batch[]>([]); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string[]>([]);
  useEffect(() => {
    if (!db || !caravanId) return;
    return onSnapshot(query(collection(db, "importOperations"), where("organizationId", "==", organizationId), where("caravanId", "==", caravanId), orderBy("at", "desc"), limit(20)), (snapshot) => {
      const groups = new Map<string, Batch>();
      snapshot.docs.forEach((item) => { const data = item.data(); const batch = groups.get(data.batchId) || { id: data.batchId, imported: 0 }; batch.imported += data.registrationIds.length; groups.set(batch.id, batch); });
      setBatches([...groups.values()]);
    }, () => { setBatches([]); setNotice(["Não foi possível consultar o histórico de importação."]); });
  }, [organizationId, caravanId]);
  async function rollback(id: string) {
    const reason = window.prompt("Motivo para desfazer o lote: somente cadastros intactos serão cancelados; registros com revisão, comprovante ou movimentação serão preservados e bloqueados.");
    if (!reason) return;
    setBusy(true); setNotice([]);
    try { const result = await rollbackImportBatch(organizationId, caravanId, id, reason); setNotice(result.map((row) => `${row.registrationId.slice(0, 8).toUpperCase()} · ${row.status === "cancelled" ? "Cancelado" : "Bloqueado"}: ${importFailureMessage(row.reason)}`)); }
    catch (cause) { setNotice([importFailureMessage(cause)]); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel platform-section import-history"><h2>Histórico de importações</h2><p>Lotes nas últimas20 etapas. O rollback consulta o lote inteiro e cancela somente inscrições intactas, com auditoria e liberação de vaga. Histórico e documentos não são apagados.</p>
    {batches.length === 0 && <p>Nenhuma importação registrada.</p>}
    {batches.map((batch) => <article className="platform-tenant" key={batch.id}><div><strong>Lote {batch.id.slice(0, 8).toUpperCase()}</strong><span>{batch.imported} inscrições nas etapas exibidas</span></div><button className="button button-outline" disabled={busy || batch.imported === 0} onClick={() => void rollback(batch.id)}>Desfazer lote</button></article>)}
    {notice.length > 0 && <ul role="status">{notice.map((text, index) => <li key={index} style={{ overflowWrap: "anywhere" }}>{text}</li>)}</ul>}
  </section>;
}
