// Private REST plans only: no network, Auth writes, COPY or original writes.
import { ROOT, canonical, documentPath, requireThat } from './safety.mjs';
import { fields } from './inventory.mjs';
import { tenantCopyHash, validateTenantCopyPlan } from './tenant-copy.mjs';
import { activationCopyDocuments, activationCandidatePaths, normalizeRest, planTenantActivation } from './tenant-activation.mjs';
import { inspectCutoverInventory } from './tenant-cutover-preflight.mjs';
export const OPERATIONAL_LEDGER = 'organizations/italo/tenantCutovers/operational-v1';
export const OPERATIONAL_DIRECTORY = 'publicTenantCutovers/italo';
const grantKeys = ['version', 'copyPlanHash', 'sourceOrganizationId', 'targetOrganizationId', 'sourceCaravanId', 'targetCaravanId', 'sourceSlug', 'targetSlug', 'capacityCeiling', 'operationalIntentConfirmed'];
const encode = value => typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value };
const encodedFields = value => Object.fromEntries(Object.entries(value).map(([key, v]) => [key, encode(v)]));
const rawEqual = (a, b) => tenantCopyHash(a ?? null) === tenantCopyHash(b ?? null);
const fieldEqual = (a, b) => canonical(normalizeRest(a ?? {})) === canonical(normalizeRest(b ?? {}));
const eventPrefix = 'organizations/italo/tenantCutoverEvents/';
export function operationalCopyScope(snapshot, copyPlan) {
  validateTenantCopyPlan(snapshot, copyPlan);
  requireThat(copyPlan.sourceOrganizationId === 'caravana-77' && copyPlan.targetOrganizationId === 'italo', 'CUTOVER_EXACT_COPY_REQUIRED');
  const tripWrites = copyPlan.creates.filter(w => /^caravans\/[^/]+$/.test(w.sourcePath || ''));
  requireThat(tripWrites.length === 1, 'CUTOVER_ONE_EXISTING_EVENT_REQUIRED');
  const trip = tripWrites[0], original = snapshot.documents.find(d => documentPath(d.name) === trip.sourcePath), source = fields(original), target = fields(trip.update);
  requireThat(source.status === 'published' && Number.isSafeInteger(source.capacity) && source.capacity > 0 && source.capacity <= 1000
    && Number.isSafeInteger(source.reservedSeats) && source.reservedSeats >= 0 && source.reservedSeats <= source.capacity, 'CUTOVER_EXISTING_CAPACITY_REQUIRED');
  const sourceCaravanId = trip.sourcePath.split('/')[1], targetCaravanId = trip.targetPath.split('/')[1];
  requireThat([sourceCaravanId, targetCaravanId].every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id)) && sourceCaravanId !== targetCaravanId
    && [source.slug, target.slug].every(slug => typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{0,159}$/.test(slug)) && source.slug !== target.slug, 'CUTOVER_VALID_EVENT_IDENTIFIERS_REQUIRED');
  const registrations = copyPlan.creates.filter(w => /^registrations\/[^/]+$/.test(w.sourcePath || '')).map(w => ({ sourceId: w.sourcePath.split('/')[1], targetId: w.targetPath.split('/')[1] }));
  requireThat(registrations.length > 0 && registrations.length <= 200 && registrations.every(r => /^[A-Za-z0-9_-]{1,128}$/.test(r.sourceId) && /^[a-f0-9]{64}$/.test(r.targetId) && r.sourceId !== r.targetId), 'CUTOVER_STABLE_REGISTRATION_IDENTIFIERS_REQUIRED');
  const aliases = registrations.flatMap(r => [r.sourceId, r.targetId].map(lookupId => ({ path: 'legacyRegistrationAliases/' + lookupId,
    fields: encodedFields({ lookupId, ...r, organizationId: 'italo', targetCaravanId, copyPlanHash: copyPlan.planHash }) })));
  requireThat(new Set(aliases.map(a => a.path)).size === aliases.length, 'CUTOVER_ALIAS_COLLISION');
  return { version: 'italo-operational-cutover-v1', copyPlanHash: copyPlan.planHash, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', sourceCaravanId, targetCaravanId,
    sourceSlug: source.slug, targetSlug: target.slug, capacityCeiling: source.capacity, operationalIntentConfirmed: true, aliases };
}
function inspectControls(scope, state) {
  const ledger = state.get(OPERATIONAL_LEDGER), directory = state.get(OPERATIONAL_DIRECTORY);
  requireThat(Boolean(ledger) === Boolean(directory), 'CUTOVER_PARTIAL_CONTROL_STATE');
  if (!ledger) return null;
  const data = fields(ledger);
  requireThat(fieldEqual(ledger.fields, directory.fields) && grantKeys.every(key => data[key] === scope[key])
    && ['source_active', 'frozen', 'target_active'].includes(data.phase) && Number.isSafeInteger(data.generation) && data.generation > 0
    && typeof data.everActivated === 'boolean' && data.writerOrganizationId === (data.phase === 'source_active' ? 'caravana-77' : data.phase === 'target_active' ? 'italo' : '')
    && (data.phase !== 'target_active' || data.everActivated === true), 'CUTOVER_CONTROL_STATE_CONFLICT');
  return data;
}
export function buildOperationalCutoverPlan({ snapshot, copyPlan, activationReview, inventory, action, release, baseline, now = Date.now(), intentConfirmed }) {
  requireThat(intentConfirmed === true && ['prepare', 'freeze', 'activate', 'return-source'].includes(action), 'CUTOVER_OPERATIONAL_INTENT_AND_ACTION_REQUIRED');
  const scope = operationalCopyScope(snapshot, copyPlan), state = new Map(inventory?.documents?.map(d => [documentPath(d.name), d]));
  requireThat(state.size === inventory.documents.length && state.size <= 550 && Number.isFinite(Date.parse(inventory.readTime))
    && Date.parse(inventory.readTime) <= now && now - Date.parse(inventory.readTime) <= 60000, 'CUTOVER_FRESH_COMPLETE_INVENTORY_REQUIRED');
  for (const original of snapshot.documents) requireThat(rawEqual(state.get(documentPath(original.name)), original), 'CUTOVER_ORIGINAL_DRIFT_NO_RECOPY');
  const control = inspectControls(scope, state), emergencyFreeze = action === 'freeze' && control?.phase === 'target_active';
  requireThat(release?.source && /^[a-f0-9]{40}$/.test(release.source) && /^[a-f0-9]{64}$/.test(release.rulesSha256) && /^[a-f0-9]{64}$/.test(release.manifestSha256)
    && (emergencyFreeze || Number.isFinite(Date.parse(release.verifiedAt)) && now - Date.parse(release.verifiedAt) >= 0 && now - Date.parse(release.verifiedAt) <= 60000), 'CUTOVER_VERIFIED_RELEASE_REQUIRED');
  requireThat(action === 'prepare' ? !control : control, 'CUTOVER_WRONG_INITIAL_CONTROL_STATE');
  let nextPhase, frozenFrom = '', everActivated = control?.everActivated ?? false;
  if (action === 'prepare') nextPhase = 'source_active';
  if (action === 'freeze') { requireThat(control.phase !== 'frozen', 'CUTOVER_ALREADY_FROZEN_REPREVIEW'); nextPhase = 'frozen'; frozenFrom = control.phase; }
  if (action === 'activate') { requireThat(control.phase === 'frozen' && ['source_active', 'target_active'].includes(control.frozenFrom), 'CUTOVER_FREEZE_AND_REINVENTORY_FIRST'); nextPhase = 'target_active'; everActivated = true; }
  if (action === 'return-source') { requireThat(control.phase === 'frozen', 'CUTOVER_FREEZE_AND_REINVENTORY_FIRST'); nextPhase = 'source_active'; }
  const initialActivation = action === 'activate' && control.frozenFrom === 'source_active';
  const copied = activationCopyDocuments(copyPlan), copiedPaths = new Set(copied.map(d => documentPath(d.name)));
  const relatedPaths = new Set([...snapshot.documents.map(d => documentPath(d.name)), ...copiedPaths, ...activationCandidatePaths]);
  const ownControl = path => [OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY].includes(path) || path.startsWith(eventPrefix) || scope.aliases.some(a => a.path === path);
  if (!control?.everActivated || initialActivation || control.phase === 'source_active' || control.phase === 'frozen' && control.frozenFrom === 'source_active') {
    const filtered = inventory.documents.filter(d => !ownControl(documentPath(d.name)));
    const freshActivation = planTenantActivation(snapshot, copyPlan, filtered, activationReview);
    requireThat(freshActivation.creates.length === 0, 'CUTOVER_PRIVATE_ACTIVATION_MUST_EXIST');
    const audit = inspectCutoverInventory(snapshot, copyPlan, freshActivation, { ...inventory, documents: filtered }, now);
    requireThat(audit.issues.length === 0, 'CUTOVER_DIVERGENCE_REQUIRES_RECONCILIATION_NO_RECOPY');
  }
  for (const alias of scope.aliases) {
    const existing = state.get(alias.path);
    requireThat(!existing || fieldEqual(existing.fields, alias.fields), 'CUTOVER_EXISTING_ALIAS_CONFLICT');
    if (!control?.everActivated) requireThat(!existing, 'CUTOVER_ALIAS_BEFORE_ACTIVATION_CONFLICT');
    if (control?.everActivated) requireThat(existing, 'CUTOVER_ACTIVATED_ALIAS_MISSING');
  }
  if (control?.everActivated && (control.phase === 'target_active' || control.phase === 'frozen' && control.frozenFrom === 'target_active')) {
    requireThat(fields(state.get('organizations/italo')).importPending === false
      && fields(state.get('caravans/' + scope.targetCaravanId)).organizationId === 'italo', 'CUTOVER_ACTIVE_TARGET_STATE_REQUIRED');
  }
  if (action === 'return-source' && control.everActivated) {
    requireThat(baseline?.activationOperationHash === control.activationOperationHash && Array.isArray(baseline.documents), 'CUTOVER_PRETRAFFIC_WATERMARK_REQUIRED');
    const expected = new Map(baseline.documents.map(d => [documentPath(d.name), d]));
    const owned = inventory.documents.filter(d => {
      const p = documentPath(d.name), data = fields(d);
      return !ownControl(p) && (relatedPaths.has(p) && !snapshot.documents.some(o => o.name === d.name) || data.organizationId === 'italo'
        || p.startsWith('organizations/italo/') || p.startsWith('tenantTeam/italo/')
        || p.startsWith('caravans/' + scope.targetCaravanId + '/') || scope.aliases.some(a => p.startsWith('registrations/' + fields({ fields: a.fields }).targetId + '/')));
    });
    requireThat(owned.length === expected.size && owned.every(d => rawEqual(expected.get(documentPath(d.name)), d)), 'CUTOVER_TARGET_TRAFFIC_FORWARD_REPAIR_REQUIRED');
  }
  const generation = (control?.generation ?? 0) + 1, writerOrganizationId = nextPhase === 'source_active' ? 'caravana-77' : nextPhase === 'target_active' ? 'italo' : '';
  const inputHash = tenantCopyHash({ action, generation, copyPlanHash: scope.copyPlanHash, release, inventory });
  const next = { ...Object.fromEntries(grantKeys.map(k => [k, scope[k]])), phase: nextPhase, writerOrganizationId, generation, everActivated, frozenFrom,
    lastOperationHash: inputHash, releaseSource: release.source, activationOperationHash: initialActivation ? inputHash : control?.activationOperationHash ?? '' };
  const writes = [];
  const write = (path, data, mask) => {
    const old = state.get(path);
    requireThat(!snapshot.documents.some(d => documentPath(d.name) === path), 'CUTOVER_ORIGINAL_WRITE_REFUSED');
    writes.push({ update: { name: ROOT + '/' + path, fields: data }, ...(mask ? { updateMask: { fieldPaths: mask } } : {}), currentDocument: old ? { updateTime: old.updateTime } : { exists: false } });
  };
  write(OPERATIONAL_LEDGER, encodedFields(next)); write(OPERATIONAL_DIRECTORY, encodedFields(next));
  if (initialActivation) {
    write('organizations/italo', { importPending: encode(false) }, ['importPending']);
    write('caravans/' + scope.targetCaravanId, { status: encode('published'), importPending: encode(false) }, ['status', 'importPending', 'lastReservationNonce', 'lastReservationId']);
    write('tenantUsage/italo', { publishedCaravans: encode(1) }, ['publishedCaravans']);
    for (const alias of scope.aliases) if (!state.has(alias.path)) write(alias.path, alias.fields);
  }
  if (action === 'return-source' && control.everActivated) {
    for (const [path, mask] of [['organizations/italo', ['importPending']], ['caravans/' + scope.targetCaravanId, ['status', 'importPending', 'lastReservationNonce', 'lastReservationId']], ['tenantUsage/italo', ['publishedCaravans']]]) {
      const original = copied.find(d => documentPath(d.name) === path); requireThat(original, 'CUTOVER_RESTORE_METADATA_BASE_REQUIRED');
      write(path, Object.fromEntries(mask.filter(k => k in original.fields).map(k => [k, original.fields[k]])), mask);
    }
  }
  const eventPath = eventPrefix + inputHash.slice(0, 32);
  requireThat(!state.has(eventPath), 'CUTOVER_EVENT_COLLISION');
  write(eventPath, encodedFields({ version: 'italo-operational-event-v1', organizationId: 'italo', copyPlanHash: scope.copyPlanHash, action,
    generation, fromPhase: control?.phase ?? 'unprepared', phase: nextPhase, operationHash: inputHash, releaseSource: release.source, preparedAt: inventory.readTime }));
  const guardPaths = new Set([...relatedPaths, OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY, eventPath, ...scope.aliases.map(a => a.path), 'subscriptions/italo', 'tenantEntitlements/italo']);
  const expected = [...guardPaths].sort().map(path => ({ path, document: state.get(path) ?? null }));
  const body = { version: 'italo-operational-plan-v1', action, copyPlanHash: scope.copyPlanHash, release, inventoryReadTime: inventory.readTime,
    createdAt: new Date(now).toISOString(), next, operationHash: inputHash, eventPath, targetBaselinePaths: [...new Set([...copiedPaths, ...activationCandidatePaths])].sort(), expected, writes,
    summary: { originalDocuments: snapshot.documents.length, copiedDocuments: copied.length, aliases: scope.aliases.length, phase: nextPhase, generation,
      originalWrites: 0, authWrites: 0, commercialAssignments: 0, copyRepeated: false, businessDocumentsDeleted: 0 } };
  return { ...body, planHash: tenantCopyHash(body) };
}
export function validateOperationalPlanState(plan, documents, after = false) {
  const { planHash, ...body } = plan; requireThat(plan.version === 'italo-operational-plan-v1' && tenantCopyHash(body) === planHash, 'CUTOVER_PLAN_TAMPERED');
  const state = new Map(documents.map(d => [documentPath(d.name), d]));
  for (const guard of plan.expected) {
    const written = plan.writes.find(w => documentPath(w.update.name) === guard.path), found = state.get(guard.path);
    if (!after || !written) requireThat(rawEqual(found ?? null, guard.document), 'CUTOVER_TRANSACTION_PRECONDITION_DRIFT');
    else {
      const expectedFields = structuredClone(guard.document?.fields ?? {});
      if (written.updateMask) for (const k of written.updateMask.fieldPaths) { delete expectedFields[k]; if (k in written.update.fields) expectedFields[k] = written.update.fields[k]; }
      else { for (const k of Object.keys(expectedFields)) delete expectedFields[k]; Object.assign(expectedFields, written.update.fields); }
      requireThat(found && fieldEqual(found.fields, expectedFields), 'CUTOVER_CONTROL_READBACK_MISMATCH');
    }
  }
  return true;
}
export function operationalActivationWatermark(plan, documents) {
  requireThat(plan.action === 'activate' && plan.next.activationOperationHash === plan.operationHash, 'CUTOVER_INITIAL_ACTIVATION_BASELINE_REQUIRED');
  validateOperationalPlanState(plan, documents, true);
  const targetPaths = new Set(plan.targetBaselinePaths);
  requireThat(targetPaths.size === plan.summary.copiedDocuments + activationCandidatePaths.length && [...targetPaths].every(p => plan.expected.some(g => g.path === p && g.document)), 'CUTOVER_COMPLETE_TARGET_WATERMARK_REQUIRED');
  return { version: 'italo-pretraffic-watermark-v1', activationOperationHash: plan.operationHash, documents: structuredClone(documents.filter(d => targetPaths.has(documentPath(d.name)))) };
}
export async function commitOperationalCutover(plan, transport, onAttempt = () => {}) {
  validateOperationalPlanState(plan, plan.expected.filter(g => g.document).map(g => g.document));
  requireThat(plan.writes.length >= 3 && plan.writes.length <= 410 && plan.writes.every(w => !w.delete && !w.transform && w.currentDocument
    && (w.update.name.startsWith(ROOT + '/legacyRegistrationAliases/') || w.update.name.startsWith(ROOT + '/' + eventPrefix)
      || [OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY, 'organizations/italo', 'tenantUsage/italo', 'caravans/' + plan.next.targetCaravanId].includes(documentPath(w.update.name)))), 'CUTOVER_WRITE_SCOPE_REFUSED');
  for (const write of plan.writes) {
    const p = documentPath(write.update.name), mask = write.updateMask?.fieldPaths, data = fields(write.update);
    if ([OPERATIONAL_LEDGER, OPERATIONAL_DIRECTORY].includes(p)) requireThat(!mask && fieldEqual(write.update.fields, encodedFields(plan.next)), 'CUTOVER_EXACT_CONTROL_FIELDS_REQUIRED');
    if (['organizations/italo', 'tenantUsage/italo', 'caravans/' + plan.next.targetCaravanId].includes(p)) {
      const allowed = p === 'organizations/italo' ? ['importPending'] : p === 'tenantUsage/italo' ? ['publishedCaravans'] : ['status', 'importPending', 'lastReservationNonce', 'lastReservationId'];
      requireThat(['activate', 'return-source'].includes(plan.action) && Array.isArray(mask) && canonical([...mask].sort()) === canonical([...allowed].sort())
        && Object.keys(data).every(k => allowed.includes(k)), 'CUTOVER_BUSINESS_FIELD_OVERWRITE_REFUSED');
    }
    if (p.startsWith('legacyRegistrationAliases/')) requireThat(plan.action === 'activate' && write.currentDocument.exists === false && !mask
      && Object.keys(data).sort().join(',') === ['lookupId','sourceId','targetId','organizationId','targetCaravanId','copyPlanHash'].sort().join(',')
      && data.organizationId === 'italo' && data.targetCaravanId === plan.next.targetCaravanId && data.copyPlanHash === plan.copyPlanHash
      && p === 'legacyRegistrationAliases/' + data.lookupId && [data.sourceId, data.targetId].includes(data.lookupId)
      && /^[A-Za-z0-9_-]{1,128}$/.test(data.sourceId) && /^[a-f0-9]{64}$/.test(data.targetId), 'CUTOVER_ALIAS_CREATE_CONTRACT_REQUIRED');
  }
  const transaction = await transport.begin(); let attempted = false;
  try {
    validateOperationalPlanState(plan, await transport.read(transaction));
    attempted = true; onAttempt(); return await transport.commit(transaction, plan.writes);
  } catch (error) { if (!attempted) await transport.rollback(transaction).catch(() => {}); throw error; }
}
