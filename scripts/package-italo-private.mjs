// Public frontend assets only. Never load credentials, backend data or private snapshots.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const base = '/tenant-italo/';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (condition, code) => { if (!condition) throw Error(code); };
export function publicAssetPath(value) {
  assert(typeof value === 'string' && value.length < 240 && /^[a-zA-Z0-9_./-]+$/.test(value)
    && !value.startsWith('/') && value.split('/').every(part => part && !part.startsWith('.')), 'PUBLIC_ASSET_PATH_REQUIRED');
  return value;
}
export function validatePrivateArtifact(manifest, environment, source) {
  assert(['staging', 'production'].includes(environment), 'EXACT_RELEASE_ENVIRONMENT_REQUIRED');
  assert(manifest?.kind === 'ITALO_PRIVATE_HISTORY_CANDIDATE' && manifest.base === base && manifest.readOnly === true && manifest.publicCutover === false
    && manifest.source === source && manifest.dirty === false && manifest.emulator === false, 'CLEAN_PRIVATE_HISTORY_BUILD_REQUIRED');
  assert(manifest.projectId === (environment === 'production' ? 'caravana-af306' : 'bdall-e3585')
    && manifest.pagesProject === (environment === 'production' ? 'caravana-77' : 'caravana77-staging') && manifest.environment === environment, 'PRIVATE_ARTIFACT_TARGET_MISMATCH');
  assert(Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 50, 'PRIVATE_ASSET_BOUND');
  const seen = new Set();
  for (const file of manifest.files) {
    assert(file.path?.startsWith(base), 'PRIVATE_PREFIX_REQUIRED');
    const name = publicAssetPath(file.path.slice(base.length));
    assert(name === 'index.html' || /^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(name), 'REVIEWED_PRIVATE_ASSET_KIND_REQUIRED');
    assert(!seen.has(name) && name !== 'private-release.json' && !name.startsWith('_') && Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 2_000_000 && /^[a-f0-9]{64}$/.test(file.sha256), 'PRIVATE_ASSET_MANIFEST_INVALID');
    seen.add(name);
  }
  assert(seen.has('index.html'), 'PRIVATE_INDEX_REQUIRED');
  return manifest.files;
}
export function privateViewerHeaders(previous, environment) {
  assert(['staging', 'production'].includes(environment), 'EXACT_RELEASE_ENVIRONMENT_REQUIRED');
  const authDomain = environment === 'production' ? 'caravana-af306.firebaseapp.com' : 'bdall-e3585.firebaseapp.com';
  const csp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src 'self' blob: https://${authDomain}; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'`;
  // Detach the inherited CSP only on the new subpath; broad legacy headers stay intact.
  const detach = previous.toString().includes('Content-Security-Policy:') ? '  ! Content-Security-Policy\n' : '';
  return Buffer.concat([previous, Buffer.from(`\n/tenant-italo/*\n${detach}  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: ${csp}\n/tenant-italo/private-release.json\n  Cache-Control: no-store\n`)]);
}
async function checkedFile(root, name, expected) {
  publicAssetPath(name);
  const absolute = path.resolve(root, name), canonicalRoot = await realpath(root);
  assert(absolute.startsWith(canonicalRoot + path.sep) && await realpath(absolute) === absolute, 'PUBLIC_ASSET_SYMLINK_OR_ESCAPE');
  const info = await lstat(absolute); assert(info.isFile() && !info.isSymbolicLink() && info.size <= 2_000_000, 'PUBLIC_ASSET_FILE_REQUIRED');
  const bytes = await readFile(absolute);
  if (expected) assert(bytes.length === expected.bytes && digest(bytes) === expected.sha256, 'PUBLIC_ASSET_HASH_MISMATCH');
  return bytes;
}
async function liveAsset(url, expected) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert(response.status === 200 && Number(response.headers.get('content-length') || 0) <= 2_000_000, 'LIVE_BASELINE_HTTP');
  const pathname = new URL(url).pathname, type = response.headers.get('content-type')?.split(';')[0];
  const types = pathname.endsWith('.js') ? ['text/javascript', 'application/javascript'] : pathname.endsWith('.css') ? ['text/css'] : pathname.endsWith('.json') ? ['application/json'] : pathname.endsWith('.html') || pathname.endsWith('/') ? ['text/html'] : null;
  assert(!types || types.includes(type), 'LIVE_BASELINE_MIME');
  const chunks = []; let total = 0;
  for await (const part of response.body) { total += part.length; assert(total <= 2_000_000, 'LIVE_BASELINE_BOUND'); chunks.push(part); }
  const bytes = Buffer.concat(chunks);
  assert(bytes.length === expected.bytes && digest(bytes) === expected.sha256, 'LIVE_BASELINE_CHANGED_STOP');
}
export async function packagePrivateRelease({ environment, legacyDirectory, privateDirectory, outputDirectory, source, workspace = process.cwd() }) {
  assert(['staging', 'production'].includes(environment), 'EXACT_RELEASE_ENVIRONMENT_REQUIRED');
  const root = await realpath(workspace), output = path.resolve(outputDirectory);
  assert(path.dirname(output) === root && /^dist-italo-release-[a-z0-9-]+$/.test(path.basename(output)), 'OUTPUT_IN_WORKSPACE_REQUIRED');
  const legacyRoot = await realpath(legacyDirectory), privateRoot = await realpath(privateDirectory);
  const privateBytes = await checkedFile(privateRoot, 'private-release.json');
  const artifact = JSON.parse(privateBytes), privateFiles = validatePrivateArtifact(artifact, environment, source);
  const host = environment === 'production' ? 'https://caravana-77.pages.dev/' : 'https://caravana77-staging.pages.dev/';
  let legacyFiles, legacyManifestBytes;
  if (environment === 'production') {
    const historical = JSON.parse(await readFile(new URL('../docs/evidence/2026-10-16/public-bundles.json', import.meta.url)));
    legacyFiles = historical.sources.find(s => s.name === 'production' && s.url === host)?.files;
    assert(legacyFiles?.length === 6 && legacyFiles.some(f => f.path === 'assets/index-BXYRgZFm.js' && f.sha256 === '90677dd6e290cb4ba3ef54d6abfcdfc72aaf3b56ae85a0472012b195fee19f16'), 'EXACT_PRODUCTION_BASELINE_REQUIRED');
  } else {
    legacyManifestBytes = await checkedFile(legacyRoot, 'release.json');
    const historical = JSON.parse(legacyManifestBytes);
    assert(historical.projectId === 'bdall-e3585' && historical.pagesProject === 'caravana77-staging' && historical.source === '67ce0328d7bf1b7395e71627cdc85c88667c77ec', 'EXACT_STAGING_BASELINE_REQUIRED');
    assert(Array.isArray(historical.files) && historical.files.length <= 50, 'STAGING_MANIFEST_BOUND');
    legacyFiles = historical.files;
    await liveAsset(new URL('release.json', host), { bytes: legacyManifestBytes.length, sha256: digest(legacyManifestBytes) });
  }
  const prepared = new Map();
  for (const file of legacyFiles) {
    const name = publicAssetPath(file.path); assert(!prepared.has(name) && !name.startsWith('tenant-italo/'), 'LEGACY_ASSET_COLLISION');
    assert(['index.html', '_headers', '_redirects'].includes(name) || /^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(name), 'REVIEWED_LEGACY_ASSET_KIND_REQUIRED');
    prepared.set(name, await checkedFile(legacyRoot, name, file));
    // Pages routing/header configuration is not a public asset endpoint. Its
    // local bytes are bound to the exact staging manifest above.
    // Pages canonically serves index.html at /. Keep redirect:error for every
    // network request rather than following an unreviewed redirect target.
    if (!name.startsWith('_')) await liveAsset(new URL(name === 'index.html' ? '' : name, host), file);
  }
  if (legacyManifestBytes) prepared.set('release.json', legacyManifestBytes);
  const redirects = await checkedFile(legacyRoot, '_redirects');
  assert(redirects.toString().trim() === '/* /index.html 200', 'LEGACY_REDIRECTS_REVIEW_REQUIRED');
  // Pages canonicalizes index.html. Rewrite to the directory entry so its
  // canonicalization cannot fall through to the legacy root SPA fallback.
  // Explicit asset passes precede the private SPA catch-all: 200 rewrites also
  // apply to existing files, so otherwise JS/CSS would receive HTML.
  prepared.set('_redirects', Buffer.concat([Buffer.from('/tenant-italo/assets/* /tenant-italo/assets/:splat 200\n/tenant-italo/private-release.json /tenant-italo/private-release.json 200\n/tenant-italo/* /tenant-italo/ 200\n'), redirects]));
  const oldHeaders = prepared.get('_headers') || Buffer.alloc(0);
  prepared.set('_headers', privateViewerHeaders(oldHeaders, environment));
  for (const file of privateFiles) {
    const relative = file.path.slice(base.length), name = 'tenant-italo/' + relative;
    assert(!prepared.has(name), 'PRIVATE_ASSET_COLLISION'); prepared.set(name, await checkedFile(privateRoot, relative, file));
  }
  prepared.set('tenant-italo/private-release.json', privateBytes);
  // Do not mutate or delete any existing output or either source directory.
  await mkdir(output);
  const files = [];
  for (const [name, bytes] of prepared) {
    const destination = path.join(output, name); await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
    assert(digest(await readFile(destination)) === digest(bytes), 'PACKAGE_READBACK_FAILED');
    files.push({ path: name, bytes: bytes.length, sha256: digest(bytes) });
  }
  const result = { kind: 'LEGACY_PLUS_ITALO_PRIVATE_HISTORY', source, environment, projectId: artifact.projectId, pagesProject: artifact.pagesProject, legacyHost: host, legacyAssetsPreserved: legacyFiles.filter(f => !f.path.startsWith('_')).length, routingChanged: ['_redirects', '_headers'], readOnlyTenant: 'italo', publicCutover: false, files };
  await writeFile(path.join(output, 'combined-release.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [environment, legacyDirectory, privateDirectory, outputDirectory] = process.argv.slice(2);
  assert(process.argv.length === 6, 'USE_ENVIRONMENT_LEGACY_PRIVATE_OUTPUT');
  assert(!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), 'CLEAN_CHECKOUT_REQUIRED');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const result = await packagePrivateRelease({ environment, legacyDirectory, privateDirectory, outputDirectory, source });
  console.log(JSON.stringify({ status: 'COMBINED_PUBLIC_PACKAGE_VERIFIED_NO_DEPLOY', source, projectId: result.projectId, pagesProject: result.pagesProject, legacyAssetsPreserved: result.legacyAssetsPreserved, files: result.files.length, publicCutover: false }));
}
