import { RESTORE, ROOT, encoded, canonical, requireThat, documentPath, assertRestoreTarget } from './safety.mjs';
import { digest, inventorySummary, validatePreview } from './inventory.mjs';
import { boundedBody } from './google-source.mjs';
import { createHash } from 'node:crypto';
const byteHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ORIGINS={firestore:'http://127.0.0.1:18081',auth:'http://127.0.0.1:19098',storage:'http://127.0.0.1:19198'};
export class EmulatorRestore {
  constructor(project=RESTORE,origins=ORIGINS,fetcher=fetch){assertRestoreTarget(project,origins);this.project=project;this.origins={...origins};this.fetcher=fetcher;}
  async request(service,route,options={}) {
    assertRestoreTarget(this.project,this.origins);
    requireThat(!route.includes('..')&&route.startsWith('/')&&!route.startsWith('//'),'RESTORE_ROUTE_REFUSED');
    return this.fetcher(this.origins[service]+route,{...options,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Authorization':'Bearer owner',...options.headers}});
  }
  route(path){return `/v1/projects/${RESTORE}/databases/(default)/documents/${encoded(path)}`;}
  async get(path){const r=await this.request('firestore',this.route(path));if(r.status===404)return null;return JSON.parse((await boundedBody(r)).toString('utf8')).fields||{};}
  async create(path,fields){
    const r=await this.request('firestore',this.route(path)+'?currentDocument.exists=false',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});
    if(r.status!==200){
      // A failed/ambiguous acknowledgement is accepted only after exact readback.
      const existing=await this.get(path);requireThat(existing&&canonical(existing)===canonical(fields),'RESTORE_WRITE_CONFLICT');return false;
    }
    const actual=await this.get(path);requireThat(canonical(actual)===canonical(fields),'RESTORE_AFTER_WRITE_MISMATCH');return true;
  }
  async authMetadata(user){
    // Deliberately cannot transport passwords, salts, MFA or provider sessions.
    // Store encrypted-source recovery metadata as an emulator Firestore record,
    // never impersonate this as a working Authentication account.
    const preserved=await this.create(`recoveryAuthMetadata/${encodeURIComponent(user.localId)}`,{archiveJson:{stringValue:canonical(user)}});
    const safe={localId:user.localId,...(user.email?{email:user.email}:{}),emailVerified:user.emailVerified===true,
      disabled:user.disabled===true,...(user.customAttributes?{customAttributes:user.customAttributes}:{})};
    const page=await this.request('auth',`/identitytoolkit.googleapis.com/v1/projects/${RESTORE}/accounts:batchGet?maxResults=1000`);
    const listing=JSON.parse((await boundedBody(page)).toString('utf8'));
    requireThat(!listing.nextPageToken,'EMULATOR_AUTH_PAGE_BOUND');
    const existing=(listing.users||[]).find(u=>u.localId===user.localId);
    if(existing){for(const[k,v]of Object.entries(safe))requireThat((existing[k]??(typeof v==='boolean'?false:undefined))===v,'RESTORE_AUTH_CONFLICT');}
    else {
      const r=await this.request('auth',`/identitytoolkit.googleapis.com/v1/projects/${RESTORE}/accounts:batchCreate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({users:[safe]})});
      const result=JSON.parse((await boundedBody(r)).toString('utf8'));requireThat(!result.error?.length,'RESTORE_AUTH_IMPORT_FAILED');
      const readback=await this.request('auth',`/identitytoolkit.googleapis.com/v1/projects/${RESTORE}/accounts:batchGet?maxResults=1000`);
      const after=JSON.parse((await boundedBody(readback)).toString('utf8'));
      const restored=(after.users||[]).find(u=>u.localId===safe.localId);
      requireThat(!after.nextPageToken&&restored,'RESTORE_AUTH_AFTER_WRITE');
      for(const[k,v]of Object.entries(safe))requireThat((restored[k]??(typeof v==='boolean'?false:undefined))===v,'RESTORE_AUTH_AFTER_WRITE');
    }
    return preserved;
  }
  async object(object,bytes){
    // Preserve source bucket/name/generation/ACL/token metadata and bytes in the
    // offline recovery database. Source URLs remain unchanged and are NOT live.
    // Raw bytes are chunked below Firestore's document size bound; no remote URL.
    const id=digest({bucket:object.bucket,name:object.name,generation:object.generation}),bucket=RESTORE+'.appspot.com';
    await this.create(`recoveryObjects/${id}`,{metadataJson:{stringValue:canonical(object)},sha256:{stringValue:byteHash(bytes)}});
    const resource=`/storage/v1/b/${bucket}/o/${id}?alt=media`;
    let response=await this.request('storage',resource);
    if(response.status===404){
      const boundary='caravana-'+id;
      const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name:id,contentType:object.contentType||'application/octet-stream'})}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
      const r=await this.request('storage',`/upload/storage/v1/b/${bucket}/o?uploadType=multipart&ifGenerationMatch=0`,{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
      requireThat(r.status===200,'RESTORE_STORAGE_WRITE_FAILED');response=await this.request('storage',resource);
    }
    requireThat(byteHash(await boundedBody(response,64*1024*1024))===byteHash(bytes),'RESTORE_OBJECT_CONFLICT');return 1;
  }
}
export async function restoreVerifiedTree(tree,target,{dryRun=true,maxDocuments=15000}={}) {
  const summary=inventorySummary(tree,{reviewedNonAttachmentUrlHashes:tree.reviewedNonAttachmentUrlHashes||[]});
  requireThat(tree.documents.length<=maxDocuments&&!summary.missingReferencedObjects&&!summary.unresolvedExternalUrls,'RESTORE_INCOMPLETE_INVENTORY');
  requireThat(tree.objectBytes.length===tree.objects.length,'RESTORE_MISSING_OBJECT_BYTES');
  // A preview with conflicts blocks migration, not preservation of original data.
  let migration='BLOCKED_CONFLICT';
  if(!tree.migrationPreview.conflicts.length){validatePreview(tree,tree.migrationPreview);migration='VERIFIED_DRY_RUN_ONLY';}
  if(dryRun)return {status:'DRY_RUN_NO_WRITES',documents:tree.documents.length,objects:tree.objects.length,users:tree.users.length,migration,authLoginVerified:false,hostedLinksVerified:false};
  let created=0,replayed=0;
  for(const doc of tree.documents){const p=documentPath(doc.name),prior=await target.get(p);
    if(prior){requireThat(canonical(prior)===canonical(doc.fields||{}),'RESTORE_CONCURRENT_DOCUMENT');replayed++;}
    else if(await target.create(p,doc.fields||{}))created++;else replayed++;
  }
  for(const user of tree.users)await target.authMetadata(user);
  for(let i=0;i<tree.objects.length;i++)await target.object(tree.objects[i],tree.objectBytes[i]);
  await target.create('recoveryConfiguration/archive',{archiveJson:{stringValue:canonical({config:tree.config,metadata:tree.metadata,buckets:tree.buckets,missing:tree.missing})}});
  // Verify every source document again after all writes, detecting concurrent change.
  for(const doc of tree.documents)requireThat(canonical(await target.get(documentPath(doc.name)))===canonical(doc.fields||{}),'RESTORE_FINAL_DRIFT');
  return {status:'PASS_OFFLINE_DATA_RESTORE_ONLY',created,replayed,documents:tree.documents.length,objects:tree.objects.length,authMetadata:tree.users.length,
    sourceProject:ROOT.split('/')[1],destination:RESTORE,authLoginVerified:false,storageHostedApiVerified:false,
    hostedLinksVerified:false,realRecoveryGateClosed:false,migration};
}
