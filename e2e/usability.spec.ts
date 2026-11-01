import { test, expect, type Page } from "@playwright/test";
import { inspectSyntheticBookings, patchSyntheticTrip, platformTestAccount, prepareSyntheticMinor, preparePlatformSecurityIdentity, seedSyntheticEnvironment, testAccount } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  page.on("pageerror", () => failures.push("runtime_error"));
  await context.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(host)) failures.push("remote_firebase");
    return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function signIn(page: Page, platform = false) {
  await page.goto(platform ? "/platform/login" : "/admin/login");
  const account = platform ? platformTestAccount : testAccount;
  await page.getByLabel(/E-mail/).fill(account.email); await page.getByLabel(/Senha/).fill(account.password);
  await page.getByRole("button", { name: "Entrar no painel", exact: true }).click();
  await expect(page).toHaveURL(platform ? /\/platform$/ : /\/admin$/);
}
async function fits(page: Page) {
  const width = await page.evaluate(() => ({ available: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(width.content).toBeLessThanOrEqual(width.available);
}

test("booking describes the real journey before asking for personal details", async ({ page }, info) => {
  await page.goto("/caravana/sintetica-ride-a/inscricao");
  await expect(page.getByLabel(/Nome completo/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("booking-synthetic.png"), fullPage: true });
  const journey = page.getByRole("list", { name: "Etapas da inscrição" });
  await expect(journey).toContainText("Dados e embarque"); await expect(journey).toContainText("Pagamento"); await expect(journey).toContainText("Conferência");
  await expect(page.getByText("Os campos com * são obrigatórios.", { exact: true })).toBeVisible();
  const payment = page.getByRole("note", { name: "Pagamento fora do site" });
  await expect(payment).toContainText("Organização Sintética informará");
  await expect(payment).not.toContainText("AnimeSFest");
  await patchSyntheticTrip({ organizerName: "" }); await page.reload();
  await expect(payment).toContainText("A organização informará");
  await expect(payment).not.toContainText("AnimeSFest");
  await fits(page);
});

test("invalid booking focuses a linked error summary, preserves input and submits one corrected reservation", async ({ page }) => {
  const before = await inspectSyntheticBookings();
  await page.goto("/caravana/sintetica-ride-a/inscricao");
  await page.getByLabel(/Nome completo/).fill("Pessoa UX Sintética");
  await page.getByRole("button", { name: "Garantir minha vaga", exact: true }).click();
  const summary = page.getByRole("alert").filter({ has: page.getByRole("heading", { name: "Confira os campos indicados" }) });
  await expect(summary).toBeFocused(); await expect(page.getByLabel(/Nome completo/)).toHaveValue("Pessoa UX Sintética");
  expect(await inspectSyntheticBookings()).toEqual(before);
  await summary.getByRole("link", { name: /WhatsApp/ }).click(); await expect(page.getByLabel(/WhatsApp/)).toBeFocused();
  await page.getByLabel(/WhatsApp/).fill("11900000002"); await page.getByLabel("Cidade", { exact: false }).fill("Cidade fictícia");
  await page.getByLabel(/Ponto de embarque/).selectOption("point-a"); await page.getByLabel(/Contato de emergência/).fill("Contato fictício 11900000003");
  await page.getByRole("button", { name: "Garantir minha vaga", exact: true }).click();
  await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/);
  const after = await inspectSyntheticBookings(); expect(after.registrationCount).toBe(before.registrationCount + 1); expect(after.reservedSeats).toBe(before.reservedSeats + 1);
  await fits(page);
});

for (const mode of ["booking", "edit"] as const) {
  test(`conditional guardian errors follow birth date changes in ${mode}`, async ({ page }) => {
    await prepareSyntheticMinor();
    if (mode === "booking") await page.goto("/caravana/sintetica-ride-a/inscricao");
    else {
      await signIn(page); await page.goto("/admin/caravanas/ride-a/passageiros");
      await page.getByRole("row").filter({ hasText: "Pessoa Sintética ride-a" }).getByRole("button", { name: "Editar", exact: true }).click();
      await page.getByLabel(/Nome completo/).fill("");
    }
    const birth = page.getByLabel(/Data de nascimento/);
    await birth.fill("2010-01-01");
    await page.getByLabel("Nome do responsável", { exact: false }).fill("");
    await page.getByLabel("Telefone do responsável", { exact: false }).fill("");
    await page.getByRole("button", { name: mode === "booking" ? "Garantir minha vaga" : "Salvar dados", exact: true }).click();
    const summary = page.locator(".validation-summary");
    await expect(summary.getByRole("link", { name: /Nome do responsável/ })).toBeVisible();
    await birth.fill("1990-01-01");
    await expect(page.getByLabel("Nome do responsável", { exact: false })).toHaveCount(0);
    await expect(summary.getByRole("link", { name: /do responsável/ })).toHaveCount(0);
    await birth.fill("2010-01-01");
    await expect(summary.getByRole("link", { name: /Nome do responsável/ })).toBeVisible();
    await summary.getByRole("link", { name: /Nome do responsável/ }).click();
    await expect(page.getByLabel("Nome do responsável", { exact: false })).toBeFocused();
  });
}

test("numeric limits explain the maximum, minimum and increment before a caravan can be saved", async ({ page }) => {
  await signIn(page); await page.goto("/admin/caravanas");
  await page.getByRole("button", { name: /Nova caravana/ }).click();
  const capacity = page.getByLabel("Vagas", { exact: false });
  await capacity.fill("1001"); await page.getByRole("button", { name: "Criar e publicar", exact: true }).click();
  const summary = page.locator(".validation-summary");
  await expect(summary).toContainText("no máximo 1000");
  await capacity.fill("0"); await expect(summary).toContainText("no mínimo 1");
  await capacity.fill("1"); await page.getByLabel(/Preço/).fill("85.001");
  await expect(summary).toContainText("incremento 0,01");
  await fits(page);
});

test("all login entrances offer an accessible password toggle without changing credentials", async ({ page }) => {
  for (const route of ["/admin/login", "/conta/entrar", "/platform/login"]) {
    await page.goto(route);
    const password = page.getByLabel(/^Senha/);
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await password.fill("Synthetic-Only-2026");
    await page.getByRole("button", { name: "Mostrar senha", exact: true }).click();
    await expect(password).toHaveAttribute("type", "text"); await expect(password).toHaveValue("Synthetic-Only-2026");
    await page.getByRole("button", { name: "Ocultar senha", exact: true }).click(); await expect(password).toHaveAttribute("type", "password");
    await fits(page);
  }
});

test("team navigation exposes the current task, contextual help and recoverable mobile menu", async ({ page }, info) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("team-synthetic.png"), fullPage: true });
  const small = page.viewportSize()!.width <= 650;
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (small) await menu.click();
  const navigation = page.getByRole("navigation", { name: "Navegação da organização" });
  await expect(navigation.getByRole("link", { name: "Visão geral", exact: true })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Financeiro", exact: true }).click();
  if (small) { await expect(menu).toHaveAttribute("aria-expanded", "false"); await expect(navigation).toBeHidden(); await menu.click(); }
  await expect(navigation.getByRole("link", { name: "Financeiro", exact: true })).toHaveAttribute("aria-current", "page");
  if (small) {
    const route = page.url();
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused(); await expect(navigation).toBeHidden();
    expect(page.url()).toBe(route);
    for (let tab = 0; tab < 8; tab++) { await page.keyboard.press("Tab"); await expect(page.locator("#admin-navigation :focus")).toHaveCount(0); }

    await menu.click(); await page.getByRole("button", { name: "Fechar navegação", exact: true }).click({ position: { x: page.viewportSize()!.width - 8, y: 180 } });
    await expect(menu).toBeFocused(); await expect(navigation).toBeHidden();
    expect(page.url()).toBe(route);
    const viewport = page.viewportSize()!;
    await menu.click(); await page.setViewportSize({ width: 900, height: viewport.height });
    await expect(page.locator(".admin-menu-button")).toHaveAttribute("aria-expanded", "false");
    await expect(navigation).toBeVisible(); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await page.setViewportSize(viewport); await expect(navigation).toBeHidden(); expect(page.url()).toBe(route);
  }
  await page.getByText("Como usar esta página", { exact: true }).click();
  await expect(page.getByText(/Registre apenas pagamentos que você já conferiu/)).toBeVisible();
  await fits(page);
});

