import { expect, test } from "@playwright/test";
import { seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (() => Promise<void>) | undefined;
test.afterEach(async () => { await dispose?.(); });
test("finance fits the actual client width with a reserved classic scrollbar gutter", async ({ page, context }) => {
  dispose = await seedSyntheticEnvironment(); const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto("/admin/login"); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click(); await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/financeiro"); await expect(page.getByRole("heading", { name: "Financeiro", exact: true })).toBeVisible();
  await page.addStyleTag({ content: "html { overflow-y: scroll; scrollbar-gutter: stable; }" });
  const geometry = await page.evaluate(() => ({ viewport: innerWidth, available: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(geometry.available).toBeLessThanOrEqual(geometry.viewport); expect(geometry.scroll).toBeLessThanOrEqual(geometry.available); expect(errors).toEqual([]);
});
