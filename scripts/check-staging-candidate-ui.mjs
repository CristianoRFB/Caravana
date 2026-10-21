// Offline visual smoke: every browser request is fulfilled locally or aborted.
// Never deploys, submits credentials, or connects to a Firebase backend.
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateHealthRelease } from './staging-health.mjs';
const root = new URL('../dist-staging/', import.meta.url);
const origin = 'https://caravana77-staging.pages.dev';
const release = JSON.parse(await readFile(new URL('release.json', root), 'utf8'));
const assets = validateHealthRelease(release);
const cache = new Map();
for (const file of assets) {
  const bytes = await readFile(new URL(file.path, root));
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error('Candidate artifact integrity mismatch');
  cache.set('/' + file.path, bytes);
}
const html = await readFile(new URL('index.html', root));
const htmlEntry = release.files.find(file => file.path === 'index.html');
if (!htmlEntry || htmlEntry.bytes !== html.length || htmlEntry.sha256 !== createHash('sha256').update(html).digest('hex')) throw Error('Candidate HTML integrity mismatch');
const browser = await chromium.launch({ headless: true });
const report = { status: 'IN_PROGRESS', source: release.source, kind: 'OFFLINE_CANDIDATE_UI_ONLY', deployed: false, backendJourneysVerified: false, actualNetworkRequests: 0, checks: [] };
try {
  for (const width of [320, 375, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const errors = [], unexpected = [];
    await context.routeWebSocket('**/*', socket => { unexpected.push('websocket'); socket.close(); });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== 'GET' || url.origin !== origin) {
        if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) unexpected.push('nonlocal_or_write_request');
        return route.abort();
      }
      if (['/saas', '/admin/login'].includes(url.pathname)) return route.fulfill({ body: html, contentType: 'text/html' });
      const bytes = cache.get(url.pathname);
      if (!bytes) { unexpected.push('unlisted_local_asset'); return route.abort(); }
      return route.fulfill({ body: bytes, contentType: url.pathname.endsWith('.js') ? 'application/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
    });
    const page = await context.newPage();
    page.on('pageerror', () => errors.push('browser_runtime_error'));
    for (const path of ['/saas', '/admin/login']) {
      await page.goto(origin + path);
      if (path === '/saas') {
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua próxima caravana.');
        for (const plan of ['Essencial', 'Pro', 'Premium']) await expect(page.getByRole('article', { name: plan, exact: true })).toBeVisible();
        await expect(page.getByRole('article', { name: 'Pro', exact: true })).toContainText('Central de relatórios operacionais');
        await expect(page.getByRole('article', { name: 'Premium', exact: true })).toContainText('Roteiros da equipe e modelos reutilizáveis');
        await expect(page.locator('a[href^="mailto:"], a[href^="https://wa.me/"]')).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { level: 1 })).toContainText('área da equipe.');
        await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled();
        await expect(page.locator('.error-message')).toHaveCount(0);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
      if (errors.length || unexpected.length) throw Error('Offline candidate encountered an unexpected request or runtime error');
      report.checks.push({ path, width, status: 'PASS', noHorizontalOverflow: true });
    }
    await context.close();
  }
  report.status = 'PASS_OFFLINE_CANDIDATE_UI';
} catch {
  report.status = 'FAIL_OFFLINE_CANDIDATE_UI';
  throw Error('Offline candidate UI failed; sanitized report saved');
} finally {
  await browser.close();
  await mkdir('.firebase/convergence', { recursive: true });
  await writeFile('.firebase/convergence/candidate-ui-report.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
