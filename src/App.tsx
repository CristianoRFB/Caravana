import TenantImportNotice from "./TenantImportNotice";
import { privateHistoryScope, privateHistoryRouteAllowed, scopePrivateHistoryAccess } from "./lib/private-history-release";
import { usePublicAvailability } from "./lib/use-public-availability";
import TenantBrandSettings from "./TenantBrandSettings";
import TenantCommercial from "./TenantCommercial";
import SafetyDiagnostics, { AppErrorBoundary } from "./SafetyDiagnostics";
import { installDiagnosticHandlers, setDiagnosticScope } from "./lib/diagnostics";
import { TenantBrandScope, TenantRoute } from "./TenantBrandScope";
import { useTenantBrand } from "./lib/tenant-brand-context";
import { tenantCaravanPath, tenantHomePath } from "./lib/tenant-branding";
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
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
  Download,
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
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  cancelRegistration,
  createCaravan,
  findCaravan,
  getCaravanById,
  getOwnProfile,
  loadProof,
  login,
  logout,
  reserveSeat,
  reviewPayment,
  setPortalAccessRevoked,
  toggleCheckin,
  updateCaravan,
  updateAuthorizationStatus,
  updatePassengerDetails,
  uploadProof,
  watchAdminCaravans,
  watchAuth,
  watchRegistration,
  watchRegistrations,
} from "./lib/data";
import {
  ageOnDate,
  dateLabel,
  money,
  type AuthorizationStatus,
  type Caravan,
  type Registration,
} from "./lib/types";
import {
  parseLegacyRegistrationCsv,
  samePassenger,
  type LegacyRegistrationDraft,
} from "./lib/legacy-import";
import { firebaseConfigured } from "./lib/firebase";
import type { User } from "firebase/auth";
import { watchTenantAccess, type TenantAccess } from "./lib/tenant-access";
import type { TenantRole } from "./lib/memberships";
import { observePendingWrites, pendingWrites } from "./lib/pending-writes";
import PublicIndex from "./PublicIndex";
import FinancePage from "./Finance";
import PlatformPage from "./Platform";
import { SupportOwner } from "./Support";
import OperationalHistory from "./OperationalHistory";
import ImportHistory from "./ImportHistory";
import MinorAuthorization from "./MinorAuthorization";
import DocumentSettings from "./DocumentSettings";
import { loadMinorAuthorization } from "./lib/documents";
import { importFailureMessage, importLegacyRegistrationsDetailed, type ImportReport } from "./lib/import-operations";
import { chooseTenant, tenantPreferenceKey } from "./lib/tenant-preference";
import { PROOF_POLICY } from "./lib/proof-policy";
import { completeReservationAttempt, getReservationAttempt, readReservationAttempt, ReservationAttemptConflict } from "./lib/reservation-attempt";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Algo deu errado. Tente novamente.";
const paymentStatusLabel = (status: Registration["paymentStatus"]) =>
  status === "awaiting_review"
    ? "Em análise"
    : status === "approved"
      ? "Aprovado"
      : status === "rejected"
        ? "Recusado"
        : status === "reported"
          ? "Pix informado · sem conciliação"
          : "Pendente";
const moneyOrUnknown = (amount?: number) =>
  Number.isSafeInteger(amount) && (amount || 0) > 0
    ? money(amount!)
    : "Não informado";
const authorizationLabels: Record<AuthorizationStatus, string> = {
  unknown: "Não verificada",
  not_required: "Não se aplica",
  not_sent: "Não enviada",
  pending: "Pendente",
  received: "Recebida",
  approved: "Aprovada",
};
const isAuthorizationPending = (registration: Registration) =>
  Boolean(
    registration.registrationStatus !== "cancelled" &&
      (registration.authorizationStatus === "unknown" ||
        (registration.isMinor &&
          !["received", "approved"].includes(
            registration.authorizationStatus || "not_sent",
          ))),
  );
const TeamManagement = lazy(() => import("./TeamManagement"));
const InvitationInbox = lazy(() => import("./InvitationInbox"));
const CommercialLanding = lazy(() => import("./CommercialLanding"));
const OperationalTools = lazy(() => import("./OperationalTools"));
const paymentProcessCopy =
  "Este site não cobra nem recebe pagamentos. A AnimeSFest informará a forma, o destinatário e o prazo por um canal oficial fora da plataforma. Não pague antes de receber essas orientações. Depois, envie o comprovante pela página da inscrição; a equipe fará a conferência manual.";
const resolveFaqAnswer = (
  answer: string,
  caravan: Caravan,
  availableSeats: number | null,
  question: string,
  organizationName = caravan.organizerName || "AnimeSFest",
) => {
  const processCopy = paymentProcessCopy.replaceAll("AnimeSFest", organizationName);
  const resolved = answer
    .replaceAll("{{availableSeats}}", availableSeats === null ? "disponibilidade a confirmar" : String(availableSeats))
    .replaceAll("{{price}}", money(caravan.priceCents))
    .replaceAll("{{date}}", dateLabel(caravan.date))
    .replaceAll("{{departureTime}}", caravan.departureTime)
    .replaceAll("{{returnTime}}", caravan.returnTime)
    .replaceAll(
      "{{paymentMethod}}",
      caravan.paymentMethod || `fora do site, conforme as orientações de ${organizationName}`,
    )
    .replaceAll(
      "{{paymentDeadline}}",
      caravan.paymentDeadline
        ? dateLabel(caravan.paymentDeadline)
        : `${organizationName} ainda não informou o prazo; aguarde antes de pagar`,
    )
    .replaceAll(
      "{{paymentInstructions}}",
      caravan.paymentInstructions || processCopy,
    );
  const normalizedQuestion = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return !caravan.paymentInstructions &&
    /(pagar|pagamento|comprovante|garanto minha vaga)/.test(normalizedQuestion) &&
    !/não cobra nem recebe pagamentos/i.test(resolved)
    ? `${resolved} ${processCopy}`
    : resolved;
};
const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const validTime = (value: string) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const validCpf = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return true;
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const checkDigit = (length: number) => {
    const sum = Array.from(digits.slice(0, length)).reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
};
const OrganizationContext = createContext("");
const TenantRoleContext = createContext<TenantRole>("staff");
const HistoricalImportContext = createContext(false);

