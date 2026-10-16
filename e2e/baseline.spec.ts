import { test, expect, type Page } from "@playwright/test";
import { seedSyntheticEnvironment, testAccount } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let runtimeErrors: string[];
let firebaseEscapes: string[];
test.beforeEach(async ({ context, page }) => {
  runtimeErrors = [];
  firebaseEscapes = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  dispose = await seedSyntheticEnvironment();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(url.hostname)) firebaseEscapes.push(url.hostname);
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => {
  await dispose?.();
  expect(runtimeErrors).toEqual([]);
  expect(firebaseEscapes).toEqual([]);
});

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/E-mail/).fill(testAccount.email);
  await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-sidebar")).toBeAttached();
}
const metric = (page: Page, label: string) => page.locator(".finance-summary-card").filter({ has: page.getByText(label, { exact: true }) }).locator("strong");

test("Financeiro Geral preserves Tudo/caravan totals, reload and organization scoping", async ({ page }, testInfo) => {
  await signIn(page);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator(".admin-sidebar").getByRole("link", { name: "Financeiro", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/financeiro$/);
  if (await menu.isVisible() && await page.locator(".sidebar-open").count()) await menu.click();
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  await expect(metric(page, "Despesas")).toContainText("30,00");
  await expect(metric(page, "Passageiros ativos")).toHaveText("2");
  await expect(page.locator(".finance-passenger-list")).not.toContainText("ride-b");
  await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  await expect(metric(page, "Recebido registrado")).toContainText("25,00");
  await expect(metric(page, "Despesas")).toContainText("10,00");
  await expect(metric(page, "Passageiros ativos")).toHaveText("1");
  await page.getByLabel("Mostrar dados de").selectOption("ride-a2");
  await expect(metric(page, "Recebido registrado")).toContainText("120,00");
  await page.getByLabel("Mostrar dados de").selectOption("all");
  await page.reload();
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  await expect(page.getByLabel("Mostrar dados de")).toHaveValue("all");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const brand = await page.locator(".admin-top .brand").boundingBox();
  const identity = await page.locator(".admin-identity").boundingBox();
  expect(brand && identity ? identity.x - brand.x - brand.width : -1).toBeGreaterThanOrEqual(8);
  await page.screenshot({ path: testInfo.outputPath("financeiro-geral-synthetic.png"), fullPage: true });
});

test("a guessed caravan path cannot expose another organization's private finance", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/caravanas/ride-b/financeiro");
  await expect(page.getByRole("alert")).toContainText("não está disponível");
  await expect(page.locator(".finance-passenger-list")).toHaveCount(0);
  await expect(page.locator(".finance-expense-list")).toHaveCount(0);
});

test("public booking, private proof, manual review and check-in use the recovered source", async ({ page }, testInfo) => {
  await page.goto("/caravana/sintetica-ride-a/inscricao");
  await page.getByLabel(/Nome completo/).fill("Pessoa E2E Nova");
  await page.getByLabel(/WhatsApp/).fill("11900000002");
  await page.getByLabel("Cidade", { exact: false }).fill("Cidade fictícia");
  await page.getByLabel(/Ponto de embarque/).selectOption("point-a");
  await page.getByLabel(/Contato de emergência/).fill("Contato sintético 11900000003");
  await page.getByRole("button", { name: "Garantir minha vaga" }).click();
  await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/);
  await expect(page.locator(".pix-key")).toContainText("CHAVE-SINTETICA-SEM-VALOR");
  await page.locator("input[type=file]").setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nSYNTHETIC") });
  await expect(page.locator(".upload-button")).toContainText("Enviar outro comprovante");
  await page.screenshot({ path: testInfo.outputPath("portal-comprovante-synthetic.png"), fullPage: true });
  await signIn(page);
  await page.goto("/admin/caravanas/ride-a/passageiros");
  const row = page.getByRole("row").filter({ hasText: "Pessoa E2E Nova" });
  await row.getByRole("button", { name: "Aprovar", exact: true }).click();
  await row.getByRole("button", { name: "Embarcou", exact: true }).click();
  await expect(row.locator(".pill").filter({ hasText: "Embarcou" })).toBeVisible();
  await page.goto("/admin/financeiro");
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
});
