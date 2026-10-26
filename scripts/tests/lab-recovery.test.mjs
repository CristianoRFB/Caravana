import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { assertLabTarget, PROJECT, canonical, fixture, validateFixture, manifest, verifyCiphertext,
  restoreStep, compensate, coordinatedRollback } from '../lib/lab-recovery.mjs';

test('fixed demo target refuses real/staging, remote loopback tricks and credential selectors', () => {
  assertLabTarget(PROJECT, '127.0.0.1:18080', {});
  for (const p of ['bdall-e3585', 'caravana-af306', 'demo-other']) assert.throws(() => assertLabTarget(p, '127.0.0.1:18080', {}));
  for (const h of ['localhost:18080', '127.0.0.1.evil:18080', 'https://127.0.0.1:18080', '[::1]:18080']) assert.throws(() => assertLabTarget(PROJECT, h, {}));
  for (const e of [{ FIREBASE_TOKEN: 'synthetic' }, { GOOGLE_APPLICATION_CREDENTIALS: 'synthetic' },
    { GCLOUD_PROJECT: 'caravana-af306' }, { FIREBASE_AUTH_EMULATOR_HOST: 'remote:9099' }]) assert.throws(() => assertLabTarget(PROJECT, '127.0.0.1:18080', e));
});
test('schema-compatible arbitrary content cannot be mistaken for the fixed fictitious corpus', () => {
  const f = fixture(); f.documents[0].data.extra = 'not the fixture';
  assert.throws(() => validateFixture(f));
  assert.throws(() => manifest(Buffer.from('synthetic'), { ...fixture(), projectId: 'bdall-e3585' }));
});
test('manifest refuses byte tamper, truncation, trailing data and coverage downgrade', () => {
  const bytes = Buffer.from('synthetic encrypted envelope placeholder'), m = manifest(bytes);
  verifyCiphertext(bytes, m);
  for (const b of [bytes.subarray(1), Buffer.concat([bytes, Buffer.from('x')]), Buffer.from('tamper')]) assert.throws(() => verifyCiphertext(b, m));
  assert.throws(() => verifyCiphertext(bytes, { ...m, counts: { ...m.counts, objects: 0 } }));
});
test('interrupted restore resumes without overwrites; replay and conflicting parallel writer fail safely', () => {
  const first = restoreStep([], fixture(), 2), final = restoreStep(first.snapshot, fixture(), 100);
  assert.equal(first.created, 2); assert.equal(final.remaining, 0);
  assert.equal(restoreStep(final.snapshot, fixture(), 100).created, 0);
  const conflict = structuredClone(first.snapshot); conflict[0].data.ownerUid = 'synthetic-concurrent';
  assert.throws(() => restoreStep(conflict, fixture()));
  assert.throws(() => restoreStep([...first.snapshot, first.snapshot[0]], fixture()));
  assert.throws(() => restoreStep(first.snapshot, fixture(), 0));
  assert.equal(fixture().documents.filter(d => d.data.totalCents === null).length, 2);
});
test('compensation is append-only, preserves original, retries once and rejects conflicting reversal', () => {
  const entries = [{ id: 'synthetic-payment', cents: 7500 }], before = canonical(entries);
  const reversed = compensate(entries, 'synthetic-payment', 'synthetic-reversal');
  assert.equal(canonical(entries), before); assert.deepEqual(reversed[0], entries[0]);
  assert.equal(reversed.reduce((s, e) => s + e.cents, 0), 0);
  assert.deepEqual(compensate(reversed, 'synthetic-payment', 'synthetic-reversal'), reversed);
  assert.throws(() => compensate(reversed, 'synthetic-payment', 'synthetic-different'));
  assert.throws(() => compensate(entries, 'synthetic-missing', 'synthetic-reversal'));
});
test('coordinated model returns all config components only before forward writes', () => {
  const before = { kind: 'LAB_SYNTHETIC_ONLY', projectId: PROJECT, config: fixture().config, ledger: [] };
  const after = { ...before, config: { frontend: 'synthetic-after', rules: 'synthetic-after', indexes: 'synthetic-after', auth: 'synthetic-after' } };
  assert.deepEqual(coordinatedRollback(before, after, after).state, before);
  const changed = { ...after, ledger: [{ id: 'synthetic-payment', cents: 1 }] };
  assert.deepEqual(coordinatedRollback(before, changed, after).state, changed);
  assert.equal(coordinatedRollback(before, changed, after).strategy, 'STOP_PRESERVE_FORWARD_DATA');
  assert.throws(() => coordinatedRollback({ ...before, projectId: 'caravana-af306' }, after, after));
});
test('CLI defaults to dry-run and rejects arbitrary arguments before key/file operations', () => {
  const dry = spawnSync(process.execPath, ['scripts/rehearse-lab-recovery.mjs'], { encoding: 'utf8' });
  assert.equal(dry.status, 0); assert.equal(JSON.parse(dry.stdout).filesCreated, 0);
  for (const args of [['--project', 'caravana-af306'], ['--input', 'anything.json'], ['--execute-synthetic', '--extra']]) {
    const r = spawnSync(process.execPath, ['scripts/rehearse-lab-recovery.mjs', ...args], { encoding: 'utf8' });
    assert.equal(r.status, 1); assert.doesNotMatch(r.stderr, /AGE-SECRET-KEY/);
  }
});
