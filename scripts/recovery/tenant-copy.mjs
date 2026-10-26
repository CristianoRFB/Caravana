// Pure REST snapshot -> additive, pending tenant copy. No credentials/network/apply.
import { createHash } from 'node:crypto';
import { SOURCE, ROOT, canonical, documentPath, requireThat } from './safety.mjs';
import { fields } from './inventory.mjs';

export const tenantCopyHash = value => createHash('sha256').update(canonical(value)).digest('hex');
const copy = value => structuredClone(value);
const string = value => ({ stringValue: value });
const bool = value => ({ booleanValue: value });
const integer = value => ({ integerValue: String(value) });
const idValid = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{2,59}$/.test(value);
const ownedRoots = new Set(['caravans', 'registrations', 'reservationReceipts', 'financialOperations', 'registrationOperations', 'documentEvents', 'documentPolicies', 'importRegistries', 'importOperations', 'payments', 'expenses', 'proofs', 'authorizations', 'storageObjects']);
const retainedRoots = new Set(['admins', 'memberships', 'profiles', 'platformOwners', 'tenantTeam', 'tenantUsage', 'subscriptions', 'tenantEntitlements', 'publicTenantSettings', 'tenantSlugs', 'tenantNamespaces', 'namespaceBootstrap', 'organizationAvailability', 'tenantBrandOperations', 'commercialOperations', 'tenantQuotaOperations', 'tenantInvitations', 'invitationInboxes', 'supportGrants', 'supportSessions', 'platformAudit', 'legacyTripAliases']);
const omittedOrganizationChildren = new Set(['commercialFeatures', 'tenantCopies']);
const operationKeys = new Set(['lastFinancialOperationId', 'lastOperationalId', 'lastSeatOperationId', 'lastImportOperationId', 'importOperationId', 'lastDocumentOperationId', 'lastToolOperationId']);

