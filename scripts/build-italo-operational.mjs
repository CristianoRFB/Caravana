// Produces a candidate only. Public routing/transactional cutover are separate
// gates; neither this build nor its manifest authorizes an activation.
import { build, loadEnv } from 'vite';
import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
if (process.argv.length !== 2) throw Error('EXACT_OPERATIONAL_BUILD_ONLY_NO_DEPLOY');
await access('.env.production.local');
const environment = { ...loadEnv('production', process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
if (environment.VITE_FIREBASE_PROJECT_ID !== 'caravana-af306' || environment.VITE_FIREBASE_AUTH_DOMAIN !== 'caravana-af306.firebaseapp.com'
  || environment.VITE_FIREBASE_MESSAGING_SENDER_ID !== '742921744156' || environment.VITE_USE_EMULATORS !== 'false'
  || environment.VITE_APP_ENV !== 'production' || !environment.VITE_FIREBASE_API_KEY?.trim()
  || !environment.VITE_FIREBASE_APP_ID?.startsWith('1:742921744156:web:') || environment.VITE_STAGING_APPCHECK_ENABLED === 'true') throw Error('EXACT_EXISTING_PRODUCTION_WEB_CONFIG_REQUIRED');
const base = '/tenant-italo/', directory = 'dist-italo-operational';
await build({ mode: 'production', base, define: {
  'import.meta.env.VITE_ITALO_OPERATIONAL_TENANT': JSON.stringify('italo'),
  'import.meta.env.VITE_PRIVATE_HISTORY_TENANT': JSON.stringify(''),
}, build: { outDir: directory } });
const files = [];
async function inventory(prefix = '') {
  for (const item of await readdir(`${directory}/${prefix}`, { withFileTypes: true })) {
    const name = prefix + item.name;
    if (!prefix && ['_headers', '_redirects'].includes(name)) continue;
    if (item.isDirectory()) await inventory(name + '/');
    else {
      if (!(name === 'index.html' || /^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(name))) throw Error('UNREVIEWED_OPERATIONAL_ASSET');
      const bytes = await readFile(`${directory}/${name}`);
      files.push({ path: base + name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await inventory();
const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim());
await writeFile(`${directory}/operational-release.json`, JSON.stringify({ kind: 'ITALO_EXISTING_EVENT_OPERATIONAL_CANDIDATE', source, dirty, base,
  projectId: 'caravana-af306', pagesProject: 'caravana-77', emulator: false, requiresOperatorLedger: true,
  publicCutover: false, readyForDeploy: false, files }, null, 2) + '\n');
console.log(`Existing-event candidate built: ${files.length} public files. Not packaged, deployed or activated.`);
