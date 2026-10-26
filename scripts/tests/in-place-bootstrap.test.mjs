import test from 'node:test';
import assert from 'node:assert/strict';
import { planInPlaceBootstrap,validateBootstrapPlan,bootstrapRollbackDecision,bootstrapHash,applyBootstrapDemo } from '../recovery/in-place-bootstrap.mjs';
import { inPlaceFixture } from './in-place-fixture.mjs';
test('full legacy bootstrap adds companions without replacing identity, legacy access, money or links',()=>{
  const {snapshot,reviews}=inPlaceFixture(),before=bootstrapHash(snapshot),plan=planInPlaceBootstrap(snapshot,reviews);
  const paths=new Set(plan.creates.map(d=>d.path));
  for(const p of ['memberships/synthetic-owner-a/organizations/synthetic-org-a','tenantTeam/synthetic-org-a/members/synthetic-owner-a','tenantUsage/synthetic-org-a','subscriptions/synthetic-org-a','tenantEntitlements/synthetic-org-a','organizations/synthetic-org-a/commercialFeatures/current','publicTenantSettings/synthetic-org-a','tenantSlugs/synthetic-caravana-a','organizationAvailability/synthetic-org-a','namespaceBootstrap/state'])assert.ok(paths.has(p),p);
  assert.equal(bootstrapHash(snapshot),before);assert.equal(plan.patches.length,1);assert.deepEqual(plan.patches[0].additions,{status:'published'});
  assert.ok(plan.creates.every(d=>!d.path.startsWith('platformOwners/')&&!d.path.startsWith('registrations/')&&!d.path.startsWith('admins/')&&!d.path.startsWith('legacyTripAliases/')));
  assert.ok(!paths.has('memberships/synthetic-owner-b/organizations/synthetic-org-b'));
  assert.equal(plan.manifests[0].usage.publishedCaravans,1);assert.equal(plan.manifests[0].usage.activeMembers,1);
});
test('existing plan/companions are retained on a new preview; original plan permits exact replay',()=>{
  const {snapshot,reviews}=inPlaceFixture(),plan=planInPlaceBootstrap(snapshot,reviews);
  const after=[...snapshot.documents.map(d=>plan.patches.find(p=>p.path===d.path)?{path:d.path,data:plan.patches.find(p=>p.path===d.path).after}:d),...plan.creates];
  assert.equal(validateBootstrapPlan(plan,after).pendingCreates.length,0);assert.equal(validateBootstrapPlan(plan,after).pendingPatches.length,0);
  const repeat=planInPlaceBootstrap({...snapshot,documents:after},reviews);assert.equal(repeat.creates.length,0);assert.equal(repeat.patches.length,0);
});
test('no guessed owner, reactivation, unreviewed commercial rights or visibility',()=>{
  for(const change of [f=>f.snapshot.authUids.splice(0,1),f=>f.reviews[0].contractReviewed=false,f=>f.reviews[0].legacyVisibility={},f=>f.reviews[0].assignment.planId='free',f=>f.snapshot.inventoryComplete=false]){
    const f=inPlaceFixture();change(f);assert.throws(()=>planInPlaceBootstrap(f.snapshot,f.reviews));
  }
  const f=inPlaceFixture();f.snapshot.documents.push({path:'memberships/synthetic-owner-a/organizations/synthetic-org-a',data:{uid:'synthetic-owner-a',organizationId:'synthetic-org-a',role:'tenant_owner',status:'revoked'}});
  assert.throws(()=>planInPlaceBootstrap(f.snapshot,f.reviews),/MEMBERSHIP_CONFLICT/);
  for(const policy of [{legacyAdminAccessEnabled:false},{legacyAdminAccessUntil:'2020-01-01T00:00:00.000Z'},{legacyAdminAccessUntil:'INVALID'}]){
    const disabled=inPlaceFixture();Object.assign(disabled.snapshot.documents[0].data,policy);assert.throws(()=>planInPlaceBootstrap(disabled.snapshot,disabled.reviews),/DISABLED_OR_EXPIRED/);
  }
});
test('cannot silently shrink legacy limits, reset counters or claim a foreign public slug',()=>{
  const large=inPlaceFixture();large.snapshot.documents.find(d=>d.path==='caravans/synthetic-trip-a').data.capacity=250;
  assert.throws(()=>planInPlaceBootstrap(large.snapshot,large.reviews),/RIGHTS_EXCEED/);
  const usage=inPlaceFixture();usage.snapshot.documents.push({path:'tenantUsage/synthetic-org-a',data:{organizationId:'synthetic-org-a',version:'commercial-v1',publishedCaravans:9,activeMembers:1,activeOwners:1}});
  assert.throws(()=>planInPlaceBootstrap(usage.snapshot,usage.reviews),/BASELINE_CONFLICT/);
  const alias=inPlaceFixture();alias.snapshot.documents.push({path:'tenantSlugs/synthetic-caravana-a',data:{slug:'synthetic-caravana-a',organizationId:'synthetic-org-b'}});
  assert.throws(()=>planInPlaceBootstrap(alias.snapshot,alias.reviews),/NAMESPACE_CONFLICT/);
  const marker=inPlaceFixture();marker.snapshot.documents.push({path:'namespaceBootstrap/state',data:{version:'namespace-v1',coverageVersion:'tenant-references-v2',inventoryComplete:true}});
  assert.throws(()=>planInPlaceBootstrap(marker.snapshot,marker.reviews),/MARKER_INVALID/);
});
test('revoked history survives without recreating deleted Auth or granting an active member',()=>{
  const f=inPlaceFixture();f.snapshot.documents.push({path:'memberships/synthetic-deleted-user/organizations/synthetic-org-a',data:{uid:'synthetic-deleted-user',organizationId:'synthetic-org-a',role:'staff',status:'revoked'}});
  const plan=planInPlaceBootstrap(f.snapshot,f.reviews),directory=plan.creates.find(d=>d.path==='tenantTeam/synthetic-org-a/members/synthetic-deleted-user');
  assert.equal(directory.data.status,'revoked');assert.equal(plan.manifests[0].usage.activeMembers,1);assert.equal(f.snapshot.authUids.includes('synthetic-deleted-user'),false);
});
test('source/target drift and tampered write-set stop; post-traffic rollback always preserves forward data',()=>{
  const f=inPlaceFixture(),plan=planInPlaceBootstrap(f.snapshot,f.reviews);
  const changed=structuredClone(f.snapshot.documents);changed[0].data.name='SYNTHETIC_CHANGED';assert.throws(()=>validateBootstrapPlan(plan,changed),/SOURCE_DRIFT/);
  const conflicting=[...f.snapshot.documents,{...plan.creates[0],data:{status:'revoked'}}];assert.throws(()=>validateBootstrapPlan(plan,conflicting),/CONCURRENT_TARGET/);
  const tampered={...plan,creates:[]};assert.throws(()=>validateBootstrapPlan(tampered,f.snapshot.documents),/TAMPERED/);
  const rollback=bootstrapRollbackDecision(plan,[...f.snapshot.documents,{path:'registrations/synthetic-new-write',data:{paymentTotalCents:1}}]);assert.equal(rollback.deleteAllowed,false);
  assert.equal(bootstrapRollbackDecision(plan,f.snapshot.documents).deleteAllowed,true);
});
test('demo executor checks actual SDK host as well as project/env before any callback',async()=>{
  const f=inPlaceFixture(),plan=planInPlaceBootstrap(f.snapshot,f.reviews);let read=false;
  const prior=process.env.FIRESTORE_EMULATOR_HOST;process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:18080';
  try{await assert.rejects(applyBootstrapDemo({app:{options:{projectId:'demo-caravana77-test'}},_settings:{host:'firestore.googleapis.com',ssl:true}},plan,()=>{read=true;}),/DEMO_BOOTSTRAP_ONLY/);assert.equal(read,false);}
  finally{if(prior===undefined)delete process.env.FIRESTORE_EMULATOR_HOST;else process.env.FIRESTORE_EMULATOR_HOST=prior;}
});
