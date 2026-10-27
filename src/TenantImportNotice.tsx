import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";

// Read-only status of a historical copy. No writes, account creation or plan grants.
export default function TenantImportNotice({ organizationId, onPending }: { organizationId: string; onPending: (pending: boolean) => void }) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setPending(false); onPending(false);
    if (!db) return;
    return onSnapshot(doc(db, "organizations", organizationId), snapshot => { const value = snapshot.data()?.importPending === true; setPending(value); onPending(value); }, () => setPending(false));
  }, [organizationId, onPending]);
  return pending ? <p role="status" className="inline-notice">Histórico importado em modo somente leitura para consulta e revisão. A caravana importada permanece em rascunho; novas inscrições e a mudança do fluxo público ainda não foram liberadas. Valores não conciliados devem ser conferidos no histórico.</p> : null;
}
