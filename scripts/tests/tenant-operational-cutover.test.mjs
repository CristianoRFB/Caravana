import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { activationFixture } from './tenant-activation-fixture.mjs';
import { planTenantCopy, tenantCopyHash } from '../recovery/tenant-copy.mjs';
import { activationCopyDocuments, planTenantActivation } from '../recovery/tenant-activation.mjs';
import { ROOT, documentPath } from '../recovery/safety.mjs';
import { fields } from '../recovery/inventory.mjs';
import { buildOperationalCutoverPlan, commitOperationalCutover, operationalActivationWatermark, OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY } from '../recovery/tenant-operational-cutover.mjs';
function fixture() {
  const f = activationFixture(); f.now = Date.parse('2026-10-27T20:00:00Z');
  const original = f.snapshot.documents.find(d => documentPath(d.name) === 'caravans/original-trip');
  original.fields.date = { stringValue: '2020-01-01' }; original.fields.status = { stringValue: 'published' };
  f.copyPlan = planTenantCopy(f.snapshot, { sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', targetName: 'Ítalo fictício' });
  f.review.copyPlanHash = f.copyPlan.planHash;
  f.current = structuredClone([...f.snapshot.documents, ...activationCopyDocuments(f.copyPlan).map(d => ({ ...d, createTime: f.snapshot.readTime, updateTime: f.snapshot.readTime }))]);
  f.activation = planTenantActivation(f.snapshot, f.copyPlan, f.current, f.review);
  f.current.push(...f.activation.creates.map(w => ({ ...w.update, createTime: f.snapshot.readTime, updateTime: f.snapshot.readTime })));
  return f;
}
function preview(f, action) { return buildOperationalCutoverPlan({ snapshot: f.snapshot, copyPlan: f.copyPlan, activationReview: f.review,
  inventory: { documents: f.current, readTime: new Date(f.now - 1000).toISOString() }, action, baseline: f.baseline, now: f.now, intentConfirmed: true,
  release: { source: 'd'.repeat(40), rulesSha256: 'e'.repeat(64), manifestSha256: 'f'.repeat(64), verifiedAt: new Date(f.now - 1000).toISOString() } }); }
function apply(f, plan) {
  const state = new Map(f.current.map(d => [documentPath(d.name), d]));
  for (const w of plan.writes) {
    const p = documentPath(w.update.name), prior = state.get(p); let data = structuredClone(prior?.fields ?? {});
    if (w.updateMask) for (const k of w.updateMask.fieldPaths) { delete data[k]; if (k in w.update.fields) data[k] = w.update.fields[k]; }
    else data = structuredClone(w.update.fields);
    const at = new Date(f.now).toISOString(); state.set(p, { name: w.update.name, fields: data, createTime: prior?.createTime ?? at, updateTime: at });
  }
  f.current = [...state.values()]; f.now += 2000; return plan;
}
const setup = f => { apply(f, preview(f, 'prepare')); apply(f, preview(f, 'freeze')); const active = apply(f, preview(f, 'activate')); f.baseline = operationalActivationWatermark(active, f.current); return active; };
test('prepared source, freeze and one atomic activation preserve originals and never copy registrations or assign a subscription', () => {
  const f = fixture(), originalHash = tenantCopyHash(f.snapshot.documents), p = preview(f, 'prepare');
  assert.equal(p.writes.length, 3); assert.equal(p.next.writerOrganizationId, 'caravana-77'); apply(f, p);
  assert.throws(() => preview(f, 'activate'), /FREEZE_AND_REINVENTORY/);
  apply(f, preview(f, 'freeze')); const activation = preview(f, 'activate');
  assert.equal(activation.next.writerOrganizationId, 'italo'); assert.equal(activation.next.everActivated, true);
  assert(activation.writes.every(w => !w.update.name.startsWith(ROOT + '/registrations/')));
  assert(activation.writes.every(w => !/\/(subscriptions|tenantEntitlements|memberships)\//.test(w.update.name)));
  assert.equal(activation.writes.filter(w => w.update.name.includes('/legacyRegistrationAliases/')).length, 4);
  apply(f, activation);
  assert.equal(fields(f.current.find(d => documentPath(d.name) === OPERATIONAL_LEDGER)).phase, 'target_active');
  assert.equal(tenantCopyHash(f.snapshot.documents), originalHash);
  for (const original of f.snapshot.documents) assert.deepEqual(f.current.find(d => d.name === original.name), original);
  assert.equal(fields(f.current.find(d => documentPath(d.name) === 'organizations/italo')).importPending, false);
});
test('freeze before activation can safely resume source with no business-document changes', () => {
  const f = fixture(); apply(f, preview(f, 'prepare')); apply(f, preview(f, 'freeze')); const p = preview(f, 'return-source');
  assert.equal(p.writes.length, 3); assert.equal(p.next.writerOrganizationId, 'caravana-77'); assert.equal(p.next.everActivated, false);
});
test('a proved pretraffic watermark permits source return, restores only target metadata and allows a later reviewed activation', () => {
  const f = fixture(); setup(f); apply(f, preview(f, 'freeze')); const p = preview(f, 'return-source');
  assert.equal(p.writes.filter(w => w.updateMask).length, 3); apply(f, p);
  assert.equal(fields(f.current.find(d => documentPath(d.name) === 'organizations/italo')).importPending, true);
  apply(f, preview(f, 'freeze')); const reactivate = preview(f, 'activate');
  assert.equal(reactivate.writes.filter(w => w.update.name.includes('/legacyRegistrationAliases/')).length, 0);
});
test('post-cutover payment, added expense or membership revocation prevents reopening the source, while a target resume preserves changes', () => {
  for (const mutate of [
    f => { f.current.find(d => /^registrations\//.test(documentPath(d.name)) && fields(d).organizationId === 'italo').fields.paymentTotalCents = { integerValue: '100' }; },
    f => { f.current.push(f.raw('caravans/' + fields(f.current.find(d => documentPath(d.name) === OPERATIONAL_LEDGER)).targetCaravanId + '/expenses/new', { organizationId: 'italo', amountCents: 100 })); },
    f => { f.current.find(d => documentPath(d.name).startsWith('memberships/') && fields(d).organizationId === 'italo').fields.status = { stringValue: 'revoked' }; },
  ]) {
    const f = fixture(); setup(f); mutate(f); apply(f, preview(f, 'freeze'));
    assert.throws(() => preview(f, 'return-source'), /TARGET_TRAFFIC_FORWARD_REPAIR/);
    const resume = preview(f, 'activate'); assert.equal(resume.writes.length, 3); assert.equal(resume.next.writerOrganizationId, 'italo');
  }
});
test('unexpected source growth, conflicting aliases and partial controls stop before any operation', () => {
  const f = fixture(); f.current.push(f.raw('registrations/new-source', { organizationId: 'caravana-77', caravanId: 'original-trip' }));
  assert.throws(() => preview(f, 'prepare'), /DIVERGENCE/);
  const g = fixture(); apply(g, preview(g, 'prepare')); g.current.find(d => documentPath(d.name) === OPERATIONAL_DIRECTORY).fields.phase = { stringValue: 'target_active' };
  assert.throws(() => preview(g, 'freeze'), /CONTROL_STATE_CONFLICT/);
});
test('a transaction rechecks every exact guard, and an uncertain commit is never retried', async () => {
  const f = fixture(), p = preview(f, 'prepare'); let commits = 0, rollbacks = 0;
  const transport = { begin: async () => 'synthetic-transaction', read: async () => f.current,
    commit: async () => { commits++; throw Error('lost-ack'); }, rollback: async () => { rollbacks++; } };
  await assert.rejects(commitOperationalCutover(p, transport), /lost-ack/); assert.equal(commits, 1); assert.equal(rollbacks, 0);
  const drifted = structuredClone(f.current); drifted[0].updateTime = '2026-10-27T20:00:01Z';
  await assert.rejects(commitOperationalCutover(p, { ...transport, read: async () => drifted }), /PRECONDITION_DRIFT/);
  assert.equal(commits, 1); assert.equal(rollbacks, 1);
});
test('even a rehashed plan cannot overwrite financial or arbitrary caravan fields', async () => {
  const f = fixture(); apply(f, preview(f, 'prepare')); apply(f, preview(f, 'freeze'));
  const p = preview(f, 'activate'), target = p.writes.find(w => w.update.name.includes('/caravans/'));
  target.update.fields.reservedSeats = { integerValue: '0' }; target.updateMask.fieldPaths.push('reservedSeats');
  const { planHash, ...body } = p; p.planHash = tenantCopyHash(body); let begun = false;
  await assert.rejects(commitOperationalCutover(p, { begin: async () => { begun = true; } }), /BUSINESS_FIELD_OVERWRITE/);
  assert.equal(begun, false);
});
test('the hosted phase CLI refuses this workstation and COPY flags before credentials or private reads', () => {
  for (const args of [['--preview', 'prepare'], ['--apply-copy-to-italo', 'prepare']]) {
    const result = spawnSync(process.execPath, ['scripts/recovery/cloudshell-operational-cutover.mjs', ...args, '/tmp/NOT_PRIVATE'], { encoding: 'utf8', env: { ...process.env, CLOUD_SHELL: 'false' } });
    assert.notEqual(result.status, 0); assert.match(result.stdout, /CUTOVER_(PRIVATE_CLOUD_SHELL|EXPLICIT_PHASE_MODE)_REQUIRED/);
    assert.doesNotMatch(result.stdout + result.stderr, /Bearer|ya29|PRIVATE_DATA/);
  }
});
