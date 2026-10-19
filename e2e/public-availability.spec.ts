import { expect, test } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { patchSyntheticCommercial, patchSyntheticTrip, seedSyntheticEnvironment } from "./fixtures";

let dispose: (() => Promise<void>) | undefined;
let failures: string[];
test.beforeEach(async ({ page, context }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  await patchSyntheticTrip({ capacity: 100, reservedSeats: 59 });
  await patchSyntheticCommercial("org-a", "essencial");
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(hostname)) failures.push(`Remote Firebase: ${hostname}`);
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await dispose?.(); expect(failures).toEqual([]); });
async function syntheticPolicyChange(change: "suspend" | "expire") {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Exact local emulator required");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try { await env.withSecurityRulesDisabled(async (ctx) => {
    if (change === "suspend") await setDoc(doc(ctx.firestore(), "organizationAvailability/org-a"), { organizationId: "org-a", status: "suspended" });
    else await updateDoc(doc(ctx.firestore(), "tenantEntitlements/org-a"), { growthUntil: Timestamp.fromMillis(Date.now() + 3000) });
  }); } finally { await env.cleanup(); }
}
test("catalog and trip show commercial seats live while another organization remains independent", async ({ page }, testInfo) => {
  await page.goto("/");
  const card = page.locator('.public-trip-card[href="/caravana/sintetica-ride-a"]');
  await expect(card).toContainText("1 vaga disponível");
  await patchSyntheticTrip({ reservedSeats: 60 });
  await expect(card).toContainText("Vagas esgotadas");
  await expect(page.locator('.public-trip-card[href="/caravana/sintetica-ride-b"]')).toContainText("24 vagas disponíveis");
  await page.goto("/caravana/sintetica-ride-a");
  await expect(page.locator(".fact").filter({ hasText: "VAGAS" })).toContainText("Vagas esgotadas");
  await patchSyntheticTrip({ reservedSeats: 75 });
  await expect(page.locator(".fact").filter({ hasText: "VAGAS" })).toContainText("Vagas esgotadas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath("commercial-availability.png"), fullPage: true });
});
test("suspension and expiration disable new bookings live without clearing the passenger draft", async ({ page }, testInfo) => {
  await page.goto("/caravana/sintetica-ride-a/inscricao");
  await expect(page.getByRole("button", { name: "Garantir minha vaga", exact: true })).toBeEnabled();
  await page.getByLabel(/Nome completo/).fill("Rascunho preservado");
  await syntheticPolicyChange("expire");
  await expect(page.getByRole("button", { name: "Novas reservas indisponíveis no momento", exact: true })).toBeDisabled();
  await expect(page.getByLabel(/Nome completo/)).toHaveValue("Rascunho preservado");
  await patchSyntheticCommercial("org-a", "pro");
  await expect(page.getByRole("button", { name: "Garantir minha vaga", exact: true })).toBeEnabled();
  await syntheticPolicyChange("suspend");
  await expect(page.getByRole("button", { name: "Novas reservas indisponíveis no momento", exact: true })).toBeDisabled();
  await expect(page.getByLabel(/Nome completo/)).toHaveValue("Rascunho preservado");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath("commercial-availability.png"), fullPage: true });
});
