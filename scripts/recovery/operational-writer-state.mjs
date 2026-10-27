// No network or writes. Decisions require complete fresh inventories supplied
// by a future protected executor; booleans never assert an operational release.
import { requireThat } from './safety.mjs';
export const WRITER_PHASES = ['source_active', 'frozen', 'target_active'];
export function validateWriterState(state) {
  requireThat(state?.version === 'italo-operational-cutover-v1'
    && state.sourceOrganizationId === 'caravana-77' && state.targetOrganizationId === 'italo'
    && state.copyPlanHash === '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
    && state.operationalIntentConfirmed === true && Number.isSafeInteger(state.generation) && state.generation > 0
    && WRITER_PHASES.includes(state.phase), 'OPERATIONAL_WRITER_STATE_INVALID');
  const writer = state.phase === 'source_active' ? 'caravana-77' : state.phase === 'target_active' ? 'italo' : '';
  requireThat(state.writerOrganizationId === writer, 'OPERATIONAL_SINGLE_WRITER_REQUIRED');
  return { sourceWritable: writer === 'caravana-77', targetWritable: writer === 'italo' };
}
export function operationalTransitionDecision(state, targetPhase, evidence) {
  validateWriterState(state);
  requireThat(WRITER_PHASES.includes(targetPhase), 'OPERATIONAL_TARGET_PHASE_INVALID');
  requireThat(evidence?.inventoryComplete === true && evidence.generation === state.generation
    && typeof evidence.inventoryHash === 'string' && /^[a-f0-9]{64}$/.test(evidence.inventoryHash)
    && Number.isSafeInteger(evidence.targetBusinessChanges) && evidence.targetBusinessChanges >= 0,
  'OPERATIONAL_FRESH_INVENTORY_REQUIRED');
  if (state.phase === targetPhase) return { decision: 'NOOP', readyForApply: false, deleteBusinessDocuments: false };
  if (state.phase !== 'frozen' && targetPhase !== 'frozen') return { decision: 'FREEZE_AND_REINVENTORY_FIRST', readyForApply: false, deleteBusinessDocuments: false };
  if (targetPhase === 'source_active' && evidence.targetBusinessChanges > 0)
    return { decision: 'PRESERVE_TARGET_DATA_FORWARD_REPAIR_REQUIRED', readyForApply: false, deleteBusinessDocuments: false };
  if (targetPhase === 'target_active')
    return { decision: 'TARGET_OPERATIONAL_RELEASE_AND_ALIAS_VALIDATION_REQUIRED', readyForApply: false, deleteBusinessDocuments: false };
  // Even a freeze or safe source return needs its own transactional executor
  // and readback. This decision cannot be mistaken for a hosted APPLY plan.
  return { decision: targetPhase === 'frozen' ? 'PREPARE_FREEZE_TRANSACTION' : 'PREPARE_SOURCE_RETURN_TRANSACTION',
    nextGeneration: state.generation + 1, readyForApply: false, deleteBusinessDocuments: false };
}
