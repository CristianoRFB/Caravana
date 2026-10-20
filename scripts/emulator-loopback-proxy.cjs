// firebase-tools 15.30 creates a ProxyAgent even for NO_PROXY destinations.
// Storage's Firestore lookups then leave loopback and fail in proxied environments.
// Keep every external request proxied; route only these synthetic, read-only lookups locally.
function isSyntheticFirestoreRead(options) {
  try {
    const url = new URL(options.path, String(options.origin));
    return options.method === "GET" && !url.username && !url.password
      && url.origin === "http://127.0.0.1:18080"
      && url.pathname.startsWith("/v1/projects/demo-caravana77-test/databases/(default)/documents/");
  } catch { return false; }
}
module.exports = { isSyntheticFirestoreRead };

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
      return isSyntheticFirestoreRead(options)
        ? loopbackAgent.dispatch(options, handler)
        : super.dispatch(options, handler);
    }
  };
}
