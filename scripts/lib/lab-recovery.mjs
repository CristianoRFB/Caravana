// Deliberately NOT a production exporter. Fixed, invented corpus; no network APIs.
import { createHash } from 'node:crypto';

export const PROJECT = 'demo-caravana77-test';
export const canonical = value => JSON.stringify(value, (_key, v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function assertLabTarget(project, host, env = process.env) {
  if (project !== PROJECT || host !== '127.0.0.1:18080') throw Error('DEMO_LOOPBACK_REQUIRED');
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'CLOUDSDK_AUTH_ACCESS_TOKEN',
    'GOOGLE_OAUTH_ACCESS_TOKEN', 'CLOUDFLARE_API_TOKEN', 'FIREBASE_CONFIG']) {
    if (env[key]) throw Error('CREDENTIAL_SELECTOR_REFUSED');
  }
  for (const [key, expected] of Object.entries({ GCLOUD_PROJECT: PROJECT, GOOGLE_CLOUD_PROJECT: PROJECT,
    FIRESTORE_EMULATOR_HOST: host, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:19199' })) {
    if (env[key] && env[key] !== expected) throw Error('FOREIGN_ENVIRONMENT_REFUSED');
  }
}

export function fixture() {
  return { kind: 'LAB_SYNTHETIC_ONLY', schemaVersion: 1, projectId: PROJECT,
    auth: [{ uid: 'synthetic-owner-a', role: 'owner', organizationId: 'synthetic-a' },
      { uid: 'synthetic-owner-b', role: 'owner', organizationId: 'synthetic-b' }],
    documents: [
      { path: 'organizations/synthetic-a', data: { ownerUid: 'synthetic-owner-a' } },
      { path: 'organizations/synthetic-b', data: { ownerUid: 'synthetic-owner-b' } },
      { path: 'registrations/synthetic-a', data: { organizationId: 'synthetic-a', totalCents: 7500 } },
      { path: 'registrations/synthetic-a/payments/initial', data: { organizationId: 'synthetic-a', amountCents: 7500 } },
      { path: 'registrations/synthetic-b', data: { organizationId: 'synthetic-b', totalCents: null } },
      { path: 'registrations/synthetic-c', data: { organizationId: 'synthetic-b', totalCents: null } },
    ],
    objects: [{ path: 'synthetic-a/receipt.pdf', bytesBase64: Buffer.from('%PDF-1.4\nSYNTHETIC_NO_BANK_VALUE').toString('base64') }],
    links: [{ id: 'synthetic-link', registrationPath: 'registrations/synthetic-a', active: true }],
    config: { frontend: 'synthetic-before', rules: 'synthetic-before', indexes: 'synthetic-before', auth: 'synthetic-before' },
  };
}

export function validateFixture(value) {
  // Refuse schema-compatible but arbitrary input, including any real payload.
  if (canonical(value) !== canonical(fixture())) throw Error('FIXED_SYNTHETIC_CORPUS_REQUIRED');
  return value;
}

export function manifest(ciphertext, value = fixture()) {
  validateFixture(value);
  return { kind: 'LAB_SYNTHETIC_ONLY', schemaVersion: 1, projectId: PROJECT,
    format: 'age-v1', ciphertextBytes: ciphertext.length, ciphertextSha256: sha256(ciphertext),
    contentSha256: sha256(canonical(value)), counts: { documents: value.documents.length,
      authMetadata: value.auth.length, objects: value.objects.length, links: value.links.length },
    actualAuthPasswordsRecoverable: false, realBackup: false, realRestore: false };
}

export function verifyCiphertext(ciphertext, expected) {
  const actual = manifest(ciphertext);
  if (canonical(actual) !== canonical(expected)) throw Error('MANIFEST_MISMATCH');
}

export function restoreStep(snapshot, value, maxCreates = 1) {
  validateFixture(value);
  if (!Number.isSafeInteger(maxCreates) || maxCreates < 1) throw Error('INVALID_BATCH');
  const wanted = [...value.documents, ...value.auth.map(data => ({ path: `auth/${data.uid}`, data })),
    ...value.objects.map(data => ({ path: `objects/${data.path}`, data })),
    ...value.links.map(data => ({ path: `links/${data.id}`, data }))];
  const targets = new Map(wanted.map(d => [d.path, d]));
  const existing = new Map(snapshot.map(d => [d.path, d]));
  if (existing.size !== snapshot.length) throw Error('DUPLICATE_TARGET');
  for (const [path, document] of existing) {
    if (!targets.has(path) || canonical(document) !== canonical(targets.get(path))) throw Error('TARGET_CONFLICT_NO_OVERWRITE');
  }
  const pending = wanted.filter(d => !existing.has(d.path));
  const additions = pending.slice(0, maxCreates);
  return { snapshot: structuredClone([...snapshot, ...additions]), created: additions.length,
    remaining: pending.length - additions.length };
}

export function compensate(entries, originalId, reversalId) {
  if (!/^synthetic-[a-z0-9-]+$/.test(originalId) || !/^synthetic-[a-z0-9-]+$/.test(reversalId) || originalId === reversalId) throw Error('SYNTHETIC_IDS_REQUIRED');
  if (new Set(entries.map(e => e.id)).size !== entries.length || entries.some(e => !/^synthetic-[a-z0-9-]+$/.test(e.id) || !Number.isSafeInteger(e.cents))) throw Error('INVALID_LEDGER');
  const original = entries.find(e => e.id === originalId);
  if (!original || original.reverses || original.cents <= 0) throw Error('ORIGINAL_REQUIRED');
  const prior = entries.find(e => e.reverses === originalId);
  if (prior) {
    if (prior.id !== reversalId || prior.cents !== -original.cents) throw Error('REVERSAL_CONFLICT');
    return structuredClone(entries);
  }
  if (entries.some(e => e.id === reversalId)) throw Error('REVERSAL_ID_COLLISION');
  return [...structuredClone(entries), { id: reversalId, cents: -original.cents, reverses: originalId }];
}

export function coordinatedRollback(before, current, expectedAfter) {
  const valid = v => v?.kind === 'LAB_SYNTHETIC_ONLY' && v.projectId === PROJECT && v.config && Array.isArray(v.ledger);
  if (![before, current, expectedAfter].every(valid)) throw Error('SYNTHETIC_ROLLBACK_REQUIRED');
  if (canonical(current) !== canonical(expectedAfter)) return { strategy: 'STOP_PRESERVE_FORWARD_DATA', state: structuredClone(current) };
  return { strategy: 'SYNTHETIC_COORDINATED_RETURN', state: structuredClone(before) };
}
