import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { subscriptionAssignment, watchCommercialSubscription, watchPublicEntitlements, type CommercialSubscription, type PublicEntitlements } from "./lib/commercial-data";
import { EntitlementService, PlanCatalog } from "./lib/plan-catalog";
import { COMMERCIAL_FEATURE_LABELS } from "./lib/commercial-presentation";
import { quotaGrowthAllowed } from "./lib/quota-operations";
import { money } from "./lib/types";

interface Usage { version: string; publishedCaravans: number; activeMembers: number; activeOwners: number }
const labels = { active: "Ativa", past_due: "Pendente de regularização", suspended: "Suspensa", cancelled: "Cancelada", trial: "Concessão assistida", demo: "Demonstração sintética", unassigned: "Sem atribuição" };
export default function TenantCommercial({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [subscription, setSubscription] = useState<CommercialSubscription | null>(null);
  const [policy, setPolicy] = useState<PublicEntitlements | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!canManage || !db) return;
    const fail = () => { setError("Não foi possível confirmar o plano e os limites desta organização."); setSubscription(null); setPolicy(null); setUsage(null); setLoading(false); };
    const stops = [
      watchCommercialSubscription(organizationId, (value) => { setSubscription(value); setLoading(false); }, fail),
      watchPublicEntitlements(organizationId, setPolicy, fail),
      onSnapshot(doc(db, "tenantUsage", organizationId), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) setUsage(snapshot.exists() ? snapshot.data() as Usage : null); }, fail),
      onSnapshot(doc(db, "organizationAvailability", organizationId), { includeMetadataChanges: true }, (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) setSuspended(snapshot.data()?.status === "suspended"); }, fail),
    ];
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { stops.forEach((stop) => stop()); clearInterval(timer); };
  }, [organizationId, canManage]);
  if (!canManage) return <section className="empty-box"><h1>Plano da organização</h1><p>Somente responsáveis podem consultar o contrato comercial e gerenciar limites.</p></section>;
  const current = EntitlementService.resolve(subscription ? subscriptionAssignment(subscription) : null, now);
  const canGrow = quotaGrowthAllowed(policy, now) && !suspended;
  const validUsage = usage?.version === "commercial-v1" && [usage.publishedCaravans, usage.activeMembers, usage.activeOwners].every((value) => Number.isSafeInteger(value) && value >= 0) && usage.activeOwners >= 1 && usage.activeOwners <= usage.activeMembers;
  return <section className="admin-panel platform-section">
    <h1>Plano e limites</h1><p>Organização: {organizationId}</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    {loading ? <p>Confirmando contrato…</p> : <>
      <h2>{current.planId ? PlanCatalog[current.planId].name : "Contrato ainda não atribuído"}</h2>
      <p>Situação: {labels[current.status]}{suspended ? " · Organização suspensa para crescimento" : ""}</p>
      {current.monthlyCents !== null && <p>Mensalidade contratada: {money(current.monthlyCents)}/mês{current.promotional ? " · condição promocional temporária" : ""}.</p>}
      {subscription?.overrideExpiresAt && <p>Prazo da condição promocional: {subscription.overrideExpiresAt.toDate().toLocaleString("pt-BR")}. Após o prazo aplica-se o valor do catálogo.</p>}
      {subscription?.trialEndsAt && <p>Fim da concessão assistida: {subscription.trialEndsAt.toDate().toLocaleString("pt-BR")}</p>}
      {subscription && <p>Implantação: {subscription.setupWaived ? "dispensada" : money(subscription.setupFeeCents)}.</p>}
      <p role="status">{canGrow ? "Crescimento habilitado dentro dos limites do plano." : "Novas operações de crescimento bloqueadas. Inscrições, caravanas, passageiros e histórico financeiro permanecem preservados."}</p>
      {validUsage && policy ? <div className="table-wrap"><table><thead><tr><th>Recurso</th><th>Uso atual</th><th>Limite</th></tr></thead><tbody>
        <tr><td>Caravanas publicadas</td><td>{usage!.publishedCaravans}</td><td>{policy.limits.activeCaravans}</td></tr>
        <tr><td>Integrantes ativos</td><td>{usage!.activeMembers}</td><td>{policy.limits.internalUsers}</td></tr>
        <tr><td>Passageiros por caravana</td><td>Conforme as inscrições de cada viagem</td><td>{policy.limits.passengersPerCaravan}</td></tr>
      </tbody></table></div> : <p>Inventário comercial ainda não confirmado. Nenhum contador é presumido ou zerado.</p>}
      {validUsage && policy && (usage!.publishedCaravans >= policy.limits.activeCaravans || usage!.activeMembers >= policy.limits.internalUsers) && <p>Um limite de crescimento foi atingido. Arquivar uma caravana ou revogar um acesso libera o respectivo recurso; um downgrade preserva o que já existe, mesmo acima do novo limite.</p>}
      <p>Pagamentos e alterações de contrato são tratados manualmente com a administração da plataforma. Esta página não efetua cobranças nem altera o preço cobrado dos passageiros.</p>
      <p>Os planos incluem os recursos implementados de caravanas, inscrições, comprovantes, check-in, importação, financeiro e identidade pública. A disponibilidade operacional depende também das permissões e configurações da organização.</p>
      {current.planId && <><h2>Recursos do plano</h2><ul>{PlanCatalog[current.planId].features.map(feature=><li key={feature}>{COMMERCIAL_FEATURE_LABELS[feature]}</li>)}</ul><p>Novos relatórios são incluídos no Pro e Premium. Roteiros e modelos são incluídos no Premium. Recursos adicionais são liberados na ativação assistida do plano; após downgrade ou suspensão, o histórico continua disponível aos acessos autorizados.</p></>}
    </>}
  </section>;
}
