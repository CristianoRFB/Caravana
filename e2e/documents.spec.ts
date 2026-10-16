import { test, expect, type Page } from "@playwright/test";
import { expireSyntheticAuthorization, prepareSyntheticMinor, seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined; let failures: string[];
test.beforeEach(async ({ context, page }) => {
  failures = []; dispose = await seedSyntheticEnvironment(); await prepareSyntheticMinor();
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => { const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort(); });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page) { await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password); await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/); }
async function upload(page: Page) {
  await page.goto(`/minha-inscricao/${"a".repeat(64)}`);
  await expect(page.getByLabel("Enviar autorização PDF", { exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Declaro que o responsável autoriza/ }).check();
  await expect(page.getByLabel("Enviar autorização PDF", { exact: true })).toBeEnabled();
  await page.getByLabel("Enviar autorização PDF", { exact: true }).setInputFiles({ name: "synthetic-authorization.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nSYNTHETIC AUTHORIZATION") });
  await expect(page.getByRole("status").filter({ hasText: "PDF enviado para conferência" })).toBeVisible();
}
test("minor authorization requires consent, private staff download and manual review before boarding", async ({ page }) => {
  await upload(page); await login(page); await page.goto("/admin/caravanas/ride-a/passageiros");
  const row = page.getByRole("row").filter({ hasText: "Pessoa Sintética ride-a" }).filter({ hasNotText: "ride-a2" });
  const download = page.waitForEvent("download"); await row.getByRole("button", { name: "Baixar autorização" }).click();
  expect((await download).suggestedFilename()).toBe("autorizacao-privada.pdf");
  await row.getByLabel(/Autorização de/).selectOption("approved");
  await expect(page.locator(".success-message")).toContainText("Status da autorização atualizado");
  await page.goto("/admin/check-in/ride-a"); await page.getByRole("button", { name: "Embarcar", exact: true }).click();
  await expect(page.locator(".operational-history")).toContainText("Embarque registrado");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("policy changes only affect new uploads and owner cleanup preserves passenger and finance", async ({ page }) => {
  await upload(page); await login(page); await page.goto("/admin/documentos");
  await page.getByLabel("Comprovantes — dias").fill("1"); await page.getByLabel("Autorizações — dias").fill("1"); await page.getByRole("button", { name: "Salvar prazos" }).click();
  await expect(page.getByRole("status")).toContainText("Prazos registrados");
  await page.getByRole("button", { name: "Conferir arquivos vencidos" }).click(); await expect(page.getByRole("status")).toContainText("0 arquivos");
  await expireSyntheticAuthorization(); await page.getByRole("button", { name: "Conferir arquivos vencidos" }).click(); await expect(page.getByRole("status")).toContainText("1 arquivos");
  await page.getByRole("button", { name: "Excluir arquivo vencido" }).click(); await expect(page.getByRole("status")).toContainText("Cadastro e histórico financeiro preservados");
  await page.goto("/admin/financeiro");
  await expect(page.locator(".finance-summary-card").filter({ has: page.getByText("Recebido registrado", { exact: true }) }).locator("strong")).toContainText("145,00");
  await page.goto(`/minha-inscricao/${"a".repeat(64)}`); await expect(page.getByRole("status").filter({ hasText: "PDF enviado para conferência" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /Declaro que o responsável autoriza/ })).toBeVisible();
});
