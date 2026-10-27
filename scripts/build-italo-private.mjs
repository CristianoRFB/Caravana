import { build, loadEnv } from 'vite';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertStagingBuild } from './staging-target.mjs';
const staging = process.argv.length === 3 && process.argv[2] === '--staging';
if (process.argv.length !== (staging ? 3 : 2)) throw Error('Use the exact production build or --staging. No deploy.');
const mode = staging ? 'staging' : 'production';
await access(`.env.${mode}.local`);
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')));
const environment = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...inherited };
let target;
if (staging) target = assertStagingBuild(environment);
else {
  if (environment.VITE_FIREBASE_PROJECT_ID !== 'caravana-af306' || environment.VITE_FIREBASE_AUTH_DOMAIN !== 'caravana-af306.firebaseapp.com'
    || environment.VITE_FIREBASE_MESSAGING_SENDER_ID !== '742921744156' || environment.VITE_USE_EMULATORS !== 'false'
    || environment.VITE_APP_ENV !== 'production' || !environment.VITE_FIREBASE_API_KEY?.trim()
    || !environment.VITE_FIREBASE_APP_ID?.startsWith('1:742921744156:web:')) throw Error('Exact existing production Web configuration required.');
  target = { projectId: 'caravana-af306', pagesProject: 'caravana-77', emulator: false, environment: 'production' };
}
if (environment.VITE_STAGING_APPCHECK_ENABLED === 'true') throw Error('This scoped release requires the preserved App Check configuration; no provider activation.');
const base = '/tenant-italo/', directory = 'dist-italo-private';
await build({ mode, base, define: { 'import.meta.env.VITE_PRIVATE_HISTORY_TENANT': JSON.stringify('italo') }, build: { outDir: directory } });
const files = [];
async function inventory(prefix = '') {
  for (const entry of await readdir(`${directory}/${prefix}`, { withFileTypes: true })) {
    const name = prefix + entry.name;
    // Outer Pages configuration belongs to the combined package, never to the
    // tenant asset manifest. Vite copies public/_redirects automatically.
    if (!prefix && ['_headers', '_redirects'].includes(entry.name)) continue;
    if (entry.isDirectory()) await inventory(name + '/');
    else { const bytes = await readFile(`${directory}/${name}`); files.push({ path: base + name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
  }
}
await inventory();
const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim());
await writeFile(`${directory}/private-release.json`, JSON.stringify({ kind: 'ITALO_PRIVATE_HISTORY_CANDIDATE', ...target, source, dirty, base, readOnly: true, publicCutover: false, builtAt: new Date().toISOString(), files }, null, 2) + '\n');
console.log(`Private-history build for ${target.projectId} at ${base}; ${files.length} files. Must be combined with preserved legacy assets; no deploy executed.`);
