import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("scheduled handler runs in workerd with isolated synthetic outbound service", async () => {
  const script = await readFile(new URL("../../operations/staging-monitor/worker.mjs", import.meta.url), "utf8");
  const source = "a".repeat(40);
  const manifest = { kind: "FUNCTIONAL_STAGING_CANDIDATE", projectId: "bdall-e3585", pagesProject: "caravana77-staging", source, files: [{ path: "assets/a.js" }] };
  for (const failure of [false, true]) {
  const fixture = `export default { fetch(request) {
    const url = new URL(request.url);
    if (url.origin !== "https://caravana77-staging.pages.dev") throw Error("UNEXPECTED_ORIGIN");
    if (${failure}) return new Response("synthetic private-looking payload", { status: 503 });
    if (url.pathname === "/release.json") return Response.json(${JSON.stringify(manifest)});
    if (url.pathname !== "/admin/login") throw Error("UNEXPECTED_PATH");
    return new Response('<div id="root"></div>', { headers: {
      "content-type": "text/html", "x-robots-tag": "noindex", "x-frame-options": "DENY",
      "content-security-policy": "default-src 'self'"
    }});
  }};`;
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [
    { name: "probe", modules: true, script, compatibilityDate: "2026-10-23", outboundService: "synthetic-origin" },
    { name: "synthetic-origin", modules: true, script: fixture, compatibilityDate: "2026-10-23", outboundService: () => { throw Error("EXTERNAL_NETWORK_FORBIDDEN"); } },
  ] }));
  try {
    const worker = await mf.getWorker("probe");
    const result = await worker.scheduled({ cron: "*/15 * * * *" });
    assert.equal(result.outcome, failure ? "exception" : "ok");
    const response = await worker.fetch("https://unpublished.invalid/probe");
    assert.equal(response.status, 404);
  } finally { await mf.dispose(); }
  }
});
