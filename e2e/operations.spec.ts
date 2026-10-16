import { test, expect, type Page } from "@playwright/test";
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
async function login(page: Page) {
  await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/);
}
test("audited boarding reverses, survives refresh and never carries history from tenant A to B", async ({ page }) => {
  await patchSyntheticMembership("org-b", "tenant_owner"); await login(page); await page.goto("/admin/check-in/ride-a");
  const history = page.locator(".operational-history");
  await page.getByRole("button", { name: "Embarcar", exact: true }).click(); await expect(history).toContainText("Embarque registrado");
  page.once("dialog", (dialog) => dialog.accept()); await page.getByRole("button", { name: "Embarcou", exact: true }).click();
  await expect(history).toContainText("Embarque desfeito"); await page.reload(); await expect(history.locator("li")).toHaveCount(2);
  await page.getByLabel("Organização ativa").selectOption("org-b"); await page.goto("/admin/check-in/ride-b");
  await expect(history).not.toContainText("AAAAAAAA"); await expect(history.locator("li")).toHaveCount(0);
  await page.getByRole("button", { name: "Embarcar", exact: true }).click(); await expect(history).toContainText("CCCCCCCC");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test("offline staff does not queue a fake boarding and can retry once online", async ({ page, context }) => {
  await patchSyntheticMembership("org-a", "staff"); await login(page); await page.goto("/admin/check-in/ride-a");
  await expect(page.getByRole("button", { name: "Embarcar", exact: true })).toBeVisible();
  await context.setOffline(true); await page.getByRole("button", { name: "Embarcar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Sem conexão");
  await expect(page.getByRole("button", { name: "Embarcou", exact: true })).toHaveCount(0);
  await context.setOffline(false); await page.getByRole("button", { name: "Embarcar", exact: true }).click();
  await expect(page.locator(".operational-history li")).toHaveCount(1); await page.reload();
  await expect(page.getByRole("button", { name: "Embarcou", exact: true })).toBeVisible();
  await expect(page.locator(".operational-history li")).toHaveCount(1);
});
