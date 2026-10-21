// Public SDK metadata only. Never signs in, creates users, enables APIs or uses ADC.
import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateHealthRelease } from "./staging-health.mjs";
import { assertStagingBuild } from "./staging-target.mjs";

const ORIGIN = "https://caravana77-staging.pages.dev";
const PROJECT = "bdall-e3585";
const NUMBER = "146882624278";
export class PublicAuditBlocked extends Error {}
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

export function extractPublicBuildEnvironment(source) {
  const matches = [...source.matchAll(/apiKey:"(AIza[A-Za-z0-9_-]{35})",authDomain:"([A-Za-z0-9.-]+)",projectId:"([a-z0-9-]+)",messagingSenderId:"([0-9]+)",appId:"([A-Za-z0-9:_-]+)"/g)];
  if (matches.length !== 1) throw new PublicAuditBlocked("ambiguous_or_missing_public_web_configuration");
  const [, key, domain, project, sender, app] = matches[0];
  if (project !== PROJECT || domain !== `${PROJECT}.firebaseapp.com` || sender !== NUMBER || !/^1:146882624278:web:[a-f0-9]{12,64}$/.test(app)) {
    throw new PublicAuditBlocked("public_web_configuration_not_exact_staging");
  }
  const environment = { VITE_APP_ENV: "staging", VITE_USE_EMULATORS: "false", VITE_FIREBASE_API_KEY: key,
    VITE_FIREBASE_AUTH_DOMAIN: domain, VITE_FIREBASE_PROJECT_ID: project, VITE_FIREBASE_MESSAGING_SENDER_ID: sender, VITE_FIREBASE_APP_ID: app };
  assertStagingBuild(environment);
  return environment;
}

async function boundedGet(fetcher, url, resource, limit, calls) {
  calls.push(resource); // Labels only: never URLs containing a public API key.
  try {
    const response = await fetcher(url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (response.status !== 200) throw new PublicAuditBlocked(`${resource}_http_${Number(response.status)}`);
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new PublicAuditBlocked(`${resource}_response_too_large`);
    if (!response.body) throw new PublicAuditBlocked(`${resource}_empty_response`);
    const reader = response.body.getReader(), chunks = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.byteLength;
        if (length > limit) throw new PublicAuditBlocked(`${resource}_response_too_large`);
        chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof PublicAuditBlocked) throw error;
    throw new PublicAuditBlocked(`${resource}_transport_or_redirect_error`);
  }
}

