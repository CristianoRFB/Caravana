import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "./lib/firebase";
const labels: Record<string, string> = { fare_adjusted: "Valor previsto corrigido", payment_recorded: "Recebimento registrado", payment_voided: "Recebimento anulado", expense_recorded: "Despesa registrada", expense_voided: "Despesa anulada", expense_corrected: "Despesa corrigida" };
interface Event { id: string; label: string; at: string; actor: string; reason: string }
export default function FinancialHistory({ organizationId, caravanId }: { organizationId: string; caravanId: string }) {
  const [events, setEvents] = useState<Event[]>([]); const [error, setError] = useState("");
  useEffect(() => {
    if (!db) return;
    const constraints = [where("organizationId", "==", organizationId), ...(caravanId ? [where("caravanId", "==", caravanId)] : []), orderBy("at", "desc"), limit(30)];
    return onSnapshot(query(collection(db, "financialOperations"), ...constraints), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setError(""); setEvents(snapshot.docs.map((item) => { const data = item.data(); return { id: item.id, label: labels[data.action] || "Operação financeira", at: data.at instanceof Timestamp ? data.at.toDate().toLocaleString("pt-BR") : "Horário indisponível", actor: String(data.actorUid), reason: String(data.reason || "") }; }));
    }, () => { setEvents([]); setError("Não foi possível carregar a auditoria financeira autorizada."); });
  }, [organizationId, caravanId]);
  return <section className="admin-panel platform-section operational-history"><h2>Auditoria financeira</h2><p>Até30 operações confirmadas pelo servidor no filtro atual. Não há integração bancária.</p>
    {error && <p role="alert">{error}</p>}{!error && events.length === 0 && <p>Nenhuma operação auditada neste filtro; lançamentos legados continuam no histórico original.</p>}
    <ul>{events.map((event) => <li key={event.id} style={{ overflowWrap: "anywhere" }}><strong>{event.label}</strong> · {event.at} · responsável {event.actor}{event.reason && ` · ${event.reason}`}</li>)}</ul>
  </section>;
}
