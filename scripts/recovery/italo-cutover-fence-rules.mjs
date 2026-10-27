// Dormant writer fence. Does NOT enable target writes or perform a cutover.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const PRIVATE_BASE_SHA256 = '77307820aa8878c3d5349b7c15d3ef4b232e9199d56ff59f657bc29bb3fc7c8f';
export const CUTOVER_LEDGER_PATH = 'organizations/italo/tenantCutovers/operational-v1';
export function buildItaloCutoverFenceRules(bytes) {
  if (createHash('sha256').update(bytes).digest('hex') !== PRIVATE_BASE_SHA256) throw Error('CUTOVER_FENCE_EXACT_PRIVATE_BASE_REQUIRED');
  let rules = bytes.toString('utf8');
  const anchor = '    function privateHistoryOwner(orgId) {';
  if (rules.split(anchor).length !== 2) throw Error('CUTOVER_FENCE_ANCHOR_CHANGED');
  const helper = `    // Missing ledger preserves today's operational source, including past dates.
    // A malformed ledger fails closed. Only the official operator can write it.
    function operationalSourceWriterOpen(orgId) {
      let ledger = /databases/$(database)/documents/${CUTOVER_LEDGER_PATH};
      return orgId != 'caravana-77' || !exists(ledger) || (
        get(ledger).data.version == 'italo-operational-cutover-v1'
        && get(ledger).data.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
        && get(ledger).data.sourceOrganizationId == 'caravana-77'
        && get(ledger).data.targetOrganizationId == 'italo'
        && get(ledger).data.operationalIntentConfirmed == true
        && get(ledger).data.generation is int && get(ledger).data.generation > 0
        && get(ledger).data.phase == 'source_active'
        && get(ledger).data.writerOrganizationId == 'caravana-77');
    }
`;
  rules = rules.replace(anchor, () => helper + anchor);
  let guarded = 0;
  rules = rules.replace(/allow (create|update|delete): if ([\s\S]*?);/g, (statement, operation, condition) => {
    if (condition.trim() === 'false') return statement;
    const organization = operation === 'create' ? 'request.resource.data.organizationId' : 'resource.data.organizationId';
    guarded++;
    return `allow ${operation}: if operationalSourceWriterOpen(${organization}) && (${condition});`;
  });
  if (guarded < 10) throw Error('CUTOVER_FENCE_WRITE_SURFACE_CHANGED');
  const closing = rules.lastIndexOf('  }\n}');
  if (closing < 0) throw Error('CUTOVER_FENCE_INVALID_BASE');
  const ledgerRead = `
    match /organizations/italo/tenantCutovers/{id} {
      allow get: if id == 'operational-v1' && privateHistoryOwner('italo');
      allow list, create, update, delete: if false;
    }
`;
  return '// Operational source fence only; target remains read-only until its own reviewed release.\n'
    + rules.slice(0, closing) + ledgerRead + rules.slice(closing);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rules = buildItaloCutoverFenceRules(await readFile(new URL('../../firestore.italo-private.rules', import.meta.url)));
  await writeFile(new URL('../../firestore.italo-cutover-fence.rules', import.meta.url), rules);
  console.log('Dormant cutover fence candidate generated. No ledger write, freeze or deployment.');
}