export async function publicStagingAuth({ fetcher = fetch } = {}) {
  const report = { checkedAt: new Date().toISOString(), status: "BLOCKED", projectId: PROJECT, projectNumber: NUMBER,
    requests: [], projectWrites: 0, productionAccess: false, administrativeCredentialsUsed: false, userCredentialsUsed: false, publicWebConfigurationUsed: true,
    privateDataRead: false, administrativeConfigVerified: false, signInJourneyVerified: false, providerEnablementVerified: false,
    emailEnumerationProtectionVerified: false, administrativeServiceDisabledCause: "UNRESOLVED_REQUIRES_MANAGED_IDENTITY_AND_ERRORINFO" };
  const get = (url, resource, limit) => boundedGet(fetcher, url, resource, limit, report.requests);
  try {
    const release = JSON.parse((await get(`${ORIGIN}/release.json`, "published_manifest", 250000)).toString());
    const entries = validateHealthRelease(release).filter(asset => /^assets\/index-[A-Za-z0-9_-]+\.js$/.test(asset.path));
    if (entries.length !== 1) throw new PublicAuditBlocked("published_entry_not_unique");
    const entry = entries[0], bytes = await get(`${ORIGIN}/${entry.path}`, "published_entry", 5000000);
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new PublicAuditBlocked("published_entry_integrity_mismatch");
    const environment = extractPublicBuildEnvironment(bytes.toString());
    report.publishedSource = release.source;
    report.publishedEntrySha256 = entry.sha256;
    report.publishedEntryIntegrityVerified = true;
    const suffix = `?key=${encodeURIComponent(environment.VITE_FIREBASE_API_KEY)}`;
    const project = JSON.parse((await get(`https://identitytoolkit.googleapis.com/v1/projects${suffix}`, "public_auth_project", 64000)).toString());
    if (String(project.projectId) !== NUMBER) throw new PublicAuditBlocked("public_auth_project_number_mismatch");
    report.publicAuthProjectNumberVerified = true;
    report.stagingDomainAuthorized = Array.isArray(project.authorizedDomains) && project.authorizedDomains.includes("caravana77-staging.pages.dev");
    const policy = JSON.parse((await get(`https://identitytoolkit.googleapis.com/v2/passwordPolicy${suffix}`, "public_password_policy", 64000)).toString());
    report.passwordPolicyEnforcement = policy.enforcementState === "ENFORCE" ? "ENFORCE" : "NOT_ENFORCED";
    const minimum = policy.customStrengthOptions?.minPasswordLength;
    report.passwordMinimumLength = Number.isInteger(minimum) && minimum >= 0 && minimum <= 4096 ? minimum : null;
    if (!report.stagingDomainAuthorized || report.passwordPolicyEnforcement !== "ENFORCE" || report.passwordMinimumLength < 12 || report.passwordMinimumLength === null) {
      throw new PublicAuditBlocked("public_auth_domain_or_password_policy_requires_review");
    }
    report.status = "PASS_PUBLIC_STAGING_AUTH_READS";
    return { report, publicBuildEnvironment: environment };
  } catch (error) {
    report.reason = error instanceof PublicAuditBlocked ? error.message : "invalid_public_metadata_details_suppressed";
    return { report }; // Never return a partial configuration after a failed audit.
  }
}

export async function preparePublicBuildEnvironment(environment, { writer = writeFile } = {}) {
  assertStagingBuild(environment);
  if (environment.VITE_FIREBASE_MESSAGING_SENDER_ID !== NUMBER || !/^AIza[A-Za-z0-9_-]{35}$/.test(environment.VITE_FIREBASE_API_KEY)
    || !/^1:146882624278:web:[a-f0-9]{12,64}$/.test(environment.VITE_FIREBASE_APP_ID)) throw new PublicAuditBlocked("public_build_configuration_not_exact_staging");
  const names = ["VITE_APP_ENV", "VITE_USE_EMULATORS", "VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_APP_ID"];
  for (const name of names) {
    if (typeof environment[name] !== "string" || !/^[A-Za-z0-9_.:-]+$/.test(environment[name])) throw new PublicAuditBlocked("unsafe_public_build_environment_value");
    if (process.env[name] !== undefined && process.env[name] !== environment[name]) throw new PublicAuditBlocked("inherited_build_configuration_conflict");
  }
  // wx preserves any existing setup; no cached credentials or private files read.
  await writer(".env.staging.local", names.map(name => `${name}=${environment[name]}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== "--prepare-build")) throw new PublicAuditBlocked("only_optional_prepare_build_flag_allowed");
    const { report, publicBuildEnvironment } = await publicStagingAuth();
    if (process.argv[2] && publicBuildEnvironment) {
      try { await preparePublicBuildEnvironment(publicBuildEnvironment); report.publicBuildEnvironmentPrepared = true; }
      catch { report.publicBuildEnvironmentPrepared = false; report.buildPreparation = "BLOCKED_EXISTING_FILE_OR_CONFIGURATION_CONFLICT"; }
    }
    await mkdir(".firebase/convergence", { recursive: true, mode: 0o700 });
    await writeFile(".firebase/convergence/public-auth-report.json", JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "PASS_PUBLIC_STAGING_AUTH_READS" || report.publicBuildEnvironmentPrepared === false) process.exitCode = 1;
  } catch { console.error("Public staging audit blocked; raw URLs and configuration suppressed."); process.exitCode = 1; }
}
