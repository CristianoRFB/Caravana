import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// HTTP bytes only: never execute the production Firebase client or read data.
const [directory, target] = process.argv.slice(2);
assert(directory && target && process.argv.length === 4, 'USE_PACKAGE_DIRECTORY_TARGET_URL');
const host = new URL(target);
assert((host.origin === 'http://127.0.0.1:4188' || host.origin === 'https://caravana-77.pages.dev') && host.pathname === '/' && !host.search && !host.hash, 'EXACT_REVIEWED_HOST_REQUIRED');
const manifest = JSON.parse(await readFile(path.resolve(directory, 'combined-release.json')));
assert(manifest.projectId === 'caravana-af306' && manifest.pagesProject === 'caravana-77' && manifest.publicCutover === false);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function check(route, file) {
  const response = await fetch(new URL(route, host), { redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, route);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length, file.bytes, route + ' length');
  assert.equal(digest(bytes), file.sha256, route + ' hash');
  const mime = response.headers.get('content-type') || '';
  assert(mime.includes(file.path.endsWith('.js') ? 'javascript' : file.path.endsWith('.css') ? 'text/css' : file.path.endsWith('.json') ? 'application/json' : 'text/html'), route + ' MIME');
  if (route.startsWith('tenant-italo/')) {
    const policy = response.headers.get('content-security-policy') || '';
    assert(policy.includes("frame-src 'self' blob:") && policy.includes("script-src 'self';"), 'PRIVATE_CSP_REQUIRED');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
}
for (const file of manifest.files.filter(file => !file.path.startsWith('_'))) {
  await check(file.path.endsWith('index.html') ? file.path.slice(0, -10) : file.path, file);
}
for (const [route, path] of [['admin/login', 'index.html'], ['tenant-italo/admin/login', 'tenant-italo/index.html'], ['tenant-italo/admin/caravanas', 'tenant-italo/index.html']]) {
  await check(route, manifest.files.find(file => file.path === path));
}
console.log(JSON.stringify({ status: 'HTTP_PACKAGE_HASH_MIME_ROUTES_HEADERS_PASS', source: manifest.source, host: host.origin, assets: manifest.files.length - 2, routes: 3, firebaseRequests: 0, publicCutover: false }));
