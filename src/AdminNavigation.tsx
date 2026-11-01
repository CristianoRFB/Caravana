import { Link, NavLink, useLocation } from "react-router-dom";
import { useTenantBrand } from "./lib/tenant-brand-context";

const operation = [
  ["/admin", "▦", "Visão geral"], ["/admin/caravanas", "◫", "Caravanas"],
  ["/admin/financeiro", "R$", "Financeiro"], ["/admin/comprovantes", "▤", "Comprovantes"], ["/admin/check-in", "✓", "Check-in"],
];
const organization = [
  ["/admin/equipe", "♧", "Equipe e convites"], ["/admin/identidade", "◈", "Identidade pública"],
  ["/admin/documentos", "▤", "Documentos e prazos"], ["/admin/plano", "◇", "Plano e limites"],
];
const tools = [["/admin/relatorios", "▥", "Relatórios"], ["/admin/roteiros", "☷", "Roteiros da equipe"], ["/admin/diagnostico", "?", "Diagnóstico local"]];

export default function AdminNavigation({ restricted }: { restricted: boolean }) {
  const groups = [["Dia a dia", operation], ...(!restricted ? [["Sua organização", organization]] : []), ["Ferramentas", [...tools, ...(!restricted ? [["/admin/suporte", "?", "Suporte"]] : [])]]] as [string, string[][]][];
  return <nav aria-label="Navegação da organização" className="admin-navigation">
    {groups.map(([label, links]) => <section className="admin-nav-group" key={label} aria-label={label}>
      <h2>{label}</h2>
      {links.map(([to, icon, title]) => <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}><span aria-hidden="true">{icon}</span>{title}</NavLink>)}
    </section>)}
  </nav>;
}

function pageHelp(path: string) {
  if (path.includes("/financeiro")) return ["Financeiro", "Registre apenas pagamentos que você já conferiu. Use o histórico para revisar lançamentos; valores não conciliados precisam de conferência antes de qualquer correção."];
  if (path.includes("/passageiros")) return ["Passageiros", "Busque a pessoa pelo nome e confira embarque, inscrição e pagamento antes de editar. Os filtros ajudam a trabalhar com uma caravana por vez."];
  if (path.includes("/check-in")) return ["Check-in", "Escolha a caravana e localize o passageiro. Marque o embarque quando a pessoa entrar; se houver engano, confira antes de desfazer."];
  if (path.includes("/comprovantes")) return ["Comprovantes", "Abra o comprovante e confira o pagamento com a organização. O envio de um arquivo, por si só, não confirma o recebimento."];
  if (path.includes("/caravanas")) return ["Caravanas", "Abra uma caravana para acessar seus passageiros ou revisar os detalhes da viagem. Confira datas, vagas, embarques e pagamento antes de publicar."];
  if (path.includes("/equipe")) return ["Equipe e convites", "Convide somente a conta correta e escolha o papel necessário. Confira os limites da equipe e revise acessos que não são mais necessários."];
  if (path.includes("/identidade")) return ["Identidade pública", "Revise nome, marca e contatos que os passageiros verão. Confira os links públicos depois de salvar."];
  if (path.includes("/documentos")) return ["Documentos e prazos", "Defina orientações e prazos para os documentos da viagem. Confira as autorizações dos menores antes do embarque."];
  if (path.includes("/plano")) return ["Plano e limites", "Consulte os recursos e limites da organização. Mudanças de plano não apagam o histórico; novas operações podem depender do limite disponível."];
  if (path.includes("/relatorios")) return ["Relatórios", "Escolha o período e a caravana para consultar os resultados. Relatórios incompletos identificam valores ainda não conciliados; exportar não altera os lançamentos."];
  if (path.includes("/roteiros")) return ["Roteiros da equipe", "Organize as tarefas da viagem e acompanhe o que já foi feito. Modelos e roteiros disponíveis dependem do plano e do seu papel."];
  if (path.includes("/suporte")) return ["Suporte", "Descreva o problema e a etapa em que ele aconteceu. Não inclua senhas, documentos pessoais ou comprovantes na mensagem."];
  if (path.includes("/diagnostico")) return ["Diagnóstico local", "Confira o estado da conexão e das operações. Compartilhe somente o resumo sanitizado, sem dados de passageiros ou credenciais."];
  return ["Visão geral", "Escolha uma caravana para acompanhar as inscrições. Use os atalhos para abrir a tarefa que precisa fazer agora."];
}

export function AdminPageGuide({ owner }: { owner: boolean }) {
  const { pathname } = useLocation(); const tenant = useTenantBrand(); const [title, help] = pageHelp(pathname);
  return <div className="workspace-guide">
    <p className="workspace-location"><span>{tenant.branding?.publicName || "Painel da organização"}</span><span aria-hidden="true">/</span><strong>{title}</strong><span className="workspace-role">{owner ? "Responsável" : "Equipe"}</span></p>
    <details><summary>Como usar esta página</summary><p>{help}</p></details>
  </div>;
}

export function DashboardTasks() {
  return <section className="workspace-tasks" aria-labelledby="workspace-tasks-title">
    <h2 id="workspace-tasks-title">O que você precisa fazer?</h2>
    <div>{[["/admin/caravanas", "Organizar a viagem", "Caravanas e passageiros"], ["/admin/financeiro", "Conferir pagamentos", "Recebimentos, despesas e histórico"], ["/admin/check-in", "Preparar o embarque", "Lista de passageiros e check-in"]].map(([to, title, description]) => <Link to={to} key={to}><strong>{title}<span aria-hidden="true"> →</span></strong><span>{description}</span></Link>)}</div>
  </section>;
}
