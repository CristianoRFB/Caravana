import { test, expect, type Page } from "@playwright/test";
import { patchPlatformSecurityStatus, platformTestAccount, preparePlatformSecurityIdentity, seedSyntheticEnvironment, testAccount } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let ownerUid: string;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = [];
  dispose = await seedSyntheticEnvironment();
  ({ ownerUid } = await preparePlatformSecurityIdentity());
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page, email: string) {
  await page.goto("/platform/login");
  await page.getByLabel(/E-mail/).fill(email);
  await page.getByLabel(/Senha/).fill(platformTestAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/platform$/);
}
test("platform owner onboards an existing Auth user, audits status and loses the UI on revocation", async ({ page }) => {
  await login(page, platformTestAccount.email);
  await expect(page.getByRole("heading", { name: "Organizadoras", exact: true })).toBeVisible();
  await page.getByLabel("Nome da organizadora").fill("Organizadora Fictícia C");
  await page.getByLabel("Identificador da organizadora").fill("synthetic-organizer-c");
  await page.getByLabel("UID do responsável existente").fill(ownerUid);
  await page.getByLabel("Conferi o UID de uma conta existente").check();
  await page.getByRole("combobox", { name: "Plano inicial", exact: true }).selectOption("pro");
  await page.getByLabel("Nome público inicial").fill("Marca Sintética C");
  await page.getByRole("button", { name: "Cadastrar organizadora" }).click();
  await expect(page.getByRole("status")).toContainText("identidade e contadores");
  const tenant = page.locator(".platform-tenant").filter({ hasText: "Organizadora Fictícia C" });
  await expect(tenant).toContainText("Ativa");
  page.once("dialog", (dialog) => dialog.accept());
  await tenant.getByRole("button", { name: "Suspender reservas" }).click();
  await expect(page.getByRole("status")).toContainText("registrada na auditoria");
  await expect(tenant).toContainText("Suspensa para novas reservas");
  await expect(page.getByRole("listitem").filter({ hasText: "synthetic-organizer-c" })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await patchPlatformSecurityStatus("revoked");
  await expect(page.getByRole("heading", { name: "Acesso restrito à plataforma" })).toBeVisible();
  await expect(page.locator(".platform-tenants")).toHaveCount(0);
  await expect(page.getByLabel("UID do responsável existente")).toHaveCount(0);
  // Actual Auth owner can sign in and sees the newly persisted membership alongside its legacy org.
  await page.goto("/admin/login");
  await page.getByLabel(/E-mail/).fill(testAccount.email);
  await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByLabel("Organização ativa")).toBeAttached();
  await expect(page.getByLabel("Organização ativa").locator("option")).toContainText(["org-a", "synthetic-organizer-c"]);
});
test("tenant owner cannot enter the platform and platform authority cannot enter tenant private finance", async ({ page }) => {
  await login(page, testAccount.email);
  await expect(page.getByRole("heading", { name: "Acesso restrito à plataforma" })).toBeVisible();
  await expect(page.getByLabel("Nome da organizadora")).toHaveCount(0);
  await login(page, platformTestAccount.email);
  await expect(page.getByRole("heading", { name: "Organizadoras", exact: true })).toBeVisible();
  await page.goto("/admin/financeiro");
  await expect(page.getByRole("heading", { name: "Conta ainda não autorizada" })).toBeVisible();
  await expect(page.locator(".finance-passenger-list")).toHaveCount(0);
});
