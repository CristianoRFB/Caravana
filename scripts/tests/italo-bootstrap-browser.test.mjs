// Compiles only the bootstrap; every external request is fulfilled or aborted.
// Application entries are synthetic markers, not production Firebase clients.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { chromium } from 'playwright';
import { bootstrapHtml } from '../package-italo-operational.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceId = 'a'.repeat(64), targetId = 'b'.repeat(64), freshId = 'c'.repeat(64);
const grant = { version: 'italo-operational-cutover-v1', copyPlanHash: '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10', sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo',
  sourceCaravanId: 'original-event', targetCaravanId: 'copied-event', sourceSlug: 'original-trip', targetSlug: 'copied-trip', phase: 'target_active', writerOrganizationId: 'italo', generation: 3, operationalIntentConfirmed: true, everActivated: true, capacityCeiling: 60 };
const raw = data => ({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }])) });
test('compiled public bootstrap routes safely at four viewport widths with no external network', { timeout: 90000 }, async t => {
  const parent = path.resolve('.firebase'); await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'italo-bootstrap-synthetic-'));
  await build({ configFile: false, mode: 'e2e', logLevel: 'error', build: { outDir: directory, rollupOptions: { input: { bootstrap: 'src/italo-bootstrap.ts' } } } });
  const files = new Map();
  for (const name of await readdir(path.join(directory, 'assets'))) files.set('/tenant-italo/assets/' + name, await readFile(path.join(directory, 'assets', name)));
  const bootstrapPath = [...files.keys()].find(name => /\/bootstrap-[A-Za-z0-9_-]+\.js$/.test(name)); assert(bootstrapPath);
  const entry = (name, label) => {
    const pathname = name === 'legacy' ? '/assets/legacy-test.js' : '/tenant-italo/assets/' + name + '-test.js';
    const bytes = Buffer.from(`document.getElementById('root').textContent=${JSON.stringify(label)};window.__app=${JSON.stringify(name)};`);
    files.set(pathname, bytes); return { path: pathname, sha256: sha(bytes) };
  };
  const css = Buffer.from('body{margin:0;font-family:system-ui}main{max-width:100%;padding:16px}a{display:block;overflow-wrap:anywhere}.public-trip-grid{display:grid;gap:16px}');
  files.set('/assets/test-style.css', css); const styles = [{ path: '/assets/test-style.css', sha256: sha(css) }];
  const runtimePath = '/tenant-italo/runtime-dddddddddddd.json';
  files.set(runtimePath, Buffer.from(JSON.stringify({ version: 'italo-bootstrap-v1', source: 'd'.repeat(40), projectId: 'caravana-af306',
    legacy: { entry: entry('legacy', 'LEGACY_APPLICATION'), styles }, privateHistory: { entry: entry('private', 'PRIVATE_HISTORY_APPLICATION'), styles }, operational: { entry: entry('operational', 'TARGET_APPLICATION'), styles } })));
  const html = bootstrapHtml({ path: bootstrapPath, sha256: sha(files.get(bootstrapPath)) }, runtimePath);
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const bytes = files.get(pathname) ?? html; response.setHeader('Content-Type', files.has(pathname) ? pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'application/json' : 'text/html');
    response.setHeader('Cache-Control', 'no-store'); response.end(bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 375, 768, 1440]) await t.test(`routing and negative transport at width ${width}`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage();
      let directory = grant, missing = false, deniedAlias = false, status = 200; const unexpected = [];
      await context.route('**/*', async route => {
        const url = new URL(route.request().url()); if (url.origin === origin) { await route.continue(); return; }
        if (url.hostname !== 'firestore.googleapis.com') { unexpected.push(url.origin); await route.abort(); return; }
        const base = '/v1/projects/caravana-af306/databases/(default)/documents';
        if (url.pathname === base + '/publicTenantCutovers/italo') { await route.fulfill({ status: missing ? 404 : status, json: raw(directory) }); return; }
        if (url.pathname === base + '/legacyRegistrationAliases/' + sourceId || url.pathname === base + '/legacyRegistrationAliases/' + targetId) {
          if (deniedAlias) { await route.fulfill({ status: 403, json: {} }); return; }
          const lookupId = url.pathname.split('/').at(-1); await route.fulfill({ json: raw({ lookupId, sourceId, targetId, organizationId: 'italo', targetCaravanId: 'copied-event', copyPlanHash: grant.copyPlanHash }) }); return;
        }
        if (url.pathname === base + '/legacyRegistrationAliases/' + freshId) { await route.fulfill({ status: 404, json: {} }); return; }
        if (url.pathname === base + '/registrations/' + freshId) { await route.fulfill({ json: raw({ organizationId: 'italo', caravanId: 'copied-event' }) }); return; }
        if (url.pathname === base + ':runQuery' && route.request().method() === 'POST') {
          await route.fulfill({ json: ['original-event', 'copied-event', 'other-event'].map((id, i) => ({ document: { name: 'projects/caravana-af306/databases/(default)/documents/caravans/' + id,
            ...raw({ name: i === 2 ? 'Other client event' : 'Synthetic Italo event', organizationId: i === 2 ? 'other' : i === 1 ? 'italo' : 'caravana-77', slug: i === 2 ? 'other-trip' : i === 1 ? 'copied-trip' : 'original-trip', status: 'published', priceCents: 7500, date: '2020-01-01' }) } })) }); return;
        }
        unexpected.push(url.pathname); await route.abort();
      });
      missing = true;
      await page.goto(origin + '/caravana/original-trip'); await page.waitForFunction(() => document.body.textContent.includes('LEGACY_APPLICATION'));
      await page.goto(origin + '/tenant-italo/admin/login'); await page.waitForFunction(() => document.body.textContent.includes('PRIVATE_HISTORY_APPLICATION'));
      missing = false;
      await page.goto(origin + '/caravana/original-trip/inscricao'); await page.waitForFunction(() => document.body.textContent.includes('TARGET_APPLICATION'));
      assert.equal(new URL(page.url()).pathname, '/tenant-italo/o/italo/caravana/copied-trip/inscricao');
      await page.goto(origin + '/minha-inscricao/' + sourceId); await page.waitForFunction(() => document.body.textContent.includes('TARGET_APPLICATION'));
      assert.equal(new URL(page.url()).pathname, '/tenant-italo/o/italo/minha-inscricao/' + targetId);
      await page.goto(origin + '/minha-inscricao/' + freshId); await page.waitForFunction(() => document.body.textContent.includes('TARGET_APPLICATION'));
      await page.goto(origin + '/caravana/other-trip'); await page.waitForFunction(() => document.body.textContent.includes('LEGACY_APPLICATION'));
      await page.goto(origin + '/'); await page.waitForSelector('.public-trip-card');
      assert.equal(await page.locator('.public-trip-card').count(), 2);
      assert.equal(await page.locator('.public-trip-card[href="/caravana/original-trip"]').count(), 0);
      assert.equal(await page.locator('.public-trip-card[href="/caravana/other-trip"]').count(), 1);
      directory = { ...grant, phase: 'frozen', writerOrganizationId: '', generation: 4 };
      await page.goto(origin + '/tenant-italo/admin'); await page.waitForFunction(() => document.body.textContent.includes('TARGET_APPLICATION'));
      directory = { ...grant, phase: 'source_active', writerOrganizationId: 'caravana-77', generation: 5 };
      await page.goto(origin + '/minha-inscricao/' + targetId); await page.waitForFunction(() => document.body.textContent.includes('LEGACY_APPLICATION'));
      assert.equal(new URL(page.url()).pathname, '/minha-inscricao/' + sourceId);
      directory = grant; deniedAlias = true;
      await page.goto(origin + '/minha-inscricao/' + targetId); await page.waitForFunction(() => document.body.textContent.includes('Estamos conferindo a disponibilidade'));
      assert.equal(await page.evaluate(() => Boolean(window.__app)), false); deniedAlias = false;
      status = 503;
      await page.goto(origin + '/caravana/original-trip'); await page.waitForFunction(() => document.body.textContent.includes('Estamos conferindo a disponibilidade'));
      assert.equal(await page.evaluate(() => Boolean(window.__app)), false);
      assert.deepEqual(unexpected, []); await context.close();
    });
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
