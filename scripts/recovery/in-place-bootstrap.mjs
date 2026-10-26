// Pure legacy upgrade planner. No network, credentials, production apply or deletion.
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase/firestore';
import { PlanCatalog,COMMERCIAL_POLICY,validatePlanAssignment } from '../../src/lib/plan-catalog.ts';
import { planCommercialBaseline } from '../../src/lib/commercial-baseline.ts';
import { planMembershipMigration } from '../../src/lib/membership-migration.ts';
import { NAMESPACE_SOURCES,NAMESPACE_INVENTORY_VERSION,planNamespaceProtection } from '../../src/lib/namespace-protection.ts';
import { validateTenantBranding } from '../../src/lib/tenant-branding.ts';
import { canonical,requireThat } from './safety.mjs';
export const bootstrapHash=value=>createHash('sha256').update(canonical(value)??'undefined').digest('hex');
const clone=value=>value instanceof Timestamp?new Timestamp(value.seconds,value.nanoseconds):Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)])):value;
const same=(a,b)=>bootstrapHash(a)===bootstrapHash(b);
const subset=(actual,expected)=>Object.entries(expected).every(([key,value])=>same(actual?.[key],value));
const own=(object,key)=>Object.hasOwn(object,key);
const validPath=p=>typeof p==='string'&&p.split('/').length%2===0&&p.split('/').every(x=>x&&!['.','..'].includes(x));

