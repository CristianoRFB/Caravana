import { Component, useSyncExternalStore, type ReactNode } from "react";
import { clearDiagnostics, diagnosticReport, diagnosticSnapshot, observeDiagnostics, recordDiagnosticFailure } from "./lib/diagnostics";
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){recordDiagnosticFailure(error,"render");}
  render(){return this.state.failed ? <main className="center-page"><section className="empty-box"><h1>Não foi possível exibir esta página</h1><p>Recarregue e confira o histórico antes de repetir uma operação. Esta mensagem não confirma nem desfaz lançamentos.</p><button className="button button-primary" onClick={()=>window.location.reload()}>Recarregar com segurança</button></section></main> : this.props.children;}
}
export default function SafetyDiagnostics() {
  const events=useSyncExternalStore(observeDiagnostics,diagnosticSnapshot,diagnosticSnapshot);
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(diagnosticReport(),null,2)],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="caravana77-diagnostico-local.json";anchor.click();URL.revokeObjectURL(url);}
  return <section className="admin-panel platform-section"><h1>Diagnóstico local</h1><p>Registros temporários desta aba, limitados a 50 falhas. Guardamos apenas categoria, código padronizado e minuto da ocorrência. Não incluímos mensagens, nomes, documentos, contatos, links privados ou credenciais.</p><p>Não há envio automático. Ao trocar de organização ou sair do painel, o diagnóstico é limpo. Ele não substitui a auditoria confirmada pelo servidor nem um serviço de alertas.</p><div className="tool-actions"><button className="button button-primary" disabled={!events.length} onClick={download}>Exportar diagnóstico local</button><button className="button button-outline" disabled={!events.length} onClick={clearDiagnostics}>Limpar registros desta aba</button></div><p role="status">{events.length} falhas registradas nesta consulta.</p><ul>{events.map((event,index)=><li key={index}>{event.minuteUtc} · {event.kind} · {event.code}</li>)}</ul></section>;
}
