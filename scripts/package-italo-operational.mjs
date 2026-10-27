// Static public code only. No Firebase identity, data, credentials or deploy.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, lstat, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { publicAssetPath, validatePrivateArtifact } from './package-italo-private.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, code) => { if (!ok) throw Error(code); };
export function runtimeApp(html, files, prefix = '') {
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  check(scripts.length === 1, 'EXACT_RUNTIME_ENTRY_REQUIRED');
  const lookup = url => {
    check(url.startsWith('/'), 'ABSOLUTE_PUBLIC_RUNTIME_ASSET_REQUIRED');
    const name = url.slice(1), relative = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name;
    const descriptor = files.find(f => f.path === relative || f.path === '/' + name);
    check(descriptor && /^[a-f0-9]{64}$/.test(descriptor.sha256), 'RUNTIME_ASSET_NOT_IN_MANIFEST');
    return { path: url, sha256: descriptor.sha256 };
  };
  const entry = lookup(scripts[0][1]);
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(m => lookup(m[1]));
  check(styles.length >= 1 && styles.length <= 5, 'RUNTIME_STYLES_REQUIRED');
  return { entry, styles };
}
export function operationalRedirects(short, runtimePath) {
  check(/^[a-f0-9]{12}$/.test(short) && runtimePath === `/tenant-italo/runtime-${short}.json`, 'REVIEWED_RUNTIME_PATH_REQUIRED');
  return `/assets/* /assets/:splat 200
/tenant-italo/assets/* /tenant-italo/assets/:splat 200
${runtimePath} ${runtimePath} 200
/tenant-italo/private-release.json /tenant-italo/private-release.json 200
/tenant-italo/private-release-baseline-4ecaa9e3bef5.json /tenant-italo/private-release-baseline-4ecaa9e3bef5.json 200
/tenant-italo/operational-release.json /tenant-italo/operational-release.json 200
/tenant-italo/operational-artifact-${short}.json /tenant-italo/operational-artifact-${short}.json 200
/combined-release.json /combined-release.json 200
/tenant-italo/* /tenant-italo/entry-${short}/ 200
/* /entry-${short}/ 200
`;
}
export function bootstrapHtml(bootstrap, runtimePath) {
  check(/^\/tenant-italo\/assets\/bootstrap-[A-Za-z0-9_-]+\.js$/.test(bootstrap.path) && /^[a-f0-9]{64}$/.test(bootstrap.sha256), 'REVIEWED_BOOTSTRAP_REQUIRED');
  check(/^\/tenant-italo\/runtime-[a-f0-9]{12}\.json$/.test(runtimePath), 'REVIEWED_RUNTIME_PATH_REQUIRED');
  const integrity = 'sha256-' + Buffer.from(bootstrap.sha256, 'hex').toString('base64');
  return Buffer.from(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Caravana 77</title><script type="module" crossorigin="anonymous" src="${bootstrap.path}" integrity="${integrity}" data-italo-runtime="${runtimePath}"></script></head><body><div id="root">Confirmando a disponibilidade…</div></body></html>\n`);
}
async function checkedFile(root, name, expected) {
  publicAssetPath(name); const absolute = path.resolve(root, name), canonical = await realpath(root);
  check(absolute.startsWith(canonical + path.sep) && await realpath(absolute) === absolute, 'NO_PUBLIC_ASSET_SYMLINK_OR_ESCAPE');
  const info = await lstat(absolute); check(info.isFile() && !info.isSymbolicLink() && info.size <= 2_000_000, 'BOUNDED_PUBLIC_FILE_REQUIRED');
  const bytes = await readFile(absolute);
  check(!expected || expected.bytes === bytes.length && expected.sha256 === digest(bytes), 'PRESERVED_ASSET_HASH_MISMATCH');
  return bytes;
}
export async function packageOperationalRelease({ baselineDirectory, operationalDirectory, outputDirectory, source, workspace = process.cwd() }) {
  const workspaceRoot = await realpath(workspace), output = path.resolve(outputDirectory), baseline = await realpath(baselineDirectory), operational = await realpath(operationalDirectory);
  check(path.dirname(output) === workspaceRoot && /^dist-italo-release-op-[a-f0-9]{12}$/.test(path.basename(output)) && /^[a-f0-9]{40}$/.test(source), 'ISOLATED_OPERATIONAL_OUTPUT_REQUIRED');
  const baselineManifest = JSON.parse(await checkedFile(baseline, 'combined-release.json'));
  check(baselineManifest.kind === 'LEGACY_PLUS_ITALO_PRIVATE_HISTORY' && baselineManifest.source === '4ecaa9e3bef58c9b6f154a2b19d08c167ebed5a2'
    && baselineManifest.projectId === 'caravana-af306' && baselineManifest.pagesProject === 'caravana-77' && baselineManifest.publicCutover === false, 'EXACT_PUBLISHED_PRIVATE_BASE_REQUIRED');
  const privateBytes = await checkedFile(baseline, 'tenant-italo/private-release.json'); const privateManifest = JSON.parse(privateBytes);
  validatePrivateArtifact(privateManifest, 'production', baselineManifest.source);
  check(Array.isArray(baselineManifest.files) && baselineManifest.files.length <= 50, 'PRESERVED_PACKAGE_BOUND');
  const prepared = new Map();
  for (const descriptor of baselineManifest.files) {
    check(['index.html', '_headers', '_redirects', 'tenant-italo/index.html', 'tenant-italo/private-release.json'].includes(descriptor.path)
      || /^(tenant-italo\/)?assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(descriptor.path), 'PRESERVED_PUBLIC_FILE_KIND_REQUIRED');
    check(!prepared.has(descriptor.path), 'DUPLICATE_PRESERVED_FILE');
    prepared.set(descriptor.path, await checkedFile(baseline, descriptor.path, descriptor));
  }
  const evidence = JSON.parse(await readFile(new URL('../docs/evidence/2026-10-16/public-bundles.json', import.meta.url)));
  const historical = evidence.sources.find(s => s.name === 'production' && s.url === 'https://caravana-77.pages.dev/')?.files;
  check(historical?.length === 6, 'EXACT_LEGACY_BASELINE_REQUIRED');
  for (const item of historical) {
    const bytes = prepared.get(item.path); check(bytes && bytes.length === item.bytes && digest(bytes) === item.sha256, 'EXACT_LEGACY_ASSETS_REQUIRED');
  }
  for (const item of privateManifest.files) {
    const bytes = prepared.get(item.path.slice(1)); check(bytes && bytes.length === item.bytes && digest(bytes) === item.sha256, 'EXACT_PRIVATE_HISTORY_ASSETS_REQUIRED');
  }
  const opBytes = await checkedFile(operational, 'operational-release.json'), op = JSON.parse(opBytes);
  check(op.kind === 'ITALO_EXISTING_EVENT_OPERATIONAL_CANDIDATE' && op.source === source && op.dirty === false
    && op.projectId === 'caravana-af306' && op.pagesProject === 'caravana-77' && op.emulator === false && op.base === '/tenant-italo/'
    && op.publicCutover === false && op.readyForDeploy === false && op.requiresOperatorLedger === true && Array.isArray(op.files) && op.files.length <= 50, 'CLEAN_OPERATIONAL_CANDIDATE_REQUIRED');
  for (const descriptor of op.files) {
    check(descriptor.path?.startsWith('/tenant-italo/'), 'OPERATIONAL_PREFIX_REQUIRED');
    const name = descriptor.path.slice('/tenant-italo/'.length);
    check(name === 'index.html' || /^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(name), 'OPERATIONAL_PUBLIC_FILE_KIND_REQUIRED');
    const bytes = await checkedFile(operational, name, descriptor);
    if (name === 'index.html') continue;
    const destination = descriptor.path.slice(1), previous = prepared.get(destination);
    check(!previous || digest(previous) === digest(bytes), 'PRESERVED_ASSET_NAME_COLLISION'); prepared.set(destination, bytes);
  }
  const legacyApp = runtimeApp(prepared.get('index.html').toString(), baselineManifest.files);
  const privateApp = runtimeApp(prepared.get('tenant-italo/index.html').toString(), privateManifest.files);
  const opIndex = await checkedFile(operational, 'index.html', op.files.find(f => f.path === '/tenant-italo/index.html'));
  const operationalApp = runtimeApp(opIndex.toString(), op.files);
  const bootstrap = op.files.find(f => f.path === op.bootstrap); check(bootstrap, 'OPERATIONAL_BOOTSTRAP_REQUIRED');
  const short = source.slice(0, 12), runtimePath = `/tenant-italo/runtime-${short}.json`;
  const html = bootstrapHtml(bootstrap, runtimePath);
  prepared.set('index.html', html); prepared.set('tenant-italo/index.html', html);
  prepared.set(`entry-${short}/index.html`, html); prepared.set(`tenant-italo/entry-${short}/index.html`, html);
  prepared.set(runtimePath.slice(1), Buffer.from(JSON.stringify({ version: 'italo-bootstrap-v1', source, projectId: 'caravana-af306', legacy: legacyApp, privateHistory: privateApp, operational: operationalApp }) + '\n'));
  const rulesSha = digest(await readFile(new URL('../firestore.italo-operational.rules', import.meta.url)));
  const privateBaselinePath = '/tenant-italo/private-release-baseline-4ecaa9e3bef5.json', artifactPath = `/tenant-italo/operational-artifact-${short}.json`;
  prepared.set(privateBaselinePath.slice(1), privateBytes);
  prepared.set('tenant-italo/private-release.json', Buffer.from(JSON.stringify({ kind: 'PRESERVED_PRIVATE_HISTORY_BASELINE_POINTER', source: baselineManifest.source, currentBootstrapSource: source, originalManifestPath: privateBaselinePath, originalManifestSha256: digest(privateBytes) }) + '\n'));
  prepared.set(artifactPath.slice(1), opBytes);
  prepared.set('tenant-italo/operational-release.json', Buffer.from(JSON.stringify({ kind: 'ITALO_OPERATIONAL_BOOTSTRAP_MARKER', source, projectId: 'caravana-af306', pagesProject: 'caravana-77',
    compiledArtifactManifestPath: artifactPath, compiledArtifactManifestSha256: digest(opBytes), runtimePath, requiredRulesSha256: rulesSha, publicCutover: false, readyForDeploy: false }) + '\n'));
  prepared.set('_redirects', Buffer.from(operationalRedirects(short, runtimePath)));
  const cachePaths = ['/', '/admin/*', '/caravana/*', '/minha-inscricao/*', `/entry-${short}/*`, '/tenant-italo/', '/tenant-italo/admin/*', '/tenant-italo/o/*', `/tenant-italo/entry-${short}/*`, runtimePath, '/tenant-italo/operational-release.json', '/combined-release.json'];
  prepared.set('_headers', Buffer.concat([prepared.get('_headers'), Buffer.from('\n' + cachePaths.map(p => p + '\n  Cache-Control: no-store\n').join(''))]));
  await mkdir(output); const files = [];
  for (const [name, bytes] of prepared) {
    const destination = path.join(output, name); await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, bytes, { flag: 'wx' });
    check(digest(await readFile(destination)) === digest(bytes), 'OPERATIONAL_PACKAGE_READBACK_FAILED');
    files.push({ path: name, bytes: bytes.length, sha256: digest(bytes) });
  }
  const result = { kind: 'ITALO_OPERATIONAL_BOOTSTRAP_PACKAGE', source, projectId: 'caravana-af306', pagesProject: 'caravana-77', environment: 'production',
    privateHistoryBaselineSource: baselineManifest.source, requiredRulesSha256: rulesSha,
    preservesLegacyEntry: legacyApp.entry, preservesPrivateEntry: privateApp.entry, supportsOperationalCutover: true, publicCutover: false, readyForDeploy: false, files };
  await writeFile(path.join(output, 'combined-release.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  check(process.argv.length === 5, 'USE_BASELINE_OPERATIONAL_OUTPUT_DIRECTORIES');
  check(!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), 'CLEAN_SOURCE_REQUIRED');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const result = await packageOperationalRelease({ baselineDirectory: process.argv[2], operationalDirectory: process.argv[3], outputDirectory: process.argv[4], source });
  console.log(JSON.stringify({ status: 'OPERATIONAL_PACKAGE_BUILT_NOT_DEPLOYED', source, files: result.files.length, publicCutover: false, readyForDeploy: false }));
}