export function planTenantCopy(tree, options) {
  const { sourceOrganizationId: source, targetOrganizationId: target } = options || {};
  requireThat(typeof source === 'string' && source && !source.includes('/') && idValid(target) && source !== target, 'COPY_EXACT_DISTINCT_ORGANIZATIONS_REQUIRED');
  requireThat(Array.isArray(tree?.documents) && tree.documents.length <= 500 && Number.isFinite(Date.parse(tree.readTime)), 'COPY_BOUNDED_REST_SNAPSHOT_REQUIRED');
  requireThat(!tree.metadata?.project?.projectId || tree.metadata.project.projectId === SOURCE, 'COPY_SOURCE_PROJECT_MISMATCH');
  const original = new Map(tree.documents.map(raw => [documentPath(raw.name), raw]));
  requireThat(original.size === tree.documents.length && [...original.values()].every(raw => raw.fields && raw.updateTime), 'COPY_SOURCE_DUPLICATE_OR_INVALID');
  requireThat(original.has(`organizations/${source}`), 'COPY_SOURCE_ORGANIZATION_MISSING');
  requireThat(!original.has(`organizations/${target}`) && !original.has(`tenantSlugs/${target}`) && !original.has(`tenantNamespaces/${target}`) && !original.has(`legacyTripAliases/${target}`), 'COPY_TARGET_NAMESPACE_ALREADY_EXISTS');
  for (const raw of original.values()) requireThat(fields(raw).organizationId !== target, 'COPY_TARGET_HISTORICAL_REFERENCE_EXISTS');
  const authUids = options.authUids || tree.users?.map(user => user.localId);
  requireThat(Array.isArray(authUids) && new Set(authUids).size === authUids.length, 'COPY_AUTH_UID_INVENTORY_REQUIRED');
  const auth = new Set(authUids), ownerCandidates = new Set();
  for (const [path, raw] of original) {
    const data = fields(raw), parts = path.split('/');
    if (parts.length === 4 && parts[0] === 'memberships' && parts[2] === 'organizations' && parts[3] === source) {
      requireThat(data.uid === parts[1] && data.organizationId === source && ['active', 'revoked'].includes(data.status) && ['tenant_owner', 'staff'].includes(data.role), 'COPY_INVALID_SOURCE_MEMBERSHIP');
      if (data.status === 'active' && data.role === 'tenant_owner') ownerCandidates.add(data.uid);
    }
    if (parts.length === 2 && parts[0] === 'admins' && data.organizationId === source && ['owner', 'admin'].includes(data.role)) {
      const member = original.get(`memberships/${parts[1]}/organizations/${source}`);
      if (!member) {
        const policy = fields(original.get(`organizations/${source}`));
        const deadline = policy.legacyAdminAccessUntil;
        requireThat(policy.legacyAdminAccessEnabled !== false && (deadline === undefined || Number.isFinite(Date.parse(deadline)) && Date.parse(deadline) > Date.parse(tree.readTime)), 'COPY_LEGACY_ACCESS_DISABLED_OR_EXPIRED');
        ownerCandidates.add(parts[1]);
      }
    }
  }
  const owners = options.ownerUids || [...ownerCandidates].sort();
  requireThat(Array.isArray(owners) && owners.length > 0 && new Set(owners).size === owners.length && owners.every(uid => auth.has(uid) && ownerCandidates.has(uid)), 'COPY_CONFIRMED_EXISTING_ACTIVE_OWNER_REQUIRED');

  const selected = new Set([`organizations/${source}`]);
  for (const [path, raw] of original) {
    const parts = path.split('/'), data = fields(raw), root = parts[0];
    if (root === 'organizations' && parts[1] === source && parts.length > 2 && !omittedOrganizationChildren.has(parts[2])) selected.add(path);
    if (data.organizationId === source && ownedRoots.has(root)) selected.add(path);
    if (data.organizationId === source && root !== 'organizations' && !ownedRoots.has(root) && !retainedRoots.has(root)) requireThat(false, 'COPY_UNKNOWN_OWNED_NAMESPACE');
  }
  // Descendants without a redundant organizationId are owned through their root.
  for (const path of original.keys()) if ([...selected].some(parent => path.startsWith(parent + '/'))) selected.add(path);
  // Do not copy commercial projections or old migration records through root ancestry.
  for (const path of [...selected]) if (path.startsWith(`organizations/${source}/`) && omittedOrganizationChildren.has(path.split('/')[2])) selected.delete(path);
  const trips = new Set([...selected].filter(path => /^caravans\/[^/]+$/.test(path)).map(path => path.split('/')[1]));
  const registrations = new Set([...selected].filter(path => /^registrations\/[^/]+$/.test(path)).map(path => path.split('/')[1]));
  // Receipts/registries may carry only an entity reference in historical schemas.
  for (const [path, raw] of original) {
    const data = fields(raw), root = path.split('/')[0];
    if (['reservationReceipts', 'importRegistries'].includes(root) && (trips.has(data.caravanId) || registrations.has(data.registrationId))) {
      requireThat(!data.organizationId || data.organizationId === source, 'COPY_CROSS_TENANT_RECEIPT'); selected.add(path);
    }
  }
  for (const path of selected) {
    const data = fields(original.get(path)), parts = path.split('/');
    requireThat(!data.organizationId || data.organizationId === source, 'COPY_CROSS_TENANT_CHILD');
    if (data.caravanId) requireThat(trips.has(data.caravanId), 'COPY_ORPHAN_OR_FOREIGN_CARAVAN');
    if (data.registrationId) requireThat(registrations.has(data.registrationId), 'COPY_ORPHAN_OR_FOREIGN_REGISTRATION');
    for (let length = parts.length - 2; length >= 2; length -= 2) requireThat(original.has(parts.slice(0, length).join('/')), 'COPY_MISSING_SOURCE_PARENT');
  }
  const seed = { version: 'pending-tenant-copy-v1', sourceProject: SOURCE, source, target };
  const stableId = (kind, id, length = 32) => tenantCopyHash({ ...seed, kind, id }).slice(0, length);
  const tripIds = new Map([...trips].map(id => [id, stableId('caravan', id)]));
  const registrationIds = new Map([...registrations].map(id => [id, stableId('registration', id, 64)]));
  const receiptIds = new Map([...selected].filter(path => /^reservationReceipts\/[^/]+$/.test(path)).map(path => [path.split('/')[1], stableId('reservationReceipt', path.split('/')[1], 64)]));
  // Legacy reservations can have a nonce without a receipt. Preserve that absence,
  // but give every copied nonce its own namespace rather than referring to an old receipt.
  for (const path of selected) {
    const data = fields(original.get(path));
    for (const key of ['reservationNonce', 'lastReservationNonce']) if (data[key] !== undefined) {
      requireThat(typeof data[key] === 'string' && /^[a-f0-9]{64}$/.test(data[key]), 'COPY_INVALID_RESERVATION_NONCE');
      receiptIds.set(data[key], stableId('reservationReceipt', data[key], 64));
    }
    if (/^reservationReceipts\/[^/]+$/.test(path)) {
      const registration = original.get(`registrations/${data.registrationId}`);
      requireThat(registration && fields(registration).caravanId === data.caravanId, 'COPY_RECEIPT_RELATION_MISMATCH');
      const nonce = fields(registration).reservationNonce;
      requireThat(nonce === undefined || nonce === path.split('/')[1], 'COPY_RECEIPT_NONCE_MISMATCH');
    }
  }
  const operationIds = new Map([...selected].filter(path => path.split('/').length === 2 && /Operations$|Events$/.test(path.split('/')[0])).map(path => [path.split('/')[1], stableId(path.split('/')[0], path.split('/')[1])]));
  const pathMap = new Map();
  for (const path of [...selected].sort()) {
    const parts = path.split('/'), root = parts[0];
    if (root === 'organizations') parts[1] = target;
    else if (root === 'caravans') parts[1] = tripIds.get(parts[1]);
    else if (root === 'registrations') parts[1] = registrationIds.get(parts[1]);
    else if (root === 'documentPolicies') { requireThat(parts[1] === source, 'COPY_DOCUMENT_POLICY_ID_MISMATCH'); parts[1] = target; }
    else if (root === 'importRegistries') { requireThat(tripIds.has(parts[1]), 'COPY_IMPORT_REGISTRY_ID_MISMATCH'); parts[1] = tripIds.get(parts[1]); }
    else if (root === 'reservationReceipts') parts[1] = receiptIds.get(parts[1]);
    else parts[1] = operationIds.get(parts[1]) || stableId(root, parts[1]);
    const destination = parts.join('/');
    requireThat(!original.has(destination) && ![...pathMap.values()].includes(destination), 'COPY_TARGET_PATH_COLLISION'); pathMap.set(path, destination);
  }
  const mapped = (map, value, code) => { requireThat(map.has(value), code); return map.get(value); };
  const referenceChanges = [];
  function remap(value, key, sourcePath, location) {
    requireThat(value && typeof value === 'object' && !Array.isArray(value), 'COPY_INVALID_REST_VALUE');
    const result = copy(value);
    if (typeof value.referenceValue === 'string') {
      requireThat(value.referenceValue.startsWith(ROOT + '/'), 'COPY_FOREIGN_TYPED_REFERENCE');
      const path = value.referenceValue.slice(ROOT.length + 1);
      result.referenceValue = ROOT + '/' + mapped(pathMap, path, 'COPY_UNSUPPORTED_TYPED_REFERENCE');
    } else if (value.mapValue) {
      const entries = Object.entries(value.mapValue.fields || {});
      if (value.mapValue.fields !== undefined) result.mapValue.fields = Object.fromEntries(entries.map(([childKey, child]) => {
        const newKey = key === 'rows' ? mapped(registrationIds, childKey, 'COPY_UNKNOWN_IMPORT_ROW') : childKey;
        return [newKey, remap(child, childKey, sourcePath, `${location}.${childKey}`)];
      }));
    } else if (value.arrayValue) {
      if (value.arrayValue.values !== undefined) result.arrayValue.values = value.arrayValue.values.map((child, index) => remap(child, key === 'registrationIds' ? 'registrationId' : key, sourcePath, `${location}[${index}]`));
    } else if (typeof value.stringValue === 'string') {
      const text = value.stringValue;
      if (key === 'organizationId') { requireThat(text === source, 'COPY_NESTED_FOREIGN_ORGANIZATION'); result.stringValue = target; }
      else if (key === 'caravanId' && text) result.stringValue = mapped(tripIds, text, 'COPY_UNMAPPED_CARAVAN_REFERENCE');
      else if (['registrationId', 'lastReservationId'].includes(key) && text) result.stringValue = mapped(registrationIds, text, 'COPY_UNMAPPED_REGISTRATION_REFERENCE');
      else if (['reservationNonce', 'lastReservationNonce'].includes(key) && text) result.stringValue = mapped(receiptIds, text, 'COPY_UNMAPPED_RESERVATION_NONCE');
      else if (operationKeys.has(key) && text) result.stringValue = mapped(operationIds, text, 'COPY_UNMAPPED_OPERATION_REFERENCE');
      else if (key === 'entityId' && text) {
        if (tripIds.has(text)) result.stringValue = tripIds.get(text);
        else if (registrationIds.has(text)) result.stringValue = registrationIds.get(text);
        // Child payment/expense identifiers are retained under the new parent.
      } else if (['sourcePath', 'legacySourcePath'].includes(key) && text) requireThat(false, 'COPY_UNSUPPORTED_STRING_PATH_REFERENCE');
      else if (text.startsWith(ROOT + '/')) result.stringValue = ROOT + '/' + mapped(pathMap, text.slice(ROOT.length + 1), 'COPY_UNSUPPORTED_STRING_DOCUMENT_REFERENCE');
    }
    if (canonical(result) !== canonical(value)) referenceChanges.push({ sourcePath, field: location });
    return result;
  }
  const creates = [];
  for (const [sourcePath, targetPath] of pathMap) {
    const raw = original.get(sourcePath), targetFields = Object.fromEntries(Object.entries(raw.fields).map(([key, value]) => [key, remap(value, key, sourcePath, key)]));
    const parts = sourcePath.split('/');
    if (parts.length === 2 && parts[0] === 'organizations') {
      targetFields.slug = string(target); targetFields.importPending = bool(true);
      if (options.targetName !== undefined) { requireThat(typeof options.targetName === 'string' && options.targetName.trim().length >= 2 && options.targetName.length <= 80, 'COPY_INVALID_TARGET_NAME'); targetFields.name = string(options.targetName.trim()); }
    }
    if (parts.length === 2 && parts[0] === 'caravans') {
      targetFields.status = string('draft'); targetFields.importPending = bool(true);
      if (targetFields.slug) targetFields.slug = string(`${fields(raw).slug}-${stableId('slug', parts[1], 12)}`);
      if (targetFields.id?.stringValue === parts[1]) targetFields.id = string(tripIds.get(parts[1]));
    }
    if (parts.length === 2 && parts[0] === 'registrations' && targetFields.id?.stringValue === parts[1]) targetFields.id = string(registrationIds.get(parts[1]));
    creates.push({ sourcePath, targetPath, update: { name: `${ROOT}/${targetPath}`, fields: targetFields }, currentDocument: { exists: false } });
  }
  let unknownFinancialTotals = 0, verifiedFinancialTotals = 0;
  for (const id of registrations) {
    const registration = fields(original.get(`registrations/${id}`)); let total = 0;
    for (const [path, raw] of original) if (new RegExp(`^registrations/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/payments/[^/]+$`).test(path)) {
      const payment = fields(raw);
      requireThat(Number.isSafeInteger(payment.amountCents) && payment.amountCents > 0 && [undefined, 'active', 'voided'].includes(payment.status), 'COPY_INVALID_PAYMENT_LEDGER');
      if (payment.status !== 'voided') total += payment.amountCents;
      requireThat(Number.isSafeInteger(total), 'COPY_PAYMENT_LEDGER_OVERFLOW');
    }
    if (registration.paymentTotalCents === undefined || registration.paymentTotalCents === null) unknownFinancialTotals++;
    else { requireThat(Number.isSafeInteger(registration.paymentTotalCents) && registration.paymentTotalCents >= 0 && registration.paymentTotalCents === total, 'COPY_FINANCIAL_TOTAL_MISMATCH'); verifiedFinancialTotals++; }
  }
  const timestamp = { timestampValue: tree.readTime };
  for (const uid of owners) {
    for (const [path, data] of [
      [`memberships/${uid}/organizations/${target}`, { uid: string(uid), organizationId: string(target), role: string('tenant_owner'), status: string('active'), createdAt: timestamp, updatedAt: timestamp }],
      [`tenantTeam/${target}/members/${uid}`, { uid: string(uid), organizationId: string(target), role: string('tenant_owner'), status: string('active'), updatedAt: timestamp }],
    ]) {
      requireThat(!original.has(path), 'COPY_MEMBERSHIP_TARGET_EXISTS'); creates.push({ sourcePath: null, targetPath: path, update: { name: `${ROOT}/${path}`, fields: data }, currentDocument: { exists: false } });
    }
  }
  const usagePath = `tenantUsage/${target}`;
  requireThat(!original.has(usagePath), 'COPY_USAGE_TARGET_EXISTS');
  creates.push({ sourcePath: null, targetPath: usagePath, update: { name: `${ROOT}/${usagePath}`, fields: { organizationId: string(target), version: string('commercial-v1'), publishedCaravans: integer(0), activeMembers: integer(owners.length), activeOwners: integer(owners.length), updatedAt: timestamp } }, currentDocument: { exists: false } });
  const namespacePath = `tenantNamespaces/${target}`;
  creates.push({ sourcePath: null, targetPath: namespacePath, update: { name: `${ROOT}/${namespacePath}`, fields: { namespace: string(target), organizationId: string(target), state: string('reserved'), version: string('namespace-v1') } }, currentDocument: { exists: false } });
  requireThat(creates.length <= 450 && new Set(creates.map(item => item.targetPath)).size === creates.length, 'COPY_ATOMIC_WRITE_BOUND_OR_COLLISION');
  const body = { version: 'pending-tenant-copy-v1', mode: 'PLAN_ONLY', projectId: SOURCE, sourceOrganizationId: source, targetOrganizationId: target, readTime: tree.readTime,
    request: { sourceOrganizationId: source, targetOrganizationId: target, ownerUids: [...owners], authUids: [...authUids], ...(options.targetName !== undefined ? { targetName: options.targetName } : {}) },
    expectedSource: [...original].sort(([a], [b]) => a.localeCompare(b)).map(([path, raw]) => ({ path, updateTime: raw.updateTime, hash: tenantCopyHash(raw) })),
    pathMap: [...pathMap].map(([sourcePath, targetPath]) => ({ sourcePath, targetPath })), creates, referenceChanges,
    summary: { copiedDocuments: pathMap.size, createdDocuments: creates.length, caravans: trips.size, registrations: registrations.size, owners: owners.length, unknownFinancialTotals, verifiedFinancialTotals, accessActivated: false, copyOnly: true, productionWrites: 0 },
    limitations: ['No production executor; no source writes or deletions', 'Copied caravans are draft/importPending, with distinct slugs; no public cutover', 'Old portal/trip URLs still address original data; copies can diverge after the snapshot', 'No Auth identities/passwords, subscriptions, entitlements, commercial features, support access or invitations created', 'Unknown stored financial totals remain unknown; no amount is inferred', 'Existing request hashes remain historical source evidence and are not valid replay payloads for mapped identifiers', 'Requires protected complete inventory, recoverable backup, source/version and target-absence checks, and operator authorization before application', 'New tenant access/operation requires membership-compatible deployed Rules before cutover; this plan neither deploys Rules nor claims frontend access'] };
  return { ...body, planHash: tenantCopyHash(body) };
}

// Rebuild from the protected source to prove there are only explicit remaps/flags.
export function validateTenantCopyPlan(tree, plan) {
  const { planHash, ...body } = plan;
  requireThat(plan.mode === 'PLAN_ONLY' && tenantCopyHash(body) === planHash, 'COPY_PLAN_TAMPERED');
  const expected = planTenantCopy(tree, plan.request);
  requireThat(canonical(expected) === canonical(plan), 'COPY_PLAN_NOT_REPRODUCIBLE');
  requireThat(plan.creates.every(write => write.currentDocument.exists === false && write.update.name === `${ROOT}/${write.targetPath}`), 'COPY_NONADDITIVE_WRITE');
  return { valid: true, sourceDocuments: plan.expectedSource.length, plannedCreates: plan.creates.length, copiedDocuments: plan.pathMap.length, sourceWrites: 0, productionWrites: 0 };
}
