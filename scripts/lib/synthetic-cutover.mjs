// An offline, synthetic-only state machine. No network, credentials or Firebase writes.
import { createHash } from "node:crypto";
import { planMembershipMigration } from "../../src/lib/membership-migration.ts";
import { planCommercialBaseline } from "../../src/lib/commercial-baseline.ts";
import { planNamespaceProtection, NAMESPACE_SOURCES } from "../../src/lib/namespace-protection.ts";
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const fingerprint=value=>createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export function syntheticCutoverPlan(fixture){
  if(fixture?.source!=="SYNTHETIC_ONLY"||fixture.projectId!=="demo-caravana77-test")throw Error("Only fixed synthetic demo input accepted");
  const source=structuredClone(fixture.documents),byPath=new Map(source.map(document=>[document.path,document.data]));
  if(byPath.size!==source.length)throw Error("Duplicate source document");
  const organizations=source.filter(d=>/^organizations\/[^/]+$/.test(d.path)).map(d=>d.path.split("/")[1]);
  const auth=new Set(fixture.authUids);if(auth.size!==fixture.authUids.length)throw Error("Duplicate Auth UID");
  for(const d of source){const f=d.data;if(f.organizationId&&!byPath.has(`organizations/${f.organizationId}`))throw Error("Orphan organization");if(f.caravanId&&!byPath.has(`caravans/${f.caravanId}`))throw Error("Orphan caravan");if(/^registrations\/[^/]+\//.test(d.path)&&!byPath.has(d.path.split("/").slice(0,2).join("/")))throw Error("Orphan private history");if(d.path.startsWith("admins/")&&!auth.has(d.path.split("/")[1]))throw Error("Legacy admin has no verified Auth UID");}
  const members=planMembershipMigration(source,fixture.timestamp);if(members.conflicts.length)throw Error("Membership conflict; no overwrite");
  const projected=[...source,...members.creates.map(op=>({path:op.path,data:op.after}))];
  const baseline=planCommercialBaseline({organizations,caravans:source.filter(d=>/^caravans\/[^/]+$/.test(d.path)).map(d=>({id:d.path.split("/")[1],...d.data})),members:projected.filter(d=>/^memberships\/[^/]+\/organizations\/[^/]+$/.test(d.path)).map(d=>d.data),existingUsage:Object.fromEntries(source.filter(d=>d.path.startsWith("tenantUsage/")).map(d=>[d.path.split("/")[1],d.data])),existingAssignments:{},requestedAssignments:fixture.assignments},Date.parse(fixture.timestamp));
  if(baseline.conflicts.length || baseline.assignmentCreates.length!==organizations.length)throw Error("Explicit reviewed synthetic commercial conditions and owners required");
  const namespaces=planNamespaceProtection({complete:fixture.inventoryComplete===true,coveredSources:fixture.coveredSources||[],references:projected.filter(d=>NAMESPACE_SOURCES.includes(d.path.split("/")[0])&&d.data.organizationId).map(d=>({source:d.path.split("/")[0],organizationId:d.data.organizationId})),existing:[]});if(!namespaces.readyForSyntheticRehearsal)throw Error("Namespace inventory conflict");
  const creates=[...members.creates.map(op=>({path:op.path,data:op.after})),...baseline.usageCreates.map(data=>({path:`tenantUsage/${data.organizationId}`,data})),...namespaces.creates.map(data=>({path:`tenantNamespaces/${data.namespace}`,data}))];
  if(creates.some(d=>byPath.has(d.path))||new Set(creates.map(d=>d.path)).size!==creates.length)throw Error("Existing additive target; no overwrite");
  return {version:"synthetic-cutover-v1",source:"SYNTHETIC_ONLY",projectId:fixture.projectId,original:source,creates,approvedSyntheticAssignments:baseline.assignmentCreates,manifest:fingerprint({source,creates,authUids:fixture.authUids}),limitations:["Real structural inventory unavailable: not a faithful real-client rehearsal", "Commercial documents/team directory/bootstrap require a separately audited full backfill before any real cutover", "Auth/Storage recovery is not proved by a Firestore state machine"]};
}
export function syntheticStep(snapshot,plan,maxCreates=1){
  if(plan.source!=="SYNTHETIC_ONLY"||plan.projectId!=="demo-caravana77-test"||!Number.isSafeInteger(maxCreates)||maxCreates<1)throw Error("Synthetic state machine guard");
  const byPath=new Map(snapshot.map(d=>[d.path,d]));if(byPath.size!==snapshot.length)throw Error("Duplicate snapshot");
  for(const original of plan.original)if(fingerprint(byPath.get(original.path))!==fingerprint(original))throw Error("Source changed after manifest; freeze/replan required");
  for(const create of plan.creates)if(byPath.has(create.path)&&fingerprint(byPath.get(create.path))!==fingerprint(create))throw Error("Concurrent target conflict; no overwrite");
  const pending=plan.creates.filter(d=>!byPath.has(d.path));const additions=pending.slice(0,maxCreates);return {documents:structuredClone([...snapshot,...additions]),created:additions.length,remaining:pending.length-additions.length,manifest:plan.manifest};
}
export function syntheticRollback(snapshot,plan){
  const originalPaths=new Set(plan.original.map(d=>d.path)),createdPaths=new Set(plan.creates.map(d=>d.path));
  const changed=plan.original.some(original=>fingerprint(snapshot.find(d=>d.path===original.path))!==fingerprint(original));
  const newBusinessData=snapshot.some(d=>!originalPaths.has(d.path)&&!createdPaths.has(d.path));
  const changedAddition=snapshot.some(d=>createdPaths.has(d.path)&&fingerprint(d)!==fingerprint(plan.creates.find(c=>c.path===d.path)));
  if(changed||newBusinessData||changedAddition)return {strategy:"PRESERVE_FORWARD_DATA_NO_DELETE",documents:structuredClone(snapshot),removed:0};
  return {strategy:"REMOVE_ONLY_UNCHANGED_SYNTHETIC_ADDITIONS_BEFORE_TRAFFIC",documents:structuredClone(snapshot.filter(d=>!createdPaths.has(d.path))),removed:snapshot.filter(d=>createdPaths.has(d.path)).length};
}
