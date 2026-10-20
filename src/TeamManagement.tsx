import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { issueTeamInvitation, closeTeamInvitation, invitationStatus, watchTeamInvitations, watchTeamMembers, watchTeamHistory, type TeamInvitation, type TeamMember, type TeamHistory } from "./lib/team-invitations";
import { saveInternalMember, quotaGrowthAllowed } from "./lib/quota-operations";
import { watchPublicEntitlements, type PublicEntitlements } from "./lib/commercial-data";
import { importDigest } from "./lib/import-identity";
import { getQuotaAttempt, completeQuotaAttempt } from "./lib/quota-attempt";
import type { TenantRole } from "./lib/memberships";
import "./team.css";
const roleLabel = (role: TenantRole) => role === "tenant_owner" ? "Responsável" : "Equipe operacional";
const statusLabel = { pending: "Pendente", accepted: "Aceito", revoked: "Revogado", expired: "Expirado" };
const deadlineDefault = () => { const time = new Date(Date.now() + 7 * 86400000); return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const message = (error: unknown) => error instanceof Error && !error.message.includes("PERMISSION_DENIED") && !error.message.includes("permission-denied") ? error.message : "Não foi possível confirmar a operação. Confira seu acesso e o estado atual da equipe antes de tentar novamente.";
export default function TeamManagement({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [members, setMembers] = useState<TeamMember[]>([]); const [invites, setInvites] = useState<TeamInvitation[]>([]); const [history, setHistory] = useState<TeamHistory[]>([]);
  const [policy, setPolicy] = useState<PublicEntitlements | null>(null); const [usage, setUsage] = useState<number | null>(null); const [suspended, setSuspended] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false); const [now, setNow] = useState(Date.now);
  const [uid, setUid] = useState(""); const [role, setRole] = useState<TenantRole>("staff"); const [generation, setGeneration] = useState(0); const [expires, setExpires] = useState(deadlineDefault); const [reason, setReason] = useState(""); const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!canManage || !db) return;
    const fail = () => { setError("Não foi possível confirmar a equipe. Nenhum acesso é presumido."); setMembers([]); setInvites([]); setHistory([]); setReady(false); };
    const stops = [watchTeamMembers(organizationId, setMembers, fail), watchTeamInvitations(organizationId, (items) => { setInvites(items); setReady(true); }, fail), watchTeamHistory(organizationId, setHistory, fail), watchPublicEntitlements(organizationId, setPolicy, fail),
      onSnapshot(doc(db, "tenantUsage", organizationId), (snapshot) => setUsage(snapshot.data()?.version === "commercial-v1" ? snapshot.data()!.activeMembers : null), fail),
      onSnapshot(doc(db, "organizationAvailability", organizationId), (snapshot) => setSuspended(snapshot.data()?.status === "suspended"), fail)];
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { stops.forEach((stop) => stop()); clearInterval(timer); };
  }, [organizationId, canManage]);
  async function perform(payload: object, run: (operationId: string) => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const scope = `team:${auth?.currentUser?.uid}:${organizationId}`; const hash = await importDigest(payload); const op = getQuotaAttempt(scope, hash, sessionStorage);
      await run(op); completeQuotaAttempt(scope, hash, op, sessionStorage); setNotice(success); return true;
    } catch (cause) { setError(message(cause)); return false; } finally { setBusy(false); }
  }
  async function issue(event: FormEvent) {
    event.preventDefault(); if (!confirmed) return;
    const payload = { uid: uid.trim(), role, generation, expiresAt: new Date(expires).getTime(), reason: reason.trim() };
    if (await perform(payload, (op) => issueTeamInvitation(organizationId, payload.uid, role, generation, payload.expiresAt, payload.reason, op), "Convite registrado. Acesso só será concedido após o aceite do destinatário.")) { setUid(""); setReason(""); setGeneration(0); setConfirmed(false); setExpires(deadlineDefault()); }
  }
  function resend(invite: TeamInvitation) { setUid(invite.uid); setRole(invite.role); setGeneration(invite.generation); setExpires(deadlineDefault()); setConfirmed(false); setReason(""); setNotice("Confira os dados e confirme o reenvio. A geração anterior não poderá ser aceita."); }
  if (!canManage) return <section className="empty-box"><h1>Equipe e convites</h1><p>Somente responsáveis podem gerenciar a equipe. Consulte seus próprios convites na área da conta.</p><Link to="/conta/convites">Meus convites</Link></section>;
  const canIssue = ready && quotaGrowthAllowed(policy, now) && !suspended && usage !== null;
  return <section className="admin-panel team-panel"><h1>Equipe e convites</h1><p>Os convites são vinculados à conta informada. Não enviamos e-mail nem concedemos acesso antes do aceite.</p>
    <p role="status">{usage === null ? "Inventário de equipe ainda não confirmado." : `${usage} integrantes ativos · limite ${policy?.limits.internalUsers ?? "a confirmar"}.`}</p>
    {!canIssue && <p>Novos convites bloqueados até confirmar inventário, plano e disponibilidade da organização. Revogações e histórico continuam disponíveis.</p>}
    {usage !== null && policy && usage >= policy.limits.internalUsers && <p>A equipe está no limite. É possível manter convites pendentes; o aceite precisa de uma vaga disponível.</p>}
    {error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}
    <form className="team-form" onSubmit={(event) => void issue(event)}><h2>{generation ? `Reenviar convite · geração ${generation + 1}` : "Convidar integrante"}</h2>
      <label className="field"><span>UID da conta convidada</span><input required maxLength={128} value={uid} disabled={busy} onChange={(event) => { setUid(event.target.value); setGeneration(0); setConfirmed(false); }} /></label>
      <label className="field"><span>Papel do convite</span><select value={role} disabled={busy} onChange={(event) => setRole(event.target.value as TenantRole)}><option value="staff">Equipe operacional</option><option value="tenant_owner">Responsável</option></select></label>
      <label className="field"><span>Validade do convite</span><input required type="datetime-local" value={expires} disabled={busy} onChange={(event) => setExpires(event.target.value)} /></label>
      <label className="field"><span>Motivo do convite</span><input required minLength={3} maxLength={300} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
      <label className="team-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />Conferi o UID de uma conta existente e o papel que desejo conceder.</label>
      <button className="button button-primary" disabled={busy || !canIssue || !confirmed}>{busy ? "Confirmando…" : generation ? "Confirmar reenvio" : "Criar convite"}</button>
    </form>
    <h2>Convites da organização</h2>{ready && !invites.length && <p>Nenhum convite registrado.</p>}
    <div className="team-list">{invites.map((invite) => <article className="team-card" key={invite.uid} aria-label={`Convite ${invite.uid}`}><h3 className="team-uid">{invite.uid}</h3><p>{roleLabel(invite.role)} · {statusLabel[invitationStatus(invite, now)]} · geração {invite.generation}</p><p>Validade: {invite.expiresAt.toDate().toLocaleString("pt-BR")}</p>
      <div className="team-actions"><button className="button button-outline" disabled={busy || !canIssue || members.some((member) => member.uid === invite.uid && member.status === "active")} onClick={() => resend(invite)}>Reenviar convite</button>
      {invite.status === "pending" && <button className="button button-outline" disabled={busy} onClick={() => void perform({ action: "revoke", uid: invite.uid, generation: invite.generation }, (op) => closeTeamInvitation(organizationId, invite.uid, invite.generation, "revoked", "Revogação pelo responsável", op), "Convite revogado. Nenhum acesso foi removido silenciosamente.")}>Revogar convite</button>}</div>
    </article>)}</div>
    <h2>Integrantes</h2><div className="team-list">{members.map((member) => <MemberRow key={member.uid} member={member} busy={busy} change={(nextRole, status, note) => perform({ uid: member.uid, role: nextRole, status, reason: note }, (op) => saveInternalMember(organizationId, member.uid, nextRole, status, note, op), "Acesso atualizado com auditoria.")} resend={() => { const invite = invites.find((item) => item.uid === member.uid); if (invite) resend(invite); else { setUid(member.uid); setGeneration(0); setConfirmed(false); setReason(""); } }} />)}</div>
    <h2>Histórico da equipe</h2><p>Até 20 eventos recentes de convite, aceite e alteração de acesso.</p><ol className="team-history">{history.map((item) => <li key={item.id}><strong>{({ invitation_issued: "Convite emitido", invitation_revoked: "Convite revogado", invitation_expired: "Convite expirado", member_accepted: "Convite aceito", member_saved: "Acesso alterado" } as Record<string, string>)[item.action] || item.action}</strong><span className="team-uid">{item.uid}</span><small>{item.at?.toDate().toLocaleString("pt-BR") || "Confirmando horário"}{item.generation ? ` · geração ${item.generation}` : ""} · ator {item.actorUid}</small><p>{item.reason}</p></li>)}</ol>
    <Link to="/conta/convites">Meus convites e identificador de acesso</Link>
  </section>;
}
function MemberRow({ member, busy, change, resend }: { member: TeamMember; busy: boolean; change: (role: TenantRole, status: "active" | "revoked", reason: string) => Promise<boolean>; resend: () => void }) {
  const [role, setRole] = useState(member.role); const [reason, setReason] = useState("");
  useEffect(() => setRole(member.role), [member.role]);
  return <article className="team-card" aria-label={`Integrante ${member.uid}`}><h3 className="team-uid">{member.uid}</h3><p>{roleLabel(member.role)} · {member.status === "active" ? "Ativo" : "Revogado"}</p>
    {member.status === "active" ? <><label className="field"><span>Papel de {member.uid}</span><select value={role} disabled={busy} onChange={(event) => setRole(event.target.value as TenantRole)}><option value="staff">Equipe operacional</option><option value="tenant_owner">Responsável</option></select></label>
      <label className="field"><span>Motivo da alteração de {member.uid}</span><input value={reason} minLength={3} maxLength={300} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label><div className="team-actions"><button className="button button-outline" disabled={busy || reason.trim().length < 3 || role === member.role} onClick={() => void change(role, "active", reason)}>Salvar papel</button><button className="button button-outline" disabled={busy || reason.trim().length < 3} onClick={() => void change(member.role, "revoked", reason)}>Revogar acesso</button></div></> : <button className="button button-outline" disabled={busy} onClick={resend}>Preparar novo convite</button>}
  </article>;
}
