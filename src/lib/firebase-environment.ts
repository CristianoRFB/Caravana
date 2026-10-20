// Validate before creating an SDK instance: local development must never reach a real project.
export function assertFirebaseEnvironment(hostname: string | undefined, projectId: string | undefined, useEmulators: boolean, development: boolean, appEnvironment?: string) {
  const loopback = hostname !== undefined && ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
  if (appEnvironment === "staging") {
    if (projectId !== "bdall-e3585" || useEmulators || development || !hostname || !/^(?:[a-z0-9-]+\.)?caravana77-staging\.pages\.dev$/.test(hostname)) {
      throw new Error("Staging exige bdall-e3585 e o domínio isolado autorizado, sem emuladores.");
    }
    return;
  }
  if (projectId === "bdall-e3585") throw new Error("O projeto de staging exige identificação explícita do ambiente.");
  if (useEmulators) {
    if (!loopback || projectId !== "demo-caravana77-test") {
      throw new Error("Os testes exigem localhost e o projeto sintético demo-caravana77-test.");
    }
    return;
  }
  if (loopback || development) {
    throw new Error("O desenvolvimento local exige emuladores. Use npm run dev com a configuração sintética.");
  }
}
