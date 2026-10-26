import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { SOURCE,ROOT,RESTORE,privateFacts,canonical,documentPath,assertRestoreTarget } from '../recovery/safety.mjs';
import { GoogleSource,boundedBody } from '../recovery/google-source.mjs';
import { inventorySummary,migrationPreview,validatePreview,digest } from '../recovery/inventory.mjs';
import { archiveFrames,parseArchive,verifySignedCiphertext,verifyEd25519,fileDigest } from '../recovery/archive.mjs';
import { EmulatorRestore,ORIGINS,restoreVerifiedTree } from '../recovery/restore.mjs';
import { PrivateDrive } from '../recovery/drive.mjs';
import { syntheticTree,fakeGoogle } from './recovery-fixture.mjs';

test('privacy requires private encrypted Windows and refuses laboratory even with all flags',()=>{
  const facts={hostname:'PERSONAL-PC',username:'owner',platform:'win32',ownerAttestedPrivate:true,encrypted:true};privateFacts(facts);
  for(const patch of [{hostname:'LAB03-PC15'},{username:'Alunos'},{encrypted:false},{ownerAttestedPrivate:false},{platform:'linux'}])assert.throws(()=>privateFacts({...facts,...patch}));
  assert.throws(()=>documentPath('projects/bdall-e3585/databases/(default)/documents/x/y'));
  assert.throws(()=>documentPath(ROOT+'/x/../x/y'));assert.throws(()=>assertRestoreTarget(SOURCE,ORIGINS));
  assert.throws(()=>assertRestoreTarget(RESTORE,{...ORIGINS,firestore:'http://127.0.0.1.evil:18081'}));
});
test('real REST adapter traverses paginated collections, nested missing parents and pins readTime without writes',async()=>{
  const f=fakeGoogle(),source=new GoogleSource('SYNTHETIC_TOKEN_NO_REAL_ACCESS',f.fetcher),tree=await source.collect();
  assert.equal(tree.documents.length,10);assert.equal(tree.missing.length,1);assert.equal(tree.users.length,1);assert.equal(tree.objects.length,1);
  for(const c of f.calls){assert.ok(['GET','POST'].includes(c.method));if(c.method==='POST')assert.ok(c.path.endsWith(':listCollectionIds'));if(c.query.showMissing)assert.equal(c.query.readTime,tree.readTime);if(c.body)assert.equal(c.body.readTime,tree.readTime);}
  assert.ok(f.calls.some(c=>c.query.pageToken));
  const latest=await source.verifyStable();assert.equal(latest.documents.length,10);
});
test('pagination loops and auth revocation fail closed without raw diagnostics',async()=>{
  const repeated=fakeGoogle({loop:true});await assert.rejects(new GoogleSource('SYNTHETIC',repeated.fetcher).collect(),/PAGINATION_LOOP/);
  const revoked=fakeGoogle({fail:u=>u.host==='identitytoolkit.googleapis.com'});await assert.rejects(new GoogleSource('SYNTHETIC',revoked.fetcher).collect(),/READ_HTTP_403/);
  await assert.rejects(new GoogleSource('SYNTHETIC',async()=>{throw Error('should not call');}).request('firestore','projects/bdall-e3585/databases/(default)'),/SOURCE_TARGET_REFUSED/);
  await assert.rejects(new GoogleSource('SYNTHETIC',async()=>{throw Error('should not call');}).request('firestore',`projects/${SOURCE}/anything`,{},{}),/SOURCE_MUTATION_REFUSED/);
});
test('financial reconciliation preserves two unknown totals, cancelled receipts and voided history',()=>{
  const tree=syntheticTree(),before=canonical(tree),s=inventorySummary(tree);
  assert.equal(s.unknownFinancialTotals,2);assert.equal(s.financialMatches,1);assert.equal(s.financialMismatches,0);assert.equal(canonical(tree),before);
  tree.documents.find(d=>d.name.endsWith('/payments/initial')).fields.amountCents.integerValue='7400';assert.equal(inventorySummary(tree).financialMismatches,1);
  tree.documents.find(d=>d.name.endsWith('/payments/initial')).fields.amountCents.integerValue='9007199254740993';assert.ok(inventorySummary(tree).invalidFinancialEntries>0);
});
test('inventory detects foreign/dangling references, cross-tenant relations and never follows external URLs',()=>{
  const tree=syntheticTree();tree.documents[0].fields.ref={referenceValue:ROOT+'/missing/synthetic'};assert.equal(inventorySummary(tree).danglingReferences,1);
  tree.documents[8].fields.url.stringValue='https://evil.invalid/receipt';assert.equal(inventorySummary(tree).unresolvedExternalUrls,1);
  tree.documents[8].fields.url.stringValue='gs://another-bucket/missing';assert.equal(inventorySummary(tree).missingReferencedObjects,1);
  tree.documents[4].fields.organizationId.stringValue='synthetic-foreign';assert.ok(inventorySummary(tree).crossTenantRelations>0);
});
test('migration reuses existing additive planner and refuses source drift, revoked membership or injected overwrite',()=>{
  const tree=syntheticTree(),plan=migrationPreview(tree);assert.equal(plan.creates.length,1);assert.equal(validatePreview(tree,plan).applySupported,false);
  tree.documents[0].fields.changed={booleanValue:true};assert.throws(()=>validatePreview(tree,plan),/DRIFT/);
  const t=syntheticTree();t.documents.push({name:ROOT+'/memberships/synthetic-owner/organizations/synthetic-org',fields:{status:{stringValue:'revoked'}}});assert.ok(migrationPreview(t).conflicts.length>0);
});
async function archive(tree=syntheticTree(),options={}) {
  const source={async *bytes(){yield tree.objectBytes[0];},async verifyStable(){return options.latest||tree;}};
  const chunks=[];for await(const b of archiveFrames(source,tree))chunks.push(b);return Buffer.concat(chunks);
}
test('archive roundtrip retains typed data, subcollections, original IDs, users, bytes and unknown totals',async()=>{
  const bytes=await archive(),restored=await parseArchive(Readable.from([bytes.subarray(0,11),bytes.subarray(11)]));
  assert.equal(restored.documents.length,10);assert.equal(restored.summary.unknownFinancialTotals,2);assert.deepEqual(restored.objectBytes[0],syntheticTree().objectBytes[0]);
  assert.ok(restored.users[0].passwordHash.startsWith('SYNTHETIC'));assert.equal(restored.migrationPreview.creates.length,1);
});
test('archive rejects truncation, trailing records, bad checksums, unknown kinds, missing footer and memory excess',async()=>{
  const bytes=await archive();
  for(const b of [bytes.subarray(0,bytes.length-1),Buffer.concat([bytes,Buffer.from('{}\n')]),Buffer.from(bytes.toString().replace('7500','7400')),Buffer.from(bytes.toString().replace('"kind":"auth"','"kind":"unsafe"'))])await assert.rejects(parseArchive(Readable.from([b])));
  await assert.rejects(parseArchive(Readable.from([bytes]),100),/MEMORY_BOUND/);
});
test('export generator rejects missing object bytes, provider checksum mismatch and post-snapshot drift',async()=>{
  const tree=syntheticTree();tree.objects[0].size=String(Number(tree.objects[0].size)+1);await assert.rejects(archive(tree),/TRUNCATED_OBJECT/);
  const wrong=syntheticTree();wrong.objects[0].md5Hash='SYNTHETIC_INVALID';await assert.rejects(archive(wrong),/MD5/);
  const latest=syntheticTree();latest.documents.pop();await assert.rejects(archive(syntheticTree(),{latest}),/DRIFT/);
  const f=fakeGoogle({mutate:t=>{t.users[0].disabled=true;}}),s=new GoogleSource('SYNTHETIC',f.fetcher);await s.collect();await assert.rejects(s.verifyStable(),/DRIFT/);
});
test('signed manifest pins identity and bytes; checksum alone or substituted key is insufficient',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'caravana77-synthetic-signature-')),file=path.join(dir,'synthetic.age');
  await writeFile(file,'age-encryption.org/v1\nSYNTHETIC_CIPHERTEXT');const bytes=Buffer.from(canonical({format:'caravana77-private-archive-v1',sourceProject:SOURCE,ciphertextBytes:(await fileDigest(file)).bytes,ciphertextSha256:(await fileDigest(file)).sha256}));
  const {publicKey,privateKey}=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519').publicKey;
  await writeFile(file+'.manifest',bytes);await writeFile(file+'.sig',sign(null,bytes,privateKey));
  const args=[file,file+'.manifest',file+'.sig'];await verifySignedCiphertext(...args,verifyEd25519(publicKey));
  await assert.rejects(verifySignedCiphertext(...args,verifyEd25519(wrong)),/AUTHENTICITY/);
  await writeFile(file,'age-encryption.org/v1\nSYNTHETIC_CHANGED');await assert.rejects(verifySignedCiphertext(...args,verifyEd25519(publicKey)),/MISMATCH/);
});
test('restore defaults to zero writes, resumes after interruption and rejects conflicting concurrent values',async()=>{
  const tree=await parseArchive(Readable.from([await archive()])),docs=new Map();let calls=0,failAfter=3;
  const target={async get(p){return docs.get(p)||null;},async create(p,f){if(++calls===failAfter)throw Error('synthetic crash');const prior=docs.get(p);if(prior){assert.equal(canonical(prior),canonical(f));return false;}docs.set(p,structuredClone(f));return true;},async authMetadata(){},async object(){}};
  assert.equal((await restoreVerifiedTree(tree,target)).status,'DRY_RUN_NO_WRITES');assert.equal(docs.size,0);
  await assert.rejects(restoreVerifiedTree(tree,target,{dryRun:false}),/crash/);failAfter=-1;
  const resumed=await restoreVerifiedTree(tree,target,{dryRun:false});assert.equal(resumed.replayed,2);assert.equal(resumed.realRecoveryGateClosed,false);
  assert.equal((await restoreVerifiedTree(tree,target,{dryRun:false})).created,0);
  docs.set('organizations/synthetic-org',{concurrent:{booleanValue:true}});await assert.rejects(restoreVerifiedTree(tree,target,{dryRun:false}),/CONCURRENT/);
});
test('emulator adapter enforces fixed loopback and create-only after-write verification',async()=>{
  const requests=[],store=new Map();const fetcher=async(url,options)=>{requests.push({url,options});const p=new URL(url).pathname;if(options.method==='PATCH'){const f=JSON.parse(options.body).fields;store.set(p,f);return new Response(JSON.stringify({fields:f}));}return store.has(p)?new Response(JSON.stringify({fields:store.get(p)})):new Response('',{status:404});};
  const adapter=new EmulatorRestore(RESTORE,ORIGINS,fetcher);assert.equal(await adapter.create('synthetic/x',{}),true);
  assert.ok(requests[0].url.includes('currentDocument.exists=false'));assert.ok(requests.every(r=>r.url.startsWith(ORIGINS.firestore)));
});
test('bounded transport cancels oversized/truncated/private responses without publishing content',async()=>{
  await assert.rejects(boundedBody(new Response('SYNTHETIC_TOO_LARGE'),3),/BOUND/);
  await assert.rejects(boundedBody(new Response('SYNTHETIC_PRIVATE',{status:403})),/READ_HTTP_403/);
});
test('Drive preflight refuses wrong identity, extra sharing, wrong parent and arbitrary upload endpoint',async()=>{
  const owner='synthetic@caravana77.invalid',folder='synthetic-folder-123';let shared=false;
  const fetcher=async(url)=>{const u=new URL(url);let value;if(u.pathname.endsWith('/about'))value={user:{emailAddress:owner},storageQuota:{limit:'1000000',usage:'0'}};
    else if(u.pathname.endsWith('/permissions'))value={permissions:[{type:'user',role:'owner',emailAddress:owner},...(shared?[{type:'anyone',role:'reader'}]:[])]};
    else value={id:folder,mimeType:'application/vnd.google-apps.folder',owners:[{emailAddress:owner,me:true}],capabilities:{canAddChildren:true}};return new Response(JSON.stringify(value));};
  const drive=new PrivateDrive('SYNTHETIC',owner,folder,fetcher);await drive.preflight(10);shared=true;await assert.rejects(drive.preflight(10),/OWNER_ONLY/);
  await assert.rejects(drive.request('https://evil.invalid/upload'),/ENDPOINT_REFUSED/);
  await assert.rejects(new PrivateDrive('SYNTHETIC','wrong@caravana77.invalid',folder,fetcher).preflight(10),/IDENTITY/);
});
test('Drive transfer streams only a signed age envelope and checks remote hash, downloaded bytes and final privacy',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'caravana77-synthetic-drive-')),file=path.join(directory,'fixture.age');
  const cipher=Buffer.from('age-encryption.org/v1\nSYNTHETIC_ENVELOPE_TRANSFER_ONLY');await writeFile(file,cipher);
  const proof=await fileDigest(file),manifest={format:'caravana77-private-archive-v1',sourceProject:SOURCE,ciphertextBytes:proof.bytes,ciphertextSha256:proof.sha256};
  const keys=generateKeyPairSync('ed25519'),manifestFile=file+'.manifest',signatureFile=file+'.sig';
  await writeFile(manifestFile,canonical(manifest));await writeFile(signatureFile,sign(null,await readFile(manifestFile),keys.privateKey));
  const owner='synthetic@caravana77.invalid',folder='synthetic-folder-123',id='synthetic-cipher-file-123';let uploaded,privacyReads=0;
  const fetcher=async(url,options)=>{
    const u=new URL(url),json=value=>new Response(JSON.stringify(value));
    if(u.pathname.endsWith('/about'))return json({user:{emailAddress:owner},storageQuota:{limit:'99999999',usage:'0'}});
    if(u.pathname.endsWith('/permissions')){privacyReads++;return json({permissions:[{type:'user',role:'owner',emailAddress:owner}]});}
    if(u.pathname.startsWith('/upload/')&&options.method==='POST')return new Response('',{headers:{location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=SYNTHETIC'}});
    if(u.pathname.startsWith('/upload/')&&options.method==='PUT'){const parts=[];for await(const b of options.body)parts.push(b);uploaded=Buffer.concat(parts);return json({id});}
    if(u.searchParams.get('alt')==='media')return new Response(uploaded);
    return json({id:u.pathname.endsWith(folder)?folder:id,mimeType:u.pathname.endsWith(folder)?'application/vnd.google-apps.folder':'application/octet-stream',
      owners:[{emailAddress:owner,me:true}],parents:[folder],capabilities:{canAddChildren:true},size:String(proof.bytes),sha256Checksum:proof.sha256});
  };
  const drive=new PrivateDrive('SYNTHETIC',owner,folder,fetcher),download=path.join(directory,'download.age');
  const result=await drive.uploadVerify({file,manifestFile,signatureFile,verifySignature:verifyEd25519(keys.publicKey),download});
  assert.deepEqual(await readFile(download),cipher);assert.ok(privacyReads>=4);assert.equal(result.realRestoreVerified,false);
  const before=await readFile(download);await assert.rejects(drive.uploadVerify({file,manifestFile,signatureFile,verifySignature:verifyEd25519(keys.publicKey),download}));assert.deepEqual(await readFile(download),before);
});
test('migration preview cannot inject privilege changes; unsupported snapshot and path escape never fall back',async()=>{
  const tree=syntheticTree(),plan=migrationPreview(tree);plan.creates[0].after.role='platform_owner';assert.throws(()=>validatePreview(tree,plan),/TAMPERED/);
  const f=fakeGoogle(),source=new GoogleSource('SYNTHETIC',async(u,o)=>u.pathname.endsWith(':listCollectionIds')?new Response('',{status:400}):f.fetcher(u,o));
  await assert.rejects(source.collect(),/READ_HTTP_400/);
  await assert.rejects(source.request('firestore',`projects/${SOURCE}/../foreign`),/PATH_REFUSED/);
});
test('CLI dry-run is credential-free and unknown flags cannot activate a production operation',async()=>{
  const {spawnSync}=await import('node:child_process');
  const dry=spawnSync(process.execPath,['scripts/private-recovery.mjs'],{encoding:'utf8'});assert.equal(dry.status,0);assert.equal(JSON.parse(dry.stdout).sourceRequests,0);
  const invalid=spawnSync(process.execPath,['scripts/private-recovery.mjs','--apply-production'],{encoding:'utf8'});assert.equal(invalid.status,1);assert.match(invalid.stderr,/UNKNOWN_ARGUMENTS/);
});
