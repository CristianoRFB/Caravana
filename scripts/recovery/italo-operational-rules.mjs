// Existing-event exception only. No subscription, new caravan or team grants.
// Two sibling database match scopes preserve each contract's lexical helpers.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildItaloCutoverFenceRules, CUTOVER_LEDGER_PATH } from './italo-cutover-fence-rules.mjs';
import { blockEnd, replaceRootFunction, retainRootMatches } from './rules-source-blocks.mjs';
export const MODERN_BASE_SHA256 = 'b2891b274393172c4a1ec69d9feeb627a485948617c4123abad23b0244dfeab0';
export function buildItaloOperationalRules(privateBytes, modernBytes) {
  if (createHash('sha256').update(modernBytes).digest('hex') !== MODERN_BASE_SHA256) throw Error('OPERATIONAL_EXACT_MODERN_BASE_REQUIRED');
  let legacy = buildItaloCutoverFenceRules(privateBytes);
  const pendingCheck = "get(/databases/$(database)/documents/organizations/$(orgId)).data.importPending == true";
  if (legacy.split(pendingCheck).length !== 2) throw Error('OPERATIONAL_PRIVATE_READER_SURFACE_CHANGED');
  legacy = legacy.replace(pendingCheck, () => '(' + pendingCheck + ' || operationalDataReadable())');
  legacy = replaceRootFunction(legacy, 'isAdmin', `    function isAdmin(orgId) {
      return orgId != 'italo' && signedIn() && adminOrg() == orgId && legacyMembershipAllows(orgId)
        && (orgId != 'caravana-77' || !operationalEverActivated() || privateHistoryOwner('italo'));
    }`);
  const bearer = "resource.data.organizationId != 'italo' && registrationId.matches('^[a-f0-9]{64}$')";
  if (legacy.split(bearer).length !== 2) throw Error('OPERATIONAL_LEGACY_BEARER_SURFACE_CHANGED');
  legacy = legacy.replace(bearer, () => bearer + " && !resource.data.get('portalAccessRevoked', false) && (resource.data.organizationId != 'caravana-77' || !operationalEverActivated() || operationalSourceWriterOpen('caravana-77'))");
  const legacyClosing = legacy.lastIndexOf('  }\n}');
  const portalCapability = `    function operationalPortalCapability(id) {
      let p = /databases/$(database)/documents/legacyRegistrationAliases/$(id);
      return id.matches('^[a-f0-9]{64}$') && (!exists(p) || (
        get(p).data.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
        && get(p).data.targetId == id && get(p).data.sourceId is string
        && get(p).data.sourceId.matches('^[a-f0-9]{64}$')));
    }
`;
  const identity = `
${portalCapability}
    function operationalEverActivated() {
      let p = /databases/$(database)/documents/${CUTOVER_LEDGER_PATH};
      return exists(p) && get(p).data.get('everActivated', false) == true;
    }
    function operationalDataReadable() {
      let g = get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data;
      return g.version == 'italo-operational-cutover-v1'
        && g.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
        && g.sourceOrganizationId == 'caravana-77' && g.targetOrganizationId == 'italo'
        && g.operationalIntentConfirmed == true && g.everActivated == true
        && g.generation is int && g.generation > 0
        && g.targetCaravanId is string && g.targetCaravanId.matches('^[A-Za-z0-9_-]{1,128}$')
        && g.sourceCaravanId is string && g.sourceCaravanId.matches('^[A-Za-z0-9_-]{1,128}$')
        && g.sourceCaravanId != g.targetCaravanId
        && g.capacityCeiling is int && g.capacityCeiling >= 1 && g.capacityCeiling <= 1000
        && ((g.phase == 'frozen' && g.writerOrganizationId == '')
          || (g.phase == 'target_active' && g.writerOrganizationId == 'italo')
          || (g.phase == 'source_active' && g.writerOrganizationId == 'caravana-77'));
    }
    match /publicTenantCutovers/{id} {
      allow get: if id == 'italo';
      allow list, create, update, delete: if false;
    }
    match /legacyRegistrationAliases/{id} {
      allow get: if (id.matches('^[a-f0-9]{64}$') || (id.matches('^[A-Za-z0-9_-]{1,128}$') && privateHistoryOwner('italo'))) && operationalDataReadable()
        && (resource == null || (resource.data.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
          && resource.data.organizationId == 'italo' && resource.data.lookupId == id
          && resource.data.sourceId is string && resource.data.sourceId.matches('^[A-Za-z0-9_-]{1,128}$')
          && (resource.data.sourceId.matches('^[a-f0-9]{64}$') || privateHistoryOwner('italo'))
          && resource.data.targetId is string && resource.data.targetId.matches('^[a-f0-9]{64}$')
          && (id == resource.data.sourceId || id == resource.data.targetId)
          && resource.data.targetCaravanId == get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data.targetCaravanId));
      allow list, create, update, delete: if false;
    }
    // A known portal capability remains queryable during a forward-repair freeze.
    // Enumeration and private proof subcollections remain owner-only.
    match /registrations/{id} {
      allow get: if operationalPortalCapability(id) && operationalDataReadable()
        && get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data.phase in ['target_active', 'frozen']
        && (resource == null || (resource.data.organizationId == 'italo'
          && resource.data.caravanId == get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data.targetCaravanId
          && resource.data.get('portalAccessRevoked', false) == false));
    }
`;
  legacy = legacy.slice(0, legacyClosing) + identity + legacy.slice(legacyClosing);
  let modern = modernBytes.toString('utf8');
  const root = '  match /databases/{database}/documents {';
  const start = modern.indexOf(root), end = blockEnd(modern, start + root.lastIndexOf('{'));
  if (start < 0) throw Error('OPERATIONAL_MODERN_ROOT_REQUIRED');
  modern = modern.slice(start, end);
  modern = retainRootMatches(modern, new Set([
    '/organizations/{orgId}', '/caravans/{caravanId}', '/reservationReceipts/{nonce}', '/registrations/{registrationId}',
    '/registrationOperations/{operationId}', '/financialOperations/{operationId}', '/caravans/{caravanId}/expenses/{expenseId}',
    '/documentPolicies/{orgId}', '/documentEvents/{operationId}',
    '/tenantQuotaOperations/{op}', '/tenantUsage/{orgId}',
  ]));
  const grant = `    function operationalGrant() {
      let g = get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data;
      return g.version == 'italo-operational-cutover-v1'
        && g.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
        && g.sourceOrganizationId == 'caravana-77' && g.targetOrganizationId == 'italo'
        && g.operationalIntentConfirmed == true && g.everActivated == true
        && g.generation is int && g.generation > 0
        && g.phase == 'target_active' && g.writerOrganizationId == 'italo'
        && g.targetCaravanId is string && g.targetCaravanId.matches('^[A-Za-z0-9_-]{1,128}$')
        && g.capacityCeiling is int && g.capacityCeiling >= 1 && g.capacityCeiling <= 1000;
    }
    function operationalCaravanId() { return get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data.targetCaravanId; }
    function operationalCapacity() { return get(/databases/$(database)/documents/${CUTOVER_LEDGER_PATH}).data.capacityCeiling; }
`;
  modern = modern.replace(root, () => root + '\n' + grant + portalCapability);
  // Every allow is gated once below. Rechecking the full operator ledger in
  // each nested ACL/quota helper exceeds Firestore's expression budget.
  modern = replaceRootFunction(modern, 'isAdmin', `    function isAdmin(orgId) { return orgId == 'italo' && signedIn() && activeMembership(orgId) && membership(orgId).role == 'tenant_owner'; }`);
  modern = replaceRootFunction(modern, 'isTenantOwner', '    function isTenantOwner(orgId) { return isAdmin(orgId); }');
  modern = replaceRootFunction(modern, 'isPlatformOwner', '    function isPlatformOwner() { return false; }');
  modern = replaceRootFunction(modern, 'tenantWritesEnabled', "    function tenantWritesEnabled(orgId) { return orgId == 'italo' && get(/databases/$(database)/documents/organizations/italo).data.get('importPending', true) == false; }");
  modern = replaceRootFunction(modern, 'acceptsReservations', "    function acceptsReservations(orgId) { return tenantWritesEnabled(orgId) && get(/databases/$(database)/documents/organizations/italo).data.get('status', 'active') != 'suspended'; }");
  modern = replaceRootFunction(modern, 'quotaGrowth', "    function quotaGrowth(orgId) { return orgId == 'italo' && acceptsReservations(orgId); }");
  modern = replaceRootFunction(modern, 'quotaSeats', "    function quotaSeats(orgId, seats) { return quotaGrowth(orgId) && seats is int && seats >= 0 && seats <= operationalCapacity(); }");
  // The immutable receipt's create rule validates its complete counters and
  // target transition once. Linked writes prove the same new receipt exists;
  // repeating its full validation on every document exceeds Rules' budget.
  modern = replaceRootFunction(modern, 'linkedQuota', `    function linkedQuota(orgId, op, kind, entityId) {
      let p = /databases/$(database)/documents/tenantQuotaOperations/$(op);
      let e = getAfter(p).data;
      return !exists(p) && e.organizationId == orgId && e.kind == kind && e.entityId == entityId
        && kind == 'caravan' && e.action == 'caravan_updated' && e.actorUid == request.auth.uid && e.at == request.time;
    }`);
  const quotaStart = modern.indexOf('    function quotaCaravan(');
  const quotaEnd = blockEnd(modern, modern.indexOf('{', quotaStart));
  const oldQuota = modern.slice(quotaStart, quotaEnd);
  modern = modern.slice(0, quotaStart) + oldQuota.replace('return event.kind', "return event.organizationId == 'italo' && event.entityId == operationalCaravanId() && event.action == 'caravan_updated' && event.kind")
    .replace('get(/databases/$(database)/documents/tenantEntitlements/$(event.organizationId)).data.limits.activeCaravans', '1') + modern.slice(quotaEnd);
  const configurationStart = modern.indexOf('      function ownerConfiguration()');
  const configurationEnd = blockEnd(modern, modern.indexOf('{', configurationStart));
  // Configuration changes use the existing immutable quota-operation receipt.
  // Unchanged imported fields are retained; the client cannot rewrite provenance.
  const textFields = { name: 120, organizerName: 120, event: 200, description: 4000, date: 10, departureTime: 5, returnTime: 5,
    city: 120, destination: 200, address: 500, paymentMethod: 120, paymentInstructions: 2000, paymentDeadline: 10,
    pixKey: 254, pixReceiver: 200, whatsapp: 30 };
  const lists = { boardingPoints: 'point', benefits: 'text', rules: 'text', faqs: 'faq', announcements: 'announcement' };
  const mutable = [...Object.keys(textFields), ...Object.keys(lists), 'status', 'capacity', 'priceCents', 'requiresMinorAuthorization', 'updatedAt', 'lastQuotaOperationId'];
  const itemChecks = {
    text: "v is string && v.size() <= 1000",
    point: "v is map && v.keys().hasOnly(['id','name','address','time']) && v.id is string && v.id.size() >= 1 && v.id.size() <= 128 && v.name is string && v.name.size() <= 120 && v.address is string && v.address.size() <= 500 && v.time is string && v.time.size() <= 5",
    faq: "v is map && v.keys().hasOnly(['question','answer']) && v.question is string && v.question.size() <= 300 && v.answer is string && v.answer.size() <= 2000",
    announcement: "v is map && v.keys().hasOnly(['title','body','createdAt']) && v.title is string && v.title.size() <= 200 && v.body is string && v.body.size() <= 2000 && (!('createdAt' in v) || (v.createdAt is string && v.createdAt.size() <= 40))",
  };
  const listHelpers = Object.entries(itemChecks).map(([kind, check]) => `      function operational_${kind}_item(v) { return ${check}; }
      function operational_${kind}_list(v) { return v is list && v.size() <= 20
        ${Array.from({ length: 20 }, (_, i) => `&& (v.size() <= ${i} || operational_${kind}_item(v[${i}]))`).join('\n        ')}; }`).join('\n');
  const config = `      function ownerConfiguration() {
        let d = request.resource.data;
        let changed = d.diff(resource.data).affectedKeys();
        return changed.hasOnly(${JSON.stringify(mutable).replaceAll('"', "'")})
          && d.status in ['draft', 'published', 'archived']
          && d.capacity <= operationalCapacity()
          && (!changed.hasAny(['priceCents']) || (d.priceCents is int && d.priceCents >= 0 && d.priceCents <= 9007199254740991))
          && (!changed.hasAny(['requiresMinorAuthorization']) || d.requiresMinorAuthorization is bool)
          ${Object.entries(textFields).map(([field, size]) => `&& (!changed.hasAny(['${field}']) || (d.${field} is string && d.${field}.size() <= ${size}))`).join('\n          ')}
          ${Object.entries(lists).map(([field, kind]) => `&& (!changed.hasAny(['${field}']) || operational_${kind}_list(d.${field}))`).join('\n          ')}
          && linkedQuota('italo', d.lastQuotaOperationId, 'caravan', caravanId);
      }`;
  modern = modern.slice(0, configurationStart) + listHelpers + '\n' + config + modern.slice(configurationEnd);
  modern = replaceRootFunction(modern, 'publicCaravan', `    function publicCaravan(caravanId) {
      let trip = get(/databases/$(database)/documents/caravans/$(caravanId)).data;
      return caravanId == operationalCaravanId() && trip.organizationId == 'italo'
        && trip.status == 'published' && trip.get('importPending', true) == false
        && trip.capacity <= operationalCapacity() && acceptsReservations('italo');
    }`);
  // Readability of the old imported history is retained by the first scope.
  // All grants in this second scope are dormant until the reviewed ledger is active.
  modern = modern.replace(/allow ([a-z, ]+): if ([\s\S]*?);/g, (_statement, methods, condition, offset) => {
    const preceding = [...modern.slice(0, offset).matchAll(/match (\/[^\n]*?)\s+\{/g)].at(-1)?.[1];
    return methods.split(',').map(method => {
      const operation = method.trim();
      if (condition.trim() === 'false') return `allow ${operation}: if false;`;
      if (preceding === '/organizations/{orgId}' && ['create', 'update', 'delete'].includes(operation)
        || preceding === '/caravans/{caravanId}' && ['create', 'delete'].includes(operation)
        || preceding === '/documentPolicies/{orgId}' && ['create', 'update', 'delete'].includes(operation)) return `allow ${operation}: if false;`;
      if (preceding === '/tenantUsage/{orgId}' && operation === 'create') return `allow ${operation}: if false;`;
      let scope = 'true';
      const data = operation === 'create' ? 'request.resource.data' : 'resource.data';
      if (['/registrations/{registrationId}', '/financialOperations/{operationId}', '/registrationOperations/{operationId}'].includes(preceding)) {
        scope = `(${data}.organizationId == 'italo' && ${data}.caravanId == operationalCaravanId())`;
        if (operation === 'get') scope = `(resource == null || ${scope})`;
        if (operation === 'get' && preceding === '/registrations/{registrationId}') scope += " && (isAdmin('italo') || operationalPortalCapability(registrationId))";
      } else if (preceding === '/caravans/{caravanId}' && ['update'].includes(operation)) scope = "resource.data.organizationId == 'italo' && caravanId == operationalCaravanId() && request.resource.data.capacity <= operationalCapacity()";
      else if (['/payments/{paymentId}', '/proofs/{proofId}', '/authorizations/{fileId}'].includes(preceding)) {
        scope = "get(/databases/$(database)/documents/registrations/$(registrationId)).data.organizationId == 'italo' && get(/databases/$(database)/documents/registrations/$(registrationId)).data.caravanId == operationalCaravanId()";
        if (['get', 'list'].includes(operation)) scope += " && isAdmin('italo')";
      } else if (preceding === '/reservationReceipts/{nonce}' && ['create', 'delete', 'update'].includes(operation)) scope = `${data}.organizationId == 'italo' && ${data}.caravanId == operationalCaravanId()`;
      else if (preceding === '/caravans/{caravanId}/expenses/{expenseId}') scope = "caravanId == operationalCaravanId()";
      else if (preceding === '/documentPolicies/{orgId}') scope = "orgId == 'italo'";
      else if (preceding === '/documentEvents/{operationId}' && ['create', 'update', 'delete'].includes(operation)) scope = `${data}.organizationId == 'italo'`;
      else if (preceding === '/tenantQuotaOperations/{op}') {
        scope = `(isTenantOwner('italo') && (resource == null || (resource.data.organizationId == 'italo' && resource.data.entityId == operationalCaravanId() && resource.data.kind == 'caravan')))`;
        if (operation === 'create') scope = "request.resource.data.organizationId == 'italo' && request.resource.data.entityId == operationalCaravanId() && request.resource.data.kind == 'caravan' && request.resource.data.action == 'caravan_updated'";
      } else if (preceding === '/tenantUsage/{orgId}') {
        scope = "orgId == 'italo'";
        if (operation === 'update') scope += " && request.resource.data.activeMembers == resource.data.activeMembers && request.resource.data.activeOwners == resource.data.activeOwners && request.resource.data.publishedCaravans <= 1";
      }
      const reviewed = new Set(['/organizations/{orgId}', '/caravans/{caravanId}', '/reservationReceipts/{nonce}', '/registrations/{registrationId}',
        '/financialOperations/{operationId}', '/registrationOperations/{operationId}', '/documentPolicies/{orgId}', '/documentEvents/{operationId}',
        '/caravans/{caravanId}/expenses/{expenseId}', '/payments/{paymentId}', '/proofs/{proofId}', '/authorizations/{fileId}', '/tenantQuotaOperations/{op}', '/tenantUsage/{orgId}']);
      if (!reviewed.has(preceding)) throw Error('OPERATIONAL_UNREVIEWED_MATCH_SCOPE');
      return `allow ${operation}: if operationalGrant() && (${scope}) && (${condition});`;
    }).join('\n');
  });
  const extra = `
    // A missing entitlement is readable; the existing-event exception is held
    // separately in the operator ledger, never in a fabricated subscription.
    match /tenantEntitlements/{orgId} {
      allow get: if orgId == 'italo' && operationalGrant();
      allow list, create, update, delete: if false;
    }
`;
  modern = modern.slice(0, -1) + extra + modern.slice(-1);
  return '// Prototype: one existing event; operational target writes require the operator ledger. Not deployed by generation.\n'
    + legacy.slice(0, legacy.lastIndexOf('}')) + '\n' + modern + '\n}\n';
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rules = buildItaloOperationalRules(await readFile(new URL('../../firestore.italo-private.rules', import.meta.url)), await readFile(new URL('../../firestore.rules', import.meta.url)));
  await writeFile(new URL('../../firestore.italo-operational.rules', import.meta.url), rules);
  console.log('Scoped existing-event operational candidate generated. No subscription, target activation or deployment.');
}
