import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
interface ToolEvent { id: string; kind: string; actorUid: string; at: Timestamp; before: { archived?: boolean } | null; after: { title: string; archived?: boolean; revision: number } }
export default function ToolAudit({ organizationId }: { organizationId: string }) {
  const [open,setOpen]=useState(false),[events,setEvents]=useState<ToolEvent[]>([]),[error,setError]=useState("");
  useEffect(()=>{
    if(!open || !db)return;
    return onSnapshot(query(collection(db,"organizations",organizationId,"toolEvents"),orderBy("at","desc"),limit(20)),{includeMetadataChanges:true},snapshot=>{
      if(!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites){setEvents(snapshot.docs.map(item=>({...item.data(),id:item.id}) as ToolEvent));setError("");}
    },()=>{setEvents([]);setError("Não foi possível confirmar a permissão para consultar as alterações.");});
  },[organizationId,open]);
  return <details className="empty-box" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Histórico de alterações</summary><p>Até 20 operações recentes confirmadas pelo servidor, com responsável e revisão. A consulta não altera os documentos.</p>{error && <p role="alert">{error}</p>}<ul className="tool-task-list">{events.map(event=><li key={event.id}>
    <strong>{event.kind === "report" ? "Relatório salvo" : event.before === null ? "Roteiro criado" : event.after.archived && !event.before.archived ? "Roteiro arquivado" : !event.after.archived && event.before.archived ? "Roteiro reaberto" : "Roteiro atualizado"}</strong> · {event.after.title} · Revisão {event.after.revision} · {event.at.toDate().toLocaleString("pt-BR")} · Responsável {event.actorUid}
  </li>)}</ul>{open && !events.length && !error && <p>Nenhuma operação nesta consulta.</p>}</details>;
}