function Brand({ light = false }: { light?: boolean }) {
  const tenant = useTenantBrand();
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} to={tenant.tenantSlug ? tenantHomePath(tenant.tenantSlug) : "/"}>
      <span className="brand-mark">
        {tenant.branding?.logo ? <BrandLogo key={tenant.branding.logo} src={tenant.branding.logo} name={tenant.branding.publicName} /> : <Bus size={17} />}
      </span>
      <span>{tenant.branding?.publicName || <>caravana<span className="brand-number">77</span></>}</span>
    </Link>
  );
}
function BrandLogo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <Bus size={17} /> : <img src={src} alt={name} onError={() => setFailed(true)} referrerPolicy="no-referrer" />;
}
function Topbar({ admin = false }: { admin?: boolean }) {
  const tenant = useTenantBrand();
  const [open, setOpen] = useState(false);
  const path = window.location.pathname;
  const homePath = tenant.tenantSlug ? tenantHomePath(tenant.tenantSlug) : "/";
  const home = path === homePath;
  const trip = path.includes("/caravana/") && !path.includes("/inscricao");
  const target = (anchor: string) =>
    home ? "#eventos" : trip ? `#${anchor}` : `${homePath}#eventos`;
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
              <Link to={homePath}>Site público</Link>
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
  const tenant = useTenantBrand();
  return (
    <footer className="footer">
      <Brand light />
      <span>Cultura. Viagens. Pessoas. Histórias.</span>
      <span>© 2026 {tenant.branding?.publicName || "Caravana 77"}</span>
      {tenant.branding?.website && <a href={tenant.branding.website} target="_blank" rel="noopener noreferrer">Site oficial</a>}
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
  const tenant = useTenantBrand();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const availability = usePublicAvailability(caravan);
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
    findCaravan(slug, tenant.organizationId || undefined)
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
  }, [slug, tenant.organizationId]);
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
  const free = availability.availableSeats;
  return (
    <TenantBrandScope organizationId={caravan.organizationId}>
      <Topbar />
      <main>
        <section className="hero">
          <div className="hero-orbit orbit-a" />
          <div className="hero-orbit orbit-b" />
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={15} /> {tenant.branding?.publicName || caravan.organizerName || "CARAVANA 77"}
              </div>
              <h1>
                {caravan.name.split(" ").slice(0, 2).join(" ")}
                <br />
                <span>
                  {caravan.name.split(" ").slice(2).join(" ") || caravan.event}
                </span>
              </h1>
              <p>{caravan.description}</p>
              <p className="hero-route">
                {caravan.boardingPoints[0]?.name || "Origem a confirmar"} → {caravan.city}
              </p>
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
                to={`${tenantCaravanPath(caravan.slug, tenant.tenantSlug)}/inscricao`}
                className="button button-primary button-large"
              >
                {availability.canReserve ? "Garantir minha vaga" : "Consultar disponibilidade"} <ArrowRight size={18} />
              </Link>
              <div className="hero-safe">
                <ShieldCheck size={15} /> {caravan.benefits.slice(0, 3).join(" · ") || "Confira os benefícios informados pela organização"}
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
              detail={`Saída ${caravan.departureTime} · retorno ${caravan.returnTime}`}
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
              detail={caravan.benefits.slice(0, 3).join(" · ") || "Confira os benefícios da viagem"}
            />
            <Fact
              icon={<Users />}
              label="VAGAS"
              value={availability.label}
              detail={availability.capacityLimit === null ? "Consulte a organização" : `de ${availability.capacityLimit} lugares disponíveis para reserva`}
            />
            <Link
              to={`${tenantCaravanPath(caravan.slug, tenant.tenantSlug)}/inscricao`}
              className="button button-primary fact-cta"
            >
              {availability.canReserve ? "Garantir minha vaga" : "Consultar disponibilidade"} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="payment-process-section" aria-label="Como funciona o pagamento">
          <PaymentProcessNotice />
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
                {point.address && <p>{point.address}</p>}
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
            <div className="trip-return">
              <Clock3 size={16} />
              Saída do evento para retorno às <strong>{caravan.returnTime}</strong>
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
            {caravan.whatsapp.replace(/\D/g, "") && (
              <a
                className="button button-outline team-contact"
                href={`https://wa.me/${caravan.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a equipe <ArrowRight size={15} />
              </a>
            )}
            <span className="side-note">CULTURA CONECTA PESSOAS.</span>
          </div>
        </section>
        {caravan.rules.length > 0 && (
          <section className="content-section trip-rules-section">
            <div className="eyebrow eyebrow-dark">COMBINADOS DA VIAGEM</div>
            <h2>Antes de embarcar</h2>
            <ul className="trip-rules-list">
              {caravan.rules.map((rule, index) => (
                <li key={`${rule}-${index}`}>
                  <CheckCircle2 size={18} />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
                  <p>{resolveFaqAnswer(faq.answer, caravan, free, faq.question, tenant.branding?.publicName || caravan.organizerName || "AnimeSFest")}</p>
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
            to={`${tenantCaravanPath(caravan.slug, tenant.tenantSlug)}/inscricao`}
            className="button button-light"
          >
            {availability.canReserve ? "Quero minha vaga" : "Consultar disponibilidade"} <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </TenantBrandScope>
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

function PaymentProcessNotice({ compact = false }: { compact?: boolean }) {
  const tenant = useTenantBrand();
  const name = tenant.branding?.publicName || "AnimeSFest";
  return (
    <aside
      className={`payment-process-notice${compact ? " payment-process-notice-compact" : ""}`}
      role="note"
      aria-label="Pagamento fora do site"
    >
      <span className="payment-process-icon">
        <WalletCards size={21} />
      </span>
      <div>
        <strong>Pagamento feito fora do site</strong>
        <p>
          {compact
            ? `O site não cobra nem recebe pagamentos. ${name} informará a forma, o destinatário e o prazo por um canal oficial. Pague somente depois de receber essas orientações; depois, envie seu comprovante aqui. A equipe confere manualmente e confirma a inscrição.`
            : paymentProcessCopy.replaceAll("AnimeSFest", name)}
        </p>
        {tenant.branding?.operationalMessage && <p>{tenant.branding.operationalMessage}</p>}
        {tenant.branding?.whatsapp && <p><a href={`https://wa.me/${tenant.branding.whatsapp}`} target="_blank" rel="noopener noreferrer">Pedir orientações à organização</a></p>}
        {tenant.branding?.contactEmail && <p><a href={`mailto:${tenant.branding.contactEmail}`}>Contato oficial por e-mail</a></p>}
        {compact && (
          <small>
            Comprovante aceito: PDF, JPG ou PNG até {PROOF_POLICY.displayLimit}. Ainda sem orientação? Fale com {name} antes de pagar.
          </small>
        )}
      </div>
    </aside>
  );
}

function RegistrationPage() {
  const { slug = "" } = useParams();
  const tenant = useTenantBrand();
  const nav = useNavigate();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [form, setForm] = useState({
    passengerName: "",
    cpf: "",
    birthDate: "",
    guardianName: "",
    guardianPhone: "",
    phone: "",
    email: "",
    city: "",
    boardingPointId: "",
    boardingPointName: "",
    emergencyContact: "",
    notes: "",
  });
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCaravan(null);
    setError("");
    const timer = setTimeout(() => {
      if (active) {
        setError("O catálogo demorou para responder. Tente novamente.");
        setLoading(false);
      }
    }, 10000);
    findCaravan(slug, tenant.organizationId || undefined)
      .then((value) => {
        if (active) {
          setCaravan(value);
          try { setRetryAvailable(Boolean(value && readReservationAttempt(value.id, window.sessionStorage))); }
          catch (cause) { setSubmissionError(errorMessage(cause)); }
        }
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
  }, [slug, tenant.organizationId]);
  const availability = usePublicAvailability(caravan);
  const age = ageOnDate(form.birthDate, caravan?.date || "");
  const isMinor = Boolean(
    caravan?.requiresMinorAuthorization && age !== null && age < 18,
  );
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
    const cpfDigits = form.cpf.replace(/\D/g, "");
    if (cpfDigits && !validCpf(cpfDigits)) {
      setSubmissionError(
        "Confira o CPF ou deixe o campo em branco.",
      );
      return;
    }
    if (caravan.requiresMinorAuthorization && age === null) {
      setSubmissionError("Informe uma data de nascimento válida para esta viagem.");
      return;
    }
    if (isMinor && (!form.guardianName.trim() || !form.guardianPhone.trim())) {
      setSubmissionError("Para passageiro menor, informe nome e telefone do responsável.");
      return;
    }
    setSubmissionError(""); setResumeId("");
    setBusy(true);
    try {
      const storage = window.sessionStorage;
      const attempt = getReservationAttempt(caravan.id, storage);
      setRetryAvailable(true);
      const id = await reserveSeat(caravan, form, attempt);
      completeReservationAttempt(caravan.id, attempt, storage);
      nav(`${tenant.tenantSlug ? tenantHomePath(tenant.tenantSlug) : ""}/minha-inscricao/${id}`);
    } catch (err) {
      setSubmissionError(errorMessage(err));
      if (err instanceof ReservationAttemptConflict) setResumeId(err.registrationId);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <>
        <Topbar />
        <Loading />
      </>
    );
  if (error || !caravan)
    return (
      <>
        <Topbar />
        <main className="center-page">
          <div className="empty-box">
            <CircleHelp />
            <h1>
              {error
                ? "Não foi possível carregar esta inscrição"
                : "Caravana não encontrada"}
            </h1>
            <p>
              {error || "Confira o link ou fale com a equipe organizadora."}
            </p>
            <Link className="button button-primary" to="/">
              Voltar ao início
            </Link>
          </div>
        </main>
      </>
    );
  return (
    <TenantBrandScope organizationId={caravan.organizationId}>
      <Topbar />
      <main className="form-page">
        <Link className="back-link" to={tenantCaravanPath(slug, tenant.tenantSlug)}>
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
            <PaymentProcessNotice compact />
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
                <Field label="CPF (opcional)">
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    value={form.cpf}
                    onChange={(e) =>
                      change(
                        "cpf",
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11)
                          .replace(/(\d{3})(\d)/, "$1.$2")
                          .replace(/(\d{3})(\d)/, "$1.$2")
                          .replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
                      )
                    }
                    placeholder="000.000.000-00"
                  />
                </Field>
                <Field
                  label={`Data de nascimento${caravan.requiresMinorAuthorization ? "" : " (opcional)"}`}
                  required={Boolean(caravan.requiresMinorAuthorization)}
                >
                  <input
                    type="date"
                    autoComplete="bday"
                    required={Boolean(caravan.requiresMinorAuthorization)}
                    max={caravan.date}
                    value={form.birthDate}
                    onChange={(e) => change("birthDate", e.target.value)}
                  />
                </Field>
                {isMinor && (
                  <>
                    <Field label="Nome do responsável" required>
                      <input
                        required
                        autoComplete="name"
                        value={form.guardianName}
                        onChange={(e) => change("guardianName", e.target.value)}
                        placeholder="Nome completo"
                      />
                    </Field>
                    <Field label="Telefone do responsável" required>
                      <input
                        required
                        autoComplete="tel"
                        type="tel"
                        value={form.guardianPhone}
                        onChange={(e) => change("guardianPhone", e.target.value)}
                        placeholder="(17) 99999-9999"
                      />
                    </Field>
                    <Notice>
                      Menores de idade devem apresentar autorização do responsável. As instruções serão fornecidas durante a inscrição.
                    </Notice>
                  </>
                )}
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
              {submissionError && <div className="error-message" role="alert">{submissionError}{resumeId && <p><Link to={`${tenant.tenantSlug ? tenantHomePath(tenant.tenantSlug) : ""}/minha-inscricao/${resumeId}`}>Consultar inscrição existente</Link></p>}</div>}
              <p role="status">{availability.label}. A vaga é confirmada ao concluir a reserva.</p>
              <Notice>
                Seus dados são usados apenas para organizar esta viagem.
              </Notice>
              <button
                className="button button-primary button-large form-submit"
                disabled={busy || (!availability.canReserve && !retryAvailable)}
              >
                {busy
                  ? "Reservando…"
                  : !availability.canReserve
                    ? retryAvailable ? "Verificar minha reserva" : availability.label
                    : "Garantir minha vaga"}{" "}
                {!busy && availability.canReserve && (
                  <ArrowRight size={17} />
                )}
              </button>
            </form>
          </section>
          <aside className="summary-card">
            <div className="summary-art">
              <span>{tenant.branding?.publicName || caravan.organizerName || "CARAVANA 77"}</span>
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
            <div className="summary-line">
              <Clock3 />
              Retorno às {caravan.returnTime}
            </div>
            <div className="summary-price">
              <span>Total (1 passageiro)</span>
              <strong>{money(caravan.priceCents)}</strong>
            </div>
            <div className="summary-note">
              <LockKeyhole size={15} /> Pagamento fora do site · comprovante conferido manualmente
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </TenantBrandScope>
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
  const tenant = useTenantBrand();
  const [reg, setReg] = useState<Registration | null>(null);
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkError, setLinkError] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    setReg(null);
    setCaravan(null);
    setLoading(true);
    setMessage("");
    setError("");
    const unsubscribe = watchRegistration(
        id,
        async (r) => {
          const currentRevision = ++revision;
          const trip = r ? await getCaravanById(r.caravanId).catch(() => null) : null;
          if (!active || currentRevision !== revision) return;
          if (r && tenant.organizationId && r.organizationId !== tenant.organizationId) { setReg(null); setCaravan(null); setLoading(false); return; }
          setReg(r);
          setCaravan(trip);
          setLoading(false);
        },
        () => {
          revision++;
          if (!active) return;
          setReg(null);
          setCaravan(null);
          setLoading(false);
        },
      );
    return () => { active = false; revision++; unsubscribe(); };
  }, [id, tenant.organizationId]);
  async function sendFile(file?: File) {
    if (!file || !reg) return;
    setBusy(true);
    setError("");
    try {
      await uploadProof(reg, file);
      setMessage("Comprovante enviado. Aguardando análise.");
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
  async function copyPrivateLink() {
    setLinkError("");
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkError("Não foi possível copiar. Salve esta página no navegador.");
    }
  }
  if (loading || (reg !== null && reg.id !== id))
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
            <h1>Inscrição indisponível</h1>
            <p>Confira o link recebido ou procure a organização pelo canal oficial.</p>
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
    <TenantBrandScope organizationId={reg.organizationId}>
      <Topbar />
      <main className="portal-page">
        <Link className="back-link" to={tenantCaravanPath(caravan?.slug || "", tenant.tenantSlug)}>
          <ArrowLeft size={16} /> Página da caravana
        </Link>
        <div className="portal-heading">
          <span className="portal-icon">
            <Ticket />
          </span>
          <div className="portal-heading-copy">
            <div className="eyebrow eyebrow-dark">
              MINHA INSCRIÇÃO · {reg.id.slice(0, 8).toUpperCase()}
            </div>
            <h1>Oi, {reg.passengerName.split(" ")[0]}!</h1>
            <p>Aqui estão os detalhes da sua próxima viagem.</p>
          </div>
          <button
            type="button"
            className="button button-outline portal-share"
            onClick={copyPrivateLink}
          >
            <Copy size={15} />
            {linkCopied ? "Link copiado!" : "Copiar link privado"}
          </button>
        </div>
        {linkError && <div className="error-message">{linkError}</div>}
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
              {caravan && (
                <div>
                  <Clock3 />
                  <span>Retorno às {caravan.returnTime} · saída do evento</span>
                </div>
              )}
              <div>
                <WalletCards />
                <span>{moneyOrUnknown(reg.amountCents)} · {caravan?.paymentMethod || "Confirmação manual"}</span>
              </div>
            </div>
            {reg.registrationStatus === "confirmed" && (
              <Notice>
                Inscrição confirmada! Guarde esta página e chegue 15 minutos
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
            {reg.isMinor && (
              <Notice>
                Autorização do responsável: {authorizationLabels[reg.authorizationStatus || "not_sent"].toLowerCase()}.
                {reg.authorizationStatus !== "approved" && " Siga as instruções da organização antes da viagem."}
              </Notice>
            )}
          </section>
          {reg.isMinor && reg.registrationStatus !== "cancelled" && <MinorAuthorization key={reg.id} registration={reg} />}
          <section className="portal-card payment-card">
            <div className="eyebrow eyebrow-dark">
              COMPROVANTE · {caravan?.paymentMethod || "FORMA A DEFINIR"} · CONFERÊNCIA MANUAL
            </div>
            <h2>
              {reg.paymentStatus === "approved"
                ? "Comprovante aprovado"
                : "Finalize sua inscrição"}
            </h2>
            <p>
              {caravan?.paymentInstructions ||
                `${paymentProcessCopy} Envie o comprovante em PDF, PNG ou JPG, até ${PROOF_POLICY.displayLimit}.`}
            </p>
            {caravan?.paymentDeadline && (
              <div className="amount-row">
                <span>Prazo informado pela organização</span>
                <strong>{dateLabel(caravan.paymentDeadline)}</strong>
              </div>
            )}
            {reg.registrationStatus !== "cancelled" &&
              caravan?.paymentMethod?.toLowerCase().includes("pix") && (
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
                <strong>{moneyOrUnknown(reg.amountCents)}</strong>
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
                    accept={PROOF_POLICY.accept}
                    disabled={busy}
                    onChange={(e) => sendFile(e.target.files?.[0])}
                  />
                </label>
              )}
            {reg.registrationStatus !== "cancelled" && (
              <small className="upload-help">JPG, PNG ou PDF · até {PROOF_POLICY.displayLimit}</small>
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
    </TenantBrandScope>
  );
}

function AdminLogin({ passenger = false, platform = false }: { passenger?: boolean; platform?: boolean }) {
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
      nav(platform ? "/platform" : passenger ? "/conta" : "/admin");
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
            <p>{passenger ? "Acompanhe suas inscrições e os detalhes da viagem." : "Seu espaço para cuidar de cada detalhe da caravana."}</p>
          </div>
          <span>CARAVANA 77 · {platform ? "PAINEL DA PLATAFORMA" : passenger ? "ÁREA DO PASSAGEIRO" : "PAINEL DA EQUIPE"}</span>
        </div>
        <section className="login-main">
          <div className="login-box">
            <div className="eyebrow eyebrow-dark">BEM-VINDO DE VOLTA</div>
            <h1>
              Acesse sua
              <br />
              {platform ? "plataforma." : passenger ? "conta de passageiro." : "área da equipe."}
            </h1>
            <p>{passenger ? "Entre com seu e-mail e senha cadastrados." : "Entre com seu e-mail e senha cadastrados pela organização."}</p>
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
                {busy ? "Entrando…" : passenger ? "Entrar na conta" : "Entrar no painel"}
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

function PassengerAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getOwnProfile>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    const stop = watchAuth((current) => {
      const request = ++revision;
      setUser(current); setProfile(null); setError(""); setLoading(Boolean(current));
      if (!current) return;
      getOwnProfile().then((value) => { if (active && request === revision) setProfile(value); })
        .catch(() => { if (active && request === revision) setError("Não foi possível carregar seu perfil."); })
        .finally(() => { if (active && request === revision) setLoading(false); });
    });
    return () => { active = false; revision++; stop(); };
  }, []);
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/conta/entrar" replace />;
  return <><Topbar /><main className="center-page"><section className="empty-box">
    <Ticket /><h1>{profile?.displayName || "Sua conta"}</h1><p>{user.email}</p>
    {error && <p role="alert">{error}</p>}
    <p><Link to="/conta/convites">Meus convites e identificador de acesso</Link></p>
    <h2>Minhas inscrições</h2>
    {profile?.registrationIds.length ? profile.registrationIds.map((id) => <p key={id}><Link className="button button-outline" to={`/minha-inscricao/${id}`}>Abrir inscrição {id.slice(0, 8).toUpperCase()}</Link></p>) : <p>Nenhuma inscrição vinculada a esta conta.</p>}
    <button className="button button-outline" onClick={() => void logout()}>Sair da conta</button>
  </section></main><Footer /></>;
}

function AdminGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [access, setAccess] = useState<TenantAccess[]>([]);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let stopAccess: () => void = () => undefined;
    const unsubscribe = watchAuth((u) => {
      const currentRevision = ++revision;
      stopAccess();
      setUser(u);
      setOrg(null);
      setAccess([]);
      setAccessError("");
      setLoading(Boolean(u));
      if (!u) {
        setOrg(null);
        setAccessError("");
        setLoading(false);
        return;
      }
      stopAccess = watchTenantAccess(u.uid,
        (available) => {
          if (!active || currentRevision !== revision) return;
          const scoped = scopePrivateHistoryAccess(available, privateHistoryScope);
          setAccess(scoped);
          let preferred: string | null = null;
          try { preferred = window.sessionStorage.getItem(tenantPreferenceKey(u.uid)); } catch { /* optional preference */ }
          setOrg((selected) => chooseTenant(scoped, selected, preferred));
          setAccessError("");
          setLoading(false);
        },
        (e) => {
          if (!active || currentRevision !== revision) return;
          setOrg(null);
          setAccess([]);
          setAccessError(
            `Não foi possível verificar o acesso: ${errorMessage(e)}`,
          );
          setLoading(false);
        });
    });
    return () => {
      active = false;
      revision++;
      unsubscribe();
      stopAccess();
    };
  }, []);
  if (loading) return <Loading text="Verificando acesso…" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!org)
    return (
      <>
        <Topbar admin />
        <main className="center-page">
          <div className="empty-box">
            <LockKeyhole />
            <h1>{accessError ? "Atualização necessária" : "Conta ainda não autorizada"}</h1>
            <p>
              {accessError || (privateHistoryScope
                ? "Entre com a conta responsável já autorizada para consultar o histórico do Ítalo. Não é necessário criar outra conta."
                : "Peça um convite à pessoa responsável pela sua organização e aceite-o na área da sua conta.")}
            </p>
            {!privateHistoryScope && <p><Link className="button button-outline" to="/conta/convites">Meus convites</Link></p>}
            {accessError ? (
              <button
                className="button button-outline"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </button>
            ) : (
              <button className="button button-outline" onClick={() => logout()}>
                Sair da conta
              </button>
            )}
          </div>
        </main>
      </>
    );
  return (
    <AdminShell key={`${user.uid}:${org}:${access.find((item) => item.organizationId === org)?.role}`} user={user} orgId={org} access={access} onSelect={(id) => {
      if (!access.some((item) => item.organizationId === id)) return;
      try { window.sessionStorage.setItem(tenantPreferenceKey(user.uid), id); } catch { /* permission never depends on storage */ }
      setOrg(id);
    }}>
      {children}
    </AdminShell>
  );
}
function AdminShell({
  user,
  orgId,
  children,
  access,
  onSelect,
}: {
  user: User;
  orgId: string;
  children: ReactNode;
  access: TenantAccess[];
  onSelect: (organizationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pendingCount = useSyncExternalStore(observePendingWrites, pendingWrites, () => 0);
  useEffect(() => { setDiagnosticScope(`${user.uid}:${orgId}`); return () => setDiagnosticScope("public"); }, [user.uid, orgId]);
  const [importPending, setImportPending] = useState(false);
  const nav = useNavigate();
  async function exit() {
    await logout();
    nav("/admin/login");
  }
  return (
    <OrganizationContext.Provider value={orgId}>
      <TenantRoleContext.Provider value={access.find((item) => item.organizationId === orgId)?.role || "staff"}>
      <TenantBrandScope key={orgId} organizationId={orgId}>
      <div className="admin-app">
        <header className="admin-top">
          <button
            className="mobile-menu admin-menu-button"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="admin-navigation"
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
        <aside id="admin-navigation" className={`admin-sidebar ${open ? "sidebar-open" : ""}`} onClick={event => { if (event.target instanceof Element && event.target.closest("a")) setOpen(false); }}>
          <span className="sidebar-label">ESPAÇO DA ORGANIZAÇÃO</span>
          {access.length > 1 && (
            <label className="tenant-switcher">
              <span>Organização</span>
              <select aria-label="Organização ativa" value={orgId} disabled={pendingCount > 0} onChange={(event) => {
                if (pendingWrites() > 0) return;
                const next = event.target.value;
                if (!access.some((item) => item.organizationId === next)) return;
                onSelect(next);
                nav("/admin");
              }}>
                {access.map((item) => <option key={item.organizationId} value={item.organizationId}>{item.organizationId}</option>)}
              </select>
              {pendingCount > 0 && <small role="status">Aguarde a operação concluir para trocar de organização.</small>}
            </label>
          )}
          <Link to="/admin">
            <span>▦</span> Visão geral
          </Link>
          <Link to="/admin/caravanas">
            <span>◫</span> Caravanas
          </Link>
          <Link to="/admin/financeiro">
            <span><WalletCards size={17} /></span> Financeiro
          </Link>
          <Link to="/admin/comprovantes">
            <span>▤</span> Comprovantes
          </Link>
          <Link to="/admin/check-in">
            <span>✓</span> Check-in
          </Link>
          {!privateHistoryScope && <><Link to="/admin/suporte"><span>?</span> Suporte</Link>
          <Link to="/admin/identidade"><span>◈</span> Identidade pública</Link>
          <Link to="/admin/documentos"><span>▤</span> Documentos e prazos</Link>
          <Link to="/admin/plano"><span>◇</span> Plano e limites</Link>
          <Link to="/admin/equipe"><span>♧</span> Equipe e convites</Link></>}
          <Link to="/admin/relatorios"><span aria-hidden="true">▥</span> Relatórios</Link>
          <Link to="/admin/roteiros"><span aria-hidden="true">☷</span> Roteiros da equipe</Link>
          <Link to="/admin/diagnostico"><span aria-hidden="true">?</span> Diagnóstico local</Link>
          <div className="sidebar-bottom">
            <ShieldCheck size={16} /> Dados protegidos por organização
          </div>
        </aside>
        <main className="admin-content" data-org={orgId}>
          <TenantImportNotice organizationId={orgId} onPending={setImportPending} />
          <HistoricalImportContext.Provider value={Boolean(privateHistoryScope) || importPending}>
          {children}
          </HistoricalImportContext.Provider>
        </main>
      </div>
      </TenantBrandScope>
      </TenantRoleContext.Provider>
    </OrganizationContext.Provider>
  );
}

function AdminDashboard() {
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const orgId = useContext(OrganizationContext);
  useEffect(() => {
    if (!orgId) return;
    return watchAdminCaravans(
      orgId,
      (list) => {
        setError("");
        setCaravans(list);
        if (list[0]) setSelected((current) => current || list[0].id);
      },
      (e) => setError(errorMessage(e)),
    );
  }, [orgId]);
  useEffect(() => {
    if (!orgId || !selected) return;
    return watchRegistrations(
      orgId,
      selected,
      (items) => {
        setError("");
        setRegs(items);
      },
      (e) => setError(errorMessage(e)),
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
  const minorsPending = regs.filter(isAuthorizationPending).length;
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
    {
      label: "Menores sem autorização aprovada",
      value: minorsPending,
      icon: <ShieldCheck />,
      tone: minorsPending ? "orange" : "green",
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
      {error && <div className="error-message">{error}</div>}
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
                          <td>{moneyOrUnknown(r.amountCents)}</td>
                          <td>
                            <span className={`pill pill-${r.paymentStatus}`}>
                              {paymentStatusLabel(r.paymentStatus)}
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
  const readOnly = useContext(HistoricalImportContext);
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
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("85");
  const [capacity, setCapacity] = useState("50");
  const [key, setKey] = useState("");
  const [receiver, setReceiver] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [paymentDeadline, setPaymentDeadline] = useState("");
  const [requiresMinorAuthorization, setRequiresMinorAuthorization] = useState(false);
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
    setDestination("");
    setPrice("85");
    setCapacity("50");
    setKey("");
    setReceiver("");
    setOrganizerName("");
    setPaymentMethod("");
    setPaymentInstructions("");
    setPaymentDeadline("");
    setRequiresMinorAuthorization(false);
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
    setCity(c.city);
    setDestination(c.destination);
    setPrice((c.priceCents / 100).toFixed(2));
    setCapacity(String(c.capacity));
    setKey(c.pixKey);
    setReceiver(c.pixReceiver);
    setOrganizerName(c.organizerName || "");
    setPaymentMethod(c.paymentMethod || "");
    setPaymentInstructions(c.paymentInstructions || "");
    setPaymentDeadline(c.paymentDeadline || "");
    setRequiresMinorAuthorization(Boolean(c.requiresMinorAuthorization));
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
        slug: `${c.slug}-copia-${crypto.randomUUID().slice(0, 8)}`,
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
        organizerName: c.organizerName,
        paymentMethod: c.paymentMethod,
        paymentInstructions: c.paymentInstructions,
        paymentDeadline: c.paymentDeadline,
        requiresMinorAuthorization: c.requiresMinorAuthorization,
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
        (row) =>
          row.length < 3 ||
          !row[0] ||
          !row[2] ||
          !validTime(row[2]),
      )
    ) {
      setError(
        "Informe ao menos um ponto no formato: Nome | endereço | horário válido (HH:MM).",
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
    const priceCents = Math.round(Number(price) * 100);
    const whatsappDigits = whatsapp.replace(/\D/g, "");
    if (
      !Number.isInteger(nextCapacity) ||
      nextCapacity < 1 ||
      nextCapacity < (existing?.reservedSeats || 0) ||
      nextCapacity > 1000
    ) {
      setError(
        `Informe de 1 a 1.000 vagas e mantenha pelo menos as ${existing?.reservedSeats || 0} já reservadas.`,
      );
      return;
    }
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
      setError("Informe um preço válido maior que zero.");
      return;
    }
    if (whatsappDigits && (whatsappDigits.length < 10 || whatsappDigits.length > 15)) {
      setError("Informe o WhatsApp com código do país e DDD, entre 10 e 15 números.");
      return;
    }
    const norm = slugify(slug || name);
    if (!norm) {
      setError("Informe um nome válido para gerar o link da caravana.");
      return;
    }
    if (list.some((c) => c.slug === norm && c.id !== editingId)) {
      setError("Este link já está sendo usado. Escolha outro slug.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        organizerName,
        name,
        slug: norm,
        event: event || name,
        description,
        date,
        departureTime,
        returnTime,
        city,
        destination: destination || city,
        address: address || destination || city,
        priceCents,
        capacity: nextCapacity,
        pixKey: key,
        pixReceiver: receiver,
        paymentMethod,
        paymentInstructions,
        paymentDeadline,
        requiresMinorAuthorization,
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
        <button className="button button-primary" onClick={openNew} disabled={readOnly}>
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
                    to={`/admin/caravanas/${c.id}/financeiro`}
                    className="button button-outline"
                  >
                    Financeiro <WalletCards size={15} />
                  </Link>
                  <Link
                    to={`/admin/check-in/${c.id}`}
                    className="button button-primary"
                  >
                    Check-in
                  </Link>
                </div>
                <div className="caravan-tools">
                  <button onClick={() => openEdit(c)} disabled={readOnly}>Editar</button>
                  <button onClick={() => duplicate(c)} disabled={readOnly}>Duplicar</button>
                  <button onClick={() => togglePublish(c)} disabled={readOnly}>
                    {c.status === "published" ? "Pausar" : "Publicar"}
                  </button>
                  <button onClick={() => archive(c)} disabled={readOnly}>Arquivar</button>
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
          <button className="button button-primary" onClick={openNew} disabled={readOnly}>
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
                <Field label="Organização responsável" full>
                  <input
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    placeholder="AnimeSFest"
                  />
                </Field>
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
                <Field label="Cidade de destino" required>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo - SP"
                  />
                </Field>
                <Field label="Local do evento">
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Centro Social Estoril"
                  />
                </Field>
                <Field label="Evento">
                  <input
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    placeholder="Anime Friends"
                  />
                </Field>
                <Field label="Endereço ou detalhes do local">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Endereço confirmado pela organização"
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
                    max="1000"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </Field>
                <Field label="Forma de pagamento (opcional)">
                  <input
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Preencha somente após confirmação"
                  />
                </Field>
                <Field label="Prazo de pagamento (opcional)">
                  <input
                    type="date"
                    value={paymentDeadline}
                    onChange={(e) => setPaymentDeadline(e.target.value)}
                  />
                </Field>
                <Field label="Instruções de pagamento" full>
                  <textarea
                    rows={2}
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="Informe somente as instruções confirmadas pela organização."
                  />
                </Field>
                <Field label="Recebedor Pix (opcional)">
                  <input
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="Nome do recebedor"
                  />
                </Field>
                <Field label="Chave Pix (opcional)">
                  <input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Chave fornecida pela organização"
                  />
                </Field>
                <div className="field field-full admin-check-field">
                  <span>Autorização para menores</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={requiresMinorAuthorization}
                      onChange={(e) =>
                        setRequiresMinorAuthorization(e.target.checked)
                      }
                    />
                    Exigir nascimento e acompanhar autorização do responsável
                  </label>
                </div>
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

function downloadLegacyCsvTemplate() {
  const csv =
    "\uFEFFNome;Telefone;E-mail;CPF;Tipo documento 1;Número documento 1;Tipo documento 2;Número documento 2;Pagamento informado;Cidade;Ponto de embarque;Data de nascimento;Nome do responsável;Telefone do responsável;Contato de emergência;Valor combinado;Observações\r\n";
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-lista-anterior.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Passengers({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const readOnly = useContext(HistoricalImportContext);
  const canImport = useContext(TenantRoleContext) === "tenant_owner" && !readOnly;
  const operationPending = useSyncExternalStore(observePendingWrites, pendingWrites, pendingWrites);
  const { id: routeId } = useParams();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [selected, setSelected] = useState(routeId || "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(pendingOnly ? "awaiting_review" : "all");
  const [boardingFilter, setBoardingFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofBusy, setProofBusy] = useState("");
  const [editRegistration, setEditRegistration] = useState<Registration | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [historicalArchive, setHistoricalArchive] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importCsvText, setImportCsvText] = useState("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importPreview, setImportPreview] = useState<LegacyRegistrationDraft[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importRecordCount, setImportRecordCount] = useState(0);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [registrationsReady, setRegistrationsReady] = useState(false);
  const [editForm, setEditForm] = useState({
    passengerName: "",
    phone: "",
    email: "",
    birthDate: "",
    boardingPointId: "",
    emergencyContact: "",
    guardianName: "",
    guardianPhone: "",
  });
  const org = useContext(OrganizationContext);
  const pendingImportCount = importPreview.filter((row) => !regs.some((existing) => samePassenger(existing, row))).length;
  useEffect(() => {
    if (routeId) setSelected(routeId);
  }, [routeId]);
  useEffect(() => {
    if (!org) return;
    return watchAdminCaravans(
      org,
      (list) => {
        setError("");
        setCaravans(list);
        if (!selected && list[0]) setSelected(list[0].id);
      },
      (e) => setError(errorMessage(e)),
    );
  }, [org, selected]);
  useEffect(() => {
    if (!org || !selected) return;
    setRegs([]);
    setRegistrationsReady(false);
    return watchRegistrations(
      org,
      selected,
      (items) => {
        setError("");
        setRegs(items);
        setRegistrationsReady(true);
      },
      (e) => setError(errorMessage(e)),
    );
  }, [org, selected]);
  useEffect(() => {
    setImportFileName("");
    setImportCsvText("");
    setImportPreview([]);
    setImportErrors([]);
    setImportRecordCount(0);
    setImportBatchId("");
    setHistoricalArchive(false);
    setImportReport(null);
  }, [selected]);
  const filtered = useMemo(
    () =>
      regs.filter(
        (r) =>
            (filter === "all" ||
            r.paymentStatus === filter ||
            (filter === "confirmed" && r.registrationStatus === "confirmed") ||
            (filter === "boarded" && !!r.checkedInAt) ||
            (filter === "absent" &&
              r.registrationStatus === "confirmed" &&
              !r.checkedInAt) ||
            (filter === "authorization_pending" && isAuthorizationPending(r))) &&
          (boardingFilter === "all" || r.boardingPointId === boardingFilter) &&
          `${r.passengerName} ${r.phone} ${r.id} ${(r.documentRecords || []).map((item) => item.value).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [regs, filter, boardingFilter, search],
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
    if (!r.proofId) return;
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
  async function downloadAuthorization(r: Registration) {
    try {
      const blob = await loadMinorAuthorization(r.id); const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "autorizacao-privada.pdf"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setNotice(importFailureMessage(cause)); }
  }
  async function copyRegistrationLink(registration: Registration) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/minha-inscricao/${registration.id}`,
      );
      setNotice(
        `Link privado de ${registration.passengerName} copiado. Envie-o somente a essa pessoa pelo canal oficial.`,
      );
      setTimeout(() => setNotice(""), 4200);
    } catch {
      setNotice("Não foi possível copiar o link privado neste navegador.");
      setTimeout(() => setNotice(""), 3200);
    }
  }
  async function changePortalAccess(registration: Registration) {
    const revoked = !registration.portalAccessRevoked;
    if (!window.confirm(revoked
      ? `Revogar o link privado de ${registration.passengerName}? Quem tiver esse link perderá o acesso. A inscrição e o histórico serão preservados.`
      : `Reativar o mesmo link de ${registration.passengerName}? Todas as pessoas que já possuem esse link voltarão a ter acesso.`)) return;
    try {
      await setPortalAccessRevoked(registration.id, revoked);
      setNotice(revoked ? "Link privado revogado. Inscrição preservada." : "Link privado reativado.");
    } catch (e) { setNotice(errorMessage(e)); }
  }
  function prepareImportText(source: string, fileName = "texto-colado.csv") {
    setImportFileName(fileName);
    setImportCsvText(source);
    setImportBatchId(crypto.randomUUID().replaceAll("-", ""));
    setImportPreview([]);
    setImportErrors([]);
    setImportRecordCount(0);
    if (new Blob([source]).size > 2 * 1024 * 1024) {
      setImportErrors(["O texto excede o limite de 2 MB. Divida a lista em arquivos menores."]);
      return;
    }
    const caravan = caravans.find((item) => item.id === selected);
    if (!caravan) {
      setImportErrors(["Selecione uma caravana antes de preparar a importação."]);
      return;
    }
    if (!registrationsReady) {
      setImportErrors(["Aguarde a lista atual de passageiros carregar para conferir duplicados."]);
      return;
    }
    try {
      const result = parseLegacyRegistrationCsv(
        source,
        caravan,
        regs,
        { historicalArchive },
      );
      setImportPreview(result.rows);
      setImportErrors(result.errors);
      setImportRecordCount(result.rows.length + result.errors.length);
    } catch (e) {
      setImportErrors([errorMessage(e)]);
    }
  }
  async function prepareImport(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportErrors(["Escolha um arquivo CSV. No Excel, salve a planilha como CSV UTF-8."]);
      return;
    }
    prepareImportText(await file.text(), file.name);
  }
  async function submitImport(retry = false) {
    const caravan = caravans.find((item) => item.id === selected);
    if (!caravan || !org || !importPreview.length || (importErrors.length && !retry)) return;
    const available = Math.max(0, caravan.capacity - caravan.reservedSeats);
    if (pendingImportCount > available) {
      setImportErrors([
        `Há ${available} vagas disponíveis, mas a lista contém ${importPreview.length} pessoas. Ajuste a lista ou as vagas da caravana antes de importar.`,
      ]);
      return;
    }
    const accepted = window.confirm(
      historicalArchive
        ? `Importar ${importPreview.length} passageiros para ${caravan.name}? Os documentos informados serão gravados no cadastro privado da organização, cada passageiro ocupará uma vaga e “Pix informado” ficará separado de valor e comprovante conciliados. Nenhum pagamento será processado.`
        : `Importar ${importPreview.length} passageiros para ${caravan.name}? Os dados serão gravados no Firestore da organização, cada passageiro ocupará uma vaga e ficará aguardando comprovante e conferência manual. Nenhum pagamento será processado ou aprovado pela importação.`,
    );
    if (!accepted) return;
    setImportBusy(true);
    setImportErrors([]);
    try {
      const imported = await importLegacyRegistrationsDetailed(
        caravan.id,
        org,
        importPreview,
        importBatchId,
        retry ? crypto.randomUUID().replaceAll("-", "") : importBatchId,
      );
      setImportReport(imported);
      setNotice(
        historicalArchive
          ? `${imported.imported} passageiros importados${imported.skipped ? `; ${imported.skipped} já constavam desta importação` : ""}. Pix segue como informado, sem valor nem comprovante conciliado.`
          : `${imported.imported} passageiros importados${imported.skipped ? `; ${imported.skipped} já constavam desta importação` : ""}. Aguardam comprovante e conferência manual.`,
      );
      if (imported.rejected) {
        setImportErrors([`${imported.rejected} linhas não foram confirmadas. Consulte o relatório; inscrições já aceitas estão preservadas.`]);
        return;
      }
      setImportFileName("");
      setImportCsvText("");
      setImportBatchId("");
      setImportPreview([]);
      setImportRecordCount(0);
      setShowImport(false);
    } catch (e) {
      setImportErrors([importFailureMessage(e)]);
    } finally {
      setImportBusy(false);
    }
  }
  function editPassenger(r: Registration) {
    setEditError("");
    setEditRegistration(r);
    setEditForm({
      passengerName: r.passengerName,
      phone: r.phone,
      email: r.email || "",
      birthDate: r.birthDate || "",
      boardingPointId: r.boardingPointId,
      emergencyContact: r.emergencyContact || "",
      guardianName: r.guardianName || "",
      guardianPhone: r.guardianPhone || "",
    });
  }
  async function savePassenger(e: FormEvent) {
    e.preventDefault();
    const caravan = caravans.find((item) => item.id === selected);
    if (!editRegistration || !caravan) return;
    const point = caravan.boardingPoints.find(
      (item) => item.id === editForm.boardingPointId,
    );
    if (!point) {
      setEditError("Selecione um ponto de embarque válido.");
      return;
    }
    const age = ageOnDate(editForm.birthDate, caravan.date);
    if (caravan.requiresMinorAuthorization && age === null) {
      setEditError("Informe uma data de nascimento válida para esta viagem.");
      return;
    }
    const isMinor = Boolean(
      caravan.requiresMinorAuthorization && age !== null && age < 18,
    );
    if (
      isMinor &&
      (!editForm.guardianName.trim() || !editForm.guardianPhone.trim())
    ) {
      setEditError("Para passageiro menor, informe nome e telefone do responsável.");
      return;
    }
    setEditBusy(true);
    setEditError("");
    try {
      await updatePassengerDetails(editRegistration, {
        ...editForm,
        passengerName: editForm.passengerName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        emergencyContact: editForm.emergencyContact.trim(),
        boardingPointName: point.name,
        isMinor,
        authorizationStatus: isMinor
          ? editRegistration.authorizationStatus && editRegistration.authorizationStatus !== "unknown"
            ? editRegistration.authorizationStatus
            : "not_sent"
          : "not_required",
        guardianName: isMinor ? editForm.guardianName.trim() : "",
        guardianPhone: isMinor ? editForm.guardianPhone.trim() : "",
      });
      setEditRegistration(null);
      setNotice("Dados do passageiro atualizados.");
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setEditError(errorMessage(e));
    } finally {
      setEditBusy(false);
    }
  }
  async function changeAuthorization(
    registration: Registration,
    status: AuthorizationStatus,
  ) {
    try {
      await updateAuthorizationStatus(registration, status);
      setNotice("Status da autorização atualizado.");
      setTimeout(() => setNotice(""), 2200);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  const editingCaravan = caravans.find((item) => item.id === selected);
  const editAge = ageOnDate(editForm.birthDate, editingCaravan?.date || "");
  const editMinor = Boolean(
    editingCaravan?.requiresMinorAuthorization &&
      editAge !== null &&
      editAge < 18,
  );
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
        <div className="finance-title-actions">
          {!pendingOnly && selected && (
            <Link to={`/admin/caravanas/${selected}/financeiro`} className="button button-primary">
              <WalletCards size={15} /> Financeiro
            </Link>
          )}
          <Link to="/admin/caravanas" className="button button-outline">
            Ver caravanas <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {caravans.length > 1 && (
        <label className="admin-selector">
          Caravana{" "}
          <select
            value={selected}
            disabled={operationPending > 0 || importBusy}
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
      {!pendingOnly && canImport && (
        <section className="admin-panel legacy-import-panel">
          <div className="panel-heading">
            <div>
              <h2>Lista de inscrições anteriores</h2>
              <p>Traga passageiros de uma planilha CSV para esta caravana.</p>
            </div>
            <button
              className="button button-outline"
              type="button"
              aria-expanded={showImport}
              onClick={() => setShowImport((open) => !open)}
            >
              <Upload size={15} />
              {showImport ? "Fechar importação" : "Importar lista"}
            </button>
          </div>
          {showImport && (
            <div className="legacy-import-body">
              <p>
                Baixe o modelo e importe até 400 passageiros por CSV. Para novos cadastros, nome e telefone ou e-mail são necessários para enviar o acesso privado. Em listas históricas, ative a opção abaixo para preservar documentos informados sem inferir tipo ou completar dados ausentes.
              </p>
              {editingCaravan && (
                <small className="legacy-import-note">
                  O valor atual é {money(editingCaravan.priceCents)} por pessoa. Preencha “Valor combinado” para preservar outro valor da lista antiga; não informe status de pagamento.
                </small>
              )}
              {editingCaravan?.requiresMinorAuthorization && (
                <small className="legacy-import-note">
                  {historicalArchive
                    ? "A lista histórica não informa nascimento; a importação deixa a idade sem verificar e não presume que a pessoa seja adulta."
                    : "Esta caravana exige data de nascimento. Para menores de 18 anos na data da viagem, inclua também nome e telefone do responsável."}
                </small>
              )}
              <label className="legacy-import-history-toggle">
                <input
                  type="checkbox"
                  checked={historicalArchive}
                  onChange={(event) => {
                    setHistoricalArchive(event.target.checked);
                    setImportPreview([]);
                    setImportErrors([]);
                    setImportFileName("");
                    setImportCsvText("");
                    setImportBatchId("");
                    setImportRecordCount(0);
                  }}
                />
                <span>
                  Lista histórica sem contato · preservar pagamento informado sem conciliar valor
                </span>
              </label>
              <div className="legacy-import-actions">
                <button
                  className="button button-outline"
                  type="button"
                  onClick={downloadLegacyCsvTemplate}
                >
                  <Download size={15} /> Baixar modelo CSV
                </button>
                <label className={`button button-outline legacy-file-picker${!registrationsReady || importBusy ? " is-disabled" : ""}`}>
                  <Upload size={15} /> Escolher arquivo CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={!registrationsReady || importBusy}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void prepareImport(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              <label className="field field-full legacy-import-paste">
                <span>Cole linhas CSV aqui</span>
                <textarea
                  rows={5}
                  value={importCsvText}
                  onChange={(event) => {
                    setImportCsvText(event.target.value);
                    setImportFileName("texto-colado.csv");
                    setImportPreview([]);
                    setImportErrors([]);
                    setImportBatchId("");
                    setImportRecordCount(0);
                  }}
                  placeholder="Cabeçalho e linhas separados por ponto e vírgula ou vírgula"
                  spellCheck={false}
                />
                <small>O texto é validado nesta página; só será gravado no Firestore ao selecionar “Importar”.</small>
                <button
                  className="button button-outline"
                  type="button"
                  disabled={!registrationsReady || importBusy || !importCsvText.trim()}
                  onClick={() => prepareImportText(importCsvText)}
                >
                  Validar texto colado
                </button>
              </label>
              {!registrationsReady && (
                <small className="legacy-import-note">Carregando a lista atual para evitar duplicados…</small>
              )}
              {importFileName && <small className="legacy-import-note">Arquivo: {importFileName}</small>}
              {importRecordCount > 0 && (
                <div className="legacy-import-summary">
                  <strong>{importPreview.length} válidos</strong>
                  <span>{Math.max(0, importRecordCount - importPreview.length)} com problemas</span>
                  <span>{importPreview.length} vagas serão ocupadas</span>
                </div>
              )}
              <div className="legacy-import-note legacy-import-policy">
                {historicalArchive
                  ? "A lista pode ficar sem telefone, e-mail, embarque ou valor quando esses dados não foram informados. Pix declarado fica identificado como não conciliado; nenhum valor ou comprovante é criado."
                  : "A importação não registra pagamentos nem aprova ninguém. Todas as inscrições ficam aguardando comprovante e conferência manual. Cada inscrição ocupa uma vaga."}
              </div>
              {importPreview.length > 0 && (
                <div className="legacy-import-preview-wrap">
                  <table className="legacy-import-preview">
                    <thead>
                      <tr>
                        <th>PASSAGEIRO</th>
                        <th>{historicalArchive ? "DOCUMENTO" : "TELEFONE"}</th>
                        <th>EMBARQUE</th>
                        <th>VALOR</th>
                        <th>SITUAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 8).map((row) => (
                        <tr key={`${row.line}-${row.passengerName}`}>
                          <td>{row.passengerName}</td>
                          <td>{historicalArchive
                            ? row.documentRecords?.map((document) => `${document.label}: ${document.value}`).join(" · ") || "Não informado"
                            : row.phone || "Não informado"}</td>
                          <td>{row.boardingPointName}</td>
                          <td>{row.amountCents ? money(row.amountCents) : "Não informado"}</td>
                          <td>{row.paymentStatus === "reported" ? "Pix informado · sem conciliação" : "Aguardando comprovante"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 8 && (
                    <small>Prévia de 8 passageiros; serão importados todos os {importPreview.length} válidos.</small>
                  )}
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="legacy-import-errors" role="alert">
                  <strong>Corrija os problemas no CSV e selecione o arquivo novamente:</strong>
                  <ul>
                    {importErrors.slice(0, 12).map((message) => <li key={message}>{message}</li>)}
                  </ul>
                  {importErrors.length > 12 && <small>Mais {importErrors.length - 12} registros precisam de correção.</small>}
                </div>
              )}
              {editingCaravan && pendingImportCount > editingCaravan.capacity - editingCaravan.reservedSeats && (
                <div className="error-message">
                  Esta lista precisa de {importPreview.length} vagas, mas há apenas {Math.max(0, editingCaravan.capacity - editingCaravan.reservedSeats)} disponíveis.
                </div>
              )}
              {importPreview.length > 0 && !importErrors.length && (
                <div className="legacy-import-submit">
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={importBusy || !registrationsReady || Boolean(editingCaravan && pendingImportCount > editingCaravan.capacity - editingCaravan.reservedSeats)}
                    onClick={() => void submitImport()}
                  >
                    {importBusy ? "Importando…" : `Importar ${importPreview.length} passageiros`}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {!pendingOnly && canImport && selected && <ImportHistory key={`${org}/${selected}`} organizationId={org} caravanId={selected} />}
      {importReport && <section className="admin-panel platform-section import-report"><h2>Relatório do envio</h2><p>{importReport.imported} importados · {importReport.skipped} já cadastrados · {importReport.rejected} não confirmados</p><details><summary>Ver resultado de cada linha</summary><ul>{importReport.rowResults.map((row) => <li key={row.line} style={{ overflowWrap: "anywhere" }}>Linha {row.line} · {row.status === "imported" ? "Importada" : row.status === "skipped" ? "Ignorada" : "Não confirmada"}: {importFailureMessage(row.reason)}</li>)}</ul></details>{importReport.rejected > 0 && <button className="button button-outline" disabled={importBusy} onClick={() => void submitImport(true)}>Repetir linhas não confirmadas</button>}</section>}
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
          <option value="reported">Pix informado · sem conciliação</option>
          <option value="rejected">Recusados</option>
          <option value="authorization_pending">Menores sem autorização aprovada</option>
          <option value="boarded">Embarcados</option>
          <option value="absent">Faltantes</option>
        </select>
        <select
          value={boardingFilter}
          onChange={(e) => setBoardingFilter(e.target.value)}
          aria-label="Filtrar por ponto de embarque"
        >
          <option value="all">Todos os pontos</option>
          {caravans
            .find((c) => c.id === selected)
            ?.boardingPoints.map((point) => (
              <option value={point.id} key={point.id}>
                {point.name}
              </option>
            ))}
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
                  <th>AUTORIZAÇÃO DO RESPONSÁVEL</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.passengerName}</strong>
                      <small>{r.id.slice(0, 10).toUpperCase()}</small>
                      {r.importedFromLegacy && (
                        <small>Lista anterior · importada</small>
                      )}
                      {r.documentRecords?.map((document, index) => (
                        <small key={`${r.id}-doc-${index}`}>
                          {document.label}: {document.value}
                        </small>
                      ))}
                      {r.birthDate && (
                        <small>
                          Nascimento: {r.birthDate}{r.isMinor ? " · menor na data da viagem" : ""}
                        </small>
                      )}
                    </td>
                    <td>
                      {r.phone || "Não informado"}
                      <small>{r.email || ""}</small>
                    </td>
                    <td>{r.boardingPointName}</td>
                    <td>
                      <span className={`pill pill-${r.paymentStatus}`}>
                        {paymentStatusLabel(r.paymentStatus)}
                      </span>
                      {r.checkedInAt && (
                        <span className="pill pill-approved">Embarcou</span>
                      )}
                    </td>
                    <td>
                      {r.authorizationStatus === "unknown" ? (
                        <div className="authorization-cell">
                          <strong>Idade não verificada</strong>
                          <small>Confirme se a autorização se aplica</small>
                        </div>
                      ) : r.isMinor ? (
                        <div className="authorization-cell">
                          <strong>{r.guardianName || "Responsável não informado"}</strong>
                          <small>{r.guardianPhone}</small>
                          <select
                            aria-label={`Autorização de ${r.passengerName}`}
                            disabled={readOnly}
                            value={r.authorizationStatus || "not_sent"}
                            onChange={(e) =>
                              changeAuthorization(
                                r,
                                e.target.value as AuthorizationStatus,
                              )
                            }
                          >
                            <option value="not_sent">Não enviada</option>
                            <option value="pending">Pendente</option>
                            <option value="received">Recebida</option>
                            <option value="approved">Aprovada</option>
                          </select>
                          <small>Conferência manual do PDF ou documento apresentado em papel.</small>
                          {r.authorizationId && <button className="button button-tiny button-outline" onClick={() => void downloadAuthorization(r)}>Baixar autorização</button>}
                        </div>
                      ) : (
                        <span>Não se aplica</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="button button-tiny button-outline"
                          onClick={() => editPassenger(r)}
                          disabled={readOnly}
                        >
                          Editar
                        </button>
                        {r.proofId && (
                          <button
                            className="button button-tiny button-outline"
                            disabled={proofBusy === r.id}
                            onClick={() => showProof(r)}
                          >
                            {proofBusy === r.id ? "Abrindo…" : "Comprovante"}
                          </button>
                        )}
                        {r.importedFromLegacy && (r.phone || r.email) && (
                          <button
                            className="button button-tiny button-outline"
                            onClick={() => void copyRegistrationLink(r)}
                            disabled={readOnly}
                          >
                            <Copy size={13} /> Link privado
                          </button>
                        )}
                        <button
                          className="button button-tiny button-outline"
                          onClick={() => void changePortalAccess(r)}
                          disabled={readOnly}
                        >
                          {r.portalAccessRevoked ? "Reativar link" : "Revogar link"}
                        </button>
                        {r.paymentStatus === "awaiting_review" && (
                          <>
                            <button
                              className="button button-tiny button-green"
                              onClick={() => approve(r, true)}
                              disabled={readOnly}
                            >
                              Aprovar
                            </button>
                            <button
                              className="button button-tiny button-red"
                              onClick={() => approve(r, false)}
                              disabled={readOnly}
                            >
                              Recusar
                            </button>
                          </>
                        )}
                        {r.registrationStatus === "confirmed" && (
                          <button
                            className={`button button-tiny ${r.checkedInAt ? "button-outline" : "button-green"}`}
                            onClick={() => boarding(r)}
                            disabled={readOnly}
                          >
                            {r.checkedInAt ? "Desfazer" : "Embarcou"}
                          </button>
                        )}
                        {r.registrationStatus !== "cancelled" && (
                          <button
                            className="button button-tiny button-red"
                            onClick={() => cancel(r)}
                            disabled={readOnly}
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
      {editRegistration && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditRegistration(null);
          }}
        >
          <section className="modal">
            <button
              className="modal-close"
              type="button"
              onClick={() => setEditRegistration(null)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <div className="eyebrow eyebrow-dark">DADOS DO PASSAGEIRO</div>
            <h2>Editar inscrição</h2>
            <form onSubmit={savePassenger}>
              <div className="field-grid">
                <Field label="Nome completo" required full>
                  <input
                    required
                    value={editForm.passengerName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, passengerName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Telefone / WhatsApp" required>
                  <input
                    required
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label={`Data de nascimento${editingCaravan?.requiresMinorAuthorization ? "" : " (opcional)"}`}
                  required={Boolean(editingCaravan?.requiresMinorAuthorization)}
                >
                  <input
                    type="date"
                    max={editingCaravan?.date}
                    required={Boolean(editingCaravan?.requiresMinorAuthorization)}
                    value={editForm.birthDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birthDate: e.target.value })
                    }
                  />
                </Field>
                <Field label="Ponto de embarque" required full>
                  <select
                    required
                    value={editForm.boardingPointId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, boardingPointId: e.target.value })
                    }
                  >
                    {editingCaravan?.boardingPoints.map((point) => (
                      <option value={point.id} key={point.id}>
                        {point.name} · {point.time}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Contato de emergência" required full>
                  <input
                    required
                    value={editForm.emergencyContact}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergencyContact: e.target.value })
                    }
                  />
                </Field>
                {editMinor && (
                  <>
                    <Field label="Nome do responsável" required>
                      <input
                        required
                        value={editForm.guardianName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, guardianName: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Telefone do responsável" required>
                      <input
                        required
                        type="tel"
                        value={editForm.guardianPhone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, guardianPhone: e.target.value })
                        }
                      />
                    </Field>
                  </>
                )}
              </div>
              {editError && <div className="error-message">{editError}</div>}
              <button
                className="button button-primary button-large"
                disabled={editBusy}
              >
                {editBusy ? "Salvando…" : "Salvar dados"}
              </button>
            </form>
          </section>
        </div>
      )}
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
  const readOnly = useContext(HistoricalImportContext);
  const org = useContext(OrganizationContext);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stop, setStop] = useState("all");
  const [busy, setBusy] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (!org) return;
    return watchAdminCaravans(
      org,
      (list) => {
        setError("");
        setCaravans(list);
        if (!caravanId && list[0])
          nav(`/admin/check-in/${list[0].id}`, { replace: true });
      },
      (e) => setError(errorMessage(e)),
    );
  }, [org, caravanId, nav]);
  useEffect(() => {
    if (!org || !caravanId) return;
    return watchRegistrations(
      org,
      caravanId,
      (items) => {
        setError("");
        setRegs(items);
      },
      (e) => setError(errorMessage(e)),
    );
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
    setError("");
    try {
      await toggleCheckin(r, !r.checkedInAt);
    } catch (e) {
      setError(`Operação não confirmada: ${errorMessage(e)} Tente novamente ao restabelecer a conexão.`);
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
      {error && <div className="error-message" role="alert">{error}</div>}
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
              disabled={readOnly || busy === r.id}
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
      <OperationalHistory key={`${org}/${caravanId}`} organizationId={org} caravanId={caravanId} />
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

function CaravanFinance() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  const imported = useContext(HistoricalImportContext);
  return <FinancePage organizationId={organizationId} canEdit={role === "tenant_owner" && !imported} />;
}
function TenantIdentity() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  return <TenantBrandSettings organizationId={organizationId} canManage={role === "tenant_owner"} />;
}
function TenantDocuments() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  return <DocumentSettings organizationId={organizationId} canManage={role === "tenant_owner"} />;
}
function TenantPlan() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  return <TenantCommercial organizationId={organizationId} canManage={role === "tenant_owner"} />;
}
function TenantOperationalTools({ mode }: { mode: "reports" | "worklists" }) {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  const readOnly = useContext(HistoricalImportContext);
  return <Suspense fallback={<Loading />}><OperationalTools organizationId={organizationId} mode={mode} readOnly={readOnly} canManageTemplates={role === "tenant_owner"} /></Suspense>;
}
function TenantTeam() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  return <Suspense fallback={<Loading />}><TeamManagement organizationId={organizationId} canManage={role === "tenant_owner"} /></Suspense>;
}
function TenantSupport() {
  const organizationId = useContext(OrganizationContext);
  const role = useContext(TenantRoleContext);
  return <SupportOwner organizationId={organizationId} canManage={role === "tenant_owner"} />;
}

export default function App() {
  useEffect(() => installDiagnosticHandlers(window), []);
  const location = useLocation();
  if (privateHistoryScope && !privateHistoryRouteAllowed(location.pathname)) return <Navigate to="/admin" replace />;
  const routes = (
    <Routes>
      <Route path="/saas" element={<Suspense fallback={<Loading />}><CommercialLanding /></Suspense>} />
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
      <Route path="/o/:tenantSlug" element={<TenantRoute><PublicIndex topbar={<Topbar />} footer={<Footer />} loadingView={<Loading />} /></TenantRoute>} />
      <Route path="/o/:tenantSlug/caravana/:slug" element={<TenantRoute><PublicLanding /></TenantRoute>} />
      <Route path="/o/:tenantSlug/caravana/:slug/inscricao" element={<TenantRoute><RegistrationPage /></TenantRoute>} />
      <Route path="/o/:tenantSlug/minha-inscricao/:id" element={<TenantRoute><MyRegistration /></TenantRoute>} />
      <Route path="/caravana/:slug" element={<PublicLanding />} />
      <Route path="/caravana/:slug/inscricao" element={<RegistrationPage />} />
      <Route path="/minha-inscricao/:id" element={<MyRegistration />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/platform/login" element={<AdminLogin platform />} />
      <Route path="/platform" element={<PlatformPage header={<Topbar admin />} />} />
      <Route path="/admin/suporte" element={<AdminGuard><TenantSupport /></AdminGuard>} />
      <Route path="/admin/identidade" element={<AdminGuard><TenantIdentity /></AdminGuard>} />
      <Route path="/admin/documentos" element={<AdminGuard><TenantDocuments /></AdminGuard>} />
      <Route path="/admin/plano" element={<AdminGuard><TenantPlan /></AdminGuard>} />
      <Route path="/admin/equipe" element={<AdminGuard><TenantTeam /></AdminGuard>} />
      <Route path="/admin/relatorios" element={<AdminGuard><TenantOperationalTools mode="reports" /></AdminGuard>} />
      <Route path="/admin/roteiros" element={<AdminGuard><TenantOperationalTools mode="worklists" /></AdminGuard>} />
      <Route path="/admin/diagnostico" element={<AdminGuard><SafetyDiagnostics /></AdminGuard>} />
      <Route path="/conta/convites" element={<Suspense fallback={<Loading />}><InvitationInbox /></Suspense>} />
      <Route path="/conta/entrar" element={<AdminLogin passenger />} />
      <Route path="/conta" element={<PassengerAccount />} />
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
        path="/admin/financeiro"
        element={
          <AdminGuard>
            <CaravanFinance />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/caravanas/:id/financeiro"
        element={
          <AdminGuard>
            <CaravanFinance />
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
  return <AppErrorBoundary>{import.meta.env.VITE_APP_ENV === "staging" ? <div className="staging-shell"><aside className="staging-notice" role="note">STAGING · Somente dados fictícios · Sem pagamentos</aside>{routes}</div> : routes}</AppErrorBoundary>;
}
