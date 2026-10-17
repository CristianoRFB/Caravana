export const BRAND_COLORS = ["#6d4aff", "#1d4ed8", "#0f766e", "#166534", "#9f1239", "#7e22ce", "#92400e", "#334155"] as const;
export interface TenantBranding {
  organizationId: string; slug: string; publicName: string; description: string;
  primaryColor: string; logo: string; website: string; contactEmail: string; whatsapp: string; operationalMessage: string;
}
export const validTenantSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{2,59}$/.test(slug) && !["admin", "platform", "api", "www", "conta", "demo"].includes(slug);
export function safeBrandWebsite(value: string): boolean {
  if (!value) return true;
  try { const url = new URL(value); const host = url.hostname.replace(/\.$/, ""); return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash
    && host.includes(".") && !/^(?:\d+\.){3}\d+$/.test(host) && !/(?:^|\.)(?:localhost|local|internal|test)$/.test(host); } catch { return false; }
}
export function safeBrandLogo(value: string): boolean {
  if (!value) return true;
  if (value.length <= 87384 && /^(?:data:image\/png;base64,iVBORw0KGgo|data:image\/jpeg;base64,\/9j\/)[a-zA-Z0-9+/]*={0,2}$/.test(value)) return true;
  return value.length <= 1000 && safeBrandWebsite(value) && /\.(?:png|jpe?g|webp)$/i.test(new URL(value).pathname);
}
export function validateTenantBranding(value: TenantBranding): TenantBranding {
  const data = { ...value, publicName: value.publicName.trim(), description: value.description.trim(), contactEmail: value.contactEmail.trim(), operationalMessage: value.operationalMessage.trim() };
  if (!data.organizationId || !validTenantSlug(data.slug) || data.publicName.length < 2 || data.publicName.length > 80 || data.description.length > 240 || data.operationalMessage.length > 800
    || !BRAND_COLORS.some((color) => color === data.primaryColor) || !safeBrandLogo(data.logo) || data.website.length > 500 || !safeBrandWebsite(data.website)
    || (data.contactEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail) || data.contactEmail.length > 120)) || (data.whatsapp && !/^\d{8,15}$/.test(data.whatsapp))) throw new Error("Confira nome, endereço público, cor, imagem e contatos da organização.");
  return data;
}
export const tenantHomePath = (slug: string) => `/o/${encodeURIComponent(slug)}`;
export const tenantCaravanPath = (tripSlug: string, tenantSlug?: string) => `${tenantSlug ? tenantHomePath(tenantSlug) : ""}/caravana/${encodeURIComponent(tripSlug)}`;
