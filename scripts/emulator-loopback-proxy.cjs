// firebase-tools 15.30 creates a ProxyAgent even for NO_PROXY destinations.
// Storage's Firestore lookups then leave loopback and fail in proxied environments.
// Keep every external request proxied; only fixed synthetic lookups and opt-in
// emulator export endpoints may use loopback directly.
function isSyntheticFirestoreRead(options) {
  try {
    const url = new URL(options.path, String(options.origin));
    return options.method === "GET" && !url.username && !url.password
      && url.origin === "http://127.0.0.1:18080"
      && url.pathname.startsWith("/v1/projects/demo-caravana77-test/databases/(default)/documents/");
  } catch { return false; }
}
function isSyntheticRecoveryRequest(options, enabled) {
  if (!enabled) return false;
  try {
    const url = new URL(options.path, String(options.origin));
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.origin === "http://127.0.0.1:14400") {
      return (options.method === "GET" && ["/", "/emulators"].includes(url.pathname))
        || (options.method === "POST" && url.pathname === "/_admin/export");
    }
    return (options.method === "POST" && url.origin === "http://127.0.0.1:18080"
      && url.pathname === "/emulator/v1/projects/demo-caravana77-test:export")
      || (options.method === "POST" && url.origin === "http://127.0.0.1:19199" && url.pathname === "/internal/export")
      || (options.method === "GET" && url.origin === "http://127.0.0.1:19099"
      && url.pathname === "/identitytoolkit.googleapis.com/v2/projects/demo-caravana77-test/tenants");
  } catch { return false; }
}
module.exports = { isSyntheticFirestoreRead, isSyntheticRecoveryRequest };

const projectArg = process.argv.indexOf("--project");
if (/[\\/]firebase\.js$/.test(process.argv[1] || "") && process.argv.includes("emulators:exec")
    && projectArg > 0 && process.argv[projectArg + 1] === "demo-caravana77-test") {
  // Resolve the exact instance used by Firebase CLI, including nested dependency layouts.
  const { createRequire } = require("node:module");
  const cliRequire = createRequire(require.resolve("firebase-tools/package.json"));
  const undici = cliRequire("undici");
  const OriginalProxyAgent = undici.ProxyAgent;
  const loopbackAgent = new undici.Agent();
  undici.ProxyAgent = class extends OriginalProxyAgent {
    dispatch(options, handler) {
      return (isSyntheticFirestoreRead(options) || isSyntheticRecoveryRequest(options, Boolean(process.env.CARAVANA_RECOVERY_RUN)))
        ? loopbackAgent.dispatch(options, handler)
        : super.dispatch(options, handler);
    }
  };
}
