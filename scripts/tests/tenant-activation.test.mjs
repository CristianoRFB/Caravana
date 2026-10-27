import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { planTenantActivation,validateActivationPlan,validateActivationState,activationRollbackDecision } from '../recovery/tenant-activation.mjs';
import { activationFixture } from './tenant-activation-fixture.mjs';
import { tenantCopyHash } from '../recovery/tenant-copy.mjs';
const preview=f=>planTenantActivation(f.snapshot,f.copyPlan,f.current,f.review);
test('private activation adds exactly four missing companions, no plan, business, Auth, owner grant or copy',()=>{
 const f=activationFixture(),before=tenantCopyHash(f),plan=preview(f);
 assert.equal(plan.creates.length,4);assert.equal(plan.summary.commercialAssignments,0);assert.equal(plan.summary.publicCutover,false);
 assert.ok(plan.creates.every(w=>w.currentDocument.exists===false&&!/^(memberships|tenantTeam|subscriptions|tenantEntitlements|caravans|registrations)\//.test(w.path)));
 assert.equal(tenantCopyHash(f),before);assert.equal(validateActivationPlan(f.snapshot,f.copyPlan,plan),true);
});
test('replay and lost acknowledgement require no new creates; partial state is not silently repaired',()=>{
 const f=activationFixture(),p=preview(f),after=[...f.current,...p.creates.map(w=>({...w.update,updateTime:'2026-10-27T20:00:00Z'}))];
 assert.equal(validateActivationState(p,after).pending.length,0);assert.equal(planTenantActivation(f.snapshot,f.copyPlan,after,f.review).creates.length,0);
 assert.throws(()=>validateActivationState(p,[...f.current,p.creates[0].update]),/PARTIAL/);
});
test('original drift, copied business drift and revoked target owner stop without a re-copy',()=>{
 for(const path of ['organizations/caravana-77','memberships/synthetic-activation-owner/organizations/italo', 'registrations/'+ 'a'.repeat(64)]){
  const f=activationFixture();f.current.find(d=>d.name.endsWith('/'+path)).fields.status={stringValue:'revoked'};assert.throws(()=>preview(f),/DRIFT/);
 }
 const f=activationFixture();f.snapshot.users[0].disabled=true;assert.throws(()=>preview(f),/AUTH_OWNER/);
});
test('wrong plan hash, public mode, alias hijack or existing branded conflict is denied',()=>{
 const f=activationFixture();f.review.privateHistoryOnly=false;assert.throws(()=>preview(f),/REVIEW/);
 const g=activationFixture();g.review.copyPlanHash='x'.repeat(64);assert.throws(()=>preview(g),/REVIEW/);
 const h=activationFixture();h.current.push(h.raw('tenantSlugs/italo',{slug:'italo',organizationId:'other'}));assert.throws(()=>preview(h),/CONFLICT/);
});
test('a rehashed malicious write-set is not a reproducible activation plan',()=>{
 const f=activationFixture(),p=preview(f);p.creates[0].update.name=p.creates[0].update.name.replace('publicTenantSettings/italo','platformOwners/attacker');const {planHash:_unused,...body}=p;p.planHash=tenantCopyHash(body);
 assert.throws(()=>validateActivationPlan(f.snapshot,f.copyPlan,p),/NOT_REPRODUCIBLE/);
});
test('return always preserves business documents; later traffic forces forward reconciliation',()=>{
 const f=activationFixture(),p=preview(f);assert.equal(activationRollbackDecision(p,f.current).deleteBusinessDocuments,false);
 const target=f.current.find(d=>d.name.includes('/registrations/')&&d.name.endsWith('a'.repeat(64)));target.fields.checkedIn={booleanValue:true};
 assert.equal(activationRollbackDecision(p,f.current).strategy,'STOP_FORWARD_DATA_RECONCILIATION_REQUIRED');
});
test('CLI refuses an ordinary Cloud host and every copy flag before credentials or private reads',()=>{
 for(const flag of ['--preview','--apply-copy-to-italo']){
 const r=spawnSync(process.execPath,['scripts/recovery/cloudshell-tenant-activation.mjs',flag,'/tmp/NOT_PRIVATE'],{encoding:'utf8',env:{...process.env,CLOUD_SHELL:'false'}});
 assert.equal(r.status,1);assert.match(r.stderr,/ACTIVATION_(PRIVATE_CLOUD_SHELL|EXPLICIT_MODE)_REQUIRED/);assert.doesNotMatch(r.stderr,/Bearer|ya29|PRIVATE_DATA/);
 }
});
