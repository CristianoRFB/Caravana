import { expect, test, type Page } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { patchPlatformSecurityStatus, patchSyntheticMembership, platformTestAccount, preparePlatformSecurityIdentity, seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined; let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment(); await preparePlatformSecurityIdentity();
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Synthetic emulator only");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try { await env.withSecurityRulesDisabled(async (ctx) => { for (const org of ["org-a", "org-b"]) await setDoc(doc(ctx.firestore(), "tenantUsage", org), { organizationId: org, publishedCaravans: org === "org-a" ? 2 : 1, activeMembers: 1, activeOwners: 1, version: "commercial-v1" }); }); } finally { await env.cleanup(); }
  page.on("pageerror", (error) => failures.push(error.message)); await context.route("**/*", (route) => { const host = new URL(route.request().url()).hostname; if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(host)) failures.push(`Remote Firebase: ${host}`); return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort(); });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page) { await page.goto("/platform/login"); await page.getByLabel(/E-mail/).fill(platformTestAccount.email); await page.getByLabel(/Senha/).fill(platformTestAccount.password); await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/platform$/); }
test("platform manually assigns temporary Pro90, keeps catalog and downgrades with audit while A and B remain separate", async ({ page }) => {
  await login(page); const tenantA = page.locator(".platform-tenant").filter({ hasText: "Organização Sintética A" }); await tenantA.getByRole("button", { name: "Plano e limites", exact: true }).click();
  await expect(page.getByText("Plano não atribuído. Nenhum limite Premium é presumido.", { exact: true })).toBeVisible(); await page.getByRole("combobox", { name: "Plano comercial", exact: true }).selectOption("pro"); await page.getByLabel("Motivo da atribuição/alteração").fill("Condição sintética Pro90 temporária"); await page.getByLabel("Mensalidade promocional (R$, opcional)", { exact: true }).fill("90,00"); await page.getByLabel("Fim da promoção").fill(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16)); await page.getByLabel("Motivo da promoção").fill("Promoção fictícia com prazo definido");
  await page.getByRole("button", { name: "Salvar plano e limites", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Nenhuma cobrança foi realizada"); await expect(page.getByText(/Pro · active · R\$.*90,00\/mês/)).toBeVisible(); await expect(page.getByRole("option", { name: /Pro · R\$.*149,00/ })).toBeAttached();
  const panel = page.locator(".platform-section").filter({ has: page.getByRole("heading", { name: "Plano e limites", exact: true }) }); await expect(panel).toContainText("5 caravanas publicadas · 200 passageiros/caravana · 5 pessoas na equipe");
  await page.getByRole("combobox", { name: "Plano comercial", exact: true }).selectOption("essencial"); await page.getByLabel("Mensalidade promocional (R$, opcional)", { exact: true }).fill(""); await page.getByLabel("Motivo da atribuição/alteração").fill("Downgrade sintético com histórico preservado"); await page.getByRole("button", { name: "Salvar plano e limites", exact: true }).click(); await expect(panel).toContainText("2 caravanas publicadas · 60 passageiros/caravana · 2 pessoas na equipe");
  await page.getByRole("button", { name: "Fechar plano", exact: true }).click(); const tenantB = page.locator(".platform-tenant").filter({ hasText: "Organização Sintética B" }); await tenantB.getByRole("button", { name: "Plano e limites", exact: true }).click(); await expect(page.getByText("Plano não atribuído. Nenhum limite Premium é presumido.", { exact: true })).toBeVisible();
  await patchPlatformSecurityStatus("revoked"); await expect(page.getByRole("heading", { name: "Acesso restrito à plataforma", exact: true })).toBeVisible(); await expect(page.getByRole("combobox", { name: "Plano comercial", exact: true })).toHaveCount(0);
  await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password); await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/plano"); await expect(page.getByRole("heading", { name: "Plano e limites", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Essencial", exact: true })).toBeVisible();
  await expect(page.getByText(/Mensalidade contratada: R\$.*89,00/)).toBeVisible();
  await expect(page.getByRole("row", { name: "Caravanas publicadas 2 2", exact: true })).toBeVisible();
  await expect(page.getByText(/Um limite de crescimento foi atingido/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await patchSyntheticMembership("org-a", "staff");
  await expect(page.getByText("Somente responsáveis podem consultar o contrato comercial e gerenciar limites.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Mensalidade contratada:/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
