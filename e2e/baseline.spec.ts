import { test, expect, type Page } from "@playwright/test";
import { patchSyntheticMembership, patchSyntheticTrip, seedSyntheticEnvironment, testAccount } from "./fixtures";

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
  const portalUrl = page.url();
  await expect(page.locator(".pix-key")).toContainText("CHAVE-SINTETICA-SEM-VALOR");
  await page.locator("input[type=file]").setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nSYNTHETIC") });
  await expect(page.locator(".upload-button")).toContainText("Enviar outro comprovante");
  await page.screenshot({ path: testInfo.outputPath("portal-comprovante-synthetic.png"), fullPage: true });
  await signIn(page);
  await page.goto("/admin/caravanas/ride-a/passageiros");
  const row = page.getByRole("row").filter({ hasText: "Pessoa E2E Nova" });
  page.once("dialog", (dialog) => dialog.accept("Comprovante sintético ilegível"));
  await row.getByRole("button", { name: "Recusar", exact: true }).click();
  await expect(page.locator(".success-message")).toContainText("Pagamento recusado.");
  await expect(row).toContainText("Recusado");
  await page.goto(portalUrl);
  await expect(page.locator(".error-message")).toContainText("Comprovante sintético ilegível");
  await page.locator("input[type=file]").setInputFiles({ name: "synthetic-corrected.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nSYNTHETIC CORRECTED") });
  await expect(page.locator(".upload-button")).toContainText("Enviar outro comprovante");
  await page.goto("/admin/caravanas/ride-a/passageiros");
  await row.getByRole("button", { name: "Aprovar", exact: true }).click();
  await row.getByRole("button", { name: "Embarcou", exact: true }).click();
  await expect(row.locator(".pill").filter({ hasText: "Embarcou" })).toBeVisible();
  await page.goto("/admin/financeiro");
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  await page.goto("/admin/caravanas/ride-a/passageiros");
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".success-message")).toContainText("Inscrição cancelada e vaga liberada.");
  await page.goto(portalUrl);
  await expect(page.getByText("Esta inscrição foi cancelada.", { exact: false })).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
});

test("revoking a shared private link hides an open guest portal and preserves the admin record", async ({ page, browser }) => {
  const guest = await browser.newContext();
  await guest.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) firebaseEscapes.push(hostname);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
  const portal = await guest.newPage();
  portal.on("pageerror", (error) => runtimeErrors.push(error.message));
  try {
    await portal.goto(`/minha-inscricao/${"a".repeat(64)}`);
    await expect(portal.getByRole("heading", { name: "Oi, Pessoa!" })).toBeVisible();
    await signIn(page);
    await page.goto("/admin/caravanas/ride-a/passageiros");
    const row = page.getByRole("row").filter({ hasText: "Pessoa Sintética ride-a" });
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Revogar link", exact: true }).click();
    await expect(page.locator(".success-message")).toContainText("Link privado revogado.");
    await expect(row.getByRole("button", { name: "Reativar link" })).toBeVisible();
    await expect(portal.getByRole("heading", { name: "Inscrição indisponível" })).toBeVisible();
    await expect(portal.locator(".portal-card")).toHaveCount(0);
    await portal.reload();
    await expect(portal.getByRole("heading", { name: "Inscrição indisponível" })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Reativar link", exact: true }).click();
    await expect(page.locator(".success-message")).toContainText("Link privado reativado.");
    await expect(row.getByRole("button", { name: "Revogar link" })).toBeVisible();
    await portal.reload();
    await expect(portal.getByRole("heading", { name: "Oi, Pessoa!" })).toBeVisible();
    await page.goto("/admin/financeiro");
    await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  } finally { await guest.close(); }
});

test("Pix configuration is conditional, empty values explain the process, and copying uses the configured key", async ({ page, context }) => {
  const portal = `/minha-inscricao/${"a".repeat(64)}`;
  await patchSyntheticTrip({ paymentMethod: "", paymentInstructions: "", paymentDeadline: "" });
  await page.goto(portal);
  await expect(page.getByRole("heading", { name: "Oi, Pessoa!" })).toBeVisible();
  await expect(page.locator(".pix-recipient")).toHaveCount(0);
  await expect(page.locator(".payment-card")).toContainText("não cobra nem recebe pagamentos");
  await expect(page.getByText("Prazo informado pela organização")).toHaveCount(0);
  await patchSyntheticTrip({ paymentMethod: "Dinheiro" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Oi, Pessoa!" })).toBeVisible();
  await expect(page.locator(".pix-recipient")).toHaveCount(0);
  await patchSyntheticTrip({ paymentMethod: "Pix", pixKey: "", pixReceiver: "", paymentDeadline: "2026-11-04" });
  await page.reload();
  await expect(page.locator(".pix-key")).toContainText("ainda não configurou");
  await expect(page.locator(".pix-recipient")).toContainText("Configuração pendente");
  await page.getByRole("button", { name: "Copiar chave" }).click();
  await expect(page.locator(".error-message")).toContainText("ainda não foi configurada");
  await expect(page.getByText("Prazo informado pela organização")).toBeVisible();
  await patchSyntheticTrip({ pixKey: "CHAVE-SINTETICA-SEM-VALOR", pixReceiver: "Recebedor fictício" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.reload();
  await page.getByRole("button", { name: "Copiar chave" }).click();
  await expect(page.getByRole("button", { name: "Copiado!", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("CHAVE-SINTETICA-SEM-VALOR");
});

test("switching organizations clears filters/drafts and live revocation cannot use legacy access", async ({ page }) => {
  await patchSyntheticMembership("org-a", "tenant_owner");
  await patchSyntheticMembership("org-b", "tenant_owner");
  await signIn(page);
  await page.goto("/admin/financeiro");
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  await page.getByLabel("Descrição", { exact: true }).fill("Rascunho sintético A");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByLabel("Organização ativa").selectOption("org-b");
  await expect(page.locator(".admin-content")).toHaveAttribute("data-org", "org-b");
  await expect(page).toHaveURL(/\/admin$/);
  if (await menu.isVisible()) await menu.click();
  await page.locator(".admin-sidebar").getByRole("link", { name: "Financeiro", exact: true }).click();
  if (await menu.isVisible() && await page.locator(".sidebar-open").count()) await menu.click();
  await expect(metric(page, "Recebido registrado")).toContainText("200,00");
  await expect(page.getByLabel("Mostrar dados de")).toHaveValue("all");
  await expect(page.locator(".finance-passenger-list")).not.toContainText("Pessoa Sintética ride-a");
  await page.getByLabel("Mostrar dados de").selectOption("ride-b");
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
  await patchSyntheticMembership("org-b", "tenant_owner", "revoked");
  await expect(page.locator(".admin-content")).toHaveAttribute("data-org", "org-a");
  await expect(page.locator(".finance-passenger-list")).not.toContainText("Pessoa Sintética ride-b");
  await patchSyntheticMembership("org-a", "tenant_owner", "revoked");
  await expect(page.getByRole("heading", { name: "Conta ainda não autorizada" })).toBeVisible();
  await expect(page.locator(".finance-summary-card")).toHaveCount(0);
});

test("staff can read scoped finance without controls to register or correct money", async ({ page }) => {
  await patchSyntheticMembership("org-a", "staff");
  await signIn(page);
  await page.goto("/admin/financeiro");
  await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  await expect(page.getByRole("button", { name: "Registrar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nova despesa", exact: true })).toHaveCount(0);
  await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  await expect(page.locator(".finance-expense-form")).toHaveCount(0);
});
