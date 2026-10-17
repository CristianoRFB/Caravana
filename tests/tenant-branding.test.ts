import { describe, expect, it } from "vitest";
import { safeBrandLogo, safeBrandWebsite, tenantCaravanPath, validateTenantBranding, validTenantSlug } from "../src/lib/tenant-branding";
describe("tenant public branding validation (F5 work in progress)", () => {
  it("accepts bounded plain text and approved color tokens without accepting CSS fragments", () => {
    const brand = { organizationId: "legacy-id", slug: "atlas-viagens", publicName: " Atlas Viagens ", description: "Texto público", primaryColor: "#0f766e", logo: "", website: "https://example.com/", contactEmail: "contato@example.com", whatsapp: "5511999999999", operationalMessage: "Conferência manual" };
    expect(validateTenantBranding(brand).publicName).toBe("Atlas Viagens");
    expect(() => validateTenantBranding({ ...brand, primaryColor: "red;background:url(javascript:alert(1))" })).toThrow();
    expect(() => validateTenantBranding({ ...brand, whatsapp: "+55 11" })).toThrow();
  });
  it("rejects scripts, SVG, credentials, private hosts and malformed mapping slugs", () => {
    for (const url of ["javascript:alert(1)", "http://example.com/x.png", "https://user:pass@example.com/x.png", "https://127.0.0.1/x.png", "https://a.local/x.png", "https://a.local./x.png", "data:image/svg+xml,<svg/>"]) { expect(safeBrandWebsite(url)).toBe(false); expect(safeBrandLogo(url)).toBe(false); }
    expect(safeBrandLogo("data:image/png;base64,/9j/AAAA")).toBe(false);
    expect(safeBrandLogo("https://example.com/logo.png")).toBe(true); expect(safeBrandLogo("https://example.com/logo.svg")).toBe(false);
    for (const slug of ["admin", "../b", "a/b", "atlas?org=b", "Átlas", "ab"]) expect(validTenantSlug(slug)).toBe(false);
  });
  it("keeps tenant namespaces distinct and encodes path segments", () => {
    expect(tenantCaravanPath("mesma-viagem", "atlas")).toBe("/o/atlas/caravana/mesma-viagem");
    expect(tenantCaravanPath("mesma-viagem", "horizonte")).not.toBe(tenantCaravanPath("mesma-viagem", "atlas"));
    expect(tenantCaravanPath("x/y")).toBe("/caravana/x%2Fy");
  });
});
