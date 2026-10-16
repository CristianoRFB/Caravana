import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { logout, watchAuth } from "./lib/data";
import { changeTenantStatus, onboardTenant, platformOperationId, watchPlatformAccess, watchPlatformAudit, watchPlatformTenants, type PlatformEvent, type PlatformTenant } from "./lib/platform";

const message = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
export default function PlatformPage({ header }: { header: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerUid, setOwnerUid] = useState("");
  const [operation, setOperation] = useState(platformOperationId);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let stopAccess: () => void = () => undefined;
    const stopAuth = watchAuth((current) => {
      const request = ++revision;
      stopAccess(); setUser(current); setAllowed(false); setLoading(Boolean(current));
      setTenants([]); setEvents([]); setError(""); setNotice(""); setName(""); setSlug(""); setOwnerUid("");
      if (current) stopAccess = watchPlatformAccess(current.uid, (value) => {
        if (active && request === revision) {
          setAllowed(value); setLoading(false);
          if (!value) { setTenants([]); setEvents([]); setName(""); setSlug(""); setOwnerUid(""); setNotice(""); }
        }
      }, () => { if (active && request === revision) { setAllowed(false); setLoading(false); setError("Não foi possível verificar a permissão da plataforma."); } });
    });
    return () => { active = false; revision++; stopAuth(); stopAccess(); };
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const stopTenants = watchPlatformTenants(setTenants, (cause) => { setTenants([]); setError(message(cause)); });
    const stopEvents = watchPlatformAudit(setEvents, (cause) => { setEvents([]); setError(message(cause)); });
    return () => { stopTenants(); stopEvents(); };
  }, [allowed]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const id = await onboardTenant({ name, slug, ownerUid }, operation);
      setNotice(`Organizadora ${id} cadastrada e responsável vinculado.`);
      setName(""); setSlug(""); setOwnerUid(""); setOperation(platformOperationId());
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  async function status(tenant: PlatformTenant) {
    const next = tenant.status === "suspended" ? "active" : "suspended";
    if (!window.confirm(next === "suspended" ? `Suspender novas reservas de ${tenant.name}? Inscrições e histórico serão preservados.` : `Reativar novas reservas de ${tenant.name}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try { await changeTenantStatus(tenant.id, next, platformOperationId()); setNotice("Situação atualizada e registrada na auditoria."); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  return <>{header}<main className="platform-page">
    {loading ? <p>Verificando acesso à plataforma…</p> : !allowed ? <section className="empty-box">
      <h1>Acesso restrito à plataforma</h1><p>{error || "Esta conta não possui a permissão global de Platform Owner."}</p>
      <Link className="button button-outline" to="/platform/login">Entrar com outra conta</Link>
    </section> : <>
      <div className="admin-title-row"><div><div className="eyebrow eyebrow-dark">ADMINISTRAÇÃO DA PLATAFORMA</div><h1>Organizadoras</h1><p>{user?.email}</p></div><button className="button button-outline" onClick={() => void logout()}>Sair</button></div>
      {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
      <section className="admin-panel platform-section"><h2>Cadastro assistido</h2><p>Vincule o UID de uma conta Firebase existente, conferido previamente. Este formulário cadastra a organizadora e sua membership; a criação e a verificação da conta Auth seguem o processo assistido.</p>
        <form className="field-grid" onSubmit={(event) => void create(event)}>
          <label className="field"><span>Nome da organizadora</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field"><span>Identificador da organizadora</span><input required pattern="[a-z0-9][a-z0-9-]{2,59}" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="organizadora-exemplo" /></label>
          <label className="field field-full"><span>UID do responsável existente</span><input required maxLength={128} value={ownerUid} onChange={(event) => setOwnerUid(event.target.value)} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Cadastrar organizadora"}</button>
        </form>
      </section>
      <section className="admin-panel platform-section"><h2>Organizadoras cadastradas</h2><div className="platform-tenants">{tenants.map((tenant) => <article key={tenant.id} className="platform-tenant">
        <div><strong>{tenant.name}</strong><small>{tenant.id}</small><span>{tenant.status === "active" ? "Ativa" : tenant.status === "suspended" ? "Suspensa para novas reservas" : "Situação legada: revisão necessária"}</span></div>
        <button className="button button-outline" disabled={busy || tenant.status === "unknown"} onClick={() => void status(tenant)}>{tenant.status === "suspended" ? "Reativar reservas" : "Suspender reservas"}</button>
      </article>)}</div><p>O acesso da plataforma não concede leitura de passageiros, comprovantes ou lançamentos financeiros das organizadoras.</p></section>
      <section className="admin-panel platform-section"><h2>Auditoria recente</h2><ul>{events.map((event) => <li key={event.id}>{event.action === "tenant_created" ? "Cadastro" : "Alteração de situação"} · {event.organizationId} · {event.status} · responsável {event.actorUid}</li>)}</ul>{events.length === 0 && <p>Nenhuma operação registrada.</p>}</section>
    </>}
  </main></>;
}
