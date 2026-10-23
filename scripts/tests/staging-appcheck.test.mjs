import { test } from "node:test";
import assert from "node:assert/strict";
import { stagingAppCheckSiteKey, stagingAppCheckCspSources } from "../../src/lib/staging-appcheck.ts";
const key = "6L_SYNTHETIC_PUBLIC_SITE_KEY_ONLY";
const env = { VITE_APP_ENV: "staging", VITE_STAGING_APPCHECK_ENABLED: "true", VITE_STAGING_APPCHECK_SITE_KEY: key };
const runtime = { hostname: "caravana77-staging.pages.dev", projectId: "bdall-e3585", emulators: false, development: false };

test("default mode performs no attestation and adds no external CSP sources", () => {
  assert.equal(stagingAppCheckSiteKey({}, {}), null);
  assert.deepEqual(stagingAppCheckCspSources(false), {script:"",connect:"",frame:""});
});
test("allows only explicit canonical staging activation", () => {
  assert.equal(stagingAppCheckSiteKey(env,runtime),key);
  for (const change of [{projectId:"caravana-af306"},{hostname:"caravana-77.pages.dev"},{hostname:"caravana77-staging.pages.dev.evil.invalid"},{hostname:"127.0.0.1"},{hostname:undefined},{emulators:true},{development:true},{debugToken:true},{debugToken:"PRIVATE_DEBUG_TOKEN"}]) {
    assert.throws(()=>stagingAppCheckSiteKey(env,{...runtime,...change}));
  }
  assert.throws(()=>stagingAppCheckSiteKey({...env,VITE_APP_ENV:"production"},runtime));
});
test("rejects incomplete flags, stray keys, malformed keys and secret-like input", () => {
  for(const change of [{VITE_STAGING_APPCHECK_ENABLED:"yes"},{VITE_STAGING_APPCHECK_ENABLED:"false"},{VITE_STAGING_APPCHECK_ENABLED:undefined},{VITE_STAGING_APPCHECK_SITE_KEY:""},{VITE_STAGING_APPCHECK_SITE_KEY:"AGE-SECRET-KEY-DO-NOT-PRINT"},{VITE_STAGING_APPCHECK_SITE_KEY:"6L_<script>"},{VITE_STAGING_APPCHECK_SITE_KEY:" "+key}]) {
    assert.throws(()=>stagingAppCheckSiteKey({...env,...change},runtime), error=>!error.message.includes("DO-NOT-PRINT"));
  }
});
test("enabled CSP is limited to required provider paths and Firebase token exchange", () => {
  const sources=stagingAppCheckCspSources(true);
  assert.ok(sources.script.includes("https://www.gstatic.com/recaptcha/"));
  assert.ok(sources.connect.includes("https://firebaseappcheck.googleapis.com"));
  assert.ok(sources.frame.includes("https://recaptcha.google.com/recaptcha/"));
  assert.doesNotMatch(JSON.stringify(sources), /unsafe-eval|https:\/\/\*|caravana-af306/);
});
