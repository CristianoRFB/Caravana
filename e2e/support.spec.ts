import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { patchSyntheticMembership, patchSyntheticTrip, platformTestAccount, preparePlatformSecurityIdentity, seedSyntheticEnvironment, testAccount } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let operatorUid: string;
let failures: string[];
async function isolate(context: BrowserContext, page: Page) {
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
}
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  ({ operatorUid } = await preparePlatformSecurityIdentity());
  await patchSyntheticTrip({ status: "draft" });
  await isolate(context, page);
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page, platform: boolean) {
  await page.goto(platform ? "/platform/login" : "/admin/login");
  await page.getByLabel(/E-mail/).fill(platform ? platformTestAccount.email : testAccount.email);
  await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(platform ? /\/platform$/ : /\/admin$/);
}
test("owner consents, operator explicitly starts read-only support, revocation clears private configuration", async ({ page, browser }) => {
  await login(page, false); await page.goto("/admin/suporte");
  await page.getByLabel("Identificador do operador de suporte").fill(operatorUid);
  await page.getByLabel("Motivo da autorização").fill("Diagnóstico sintético de configuração");
  await page.getByLabel("Prazo de acesso").selectOption("15");
  await page.getByRole("button", { name: "Autorizar consulta temporária" }).click();
  await expect(page.getByRole("status")).toContainText("Autorização temporária registrada");
  const operatorContext = await browser.newContext({ baseURL: "http://127.0.0.1:4177", viewport: page.viewportSize()! });
  try {
    const operator = await operatorContext.newPage(); await isolate(operatorContext, operator); await login(operator, true);
    await operator.locator(".platform-tenant").filter({ hasText: "org-a" }).getByRole("button", { name: "Abrir suporte" }).click();
    await expect(operator.locator(".support-config-list")).toHaveCount(0);
    await operator.getByRole("button", { name: "Iniciar suporte autorizado" }).click();
    await expect(operator.locator(".support-config-list")).toContainText("Caravana Sintética ride-a");
    await expect(operator.locator(".support-config-list")).not.toContainText("ride-b");
    await expect(operator.locator(".support-config-list button")).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Suporte iniciado" })).toHaveCount(1);
    for (const target of [page, operator]) expect(await target.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(target.viewportSize()!.width);
    await operator.getByRole("button", { name: "Encerrar suporte" }).click();
    await expect(operator.locator(".support-console")).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Suporte encerrado" })).toHaveCount(1);
    await operator.locator(".platform-tenant").filter({ hasText: "org-a" }).getByRole("button", { name: "Abrir suporte" }).click();
    await operator.getByRole("button", { name: "Iniciar suporte autorizado" }).click();
    await expect(operator.locator(".support-config-list")).toContainText("ride-a");
    await page.getByRole("button", { name: "Revogar autorização" }).click();
    await expect(page.getByRole("status")).toContainText("Autorização revogada");
    await expect(operator.locator(".support-config-list")).toHaveCount(0);
    await expect(operator.getByRole("button", { name: "Iniciar suporte autorizado" })).toBeDisabled();
    await operator.locator(".platform-tenant").filter({ hasText: "org-b" }).getByRole("button", { name: "Abrir suporte" }).click();
    await expect(operator.getByRole("button", { name: "Iniciar suporte autorizado" })).toBeDisabled();
    await expect(operator.locator(".support-config-list")).toHaveCount(0);
  } finally { await operatorContext.close(); }
});
test("staff cannot authorize platform support", async ({ page }) => {
  await patchSyntheticMembership("org-a", "staff"); await login(page, false); await page.goto("/admin/suporte");
  await expect(page.getByRole("heading", { name: "Autorização restrita ao responsável" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Autorizar consulta temporária" })).toHaveCount(0);
});
