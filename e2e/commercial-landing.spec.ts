import { expect, test } from "@playwright/test";
import { seedSyntheticEnvironment } from "./fixtures";
import { seedDemoAccounts } from "../scripts/seed-demo.mjs";
import { COMMERCIAL_POLICY, PlanCatalog } from "../src/lib/plan-catalog";
import { money } from "../src/lib/types";

let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment(); await seedDemoAccounts();
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });

test("separate SaaS landing uses the approved catalog, assisted onboarding and functional local demo", async ({ page }, testInfo) => {
  await page.goto("/saas");
  await expect(page).toHaveTitle("Caravana 77 | Gestão para sua organizadora");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sua próxima caravana.");
  for (const plan of Object.values(PlanCatalog)) {
    const card = page.getByRole("article", { name: plan.name, exact: true });
    await expect(card).toContainText(money(plan.monthlyCents));
    await expect(card).toContainText(`${plan.limits.activeCaravans} caravanas publicadas`);
    await expect(card).toContainText(`${plan.limits.passengersPerCaravan} passageiros por caravana`);
    await expect(card).toContainText(`${plan.limits.internalUsers} integrantes internos`);
    await expect(card.getByRole("link")).toHaveAttribute("href", "#implantacao");
  }
  await expect(page.getByRole("article",{name:"Pro",exact:true})).toContainText("RECOMENDADO");
  await expect(page.getByRole("article",{name:"Pro",exact:true})).toContainText("Tudo do Essencial");
  await expect(page.getByRole("article",{name:"Pro",exact:true})).toContainText("Central de relatórios operacionais");
  await expect(page.getByRole("article",{name:"Premium",exact:true})).toContainText("Tudo do Pro");
  await expect(page.getByRole("article",{name:"Premium",exact:true})).toContainText("Roteiros da equipe e modelos reutilizáveis");
  await expect(page.getByRole("region",{name:"Comparação detalhada dos planos"})).toBeVisible();
  await expect(page.locator(".saas-page")).not.toContainText("Os mesmos recursos");
  await expect(page.locator(".saas-pricing-note")).toContainText(money(COMMERCIAL_POLICY.setupCents));
  await expect(page.locator(".saas-page")).not.toContainText("AnimeSFest");
  await expect(page.locator(".saas-page")).not.toContainText("UID");
  await expect(page.locator('a[href^="https://wa.me/"], a[href^="mailto:"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Encontrar meu plano", exact: true }).click();
  await expect(page).toHaveURL(/\/saas#planos$/);
  await page.getByText("A Caravana 77 recebe o pagamento dos passageiros?", { exact: true }).click();
  await expect(page.getByText(/A organizadora informa a forma de pagamento e recebe fora da plataforma/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // Check individual elements too: root overflow clipping must not conceal a broken layout.
  expect(await page.locator(".saas-page").evaluate((root) => [...root.querySelectorAll("h1,h2,h3,.saas-plan,.saas-button,.saas-preview")].every((element) => { const rect = element.getBoundingClientRect(); return rect.left >= -1 && rect.right <= window.innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1; }))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("saas-landing.png"), fullPage: true });
  await page.getByRole("link", { name: "Explorar demonstração local", exact: true }).click();
  await expect(page).toHaveURL(/\/o\/demo-organizadora-a$/);
  await expect(page.locator(".topbar .brand")).toContainText("Organizadora Demonstrativa A");
  await expect(page.locator(".public-trip-card")).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator(".public-trip-card")).toHaveCount(5);
  await page.goto("/saas");
  await page.getByRole("link", { name: "Acesso da organizadora", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
