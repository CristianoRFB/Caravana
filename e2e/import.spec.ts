import { test, expect, type Page } from "@playwright/test";
import { inspectSyntheticBookings, patchSyntheticMembership, patchSyntheticTrip, patchSyntheticCommercial, seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined;
let failures: string[];
const csv = "Nome;Tipo documento 1;Número documento 1;Pagamento informado;Cidade\nPessoa Histórica Fictícia;RG informado;SYNTHETIC-1234;Pix;Cidade fictícia";
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
async function login(page: Page) {
  await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/);
}
async function historicalImport(page: Page) {
  await page.getByRole("button", { name: "Importar lista", exact: true }).click();
  await page.getByRole("checkbox", { name: /Lista histórica sem contato/ }).check();
  await page.getByLabel("Cole linhas CSV aqui").fill(csv); await page.getByRole("button", { name: "Validar texto colado" }).click();
  await expect(page.locator(".legacy-import-summary")).toContainText("1 válidos");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Importar 1 passageiros" }).click();
}
test("historical CSV report survives reload, rollback preserves record, duplicate retry and tenant B stay isolated", async ({ page }) => {
  await patchSyntheticMembership("org-b", "tenant_owner"); await login(page); await page.goto("/admin/caravanas/ride-a/passageiros");
  await historicalImport(page); await expect(page.locator(".import-report")).toContainText("1 importados");
  await page.reload(); await expect(page.locator(".import-history .platform-tenant")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept("Correção sintética do lote")); await page.getByRole("button", { name: "Desfazer lote" }).click();
  await expect(page.locator(".import-history [role=status]")).toContainText("Cancelado");
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 1, registrationCount: 2 });
  await historicalImport(page); await expect(page.locator(".import-report")).toContainText("0 importados · 1 já cadastrados");
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 1, registrationCount: 2 });
  await page.getByLabel("Organização ativa").selectOption("org-b"); await page.goto("/admin/caravanas/ride-b/passageiros");
  await expect(page.locator(".import-history .platform-tenant")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "Pessoa Histórica Fictícia" })).toHaveCount(0);
  await historicalImport(page); await expect(page.locator(".import-report")).toContainText("1 importados");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("staff has no import or rollback controls", async ({ page }) => {
  await patchSyntheticMembership("org-a", "staff"); await login(page); await page.goto("/admin/caravanas/ride-a/passageiros");
  await expect(page.getByRole("heading", { name: "Passageiros", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Importar lista" })).toHaveCount(0);
  await expect(page.locator(".import-history")).toHaveCount(0);
});
test("CSV consumes the final plan seat and rollback plus duplicate replay remain usable after growth is blocked", async ({ page }) => {
  await patchSyntheticTrip({ capacity: 100, reservedSeats: 59 }); await patchSyntheticCommercial("org-a", "essencial");
  await login(page); await page.goto("/admin/caravanas/ride-a/passageiros");
  await historicalImport(page); await expect(page.locator(".import-report")).toContainText("1 importados");
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 60, registrationCount: 2 });
  await patchSyntheticCommercial("org-a", "essencial", false);
  page.once("dialog", (dialog) => dialog.accept("Reversão fictícia após bloqueio de crescimento")); await page.getByRole("button", { name: "Desfazer lote" }).click();
  await expect(page.locator(".import-history [role=status]")).toContainText("Cancelado");
  await historicalImport(page); await expect(page.locator(".import-report")).toContainText("0 importados · 1 já cadastrados");
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 59, registrationCount: 2 });
});