export function planInPlaceBootstrap(snapshot,reviews) {
  requireThat(snapshot?.inventoryComplete===true&&snapshot.coveredSources&&NAMESPACE_SOURCES.every(s=>snapshot.coveredSources.includes(s)),'COMPLETE_REVIEWED_INVENTORY_REQUIRED');
  requireThat(['caravana-af306','demo-caravana77-test'].includes(snapshot.projectId)&&Array.isArray(snapshot.documents)&&snapshot.documents.length<=200&&Number.isFinite(Date.parse(snapshot.timestamp)),'BOUNDED_SNAPSHOT_REQUIRED');
  const originals=clone(snapshot.documents),byPath=new Map(originals.map(d=>[d.path,d]));
  requireThat(byPath.size===originals.length&&originals.every(d=>validPath(d.path)&&d.data&&typeof d.data==='object'),'DUPLICATE_OR_INVALID_SOURCE');
  const auth=new Set(snapshot.authUids);
  requireThat(auth.size===snapshot.authUids.length&&Array.isArray(reviews)&&reviews.length>0&&new Set(reviews.map(r=>r.organizationId)).size===reviews.length,'EXPLICIT_SINGLE_REVIEW_PER_TENANT');
  const selected=new Set(reviews.map(r=>r.organizationId)),at=Timestamp.fromDate(new Date(snapshot.timestamp));
  const creates=[],patches=[],retained=[],candidatePaths=new Set(),projected=new Map(originals.map(d=>[d.path,clone(d)]));
  const create=(path,data,identity=data)=>{
    requireThat(validPath(path)&&!candidatePaths.has(path),'DUPLICATE_TARGET');candidatePaths.add(path);
    const existing=byPath.get(path);
    if(existing){requireThat(subset(existing.data,identity),'EXISTING_TARGET_CONFLICT_NO_OVERWRITE');retained.push(path);return existing.data;}
    const document={path,data:clone(data)};creates.push(document);projected.set(path,document);return document.data;
  };
  // Relations are checked for every tenant, even if only one is selected.
  for(const d of originals){
    const f=d.data;
    if(f.organizationId)requireThat(byPath.has(`organizations/${f.organizationId}`),'ORPHAN_ORGANIZATION');
    if(f.caravanId){const trip=byPath.get(`caravans/${f.caravanId}`);requireThat(trip&&(!f.organizationId||trip.data.organizationId===f.organizationId),'ORPHAN_OR_CROSS_TENANT_CARAVAN');}
    const parts=d.path.split('/');for(let n=parts.length-2;n>=2;n-=2){const parent=byPath.get(parts.slice(0,n).join('/'));if(parent?.data.organizationId&&f.organizationId)requireThat(parent.data.organizationId===f.organizationId,'CROSS_TENANT_CHILD');}
  }
  const membershipPlan=planMembershipMigration(originals,snapshot.timestamp);
  requireThat(!membershipPlan.conflicts.some(c=>selected.has(byPath.get(c.path)?.data.organizationId)||[...selected].some(id=>c.path.endsWith('/organizations/'+id))),'LEGACY_MEMBERSHIP_CONFLICT');
  for(const operation of membershipPlan.creates.filter(op=>selected.has(op.after.organizationId))){
    requireThat(auth.has(operation.after.uid),'LEGACY_ADMIN_AUTH_UID_REQUIRED');
    const policy=byPath.get(`organizations/${operation.after.organizationId}`)?.data;
    const deadline=policy?.legacyAdminAccessUntil;
    const until=deadline instanceof Timestamp?deadline.toMillis():typeof deadline==='string'?Date.parse(deadline):NaN;
    requireThat(policy?.legacyAdminAccessEnabled!==false&&(deadline===undefined||Number.isFinite(until)&&until>Date.parse(snapshot.timestamp)),'LEGACY_ACCESS_DISABLED_OR_EXPIRED');
    create(operation.path,{...operation.after,createdAt:at,updatedAt:at});
  }
  // Reserve every known namespace without granting memberships to other tenants.
  const refs=[];
  for(const d of originals){const root=d.path.split('/')[0];if(!NAMESPACE_SOURCES.includes(root))continue;
    const id=root==='organizations'&&d.path.split('/').length===2?d.path.split('/')[1]:d.data.organizationId;
    if(id)refs.push({source:root,organizationId:id,...(root==='tenantSlugs'?{namespace:d.path.split('/')[1]}:{})});}
  for(const review of reviews)refs.push({source:'tenantSlugs',organizationId:review.organizationId,namespace:review.branding?.slug});
  const namespace=planNamespaceProtection({complete:true,coveredSources:snapshot.coveredSources,references:refs,
    existing:originals.filter(d=>/^tenantNamespaces\/[^/]+$/.test(d.path)).map(d=>d.data)});
  requireThat(namespace.readyForSyntheticRehearsal,'NAMESPACE_CONFLICT');
  for(const data of namespace.creates)create(`tenantNamespaces/${data.namespace}`,data);
  const existingMarker=byPath.get('namespaceBootstrap/state')?.data;
  requireThat(!existingMarker||/^[a-f0-9]{64}$/.test(existingMarker.manifestHash),'EXISTING_NAMESPACE_MARKER_INVALID');
  create('namespaceBootstrap/state',{version:'namespace-v1',coverageVersion:NAMESPACE_INVENTORY_VERSION,inventoryComplete:true,manifestHash:bootstrapHash(namespace.creates)},
    {version:'namespace-v1',coverageVersion:NAMESPACE_INVENTORY_VERSION,inventoryComplete:true});
  const manifests=[];
  for(const review of reviews){
    const org=review.organizationId,organization=byPath.get(`organizations/${org}`);
    requireThat(organization&&(!organization.data.status||organization.data.status==='active')&&review.contractReviewed===true&&review.actorUid&&auth.has(review.actorUid),'REVIEWED_EXISTING_ACTIVE_TENANT_REQUIRED');
    const assignment=validatePlanAssignment(review.assignment,Date.parse(snapshot.timestamp));
    requireThat(assignment.organizationId===org&&assignment.status==='active'&&!assignment.override&&!assignment.trialEndsAtMillis,'REVIEWED_ACTIVE_CATALOG_PLAN_ONLY');
    const branding=validateTenantBranding(review.branding);requireThat(branding.organizationId===org,'BRANDING_TENANT_MISMATCH');
    const members=[...projected.values()].filter(d=>/^memberships\/[^/]+\/organizations\/[^/]+$/.test(d.path)&&d.data.organizationId===org);
    requireThat(members.every(d=>(d.data.status==='revoked'||auth.has(d.data.uid))&&d.path===`memberships/${d.data.uid}/organizations/${org}`)&&members.some(d=>d.data.uid===review.actorUid&&d.data.role==='tenant_owner'&&d.data.status==='active'),'CONFIRMED_EXISTING_OWNER_REQUIRED');
    for(const member of members)create(`tenantTeam/${org}/members/${member.data.uid}`,
      {uid:member.data.uid,organizationId:org,role:member.data.role,status:member.data.status,updatedAt:at},
      {uid:member.data.uid,organizationId:org,role:member.data.role,status:member.data.status});
    const trips=originals.filter(d=>/^caravans\/[^/]+$/.test(d.path)&&d.data.organizationId===org).map(d=>{
      let status=d.data.status;
      if(status===undefined){const visibility=review.legacyVisibility?.[d.path];
        requireThat(visibility?.previousVisibilityReviewed===true&&/^[a-f0-9]{64}$/.test(visibility.evidenceHash)&&['draft','published','archived'].includes(visibility.status),'LEGACY_VISIBILITY_REVIEW_REQUIRED');
        status=visibility.status;const after={...clone(d.data),status};patches.push({path:d.path,beforeHash:bootstrapHash(d.data),additions:{status},after});projected.set(d.path,{path:d.path,data:after});
      }
      return {id:d.path.split('/')[1],...d.data,status};
    });
    const existingUsage=byPath.get(`tenantUsage/${org}`)?.data;
    const baseline=planCommercialBaseline({organizations:[org],caravans:trips,members:members.map(d=>d.data),existingUsage:existingUsage?{[org]:existingUsage}:{},existingAssignments:{},requestedAssignments:[assignment]},Date.parse(snapshot.timestamp));
    requireThat(!baseline.conflicts.length,'COMMERCIAL_BASELINE_CONFLICT');
    const usage=existingUsage||baseline.usageCreates[0],catalog=PlanCatalog[assignment.planId];
    requireThat(usage.publishedCaravans<=catalog.limits.activeCaravans&&usage.activeMembers<=catalog.limits.internalUsers&&trips.every(t=>t.capacity<=catalog.limits.passengersPerCaravan),'LEGACY_RIGHTS_EXCEED_REVIEWED_PLAN');
    create(`tenantUsage/${org}`,{...usage,updatedAt:at},usage);
    const operationId=bootstrapHash({snapshot:bootstrapHash(originals),org,assignment,branding}).slice(0,32);
    const priorSubscription=byPath.get(`subscriptions/${org}`)?.data;
    const business={organizationId:org,planId:assignment.planId,status:'active',monthlyCatalogCents:catalog.monthlyCents,setupWaived:assignment.setupWaived,
      setupFeeCents:assignment.setupWaived?0:COMMERCIAL_POLICY.setupCents,overrideMonthlyCents:null,overrideExpiresAt:null,overrideReason:'',trialEndsAt:null};
    if(priorSubscription)requireThat(Number.isSafeInteger(priorSubscription.revision)&&priorSubscription.revision>=1&&/^[a-f0-9]{32}$/.test(priorSubscription.lastCommercialOperationId),'EXISTING_SUBSCRIPTION_INVALID');
    const subscription=create(`subscriptions/${org}`,{...business,revision:1,reason:assignment.reason,updatedAt:at,updatedBy:review.actorUid,lastCommercialOperationId:operationId},business);
    const eventId=subscription.lastCommercialOperationId;
    create(`tenantEntitlements/${org}`,{organizationId:org,limits:{...catalog.limits},growthEnabled:true,growthUntil:null,updatedAt:subscription.updatedAt,lastCommercialOperationId:eventId},
      {organizationId:org,limits:{...catalog.limits},growthEnabled:true,growthUntil:null,lastCommercialOperationId:eventId});
    create(`organizations/${org}/commercialFeatures/current`,{organizationId:org,version:'features-v1',planId:assignment.planId,features:[...catalog.features],status:'active',validUntil:null,updatedAt:subscription.updatedAt,lastCommercialOperationId:eventId},
      {organizationId:org,version:'features-v1',planId:assignment.planId,features:[...catalog.features],status:'active',validUntil:null,lastCommercialOperationId:eventId});
    create(`publicTenantSettings/${org}`,{...branding,updatedAt:at,lastBrandOperationId:operationId},branding);
    create(`tenantSlugs/${branding.slug}`,{slug:branding.slug,organizationId:org});
    create(`organizationAvailability/${org}`,{organizationId:org,status:'active',updatedAt:at,lastPlatformOperationId:operationId},{organizationId:org,status:'active'});
    if(!priorSubscription)create(`commercialOperations/${eventId}`,{organizationId:org,actorUid:review.actorUid,at,action:'plan_assigned',payloadHash:bootstrapHash(assignment),previous:null,subscription});
    manifests.push({organizationId:org,planId:assignment.planId,usage,operationId,legacyPathsPreserved:true});
  }
  requireThat(creates.length+patches.length<=200,'ATOMIC_BOOTSTRAP_WRITE_BOUND');
  const plan={version:'legacy-in-place-v1',mode:'PREVIEW_ONLY',timestamp:snapshot.timestamp,sourceProject:snapshot.projectId,
    originals,expectedSource:originals.map(d=>({path:d.path,hash:bootstrapHash(d.data)})),creates,patches,retained,manifests,
    limitations:['No production executor; requires private real inventory and restorable backup', 'Global source drift still requires a controlled write window', 'No Auth creation/reset, financial rewrite, link replacement or platform owner grant']};
  return {...plan,planHash:bootstrapHash(plan)};
}

