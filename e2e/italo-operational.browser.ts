import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { seedSyntheticEnvironment, testAccount } from './fixtures';
import { activationFixture } from '../scripts/tests/tenant-activation-fixture.mjs';
let env: RulesTestEnvironment, dispose: (() => Promise<void>) | undefined, owner: string;
let failures: string[];
const sourceId = 'a'.repeat(64), knownId = 'f'.repeat(64), unknownId = 'e'.repeat(64), base = '/tenant-italo';
const ledgerPath = 'organizations/italo/tenantCutovers/operational-v1';
const grant = { version: 'italo-operational-cutover-v1', copyPlanHash: '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10',
  sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', sourceCaravanId: 'ride-a', targetCaravanId: 'copied-ride', sourceSlug: 'original-trip', targetSlug: 'copied-trip',
  phase: 'target_active', writerOrganizationId: 'italo', generation: 3, operationalIntentConfirmed: true, everActivated: true, capacityCeiling: 3 };
test.beforeEach(async ({ context, page }) => {
  failures = []; dispose = await seedSyntheticEnvironment();
  env = await initializeTestEnvironment({ projectId: 'demo-caravana77-test', firestore: { rules: readFileSync('firestore.italo-operational.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore(); owner = (await getDocs(collection(db, 'admins'))).docs[0].id;
    const original = (await getDoc(doc(db, 'caravans/ride-a'))).data()!;
    const passenger = (await getDoc(doc(db, 'registrations', sourceId))).data()!;
    const definitions = {
      [`admins/${owner}`]: { organizationId: 'caravana-77' },
      'organizations/italo': { name: 'Ítalo fictício', importPending: false, status: 'active' },
      [`memberships/${owner}/organizations/italo`]: { uid: owner, organizationId: 'italo', role: 'tenant_owner', status: 'active' },
      'organizations/italo/tenantActivations/private-v1': { mode: 'private_history_only', copyPlanHash: grant.copyPlanHash },
      'publicTenantSettings/italo': activationFixture().review.branding,
      'tenantSlugs/italo': { slug: 'italo', organizationId: 'italo' },
      'organizationAvailability/italo': { organizationId: 'italo', status: 'active' },
      'tenantUsage/italo': { organizationId: 'italo', version: 'commercial-v1', publishedCaravans: 1, activeMembers: 1, activeOwners: 1 },
      [ledgerPath]: grant, 'publicTenantCutovers/italo': grant,
      'caravans/ride-a': { ...original, organizationId: 'caravana-77', slug: 'original-trip', date: '2020-01-01' },
      'caravans/copied-ride': { ...original, id: 'copied-ride', organizationId: 'italo', name: 'Evento operacional fictício', slug: 'copied-trip', status: 'published', date: '2020-01-01', importPending: false, capacity: 3, reservedSeats: 2 },
      [`registrations/${sourceId}`]: { ...passenger, organizationId: 'caravana-77' },
      [`registrations/${knownId}`]: { ...passenger, id: knownId, organizationId: 'italo', caravanId: 'copied-ride', passengerName: 'Passageiro conhecido fictício', paymentTotalCents: 0, registrationStatus: 'confirmed', paymentStatus: 'approved', proofId: 'current' },
      [`registrations/${unknownId}`]: { ...passenger, id: unknownId, organizationId: 'italo', caravanId: 'copied-ride', passengerName: 'Passageiro desconhecido fictício', paymentTotalCents: null, registrationStatus: 'awaiting_payment', paymentStatus: 'pending' },
      [`registrations/${knownId}/proofs/current`]: { registrationId: knownId, organizationId: 'italo', caravanId: 'copied-ride', contentType: 'application/pdf', fileName: 'synthetic.pdf', content: Buffer.from('%PDF-1.4\nSYNTHETIC').toString('base64') },
      ...Object.fromEntries([sourceId, knownId].map(lookupId => [`legacyRegistrationAliases/${lookupId}`, { lookupId, sourceId, targetId: knownId, organizationId: 'italo', targetCaravanId: 'copied-ride', copyPlanHash: grant.copyPlanHash }])),
    };
    for (const [path, data] of Object.entries(definitions)) await setDoc(doc(db, path), data);
  });
  page.on('pageerror', () => failures.push('runtime_error'));
  await context.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    if (['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com'].includes(hostname)) failures.push('remote_firebase');
    return ['localhost', '127.0.0.1'].includes(hostname) ? route.continue() : route.abort();
  });
});
test.afterEach(async () => { await env?.cleanup(); await dispose?.(); expect(failures).toEqual([]); });
async function freeze() {
  await env.withSecurityRulesDisabled(async ctx => {
    for (const path of [ledgerPath, 'publicTenantCutovers/italo']) await updateDoc(doc(ctx.firestore(), path), { phase: 'frozen', writerOrganizationId: '', generation: 4 });
  });
}
test('owner operates the existing event, preserves UNKNOWN and proof, then freezes and revokes the same session', async ({ page }) => {
  await page.goto(`${base}/admin/login`); await page.getByLabel(/E-mail/).fill(testAccount.email); await page.getByLabel(/Senha/).fill(testAccount.password);
  await page.getByRole('button', { name: 'Entrar no painel' }).click(); await expect(page).toHaveURL(new RegExp(`${base}/admin$`));
  await page.goto(`${base}/admin/financeiro`);
  const unknown = page.locator('.finance-passenger-row').filter({ hasText: 'Passageiro desconhecido fictício' }); await expect(unknown).toContainText('Não conciliado');
  const known = page.locator('.finance-passenger-row').filter({ hasText: 'Passageiro conhecido fictício' });
  await known.getByRole('button', { name: 'Registrar', exact: true }).click(); await page.getByLabel('Valor recebido (R$)', { exact: true }).fill('1,00');
  await page.getByRole('button', { name: 'Salvar pagamento', exact: true }).click(); await expect(known).toContainText('1,00');
  await page.goto(`${base}/admin/caravanas`); await expect(page.getByRole('button', { name: 'Duplicar', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Editar', exact: true }).click(); await page.getByLabel('Nome da caravana', { exact: false }).fill('Evento operacional atualizado');
  await page.getByRole('button', { name: /Salvar alterações/ }).click(); await expect(page.getByText('Evento operacional atualizado', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Passageiros/ }).click();
  await page.getByRole('row').filter({ hasText: 'Passageiro conhecido fictício' }).getByRole('button', { name: 'Comprovante', exact: true }).click();
  await expect(page.locator('iframe[title="Comprovante privado"]')).toHaveAttribute('src', /^blob:/); await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.goto(`${base}/admin/check-in/copied-ride`);
  const checked = page.locator('.checkin-person').filter({ hasText: 'Passageiro conhecido fictício' }); await checked.getByRole('button', { name: 'Embarcar', exact: true }).click(); await expect(checked).toHaveClass(/checked-in/);
  await freeze(); await expect(page.getByText(/A operação está em atualização/)).toBeVisible(); await expect(checked.getByRole('button')).toBeDisabled();
  await page.goto(`${base}/admin/financeiro`); await expect(unknown).toContainText('Não conciliado'); await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0);
  await env.withSecurityRulesDisabled(async ctx => {
    expect((await getDoc(doc(ctx.firestore(), 'registrations', unknownId))).data()?.paymentTotalCents).toBeNull();
    expect((await getDoc(doc(ctx.firestore(), 'registrations', knownId))).data()?.paymentTotalCents).toBe(100);
    expect((await getDoc(doc(ctx.firestore(), 'caravans/ride-a'))).data()?.reservedSeats).toBe(1);
    expect((await getDoc(doc(ctx.firestore(), 'subscriptions/italo'))).exists()).toBe(false);
    await updateDoc(doc(ctx.firestore(), `memberships/${owner}/organizations/italo`), { status: 'revoked' });
  });
  await expect(page.getByRole('heading', { name: 'Conta ainda não autorizada' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
test('public old link resolves without spinning; an uncommitted old attempt books one target seat and freezes to query-only', async ({ page }) => {
  await page.goto(`${base}/o/italo/minha-inscricao/${sourceId}`); await expect(page.getByRole('heading', { name: 'Oi, Passageiro!', exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole('heading', { name: 'Oi, Passageiro!', exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('caravana77:reservation-attempt:v1:ride-a', JSON.stringify({ registrationId: '7'.repeat(64), reservationNonce: '8'.repeat(64) })));
  await page.goto(`${base}/o/italo/caravana/original-trip/inscricao`);
  await page.getByLabel(/Nome completo/).fill('Nova pessoa fictícia'); await page.getByLabel(/WhatsApp/).fill('11900000002');
  await page.getByLabel('Cidade', { exact: false }).fill('Cidade fictícia'); await page.getByLabel(/Ponto de embarque/).selectOption('point-a');
  await page.getByLabel(/Contato de emergência/).fill('Contato fictício'); await page.getByRole('button', { name: 'Garantir minha vaga', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/o/italo/minha-inscricao/${'7'.repeat(64)}$`)); await expect(page.getByRole('heading', { name: 'Oi, Nova!', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('caravana77:reservation-attempt:v1:ride-a'))).toBeNull();
  await freeze(); await expect(page.getByText(/Novos envios aguardam/)).toBeVisible(); await expect(page.locator('input[type="file"]')).toBeDisabled();
  await env.withSecurityRulesDisabled(async ctx => {
    expect((await getDoc(doc(ctx.firestore(), 'caravans/copied-ride'))).data()?.reservedSeats).toBe(3);
    expect((await getDoc(doc(ctx.firestore(), 'caravans/ride-a'))).data()?.reservedSeats).toBe(1);
    expect((await getDocs(query(collection(ctx.firestore(), 'registrations'), where('caravanId', '==', 'copied-ride')))).size).toBe(3);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
