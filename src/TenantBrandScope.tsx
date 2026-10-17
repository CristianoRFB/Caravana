import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { TenantBrandContext, useTenantBrand } from "./lib/tenant-brand-context";
import { resolveTenantSlug, watchTenantBranding } from "./lib/tenant-branding-data";
import type { TenantBranding } from "./lib/tenant-branding";

export function TenantBrandScope({ organizationId, tenantSlug = "", children }: { organizationId: string; tenantSlug?: string; children: ReactNode }) {
  const parent = useTenantBrand();
  const [state, setState] = useState<{ org: string; ready: boolean; branding: TenantBranding | null; error: string }>({ org: organizationId, ready: false, branding: null, error: "" });
  useEffect(() => {
    if (!organizationId || parent.organizationId === organizationId) return;
    return watchTenantBranding(organizationId, (branding) => setState({ org: organizationId, ready: true, branding, error: "" }), () => setState({ org: organizationId, ready: true, branding: null, error: "Não foi possível carregar a identidade desta organização." }));
  }, [organizationId, parent.organizationId]);
  useEffect(() => {
    if (parent.organizationId === organizationId || state.org !== organizationId || !state.branding) return;
    const title = document.title;
    document.title = `${state.branding.publicName} | Caravana 77`;
    const favicon = document.createElement("link"); favicon.rel = "icon"; favicon.dataset.tenantBrand = organizationId;
    if (state.branding.logo.startsWith("data:image/")) { favicon.href = state.branding.logo; document.head.append(favicon); }
    return () => { document.title = title; favicon.remove(); };
  }, [organizationId, parent.organizationId, state.org, state.branding]);
  if (parent.organizationId === organizationId) return <>{children}</>;
  if (state.org !== organizationId || !state.ready) return <div className="loading" role="status">Carregando organização…</div>;
  if (state.error || (tenantSlug && state.branding?.slug !== tenantSlug)) return <div className="empty-box" role="alert">{state.error || "Endereço público não disponível."}</div>;
  return <TenantBrandContext.Provider value={{ organizationId, tenantSlug: tenantSlug || state.branding?.slug || "", branding: state.branding }}>
    <div className={`tenant-surface${state.branding ? " tenant-custom-brand" : ""}`} style={{ "--tenant-primary": state.branding?.primaryColor } as CSSProperties}>{children}</div>
  </TenantBrandContext.Provider>;
}
export function TenantRoute({ children }: { children: ReactNode }) {
  const { tenantSlug = "" } = useParams();
  const [resolved, setResolved] = useState<{ slug: string; organizationId: string | null; error: string } | null>(null);
  useEffect(() => {
    let active = true;
    resolveTenantSlug(tenantSlug).then((organizationId) => { if (active) setResolved({ slug: tenantSlug, organizationId, error: "" }); })
      .catch(() => { if (active) setResolved({ slug: tenantSlug, organizationId: null, error: "Não foi possível carregar o endereço público. Tente novamente." }); });
    return () => { active = false; };
  }, [tenantSlug]);
  if (!resolved || resolved.slug !== tenantSlug) return <div className="loading" role="status">Carregando organização…</div>;
  if (!resolved.organizationId) return <main className="center-page"><div className="empty-box"><h1>Organização não encontrada</h1><p>{resolved.error || "Confira o endereço com a equipe organizadora."}</p><Link to="/">Voltar ao início</Link></div></main>;
  return <TenantBrandScope key={`${tenantSlug}:${resolved.organizationId}`} organizationId={resolved.organizationId} tenantSlug={tenantSlug}>{children}</TenantBrandScope>;
}
