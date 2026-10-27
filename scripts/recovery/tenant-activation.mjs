// GOAL XIII: activate private historical access to the existing copy, NEVER copy twice.
import { ROOT, SOURCE, canonical, documentPath, requireThat } from './safety.mjs';
import { fields } from './inventory.mjs';
import { tenantCopyHash, validateTenantCopyPlan } from './tenant-copy.mjs';
import { validateTenantBranding } from '../../src/lib/tenant-branding.ts';
export const ACTIVATION_PATH = 'organizations/italo/tenantActivations/private-v1';
const s = stringValue => ({ stringValue });
export function normalizeRest(value) {
  if (Array.isArray(value)) return value.map(normalizeRest);
  if (!value || typeof value !== 'object') return value;
  if (Object.keys(value).length === 1 && typeof value.timestampValue === 'string') {
    const match = value.timestampValue.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})(?:\.([0-9]{1,9}))?Z$/);
    requireThat(match && Number.isFinite(Date.parse(match[1]+'Z')), 'ACTIVATION_INVALID_TIMESTAMP');
    return {timestampValue:match[1]+'.'+(match[2]||'').padEnd(9,'0')+'Z'};
  }
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,normalizeRest(child)]));
}
export function activationCopyDocuments(plan) {
  const audit={name:`${ROOT}/organizations/italo/tenantCopies/${plan.planHash.slice(0,32)}`,fields:{
    version:s('pending-tenant-copy-v1'),sourceOrganizationId:s('caravana-77'),targetOrganizationId:s('italo'),
    sourceReadTime:{timestampValue:plan.readTime},planHash:s(plan.planHash),copiedDocuments:{integerValue:String(plan.summary.copiedDocuments)},
    sourcePreserved:{booleanValue:true},accessActivated:{booleanValue:false},publicCutover:{booleanValue:false},unknownFinancialTotals:{integerValue:String(plan.summary.unknownFinancialTotals)}}};
  return [...plan.creates.map(write=>write.update),audit];
}
export const activationCandidatePaths = ['publicTenantSettings/italo','tenantSlugs/italo','organizationAvailability/italo',ACTIVATION_PATH];
const equalFields = (a,b)=>canonical(normalizeRest(a))===canonical(normalizeRest(b));
export function planTenantActivation(snapshot, copyPlan, current, review) {
  validateTenantCopyPlan(snapshot,copyPlan);
  requireThat(copyPlan.projectId===SOURCE&&copyPlan.sourceOrganizationId==='caravana-77'&&copyPlan.targetOrganizationId==='italo','ACTIVATION_EXACT_COPY_REQUIRED');
  requireThat(review?.copyPlanHash===copyPlan.planHash&&review.privateHistoryOnly===true,'ACTIVATION_REVIEW_REQUIRED');
  const brand=validateTenantBranding(review.branding);
  requireThat(brand.organizationId==='italo'&&brand.slug==='italo','ACTIVATION_BRAND_TARGET');
  requireThat(Array.isArray(current)&&current.length<=550,'ACTIVATION_BOUNDED_CURRENT_REQUIRED');
  const state=new Map(current.map(raw=>[documentPath(raw.name),raw]));
  requireThat(state.size===current.length,'ACTIVATION_DUPLICATE_CURRENT');
  // Snapshot is private, immutable, and bound to the verified historical copy.
  for(const original of snapshot.documents) requireThat(tenantCopyHash(state.get(documentPath(original.name)))===tenantCopyHash(original),'ACTIVATION_ORIGINAL_DRIFT_NO_RECOPY');
  const copied=activationCopyDocuments(copyPlan);
  for(const expected of copied) requireThat(state.get(documentPath(expected.name))&&equalFields(state.get(documentPath(expected.name)).fields,expected.fields),'ACTIVATION_COPY_DRIFT_OR_REVOKED_NO_RECOPY');
  // Auth existence/owner legitimacy came from the protected copy plan; rechecked by executor.
  for(const uid of copyPlan.request.ownerUids) requireThat(snapshot.users.some(user=>user.localId===uid&&user.disabled!==true),'ACTIVATION_EXISTING_AUTH_OWNER_REQUIRED');
  const org=fields(state.get('organizations/italo'));
  requireThat(org.importPending===true,'ACTIVATION_PENDING_COPY_REQUIRED');
  for(const write of copyPlan.creates.filter(w=>/^caravans\/[^/]+$/.test(w.targetPath))) {
    const data=fields(state.get(write.targetPath));requireThat(data.status==='draft'&&data.importPending===true,'ACTIVATION_PUBLIC_COPY_STOP');
  }
  const timestamp={timestampValue:copyPlan.readTime};
  const definitions=[
    ['publicTenantSettings/italo',{...Object.fromEntries(Object.entries(brand).map(([k,v])=>[k,s(v)])),updatedAt:timestamp}],
    ['tenantSlugs/italo',{slug:s('italo'),organizationId:s('italo')}],
    ['organizationAvailability/italo',{organizationId:s('italo'),status:s(org.status==='suspended'?'suspended':'active')}],
    [ACTIVATION_PATH,{version:s('italo-private-v1'),organizationId:s('italo'),sourceOrganizationId:s('caravana-77'),copyPlanHash:s(copyPlan.planHash),mode:s('private_history_only'),publicCutover:{booleanValue:false},sourceReadTime:timestamp}],
  ];
  const creates=[];
  for(const [path,data] of definitions) {
    const found=state.get(path);
    requireThat(!found||equalFields(found.fields,data),'ACTIVATION_COMPANION_CONFLICT');
    if(!found) creates.push({path,update:{name:`${ROOT}/${path}`,fields:data},currentDocument:{exists:false}});
  }
  // Never turn an existing revoked membership into a grant, or create a plan.
  const guards=[...new Set([...snapshot.documents.map(d=>documentPath(d.name)),...copied.map(d=>documentPath(d.name)),...activationCandidatePaths,
    'subscriptions/italo','tenantEntitlements/italo','organizations/italo/commercialFeatures/current'])];
  const expected=guards.map(path=>({path,document:state.get(path)||null}));
  const body={version:'italo-private-activation-v1',projectId:SOURCE,copyPlanHash:copyPlan.planHash,
    review,expected,creates,summary:{originalDocuments:snapshot.documents.length,copiedDocuments:copied.length,missingCompanions:creates.length,authWrites:0,businessWrites:0,commercialAssignments:0,publicCutover:false}};
  return {...body,planHash:tenantCopyHash(body)};
}
export function validateActivationState(plan,current) {
  const {planHash,...body}=plan;requireThat(tenantCopyHash(body)===planHash&&plan.projectId===SOURCE&&plan.version==='italo-private-activation-v1','ACTIVATION_PLAN_TAMPERED');
  const state=new Map(current.map(raw=>[documentPath(raw.name),raw]));requireThat(state.size===current.length,'ACTIVATION_DUPLICATE_CURRENT');
  const pending=[];
  for(const expected of plan.expected) {
    const found=state.get(expected.path)||null,own=plan.creates.find(w=>w.path===expected.path);
    if(own&&found){requireThat(equalFields(found.fields,own.update.fields),'ACTIVATION_READBACK_CONFLICT');continue;}
    requireThat(tenantCopyHash(found)===tenantCopyHash(expected.document),'ACTIVATION_PRECONDITION_DRIFT');
    if(own)pending.push(own);
  }
  requireThat(pending.length===0||pending.length===plan.creates.length,'ACTIVATION_PARTIAL_STATE_STOP');
  return {pending,replayed:pending.length===0};
}
export function validateActivationPlan(snapshot,copyPlan,plan) {
  const baseline=plan.expected.filter(d=>d.document).map(d=>d.document);
  requireThat(canonical(planTenantActivation(snapshot,copyPlan,baseline,plan.review))===canonical(plan),'ACTIVATION_PLAN_NOT_REPRODUCIBLE');
  return true;
}
export function activationRollbackDecision(plan,current) {
  try { validateActivationState(plan,current);return {deleteBusinessDocuments:false,strategy:'PRESERVE_COPY_AND_ROLL_BACK_COMPATIBLE_RELEASE_ONLY'}; }
  catch {return {deleteBusinessDocuments:false,strategy:'STOP_FORWARD_DATA_RECONCILIATION_REQUIRED'};}
}
// Caller is responsible for a fixed official/isolated transport and fresh identity.
// A commit is attempted at most once; uncertain results require readback, never retry.
export async function commitActivation(plan,{begin,read,commit,rollback},onAttempt=()=>{}) {
  requireThat(plan.creates.length<=4&&new Set(plan.creates.map(w=>w.path)).size===plan.creates.length&&plan.creates.every(w=>activationCandidatePaths.includes(w.path)&&w.update.name===`${ROOT}/${w.path}`&&w.currentDocument.exists===false),'ACTIVATION_CREATE_SCOPE_REQUIRED');
  validateActivationState(plan,plan.expected.filter(d=>d.document).map(d=>d.document));
  const transaction=await begin();requireThat(typeof transaction==='string'&&transaction.length>10,'ACTIVATION_TRANSACTION_REQUIRED');
  let attempted=false;
  try {
    const state=validateActivationState(plan,await read(transaction));
    if(!state.pending.length){await rollback(transaction);return {created:0,replayed:true};}
    attempted=true;onAttempt();
    const receipt=await commit(transaction,state.pending.map(({update,currentDocument})=>({update,currentDocument})));
    requireThat(receipt.writeResults?.length===state.pending.length&&receipt.commitTime,'ACTIVATION_COMMIT_RECEIPT_INCOMPLETE');
    return {created:state.pending.length,replayed:false};
  }catch(error){if(!attempted)await rollback(transaction).catch(()=>{});throw error;}
}
