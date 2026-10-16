import { useEffect, useState, type FormEvent } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./lib/firebase";
import { getDocumentPolicy, inspectDocumentRetention, purgeExpiredDocument, saveDocumentPolicy } from "./lib/documents";
import { importFailureMessage } from "./lib/import-operations";
import type { RetentionCandidate } from "./lib/document-policy";
export default function DocumentSettings({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [proofDays, setProofDays] = useState(90); const [authorizationDays, setAuthorizationDays] = useState(90); const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<RetentionCandidate[]>([]); const [events, setEvents] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    getDocumentPolicy(organizationId).then((policy) => { if (active) { setProofDays(policy.proofDays); setAuthorizationDays(policy.authorizationDays); } }).catch((cause) => { if (active) setError(importFailureMessage(cause)); }).finally(() => { if (active) setLoading(false); });
    const stop = db ? onSnapshot(query(collection(db, "documentEvents"), where("organizationId", "==", organizationId), orderBy("at", "desc"), limit(20)), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setEvents(snapshot.docs.map((item) => {
      const data = item.data(); return `${data.action === "policy_updated" ? "Prazo configurado" : data.action === "file_expired" ? "Arquivo vencido excluído" : "Conferência de autorização"} · ${data.registrationId ? String(data.registrationId).slice(0, 8).toUpperCase() : organizationId} · responsável ${data.actorUid}`;
    })); }, () => { setEvents([]); setError("Não foi possível consultar a auditoria de documentos."); }) : () => undefined;
    return () => { active = false; stop(); };
  }, [organizationId]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await saveDocumentPolicy(organizationId, { proofDays, authorizationDays }, crypto.randomUUID().replaceAll("-", "")); setNotice("Prazos registrados para os próximos envios. Arquivos anteriores não foram alterados."); }
    catch (cause) { setError(importFailureMessage(cause)); } finally { setBusy(false); }
  }
  async function inspect() {
    setBusy(true); setError(""); try { const list = await inspectDocumentRetention(organizationId); setCandidates(list); setNotice(`${list.length} arquivos com prazo registrado encerrado. A conferência não excluiu arquivos.`); } catch (cause) { setError(importFailureMessage(cause)); } finally { setBusy(false); }
  }
  async function purge(candidate: RetentionCandidate) {
    setBusy(true); setError(""); try { await purgeExpiredDocument(candidate.registrationId, candidate.kind); setCandidates(await inspectDocumentRetention(organizationId)); setNotice("Arquivo vencido excluído com auditoria. Cadastro e histórico financeiro preservados."); } catch (cause) { setError(importFailureMessage(cause)); } finally { setBusy(false); }
  }
  return <><h1>Documentos e prazos</h1><p>Configure prazos operacionais e execute exclusão controlada de arquivos vencidos. A organização define suas obrigações legais; esta configuração não é validação jurídica automática. A exclusão requer uma ação da organização nesta página.</p>
    {error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}
    <section className="admin-panel platform-section"><h2>Próximos envios</h2><form className="field-grid" onSubmit={(event) => void save(event)}>
      <label className="field"><span>Comprovantes — dias</span><input type="number" min={1} max={3650} required disabled={!canManage || loading || busy} value={proofDays} onChange={(event) => setProofDays(Number(event.target.value))} /></label>
      <label className="field"><span>Autorizações — dias</span><input type="number" min={1} max={3650} required disabled={!canManage || loading || busy} value={authorizationDays} onChange={(event) => setAuthorizationDays(Number(event.target.value))} /></label>
      {canManage && <button className="button button-primary" disabled={busy || loading}>Salvar prazos</button>}
    </form><p>Alterações valem para novos envios. Arquivos legados sem prazo registrado exigem revisão e não entram na exclusão por vencimento.</p></section>
    {canManage && <section className="admin-panel platform-section"><h2>Conferência de vencimento</h2><button className="button button-outline" disabled={busy || loading} onClick={() => void inspect()}>Conferir arquivos vencidos</button>
      {candidates.map((candidate) => <article className="platform-tenant" key={`${candidate.registrationId}/${candidate.kind}`}><span>{candidate.kind === "proofs" ? "Comprovante" : "Autorização"} · inscrição {candidate.registrationId.slice(0, 8).toUpperCase()}</span><button className="button button-outline" disabled={busy} onClick={() => void purge(candidate)}>Excluir arquivo vencido</button></article>)}
    </section>}
    <section className="admin-panel platform-section"><h2>Auditoria de documentos</h2><ul>{events.map((event, index) => <li key={index} style={{ overflowWrap: "anywhere" }}>{event}</li>)}</ul></section>
  </>;
}
