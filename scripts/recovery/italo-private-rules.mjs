// Transitional private access, not public cutover or the full commercial Rules release.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const LEGACY_RULES_SHA256 = 'fe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b';
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('PRIVATE_RULES_BASE_SURFACE_CHANGED');
  return source.replace(before, () => after);
}
export function buildItaloPrivateRules(bytes) {
  if (createHash('sha256').update(bytes).digest('hex') !== LEGACY_RULES_SHA256) throw Error('PRIVATE_RULES_EXACT_PUBLISHED_BASE_REQUIRED');
  let rules = bytes.toString('utf8').replaceAll('\r\n', '\n');
  // Preserve the legacy writer's payload/nonce/receipt contract, but never let
  // it write the imported copy or move an existing document into another tenant.
  rules = rules.replace(/allow ([a-z, ]+): if ([\s\S]*?);/g, (statement, methods, condition) => {
    if (condition.trim() === 'false') return statement;
    return methods.split(',').map(method => {
      const operation = method.trim();
      if (['get', 'list'].includes(operation)) return `allow ${operation}: if ${condition};`;
      if (!['create', 'update', 'delete'].includes(operation)) throw Error('PRIVATE_RULES_UNKNOWN_OPERATION');
      const guard = operation === 'create' ? "request.resource.data.organizationId != 'italo'"
        : operation === 'delete' ? "resource.data.organizationId != 'italo'"
          : "resource.data.organizationId != 'italo' && request.resource.data.organizationId == resource.data.organizationId";
      return `allow ${operation}: if ${guard} && (${condition});`;
    }).join('\n');
  });
  rules = replaceOnce(rules,
    "function isAdmin(orgId) { return signedIn() && adminOrg() == orgId; }",
    "function isAdmin(orgId) { return orgId != 'italo' && signedIn() && adminOrg() == orgId; }");
  rules = replaceOnce(rules,
    "isAdmin(resource.data.organizationId) || registrationId.matches('^[a-f0-9]{64}$')",
    "isAdmin(resource.data.organizationId) || (resource.data.organizationId != 'italo' && registrationId.matches('^[a-f0-9]{64}$'))");
  const additional = `
    // New access model: existing owner membership, UID and tenant fields must
    // agree. Operator-only ledger and importPending fence bind this phase to
    // the already copied historical tenant. No new client writes are allowed.
    function privateHistoryOwner(orgId) {
      let member = /databases/$(database)/documents/memberships/$(request.auth.uid)/organizations/$(orgId);
      let activation = /databases/$(database)/documents/organizations/$(orgId)/tenantActivations/private-v1;
      return signedIn() && orgId == 'italo'
        && exists(member) && get(member).data.uid == request.auth.uid
        && get(member).data.organizationId == orgId
        && get(member).data.status == 'active' && get(member).data.role == 'tenant_owner'
        && get(/databases/$(database)/documents/organizations/$(orgId)).data.importPending == true
        && get(activation).data.mode == 'private_history_only'
        && get(activation).data.copyPlanHash == '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10';
    }
    match /memberships/{uid}/organizations/{orgId} {
      allow get, list: if signedIn() && request.auth.uid == uid;
      allow create, update, delete: if false;
    }
    match /profiles/{uid} {
      allow get: if signedIn() && request.auth.uid == uid;
      allow list, create, update, delete: if false;
    }
    match /platformOwners/{uid} {
      allow get: if signedIn() && request.auth.uid == uid;
      allow list, create, update, delete: if false;
    }
    match /organizations/{orgId} { allow get: if privateHistoryOwner(orgId); }
    match /caravans/{id} { allow get, list: if privateHistoryOwner(resource.data.organizationId); }
    match /registrations/{id} {
      allow get, list: if privateHistoryOwner(resource.data.organizationId);
      match /{kind}/{child} {
        allow get, list: if kind in ['payments', 'proofs', 'authorizations']
          && privateHistoryOwner(get(/databases/$(database)/documents/registrations/$(id)).data.organizationId);
      }
    }
    match /caravans/{id}/expenses/{child} {
      allow get, list: if privateHistoryOwner(get(/databases/$(database)/documents/caravans/$(id)).data.organizationId);
    }
    match /tenantTeam/{orgId}/members/{uid} { allow get, list: if privateHistoryOwner(orgId); }
    match /tenantSlugs/{slug} { allow get: if slug == 'italo'; }
    match /publicTenantSettings/{orgId} { allow get: if orgId == 'italo'; }
    match /organizationAvailability/{orgId} { allow get: if orgId == 'italo'; }
    match /tenantUsage/{orgId} { allow get: if privateHistoryOwner(orgId); }
    match /tenantEntitlements/{orgId} { allow get: if privateHistoryOwner(orgId); }
    match /subscriptions/{orgId} { allow get: if privateHistoryOwner(orgId); }
    match /documentPolicies/{orgId} { allow get: if privateHistoryOwner(orgId); }
    match /organizations/{orgId}/{kind}/{id} {
      allow get, list: if kind in ['tenantActivations', 'tenantCopies', 'commercialFeatures', 'reports', 'worklists', 'toolEvents'] && privateHistoryOwner(orgId);
    }
    match /{kind}/{id} {
      allow get, list: if kind in ['registrationOperations', 'importOperations', 'documentEvents', 'financialOperations']
        && privateHistoryOwner(resource.data.organizationId);
    }
`;
  const closing = rules.lastIndexOf('  }\n}');
  if (closing < 0) throw Error('PRIVATE_RULES_INVALID_BASE');
  return `// Private historical activation only; published base SHA256 ${LEGACY_RULES_SHA256}.\n// Source writer remains legacy; italo is read-only; no commercial rights assigned.\n` + rules.slice(0, closing) + additional + rules.slice(closing);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bytes = await readFile(new URL('../../tests/fixtures/production-20260929.rules', import.meta.url));
  const rules = buildItaloPrivateRules(bytes);
  await writeFile(new URL('../../firestore.italo-private.rules', import.meta.url), rules);
  console.log('Private Rules candidate generated from the exact published legacy base. No deploy.');
}
