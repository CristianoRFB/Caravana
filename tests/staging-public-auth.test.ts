import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractPublicBuildEnvironment, preparePublicBuildEnvironment, publicStagingAuth } from "../scripts/staging-public-auth.mjs";

const key = "AIza" + "x".repeat(35); // Public-format synthetic value; never a real API key.
const source = `const config={apiKey:"${key}",authDomain:"bdall-e3585.firebaseapp.com",projectId:"bdall-e3585",messagingSenderId:"146882624278",appId:"1:146882624278:web:1234567890abcdef"};`;
const entry = { path: "assets/index-synthetic.js", bytes: Buffer.byteLength(source), sha256: createHash("sha256").update(source).digest("hex") };
const release = { kind: "FUNCTIONAL_STAGING_CANDIDATE", projectId: "bdall-e3585", pagesProject: "caravana77-staging", source: "a".repeat(40), files: [entry] };
const project = { projectId: "146882624278", authorizedDomains: ["caravana77-staging.pages.dev", "PRIVATE_OTHER_DOMAIN"] };
const policy = { enforcementState: "ENFORCE", customStrengthOptions: { minPasswordLength: 12 }, PRIVATE_FIELD: "PRIVATE_PAYLOAD" };
function mockReads(responses: Response[]) {
  return vi.fn(async (_url: string, options: RequestInit) => {
    expect(options.method).toBe("GET"); expect(options.redirect).toBe("error");
    expect(options.headers).toBeUndefined(); // No OAuth/ADC/cookie/Authorization supplied.
    const next = responses.shift(); if (!next) throw Error("Unexpected network call"); return next;
  });
}
const json = (value: unknown) => new Response(JSON.stringify(value));
function successfulReads() { return [json(release), new Response(source), json(project), json(policy)]; }

