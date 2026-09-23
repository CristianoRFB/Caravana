import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  Heart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { listPublishedCaravans } from "./lib/data";
import { dateLabel, money, type Caravan } from "./lib/types";

export default function PublicIndex({
  topbar,
  footer,
  loadingView,
}: {
  topbar: ReactNode;
  footer: ReactNode;
  loadingView: ReactNode;
}) {
  const [items, setItems] = useState<Caravan[]>([]);
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
    listPublishedCaravans()
      .then((v) => {
        if (active) setItems(v);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar as caravanas.",
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  return (
    <>
      {topbar}
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={15} /> CULTURA · VIAGENS · PESSOAS
              </div>
              <h1>
                Mais que viagens,
                <br />
                <span>grandes histórias.</span>
              </h1>
              <p>
                Caravanas organizadas para você chegar junto, viver o evento e
                voltar com lembranças novas.
              </p>
              <div className="hero-tags">
                <span>
                  <Users size={13} /> Gente de verdade
                </span>
                <span>
                  <ShieldCheck size={13} /> Viagens seguras
                </span>
                <span>
                  <Heart size={13} /> A mesma paixão
                </span>
              </div>
              <a className="button button-primary button-large" href="#eventos">
                Encontrar minha próxima viagem <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-art">
              <div className="art-sun" />
              <div className="city city-back" />
              <div className="city city-front" />
              <div className="art-bus">
                <Bus size={80} />
              </div>
              <div className="art-label">
                A GENTE LEVA MAIS LONGE <span>↗</span>
              </div>
              <div className="art-spark spark-1">✦</div>
              <div className="art-spark spark-2">✧</div>
            </div>
          </div>
        </section>
        <section className="content-section index-events" id="eventos">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow-dark">
                ESCOLHA SEU PRÓXIMO DESTINO
              </div>
              <h2>
                Tem lugar pra você
                <br />
                <span>na próxima história.</span>
              </h2>
            </div>
            <p>
              Vagas e detalhes são atualizados pela organização de cada
              caravana.
            </p>
          </div>
          {loading ? (
            <>{loadingView}</>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : items.length ? (
            <div className="public-trip-grid">
              {items.map((c) => (
                <Link
                  to={`/caravana/${c.slug}`}
                  className="public-trip-card"
                  key={c.id}
                >
                  <div className="public-trip-art">
                    <span>CARAVANA 77</span>
                    <Bus />
                  </div>
                  <div className="public-trip-copy">
                    <span className="eyebrow eyebrow-dark">{c.event}</span>
                    <h3>{c.name}</h3>
                    <div className="public-trip-meta">
                      <span>
                        <CalendarDays />
                        {dateLabel(c.date)}
                      </span>
                      <span>
                        <MapPin />
                        {c.destination}
                      </span>
                    </div>
                    <div className="public-trip-bottom">
                      <strong>
                        {money(c.priceCents)} <small>/ pessoa</small>
                      </strong>
                      <span className="button button-primary">
                        Ver viagem <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-box index-empty">
              <Bus />
              <h2>Nenhuma caravana publicada por enquanto</h2>
              <p>
                Volte em breve ou consulte a organização do seu evento para
                receber o link da próxima viagem.
              </p>
              <Link className="button button-outline" to="/admin/login">
                Área da equipe <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <section className="bottom-cta">
          <div className="cta-star">✦</div>
          <div>
            <div className="eyebrow">SUA PRÓXIMA HISTÓRIA</div>
            <h2>
              O evento é o destino.
              <br />A viagem também conta.
            </h2>
          </div>
          <a href="#eventos" className="button button-light">
            Encontrar uma caravana <ArrowRight size={16} />
          </a>
        </section>
      </main>
      {footer}
    </>
  );
}
