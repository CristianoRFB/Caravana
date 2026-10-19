import { test, expect, type Page } from "@playwright/test";
import { inspectSyntheticBookings, patchSyntheticTrip, patchSyntheticCommercial, seedSyntheticEnvironment } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  await patchSyntheticTrip({ capacity: 2 });
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function fill(page: Page, name = "Pessoa de retry sintético") {
  await page.getByLabel(/Nome completo/).fill(name);
  await page.getByLabel(/WhatsApp/).fill("11900000002");
  await page.getByLabel("Cidade", { exact: false }).fill("Cidade fictícia");
  await page.getByLabel(/Ponto de embarque/).selectOption("point-a");
  await page.getByLabel(/Contato de emergência/).fill("Contato sintético 11900000003");
}
test("a persisted committed attempt survives reload and recovers the same final-seat registration", async ({ page }) => {
  // Simulate loss of local completion cleanup after a genuine server commit. No SDK mock.
  await page.addInitScript(() => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (key.startsWith("caravana77:reservation-attempt:")) throw new Error("Synthetic cleanup interruption");
      original.call(this, key);
    };
  });
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await fill(page);
  await page.getByRole("button", { name: "Garantir minha vaga" }).click();
  await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/); const committedUrl = page.url();
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await page.reload(); await fill(page);
  await page.getByRole("button", { name: "Verificar minha reserva" }).click();
  await expect(page).toHaveURL(committedUrl);
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 2, registrationCount: 2 });
  // A changed request reuses the operation and points at the existing record, never creates a third.
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await fill(page, "Outra pessoa sintética");
  await page.getByRole("button", { name: "Verificar minha reserva" }).click();
  await expect(page.getByRole("alert")).toContainText("outros dados");
  await expect(page.getByLabel(/Nome completo/)).toHaveValue("Outra pessoa sintética");
  await page.getByRole("link", { name: "Consultar inscrição existente" }).click();
  await expect(page).toHaveURL(committedUrl);
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 2, registrationCount: 2 });
});
test("field validation leaves the form editable and the same passenger can correct and submit", async ({ page }) => {
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await fill(page);
  await page.getByLabel(/CPF/).fill("11111111111");
  await page.getByRole("button", { name: "Garantir minha vaga" }).click();
  await expect(page.getByRole("alert")).toContainText("Confira o CPF");
  await expect(page.getByLabel(/Nome completo/)).toHaveValue("Pessoa de retry sintético");
  await page.getByLabel(/CPF/).fill("");
  await page.getByRole("button", { name: "Garantir minha vaga" }).click();
  await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/);
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 2, registrationCount: 2 });
});
test("commercial passenger quota blocks A growth while preserving its private link and allowing B reservations", async ({ page }) => {
  await patchSyntheticTrip({ capacity: 100, reservedSeats: 59 }); await patchSyntheticCommercial("org-a", "essencial");
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await fill(page);
  await page.getByRole("button", { name: "Garantir minha vaga" }).click(); await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/); const privateUrl = page.url();
  await page.goto("/caravana/sintetica-ride-a/inscricao"); await fill(page);
  await expect(page.getByRole("button", { name: "Vagas esgotadas", exact: true })).toBeDisabled();
  await patchSyntheticCommercial("org-a", "essencial", false); await page.goto(privateUrl); await expect(page.getByRole("heading", { name: "Oi, Pessoa!", exact: true })).toBeVisible();
  await page.goto("/caravana/sintetica-ride-b/inscricao"); await fill(page, "Pessoa sintética B independente");
  await page.getByRole("button", { name: "Garantir minha vaga" }).click(); await expect(page).toHaveURL(/\/minha-inscricao\/[a-f0-9]{64}$/);
  expect(await inspectSyntheticBookings()).toEqual({ reservedSeats: 60, registrationCount: 2 });
});
