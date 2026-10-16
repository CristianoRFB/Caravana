import { useEffect, useState } from "react";
import { getDocumentPolicy, uploadMinorAuthorization } from "./lib/documents";
import { importFailureMessage } from "./lib/import-operations";
import type { Registration } from "./lib/types";
export default function MinorAuthorization({ registration }: { registration: Registration }) {
  const [days, setDays] = useState<number | null>(null); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { let active = true; getDocumentPolicy(registration.organizationId).then((policy) => { if (active) setDays(policy.authorizationDays); }).catch((cause) => { if (active) setError(importFailureMessage(cause)); }); return () => { active = false; }; }, [registration.organizationId]);
  async function upload(file?: File) {
    if (!file || days === null) return;
    setBusy(true); setError("");
    try { await uploadMinorAuthorization(registration, file, consent, days); }
    catch (cause) { setError(importFailureMessage(cause)); setConsent(false); try { setDays((await getDocumentPolicy(registration.organizationId)).authorizationDays); } catch { setDays(null); } }
    finally { setBusy(false); }
  }
  return <section className="portal-card" style={{ gridColumn: "1 / -1" }}><h2>Autorização do responsável</h2>
    <p>Envie o PDF solicitado pela organização, até600 KB, ou combine a apresentação em papel pelo canal oficial. A equipe fará a conferência manual; o envio não valida automaticamente a autorização.</p>
    <p>Prazo operacional configurado para este envio: {days === null ? "consultando…" : `${days} dias`}. Após o prazo, a organização pode executar a exclusão controlada do arquivo. A configuração não substitui a definição das obrigações legais da organização.</p>
    {registration.authorizationStatus === "approved" ? <p role="status">Autorização conferida pela organização.</p> : <>
      {registration.authorizationId && <p role="status">PDF enviado para conferência.</p>}
      <label className="legacy-import-history-toggle"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Declaro que o responsável autoriza o envio deste documento para organização desta viagem, conforme finalidade e prazo informados.</span></label>
      <label className="button button-outline legacy-file-picker">Enviar autorização PDF<input aria-label="Enviar autorização PDF" type="file" accept="application/pdf" disabled={busy || !consent || days === null} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
    </>}{error && <p role="alert" className="error-message">{error}</p>}
  </section>;
}
