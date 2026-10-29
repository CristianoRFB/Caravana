// Add platform management without changing either existing-event data contract.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { blockEnd, retainRootMatches } from './rules-source-blocks.mjs';
import { MODERN_BASE_SHA256 } from './italo-operational-rules.mjs';
export const OPERATIONAL_BASE_SHA256 = '8ceb58325c16b02e2aedc5c1a11e13f7da92ebcf738e70bc5acfb5bff96c2454';
const digest = b => createHash('sha256').update(b).digest('hex');
// Match scopes keep separate lexical helpers. Removing unreachable functions
// changes no allow expression and keeps the compiled artifact within 256000 B.
function pruneUnusedFunctions(scope) {
  const functions=[...scope.matchAll(/^    function ([A-Za-z_]\w*)\([^)]*\)\s*\{/gm)].map(m=>({name:m[1],start:m.index,end:blockEnd(scope,m.index+m[0].lastIndexOf('{'))}));
  let roots=scope;
  for(const f of [...functions].reverse())roots=roots.slice(0,f.start)+roots.slice(f.end);
  const calls=(text,name)=>new RegExp('\\b'+name+'\\s*\\(').test(text);
  const live=new Set(functions.filter(f=>calls(roots,f.name)).map(f=>f.name));
  let changed=true;
  while(changed){changed=false;for(const f of functions)if(live.has(f.name))for(const dependency of functions)if(!live.has(dependency.name)&&calls(scope.slice(f.start,f.end),dependency.name)){live.add(dependency.name);changed=true;}}
  for(const f of [...functions].reverse())if(!live.has(f.name))scope=scope.slice(0,f.start)+scope.slice(f.end);
  return scope;
}
export function buildPlatformOperationalRules(operationalBytes, modernBytes) {
  if (digest(operationalBytes) !== OPERATIONAL_BASE_SHA256 || digest(modernBytes) !== MODERN_BASE_SHA256) throw Error('EXACT_REVIEWED_PLATFORM_BASES_REQUIRED');
  const text = modernBytes.toString(), root = '  match /databases/{database}/documents {';
  const start = text.indexOf(root);
  if (start < 0) throw Error('PLATFORM_ROOT_REQUIRED');
  let management = retainRootMatches(text.slice(start, blockEnd(text,start+root.lastIndexOf('{'))),new Set([
    '/namespaceBootstrap/{id}', '/tenantNamespaces/{id}', '/tenantSlugs/{slug}', '/publicTenantSettings/{orgId}',
    '/tenantBrandOperations/{operationId}', '/organizations/{orgId}/commercialFeatures/{id}',
    '/tenantTeam/{orgId}/members/{uid}', '/tenantUsage/{orgId}', '/subscriptions/{orgId}', '/tenantEntitlements/{orgId}',
    '/commercialOperations/{operationId}', '/organizations/{orgId}', '/organizationAvailability/{orgId}',
    '/memberships/{uid}/organizations/{orgId}', '/platformAudit/{operationId}',
    '/supportGrants/{orgId}/operators/{operatorUid}', '/supportSessions/{operatorUid}', '/supportGrants/{orgId}/audit/{eventId}'
  ]));
  // A matching grant in this sibling scope must never broaden tenant ACLs.
  // No caravan/registration/payment/proof/quota-operation/control match exists here.
  management = management.replace(/\ballow\s+([^:]+):\s*if\s+([^;]+);/g,(_m,methods,condition)=>{
    // Tenant quota/invitation mutations stay exclusively in tenant contracts.
    // Platform onboarding uses lastPlatformOperationId, never these receipts.
    if (/\b(?:create|update)\b/.test(methods)&&condition.includes('lastQuotaOperationId')) return `allow ${methods}: if false;`;
    return `allow ${methods}: if isPlatformOwner() && (${condition});`;
  });
  const close=management.lastIndexOf('}');
  management=management.slice(0,close)+`    match /platformOwners/{uid} {
      allow get: if signedIn() && request.auth.uid == uid;
      allow list, create, update, delete: if false;
    }
`+management.slice(close);
  management=management.replace(/[ \t]+$/gm,'');
  const original=operationalBytes.toString(), end=original.lastIndexOf('}');
  if(end<0)throw Error('OPERATIONAL_SERVICE_REQUIRED');
  let result=original.slice(0,end)+'\n  // Explicitly provisioned platform owner; existing operational scopes unchanged.\n'+management+'\n'+original.slice(end);
  const scopes=[...result.matchAll(/^  match \/databases\/\{database\}\/documents \{/gm)].map(m=>({start:m.index,end:blockEnd(result,m.index+m[0].lastIndexOf('{'))}));
  for(const s of scopes.reverse())result=result.slice(0,s.start)+pruneUnusedFunctions(result.slice(s.start,s.end))+result.slice(s.end);
  return result.replace(/[ \t]+$/gm,'');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await writeFile('firestore.platform-operational.rules',buildPlatformOperationalRules(await readFile('firestore.italo-operational.rules'),await readFile('firestore.rules')));
  console.log('Pinned platform-management extension generated; no deploy.');
}
