import { expect, test, type Page, type Dialog } from "@playwright/test";
import { patchSyntheticMembership, seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ context, page }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
const metric = (page: Page, label: string) => page.locator(".finance-summary-card").filter({ has: page.getByText(label, { exact: true }) }).locator("strong");
async function login(page: Page) {
  await patchSyntheticMembership("org-a", "tenant_owner"); await patchSyntheticMembership("org-b", "tenant_owner");
  await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/); await page.goto("/admin/financeiro");
}
test("finance preserves aggregates while correcting and voiding legacy expense with private audit and redacted export", async ({ page }) => {
  await login(page); await expect(metric(page, "Despesas")).toContainText("30,00");
  await page.getByRole("button", { name: "Conferir lançamentos", exact: true }).click(); await expect(page.getByRole("status")).toContainText("sem lançamentos individuais");
  const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Exportar resumo sem dados pessoais" }).click(); expect((await downloaded).suggestedFilename()).toBe("financeiro-resumo-sem-dados-pessoais.csv");
  await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  const rows = page.locator(".finance-expense-row"); await rows.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Valor (R$)", { exact: true }).fill("15,00"); await page.getByLabel("Motivo da correção").fill("Ajuste sintético documentado");
  await page.getByRole("button", { name: "Salvar alteração", exact: true }).click();
  await expect(rows).toHaveCount(2); await expect(rows.filter({ hasText: "Anulada:" })).toHaveCount(1); await expect(rows.filter({ hasText: "Correção de lançamento anterior" })).toHaveCount(1);
  await expect(metric(page, "Despesas")).toContainText("15,00"); await expect(metric(page, "Recebido registrado")).toContainText("25,00");
  const audit = page.getByRole("heading", { name: "Auditoria financeira", exact: true }).locator(".."); await expect(audit).toContainText("Despesa corrigida");
  page.once("dialog", (dialog) => dialog.accept("Anulação sintética documentada")); await rows.getByRole("button", { name: "Anular", exact: true }).click();
  await expect(metric(page, "Despesas")).toContainText("0,00"); await expect(audit.locator("li")).toHaveCount(2);
  await page.reload(); await expect(metric(page, "Despesas")).toContainText("20,00"); await expect(metric(page, "Recebido registrado")).toContainText("145,00");
  const menu = page.getByRole("button", { name: "Menu", exact: true }); if (await menu.isVisible()) await menu.click();
  await page.getByLabel("Organização ativa").selectOption("org-b"); await page.goto("/admin/financeiro");
  await expect(metric(page, "Recebido registrado")).toContainText("200,00"); await expect(metric(page, "Despesas")).toContainText("30,00");
  await expect(audit.locator("li")).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("finance retries a committed payment after reload using the persisted attempt without receiving twice", async ({ page }) => {
  await login(page); await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  // Simulate interruption after server commit and before clearing the opaque ID; do not claim a real lost network ACK.
  await page.evaluate(() => { const remove = Storage.prototype.removeItem; Storage.prototype.removeItem = function (key) { if (!key.startsWith("caravana77:financial-attempt:")) remove.call(this, key); }; });
  await page.getByRole("button", { name: "Registrar", exact: true }).click(); await page.getByLabel("Valor recebido (R$)", { exact: true }).fill("10,00"); await page.getByRole("button", { name: "Salvar pagamento", exact: true }).click();
  await expect(metric(page, "Recebido registrado")).toContainText("35,00");
  expect(await page.evaluate(() => Object.keys(sessionStorage).some((key) => key.startsWith("caravana77:financial-attempt:")))).toBe(true);
  await page.reload(); await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  await page.getByRole("button", { name: "Registrar", exact: true }).click(); await page.getByLabel("Valor recebido (R$)", { exact: true }).fill("10,00"); await page.getByRole("button", { name: "Salvar pagamento", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Registrar pagamento", exact: true })).toHaveCount(0); await expect(metric(page, "Recebido registrado")).toContainText("35,00");
  const audit = page.getByRole("heading", { name: "Auditoria financeira", exact: true }).locator(".."); await expect(audit.locator("li")).toHaveCount(1);
  await page.getByRole("button", { name: "Histórico", exact: true }).click(); const history = page.locator(".finance-history-list"); await expect(history.locator("article")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept("Anulação sintética conferida")); await history.getByRole("button", { name: "Corrigir", exact: true }).click();
  await expect(history).toContainText("Corrigido:"); await expect(metric(page, "Recebido registrado")).toContainText("25,00");
  await page.getByRole("button", { name: "Fechar", exact: true }).click(); await expect(audit.locator("li")).toHaveCount(2);
});
test("finance corrects a historical expected fare with audit and preserves the recorded receipts", async ({ page }) => {
  await login(page); await page.getByLabel("Mostrar dados de").selectOption("ride-a");
  // Both prompts can arrive before accept() of the first resolves. Register
  // one handler up front so Playwright never auto-dismisses the reason dialog.
  const responses = ["95,00", "Tarifa histórica conferida"];
  const answer = (dialog: Dialog) => { void dialog.accept(responses.shift()); };
  page.on("dialog", answer);
  try {
    await page.getByRole("button", { name: "Corrigir valor previsto", exact: true }).click();
    await expect(metric(page, "Recebido registrado")).toContainText("25,00");
    const audit = page.getByRole("heading", { name: "Auditoria financeira", exact: true }).locator(".."); await expect(audit).toContainText("Valor previsto corrigido"); await expect(audit).toContainText("Tarifa histórica conferida");
    expect(responses).toEqual([]);
  } finally { page.off("dialog", answer); }
  await page.reload(); await expect(metric(page, "Recebido registrado")).toContainText("145,00");
});