export function validateBootstrapPlan(plan,current) {
  const {planHash,...body}=plan;requireThat(plan.version==='legacy-in-place-v1'&&plan.mode==='PREVIEW_ONLY'&&bootstrapHash(body)===planHash,'BOOTSTRAP_PLAN_TAMPERED');
  const map=new Map(current.map(d=>[d.path,d.data]));requireThat(map.size===current.length,'DUPLICATE_CURRENT_DOCUMENT');
  const known=new Set([...plan.expectedSource,...plan.creates].map(d=>d.path));
  requireThat(current.every(d=>known.has(d.path)),'NEW_SOURCE_DOCUMENT_STOP');
  for(const expected of plan.expectedSource){const patch=plan.patches.find(p=>p.path===expected.path),actual=map.get(expected.path);
    requireThat(actual&&(bootstrapHash(actual)===expected.hash||patch&&same(actual,patch.after)),'SOURCE_DRIFT_STOP');}
  for(const candidate of plan.creates)if(map.has(candidate.path))requireThat(same(map.get(candidate.path),candidate.data),'CONCURRENT_TARGET_STOP');
  return {pendingCreates:plan.creates.filter(d=>!map.has(d.path)),pendingPatches:plan.patches.filter(p=>!same(map.get(p.path),p.after))};
}
export function bootstrapRollbackDecision(plan,current){
  const {planHash,...body}=plan;requireThat(bootstrapHash(body)===planHash,'BOOTSTRAP_PLAN_TAMPERED');
  try{validateBootstrapPlan(plan,current);}catch{return {strategy:'STOP_PRESERVE_FORWARD_DATA',deleteAllowed:false};}
  const known=new Set([...plan.originals,...plan.creates].map(d=>d.path));
  if(current.some(d=>!known.has(d.path)))return {strategy:'STOP_PRESERVE_FORWARD_DATA',deleteAllowed:false};
  return {strategy:'RESTORE_ONLY_VERIFIED_OWN_ADDITIONS_BEFORE_TRAFFIC',deleteAllowed:true,originalHash:bootstrapHash(plan.originals)};
}

