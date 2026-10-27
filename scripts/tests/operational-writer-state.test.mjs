import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWriterState, operationalTransitionDecision } from '../recovery/operational-writer-state.mjs';
const state = (phase = 'source_active') => ({ version: 'italo-operational-cutover-v1', sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', copyPlanHash: '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10', operationalIntentConfirmed: true, generation: 1, phase, writerOrganizationId: phase === 'source_active' ? 'caravana-77' : phase === 'target_active' ? 'italo' : '' });
const inventory = (changes = 0) => ({ inventoryComplete: true, generation: 1, inventoryHash: 'a'.repeat(64), targetBusinessChanges: changes });
test('each operational phase has at most one writer; forged or conflicting states fail closed', () => {
  for (const phase of ['source_active', 'frozen', 'target_active']) {
    const result = validateWriterState(state(phase)); assert(!(result.sourceWritable && result.targetWritable));
  }
  for (const patch of [{ writerOrganizationId: 'both' }, { phase: 'archive' }, { generation: 0 }, { generation: 1.5 }, { operationalIntentConfirmed: false }, { targetOrganizationId: 'other' }, { copyPlanHash: 'b'.repeat(64) }]) assert.throws(() => validateWriterState({ ...state(), ...patch }));
});
test('direct writer switching requires freeze and a new inventory, never a date-based closure', () => {
  assert.equal(operationalTransitionDecision(state(), 'target_active', inventory()).decision, 'FREEZE_AND_REINVENTORY_FIRST');
  const decision = operationalTransitionDecision(state(), 'frozen', inventory());
  assert.equal(decision.decision, 'PREPARE_FREEZE_TRANSACTION'); assert.equal(decision.readyForApply, false);
});
test('target traffic prevents returning the source writer and never deletes forward data', () => {
  const result = operationalTransitionDecision(state('frozen'), 'source_active', inventory(1));
  assert.equal(result.decision, 'PRESERVE_TARGET_DATA_FORWARD_REPAIR_REQUIRED');
  assert.equal(result.deleteBusinessDocuments, false); assert.equal(result.readyForApply, false);
});
test('an unchanged target permits preparing a source return, while target activation still requires a real compatible release', () => {
  assert.equal(operationalTransitionDecision(state('frozen'), 'source_active', inventory()).decision, 'PREPARE_SOURCE_RETURN_TRANSACTION');
  assert.equal(operationalTransitionDecision(state('frozen'), 'target_active', inventory()).decision, 'TARGET_OPERATIONAL_RELEASE_AND_ALIAS_VALIDATION_REQUIRED');
});
test('missing, stale-generation, incomplete or malformed evidence cannot authorize a phase change', () => {
  for (const patch of [{ inventoryComplete: false }, { generation: 2 }, { inventoryHash: 'bad' }, { targetBusinessChanges: -1 }]) assert.throws(() => operationalTransitionDecision(state(), 'frozen', { ...inventory(), ...patch }));
  assert.throws(() => operationalTransitionDecision(state(), 'frozen', null));
});
