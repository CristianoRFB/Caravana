import assert from "node:assert/strict";
import test from "node:test";
import worker, { probeStaging } from "../../operations/staging-monitor/worker.mjs";

const source = "a".repeat(40);
const manifest = { kind: "FUNCTIONAL_STAGING_CANDIDATE", projectId: "bdall-e3585", pagesProject: "caravana77-staging", source, files: [{ path: "assets/a.js" }] };
const headers = { "content-type": "text/html", "x-robots-tag": "noindex", "x-frame-options": "DENY", "content-security-policy": "default-src 'self'" };
function responses(overrides = {}) {
  const calls = [];
  return { calls, fetcher: async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return overrides.html?.() || new Response('<div id="root"></div>', { headers });
    return overrides.release?.() || new Response(JSON.stringify(manifest), { headers: { "content-type": "application/json" } });
  } };
}

test("probe only uses two fixed public GETs, no redirect or credentials", async () => {
  const fixture = responses();
  assert.deepEqual(await probeStaging(fixture.fetcher), { source });
  assert.deepEqual(fixture.calls.map(c => c.url), ["https://caravana77-staging.pages.dev/admin/login", "https://caravana77-staging.pages.dev/release.json"]);
  for (const { options } of fixture.calls) {
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(Object.keys(options.headers), ["User-Agent"]);
    assert.equal(options.body, undefined);
  }
});

test("rejects wrong target, MIME, status, headers and non-app HTML", async () => {
  const cases = [
    { html: () => new Response(null, { status: 302, headers: { location: "https://example.invalid" } }) },
    { html: () => new Response("unavailable", { status: 503 }) },
    { html: () => new Response('<div id="root"></div>') },
    { html: () => new Response("fallback", { headers }) },
    { html: () => new Response('<div id="root"></div>', { headers: { ...headers, "content-security-policy": "default-src 'self'; script-src 'unsafe-eval'" } }) },
    { release: () => new Response(JSON.stringify(manifest)) },
    { release: () => new Response(JSON.stringify({ ...manifest, projectId: "caravana-af306" }), { headers: { "content-type": "application/json" } }) },
  ];
  for (const options of cases) await assert.rejects(probeStaging(responses(options).fetcher));
});

test("stream byte bound cancels growing body despite false length", async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(16384)); }, cancel() { cancelled = true; } });
  await assert.rejects(probeStaging(responses({ html: () => new Response(body, { headers: { ...headers, "content-length": "1" } }) }).fetcher), /BODY_LIMIT/);
  assert.equal(cancelled, true);
});

test("network failure is awaited and HTTP cannot initiate probes", async () => {
  await assert.rejects(probeStaging(async () => { throw Error("synthetic transport error"); }), /synthetic transport error/);
  assert.equal(worker.fetch().status, 404);
});
