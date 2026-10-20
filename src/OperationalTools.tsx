import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { doc, getDocFromServer, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { watchAdminCaravans } from "./lib/data";
import { functionalFeatureAllowed, watchFunctionalEntitlements, type FunctionalEntitlements } from "./lib/functional-entitlements";
import { applyWorklistTemplate, saveOperationalReport, saveWorklist, watchTools, type SavedReport, type SavedWorklist } from "./lib/operational-tools-data";
import { operationalReportCsv, type WorklistInput } from "./lib/operational-tools";
import { completeFinancialAttempt, getFinancialAttempt } from "./lib/financial-attempt";
import { importDigest } from "./lib/import-identity";
import { money, type Caravan } from "./lib/types";
import ToolAudit from "./ToolAudit";

export default function OperationalTools({ organizationId, mode, canManageTemplates }: { organizationId: string; mode: "reports" | "worklists"; canManageTemplates: boolean }) {
  const [policy, setPolicy] = useState<FunctionalEntitlements | null>(null), [suspended, setSuspended] = useState(true);
  const [trips, setTrips] = useState<Caravan[]>([]), [reports, setReports] = useState<SavedReport[]>([]), [worklists, setWorklists] = useState<SavedWorklist[]>([]);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [pending, setPending] = useState(false), [now, setNow] = useState(Date.now());
  const [title, setTitle] = useState(mode === "reports" ? "Resumo operacional" : "Preparação da viagem"), [from, setFrom] = useState(""), [to, setTo] = useState(""), [caravanId, setCaravanId] = useState("");
  const [kind, setKind] = useState<"template" | "trip">("trip"), [tasks, setTasks] = useState("Confirmar horários com a equipe\nSeparar material da viagem"), [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    if (!db) return;
    const fail = () => { setPolicy(null); setTrips([]); setReports([]); setWorklists([]); setError("Não foi possível confirmar o acesso e os dados desta organização."); };
    const stops = [watchFunctionalEntitlements(organizationId, setPolicy, fail), watchAdminCaravans(organizationId, setTrips, fail),
      onSnapshot(doc(db, "organizationAvailability", organizationId), snapshot => setSuspended(snapshot.data()?.status === "suspended"), fail),
      mode === "reports" ? watchTools<SavedReport>(organizationId, "report", setReports, fail) : watchTools<SavedWorklist>(organizationId, "worklist", setWorklists, fail)];
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => { stops.forEach(stop => stop()); clearInterval(timer); };
  }, [organizationId, mode]);
  const allowed = functionalFeatureAllowed(policy, mode === "reports" ? "report_library" : "worklists", now) && !suspended;
  async function perform(key: string, payload: object, operation: (id: string) => Promise<unknown>) {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const digest = await importDigest(payload), scope = `${auth?.currentUser?.uid}:${organizationId}:tools:${key}:${digest}`;
      const id = getFinancialAttempt(scope, sessionStorage); await operation(id); completeFinancialAttempt(scope, id, sessionStorage); setMessage("Operação confirmada pelo servidor e registrada no histórico.");
    } catch (cause) { setError(cause && typeof cause === "object" && "code" in cause ? "O servidor não confirmou a operação. Confira seu acesso, o plano e o histórico antes de repetir a mesma tentativa." : cause instanceof Error ? cause.message : "Não foi possível concluir. Reutilize a tentativa após conferir o histórico."); }
    finally { setPending(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!allowed) return;
    if (mode === "reports") { const input = { title, from, to, caravanId }; await perform("report", input, id => saveOperationalReport(organizationId, input, id)); }
    else {
      const selectedKind = canManageTemplates ? kind : "trip";
      const input: WorklistInput = { title, kind: selectedKind, caravanId: selectedKind === "template" ? null : caravanId, items: tasks.split("\n").map(label => label.trim()).filter(Boolean).map(label => ({label,done:false})), archived:false };
      await perform("worklist", input, id => saveWorklist(organizationId, input, id));
    }
  }
  async function edit(list: SavedWorklist, change: Partial<WorklistInput>) {
    const input = { title:list.title,kind:list.kind,caravanId:list.caravanId,items:list.items,archived:list.archived,...change };
    await perform(list.id, {input,revision:list.revision}, id => saveWorklist(organizationId, input, id, list));
  }
  async function download(report: SavedReport) {
    setError("");
    try {
      if (!db) throw new Error("Firebase não configurado.");
      const fresh = await getDocFromServer(doc(db,"organizations",organizationId,"reports",report.id)); if (!fresh.exists()) throw new Error("Relatório não disponível.");
      const value = fresh.data() as SavedReport; const url = URL.createObjectURL(new Blob([operationalReportCsv(value,value.summary)],{type:"text/csv;charset=utf-8"}));
      const anchor = document.createElement("a");anchor.href=url;anchor.download="relatorio-operacional.csv";anchor.click();URL.revokeObjectURL(url);
    } catch { setError("Não foi possível confirmar a permissão para exportar o relatório."); }
  }
  return <section className="admin-panel platform-section operational-tools">
    <h1>{mode === "reports" ? "Central de relatórios" : "Roteiros da equipe"}</h1>
    <p>{mode === "reports" ? "Fechamentos por data da viagem, salvos para a equipe e exportáveis sem lista de passageiros." : "Modelos reutilizáveis e tarefas compartilhadas por caravana. Não substituem check-in, documentos ou controles obrigatórios."}</p>
    <p>O Financeiro Geral, a importação CSV e os recursos essenciais continuam disponíveis em todos os planos.</p>
    {!allowed && <div className="notice" role="status">{mode === "reports" ? "Novos relatórios requerem Pro ou Premium habilitado." : "Novos roteiros e alterações requerem Premium habilitado."} O histórico permanece disponível aos acessos autorizados. <Link to="/admin/plano">Conferir plano e limites</Link></div>}
    {error && <p role="alert" className="error-message">{error}</p>}{message && <p role="status">{message}</p>}
    {pending && <p role="status">Confirmando alteração com o servidor…</p>}
    <form onSubmit={submit} className="tool-form">
      <fieldset disabled={!allowed || pending}>
        <legend>{mode === "reports" ? "Nova fotografia operacional" : "Novo roteiro ou modelo"}</legend>
        <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} minLength={3} maxLength={100} required /></label>
        {mode === "worklists" && canManageTemplates && <label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as "template"|"trip")}><option value="trip">Roteiro de caravana</option><option value="template">Modelo reutilizável</option></select></label>}
        <label>Caravana<select value={caravanId} onChange={e=>setCaravanId(e.target.value)} required={mode === "worklists" && (!canManageTemplates || kind === "trip")}><option value="">{mode === "reports" ? "Todas no período" : "Selecione uma caravana"}</option>{trips.map(trip=><option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>
        {mode === "reports" ? <><label>Data da viagem a partir de<input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>Data da viagem até<input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label><p>Valores históricos conhecidos das viagens selecionadas, inclusive recebimentos de inscrições canceladas. São consultas feitas durante a captura; não é conciliação ou fechamento bancário.</p></>
          : <label>Tarefas, uma por linha (até20)<textarea rows={5} value={tasks} onChange={e=>setTasks(e.target.value)} required /></label>}
        <button className="button button-primary" disabled={pending}>{pending ? "Confirmando…" : mode === "reports" ? "Salvar relatório" : "Criar roteiro ou modelo"}</button>
      </fieldset>
    </form>
    <h2>Histórico da organização</h2><p>Até30 documentos mais recentes; alterações dos roteiros têm eventos imutáveis. Nenhum documento é apagado por mudança de plano.</p>
    {mode === "reports" ? <div className="tool-cards">{reports.map(report=><article key={report.id} className="empty-box">
      <h3>{report.title}</h3><p>Viagens de {report.from || "qualquer data"} até {report.to || "qualquer data"} · Captura {report.updatedAt?.toDate().toLocaleString("pt-BR")}</p>
      <dl><dt>Caravanas</dt><dd>{report.summary.trips}</dd><dt>Passageiros ativos</dt><dd>{report.summary.finance.passengerCount}</dd><dt>Embarcados</dt><dd>{report.summary.boarded}</dd><dt>Autorizações pendentes</dt><dd>{report.summary.pendingAuthorizations}</dd><dt>Recebido registrado</dt><dd>{money(report.summary.finance.receivedCents)}</dd><dt>Despesas registradas</dt><dd>{money(report.summary.finance.expenseCents)}</dd></dl>
      <button type="button" className="button button-outline" onClick={()=>download(report)}>Exportar relatório CSV</button>
    </article>)}{!reports.length && <p>Nenhum relatório salvo nesta organização.</p>}</div>
      : <><label className="tool-checkbox"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)} />Mostrar roteiros arquivados</label><div className="tool-cards">{worklists.filter(list=>showArchived || !list.archived).map(list=>{
        const editable = allowed && !pending && (list.kind !== "template" || canManageTemplates);
        return <article key={list.id} className="empty-box"><h3>{list.title}</h3><p>{list.kind === "template" ? "Modelo reutilizável" : trips.find(trip=>trip.id===list.caravanId)?.name || "Caravana histórica"} · Revisão{list.revision} · {list.items.filter(item=>item.done).length}/{list.items.length} concluídas{list.archived ? " · Arquivado" : ""}</p>
          <ul className="tool-task-list">{list.items.map((item,index)=><li key={index}><label className="tool-checkbox"><input type="checkbox" checked={item.done} disabled={!editable || list.archived} onChange={()=>edit(list,{items:list.items.map((value,i)=>i===index?{...value,done:!value.done}:value)})} />{item.label}</label></li>)}</ul>
          <div className="tool-actions"><button type="button" className="button button-outline" disabled={!editable} onClick={()=>edit(list,{archived:!list.archived})}>{list.archived ? "Reabrir roteiro" : "Arquivar roteiro"}</button>
          {list.kind === "template" && <button type="button" className="button button-primary" disabled={!allowed || pending || !caravanId || list.archived} onClick={()=>{const input=applyWorklistTemplate(list,caravanId);void perform(`apply:${list.id}`,input,id=>saveWorklist(organizationId,input,id));}}>Usar na caravana selecionada</button>}</div>
        </article>;
      })}{!worklists.length && <p>Nenhum roteiro ou modelo salvo nesta organização.</p>}</div></>}
    <ToolAudit key={organizationId} organizationId={organizationId} />
  </section>;
}
