import { test, expect } from "@playwright/test";
import { seedSyntheticEnvironment } from "./fixtures";
import { seedDemoAccounts } from "../scripts/seed-demo.mjs";
import { DEMO_ACCOUNTS } from "../src/lib/demo-identities";

let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = [];
  dispose = await seedSyntheticEnvironment();
  await seedDemoAccounts();
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });

test("fixed owner signs in with the Auth Emulator and sees only demonstration A finance", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel(/E-mail/).fill(DEMO_ACCOUNTS.owner.email);
  await page.getByLabel(/Senha/).fill(DEMO_ACCOUNTS.owner.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-content")).toHaveAttribute("data-org", "demo-org-a");
  await page.goto("/admin/financeiro");
  await expect(page.locator(".finance-summary-card").filter({ has: page.getByText("Recebido registrado", { exact: true }) }).locator("strong")).toContainText("25,00");
  await expect(page.getByLabel("Mostrar dados de")).not.toContainText("demonstrativa B");
});

test("fixed passenger signs in, opens the seeded private registration and has no admin access", async ({ page }) => {
  await page.goto("/conta/entrar");
  await page.getByLabel(/E-mail/).fill(DEMO_ACCOUNTS.passenger.email);
  await page.getByLabel(/Senha/).fill(DEMO_ACCOUNTS.passenger.password);
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole("heading", { name: "Passageiro de demonstração" })).toBeVisible();
  await page.getByRole("link", { name: /Abrir inscrição/ }).click();
  await expect(page.getByRole("heading", { name: "Oi, Passageiro!" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Conta ainda não autorizada" })).toBeVisible();
});
