import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { seedSyntheticEnvironment } from "./fixtures";
import { seedDemoAccounts } from "../scripts/seed-demo.mjs";
import { DEMO_ACCOUNTS } from "../src/lib/demo-identities";
let dispose: (() => Promise<void>) | undefined; let seed: Awaited<ReturnType<typeof seedDemoAccounts>>; let failures: string[];
const contexts: BrowserContext[] = [];
async function protect(page: Page, context: BrowserContext) {
  page.on("pageerror", (error) => failures.push(error.message));
  await context.route("**/*", (route) => { const host = new URL(route.request().url()).hostname; if (["firestore.googleapis.com", "identitytoolkit.googleapis.com", "securetoken.googleapis.com"].includes(host)) failures.push(`Remote Firebase: ${host}`); return ["127.0.0.1", "localhost"].includes(host) ? route.continue() : route.abort(); });
}
test.beforeEach(async ({ page, context }) => { failures = []; dispose = await seedSyntheticEnvironment(); seed = await seedDemoAccounts();
  // This suite uses only the two demo tenants. The baseline fixture also grants
  // owner a separate legacy tenant; its live access is covered in baseline.spec.
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try { await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), "admins", seed.accounts.owner.uid))); } finally { await env.cleanup(); }
  await protect(page, context); });
