import { describe, expect, it } from "vitest";
import { onboardingPayload } from "../src/lib/onboarding-payload";

const input = { name: "Organizadora Sintética", slug: "synthetic-new", ownerUid: "existing-owner", ownerUidConfirmed: true, planId: "pro" as const, setupWaived: false };
describe("assisted commercial onboarding payload", () => {
  it("uses the explicit approved plan and no inherited private contact", () => {
    const payload = onboardingPayload(input);
    expect(payload.assignment).toMatchObject({ planId: "pro", status: "active", setupWaived: false });
    expect(payload.branding).toMatchObject({ publicName: input.name, contactEmail: "", whatsapp: "", organizationId: input.slug, slug: input.slug });
  });
  it("requires a human confirmation of an existing Auth UID", () => {
    expect(() => onboardingPayload({ ...input, ownerUidConfirmed: false })).toThrow("conferência do UID");
    expect(() => onboardingPayload({ ...input, ownerUid: "../owner" })).toThrow("UID");
  });
  it("rejects invalid plans, reserved slugs and unsafe public logos", () => {
    expect(() => onboardingPayload({ ...input, planId: "free" as "pro" })).toThrow();
    expect(() => onboardingPayload({ ...input, slug: "admin" })).toThrow();
    expect(() => onboardingPayload({ ...input, branding: { logo: "javascript:alert(1)" } })).toThrow();
  });
  it("normalizes the selected namespace and binds branding to it", () => {
    const payload = onboardingPayload({ ...input, slug: " SYNTHETIC-NEW ", branding: { publicName: "Marca sintética", primaryColor: "#6d4aff" } });
    expect(payload.branding).toMatchObject({ organizationId: "synthetic-new", slug: "synthetic-new", publicName: "Marca sintética" });
  });
});
