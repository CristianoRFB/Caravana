export const DEMO_ACCOUNTS = {
  passenger: { email: "teste@gmail.com", password: "123456", role: "passenger" },
  owner: { email: "admin.teste@example.test", password: "123456", role: "tenant_owner" },
  ownerB: { email: "admin.b@example.test", password: "123456", role: "tenant_owner" },
} as const;

export function isDemoIdentity(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized === DEMO_ACCOUNTS.passenger.email || normalized.endsWith(".test");
}

export function assertDemoIdentityAllowed(email: string, useEmulators: boolean, projectId: string | undefined, hostname: string | undefined): void {
  if (isDemoIdentity(email) && !(useEmulators && projectId === "demo-caravana77-test" && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname || ""))) {
    throw new Error("As contas demonstrativas funcionam exclusivamente nos emuladores locais.");
  }
}
