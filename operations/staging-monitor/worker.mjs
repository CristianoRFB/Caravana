// Public staging availability only. No credentials, Firebase document requests,
// configurable destinations, storage, or externally callable probe endpoint.
const ORIGIN = "https://caravana77-staging.pages.dev";
const LIMIT = 65536;

async function boundedText(response) {
  if (!response.body) throw Error("EMPTY_BODY");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > LIMIT) throw Error("BODY_LIMIT");
      text += decoder.decode(item.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function probeStaging(fetcher = fetch) {
  const get = async (path) => {
    const response = await fetcher(ORIGIN + path, {
      // workerd supports manual/follow; reject every non-200 below, including 3xx.
      redirect: "manual", signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Caravana77-Staging-Public-Monitor/1" },
    });
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      throw Error("HTTP_STATUS");
    }
    return response;
  };
  const html = await get("/admin/login");
  const csp = html.headers.get("content-security-policy") || "";
  if (!(html.headers.get("content-type") || "").startsWith("text/html") ||
      !html.headers.get("x-robots-tag")?.includes("noindex") ||
      html.headers.get("x-frame-options") !== "DENY" ||
      !csp.includes("default-src 'self'") || csp.includes("unsafe-eval")) {
    await html.body?.cancel().catch(() => {});
    throw Error("SECURITY_HEADERS");
  }
  if (!(await boundedText(html)).includes('id="root"')) throw Error("APP_SHELL");
  const manifestResponse = await get("/release.json");
  if (!(manifestResponse.headers.get("content-type") || "").startsWith("application/json")) {
    await manifestResponse.body?.cancel().catch(() => {});
    throw Error("MANIFEST_MIME");
  }
  const release = JSON.parse(await boundedText(manifestResponse));
  if (release?.kind !== "FUNCTIONAL_STAGING_CANDIDATE" ||
      release.projectId !== "bdall-e3585" || release.pagesProject !== "caravana77-staging" ||
      !/^[a-f0-9]{40}$/.test(release.source) ||
      !Array.isArray(release.files) || release.files.length < 1 || release.files.length > 80) {
    throw Error("MANIFEST_IDENTITY");
  }
  return { source: release.source };
}

export default {
  // Even if a route is accidentally enabled, HTTP cannot start a probe.
  fetch() { return new Response("Not found", { status: 404 }); },
  async scheduled() {
    try {
      const result = await probeStaging();
      console.info(JSON.stringify({ event: "STAGING_PROBE_PASS", ...result }));
    } catch {
      // Never log response bodies, arbitrary exception messages, URLs or tokens.
      console.error(JSON.stringify({ event: "STAGING_PROBE_FAIL" }));
      throw Error("STAGING_PUBLIC_AVAILABILITY_FAILED");
    }
  },
};
