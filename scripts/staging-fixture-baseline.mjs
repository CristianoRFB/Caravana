// SDK-only snapshot of the two explicitly known synthetic tenant fixtures.
// Public evidence contains counts/hashes; credentials and document bytes never leave memory.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { loadEnv } from 'vite';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocsFromServer, terminate, setLogLevel } from 'firebase/firestore';
import { assertStagingBuild } from './staging-target.mjs';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase) || process.argv.length !== 3 || process.env.STAGING_CONFIRM_PROJECT !== 'bdall-e3585'
  || ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN'].some(k => process.env[k])) throw Error('Exact synthetic staging baseline confirmation required');
const environment = loadEnv('staging', process.cwd(), 'VITE_');
assertStagingBuild(environment);
const saved = JSON.parse(await readFile('.firebase/staging-accounts.json', 'utf8'));
if (saved.projectId !== 'bdall-e3585' || !['ownerA', 'ownerB'].every(k => saved.accounts[k]?.email?.endsWith('@caravana77.invalid'))) throw Error('Known synthetic accounts required');
setLogLevel('silent');
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const report = { checkedAt: new Date().toISOString(), projectId: 'bdall-e3585', phase, classification: 'GET', sourceWrites: 0, productionAccess: false, tenants: [] };
const ledger = {};
for (const [key, org] of [['ownerA', 'staging-org-a'], ['ownerB', 'staging-org-b']]) {
  console.log(`target=bdall-e3585 operation=synthetic-baseline identity=${key} classification=GET`);
  const app = initializeApp({ projectId: 'bdall-e3585', apiKey: environment.VITE_FIREBASE_API_KEY, appId: environment.VITE_FIREBASE_APP_ID, authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN }, `baseline-${randomUUID()}`);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence }), db = getFirestore(app);
  try {
    try { await signInWithEmailAndPassword(auth, saved.accounts[key].email, saved.accounts[key].password); } catch { throw Error('Synthetic login failed; raw diagnostics suppressed'); }
    if (auth.currentUser.uid !== saved.accounts[key].uid) throw Error('Synthetic UID mismatch');
    const rows = {};
    for (const name of ['caravans', 'registrations', 'financialOperations']) {
      rows[name] = (await getDocsFromServer(query(collection(db, name), where('organizationId', '==', org)))).docs;
      if (rows[name].length > 500) throw Error('Bounded fixture inventory exceeded');
    }
    if (rows.registrations.some(d => !d.data().passengerName?.startsWith('Pessoa Fictícia'))) throw Error('Unknown passenger content; no snapshot accepted');
    for (const d of rows.financialOperations) ledger[d.ref.path] = sha(canonical(d.data()));
    const trips = rows.caravans.map(d => d.data()), regs = rows.registrations.map(d => d.data());
    report.tenants.push({ organizationId: org, caravans: trips.length, registrations: regs.length,
      reservedSeats: trips.reduce((s,d) => s + (d.reservedSeats || 0), 0),
      paymentTotalCents: regs.reduce((s,d) => s + (d.paymentTotalCents || 0), 0),
      historicalFinancialOperations: rows.financialOperations.length });
  } finally { await signOut(auth); await terminate(db); await deleteApp(app); }
}
await mkdir('.firebase/master', { recursive: true });
if (phase === 'before') await writeFile('.firebase/master/baseline-ledger-hashes.json', JSON.stringify(ledger), { mode: 0o600, flag: 'wx' });
else {
  const beforeLedger = JSON.parse(await readFile('.firebase/master/baseline-ledger-hashes.json', 'utf8'));
  report.originalFinancialOperationsUnchanged = Object.entries(beforeLedger).every(([path, hash]) => ledger[path] === hash);
  const before = JSON.parse(await readFile('docs/evidence/2026-10-22/master/fixture-baseline-before.json', 'utf8'));
  report.operationalTotalsRestored = before.tenants.every(a => report.tenants.some(b => b.organizationId === a.organizationId && b.reservedSeats === a.reservedSeats && b.paymentTotalCents === a.paymentTotalCents));
  if (!report.originalFinancialOperationsUnchanged || !report.operationalTotalsRestored) throw Error('Fixture compensation or ledger preservation needs review');
}
await writeFile(`docs/evidence/2026-10-22/master/fixture-baseline-${phase}.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