describe("public fixed-target staging Auth reads and candidate preparation", () => {
  beforeEach(() => {
    // Vite may load the operator's ignored .env.local. These tests use only
    // synthetic public values and must not depend on that machine's setup.
    for (const name of Object.keys(extractPublicBuildEnvironment(source))) vi.stubEnv(name, undefined);
  });
  afterEach(() => vi.unstubAllEnvs());
  it("confirms project/domain/password policy without sign-in and never reports the key or extra data", async () => {
    const fetcher = mockReads(successfulReads()), result = await publicStagingAuth({ fetcher });
    expect(result.report.status).toBe("PASS_PUBLIC_STAGING_AUTH_READS");
    expect(result.report.passwordMinimumLength).toBe(12);
    expect(result.report.administrativeConfigVerified).toBe(false);
    expect(result.report.signInJourneyVerified).toBe(false);
    expect(result.report.providerEnablementVerified).toBe(false);
    expect(result.report.projectWrites).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(4);
    const urls = fetcher.mock.calls.map(call => new URL(call[0]));
    expect(urls.map(url => url.origin + url.pathname)).toEqual([
      "https://caravana77-staging.pages.dev/release.json", "https://caravana77-staging.pages.dev/assets/index-synthetic.js",
      "https://identitytoolkit.googleapis.com/v1/projects", "https://identitytoolkit.googleapis.com/v2/passwordPolicy",
    ]);
    for (const value of [key, "PRIVATE_OTHER_DOMAIN", "PRIVATE_PAYLOAD"]) expect(JSON.stringify(result.report)).not.toContain(value);
    expect(result.publicBuildEnvironment?.VITE_FIREBASE_PROJECT_ID).toBe("bdall-e3585");
  });
  it("stops before any Firebase call for a foreign manifest, path, entry or configuration", async () => {
    for (const response of [
      { ...release, projectId: "caravana-af306" }, { ...release, pagesProject: "caravana-77" },
      { ...release, files: [{ ...entry, path: "https://outside.invalid/script.js" }] },
      { ...release, files: [entry, entry] },
    ]) {
      const fetcher = mockReads([json(response)]), result = await publicStagingAuth({ fetcher });
      expect(result.report.status).toBe("BLOCKED"); expect(result.publicBuildEnvironment).toBeUndefined();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    const fetcher = mockReads([json(release), new Response(source + "TAMPERED")]);
    expect((await publicStagingAuth({ fetcher })).report.reason).toBe("published_entry_integrity_mismatch");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects wrong or ambiguous embedded Web configurations without evaluating JavaScript", () => {
    for (const altered of [source + source, source.replaceAll("bdall-e3585", "caravana-af306"), source.replaceAll("146882624278", "123456789012"), source.replace("AIza", "invalid")]) {
      expect(() => extractPublicBuildEnvironment(altered)).toThrow();
    }
  });
  it("stops on a key associated with another project before reading policy", async () => {
    const fetcher = mockReads([json(release), new Response(source), json({ ...project, projectId: "123456789012" })]);
    const result = await publicStagingAuth({ fetcher });
    expect(result.report.reason).toBe("public_auth_project_number_mismatch");
    expect(fetcher).toHaveBeenCalledTimes(3); expect(result.publicBuildEnvironment).toBeUndefined();
  });
  it("blocks missing domain or unenforced/weak/malformed policy instead of approving metadata partially", async () => {
    for (const changed of [{ enforcementState: "OFF" }, { customStrengthOptions: { minPasswordLength: 8 } }, { customStrengthOptions: {} }]) {
      const fetcher = mockReads([json(release), new Response(source), json(project), json({ ...policy, ...changed })]);
      const result = await publicStagingAuth({ fetcher });
      expect(result.report.status).toBe("BLOCKED"); expect(result.publicBuildEnvironment).toBeUndefined();
    }
    const result = await publicStagingAuth({ fetcher: mockReads([json(release), new Response(source), json({ ...project, authorizedDomains: [] }), json(policy)]) });
    expect(result.report.status).toBe("BLOCKED");
  });
  it("bounds streamed bytes and declared length and never echoes transport errors or response messages", async () => {
    for (const response of [new Response("x".repeat(250001)), new Response("small", { headers: { "content-length": "9999999" } }), new Response("PRIVATE_PAYLOAD", { status: 403 })]) {
      const result = await publicStagingAuth({ fetcher: mockReads([response]) });
      expect(result.report.status).toBe("BLOCKED"); expect(JSON.stringify(result.report)).not.toContain("PRIVATE_PAYLOAD");
    }
    const result = await publicStagingAuth({ fetcher: async () => { throw Error(`REDIRECT_PRIVATE_URL?key=${key}`); } });
    expect(result.report.reason).toBe("published_manifest_transport_or_redirect_error");
    expect(JSON.stringify(result.report)).not.toContain(key);
  });
  it("writes only validated public staging values with exclusive create and private mode", async () => {
    const writer = vi.fn(async () => {}), environment = extractPublicBuildEnvironment(source);
    await preparePublicBuildEnvironment(environment, { writer });
    expect(writer).toHaveBeenCalledWith(".env.staging.local", expect.stringContaining("VITE_FIREBASE_PROJECT_ID=bdall-e3585"), { flag: "wx", mode: 0o600 });
    expect(writer.mock.calls[0][1]).not.toContain("PASSWORD");
    for (const changed of [{ VITE_FIREBASE_PROJECT_ID: "caravana-af306" }, { VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789012", VITE_FIREBASE_APP_ID: "1:123456789012:web:1234567890abcdef" }, { VITE_FIREBASE_API_KEY: key + "\nSECRET=bad" }]) {
      writer.mockClear(); await expect(preparePublicBuildEnvironment({ ...environment, ...changed }, { writer })).rejects.toThrow(); expect(writer).not.toHaveBeenCalled();
    }
  });
  it("preserves an existing build environment and propagates writer failure without retrying", async () => {
    const writer = vi.fn(async () => { throw Error("EXISTING_FILE"); });
    await expect(preparePublicBuildEnvironment(extractPublicBuildEnvironment(source), { writer })).rejects.toThrow("EXISTING_FILE");
    expect(writer).toHaveBeenCalledTimes(1);
  });
  it("rejects an inherited environment conflict before the writer is called", async () => {
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "caravana-af306");
    const writer = vi.fn(async () => {});
    await expect(preparePublicBuildEnvironment(extractPublicBuildEnvironment(source), { writer })).rejects.toThrow("inherited_build_configuration_conflict");
    expect(writer).not.toHaveBeenCalled();
  });
});