test("global administrator can find organizations and open assisted onboarding only when needed", async ({ page }, info) => {
  await preparePlatformSecurityIdentity(); await signIn(page, true);
  await expect(page.getByRole("heading", { name: "Organizadoras", exact: true })).toBeVisible();
  await expect(page.locator(".platform-tenant")).toHaveCount(2);
  await page.screenshot({ path: info.outputPath("platform-synthetic.png"), fullPage: true });
  await expect(page.getByLabel("Nome da organizadora", { exact: true })).toBeHidden();
  await page.getByLabel("Buscar organizadora", { exact: true }).fill("organizacao sintetica a");
  await expect(page.locator(".platform-tenant")).toHaveCount(1); await expect(page.locator(".platform-tenant")).toContainText("org-a");
  await page.getByLabel("Buscar organizadora", { exact: true }).fill("ORG-B"); await expect(page.locator(".platform-tenant")).toContainText("org-b");
  await page.getByLabel("Buscar organizadora", { exact: true }).fill("não existe"); await expect(page.getByText("Nenhuma organizadora encontrada.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca", exact: true }).click(); await expect(page.locator(".platform-tenant")).toHaveCount(2);
  await page.getByText("Cadastrar nova organizadora", { exact: true }).click(); await expect(page.getByLabel("Nome da organizadora", { exact: true })).toBeVisible();
  await fits(page);
});

test("public mobile navigation announces its state and restores keyboard focus", async ({ page }) => {
  await page.goto("/caravana/sintetica-ride-a");
  if (page.viewportSize()!.width <= 650) {
    const menu = page.getByRole("button", { name: /^(Abrir|Fechar) menu$/ });
    await expect(menu).toHaveAttribute("aria-expanded", "false"); await menu.click(); await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused(); await expect(menu).toHaveAttribute("aria-expanded", "false");
  } else { await expect(page.getByRole("link", { name: "Embarque", exact: true })).toBeVisible(); }
  await fits(page);
});
