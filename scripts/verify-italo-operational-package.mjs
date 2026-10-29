// Public static bytes only. Never executes the application or a Firebase SDK.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const [directory, target] = process.argv.slice(2);
assert(process.argv.length === 4 && directory && target, 'USE_PACKAGE_DIRECTORY_REVIEWED_HOST');
const host = new URL(target);
assert(['http://127.0.0.1:4188', 'https://caravana-77.pages.dev'].includes(host.origin) && host.pathname === '/' && !host.search && !host.hash, 'EXACT_OPERATIONAL_HOST_REQUIRED');
const manifestBytes = await readFile(path.resolve(directory, 'combined-release.json')), manifest = JSON.parse(manifestBytes);
assert(manifest.kind === 'ITALO_OPERATIONAL_BOOTSTRAP_PACKAGE' && manifest.projectId === 'caravana-af306' && manifest.pagesProject === 'caravana-77'
  && manifest.supportsOperationalCutover === true && manifest.publicCutover === false && manifest.readyForDeploy === false && /^[a-f0-9]{40}$/.test(manifest.source), 'EXACT_OPERATIONAL_PACKAGE_REQUIRED');
assert(Array.isArray(manifest.files) && manifest.files.length <= 100, 'PUBLIC_PACKAGE_BOUND');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function check(route, file) {
  const response = await fetch(new URL(route, host), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, route + ' HTTP');
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), file.sha256, route + ' SHA256');
  const type = response.headers.get('content-type') || '';
  assert(type.includes(file.path.endsWith('.js') ? 'javascript' : file.path.endsWith('.css') ? 'text/css' : file.path.endsWith('.json') ? 'application/json' : 'text/html'), route + ' MIME');
  if (route.startsWith('tenant-italo/')) {
    const csp = response.headers.get('content-security-policy') || '';
    assert(csp.includes("script-src 'self';") && csp.includes("frame-src 'self' blob:"), route + ' CSP');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
  if (!route.endsWith('.js') && !route.endsWith('.css') && !route.includes('private-release-baseline') && !route.includes('operational-artifact')) assert.equal(response.headers.get('cache-control'), 'no-store', route + ' cache');
}
for (const file of manifest.files) {
  assert(typeof file.path === 'string' && /^[A-Za-z0-9_./-]+$/.test(file.path) && !file.path.split('/').some(part => part.startsWith('.')), 'REVIEWED_PUBLIC_FILE_REQUIRED');
  if (file.path.startsWith('_')) { assert(['_headers', '_redirects'].includes(file.path)); continue; }
  assert(file.path === 'index.html' || /^(?:tenant-italo\/)?(?:assets\/[A-Za-z0-9_-]+\.(js|css)|entry-[a-f0-9]{12}\/index\.html)$/.test(file.path)
    || /^tenant-italo\/(?:index\.html|runtime-[a-f0-9]{12}\.json|private-release(?:-baseline-[a-f0-9]{12})?\.json|operational-(?:release|artifact-[a-f0-9]{12})\.json)$/.test(file.path), 'UNREVIEWED_PUBLIC_PATH');
  await check(file.path.endsWith('index.html') ? file.path.slice(0, -10) : file.path, file);
}
await check('combined-release.json', { path: 'combined-release.json', sha256: digest(manifestBytes) });
const html = manifest.files.find(f => f.path === 'index.html');
for (const route of ['admin/login', 'caravana/synthetic-route-check/inscricao', 'minha-inscricao/' + 'a'.repeat(64), 'tenant-italo/admin/login', 'tenant-italo/o/italo/minha-inscricao/' + 'a'.repeat(64)]) await check(route, html);
console.log(JSON.stringify({ status: 'OPERATIONAL_HTTP_PACKAGE_HASH_MIME_CACHE_CSP_PASS', source: manifest.source, host: host.origin,
  publicFiles: manifest.files.length - 2 + 1, routes: 5, firebaseRequests: 0, applicationExecuted: false, publicCutover: false }));
