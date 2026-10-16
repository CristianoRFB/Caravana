import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "./lib/firebase";
const labels: Record<string, string> = { review_approved: "Inscrição confirmada", review_rejected: "Revisão recusada", cancelled: "Inscrição cancelada", checked_in: "Embarque registrado", checkin_reversed: "Embarque desfeito" };
interface Event { id: string; registrationId: string; action: string; actorUid: string; at: string; reason: string; }
export default function OperationalHistory({ organizationId, caravanId }: { organizationId: string; caravanId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!db || !caravanId) return;
    return onSnapshot(query(collection(db, "registrationOperations"), where("organizationId", "==", organizationId), where("caravanId", "==", caravanId), orderBy("at", "desc"), limit(30)), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      setError(""); setEvents(snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, registrationId: String(data.registrationId), action: String(data.action), actorUid: String(data.actorUid), at: data.at instanceof Timestamp ? data.at.toDate().toLocaleString("pt-BR") : "Horário indisponível", reason: String(data.reason || "") };
      }));
    }, () => { setEvents([]); setError("Não foi possível carregar o histórico autorizado."); });
  }, [organizationId, caravanId]);
  return <section className="admin-panel platform-section operational-history"><h2>Histórico operacional</h2>
    <p>Até 30 operações confirmadas pelo servidor nesta caravana. Revisão de comprovante não representa conciliação bancária.</p>
    {error && <p role="alert">{error}</p>}{!error && events.length === 0 && <p>Nenhuma operação registrada.</p>}
    <ul>{events.map((event) => <li key={event.id} style={{ overflowWrap: "anywhere" }}><strong>{labels[event.action] || event.action}</strong> · inscrição {event.registrationId.slice(0, 8).toUpperCase()} · {event.at} · responsável {event.actorUid}{event.reason && <span> · {event.reason}</span>}</li>)}</ul>
  </section>;
}
