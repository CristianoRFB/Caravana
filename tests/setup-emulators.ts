// Run before test imports, including legacy suites. Never silently use a default endpoint.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") {
  throw new Error("All tests require the isolated demo Firestore Emulator at 127.0.0.1:18080. Use npm test.");
}
if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== "demo-caravana77-test") {
  throw new Error("A real or unrelated Firebase project cannot be used for tests.");
}
