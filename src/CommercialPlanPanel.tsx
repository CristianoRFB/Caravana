import { useCallback, useEffect, useState, type FormEvent } from "react";
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "./lib/firebase";
import { assignTenantPlan, commercialOperationId, subscriptionAssignment, watchCommercialSubscription, type CommercialSubscription } from "./lib/commercial-data";
import { COMMERCIAL_POLICY, EntitlementService, PlanCatalog, type ManualPlanAssignment, type PlanId, type SubscriptionStatus } from "./lib/plan-catalog";
import { moneyInputValue, validMoneyInput } from "./lib/finance";
import { money } from "./lib/types";
const isoLocal = (millis: number) => { const date = new Date(millis); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function CommercialPlanPanel({ organizationId, onExit }: { organizationId: string; onExit: () => void }) {
  const [subscription, setSubscription] = useState<CommercialSubscription | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState<PlanId>("essencial"); const [status, setStatus] = useState<SubscriptionStatus>("active"); const [setupWaived, setSetupWaived] = useState(false); const [reason, setReason] = useState("");
  const [overrideAmount, setOverrideAmount] = useState(""); const [overrideUntil, setOverrideUntil] = useState(""); const [overrideReason, setOverrideReason] = useState(""); const [trialUntil, setTrialUntil] = useState(""); const [expectedRevision, setExpectedRevision] = useState(0); const [operationId, setOperationId] = useState(commercialOperationId); const [events, setEvents] = useState<string[]>([]); const [now, setNow] = useState(Date.now);
  const fill = useCallback((current: CommercialSubscription | null) => {
    setPlanId(current?.planId || "essencial"); setStatus(current?.status || "active"); setSetupWaived(current?.setupWaived || false); setReason(""); setExpectedRevision(current?.revision || 0);
    setOverrideAmount(current?.overrideMonthlyCents !== null && current?.overrideMonthlyCents !== undefined ? moneyInputValue(current.overrideMonthlyCents) : ""); setOverrideUntil(current?.overrideExpiresAt ? isoLocal(current.overrideExpiresAt.toMillis()) : ""); setOverrideReason(current?.overrideReason || ""); setTrialUntil(current?.trialEndsAt ? isoLocal(current.trialEndsAt.toMillis()) : ""); setOperationId(commercialOperationId());
  }, []);
  useEffect(() => { let first = true; return watchCommercialSubscription(organizationId, (current) => { setSubscription(current); setLoading(false); if (first) { fill(current); first = false; } }, () => { setLoading(false); setError("Não foi possível consultar a condição comercial autorizada."); }); }, [organizationId, fill]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(query(collection(db, "commercialOperations"), where("organizationId", "==", organizationId), orderBy("at", "desc"), limit(20)), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setEvents(snapshot.docs.map((item) => { const data = item.data(); return `${data.subscription?.planId} · ${data.subscription?.status} · ${data.at instanceof Timestamp ? data.at.toDate().toLocaleString("pt-BR") : "horário indisponível"} · responsável ${data.actorUid} · ${data.subscription?.reason}`; }));
    }, () => setError("Não foi possível carregar a auditoria comercial autorizada."));
  }, [organizationId]);
  const current = EntitlementService.resolve(subscription ? subscriptionAssignment(subscription) : null, now);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const cents = overrideAmount.trim() ? validMoneyInput(overrideAmount) : null;
      if (overrideAmount.trim() && cents === null) throw new Error("Informe o valor promocional positivo com até duas casas decimais.");
      const input: ManualPlanAssignment = { organizationId, planId, status, setupWaived, reason: reason.trim(), ...(status === "trial" ? { trialEndsAtMillis: new Date(trialUntil).getTime() } : {}), ...(cents !== null ? { override: { monthlyCents: cents, expiresAtMillis: new Date(overrideUntil).getTime(), reason: overrideReason.trim() } } : {}) };
      const revision = await assignTenantPlan(input, operationId, expectedRevision); setExpectedRevision(revision); setOperationId(commercialOperationId()); setNotice("Plano e limites registrados com auditoria. Nenhuma cobrança foi realizada.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a condição comercial."); } finally { setBusy(false); }
  }
  return <section className="admin-panel platform-section"><div className="admin-title-row"><div><h2>Plano e limites</h2><p>Organização: {organizationId}</p></div><button className="button button-outline" disabled={busy} onClick={onExit}>Fechar plano</button></div>
    <p>Condição manual de contrato; não há cobrança automática, gateway ou trial público. A condição não altera preços dos passageiros. Histórico e dados existentes permanecem no downgrade.</p>
    {error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}
    {loading ? <p>Carregando condição comercial…</p> : <><p>{current.planId ? `${PlanCatalog[current.planId].name} · ${current.status} · ${money(current.monthlyCents!)}/mês${current.promotional ? " · promoção temporária" : ""}` : "Plano não atribuído. Nenhum limite Premium é presumido."}</p><p>Limites atuais: {current.limits.activeCaravans} caravanas publicadas · {current.limits.passengersPerCaravan} passageiros/caravana · {current.limits.internalUsers} pessoas na equipe.</p>
      <form className="field-grid" onSubmit={(event) => void save(event)}>
        <label className="field"><span>Plano comercial</span><select value={planId} disabled={busy} onChange={(event) => setPlanId(event.target.value as PlanId)}>{Object.values(PlanCatalog).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.monthlyCents)}/mês</option>)}</select></label>
        <label className="field"><span>Status da assinatura</span><select value={status} disabled={busy} onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}>{["active", "past_due", "suspended", "cancelled", "trial"].map((value, index) => <option key={value} value={value}>{["Ativa", "Pendente de regularização", "Suspensa", "Cancelada", "Concessão assistida com prazo"][index]}</option>)}{import.meta.env.VITE_USE_EMULATORS === "true" && <option value="demo">Demonstração sintética</option>}</select></label>
        {status === "trial" && <label className="field"><span>Fim da concessão assistida</span><input required type="datetime-local" value={trialUntil} disabled={busy} onChange={(event) => setTrialUntil(event.target.value)} /></label>}
        <label className="field field-full"><span>Motivo da atribuição/alteração</span><input required minLength={3} maxLength={300} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
        <label className="field"><span>Mensalidade promocional (R$, opcional)</span><input inputMode="decimal" value={overrideAmount} disabled={busy} onChange={(event) => setOverrideAmount(event.target.value)} /></label>
        {overrideAmount && <><label className="field"><span>Fim da promoção</span><input required type="datetime-local" value={overrideUntil} disabled={busy} onChange={(event) => setOverrideUntil(event.target.value)} /></label><label className="field field-full"><span>Motivo da promoção</span><input required minLength={3} maxLength={300} value={overrideReason} disabled={busy} onChange={(event) => setOverrideReason(event.target.value)} /></label></>}
        <label className="field field-full"><span><input type="checkbox" checked={setupWaived} disabled={busy} onChange={(event) => setSetupWaived(event.target.checked)} /> Dispensar implantação padrão de {money(COMMERCIAL_POLICY.setupCents)}</span></label>
        <div className="finance-form-actions"><button className="button button-primary" disabled={busy}>Salvar plano e limites</button><button className="button button-outline" type="button" disabled={busy} onClick={() => { fill(subscription); setNotice(""); setError(""); }}>Recarregar condição atual</button></div>
      </form></>}
    <h3>Auditoria comercial</h3><ul>{events.map((event, index) => <li key={index} style={{ overflowWrap: "anywhere" }}>{event}</li>)}</ul>{events.length === 0 && <p>Nenhuma atribuição registrada.</p>}
  </section>;
}
