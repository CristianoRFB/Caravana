import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { activationFixture } from './tenant-activation-fixture.mjs';
import { planTenantCopy } from '../recovery/tenant-copy.mjs';
import { activationCopyDocuments, planTenantActivation } from '../recovery/tenant-activation.mjs';
import { inspectCutoverInventory } from '../recovery/tenant-cutover-preflight.mjs';

const now = Date.parse('2026-10-27T20:00:00Z');
function fixture(date = '2026-10-20') {
  const f = activationFixture();
  f.snapshot.documents.find(raw => raw.name.endsWith('/caravans/original-trip')).fields.date = { stringValue: date };
  f.copyPlan = planTenantCopy(f.snapshot, { sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', targetName: 'Ítalo fictício' });
  f.current = structuredClone([...f.snapshot.documents, ...activationCopyDocuments(f.copyPlan).map(raw => ({ ...raw, createTime: f.snapshot.readTime, updateTime: f.snapshot.readTime }))]);
  f.review.copyPlanHash = f.copyPlan.planHash;
  f.activation = structuredClone(planTenantActivation(f.snapshot, f.copyPlan, f.current, f.review));
  f.current.push(...f.activation.creates.map(write => ({ ...write.update, createTime: f.snapshot.readTime, updateTime: f.snapshot.readTime })));
  f.inventory = { documents: f.current, readTime: '2026-10-27T19:59:55Z' };
  return f;
}
const preview = f => inspectCutoverInventory(f.snapshot, f.copyPlan, f.activation, f.inventory, now);

test('a reconciled past event is a read-only inventory result, never approval or an APPLY plan', () => {
  const f = fixture(), before = JSON.stringify(f), result = preview(f);
  assert.equal(result.status, 'INVENTORY_RECONCILED_CUTOVER_POLICY_AND_IMPLEMENTATION_PENDING');
  assert.equal(result.summary.allEventsBeforeToday, true);
  assert.equal(result.summary.sourceCaravans, 1); assert.equal(result.summary.sourceRegistrations, 2);
  assert.equal(result.summary.unknownFinancialTotalsPreserved, f.copyPlan.summary.unknownFinancialTotals);
  assert.equal(result.readyForApply, false); assert.deepEqual(result.writes, []);
  assert.equal(JSON.stringify(f), before);
});
test('a newly added source caravan or registration is caught even when all pinned original versions are unchanged', () => {
  for (const [path, data] of [['caravans/new-event', { organizationId: 'caravana-77' }], ['registrations/' + 'c'.repeat(64), { organizationId: 'caravana-77', caravanId: 'original-trip' }]]) {
    const f = fixture(); f.current.push(f.raw(path, data)); const result = preview(f);
    assert.equal(result.status, 'STOP_RECONCILE_WITHOUT_RECOPY');
    assert(result.issues.includes('SOURCE_DATA_ADDED_AFTER_COPY'));
    assert.equal(result.summary.unexpectedSourceDocuments, 1);
  }
});
test('new descendants without redundant organizationId, copied-side growth and conflicting ownership cannot pass silently', () => {
  const cases = [
    ['registrations/' + 'a'.repeat(64) + '/proofs/new', {}, 'SOURCE_DATA_ADDED_AFTER_COPY'],
    ['caravans/new-target', { organizationId: 'italo' }, 'TARGET_DATA_ADDED_AFTER_COPY'],
    ['payments/conflicting', { organizationId: 'foreign', caravanId: 'original-trip' }, 'CROSS_ORGANIZATION_REFERENCE_REQUIRES_REVIEW'],
  ];
  for (const [path, data, issue] of cases) { const f = fixture(); f.current.push(f.raw(path, data)); assert(preview(f).issues.includes(issue)); }
});
test('unrelated tenants do not create a false source reconciliation requirement', () => {
  const f = fixture(); f.current.push(f.raw('caravans/foreign', { organizationId: 'foreign', date: '2026-10-30' }));
  assert.deepEqual(preview(f).issues, []);
});
test('invalid dates, stale or inconsistent inventories, missing activation and changed originals fail their own gates', () => {
  assert(preview(fixture('2026-02-31')).issues.includes('EVENT_DATE_REQUIRES_REVIEW'));
  const stale = fixture(); stale.inventory.readTime = '2026-10-26T20:00:00Z'; assert.throws(() => preview(stale), /FRESH_FIXED_READ_TIME/);
  const future = fixture(); future.current[0].updateTime = '2026-10-28T20:00:00Z'; assert.throws(() => preview(future), /INCONSISTENT_READ_TIME/);
  const missing = fixture(); missing.current.splice(-4); assert.throws(() => preview(missing), /ACTIVATION_MUST_ALREADY_EXIST/);
  const changed = fixture(); changed.current[0].fields.extra = { stringValue: 'changed' }; assert.throws(() => preview(changed), /PRECONDITION_DRIFT/);
});
test('the private CLI refuses this workstation before reading private files or acquiring credentials', () => {
  const result = spawnSync(process.execPath, ['scripts/recovery/cloudshell-cutover-inventory.mjs', '--preview', 'C:/not-a-private-cloud-shell'], { encoding: 'utf8', env: { ...process.env, CLOUD_SHELL: 'false' } });
  assert.notEqual(result.status, 0); assert.match(result.stdout, /PRIVATE_CLOUD_SHELL_REQUIRED/);
});
