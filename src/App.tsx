import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  FileCheck2,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  cancelRegistration,
  createCaravan,
  findCaravan,
  getAdminOrganization,
  getCaravanById,
  getRegistration,
  loadProof,
  login,
  logout,
  reserveSeat,
  reviewPayment,
  toggleCheckin,
  updateCaravan,
  uploadProof,
  watchAdminCaravans,
  watchAuth,
  watchRegistration,
  watchRegistrations,
} from "./lib/data";
import { dateLabel, money, type Caravan, type Registration } from "./lib/types";
import { firebaseConfigured } from "./lib/firebase";
import type { User } from "firebase/auth";
import PublicIndex from "./PublicIndex";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Algo deu errado. Tente novamente.";
const OrganizationContext = createContext("");

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} to="/">
      <span className="brand-mark">
        <Bus size={17} />
      </span>
      <span>
        caravana<span className="brand-number">77</span>
      </span>
    </Link>
  );
}
function Topbar({ admin = false }: { admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = window.location.pathname;
  const home = path === "/";
  const trip = path.startsWith("/caravana/") && !path.includes("/inscricao");
  const target = (anchor: string) =>
    home ? "#eventos" : trip ? `#${anchor}` : "/#eventos";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand light={admin} />
        <button
          className="mobile-menu"
          aria-label="Abrir menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "nav-open" : ""}>
          {admin ? (
            <>
              <Link to="/admin/login">Área da equipe</Link>
              <Link to="/">Site público</Link>
            </>
          ) : (
            <>
              <a href={target("experiencia")}>A experiência</a>
              <a href={target("embarque")}>Embarque</a>
              <a href={target("duvidas")}>Dúvidas</a>
              <Link className="nav-login" to="/admin/login">
                Área da equipe <ArrowRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <Brand light />
      <span>Cultura. Viagens. Pessoas. Histórias.</span>
      <span>© 2026 Caravana 77</span>
    </footer>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={18} />
      <span>{children}</span>
    </div>
  );
}
function Loading({ text = "Carregando…" }: { text?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {text}
    </div>
  );
}

function PublicLanding() {
  const { slug = "" } = useParams();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        setError(
          "O Firebase não respondeu. Verifique se o Cloud Firestore está habilitado no projeto.",
        );
        setLoading(false);
      }
    }, 10000);
    findCaravan(slug)
      .then((v) => {
        if (active) setCaravan(v);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug]);
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Topbar />
        <main className="center-page">
          <div className="empty-box">
            <CircleHelp />
            <h1>Não foi possível carregar esta caravana</h1>
            <p>{error}</p>
          </div>
        </main>
      </>
    );
  if (!caravan)
    return (
      <>
        <Topbar />
        <main className="center-page">
          <div className="empty-box">
            <Bus />
            <h1>Caravana não encontrada</h1>
            <p>Confira o link ou fale com a equipe organizadora.</p>
            <Link className="button button-primary" to="/">
              Voltar ao início
            </Link>
          </div>
        </main>
      </>
    );
  const free = Math.max(0, caravan.capacity - caravan.reservedSeats);
  return (
    <>
      <Topbar />
      <main>
        <section className="hero">
          <div className="hero-orbit orbit-a" />
          <div className="hero-orbit orbit-b" />
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={15} /> SUA PRÓXIMA HISTÓRIA COMEÇA AQUI
              </div>
              <h1>
                {caravan.name.split(" ").slice(0, 2).join(" ")}
                <br />
                <span>
                  {caravan.name.split(" ").slice(2).join(" ") || caravan.event}
                </span>
              </h1>
              <p>{caravan.description}</p>
              <div className="hero-tags">
                <span>
                  <Heart size={13} /> Anime
                </span>
                <span>
                  <Sparkles size={13} /> Cultura pop
                </span>
                <span>
                  <Users size={13} /> Novas histórias
                </span>
              </div>
              <Link
                to={`/caravana/${caravan.slug}/inscricao`}
                className="button button-primary button-large"
              >
                Quero participar <ArrowRight size={18} />
              </Link>
              <div className="hero-safe">
                <ShieldCheck size={15} /> Inscrição segura · pagamento via Pix
              </div>
            </div>
            <div
              className="hero-art"
              aria-label="Arte abstrata de uma viagem noturna"
            >
              <div className="art-sun" />
              <div className="city city-back" />
              <div className="city city-front" />
              <div className="art-bus">
                <Bus size={80} />
              </div>
              <div className="art-label">
                VAMOS JUNTOS <span>↗</span>
              </div>
              <div className="art-spark spark-1">✦</div>
              <div className="art-spark spark-2">✧</div>
            </div>
          </div>
        </section>
        <section className="facts-wrap">
          <div className="facts">
            <Fact
              icon={<CalendarDays />}
              label="DATA"
              value={dateLabel(caravan.date)}
              detail={caravan.departureTime + " · saída"}
            />
            <Fact
              icon={<MapPin />}
              label="DESTINO"
              value={caravan.city}
              detail={caravan.destination}
            />
            <Fact
              icon={<Ticket />}
              label="POR PESSOA"
              value={money(caravan.priceCents)}
              detail="ida e volta"
            />
            <Fact
              icon={<Users />}
              label="VAGAS"
              value={`${free} disponíveis`}
              detail={`de ${caravan.capacity} lugares`}
            />
            <Link
              to={`/caravana/${caravan.slug}/inscricao`}
              className="button button-primary fact-cta"
            >
              Garantir minha vaga <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="content-section" id="experiencia">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow-dark">TUDO PENSADO PRA VOCÊ</div>
              <h2>
                Mais que uma viagem.
                <br />
                <span>Uma experiência completa.</span>
              </h2>
            </div>
            <p>Você cuida da diversão. A gente cuida do caminho.</p>
          </div>
          <div className="benefit-grid">
            {(caravan.benefits.length
              ? caravan.benefits
              : [
                  "Transporte de ida e volta",
                  "Equipe acompanhando a viagem",
                  "Uma galera para curtir junto",
                ]
            ).map((item, i) => (
              <div className="benefit" key={item}>
                <span className={`benefit-icon tone-${i % 4}`}>
                  {[<Bus />, <ShieldCheck />, <Ticket />][i % 3]}
                </span>
                <div>
                  <strong>{item}</strong>
                  <p>Mais tranquilidade para aproveitar cada momento.</p>
                </div>
                <ArrowRight className="benefit-arrow" size={17} />
              </div>
            ))}
          </div>
        </section>
        <section className="trip-section" id="embarque">
          <div className="trip-panel">
            <div className="trip-top">
              <div>
                <div className="eyebrow">ROTA DA CARAVANA</div>
                <h2>
                  Seu embarque,
                  <br />
                  sem complicação.
                </h2>
              </div>
              <div className="trip-bus">
                <Bus size={48} />
              </div>
            </div>
            <div className="boarding-list">
              {caravan.boardingPoints.map((point, i) => (
                <div className="boarding-row" key={point.id}>
                  <span className="boarding-number">0{i + 1}</span>
                  <div>
                    <strong>{point.name}</strong>
                    <p>{point.address}</p>
                  </div>
                  <span className="boarding-time">
                    <Clock3 size={14} />
                    {point.time}
                  </span>
                </div>
              ))}
            </div>
            <div className="trip-destination">
              <MapPin size={17} />
              <span>Destino</span>
              <strong>{caravan.destination}</strong>
            </div>
          </div>
          <div className="trip-side">
            <div className="side-star">✳</div>
            <div className="eyebrow eyebrow-dark">
              A VIAGEM TAMBÉM É PARTE DO EVENTO
            </div>
            <h2>
              Boas histórias
              <br />
              começam no caminho.
            </h2>
            <p>
              Conheça gente nova, compartilhe expectativas e chegue pronto para
              viver tudo.
            </p>
            <span className="side-note">CULTURA CONECTA PESSOAS.</span>
          </div>
        </section>
        {caravan.announcements.length > 0 && (
          <section className="content-section announcement-section">
            <div className="eyebrow eyebrow-dark">RECADO DA EQUIPE</div>
            {caravan.announcements.map((n, i) => (
              <div className="announcement" key={i}>
                <span className="announce-icon">
                  <Sparkles />
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                </div>
              </div>
            ))}
          </section>
        )}
        <section className="faq-section" id="duvidas">
          <div>
            <div className="eyebrow eyebrow-dark">DÚVIDAS FREQUENTES</div>
            <h2>
              Tá pensando em
              <br />
              alguma coisa?
            </h2>
            <p>Separamos as respostas para você embarcar tranquilo.</p>
          </div>
          <div className="faq-list">
            {caravan.faqs.map((faq, i) => (
              <details key={i}>
                <summary>
                  {faq.question}
                  <ChevronDown size={18} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bottom-cta">
          <div className="cta-star">✦</div>
          <div>
            <div className="eyebrow">VAGAS LIMITADAS</div>
            <h2>
              Essa história fica melhor
              <br />
              com você nela.
            </h2>
          </div>
          <Link
            to={`/caravana/${caravan.slug}/inscricao`}
            className="button button-light"
          >
            Quero minha vaga <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
function Fact({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="fact">
      <span className="fact-icon">{icon}</span>
      <div>
        <span className="fact-label">{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function RegistrationPage() {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    passengerName: "",
    phone: "",
    email: "",
    city: "",
    boardingPointId: "",
    boardingPointName: "",
    emergencyContact: "",
    notes: "",
  });
  useEffect(() => {
    findCaravan(slug)
      .then(setCaravan)
      .catch((e) => setError(errorMessage(e)));
  }, [slug]);
  const change = (key: keyof typeof form, value: string) =>
    setForm((curr) => ({
      ...curr,
      [key]: value,
      ...(key === "boardingPointId"
        ? {
            boardingPointName:
              caravan?.boardingPoints.find((p) => p.id === value)?.name || "",
          }
        : {}),
    }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!caravan) return;
    setError("");
    setBusy(true);
    try {
      const id = await reserveSeat(caravan, form);
      nav(`/minha-inscricao/${id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (!caravan)
    return (
      <>
        <Topbar />
        <Loading />
      </>
    );
  return (
    <>
      <Topbar />
      <main className="form-page">
        <Link className="back-link" to={`/caravana/${slug}`}>
          <ArrowLeft size={16} /> Voltar para a caravana
        </Link>
        <div className="form-layout">
          <section className="form-main">
            <div className="eyebrow eyebrow-dark">SUA PRÓXIMA AVENTURA</div>
            <h1>
              Vamos reservar
              <br />
              seu lugar?
            </h1>
            <p className="form-intro">
              Preencha seus dados para começar. A vaga fica reservada enquanto
              você envia o comprovante.
            </p>
            <div className="stepper">
              <span className="step-active">
                <b>1</b> Seus dados
              </span>
              <i />
              <span>
                <b>2</b> Embarque
              </span>
              <i />
              <span>
                <b>3</b> Revisão
              </span>
            </div>
            <form onSubmit={submit} className="form-card">
              <div className="field-grid">
                <Field label="Nome completo" required>
                  <input
                    autoComplete="name"
                    required
                    value={form.passengerName}
                    onChange={(e) => change("passengerName", e.target.value)}
                    placeholder="Como está no seu documento"
                  />
                </Field>
                <Field label="WhatsApp" required>
                  <input
                    autoComplete="tel"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => change("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    autoComplete="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => change("email", e.target.value)}
                    placeholder="voce@email.com"
                  />
                </Field>
                <Field label="Cidade" required>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => change("city", e.target.value)}
                    placeholder="Sua cidade"
                  />
                </Field>
                <Field label="Ponto de embarque" required full>
                  <select
                    required
                    value={form.boardingPointId}
                    onChange={(e) => change("boardingPointId", e.target.value)}
                  >
                    <option value="">Escolha seu ponto</option>
                    {caravan.boardingPoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.time}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Contato de emergência" required full>
                  <input
                    required
                    value={form.emergencyContact}
                    onChange={(e) => change("emergencyContact", e.target.value)}
                    placeholder="Nome e telefone de alguém próximo"
                  />
                </Field>
                <Field label="Observações" full>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => change("notes", e.target.value)}
                    placeholder="Alguma informação importante para a equipe?"
                  />
                </Field>
              </div>
              {error && <div className="error-message">{error}</div>}
              <Notice>
                Seus dados são usados apenas para organizar esta viagem.
              </Notice>
              <button
                className="button button-primary button-large form-submit"
                disabled={busy}
              >
                {busy ? "Reservando…" : "Revisar e continuar"}{" "}
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>
          </section>
          <aside className="summary-card">
            <div className="summary-art">
              <span>CARAVANA 77</span>
              <Bus size={54} />
            </div>
            <span className="summary-kicker">SUA VIAGEM</span>
            <h2>{caravan.name}</h2>
            <div className="summary-line">
              <CalendarDays />
              {dateLabel(caravan.date)}
            </div>
            <div className="summary-line">
              <MapPin />
              {caravan.destination}
            </div>
            <div className="summary-line">
              <Clock3 />
              Saída às {caravan.departureTime}
            </div>
            <div className="summary-price">
              <span>Valor por pessoa</span>
              <strong>{money(caravan.priceCents)}</strong>
            </div>
            <div className="summary-note">
              <LockKeyhole size={15} /> Pagamento seguro via Pix
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field ${full ? "field-full" : ""}`}>
      <span>
        {label}
        {required && <i> *</i>}
      </span>
      {children}
    </label>
  );
}

function MyRegistration() {
  const { id = "" } = useParams();
  const [reg, setReg] = useState<Registration | null>(null);
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const refresh = useCallback(
    () =>
      getRegistration(id)
        .then(async (r) => {
          setReg(r);
          if (r)
            setCaravan(await getCaravanById(r.caravanId).catch(() => null));
        })
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false)),
    [id],
  );
  useEffect(
    () =>
      watchRegistration(
        id,
        async (r) => {
          setReg(r);
          if (r)
            setCaravan(await getCaravanById(r.caravanId).catch(() => null));
          setLoading(false);
        },
        (e) => {
          setError(errorMessage(e));
          setLoading(false);
        },
      ),
    [id],
  );
  async function sendFile(file?: File) {
    if (!file || !reg) return;
    setBusy(true);
    setError("");
    try {
      await uploadProof(reg, file);
      setMessage("Comprovante enviado. Aguardando análise.");
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function copyPix() {
    if (!caravan?.pixKey) {
      setError("A chave Pix ainda não foi configurada pela organização.");
      return;
    }
    try {
      await navigator.clipboard.writeText(caravan.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione e copie a chave Pix.",
      );
    }
  }
  if (loading)
    return (
      <>
        <Topbar />
        <Loading />
      </>
    );
  if (!reg)
    return (
      <>
        <Topbar />
        <main className="center-page">
          <div className="empty-box">
            <LockKeyhole />
            <h1>Inscrição não encontrada</h1>
            <p>Confira o link que você recebeu.</p>
          </div>
        </main>
      </>
    );
  const statuses: Record<string, string> = {
    confirmed: "Confirmada",
    awaiting_review: "Aguardando análise",
    awaiting_payment: "Aguardando pagamento",
    rejected: "Pagamento recusado",
    cancelled: "Cancelada",
  };
  return (
    <>
      <Topbar />
      <main className="portal-page">
        <Link className="back-link" to={`/caravana/${caravan?.slug || ""}`}>
          <ArrowLeft size={16} /> Página da caravana
        </Link>
        <div className="portal-heading">
          <span className="portal-icon">
            <Ticket />
          </span>
          <div>
            <div className="eyebrow eyebrow-dark">
              MINHA INSCRIÇÃO · {reg.id.slice(0, 8).toUpperCase()}
            </div>
            <h1>Oi, {reg.passengerName.split(" ")[0]}!</h1>
            <p>Aqui estão os detalhes da sua próxima viagem.</p>
          </div>
        </div>
        <div className="portal-grid">
          <section className="portal-card">
            <div className="portal-status">
              <span className={`status-dot status-${reg.registrationStatus}`} />
              <div>
                <small>STATUS DA INSCRIÇÃO</small>
                <strong>{statuses[reg.registrationStatus]}</strong>
              </div>
            </div>
            <h2>{reg.caravanName}</h2>
            <div className="portal-details">
              <div>
                <CalendarDays />
                <span>
                  {caravan ? dateLabel(caravan.date) : "Data da viagem"}
                </span>
              </div>
              <div>
                <MapPin />
                <span>{reg.boardingPointName || "Ponto de embarque"}</span>
              </div>
              <div>
                <Clock3 />
                <span>
                  Embarque às{" "}
                  {caravan?.boardingPoints.find(
                    (p) => p.id === reg.boardingPointId,
                  )?.time ||
                    caravan?.departureTime ||
                    "—"}
                </span>
              </div>
              <div>
                <WalletCards />
                <span>{money(reg.amountCents)} · Pix</span>
              </div>
            </div>
            {reg.registrationStatus === "confirmed" && (
              <Notice>
                Pagamento confirmado! Guarde esta página e chegue 15 minutos
                antes.
              </Notice>
            )}
            {reg.registrationStatus === "awaiting_review" && (
              <Notice>
                Comprovante enviado. A equipe está conferindo seu pagamento.
              </Notice>
            )}
            {reg.registrationStatus === "rejected" && (
              <div className="error-message">
                {reg.rejectionReason ||
                  "O comprovante foi recusado. Você pode enviar outro."}
              </div>
            )}
          </section>
          <section className="portal-card payment-card">
            <div className="eyebrow eyebrow-dark">PAGAMENTO VIA PIX</div>
            <h2>
              {reg.paymentStatus === "approved"
                ? "Pagamento confirmado"
                : "Finalize sua inscrição"}
            </h2>
            <p>
              Faça o Pix para o recebedor indicado e envie o comprovante para
              análise.
            </p>
            {reg.registrationStatus !== "cancelled" && (
              <div className="pix-recipient">
                <small>RECEBEDOR</small>
                <strong>
                  {caravan?.pixReceiver || "Configuração pendente"}
                </strong>
                <small>CHAVE PIX</small>
                <div className="pix-key">
                  {caravan?.pixKey ||
                    "A organização ainda não configurou a chave Pix."}
                </div>
                <button
                  type="button"
                  className="button button-outline copy-button"
                  onClick={copyPix}
                >
                  <Copy size={15} />
                  {copied ? "Copiado!" : "Copiar chave"}
                </button>
              </div>
            )}
            {reg.registrationStatus !== "cancelled" && (
              <div className="amount-row">
                <span>Valor exato</span>
                <strong>{money(reg.amountCents)}</strong>
              </div>
            )}
            {reg.paymentStatus !== "approved" &&
              reg.registrationStatus !== "cancelled" && (
                <label
                  className={`button button-primary upload-button ${busy ? "is-disabled" : ""}`}
                >
                  {busy
                    ? "Enviando comprovante…"
                    : reg.paymentStatus === "awaiting_review"
                      ? "Enviar outro comprovante"
                      : "Escolher comprovante"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    disabled={busy}
                    onChange={(e) => sendFile(e.target.files?.[0])}
                  />
                </label>
              )}
            {reg.registrationStatus !== "cancelled" && (
              <small className="upload-help">JPG, PNG ou PDF · até 8 MB</small>
            )}
            {reg.registrationStatus === "cancelled" ? (
              <Notice>
                Esta inscrição foi cancelada. Fale com a organização se precisar
                de ajuda.
              </Notice>
            ) : (
              <p className="payment-disclaimer">
                Enviar o comprovante não significa aprovação automática.
              </p>
            )}
            {message && (
              <div className="success-message">
                <CheckCircle2 size={17} />
                {message}
              </div>
            )}
            {error && <div className="error-message">{error}</div>}
          </section>
        </div>
        {!!caravan?.announcements.length && (
          <section className="portal-announcements">
            <div className="eyebrow eyebrow-dark">AVISOS DA EQUIPE</div>
            {caravan.announcements.map((announcement, index) => (
              <div
                className="announcement"
                key={`${announcement.title}-${index}`}
              >
                <span className="announce-icon">
                  <Sparkles />
                </span>
                <div>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.body}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      nav("/admin");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Topbar admin />
      <main className="login-page">
        <div className="login-art">
          <Brand light />
          <div className="login-art-copy">
            <Sparkles />
            <h2>
              Organização leve.
              <br />
              Viagens inesquecíveis.
            </h2>
            <p>Seu espaço para cuidar de cada detalhe da caravana.</p>
          </div>
          <span>CARAVANA 77 · PAINEL DA EQUIPE</span>
        </div>
        <section className="login-main">
          <div className="login-box">
            <div className="eyebrow eyebrow-dark">BEM-VINDO DE VOLTA</div>
            <h1>
              Acesse sua
              <br />
              área da equipe.
            </h1>
            <p>Entre com seu e-mail e senha cadastrados pela organização.</p>
            {!firebaseConfigured && (
              <div className="error-message">
                Configure as variáveis do Firebase para habilitar o acesso.
              </div>
            )}
            <form onSubmit={submit}>
              <Field label="E-mail" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@equipe.com"
                />
              </Field>
              <Field label="Senha" required>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                />
              </Field>
              {error && <div className="error-message">{error}</div>}
              <button
                className="button button-primary button-large"
                disabled={busy || !firebaseConfigured}
              >
                {busy ? "Entrando…" : "Entrar no painel"}
                <ArrowRight size={17} />
              </button>
            </form>
            <p className="login-safe">
              <LockKeyhole size={14} /> Acesso restrito a membros autorizados.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function AdminGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(
    () =>
      watchAuth(async (u) => {
        setUser(u);
        if (u) setOrg(await getAdminOrganization(u.uid).catch(() => null));
        else setOrg(null);
        setLoading(false);
      }),
    [],
  );
  if (loading) return <Loading text="Verificando acesso…" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!org)
    return (
      <>
        <Topbar admin />
        <main className="center-page">
          <div className="empty-box">
            <LockKeyhole />
            <h1>Conta ainda não autorizada</h1>
            <p>
              Peça à pessoa responsável para vincular seu usuário à organização
              no Firebase.
            </p>
            <button className="button button-outline" onClick={() => logout()}>
              Sair da conta
            </button>
          </div>
        </main>
      </>
    );
  return (
    <AdminShell user={user} orgId={org}>
      {children}
    </AdminShell>
  );
}
function AdminShell({
  user,
  orgId,
  children,
}: {
  user: User;
  orgId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  async function exit() {
    await logout();
    nav("/admin/login");
  }
  return (
    <OrganizationContext.Provider value={orgId}>
      <div className="admin-app">
        <header className="admin-top">
          <button
            className="mobile-menu admin-menu-button"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <Menu />
          </button>
          <Brand light />
          <div className="admin-top-right">
            <span className="admin-identity">{user.email}</span>
            <button className="icon-button" onClick={exit} aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <aside className={`admin-sidebar ${open ? "sidebar-open" : ""}`}>
          <span className="sidebar-label">ESPAÇO DA ORGANIZAÇÃO</span>
          <Link to="/admin">
            <span>▦</span> Visão geral
          </Link>
          <Link to="/admin/caravanas">
            <span>◫</span> Caravanas
          </Link>
          <Link to="/admin/comprovantes">
            <span>▤</span> Comprovantes
          </Link>
          <Link to="/admin/check-in">
            <span>✓</span> Check-in
          </Link>
          <div className="sidebar-bottom">
            <ShieldCheck size={16} /> Dados protegidos por organização
          </div>
        </aside>
        <main className="admin-content" data-org={orgId}>
          {children}
        </main>
      </div>
    </OrganizationContext.Provider>
  );
}

function AdminDashboard() {
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [selected, setSelected] = useState("");
  const orgId = useContext(OrganizationContext);
  useEffect(() => {
    if (!orgId) return;
    return watchAdminCaravans(
      orgId,
      (list) => {
        setCaravans(list);
        if (list[0]) setSelected((current) => current || list[0].id);
      },
      (e) => console.error(e),
    );
  }, [orgId]);
  useEffect(() => {
    if (!orgId || !selected) return;
    return watchRegistrations(orgId, selected, setRegs, (e) =>
      console.error(e),
    );
  }, [orgId, selected]);
  const caravan = caravans.find((c) => c.id === selected);
  const confirmed = regs.filter(
    (r) => r.registrationStatus === "confirmed",
  ).length;
  const pendingPay = regs.filter((r) => r.paymentStatus === "pending").length;
  const review = regs.filter(
    (r) => r.paymentStatus === "awaiting_review",
  ).length;
  const boarded = regs.filter((r) => Boolean(r.checkedInAt)).length;
  const stats = [
    {
      label: "Vagas totais",
      value: caravan?.capacity ?? 0,
      icon: <Users />,
      tone: "purple",
    },
    { label: "Inscritos", value: regs.length, icon: <Ticket />, tone: "blue" },
    {
      label: "Confirmados",
      value: confirmed,
      icon: <BadgeCheck />,
      tone: "green",
    },
    {
      label: "Aguardando pagamento",
      value: pendingPay,
      icon: <Clock3 />,
      tone: "amber",
    },
    {
      label: "Aguardando análise",
      value: review,
      icon: <FileCheck2 />,
      tone: "orange",
    },
    { label: "Embarcados", value: boarded, icon: <Bus />, tone: "purple" },
    {
      label: "Vagas restantes",
      value: Math.max(
        0,
        (caravan?.capacity || 0) - (caravan?.reservedSeats || 0),
      ),
      icon: <Sparkles />,
      tone: "blue",
    },
  ];
  return (
    <>
      <div className="admin-title-row">
        <div>
          <div className="eyebrow eyebrow-dark">PAINEL DA ORGANIZAÇÃO</div>
          <h1>Visão geral</h1>
          <p>Um panorama claro para a próxima viagem.</p>
        </div>
        <Link to="/admin/caravanas" className="button button-primary">
          <span>＋</span> Nova caravana
        </Link>
      </div>
      {caravans.length > 0 && (
        <label className="admin-selector">
          Caravana{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {caravans.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {caravans.length === 0 ? (
        <div className="empty-box admin-empty">
          <Bus />
          <h2>Sua primeira caravana começa aqui</h2>
          <p>
            Cadastre datas, vagas, embarques e instruções de pagamento para
            abrir as inscrições.
          </p>
          <Link to="/admin/caravanas" className="button button-primary">
            Criar caravana <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <span className={`stat-icon ${s.tone}`}>{s.icon}</span>
                <small>{s.label}</small>
                <strong>{s.value}</strong>
                {s.label === "Vagas restantes" && (
                  <span className="stat-hint">
                    de {caravan?.capacity || 0} lugares
                  </span>
                )}
              </div>
            ))}
          </div>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <h2>Inscrições recentes</h2>
                <p>{caravan?.name}</p>
              </div>
              <Link to={`/admin/caravanas/${selected}/passageiros`}>
                Ver passageiros <ArrowRight size={14} />
              </Link>
            </div>
            {regs.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>PASSAGEIRO</th>
                      <th>EMBARQUE</th>
                      <th>PAGAMENTO</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regs
                      .slice()
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 7)
                      .map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.passengerName}</strong>
                            <small>{r.phone}</small>
                          </td>
                          <td>{r.boardingPointName}</td>
                          <td>{money(r.amountCents)}</td>
                          <td>
                            <span className={`pill pill-${r.paymentStatus}`}>
                              {r.paymentStatus === "awaiting_review"
                                ? "Em análise"
                                : r.paymentStatus === "approved"
                                  ? "Aprovado"
                                  : r.paymentStatus === "rejected"
                                    ? "Recusado"
                                    : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="table-empty">
                As novas inscrições aparecerão aqui.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}

function AdminCaravans() {
  const [list, setList] = useState<Caravan[]>([]);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const orgId = useContext(OrganizationContext);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("85");
  const [capacity, setCapacity] = useState("50");
  const [key, setKey] = useState("");
  const [receiver, setReceiver] = useState("");
  const [event, setEvent] = useState("");
  const [description, setDescription] = useState("");
  const [departureTime, setDepartureTime] = useState("06:00");
  const [returnTime, setReturnTime] = useState("21:30");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pointsText, setPointsText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [rulesText, setRulesText] = useState("");
  const [faqsText, setFaqsText] = useState("");
  const [announcementsText, setAnnouncementsText] = useState("");
  useEffect(() => {
    if (!orgId) return;
    return watchAdminCaravans(orgId, setList, (e) => setError(errorMessage(e)));
  }, [orgId]);
  function openNew() {
    setEditingId("");
    setName("");
    setSlug("");
    setDate("");
    setCity("");
    setPrice("85");
    setCapacity("50");
    setKey("");
    setReceiver("");
    setEvent("");
    setDescription(
      "Uma viagem organizada para curtir o evento com tranquilidade e boa companhia.",
    );
    setDepartureTime("06:00");
    setReturnTime("21:30");
    setAddress("");
    setWhatsapp("");
    setPointsText("Terminal Tietê | Av. Cruzeiro do Sul, 1800 | 06:00");
    setBenefitsText("Transporte de ida e volta\nEquipe acompanhando a viagem");
    setRulesText("Chegue 15 minutos antes do embarque.");
    setFaqsText("");
    setAnnouncementsText("");
    setShow(true);
  }
  function openEdit(c: Caravan) {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDate(c.date);
    setCity(c.destination || c.city);
    setPrice((c.priceCents / 100).toFixed(2));
    setCapacity(String(c.capacity));
    setKey(c.pixKey);
    setReceiver(c.pixReceiver);
    setEvent(c.event);
    setDescription(c.description);
    setDepartureTime(c.departureTime);
    setReturnTime(c.returnTime);
    setAddress(c.address);
    setWhatsapp(c.whatsapp);
    setPointsText(
      c.boardingPoints
        .map((p) => `${p.name} | ${p.address} | ${p.time}`)
        .join("\n"),
    );
    setBenefitsText(c.benefits.join("\n"));
    setRulesText(c.rules.join("\n"));
    setFaqsText(c.faqs.map((f) => `${f.question} | ${f.answer}`).join("\n"));
    setAnnouncementsText(
      c.announcements.map((a) => `${a.title} | ${a.body}`).join("\n"),
    );
    setShow(true);
  }
  async function duplicate(c: Caravan) {
    try {
      await createCaravan(orgId, {
        name: `${c.name} (cópia)`,
        slug: `${c.slug}-copia`,
        event: c.event,
        description: c.description,
        date: c.date,
        departureTime: c.departureTime,
        returnTime: c.returnTime,
        city: c.city,
        destination: c.destination,
        address: c.address,
        priceCents: c.priceCents,
        capacity: c.capacity,
        pixKey: c.pixKey,
        pixReceiver: c.pixReceiver,
        whatsapp: c.whatsapp,
        status: "draft",
        boardingPoints: c.boardingPoints,
        benefits: c.benefits,
        rules: c.rules,
        faqs: c.faqs,
        announcements: [],
      });
      setError(
        "Cópia criada como rascunho. Revise os dados antes de publicar.",
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function archive(c: Caravan) {
    if (
      !window.confirm(
        `Arquivar “${c.name}”? Novas inscrições serão interrompidas.`,
      )
    )
      return;
    try {
      await updateCaravan(c.id, { status: "archived" });
      setError("Caravana arquivada.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function togglePublish(c: Caravan) {
    try {
      await updateCaravan(c.id, {
        status: c.status === "published" ? "draft" : "published",
      });
      setError(
        c.status === "published"
          ? "Inscrições pausadas."
          : "Caravana publicada.",
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parseLines = (value: string) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const boardingRows = parseLines(pointsText).map((line) =>
      line.split("|").map((part) => part.trim()),
    );
    const faqRows = parseLines(faqsText).map((line) =>
      line.split("|").map((part) => part.trim()),
    );
    const announcementRows = parseLines(announcementsText).map((line) =>
      line.split("|").map((part) => part.trim()),
    );
    if (
      !boardingRows.length ||
      boardingRows.some(
        (row) => row.length < 3 || row.slice(0, 3).some((part) => !part),
      )
    ) {
      setError(
        "Informe ao menos um ponto no formato: Nome | endereço | HH:MM.",
      );
      return;
    }
    if (
      faqRows.some(
        (row) => row.length < 2 || row.slice(0, 2).some((part) => !part),
      )
    ) {
      setError("Revise as perguntas no formato: Pergunta | resposta.");
      return;
    }
    if (
      announcementRows.some(
        (row) => row.length < 2 || row.slice(0, 2).some((part) => !part),
      )
    ) {
      setError("Revise os avisos no formato: Título | mensagem.");
      return;
    }
    const existing = list.find((c) => c.id === editingId);
    const nextCapacity = Number(capacity);
    if (
      !Number.isInteger(nextCapacity) ||
      nextCapacity < (existing?.reservedSeats || 0)
    ) {
      setError(
        `As vagas não podem ser menores que as ${existing?.reservedSeats || 0} já reservadas.`,
      );
      return;
    }
    setBusy(true);
    try {
      const norm =
        slug ||
        name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      const payload = {
        name,
        slug: norm,
        event: event || name,
        description,
        date,
        departureTime,
        returnTime,
        city,
        destination: city,
        address: address || city,
        priceCents: Math.round(Number(price) * 100),
        capacity: Number(capacity),
        pixKey: key,
        pixReceiver: receiver,
        whatsapp,
        status: existing?.status || ("published" as const),
        boardingPoints: boardingRows.map(
          ([pointName, pointAddress, time], index) => ({
            id: existing?.boardingPoints[index]?.id || `ponto-${index + 1}`,
            name: pointName,
            address: pointAddress,
            time,
          }),
        ),
        benefits: parseLines(benefitsText),
        rules: parseLines(rulesText),
        faqs: faqRows.map(([question, answer]) => ({ question, answer })),
        announcements: announcementRows.map(([title, body]) => ({
          title,
          body,
        })),
      };
      if (editingId) await updateCaravan(editingId, payload);
      else await createCaravan(orgId, payload);
      setShow(false);
      setEditingId("");
      setName("");
      setSlug("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-title-row">
        <div>
          <div className="eyebrow eyebrow-dark">GESTÃO DE VIAGENS</div>
          <h1>Caravanas</h1>
          <p>Crie e gerencie as próximas experiências.</p>
        </div>
        <button className="button button-primary" onClick={openNew}>
          ＋ Nova caravana
        </button>
      </div>
      {error && (
        <div className="error-message">
          {error}
          <button
            className="dismiss-error"
            onClick={() => setError("")}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
      {list.length ? (
        <div className="caravan-admin-grid">
          {list.map((c) => (
            <article className="caravan-admin-card" key={c.id}>
              <div className="mini-cover">
                <Bus />
                <span>{c.status === "published" ? "PUBLICADA" : c.status}</span>
              </div>
              <div className="caravan-admin-body">
                <small>{c.event}</small>
                <h2>{c.name}</h2>
                <div className="summary-line">
                  <CalendarDays />
                  {c.date}
                </div>
                <div className="summary-line">
                  <Users />
                  {c.reservedSeats} de {c.capacity} vagas reservadas
                </div>
                <div className="admin-card-footer">
                  <strong>{money(c.priceCents)}</strong>
                  <Link
                    to={`/admin/caravanas/${c.id}/passageiros`}
                    className="button button-outline"
                  >
                    Passageiros <ArrowRight size={15} />
                  </Link>
                  <Link
                    to={`/admin/check-in/${c.id}`}
                    className="button button-primary"
                  >
                    Check-in
                  </Link>
                </div>
                <div className="caravan-tools">
                  <button onClick={() => openEdit(c)}>Editar</button>
                  <button onClick={() => duplicate(c)}>Duplicar</button>
                  <button onClick={() => togglePublish(c)}>
                    {c.status === "published" ? "Pausar" : "Publicar"}
                  </button>
                  <button onClick={() => archive(c)}>Arquivar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-box admin-empty">
          <Bus />
          <h2>Nenhuma caravana cadastrada</h2>
          <p>Cadastre a viagem para começar a receber inscrições.</p>
          <button className="button button-primary" onClick={openNew}>
            Criar primeira caravana
          </button>
        </div>
      )}
      {show && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShow(false);
          }}
        >
          <section className="modal">
            <button
              className="modal-close"
              onClick={() => setShow(false)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <div className="eyebrow eyebrow-dark">
              {editingId ? "EDITAR VIAGEM" : "NOVA VIAGEM"}
            </div>
            <h2>
              {editingId ? "Atualize os detalhes" : "Vamos planejar"}
              <br />
              essa caravana.
            </h2>
            <form onSubmit={submit}>
              <div className="field-grid">
                <Field label="Nome da caravana" required full>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Caravana Anime Friends 2026"
                  />
                </Field>
                <Field label="Slug (link)">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="anime-friends-2026"
                  />
                </Field>
                <Field label="Data" required>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field label="Cidade / destino" required>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo - SP"
                  />
                </Field>
                <Field label="Evento">
                  <input
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    placeholder="Anime Friends"
                  />
                </Field>
                <Field label="Endereço de destino">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Distrito Anhembi"
                  />
                </Field>
                <Field label="Saída">
                  <input
                    type="time"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </Field>
                <Field label="Retorno">
                  <input
                    type="time"
                    required
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                  />
                </Field>
                <Field label="Preço (R$)" required>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field label="Vagas" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </Field>
                <Field label="Recebedor Pix" required>
                  <input
                    required
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="Nome do recebedor"
                  />
                </Field>
                <Field label="Chave Pix" required full>
                  <input
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Chave fornecida pela organização"
                  />
                </Field>
                <Field label="WhatsApp de contato">
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="5511999999999"
                  />
                </Field>
                <Field label="Descrição" full>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <Field label="Pontos de embarque" full>
                  <textarea
                    rows={4}
                    required
                    value={pointsText}
                    onChange={(e) => setPointsText(e.target.value)}
                    placeholder="Nome | endereço | HH:MM"
                  />
                  <small>
                    Um por linha: Nome | endereço | horário. Ex.: Terminal Tietê
                    | Av. Cruzeiro do Sul, 1800 | 06:00
                  </small>
                </Field>
                <Field label="O que está incluso" full>
                  <textarea
                    rows={3}
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                    placeholder="Um benefício por linha"
                  />
                </Field>
                <Field label="Regras da viagem" full>
                  <textarea
                    rows={3}
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    placeholder="Uma regra por linha"
                  />
                </Field>
                <Field label="Perguntas frequentes" full>
                  <textarea
                    rows={4}
                    value={faqsText}
                    onChange={(e) => setFaqsText(e.target.value)}
                    placeholder="Pergunta | resposta (uma por linha)"
                  />
                  <small>Separe cada pergunta e resposta com |.</small>
                </Field>
                <Field label="Avisos aos passageiros" full>
                  <textarea
                    rows={4}
                    value={announcementsText}
                    onChange={(e) => setAnnouncementsText(e.target.value)}
                    placeholder="Título | mensagem (um aviso por linha)"
                  />
                  <small>
                    Os avisos aparecem na área privada de quem se inscreveu.
                  </small>
                </Field>
              </div>
              {error && <div className="error-message">{error}</div>}
              <button
                className="button button-primary button-large"
                disabled={busy}
              >
                {busy
                  ? "Salvando…"
                  : editingId
                    ? "Salvar alterações"
                    : "Criar e publicar"}
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function Passengers({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { id: routeId } = useParams();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [selected, setSelected] = useState(routeId || "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(pendingOnly ? "awaiting_review" : "all");
  const [notice, setNotice] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofBusy, setProofBusy] = useState("");
  const org = useContext(OrganizationContext);
  useEffect(() => {
    if (!org) return;
    return watchAdminCaravans(
      org,
      (list) => {
        setCaravans(list);
        if (!selected && list[0]) setSelected(list[0].id);
      },
      () => {},
    );
  }, [org, selected]);
  useEffect(() => {
    if (!org || !selected) return;
    return watchRegistrations(org, selected, setRegs, () => {});
  }, [org, selected]);
  const filtered = useMemo(
    () =>
      regs.filter(
        (r) =>
          (filter === "all" ||
            r.paymentStatus === filter ||
            (filter === "confirmed" && r.registrationStatus === "confirmed") ||
            (filter === "boarded" && !!r.checkedInAt)) &&
          `${r.passengerName} ${r.phone} ${r.id}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [regs, filter, search],
  );
  async function approve(r: Registration, ok: boolean) {
    const reason = ok
      ? ""
      : window.prompt(
          "Motivo da recusa: Comprovante ilegível, Pagamento não localizado, Valor incorreto ou Outro",
          "Comprovante ilegível",
        ) || "";
    if (!ok && !reason) return;
    try {
      await reviewPayment(r, ok, reason);
      setNotice(
        ok
          ? "Pagamento aprovado e inscrição confirmada."
          : "Pagamento recusado.",
      );
      setTimeout(() => setNotice(""), 2800);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  async function boarding(r: Registration) {
    if (
      r.checkedInAt &&
      !window.confirm(`Desfazer o check-in de ${r.passengerName}?`)
    )
      return;
    try {
      await toggleCheckin(r, !r.checkedInAt);
      setNotice(
        r.checkedInAt
          ? "Check-in desfeito."
          : "Passageiro marcado como embarcado.",
      );
      setTimeout(() => setNotice(""), 2200);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  async function cancel(r: Registration) {
    if (
      !window.confirm(
        `Cancelar a inscrição de ${r.passengerName} e liberar a vaga?`,
      )
    )
      return;
    try {
      await cancelRegistration(r);
      setNotice("Inscrição cancelada e vaga liberada.");
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  async function showProof(r: Registration) {
    if (!r.proofPath) return;
    setProofBusy(r.id);
    try {
      const blob = await loadProof(r);
      setProofUrl(URL.createObjectURL(blob));
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setProofBusy("");
    }
  }
  const title = pendingOnly ? "Comprovantes" : "Passageiros";
  return (
    <>
      <div className="admin-title-row">
        <div>
          <div className="eyebrow eyebrow-dark">OPERAÇÃO DA VIAGEM</div>
          <h1>{title}</h1>
          <p>
            {pendingOnly
              ? "Revise os pagamentos enviados pelos passageiros."
              : "Acompanhe inscrições e embarques em tempo real."}
          </p>
        </div>
        <Link to="/admin/caravanas" className="button button-outline">
          Ver caravanas <ArrowRight size={15} />
        </Link>
      </div>
      {caravans.length > 1 && (
        <label className="admin-selector">
          Caravana{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {caravans.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="passenger-toolbar">
        <label className="search-input">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou código"
          />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos os passageiros</option>
          <option value="awaiting_review">Aguardando análise</option>
          <option value="confirmed">Confirmados</option>
          <option value="pending">Aguardando pagamento</option>
          <option value="rejected">Recusados</option>
          <option value="boarded">Embarcados</option>
        </select>
      </div>
      {notice && (
        <div className="success-message">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {filtered.length} passageiro{filtered.length === 1 ? "" : "s"}
            </h2>
            <p>{caravans.find((c) => c.id === selected)?.name}</p>
          </div>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PASSAGEIRO</th>
                  <th>CONTATO</th>
                  <th>EMBARQUE</th>
                  <th>STATUS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.passengerName}</strong>
                      <small>{r.id.slice(0, 10).toUpperCase()}</small>
                    </td>
                    <td>
                      {r.phone}
                      <small>{r.email}</small>
                    </td>
                    <td>{r.boardingPointName}</td>
                    <td>
                      <span className={`pill pill-${r.paymentStatus}`}>
                        {r.paymentStatus === "awaiting_review"
                          ? "Em análise"
                          : r.paymentStatus === "approved"
                            ? "Aprovado"
                            : r.paymentStatus === "rejected"
                              ? "Recusado"
                              : "Pendente"}
                      </span>
                      {r.checkedInAt && (
                        <span className="pill pill-approved">Embarcou</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {r.proofPath && (
                          <button
                            className="button button-tiny button-outline"
                            disabled={proofBusy === r.id}
                            onClick={() => showProof(r)}
                          >
                            {proofBusy === r.id ? "Abrindo…" : "Comprovante"}
                          </button>
                        )}
                        {r.paymentStatus === "awaiting_review" && (
                          <>
                            <button
                              className="button button-tiny button-green"
                              onClick={() => approve(r, true)}
                            >
                              Aprovar
                            </button>
                            <button
                              className="button button-tiny button-red"
                              onClick={() => approve(r, false)}
                            >
                              Recusar
                            </button>
                          </>
                        )}
                        {r.paymentStatus === "approved" && (
                          <button
                            className={`button button-tiny ${r.checkedInAt ? "button-outline" : "button-green"}`}
                            onClick={() => boarding(r)}
                          >
                            {r.checkedInAt ? "Desfazer" : "Embarcou"}
                          </button>
                        )}
                        {r.registrationStatus !== "cancelled" && (
                          <button
                            className="button button-tiny button-red"
                            onClick={() => cancel(r)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty">
            {regs.length
              ? "Nenhum passageiro corresponde à busca."
              : "As inscrições aparecerão aqui quando alguém reservar uma vaga."}
          </div>
        )}
      </section>
      {proofUrl && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              URL.revokeObjectURL(proofUrl);
              setProofUrl("");
            }
          }}
        >
          <section className="modal proof-modal">
            <button
              className="modal-close"
              onClick={() => {
                URL.revokeObjectURL(proofUrl);
                setProofUrl("");
              }}
              aria-label="Fechar"
            >
              <X />
            </button>
            <h2>Comprovante enviado</h2>
            <iframe title="Comprovante privado" src={proofUrl} />
          </section>
        </div>
      )}
    </>
  );
}

function Checkin() {
  const { id = "" } = useParams();
  return <PassengersCheckin caravanId={id} />;
}
function PassengersCheckin({ caravanId }: { caravanId: string }) {
  const org = useContext(OrganizationContext);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [stop, setStop] = useState("all");
  const [busy, setBusy] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (!org) return;
    return watchAdminCaravans(
      org,
      (list) => {
        setCaravans(list);
        if (!caravanId && list[0])
          nav(`/admin/check-in/${list[0].id}`, { replace: true });
      },
      () => {},
    );
  }, [org, caravanId, nav]);
  useEffect(() => {
    if (!org || !caravanId) return;
    return watchRegistrations(org, caravanId, setRegs, () => {});
  }, [org, caravanId]);
  const confirmed = regs.filter((r) => r.registrationStatus === "confirmed");
  const boarded = confirmed.filter((r) => r.checkedInAt).length;
  const c = caravans.find((x) => x.id === caravanId);
  const visible = confirmed
    .filter(
      (r) =>
        (stop === "all" || r.boardingPointId === stop) &&
        `${r.passengerName} ${r.phone} ${r.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.passengerName.localeCompare(b.passengerName));
  async function flip(r: Registration) {
    if (
      r.checkedInAt &&
      !window.confirm(`Desfazer o check-in de ${r.passengerName}?`)
    )
      return;
    setBusy(r.id);
    try {
      await toggleCheckin(r, !r.checkedInAt);
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="admin-title-row checkin-title">
        <div>
          <div className="eyebrow eyebrow-dark">DIA DA VIAGEM</div>
          <h1>Check-in / Embarque</h1>
          <p>{c?.name || "Escolha uma caravana para iniciar."}</p>
        </div>
        {caravans.length > 1 && (
          <select
            value={caravanId}
            onChange={(e) => nav(`/admin/check-in/${e.target.value}`)}
          >
            {caravans.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="checkin-banner">
        <div className="checkin-meter">
          <div className="meter-circle">
            {confirmed.length
              ? Math.round((boarded / confirmed.length) * 100)
              : 0}
            <small>%</small>
          </div>
          <div>
            <strong>
              {boarded} <span>/ {confirmed.length}</span>
            </strong>
            <p>passageiros embarcaram</p>
          </div>
        </div>
        <div className="checkin-remaining">
          <Users />
          <div>
            <strong>{Math.max(0, confirmed.length - boarded)}</strong>
            <span>restantes</span>
          </div>
        </div>
      </div>
      <div className="passenger-toolbar checkin-tools">
        <label className="search-input">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, telefone ou código"
          />
        </label>
        <select value={stop} onChange={(e) => setStop(e.target.value)}>
          <option value="all">Todos os pontos</option>
          {[
            ...new Map(
              confirmed.map((r) => [r.boardingPointId, r.boardingPointName]),
            ).entries(),
          ].map(([pid, pname]) => (
            <option key={pid} value={pid}>
              {pname}
            </option>
          ))}
        </select>
      </div>
      <div className="checkin-list">
        {visible.map((r) => (
          <article
            className={`checkin-person ${r.checkedInAt ? "checked-in" : ""}`}
            key={r.id}
          >
            <span className="avatar">
              {r.passengerName
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="person-copy">
              <strong>{r.passengerName}</strong>
              <span>
                {r.id.slice(0, 8).toUpperCase()} · {r.boardingPointName}
              </span>
            </div>
            <button
              disabled={busy === r.id}
              className={`button ${r.checkedInAt ? "button-uncheck" : "button-board"}`}
              onClick={() => flip(r)}
            >
              {busy === r.id ? (
                "…"
              ) : r.checkedInAt ? (
                <>
                  <Check size={17} /> Embarcou
                </>
              ) : (
                <>
                  <Bus size={17} /> Embarcar
                </>
              )}
            </button>
          </article>
        ))}
        {visible.length === 0 && (
          <div className="empty-box">
            <Users />
            <p>Nenhum passageiro confirmado para este ponto.</p>
          </div>
        )}
      </div>
    </>
  );
}

function NotFound() {
  return (
    <>
      <Topbar />
      <main className="center-page">
        <div className="empty-box">
          <CircleHelp />
          <h1>Esta página não existe</h1>
          <Link className="button button-primary" to="/">
            Voltar ao início
          </Link>
        </div>
      </main>
    </>
  );
}
export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicIndex
            topbar={<Topbar />}
            footer={<Footer />}
            loadingView={<Loading />}
          />
        }
      />
      <Route path="/caravana/:slug" element={<PublicLanding />} />
      <Route path="/caravana/:slug/inscricao" element={<RegistrationPage />} />
      <Route path="/minha-inscricao/:id" element={<MyRegistration />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/caravanas"
        element={
          <AdminGuard>
            <AdminCaravans />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/caravanas/:id/passageiros"
        element={
          <AdminGuard>
            <Passengers />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/comprovantes"
        element={
          <AdminGuard>
            <Passengers pendingOnly />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/check-in"
        element={
          <AdminGuard>
            <Checkin />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/check-in/:id"
        element={
          <AdminGuard>
            <Checkin />
          </AdminGuard>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
