import { createHash } from 'node:crypto';
import { boundedBody } from './google-source.mjs';
import { requireThat } from './safety.mjs';
const host = 'https://caravana-77.pages.dev/';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export async function verifyOperationalRelease(source, rulesSha256, fetcher = fetch) {
  requireThat(/^[a-f0-9]{40}$/.test(source) && /^[a-f0-9]{64}$/.test(rulesSha256), 'CUTOVER_RELEASE_IDENTITY_REQUIRED');
  const get = async url => fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache' } });
  const manifestBytes = await boundedBody(await get(host + 'combined-release.json'), 300000), manifest = JSON.parse(manifestBytes);
  requireThat(manifest.kind === 'ITALO_OPERATIONAL_BOOTSTRAP_PACKAGE' && manifest.source === source && manifest.projectId === 'caravana-af306' && manifest.pagesProject === 'caravana-77'
    && manifest.requiredRulesSha256 === rulesSha256 && manifest.supportsOperationalCutover === true && manifest.publicCutover === false
    && Array.isArray(manifest.files) && manifest.files.length <= 100 && new Set(manifest.files.map(f => f.path)).size === manifest.files.length, 'CUTOVER_HOSTED_RELEASE_MISMATCH');
  requireThat(manifest.preservesLegacyEntry?.sha256 === '90677dd6e290cb4ba3ef54d6abfcdfc72aaf3b56ae85a0472012b195fee19f16'
    && manifest.privateHistoryBaselineSource === '4ecaa9e3bef58c9b6f154a2b19d08c167ebed5a2', 'CUTOVER_PRESERVED_ENTRIES_REQUIRED');
  let assets = 0;
  for (const f of manifest.files) {
    requireThat(typeof f.path === 'string' && /^[A-Za-z0-9_./-]+$/.test(f.path) && !f.path.split('/').some(p => p.startsWith('.'))
      && /^[a-f0-9]{64}$/.test(f.sha256) && Number.isSafeInteger(f.bytes) && f.bytes >= 0 && f.bytes <= 2_000_000, 'CUTOVER_PUBLIC_MANIFEST_BOUND');
    if (f.path.startsWith('_')) { requireThat(['_headers', '_redirects'].includes(f.path), 'CUTOVER_NO_FUNCTIONS_OR_PRIVATE_FILES'); continue; }
    requireThat(f.path === 'index.html' || /^(?:tenant-italo\/)?(?:assets\/[A-Za-z0-9_-]+\.(js|css)|entry-[a-f0-9]{12}\/index\.html)$/.test(f.path)
      || /^tenant-italo\/(?:index\.html|runtime-[a-f0-9]{12}\.json|private-release(?:-baseline-[a-f0-9]{12})?\.json|operational-(?:release|artifact-[a-f0-9]{12})\.json)$/.test(f.path)
      || /^platform-app\/(?:index\.html|platform-release\.json|entry-[a-f0-9]{12}\/index\.html|assets\/[A-Za-z0-9_-]+\.(js|css))$/.test(f.path), 'CUTOVER_STATIC_FILE_REQUIRED');
    const pathname = f.path.endsWith('index.html') ? f.path.slice(0, -10) : f.path;
    const response = await get(host + pathname), bytes = await boundedBody(response, 2_000_000);
    requireThat(bytes.length === f.bytes && digest(bytes) === f.sha256, 'CUTOVER_PUBLIC_ASSET_HASH_MISMATCH'); assets++;
  }
  const html = manifest.files.find(f => f.path === 'index.html'); requireThat(html, 'CUTOVER_BOOTSTRAP_HTML_REQUIRED');
  for (const route of ['admin/login', 'caravana/synthetic-route-check/inscricao', 'tenant-italo/admin/login', 'tenant-italo/o/italo/minha-inscricao/' + 'a'.repeat(64)]) {
    const response = await get(host + route), bytes = await boundedBody(response, 2_000_000);
    requireThat(digest(bytes) === html.sha256 && response.headers.get('content-type')?.includes('text/html'), 'CUTOVER_ROUTE_HTTP_SMOKE_FAILED');
    if (route.startsWith('tenant-italo/')) requireThat(response.headers.get('content-security-policy')?.includes("frame-src 'self' blob:"), 'CUTOVER_PRIVATE_CSP_REQUIRED');
  }
  const ciUrl = 'https://api.github.com/repos/CristianoRFB/Caravana/actions/runs?head_sha=' + source + '&per_page=10';
  const runs = JSON.parse(await boundedBody(await get(ciUrl), 1000000));
  for (const name of ['CI', 'Goal XIII private tenant activation']) requireThat(runs.workflow_runs?.some(r => r.name === name && r.head_sha === source && r.status === 'completed' && r.conclusion === 'success'), 'CUTOVER_EXACT_SOURCE_CI_SUCCESS_REQUIRED');
  return { source, rulesSha256, manifestSha256: digest(manifestBytes), verifiedAt: new Date().toISOString(), publicAssetsVerified: assets, routesVerified: 4 };
}
