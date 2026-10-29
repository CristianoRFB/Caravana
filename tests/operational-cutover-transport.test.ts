import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { activationFixture } from '../scripts/tests/tenant-activation-fixture.mjs';
import { planTenantCopy, tenantCopyHash } from '../scripts/recovery/tenant-copy.mjs';
import { activationCopyDocuments, planTenantActivation } from '../scripts/recovery/tenant-activation.mjs';
import { buildOperationalCutoverPlan, commitOperationalCutover, validateOperationalPlanState, operationalActivationWatermark, OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY } from '../scripts/recovery/tenant-operational-cutover.mjs';
import { ROOT, documentPath } from '../scripts/recovery/safety.mjs';
import { fields } from '../scripts/recovery/inventory.mjs';
let env: RulesTestEnvironment;
const demoRoot = 'projects/demo-caravana77-test/databases/(default)/documents';
type Raw = { name: string; fields: Record<string, unknown>; createTime?: string; updateTime?: string };
let fixture: ReturnType<typeof activationFixture>, current: Raw[], paths: Set<string>;
async function api(verb: string, body: unknown) {
  const response = await fetch('http://127.0.0.1:18080/v1/' + demoRoot + ':' + verb, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(body).replaceAll(ROOT, demoRoot) });
  const text = await response.text(); if (!response.ok) throw Error('SYNTHETIC_REST_' + response.status);
  return JSON.parse(text.replaceAll(demoRoot, ROOT));
}
async function read(documents: string[], transaction?: string): Promise<Raw[]> {
  const response = await api('batchGet', { documents: documents.map(p => ROOT + '/' + p), ...(transaction ? { transaction } : {}) });
  const rows = Array.isArray(response) ? response : [response]; return rows.filter(r => r.found).map(r => r.found);
}
const release = () => ({ source: 'd'.repeat(40), rulesSha256: 'e'.repeat(64), manifestSha256: 'f'.repeat(64), verifiedAt: new Date().toISOString() });
async function preview(action: string, baseline?: unknown) {
  current = await read([...paths]);
  return buildOperationalCutoverPlan({ snapshot: fixture.snapshot, copyPlan: fixture.copyPlan, activationReview: fixture.review,
    inventory: { documents: current, readTime: new Date().toISOString() }, action, baseline, release: release(), intentConfirmed: true });
}
async function apply(plan: ReturnType<typeof buildOperationalCutoverPlan>, lostAck = false) {
  const result = await commitOperationalCutover(plan, {
    begin: async () => (await api('beginTransaction', { options: { readWrite: {} } })).transaction,
    read: (transaction: string) => read(plan.expected.map((g: { path: string }) => g.path), transaction),
    commit: async (transaction: string, writes: unknown) => { const result = await api('commit', { transaction, writes }); if (lostAck) throw Error('SYNTHETIC_ACK_LOST'); return result; },
    rollback: (transaction: string) => api('rollback', { transaction }),
  });
  for (const write of plan.writes) paths.add(documentPath(write.update.name));
  const documents = await read(plan.expected.map((g: { path: string }) => g.path)); validateOperationalPlanState(plan, documents, true); return { result, documents };
}
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-caravana77-test', firestore: { rules: readFileSync('firestore.italo-operational.rules', 'utf8') } }); });
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore(); fixture = activationFixture();
  fixture.snapshot.documents.find(d => d.name.endsWith('/caravans/original-trip'))!.fields.date = { stringValue: '2020-01-01' };
  await api('commit', { writes: fixture.snapshot.documents.map(({ name, fields }) => ({ update: { name, fields }, currentDocument: { exists: false } })) });
  const originals = await read(fixture.snapshot.documents.map(d => documentPath(d.name)));
  fixture.snapshot.documents = originals as typeof fixture.snapshot.documents; fixture.snapshot.readTime = new Date().toISOString();
  fixture.copyPlan = planTenantCopy(fixture.snapshot, { sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', targetName: 'Ítalo fictício' }); fixture.review.copyPlanHash = fixture.copyPlan.planHash;
  const copies = activationCopyDocuments(fixture.copyPlan);
  await api('commit', { writes: copies.map(update => ({ update, currentDocument: { exists: false } })) });
  paths = new Set([...originals, ...copies].map(d => documentPath(d.name))); current = await read([...paths]);
  const activation = planTenantActivation(fixture.snapshot, fixture.copyPlan, current, fixture.review);
  await api('commit', { writes: activation.creates.map(({ update, currentDocument }) => ({ update, currentDocument })) });
  activation.creates.forEach((w: { path: string }) => paths.add(w.path));
});
describe('official phase transport contract against the isolated REST emulator', () => {
  it('executes prepare/freeze/activation with real REST transactions, masks and exact readback while preserving originals and UNKNOWN', async () => {
    const originalHash = tenantCopyHash(fixture.snapshot.documents);
    await apply(await preview('prepare')); await apply(await preview('freeze')); const plan = await preview('activate'); const { documents } = await apply(plan);
    const baseline = operationalActivationWatermark(plan, documents); expect(baseline.documents).toHaveLength(activationCopyDocuments(fixture.copyPlan).length + 4);
    expect(tenantCopyHash(await read(fixture.snapshot.documents.map(d => documentPath(d.name))))).toBe(originalHash);
    expect(fields((await read([OPERATIONAL_DIRECTORY]))[0]).writerOrganizationId).toBe('italo');
    const unknown = fixture.copyPlan.pathMap.find(p => p.sourcePath === 'registrations/' + 'b'.repeat(64))!.targetPath;
    expect(fields((await read([unknown]))[0]).paymentTotalCents).toBeNull();
    await apply(await preview('freeze')); await apply(await preview('return-source', baseline));
    expect(fields((await read([OPERATIONAL_LEDGER]))[0]).writerOrganizationId).toBe('caravana-77');
  });
  it('a stale source precondition aborts all phase writes without partial controls', async () => {
    const plan = await preview('prepare');
    await api('commit', { writes: [{ update: { name: ROOT + '/organizations/caravana-77', fields: { marker: { stringValue: 'synthetic-drift' } } }, updateMask: { fieldPaths: ['marker'] } }] });
    await expect(apply(plan)).rejects.toThrow('DRIFT');
    expect(await read([OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY])).toHaveLength(0);
  });
  it('a lost REST acknowledgement leaves one complete phase and can be verified without another commit', async () => {
    const plan = await preview('prepare'); await expect(apply(plan, true)).rejects.toThrow('ACK_LOST');
    const documents = await read(plan.expected.map((g: { path: string }) => g.path)); expect(validateOperationalPlanState(plan, documents, true)).toBe(true);
    expect(fields(documents.find(d => documentPath(d.name) === OPERATIONAL_LEDGER)!).generation).toBe(1);
  });
});
