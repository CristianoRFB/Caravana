// Inventory gate for the next phase. This module cannot freeze, copy or cut over.
import { SOURCE, documentPath, requireThat } from './safety.mjs';
import { fields } from './inventory.mjs';
import { activationCopyDocuments, activationCandidatePaths, validateActivationPlan, validateActivationState } from './tenant-activation.mjs';

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value + 'T12:00:00Z'))
    && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}

export function inspectCutoverInventory(snapshot, copyPlan, activationPlan, inventory, now = Date.now()) {
  requireThat(copyPlan.sourceOrganizationId === 'caravana-77' && copyPlan.targetOrganizationId === 'italo', 'CUTOVER_EXACT_ORGANIZATIONS_REQUIRED');
  requireThat(Array.isArray(inventory?.documents) && inventory.documents.length <= 550, 'CUTOVER_BOUNDED_INVENTORY_REQUIRED');
  const readTime = Date.parse(inventory.readTime);
  requireThat(Number.isFinite(now) && Number.isFinite(readTime) && readTime >= Date.parse(snapshot.readTime)
    && readTime <= now && now - readTime <= 60000, 'CUTOVER_FRESH_FIXED_READ_TIME_REQUIRED');
  for (const raw of inventory.documents) requireThat(raw.createTime && raw.updateTime
    && Number.isFinite(Date.parse(raw.updateTime)) && Date.parse(raw.updateTime) <= readTime, 'CUTOVER_INCONSISTENT_READ_TIME');
  validateActivationPlan(snapshot, copyPlan, activationPlan);
  requireThat(validateActivationState(activationPlan, inventory.documents).pending.length === 0, 'CUTOVER_PRIVATE_ACTIVATION_MUST_ALREADY_EXIST');
  const state = new Map(inventory.documents.map(raw => [documentPath(raw.name), raw]));
  const sourceKnown = new Set(snapshot.documents.map(raw => documentPath(raw.name)));
  const targetKnown = new Set([...activationCopyDocuments(copyPlan).map(raw => documentPath(raw.name)), ...activationCandidatePaths]);
  const sourceRoots = [...sourceKnown].filter(p => /^(caravans|registrations)\/[^/]+$/.test(p));
  const targetRoots = [...targetKnown].filter(p => /^(caravans|registrations)\/[^/]+$/.test(p));
  const sourceCaravanIds = new Set(sourceRoots.filter(p => p.startsWith('caravans/')).map(p => p.split('/')[1]));
  const targetCaravanIds = new Set(targetRoots.filter(p => p.startsWith('caravans/')).map(p => p.split('/')[1]));
  const sourceRegistrationIds = new Set(sourceRoots.filter(p => p.startsWith('registrations/')).map(p => p.split('/')[1]));
  const targetRegistrationIds = new Set(targetRoots.filter(p => p.startsWith('registrations/')).map(p => p.split('/')[1]));
  const owned = (path, data, organization, roots, caravans, registrations) => data.organizationId === organization
    || path === 'organizations/' + organization || path.startsWith('organizations/' + organization + '/')
    || path.startsWith('tenantTeam/' + organization + '/')
    || /^memberships\/[^/]+\/organizations\/[^/]+$/.test(path) && path.endsWith('/organizations/' + organization)
    || roots.some(root => path === root || path.startsWith(root + '/'))
    || caravans.has(data.caravanId) || registrations.has(data.registrationId);
  let unexpectedSourceDocuments = 0, unexpectedTargetDocuments = 0, ambiguousOwnership = 0;
  let sourceCaravans = 0, sourceRegistrations = 0;
  for (const [path, raw] of state) {
    const data = fields(raw);
    const source = owned(path, data, 'caravana-77', sourceRoots, sourceCaravanIds, sourceRegistrationIds);
    const target = owned(path, data, 'italo', targetRoots, targetCaravanIds, targetRegistrationIds);
    if (source && !sourceKnown.has(path)) unexpectedSourceDocuments++;
    if (target && !targetKnown.has(path)) unexpectedTargetDocuments++;
    if (source && target || source && data.organizationId && data.organizationId !== 'caravana-77'
      || target && data.organizationId && data.organizationId !== 'italo') ambiguousOwnership++;
    if (data.organizationId === 'caravana-77' && /^caravans\/[^/]+$/.test(path)) sourceCaravans++;
    if (data.organizationId === 'caravana-77' && /^registrations\/[^/]+$/.test(path)) sourceRegistrations++;
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(now));
  const events = sourceRoots.filter(p => p.startsWith('caravans/')).map(p => fields(state.get(p)));
  const datesValid = events.length > 0 && events.every(event => validDate(event.date));
  const issues = [
    ...(unexpectedSourceDocuments ? ['SOURCE_DATA_ADDED_AFTER_COPY'] : []),
    ...(unexpectedTargetDocuments ? ['TARGET_DATA_ADDED_AFTER_COPY'] : []),
    ...(ambiguousOwnership ? ['CROSS_ORGANIZATION_REFERENCE_REQUIRES_REVIEW'] : []),
    ...(!datesValid ? ['EVENT_DATE_REQUIRES_REVIEW'] : []),
  ];
  return {
    version: 'italo-cutover-inventory-v1', projectId: SOURCE, copyPlanHash: copyPlan.planHash,
    activationPlanHash: activationPlan.planHash, readTime: inventory.readTime,
    status: issues.length ? 'STOP_RECONCILE_WITHOUT_RECOPY' : 'INVENTORY_RECONCILED_CUTOVER_POLICY_AND_IMPLEMENTATION_PENDING',
    issues, readyForApply: false, writes: [],
    summary: { originalDocuments: snapshot.documents.length, copiedDocuments: activationCopyDocuments(copyPlan).length,
      sourceCaravans, sourceRegistrations, unexpectedSourceDocuments, unexpectedTargetDocuments, ambiguousOwnership,
      sourcePublishedEvents: events.filter(event => event.status === 'published').length,
      allEventDatesValid: datesValid, allEventsBeforeToday: datesValid ? events.every(event => event.date < today) : null,
      unknownFinancialTotalsPreserved: copyPlan.summary.unknownFinancialTotals,
      businessWrites: 0, authWrites: 0, publicCutover: false, copyRepeated: false },
  };
}
