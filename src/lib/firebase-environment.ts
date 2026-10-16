// Validate before creating an SDK instance: local development must never reach a real project.
export function assertFirebaseEnvironment(hostname: string | undefined, projectId: string | undefined, useEmulators: boolean, development: boolean) {
  const loopback = hostname !== undefined && ["127.0.0.1", "localhost", "[::1]", "::1"].includes(hostname);
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
