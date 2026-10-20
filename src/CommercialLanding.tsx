import { useEffect } from "react";
import {
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Layers3,
  Palette,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { COMMERCIAL_POLICY, PlanCatalog } from "./lib/plan-catalog";
import { COMMERCIAL_FEATURE_LABELS, PLAN_PRESENTATION } from "./lib/commercial-presentation";
import { money } from "./lib/types";
import "./commercial-landing.css";

// Optional public sales destination. No client, passenger or tenant contact is reused.
function commercialContact(value: string | undefined): string | null {
  if (!value) return null;
  if (/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
const resources = [
  {
    icon: Bus,
    title: "Da divulgação à reserva",
    text: "Uma página para suas viagens, inscrições por caravana e acompanhamento dos passageiros em um só lugar.",
  },
  {
    icon: WalletCards,
    title: "Financeiro com histórico",
    text: "Recebimentos registrados, despesas e visão geral da operação. O pagamento acontece fora da plataforma, com conferência manual do comprovante.",
  },
  {
    icon: ClipboardCheck,
    title: "Embarque organizado",
    text: "Lista de passageiros, documentos e check-in para acompanhar cada etapa da viagem.",
  },
  {
    icon: Palette,
    title: "A sua marca na frente",
    text: "Nome, cores e imagem da sua organizadora nas páginas públicas e no painel. Links próprios dentro da Caravana 77.",
  },
];
export default function CommercialLanding() {
  useEffect(() => {
    const previous = document.title;
    const title = "Caravana 77 | Gestão para sua organizadora";
    document.title = title;
    return () => { if (document.title === title) document.title = previous; };
  }, []);
  const contact = commercialContact(
    import.meta.env.VITE_COMMERCIAL_CONTACT_URL,
  );
  return (
    <div className="saas-page">
      <a className="saas-skip" href="#saas-main">
        Pular para o conteúdo
      </a>
      <header className="saas-nav saas-container">
        <Link
          className="saas-logo"
          to="/saas"
          aria-label="Caravana 77, início comercial"
        >
          <span>
            <Bus size={22} />
          </span>
          caravana<strong>77</strong>
        </Link>
        <nav aria-label="Navegação comercial">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link to="/admin/login">
            Entrar <ChevronRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="saas-main">
        <section className="saas-hero saas-container">
          <div className="saas-hero-copy">
            <p className="saas-eyebrow">
              <span /> PARA QUEM FAZ A VIAGEM ACONTECER
            </p>
            <h1>
              Sua próxima caravana.
              <br />
              <em>Seu jeito de organizar.</em>
            </h1>
            <p className="saas-lead">
              Da primeira reserva ao último embarque, reúna sua operação em um
              painel com a identidade da sua organizadora.
            </p>
            <div className="saas-actions">
              <a className="saas-button saas-primary" href="#planos">
                Encontrar meu plano <ArrowRight size={18} />
              </a>
              <a className="saas-text-link" href="#recursos">
                Conhecer os recursos
              </a>
            </div>
            <p className="saas-caption">
              <ShieldCheck size={16} /> Cada organizadora com seus próprios
              acessos e dados.
            </p>
          </div>
          <div
            className="saas-preview"
            aria-label="Exemplo ilustrativo do painel de uma organizadora"
          >
            <div className="saas-preview-top">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>Visão da organizadora</span>
              <Layers3 size={17} />
            </div>
            <div className="saas-preview-body">
              <div className="saas-preview-title">
                <span>BOA VIAGEM, EQUIPE</span>
                <strong>Vamos juntos.</strong>
                <small>Exemplo ilustrativo · dados fictícios</small>
              </div>
              <div className="saas-preview-trip">
                <span className="saas-preview-icon">
                  <Bus size={30} />
                </span>
                <div>
                  <strong>Próxima parada: o evento</strong>
                  <p>Uma viagem, todos os detalhes.</p>
                </div>
                <span className="saas-pill">Publicada</span>
              </div>
              <div className="saas-preview-stats">
                <div>
                  <small>Inscritos</small>
                  <strong>
                    24<span> / 60</span>
                  </strong>
                </div>
                <div>
                  <small>Próxima etapa</small>
                  <strong className="saas-preview-check">
                    <CheckCircle2 size={21} /> Embarque
                  </strong>
                </div>
              </div>
              <div className="saas-preview-row">
                <span>
                  <Check size={16} /> Inscrições organizadas
                </span>
                <span>01</span>
              </div>
              <div className="saas-preview-row">
                <span>
                  <Check size={16} /> Comprovantes conferidos
                </span>
                <span>02</span>
              </div>
              <div className="saas-preview-row">
                <span>
                  <Check size={16} /> Lista pronta para a viagem
                </span>
                <span>03</span>
              </div>
            </div>
            <div className="saas-preview-foot">
              <span /> Sua marca acompanha cada etapa.
            </div>
          </div>
        </section>
        <div className="saas-strip">
          <div className="saas-container">
            <span>MENOS PLANILHAS SOLTAS.</span>
            <span>MAIS VISÃO DA VIAGEM.</span>
            <span>DO INÍCIO AO EMBARQUE.</span>
          </div>
        </div>
        <section id="recursos" className="saas-section saas-container">
          <div className="saas-section-heading">
            <p className="saas-eyebrow">UMA OPERAÇÃO CONECTADA</p>
            <h2>
              Os detalhes ficam juntos.
              <br />A experiência leva sua marca.
            </h2>
            <p>Organize as rotinas que já fazem parte de cada viagem.</p>
          </div>
          <div className="saas-resource-grid">
            {resources.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="saas-resource-icon">
                  <Icon size={24} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="planos" className="saas-pricing">
          <div className="saas-container">
            <div className="saas-section-heading">
              <p className="saas-eyebrow">ESPAÇO PARA A SUA OPERAÇÃO</p>
              <h2>Mais capacidade. Mais formas de organizar.</h2>
              <p>
                Comece com a operação completa, ganhe relatórios no Pro e
                organize o trabalho da equipe no Premium.
              </p>
            </div>
            <div className="saas-plan-grid">
              {Object.values(PlanCatalog).map((plan) => (
                <article
                  key={plan.id}
                  className={`saas-plan saas-plan-${plan.id}`}
                  aria-labelledby={`plan-${plan.id}`}
                >
                  <p className="saas-plan-label">
                    {plan.id === "pro" ? "RECOMENDADO · PARA CRESCER" : plan.id === "essencial" ? "COMEÇAR A OPERAR" : "ORGANIZAR EM MAIOR ESCALA"}
                  </p>
                  <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
                  <p className="saas-plan-audience">{PLAN_PRESENTATION[plan.id].audience}</p>
                  <p className="saas-price">
                    {money(plan.monthlyCents)}
                    <span>/mês</span>
                  </p>
                  <ul>
                    <li>
                      <Check size={17} />
                      <span>
                        <strong>{plan.limits.activeCaravans}</strong> caravanas
                        publicadas
                      </span>
                    </li>
                    <li>
                      <Check size={17} />
                      <span>
                        <strong>{plan.limits.passengersPerCaravan}</strong>{" "}
                        passageiros por caravana
                      </span>
                    </li>
                    <li>
                      <Check size={17} />
                      <span>
                        <strong>{plan.limits.internalUsers}</strong> integrantes
                        internos
                      </span>
                    </li>
                  </ul>
                  <p className="saas-plan-inheritance">{PLAN_PRESENTATION[plan.id].previous}</p>
                  <ul className="saas-plan-benefits">
                    {PLAN_PRESENTATION[plan.id].features.map(feature => <li key={feature}><Check size={17} /><strong>{COMMERCIAL_FEATURE_LABELS[feature]}</strong></li>)}
                    {PLAN_PRESENTATION[plan.id].benefits.map(benefit => <li key={benefit}><Check size={17} /><span>{benefit}</span></li>)}
                  </ul>
                  <a
                    className={`saas-button ${plan.id === "pro" ? "saas-primary" : "saas-secondary"}`}
                    href={contact || "#implantacao"}
                  >
                    {contact
                      ? `Conversar sobre o ${plan.name}`
                      : "Conhecer a implantação"}
                    <ArrowRight size={17} />
                  </a>
                </article>
              ))}
            </div>
            <p className="saas-pricing-note">
              Implantação: {money(COMMERCIAL_POLICY.setupCents)}, com
              possibilidade de dispensa no atendimento. Contratação mensal e
              acompanhamento assistido. Sem cobrança automática ou teste público
              gratuito.
            </p>
            <div className="saas-comparison" role="region" aria-label="Comparação detalhada dos planos" tabIndex={0}>
              <table><caption>Recursos cumulativos, com limites do catálogo</caption><thead><tr><th scope="col">Recurso</th>{Object.values(PlanCatalog).map(plan=><th key={plan.id} scope="col">{plan.name}</th>)}</tr></thead>
                <tbody>{Object.entries(COMMERCIAL_FEATURE_LABELS).map(([feature,label])=><tr key={feature}><th scope="row">{label}</th>{Object.values(PlanCatalog).map(plan=><td key={plan.id}>{(plan.features as readonly string[]).includes(feature) ? "Incluído" : "Não incluído"}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
        <section
          id="implantacao"
          className="saas-section saas-container saas-onboarding"
        >
          <div>
            <p className="saas-eyebrow">PRIMEIROS PASSOS</p>
            <h2>
              Comece com a operação
              <br />
              preparada para você.
            </h2>
            <p>
              A ativação é assistida pela Caravana 77. O plano e a identidade
              são definidos com a organizadora antes do primeiro acesso.
            </p>
            {contact && (
              <a className="saas-button saas-primary" href={contact}>
                Falar sobre minha organizadora <ArrowRight size={18} />
              </a>
            )}
            {import.meta.env.VITE_USE_EMULATORS === "true" && (
              <Link
                className="saas-text-link saas-demo-link"
                to="/o/demo-organizadora-a"
              >
                Explorar demonstração local <ArrowRight size={17} />
              </Link>
            )}
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Encontre o plano adequado</h3>
                <p>
                  Confira volume de caravanas, passageiros e integrantes da sua
                  operação.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Prepare sua identidade e acesso</h3>
                <p>
                  Defina sua marca e o responsável pela organização no
                  atendimento assistido.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Publique sua primeira viagem</h3>
                <p>
                  Cadastre os detalhes, compartilhe o link e acompanhe as
                  inscrições.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section
          className="saas-faq saas-container"
          aria-labelledby="saas-faq-title"
        >
          <h2 id="saas-faq-title">Antes de embarcar.</h2>
          <details>
            <summary>Qual é a diferença entre os três planos?</summary>
            <p>O Essencial já inclui a operação, o Financeiro Geral e a importação CSV. O Pro acrescenta relatórios operacionais salvos, compartilhados com a equipe e exportáveis. O Premium inclui tudo do Pro e acrescenta roteiros de tarefas e modelos reutilizáveis, além da maior capacidade.</p>
          </details>
          <details>
            <summary>A Caravana 77 recebe o pagamento dos passageiros?</summary>
            <p>
              Não. A organizadora informa a forma de pagamento e recebe fora da
              plataforma. O sistema registra os lançamentos e permite conferir
              os comprovantes manualmente.
            </p>
          </details>
          <details>
            <summary>Posso usar a identidade da minha organizadora?</summary>
            <p>
              Sim. As páginas e o painel podem usar seu nome, sua imagem e suas
              cores, com um endereço da organizadora dentro da plataforma.
            </p>
          </details>
          <details>
            <summary>O que acontece se eu mudar para um plano menor?</summary>
            <p>
              O histórico é preservado. Se o uso já ultrapassar o novo limite,
              novas operações de crescimento ficam bloqueadas até haver espaço
              no plano. Relatórios e roteiros anteriores continuam consultáveis
              pelos acessos autorizados. Novas capturas e alterações de roteiros
              dependem das funcionalidades do plano atual; a operação principal
              e os controles de segurança permanecem disponíveis.
            </p>
          </details>
        </section>
      </main>
      <footer className="saas-footer saas-container">
        <Link className="saas-logo" to="/saas">
          <span>
            <Bus size={22} />
          </span>
          caravana<strong>77</strong>
        </Link>
        <p>Da organização à próxima história.</p>
        <Link to="/admin/login">
          Acesso da organizadora <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