test.afterEach(async () => { for (const context of contexts.splice(0)) await context.close(); await dispose?.(); expect(failures).toEqual([]); });
async function login(page: Page, key: keyof typeof DEMO_ACCOUNTS, admin = false) {
  await page.goto(admin ? "/admin/login" : "/conta/entrar"); await page.getByLabel(/E-mail/).fill(DEMO_ACCOUNTS[key].email); await page.getByLabel(/Senha/).fill(DEMO_ACCOUNTS[key].password);
  await page.getByRole("button", { name: admin ? "Entrar no painel" : "Entrar na conta", exact: true }).click(); await expect(page).toHaveURL(admin ? /\/admin$/ : /\/conta$/);
}
async function issue(page: Page, uid: string, role = "staff") {
  await page.getByLabel("UID da conta convidada", { exact: true }).fill(uid); await page.getByRole("combobox", { name: "Papel do convite", exact: true }).selectOption(role); await page.getByLabel("Motivo do convite", { exact: true }).fill("UID conferido para teste sintético");
  await page.getByLabel("Conferi o UID de uma conta existente e o papel que desejo conceder.", { exact: true }).check(); await page.getByRole("button", { name: "Criar convite", exact: true }).click(); await expect(page.getByText("Convite registrado. Acesso só será concedido após o aceite do destinatário.", { exact: true })).toBeVisible();
}
const member = (page: Page, uid: string) => page.getByRole("article", { name: `Integrante ${uid}`, exact: true });
async function revokeMember(page: Page, uid: string) { const card = member(page, uid); await card.getByLabel(`Motivo da alteração de ${uid}`, { exact: true }).fill("Revogação sintética conferida"); await card.getByRole("button", { name: "Revogar acesso", exact: true }).click(); await expect(card).toContainText("Revogado"); }
async function patch(policy: "expired" | "blocked" | "suspended" | "active") {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Only isolated emulator");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try { await env.withSecurityRulesDisabled(async (ctx) => {
    if (policy === "expired") { for (const path of [`tenantInvitations/demo-org-a/users/${seed.accounts.passenger.uid}`, `invitationInboxes/${seed.accounts.passenger.uid}/organizations/demo-org-a`]) await updateDoc(doc(ctx.firestore(), path), { expiresAt: Timestamp.fromMillis(Date.now() - 1000) }); }
    else if (policy === "suspended") { await updateDoc(doc(ctx.firestore(), "organizations/demo-org-a"), { status: "suspended" }); await updateDoc(doc(ctx.firestore(), "organizationAvailability/demo-org-a"), { status: "suspended" }); }
    else await updateDoc(doc(ctx.firestore(), "tenantEntitlements/demo-org-a"), { growthEnabled: policy === "active" });
  }); } finally { await env.cleanup(); }
}
test("owner invites the exact Auth UID, staff accepts once and revocation removes an open panel immediately", async ({ page, browser }, testInfo) => {
  await login(page, "owner", true); await page.goto("/admin/equipe"); await issue(page, seed.accounts.passenger.uid);
  await expect(member(page, seed.accounts.passenger.uid)).toHaveCount(0);
  const guestContext = await browser.newContext({ viewport: page.viewportSize()! }); contexts.push(guestContext); const guest = await guestContext.newPage(); await protect(guest, guestContext); await login(guest, "passenger"); await guest.goto("/conta/convites");
  await expect(guest.getByText(seed.accounts.passenger.uid, { exact: true })).toBeVisible(); await guest.getByRole("button", { name: "Aceitar convite", exact: true }).click(); await expect(guest.getByText("Convite aceito. Seu acesso à organização foi registrado.", { exact: true })).toBeVisible();
  await guest.reload(); await expect(guest.getByRole("button", { name: "Aceitar convite", exact: true })).toHaveCount(0); await guest.getByRole("link", { name: "Abrir painel da organização", exact: true }).click(); await expect(guest.locator(".admin-content")).toHaveAttribute("data-org", "demo-org-a");
  await guest.goto("/admin/equipe"); await expect(guest.getByText(/Somente responsáveis podem gerenciar a equipe/)).toBeVisible(); await expect(guest.getByRole("button", { name: "Criar convite", exact: true })).toHaveCount(0);
  await expect(member(page, seed.accounts.passenger.uid)).toContainText("Equipe operacional · Ativo"); await revokeMember(page, seed.accounts.passenger.uid); await expect(guest.getByRole("heading", { name: "Conta ainda não autorizada", exact: true })).toBeVisible();
  await guest.getByRole("link", { name: "Meus convites", exact: true }).click(); await expect(guest).toHaveURL(/\/conta\/convites$/); await expect(guest.getByRole("button", { name: "Aceitar convite", exact: true })).toHaveCount(0);
  await expect(page.getByText("Convite aceito", { exact: true })).toBeVisible(); await expect(page.getByText("Acesso alterado", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: testInfo.outputPath("team-owner.png"), fullPage: true });
});
test("resend changes generation and role; an accepted owner cannot demote the last responsible member", async ({ page, browser }) => {
  await login(page, "owner", true); await page.goto("/admin/equipe"); await issue(page, seed.accounts.passenger.uid);
  const invitation = page.getByRole("article", { name: `Convite ${seed.accounts.passenger.uid}`, exact: true }); await invitation.getByRole("button", { name: "Reenviar convite", exact: true }).click(); await page.getByRole("combobox", { name: "Papel do convite", exact: true }).selectOption("tenant_owner"); await page.getByLabel("Motivo do convite", { exact: true }).fill("Reenvio com novo papel conferido"); await page.getByLabel("Conferi o UID de uma conta existente e o papel que desejo conceder.", { exact: true }).check(); await page.getByRole("button", { name: "Confirmar reenvio", exact: true }).click(); await expect(invitation).toContainText("Responsável · Pendente · geração 2");
  const context = await browser.newContext({ viewport: page.viewportSize()! }); contexts.push(context); const guest = await context.newPage(); await protect(guest, context); await login(guest, "passenger"); await guest.goto("/conta/convites"); await guest.getByRole("button", { name: "Aceitar convite", exact: true }).click(); await expect(guest.getByText("Convite aceito. Seu acesso à organização foi registrado.", { exact: true })).toBeVisible();
  const originalOwner = member(page, seed.accounts.owner.uid); await originalOwner.getByLabel(`Motivo da alteração de ${seed.accounts.owner.uid}`, { exact: true }).fill("Transferir a responsabilidade"); await originalOwner.getByRole("button", { name: "Revogar acesso", exact: true }).click(); await expect(page.getByRole("heading", { name: "Conta ainda não autorizada", exact: true })).toBeVisible();
  await guest.goto("/admin/equipe"); const own = member(guest, seed.accounts.passenger.uid); await own.getByRole("combobox", { name: `Papel de ${seed.accounts.passenger.uid}`, exact: true }).selectOption("staff"); await own.getByLabel(`Motivo da alteração de ${seed.accounts.passenger.uid}`, { exact: true }).fill("Teste de proteção do último owner"); await own.getByRole("button", { name: "Salvar papel", exact: true }).click(); await expect(guest.getByRole("alert")).toContainText("responsável ativo");
  expect(await guest.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(guest.viewportSize()!.width);
});
test("two real invited accounts race for the final slot, the loser remains pending and tenant B keeps its access", async ({ page, browser }) => {
  await login(page, "owner", true); await page.goto("/admin/equipe"); await issue(page, seed.accounts.passenger.uid); await issue(page, seed.accounts.ownerB.uid);
  const guests: Page[] = [];
  for (const key of ["passenger", "ownerB"] as const) { const context = await browser.newContext({ viewport: page.viewportSize()! }); contexts.push(context); const guest = await context.newPage(); await protect(guest, context); await login(guest, key); await guest.goto("/conta/convites"); guests.push(guest); }
  await Promise.all(guests.map((guest) => guest.getByRole("button", { name: "Aceitar convite", exact: true }).click()));
  await expect(async () => { const success = await Promise.all(guests.map((guest) => guest.getByText("Convite aceito. Seu acesso à organização foi registrado.", { exact: true }).count())); expect(success.reduce((sum, value) => sum + value, 0)).toBe(1); }).toPass({ timeout: 15000 });
  const winnerIndex = await guests[0].getByText("Convite aceito. Seu acesso à organização foi registrado.", { exact: true }).count() ? 0 : 1; const loser = guests[1 - winnerIndex]; const winnerUid = winnerIndex === 0 ? seed.accounts.passenger.uid : seed.accounts.ownerB.uid;
  await expect(loser.getByRole("alert")).toContainText("continua pendente"); await expect(page.getByText("2 integrantes ativos · limite 2.", { exact: true })).toBeVisible();
  await revokeMember(page, winnerUid); await loser.getByRole("button", { name: "Aceitar convite", exact: true }).click(); await expect(loser.getByText("Convite aceito. Seu acesso à organização foi registrado.", { exact: true })).toBeVisible();
  await guests[1].goto("/admin"); await expect(guests[1].locator(".admin-content")).toBeVisible(); const switcher = guests[1].getByLabel("Organização ativa"); if (await switcher.count()) { const menu = guests[1].getByRole("button", { name: "Menu", exact: true }); if (await menu.isVisible()) await menu.click(); await switcher.selectOption("demo-org-b"); } await expect(guests[1].locator(".admin-content")).toHaveAttribute("data-org", "demo-org-b");
});
test("expired, revoked and commercially blocked invitations never grant access and drafts survive errors", async ({ page, browser }) => {
  await login(page, "owner", true); await page.goto("/admin/equipe"); await issue(page, seed.accounts.passenger.uid); await patch("expired");
  const context = await browser.newContext({ viewport: page.viewportSize()! }); contexts.push(context); const guest = await context.newPage(); await protect(guest, context); await login(guest, "passenger"); await guest.goto("/conta/convites"); await expect(guest.getByText(/Equipe operacional · Expirado/)).toBeVisible(); await expect(guest.getByRole("button", { name: "Aceitar convite", exact: true })).toHaveCount(0);
  const inviteCard = page.getByRole("article", { name: `Convite ${seed.accounts.passenger.uid}`, exact: true }); await inviteCard.getByRole("button", { name: "Reenviar convite", exact: true }).click(); await page.getByLabel("Motivo do convite", { exact: true }).fill("Renovar convite expirado"); await page.getByLabel("Conferi o UID de uma conta existente e o papel que desejo conceder.", { exact: true }).check(); await page.getByRole("button", { name: "Confirmar reenvio", exact: true }).click(); await expect(inviteCard).toContainText("geração 2");
  await patch("blocked"); await guest.getByRole("button", { name: "Aceitar convite", exact: true }).click(); await expect(guest.getByRole("alert")).toContainText("continua pendente");
  await patch("active"); await patch("suspended"); await guest.getByRole("button", { name: "Aceitar convite", exact: true }).click(); await expect(guest.getByRole("alert")).toContainText("suspensa");
  await inviteCard.getByRole("button", { name: "Revogar convite", exact: true }).click(); await expect(guest.getByText(/Equipe operacional · Revogado/)).toBeVisible(); await expect(guest.getByRole("button", { name: "Aceitar convite", exact: true })).toHaveCount(0);
});
