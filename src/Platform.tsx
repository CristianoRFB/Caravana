import CommercialPlanPanel from "./CommercialPlanPanel";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { logout, watchAuth } from "./lib/data";
import { SupportConsole } from "./Support";
import { changeTenantStatus, onboardTenant, platformOperationId, watchPlatformAccess, watchPlatformAudit, watchPlatformTenants, type PlatformEvent, type PlatformTenant } from "./lib/platform";
import { PlanCatalog, type PlanId } from "./lib/plan-catalog";
import { BRAND_COLORS } from "./lib/tenant-branding";
import { onboardingPayload } from "./lib/onboarding-payload";
import { importDigest } from "./lib/import-identity";
import { completeQuotaAttempt, getQuotaAttempt } from "./lib/quota-attempt";

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
  const [planFor, setPlanFor] = useState("");
  const [supportFor, setSupportFor] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerUid, setOwnerUid] = useState("");
  const [ownerUidConfirmed, setOwnerUidConfirmed] = useState(false);
  const [planId, setPlanId] = useState<PlanId>("essencial");
  const [setupWaived, setSetupWaived] = useState(false);
  const [publicName, setPublicName] = useState(""); const [primaryColor, setPrimaryColor] = useState<string>(BRAND_COLORS[0]);
  const [logo, setLogo] = useState(""); const [contactEmail, setContactEmail] = useState(""); const [whatsapp, setWhatsapp] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    let stopAccess: () => void = () => undefined;
    const stopAuth = watchAuth((current) => {
      const request = ++revision;
      stopAccess(); setUser(current); setAllowed(false); setLoading(Boolean(current)); setSupportFor(""); setPlanFor("");
      setTenants([]); setEvents([]); setError(""); setNotice(""); setName(""); setSlug(""); setOwnerUid("");
      setOwnerUidConfirmed(false); setPlanId("essencial"); setSetupWaived(false); setPublicName(""); setPrimaryColor(BRAND_COLORS[0]); setLogo(""); setContactEmail(""); setWhatsapp("");
      if (current) stopAccess = watchPlatformAccess(current.uid, (value) => {
        if (active && request === revision) {
          setAllowed(value); setLoading(false);
          if (!value) { setTenants([]); setEvents([]); setName(""); setSlug(""); setOwnerUid(""); setNotice(""); setSupportFor(""); setPlanFor(""); }
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
      if (!user) throw new Error("Entre com a conta da plataforma.");
      const input = { name, slug, ownerUid, ownerUidConfirmed, planId, setupWaived, branding: { publicName: publicName || name, primaryColor, logo, contactEmail, whatsapp } };
      const digest = await importDigest(onboardingPayload(input)); const scope = `${user.uid}:platform-onboard:${slug.trim().toLowerCase()}`;
      const operation = getQuotaAttempt(scope, digest, window.sessionStorage);
      const id = await onboardTenant(input, operation); completeQuotaAttempt(scope, digest, operation, window.sessionStorage);
      setNotice(`Organizadora ${id} cadastrada com responsável, plano, identidade e contadores. Nenhuma cobrança foi realizada.`);
      setName(""); setSlug(""); setOwnerUid(""); setOwnerUidConfirmed(false); setPublicName(""); setPrimaryColor(BRAND_COLORS[0]); setLogo(""); setContactEmail(""); setWhatsapp(""); setPlanId("essencial"); setSetupWaived(false);
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
      <div className="admin-title-row"><div><div className="eyebrow eyebrow-dark">ADMINISTRAÇÃO DA PLATAFORMA</div><h1>Organizadoras</h1><p>{user?.email}</p><p>Identificador de suporte: {user?.uid}</p></div><button className="button button-outline" onClick={() => void logout()}>Sair</button></div>
      {error && <div className="error-message" role="alert">{error}</div>}{notice && <div className="success-message" role="status">{notice}</div>}
      {planFor && <CommercialPlanPanel key={planFor} organizationId={planFor} onExit={() => setPlanFor("")} />}
      {supportFor && <SupportConsole key={supportFor} organizationId={supportFor} onExit={() => setSupportFor("")} />}
      <section className="admin-panel platform-section"><h2>Cadastro assistido</h2><p>Vincule o UID de uma conta Firebase existente, conferido previamente. Organização, primeiro responsável, plano, identidade e contadores são criados juntos. A criação e a verificação da conta Auth seguem o processo assistido. Não há senha compartilhada nem cobrança automática.</p>
        <form className="field-grid" onSubmit={(event) => void create(event)}>
          <label className="field"><span>Nome da organizadora</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field"><span>Identificador da organizadora</span><input required pattern="[a-z0-9][a-z0-9-]{2,59}" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="organizadora-exemplo" /></label>
          <label className="field field-full"><span>UID do responsável existente</span><input required maxLength={128} value={ownerUid} onChange={(event) => setOwnerUid(event.target.value)} /></label>
          <label className="field"><span>Plano inicial</span><select value={planId} onChange={(event) => setPlanId(event.target.value as PlanId)}>{Object.values(PlanCatalog).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · R${plan.monthlyCents / 100}/mês</option>)}</select></label>
          <p className="field-full">Limites do plano: {PlanCatalog[planId].limits.activeCaravans} caravanas publicadas, {PlanCatalog[planId].limits.passengersPerCaravan} passageiros por caravana e {PlanCatalog[planId].limits.internalUsers} integrantes ativos. A equipe começa com um responsável. O histórico permanece preservado após mudança de plano.</p>
          <label className="field"><span>Nome público inicial</span><input maxLength={80} value={publicName} placeholder="Usar nome da organizadora" onChange={(event) => setPublicName(event.target.value)} /></label>
          <label className="field"><span>Cor inicial</span><select value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)}>{BRAND_COLORS.map((color, index) => <option key={color} value={color}>{["Violeta", "Azul", "Turquesa", "Verde", "Rosa", "Roxo", "Âmbar", "Cinza"][index]}</option>)}</select></label>
          <label className="field"><span>Logo inicial (URL HTTPS, opcional)</span><input type="url" maxLength={1000} value={logo} onChange={(event) => setLogo(event.target.value)} /></label>
          <label className="field"><span>E-mail público inicial (opcional)</span><input type="email" maxLength={120} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
          <label className="field"><span>WhatsApp público inicial (opcional)</span><input inputMode="numeric" maxLength={15} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} /></label>
          <label className="field field-full"><span><input type="checkbox" checked={setupWaived} onChange={(event) => setSetupWaived(event.target.checked)} /> Isentar implantação padrão de R$100</span></label>
          <label className="field field-full"><span><input type="checkbox" required checked={ownerUidConfirmed} onChange={(event) => setOwnerUidConfirmed(event.target.checked)} /> Conferi o UID de uma conta existente</span></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Cadastrar organizadora"}</button>
        </form>
      </section>
      <section className="admin-panel platform-section"><h2>Organizadoras cadastradas</h2><div className="platform-tenants">{tenants.map((tenant) => <article key={tenant.id} className="platform-tenant">
        <div><strong>{tenant.name}</strong><small>{tenant.id}</small><span>{tenant.status === "active" ? "Ativa" : tenant.status === "suspended" ? "Suspensa para novas reservas" : "Situação legada: revisão necessária"}</span></div>
        <button className="button button-outline" disabled={busy || tenant.status === "unknown"} onClick={() => void status(tenant)}>{tenant.status === "suspended" ? "Reativar reservas" : "Suspender reservas"}</button>
        <button className="button button-outline" onClick={() => setSupportFor(tenant.id)}>Abrir suporte</button>
        <button className="button button-outline" onClick={() => setPlanFor(tenant.id)}>Plano e limites</button>
      </article>)}</div><p>O acesso da plataforma não concede leitura de passageiros, comprovantes ou lançamentos financeiros das organizadoras.</p></section>
      <section className="admin-panel platform-section"><h2>Auditoria recente</h2><ul>{events.map((event) => <li key={event.id}>{event.action === "tenant_created" ? "Cadastro" : "Alteração de situação"} · {event.organizationId} · {event.status} · responsável {event.actorUid}</li>)}</ul>{events.length === 0 && <p>Nenhuma operação registrada.</p>}</section>
    </>}
  </main></>;
}
