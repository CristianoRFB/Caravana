// Fixed production identity. This executable has no mutation/export/apply mode.
// Raw responses exist only in memory. Never enable the Firebase CLI debug logger.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
const require=createRequire(import.meta.url), projectId="caravana-af306";
const prefix=`/projects/${projectId}`;
const sha=value=>createHash("sha256").update(value).digest("hex");
const report={checkedAt:new Date().toISOString(),projectId,mode:"READ_ONLY_AGGREGATES_IN_MEMORY",productionMutations:0,rawDataPersisted:false,realBackupCreated:false,gates:{}};
if(process.argv.length!==2 || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_TOKEN)throw Error("Fixed read-only session required; no arguments, tokens, keys or emulators accepted.");
const {logger}=require("firebase-tools/lib/logger");logger.silent=true;
const auth=require("firebase-tools/lib/auth"),{requireAuth}=require("firebase-tools/lib/requireAuth"),{Client}=require("firebase-tools/lib/apiv2");
const account=auth.getAllAccounts().find(value=>value.user.email===process.env.PRODUCTION_READONLY_ACCOUNT);
if(!account || account.user.email!=="crisf.bueno10@gmail.com")throw Error("Use the fresh authorized interactive account; the previously exposed session is forbidden.");
const options={project:projectId,nonInteractive:true};auth.setActiveAccount(options,account);
await requireAuth(options).catch(()=>{throw Error("Official authentication unavailable; credential diagnostics suppressed.");});
const origins={firebase:["https://firebase.googleapis.com","v1beta1"],billing:["https://cloudbilling.googleapis.com","v1"],firestore:["https://firestore.googleapis.com","v1"],rules:["https://firebaserules.googleapis.com","v1"],auth:["https://identitytoolkit.googleapis.com","v1"],authConfig:["https://identitytoolkit.googleapis.com","admin/v2"]};
async function read(service,path,queryParams,body){
  if(!Object.hasOwn(origins,service) || !(path===prefix || path.startsWith(prefix+"/")) || (body!==undefined && !(service==="firestore" && path.endsWith(":listCollectionIds"))))throw Error("Read-only target/method guard rejected request.");
  const [urlPrefix,apiVersion]=origins[service],client=new Client({urlPrefix,apiVersion});
  try{return (body===undefined ? await client.get(path,{queryParams}):await client.post(path,body)).body;}
  catch(cause){const status=Number(cause.status||cause.context?.response?.statusCode)||"unknown";throw Error(`READ_ONLY_${service}_HTTP_${status}`);}
}
async function gate(name,action){try{report.gates[name]={status:"PASS",...await action()};return true;}catch(cause){report.gates[name]={status:"BLOCKED",reason:/^READ_ONLY_/.test(cause.message)?cause.message:"Inventory guard/limit failed; no private diagnostic persisted"};return false;}}
const identity=await gate("identity",async()=>{const p=await read("firebase",prefix);if(p.projectId!==projectId||p.state!=="ACTIVE")throw Error("Identity mismatch");return {projectNumber:p.projectNumber,state:p.state};});
const free=identity && await gate("budget",async()=>{const b=await read("billing",prefix+"/billingInfo");if(b.billingEnabled!==false||b.billingAccountName)throw Error("Free-only inventory cannot continue");return {billingEnabled:false,billingAccountLinked:false};});
if(identity){
  await gate("rules",async()=>{const r=await read("rules",prefix+"/releases/cloud.firestore");if(!r.rulesetName?.startsWith(`projects/${projectId}/rulesets/`))throw Error("Foreign rules");const set=await read("rules","/"+r.rulesetName);return {files:set.source.files.map(file=>({name:file.name,bytes:Buffer.byteLength(file.content),sha256:sha(file.content)}))};});
  await gate("indexes",async()=>{const i=await read("firestore",prefix+"/databases/(default)/collectionGroups/-/indexes");if(i.nextPageToken)throw Error("Incomplete index inventory");return {count:(i.indexes||[]).length,ready:(i.indexes||[]).filter(value=>value.state==="READY").length};});
  await gate("authConfiguration",async()=>{const c=await read("authConfig",prefix+"/config");return {emailPasswordEnabled:c.signIn?.email?.enabled===true&&c.signIn?.email?.passwordRequired===true,anonymousEnabled:c.signIn?.anonymous?.enabled===true,emailEnumerationProtection:c.emailPrivacyConfig?.enableImprovedEmailPrivacy===true,passwordPolicyConfigured:!!c.passwordPolicyConfig,authorizedDomainCount:c.authorizedDomains?.length||0};});
}
if(free){
  const documents=new Map(),authIds=new Set();
  await gate("authUsers",async()=>{let page,users=0;const providers={};do{const response=await read("auth",prefix+"/accounts:batchGet",{maxResults:100,...(page?{nextPageToken:page}:{})});for(const user of response.users||[]){if(++users>1500)throw Error("Bounded inventory limit");authIds.add(user.localId);for(const provider of user.providerUserInfo||[])providers[provider.providerId]=(providers[provider.providerId]||0)+1;}page=response.nextPageToken;}while(page);return {users,providers,passwordHashesExported:false,uidValuesPersisted:false};});
  await gate("documents",async()=>{
    let inspected=0;const schemas={},counts={};const known=new Set(["organizations","admins","caravans","registrations","expenses","payments","proofs","authorizations","memberships","tenantUsage","tenantEntitlements","subscriptions","publicTenantSettings","tenantNamespaces","tenantSlugs","organizationAvailability","platformOwners","reservationAttempts","importBatches","importIdentities","operations","events","audits"]);
    async function walk(parent,depth=0){if(depth>12)throw Error("Bounded depth");let collectionsPage;do{const found=await read("firestore",parent+":listCollectionIds",undefined,{pageSize:100,...(collectionsPage?{pageToken:collectionsPage}:{})});for(const collection of found.collectionIds||[]){if(!/^[a-zA-Z0-9_-]+$/.test(collection))throw Error("Unsafe collection");let page;do{const response=await read("firestore",`${parent}/${collection}`,{pageSize:100,showMissing:true,...(page?{pageToken:page}:{})});for(const d of response.documents||[]){if(++inspected>1500||!d.name.startsWith(`projects/${projectId}/databases/(default)/documents/`))throw Error("Bounded inventory");const path=d.name.split("/documents/")[1];if(d.createTime){documents.set(path,d.fields||{});const label=known.has(collection)?collection:"other-collection";counts[label]=(counts[label]||0)+1;schemas[label]??={};for(const [key,value]of Object.entries(d.fields||{})){const safe=/^(organizationId|caravanId|uid|role|status|ownerUid|paymentStatus|paidAmount|amount|price|reservedSeats|totalSeats|checkedIn|receipt|proof|createdAt|updatedAt|slug)$/.test(key)?key:"other-field";schemas[label][safe]??={};for(const type of Object.keys(value))schemas[label][safe][type]=(schemas[label][safe][type]||0)+1;}}await walk("/"+d.name,depth+1);}page=response.nextPageToken;}while(page);}collectionsPage=found.nextPageToken;}while(collectionsPage);}
    await walk(prefix+"/databases/(default)/documents");
    let missingOrganizations=0,missingCaravans=0,adminsWithoutAuth=0,registrationsWithoutOrganization=0;
    for(const [path,fields]of documents){const org=fields.organizationId?.stringValue,trip=fields.caravanId?.stringValue;if(org&&!documents.has("organizations/"+org))missingOrganizations++;if(trip&&!documents.has("caravans/"+trip))missingCaravans++;if(/^registrations\/[^/]+$/.test(path)&&!org)registrationsWithoutOrganization++;if(/^admins\/[^/]+$/.test(path)&&report.gates.authUsers?.status==="PASS"&&!authIds.has(path.split("/")[1]))adminsWithoutAuth++;}
    return {documents:documents.size,counts,schemaFieldTypes:schemas,missingOrganizations,missingCaravans,adminsWithoutAuth,registrationsWithoutOrganization,identifiersReviewedInMemory:true,identifiersPersisted:false,atomicSnapshot:false,privateFilesDownloaded:false,storageInventory:"BLOCKED separate protected read-only Storage/IAM inventory required"};
  });
  documents.clear();authIds.clear();
}
report.result=Object.values(report.gates).every(g=>g.status==="PASS")?"PARTIAL_READ_ONLY_INVENTORY":"BLOCKED_READ_ONLY_INVENTORY";
await writeFile("docs/evidence/2026-10-20/production-readonly-inventory.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
