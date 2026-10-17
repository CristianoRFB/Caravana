import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { patchSyntheticMembership, seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined; let failures: string[];
function syntheticPng() {
  function chunk(type: string, data: Buffer) {
    const body = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const size = Buffer.alloc(4); size.writeUInt32BE(data.length); const check = Buffer.alloc(4); check.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([size, body, check]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 15, 118, 110, 255]))), chunk("IEND", Buffer.alloc(0))]);
}
test.beforeEach(async ({ context, page }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Synthetic emulator only");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try { await env.withSecurityRulesDisabled(async (ctx) => {
    const database = ctx.firestore(); const a = (await getDoc(doc(database, "caravans/ride-a"))).data()!;
    await updateDoc(doc(database, "caravans/ride-b"), { slug: a.slug, name: a.name });
    for (const [organizationId, slug, publicName, primaryColor] of [["org-a", "atlas", "Atlas Viagens", "#0f766e"], ["org-b", "horizonte", "Horizonte Turismo", "#1d4ed8"]]) {
      await setDoc(doc(database, "publicTenantSettings", organizationId), { organizationId, slug, publicName, primaryColor, logo: "https://example.com/missing-logo.png", description: `Viagens fictícias de ${publicName}`, website: "https://example.com", contactEmail: "contato@example.com", whatsapp: "5511999999999", operationalMessage: `Peça orientações à equipe ${publicName}.`, updatedAt: Timestamp.now(), lastBrandOperationId: "0".repeat(32) });
      await setDoc(doc(database, "tenantSlugs", slug), { organizationId, slug });
    }
    await setDoc(doc(database, "legacyTripAliases", a.slug), { organizationId: "org-a", caravanId: "ride-a" });
  }); } finally { await env.cleanup(); }
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => { const host = new URL(route.request().url()).hostname; if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(host)) failures.push(`Remote Firebase: ${host}`); return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort(); });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page) { await patchSyntheticMembership("org-a", "tenant_owner"); await patchSyntheticMembership("org-b", "tenant_owner"); await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password); await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/); }
test("tenant namespaces distinguish identical trip slugs and preserve the explicit historical alias", async ({ page }, testInfo) => {
  await page.goto("/o/atlas?organizationId=org-b"); await expect(page.locator(".topbar .brand")).toContainText("Atlas Viagens"); await expect(page.locator(".public-trip-card")).toHaveCount(2);
  await page.locator('.public-trip-card[href="/o/atlas/caravana/sintetica-ride-a"]').click(); await expect(page).toHaveURL(/\/o\/atlas\/caravana\/sintetica-ride-a$/);
  await expect(page.locator(".payment-process-notice")).toContainText("Atlas Viagens"); await expect(page.locator(".payment-process-notice")).not.toContainText("AnimeSFest");
  await expect(page.locator(".brand-mark img")).toHaveCount(0); // blocked external image uses the local fallback
  expect(await page.locator(".tenant-custom-brand").first().evaluate((element) => getComputedStyle(element).getPropertyValue("--tenant-primary").trim())).toBe("#0f766e");
  expect(await page.locator(".fact").evaluateAll((facts) => facts.every((fact) => { const box = fact.getBoundingClientRect(); const content = fact.querySelector("strong")?.getBoundingClientRect(); return !content || (content.left >= box.left && content.right <= box.right + 1); }))).toBe(true);
  expect(await page.locator(".fact strong").evaluateAll((values) => values.every((value) => value.scrollWidth <= value.clientWidth + 1))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("atlas-public-synthetic.png"), fullPage: true });
  await page.goto("/o/horizonte/caravana/sintetica-ride-a"); await expect(page.locator(".topbar .brand")).toContainText("Horizonte Turismo"); await expect(page.locator(".payment-process-notice")).not.toContainText("Atlas Viagens");
  await page.goto("/caravana/sintetica-ride-a"); await expect(page.locator(".topbar .brand")).toContainText("Atlas Viagens");
  await page.goto("/o/horizonte"); await expect(page.locator(".public-trip-card")).toHaveCount(1); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("a scoped reservation keeps its tenant on reload and another tenant path cannot display that bearer registration", async ({ page }) => {
  await page.goto("/o/atlas/caravana/sintetica-ride-a/inscricao"); await page.getByLabel(/Nome completo/).fill("Pessoa Marca Sintética"); await page.getByLabel(/WhatsApp/).fill("11900000002"); await page.getByLabel("Cidade", { exact: false }).fill("Cidade fictícia"); await page.getByLabel(/Ponto de embarque/).selectOption("point-a");
  await page.getByLabel(/Contato de emergência/).fill("Contato sintético 11900000003"); await page.getByRole("button", { name: "Garantir minha vaga", exact: true }).click(); await expect(page).toHaveURL(/\/o\/atlas\/minha-inscricao\/[a-f0-9]{64}$/);
  const url = page.url(); await page.reload(); await expect(page.locator(".topbar .brand")).toContainText("Atlas Viagens");
  await page.goto(url.replace("/o/atlas/", "/o/horizonte/")); await expect(page.getByRole("heading", { name: "Inscrição indisponível", exact: true })).toBeVisible(); await expect(page.locator(".portal-heading")).toHaveCount(0);
});
test("owner updates public identity live without rebuilding and tenant B keeps its own branding and finance", async ({ page }, testInfo) => {
  await login(page); await page.goto("/admin/identidade"); await expect(page.locator(".admin-top .brand")).toContainText("Atlas Viagens");
  await expect(page.getByLabel("Endereço público da organização")).toBeDisabled(); await page.getByLabel("Nome público", { exact: true }).fill("Atlas Cultura"); await page.getByLabel("Cor principal").selectOption("#166534");
  await page.getByLabel("Enviar imagem da marca (PNG/JPG, até60KB)", { exact: true }).setInputFiles({ name: "marca-sintetica.png", mimeType: "image/png", buffer: syntheticPng() }); await expect(page.getByAltText("Prévia da marca")).toHaveAttribute("src", /^data:image\/png;base64,/);
  await page.getByRole("button", { name: "Salvar identidade pública", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Identidade pública salva");
  await expect(page.locator(".admin-top .brand")).toContainText("Atlas Cultura"); await expect(page.locator('head link[data-tenant-brand="org-a"]')).toHaveAttribute("href", /^data:image\/png;base64,/); await page.goto("/o/atlas"); await expect(page.locator(".topbar .brand")).toContainText("Atlas Cultura");
  await page.goto("/admin/financeiro"); const menu = page.getByRole("button", { name: "Menu", exact: true }); if (await menu.isVisible()) await menu.click(); await page.getByLabel("Organização ativa").selectOption("org-b"); await page.goto("/admin/financeiro");
  await expect(page.locator(".admin-top .brand")).toContainText("Horizonte Turismo"); await expect(page.locator(".admin-top .brand")).not.toContainText("Atlas");
  await expect(page.locator(".finance-summary-card").filter({ has: page.getByText("Recebido registrado", { exact: true }) }).locator("strong")).toContainText("200,00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath("branding-admin-b-synthetic.png"), fullPage: true });
});
