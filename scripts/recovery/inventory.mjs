import { createHash } from 'node:crypto';
import { ROOT, SOURCE, canonical, documentPath, requireThat } from './safety.mjs';
import { planMembershipMigration } from '../../src/lib/membership-migration.ts';
const int = value => typeof value === 'string' && /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
export function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) { const n = int(value.integerValue); return n===null?{integerValue:value.integerValue}:n; }
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v]) => [k,decode(v)]));
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  // Keep typed references, bytes and geo points untouched in the archive.
  return value;
}
export const fields = doc => Object.fromEntries(Object.entries(doc.fields || {}).map(([k,v]) => [k,decode(v)]));
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export function inventorySummary(tree, { reviewedNonAttachmentUrlHashes = [] } = {}) {
  const documents = new Map(tree.documents.map(d => [documentPath(d.name), fields(d)]));
  requireThat(documents.size === tree.documents.length, 'DUPLICATE_DOCUMENT');
  const users = new Set(tree.users.map(u => u.localId));
  requireThat(users.size === tree.users.length, 'DUPLICATE_AUTH');
  const objects = new Set(tree.objects.map(o => `${o.bucket}/${o.name}`));
  const counts = { documents: documents.size, missingParents: tree.missing.length, users: users.size, objects: tree.objects.length,
    orphanOrganizations: 0, orphanCaravans: 0, crossTenantRelations: 0, adminsWithoutAuth: 0,
    danglingReferences: 0, unresolvedExternalUrls: 0, missingReferencedObjects: 0, unknownFinancialTotals: 0,
    financialMatches: 0, financialMismatches: 0, invalidFinancialEntries: 0, registrations: 0 };
  const checkStrings = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.referenceValue === 'string') {
      if (!value.referenceValue.startsWith(ROOT + '/') || !documents.has(value.referenceValue.slice(ROOT.length + 1))) counts.danglingReferences++;
    }
    if (typeof value.stringValue === 'string' && /^(https?:\/\/|gs:\/\/)/i.test(value.stringValue)) {
      const s = value.stringValue; let reference;
      if (s.startsWith('gs://')) reference = s.slice(5);
      else {
        let u; try { u = new URL(s); } catch { counts.unresolvedExternalUrls++; return; }
        if (u.protocol !== 'https:' || u.username || u.password) { counts.unresolvedExternalUrls++; return; }
        if (u.hostname === 'firebasestorage.googleapis.com') {
          const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
          if (m) reference = `${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`;
        } else if (u.hostname === 'storage.googleapis.com') {
          const p = u.pathname.slice(1).split('/'); reference = p.map(decodeURIComponent).join('/');
        } else if (u.hostname !== 'caravana-77.pages.dev' && !reviewedNonAttachmentUrlHashes.includes(digest(s))) { counts.unresolvedExternalUrls++; return; }
        else return;
        if (!reference) counts.unresolvedExternalUrls++;
      }
      if (reference && !objects.has(reference)) counts.missingReferencedObjects++;
    }
    for (const v of Object.values(value)) if (v && typeof v === 'object') {
      if (Array.isArray(v)) for (const child of v) checkStrings(child); else checkStrings(v);
    }
  };
  for (const raw of tree.documents) checkStrings(raw.fields);
  for (const [p, data] of documents) {
    if (data.organizationId && !documents.has(`organizations/${data.organizationId}`)) counts.orphanOrganizations++;
    if (data.caravanId) {
      const caravan = documents.get(`caravans/${data.caravanId}`);
      if (!caravan) counts.orphanCaravans++;
      else if (data.organizationId && caravan.organizationId !== data.organizationId) counts.crossTenantRelations++;
    }
    const parts = p.split('/');
    for (let n = parts.length - 2; n >= 2; n -= 2) {
      const parent = documents.get(parts.slice(0,n).join('/'));
      if (parent?.organizationId && data.organizationId && parent.organizationId !== data.organizationId) counts.crossTenantRelations++;
    }
    if (/^admins\/[^/]+$/.test(p) && !users.has(p.slice(7))) counts.adminsWithoutAuth++;
    if (/^registrations\/[^/]+\/payments\/[^/]+$/.test(p)) {
      if (!documents.has(parts.slice(0,2).join('/')) || !Number.isSafeInteger(data.amountCents) || data.amountCents <= 0 || !['active','voided',undefined].includes(data.status)) counts.invalidFinancialEntries++;
    }
    if (!/^registrations\/[^/]+$/.test(p)) continue;
    counts.registrations++;
    const total = data.paymentTotalCents;
    // Fare/amountCents and reported PIX are not evidence of the paid total.
    if (total === null || total === undefined) { counts.unknownFinancialTotals++; continue; }
    if (!Number.isSafeInteger(total) || total < 0) { counts.invalidFinancialEntries++; continue; }
    let ledger = 0, invalid = false;
    for (const [child, payment] of documents) if (child.startsWith(p + '/payments/') && child.split('/').length === 4) {
      if (payment.organizationId && payment.organizationId !== data.organizationId) { invalid = true; continue; }
      if (payment.status === 'voided') continue;
      if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0 || !['active',undefined].includes(payment.status)) { invalid = true; continue; }
      ledger += payment.amountCents; if (!Number.isSafeInteger(ledger)) invalid = true;
    }
    if (invalid) counts.invalidFinancialEntries++;
    else if (total === ledger) counts.financialMatches++; else counts.financialMismatches++;
  }
  return counts;
}
export function migrationPreview(tree) {
  const documents = tree.documents.map(d => ({ path: documentPath(d.name), data: fields(d) }));
  const plan = planMembershipMigration(documents, tree.readTime);
  const expected = new Map(documents.map(d => [d.path, digest(d)]));
  return { version: 1, mode: 'DRY_RUN_ONLY_NO_PRODUCTION_APPLY', projectId: SOURCE,
    snapshotDigest: digest(documents), creates: plan.creates, conflicts: plan.conflicts, skipped: plan.skipped,
    expectedVersions: [...expected].map(([path, hash]) => ({path,hash})),
    limitations: ['Membership preview only; not commercial bootstrap or migration approval', 'Do not infer a commercial plan or create missing Auth identities'] };
}
export function validatePreview(tree, plan) {
  requireThat(plan.mode === 'DRY_RUN_ONLY_NO_PRODUCTION_APPLY' && plan.projectId === SOURCE && !plan.conflicts.length, 'MIGRATION_CONFLICT');
  const current = new Map(tree.documents.map(d => [documentPath(d.name), digest({path:documentPath(d.name),data:fields(d)})]));
  requireThat(current.size === plan.expectedVersions.length && plan.expectedVersions.every(e => current.get(e.path) === e.hash), 'MIGRATION_SOURCE_DRIFT');
  requireThat(plan.creates.every(c => c.before === null && !current.has(c.path) && /^memberships\/[^/]+\/organizations\/[^/]+$/.test(c.path)), 'MIGRATION_ADDITIVE_ONLY');
  const expected=migrationPreview(tree);
  requireThat(canonical(expected.creates)===canonical(plan.creates)&&canonical(expected.skipped)===canonical(plan.skipped)&&!expected.conflicts.length,'MIGRATION_PREVIEW_TAMPERED');
  return { applySupported: false, dryRunVerified: true, plannedCreates: plan.creates.length };
}