function demoClient(database){
  const client=database?._delegate||database; // rules-unit-testing returns Compat
  requireThat(client?.app?.options?.projectId==='demo-caravana77-test'&&client._settings?.host==='127.0.0.1:18080'&&client._settings?.ssl===false&&process.env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:18080'&&!process.env.GOOGLE_APPLICATION_CREDENTIALS&&!process.env.FIREBASE_TOKEN,'DEMO_BOOTSTRAP_ONLY');
}
export async function applyBootstrapDemo(database,plan,readCurrent,afterCommit){
  // Dynamic SDK import after verifying the live Firestore client target.
  demoClient(database);
  const {doc,runTransaction}=await import('firebase/firestore');
  const current=await readCurrent();validateBootstrapPlan(plan,current);
  let created=0,patched=0;
  await runTransaction(database,async tx=>{
    const paths=[...new Set([...plan.expectedSource.map(d=>d.path),...plan.creates.map(d=>d.path)])];
    const snapshots=await Promise.all(paths.map(p=>tx.get(doc(database,p))));
    const state=snapshots.flatMap((s,i)=>s.exists()?[{path:paths[i],data:s.data()}]:[]),pending=validateBootstrapPlan(plan,state);
    for(const d of pending.pendingCreates)tx.set(doc(database,d.path),d.data);
    for(const p of pending.pendingPatches)tx.update(doc(database,p.path),p.additions);
    created=pending.pendingCreates.length;patched=pending.pendingPatches.length;
  });
  if(afterCommit)await afterCommit();
  validateBootstrapPlan(plan,await readCurrent());
  return {created,patched,productionWrites:0};
}

export async function rollbackBootstrapDemo(database,plan,readCurrent){
  demoClient(database);
  const current=await readCurrent(),decision=bootstrapRollbackDecision(plan,current);
  if(!decision.deleteAllowed)return {strategy:decision.strategy,removed:0,patched:0,productionWrites:0};
  const {doc,runTransaction,deleteField}=await import('firebase/firestore');let removed=0,patched=0;
  await runTransaction(database,async tx=>{
    const paths=[...new Set([...plan.expectedSource,...plan.creates].map(d=>d.path))];
    const snapshots=await Promise.all(paths.map(p=>tx.get(doc(database,p))));
    const state=snapshots.flatMap((s,i)=>s.exists()?[{path:paths[i],data:s.data()}]:[]);
    requireThat(bootstrapRollbackDecision(plan,state).deleteAllowed,'ROLLBACK_FORWARD_DATA_STOP');
    const present=new Map(state.map(d=>[d.path,d.data]));removed=0;patched=0;
    for(const own of plan.creates)if(present.has(own.path)){tx.delete(doc(database,own.path));removed++;}
    for(const patch of plan.patches)if(same(present.get(patch.path),patch.after)){
      tx.update(doc(database,patch.path),Object.fromEntries(Object.keys(patch.additions).map(k=>[k,deleteField()])));patched++;
    }
  });
  const after=await readCurrent();requireThat(bootstrapHash([...after].sort((a,b)=>a.path.localeCompare(b.path)))===bootstrapHash([...plan.originals].sort((a,b)=>a.path.localeCompare(b.path))),'ROLLBACK_BEFORE_HASH_MISMATCH');
  return {strategy:'DEMO_RETURN_BEFORE_TRAFFIC',removed,patched,productionWrites:0};
}
