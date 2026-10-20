import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { watchAuth } from "./lib/data";
import { acceptTeamInvitation, invitationStatus, watchInvitationInbox, type TeamInvitation } from "./lib/team-invitations";
import { getQuotaAttempt, completeQuotaAttempt } from "./lib/quota-attempt";
import { importDigest } from "./lib/import-identity";
import "./team.css";
export default function InvitationInbox() {
  const [user, setUser] = useState<User | null>(null); const [authReady, setAuthReady] = useState(false);
  useEffect(() => watchAuth((current) => { setUser(current); setAuthReady(true); }), []);
  if (!authReady) return <main className="center-page"><p role="status">Confirmando conta…</p></main>;
  if (!user) return <Navigate to="/conta/entrar" replace />;
  return <Inbox key={user.uid} user={user} />;
}
function Inbox({ user }: { user: User }) {
  const [items, setItems] = useState<TeamInvitation[]>([]); const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const stop = watchInvitationInbox(user.uid, (value) => { setItems(value); setReady(true); }, () => { setItems([]); setError("Não foi possível confirmar seus convites."); setReady(false); });
    const timer = setInterval(() => setNow(Date.now()), 1000); return () => { stop(); clearInterval(timer); };
  }, [user.uid]);
  async function accept(invite: TeamInvitation) {
    setBusy(true); setError(""); setNotice("");
    try {
      const scope = `invitation:${user.uid}:${invite.organizationId}`; const hash = await importDigest({ generation: invite.generation, role: invite.role }); const op = getQuotaAttempt(scope, hash, sessionStorage);
      await acceptTeamInvitation(invite.organizationId, user.uid, invite.generation, invite.role, op); completeQuotaAttempt(scope, hash, op, sessionStorage); setNotice("Convite aceito. Seu acesso à organização foi registrado.");
    } catch (cause) { setError(cause instanceof Error && !/permission|PERMISSION/.test(cause.message) ? cause.message : "Não foi possível confirmar o aceite. Confira o convite, o plano e a disponibilidade com a organização."); } finally { setBusy(false); }
  }
  return <main className="center-page"><section className="admin-panel team-panel team-inbox"><Link to="/conta">Voltar à conta</Link><h1>Meus convites</h1><p>Compartilhe seu identificador com a organização por um canal seguro para receber um convite. Nenhum convite dá acesso antes do seu aceite.</p><p>Seu identificador de acesso (UID): <code className="team-uid">{user.uid}</code></p>
    {error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}{!ready && !error && <p role="status">Carregando convites…</p>}{ready && !items.length && <p>Nenhum convite disponível para esta conta.</p>}
    <div className="team-list">{items.map((invite) => <article className="team-card" key={invite.organizationId} aria-label={`Convite da organização ${invite.organizationId}`}><h2 className="team-uid">{invite.organizationId}</h2><p>{invite.role === "tenant_owner" ? "Responsável" : "Equipe operacional"} · {{ pending: "Pendente", accepted: "Aceito", revoked: "Revogado", expired: "Expirado" }[invitationStatus(invite, now)]} · geração {invite.generation}</p><p>Válido até {invite.expiresAt.toDate().toLocaleString("pt-BR")}</p>
      {invitationStatus(invite, now) === "pending" && <button className="button button-primary" disabled={busy} onClick={() => void accept(invite)}>{busy ? "Confirmando aceite…" : "Aceitar convite"}</button>}
      {invite.status === "accepted" && <p>O aceite faz parte do histórico. A organização pode revogar seu acesso mesmo após o aceite.</p>}
    </article>)}</div><p><Link className="button button-outline" to="/admin">Abrir painel da organização</Link></p>
  </section></main>;
}
