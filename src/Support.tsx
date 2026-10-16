import { useEffect, useState, type FormEvent } from "react";
import { activeSupport, closeSupport, grantSupport, openSupport, revokeSupport, supportOperationId, watchOwnSupport, watchSupportAudit, watchSupportGrants, type SupportAudit, type SupportGrant, type SupportSession } from "./lib/support";
import { watchAdminCaravans } from "./lib/data";
import type { Caravan } from "./lib/types";

const message = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
const eventLabel: Record<string, string> = { support_granted: "Autorização concedida", support_revoked: "Autorização revogada", support_opened: "Suporte iniciado", support_closed: "Suporte encerrado" };

export function SupportOwner({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [grants, setGrants] = useState<SupportGrant[]>([]);
  const [events, setEvents] = useState<SupportAudit[]>([]);
  const [operator, setOperator] = useState("");
  const [purpose, setPurpose] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!canManage) return;
    const fail = (cause: Error) => setError(message(cause));
    const stopGrants = watchSupportGrants(organizationId, setGrants, fail);
    const stopAudit = watchSupportAudit(organizationId, setEvents, fail);
    return () => { stopGrants(); stopAudit(); };
  }, [organizationId, canManage]);
  async function grant(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await grantSupport(organizationId, operator, purpose, minutes, supportOperationId()); setNotice("Autorização temporária registrada."); setOperator(""); setPurpose(""); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  async function revoke(item: SupportGrant) {
    setBusy(true); setError(""); setNotice("");
    try { await revokeSupport(organizationId, item.operatorUid, supportOperationId()); setNotice("Autorização revogada. A consulta de suporte foi interrompida."); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  if (!canManage) return <section className="empty-box"><h1>Autorização restrita ao responsável</h1><p>Somente o responsável pela organizadora pode autorizar suporte.</p></section>;
  return <>
    <div className="admin-title-row"><div><h1>Suporte autorizado</h1><p>Autorize um operador da plataforma a consultar a configuração das caravanas por tempo limitado. O acesso é somente leitura e não inclui inscrições, comprovantes ou lançamentos financeiros.</p></div></div>
    {error && <div role="alert" className="error-message">{error}</div>}{notice && <div role="status" className="success-message">{notice}</div>}
    <section className="admin-panel platform-section"><h2>Nova autorização</h2><form className="field-grid" onSubmit={(event) => void grant(event)}>
      <label className="field field-full"><span>Identificador do operador de suporte</span><input required maxLength={128} value={operator} onChange={(event) => setOperator(event.target.value)} /></label>
      <label className="field"><span>Motivo da autorização</span><input required minLength={3} maxLength={200} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
      <label className="field"><span>Prazo de acesso</span><select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}><option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={60}>60 minutos</option></select></label>
      <button className="button button-primary" disabled={busy}>Autorizar consulta temporária</button>
    </form></section>
    <section className="admin-panel platform-section"><h2>Autorizações</h2>{grants.length === 0 && <p>Nenhuma autorização concedida.</p>}{grants.map((item) => <article className="platform-tenant" key={item.operatorUid}>
      <div><strong>{item.operatorUid}</strong><span>{item.purpose}</span><span>{item.status === "revoked" ? "Revogada" : `Válida até ${item.expiresAt.toDate().toLocaleString("pt-BR")}`}</span></div>
      <button className="button button-outline" disabled={busy || item.status === "revoked"} onClick={() => void revoke(item)}>Revogar autorização</button>
    </article>)}</section>
    <section className="admin-panel platform-section"><h2>Histórico do suporte</h2><ul>{events.map((event) => <li key={event.id}>{eventLabel[event.action] || event.action} · {event.operatorUid} · responsável {event.actorUid}</li>)}</ul></section>
  </>;
}

export function SupportConsole({ organizationId, onExit }: { organizationId: string; onExit: () => void }) {
  const [grant, setGrant] = useState<SupportGrant | null>(null);
  const [session, setSession] = useState<SupportSession | null>(null);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = activeSupport(grant, session, organizationId, now);
  useEffect(() => watchOwnSupport(organizationId, (authorization, current) => { setGrant(authorization); setSession(current); setNow(Date.now()); }, (cause) => { setGrant(null); setSession(null); setCaravans([]); setError(message(cause)); }), [organizationId]);
  useEffect(() => {
    const expiry = Math.min(grant?.expiresAt.toMillis() ?? Infinity, session?.expiresAt.toMillis() ?? Infinity);
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(expiry - Date.now() + 1, 2147483647)));
    return () => clearTimeout(timer);
  }, [grant, session]);
  useEffect(() => {
    if (!valid) { setCaravans([]); return; }
    return watchAdminCaravans(organizationId, setCaravans, (cause) => { setCaravans([]); setError(message(cause)); });
  }, [organizationId, valid]);
  async function start() {
    setBusy(true); setError("");
    try { await openSupport(organizationId, supportOperationId()); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  async function close() {
    setBusy(true); setError("");
    try { await closeSupport(organizationId, supportOperationId()); onExit(); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  const authorized = grant?.status === "active" && grant.expiresAt.toMillis() > now;
  return <section className="admin-panel platform-section support-console"><h2>Suporte — {organizationId}</h2>
    <p>Configuração de caravanas, somente leitura. O início e o encerramento são registrados para a organizadora.</p>
    {error && <div role="alert" className="error-message">{error}</div>}
    {!valid ? <><p>Uma autorização vigente e o início explícito da sessão são necessários.</p><button className="button button-primary" disabled={busy || !authorized} onClick={() => void start()}>Iniciar suporte autorizado</button><button className="button button-outline" onClick={onExit}>Voltar</button></> : <>
      <p role="status">Suporte ativo até {session?.expiresAt.toDate().toLocaleString("pt-BR")}</p>
      <button className="button button-outline" disabled={busy} onClick={() => void close()}>Encerrar suporte</button>
      <div className="support-config-list">{caravans.map((caravan) => <article key={caravan.id}><h3>{caravan.name}</h3><p>Identificador: {caravan.slug}</p><p>Situação: {caravan.status} · capacidade: {caravan.capacity}</p></article>)}</div>
    </>}
  </section>;
}
