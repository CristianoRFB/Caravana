import { createHash, randomUUID, verify } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile, link, unlink, stat,open } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { canonical, requireThat, SOURCE, documentPath } from './safety.mjs';
import { digest, inventorySummary, migrationPreview } from './inventory.mjs';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const table = Array.from({length:256},(_,i) => { let n=i; for(let b=0;b<8;b++) n=(n>>>1)^((n&1)?0x82f63b78:0); return n>>>0; });
export function crc32c(chunks) { let c=0xffffffff; for(const bytes of chunks) for(const b of bytes) c=(c>>>8)^table[(c^b)&255]; const buf=Buffer.alloc(4);buf.writeUInt32BE((c^0xffffffff)>>>0);return buf.toString('base64'); }
export async function fileDigest(file) { const h=createHash('sha256');let size=0;for await(const b of createReadStream(file)){size+=b.length;h.update(b);}return {sha256:h.digest('hex'),bytes:size}; }
const sortedDocs = docs => [...docs].sort((a,b)=>a.name.localeCompare(b.name));

export async function* archiveFrames(source, tree, reviewedUrls = []) {
  tree.snapshotId??=randomUUID();
  const summary=inventorySummary(tree,{reviewedNonAttachmentUrlHashes:reviewedUrls});
  requireThat(!summary.unresolvedExternalUrls && !summary.missingReferencedObjects && !summary.danglingReferences,
    'UNRESOLVED_ATTACHMENT_OR_REFERENCE');
  const transcript=createHash('sha256');let records=0;
  const line = record => { const bytes=Buffer.from(canonical(record)+'\n');transcript.update(bytes);records++;return bytes; };
  yield line({kind:'header',version:1,projectId:SOURCE,snapshotId:tree.snapshotId,readTime:tree.readTime,reviewedNonAttachmentUrlHashes:reviewedUrls,
    consistency:'FIRESTORE_FIXED_READTIME_OTHER_SERVICES_DRIFT_CHECKED_NOT_ATOMIC'});
  yield line({kind:'configuration',value:{metadata:tree.metadata,config:tree.config,buckets:tree.buckets}});
  for(const doc of tree.documents) yield line({kind:'document',value:doc});
  for(const name of tree.missing) yield line({kind:'missing',name});
  for(const user of tree.users) yield line({kind:'auth',value:user});
  yield line({kind:'migration-preview',value:migrationPreview(tree)});
  for(let index=0;index<tree.objects.length;index++) {
    const object=tree.objects[index], hash=createHash('sha256'), md5=createHash('md5');let bytes=0,crc=0xffffffff;
    yield line({kind:'object-start',index,metadata:object});
    for await(const chunk of source.bytes(object)) {
      requireThat(chunk.length<=4*1024*1024,'OBJECT_CHUNK_BOUND'); bytes+=chunk.length;
      requireThat(Number.isSafeInteger(Number(object.size))&&bytes<=Number(object.size),'OBJECT_SIZE_MISMATCH');
      hash.update(chunk);md5.update(chunk);for(const b of chunk)crc=(crc>>>8)^table[(crc^b)&255];
      // Small frames keep parser memory bounded, independent of transport chunks.
      for(let n=0;n<chunk.length;n+=65536) yield line({kind:'object-chunk',index,base64:chunk.subarray(n,n+65536).toString('base64')});
    }
    const crcBytes=Buffer.alloc(4);crcBytes.writeUInt32BE((crc^0xffffffff)>>>0);
    requireThat(bytes===Number(object.size),'TRUNCATED_OBJECT');
    requireThat(object.md5Hash||object.crc32c,'PROVIDER_CHECKSUM_REQUIRED');
    const md5Value=md5.digest('base64');
    if(object.md5Hash) requireThat(object.md5Hash===md5Value,'PROVIDER_MD5_MISMATCH');
    if(object.crc32c) requireThat(object.crc32c===crcBytes.toString('base64'),'PROVIDER_CRC_MISMATCH');
    yield line({kind:'object-end',index,bytes,sha256:hash.digest('hex')});
  }
  const latest=await source.verifyStable();
  requireThat(digest(sortedDocs(latest.documents))===digest(sortedDocs(tree.documents)) && digest([...latest.missing].sort())===digest([...tree.missing].sort()),'POST_SNAPSHOT_FIRESTORE_DRIFT');
  yield Buffer.from(canonical({kind:'footer',records,transcriptSha256:transcript.digest('hex'),summary})+'\n');
}

export async function parseArchive(stream,maxBytes=128*1024*1024) {
  const transcript=createHash('sha256'), tree={documents:[],missing:[],users:[],objects:[],objectBytes:[]};
  let pending='',total=0,records=0,ended=false,current,header=false,config=false,preview=false;
  const unique=new Set();
  const accept = line => {
    requireThat(!ended,'TRAILING_ARCHIVE_DATA'); let r;try{r=JSON.parse(line);}catch{throw Error('INVALID_ARCHIVE_JSON');}
    if(r.kind==='footer') {
      requireThat(header&&config&&preview&&!current&&r.records===records&&r.transcriptSha256===transcript.digest('hex'),'INCOMPLETE_ARCHIVE');
      requireThat(canonical(r.summary)===canonical(inventorySummary(tree,{reviewedNonAttachmentUrlHashes:tree.reviewedNonAttachmentUrlHashes})),'SUMMARY_MISMATCH');ended=true;tree.summary=r.summary;return;
    }
    requireThat(!current||['object-chunk','object-end'].includes(r.kind),'OBJECT_FRAME_ORDER');
    transcript.update(Buffer.from(line+'\n'));records++;
    if(r.kind==='header') {requireThat(!header&&records===1&&r.version===1&&r.projectId===SOURCE&&Number.isFinite(Date.parse(r.readTime))&&Array.isArray(r.reviewedNonAttachmentUrlHashes),'ARCHIVE_HEADER');header=true;tree.readTime=r.readTime;tree.snapshotId=r.snapshotId;tree.reviewedNonAttachmentUrlHashes=r.reviewedNonAttachmentUrlHashes;return;}
    requireThat(header,'ARCHIVE_HEADER_REQUIRED');
    if(r.kind==='configuration'){requireThat(!config&&canonical(Object.keys(r.value).sort())===canonical(['buckets','config','metadata']),'DUPLICATE_OR_INVALID_CONFIGURATION');config=true;Object.assign(tree,r.value);return;}
    if(r.kind==='document'){const p=documentPath(r.value.name);requireThat(!unique.has(p),'DUPLICATE_DOCUMENT');unique.add(p);tree.documents.push(r.value);return;}
    if(r.kind==='missing'){documentPath(r.name);requireThat(!tree.missing.includes(r.name),'DUPLICATE_MISSING');tree.missing.push(r.name);return;}
    if(r.kind==='auth'){requireThat(typeof r.value.localId==='string'&&!tree.users.some(u=>u.localId===r.value.localId),'DUPLICATE_AUTH');tree.users.push(r.value);return;}
    if(r.kind==='migration-preview'){requireThat(!preview,'DUPLICATE_PREVIEW');preview=true;tree.migrationPreview=r.value;return;}
    if(r.kind==='object-start'){requireThat(r.index===tree.objects.length,'OBJECT_SEQUENCE');current={metadata:r.metadata,index:r.index,chunks:[],bytes:0,hash:createHash('sha256')};return;}
    if(r.kind==='object-chunk'){
      requireThat(current&&r.index===current.index&&typeof r.base64==='string','OBJECT_SEQUENCE');
      const b=Buffer.from(r.base64,'base64');requireThat(b.toString('base64')===r.base64&&b.length<=65536,'INVALID_OBJECT_BASE64');
      current.bytes+=b.length;requireThat(current.bytes<=Number(current.metadata.size),'OBJECT_SIZE_MISMATCH');current.hash.update(b);current.chunks.push(b);return;
    }
    if(r.kind==='object-end'){
      requireThat(current&&r.index===current.index&&r.bytes===current.bytes&&r.bytes===Number(current.metadata.size)&&r.sha256===current.hash.digest('hex'),'OBJECT_CHECKSUM');
      tree.objects.push(current.metadata);tree.objectBytes.push(Buffer.concat(current.chunks));current=undefined;return;
    }
    throw Error('UNKNOWN_ARCHIVE_RECORD');
  };
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for await(const chunk of stream){total+=chunk.length;requireThat(total<=maxBytes,'DECODED_MEMORY_BOUND');pending+=decoder.decode(chunk,{stream:true});
    let newline;while((newline=pending.indexOf('\n'))!==-1){const line=pending.slice(0,newline);pending=pending.slice(newline+1);requireThat(Buffer.byteLength(line)<=2*1024*1024,'FRAME_BOUND');accept(line);}
    requireThat(Buffer.byteLength(pending)<=2*1024*1024,'FRAME_BOUND');}
  pending+=decoder.decode();requireThat(ended&&!pending,'TRUNCATED_ARCHIVE');return tree;
}

export async function exportEncrypted(source,{age,recipient,output,reviewedNonAttachmentUrlHashes=[]}) {
  requireThat(/^age1[0-9a-z]{58}$/.test(recipient)&&output.endsWith('.age'),'PUBLIC_RECIPIENT_AND_AGE_PATH_REQUIRED');
  // Full collection before encryption uses bounded RAM only, exclusively private.
  const tree=await source.collect();
  const child=spawn(age,['--encrypt','--recipient',recipient],{stdio:['pipe','pipe','ignore'],windowsHide:true});
  const exit=new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('AGE_START_FAILED')));child.once('close',code=>code===0?resolve():reject(Error('AGE_FAILED')));});
  const partial=output+'.partial';let result;
  try {
    result=await Promise.allSettled([pipeline(Readable.from(archiveFrames(source,tree,reviewedNonAttachmentUrlHashes)),child.stdin),
      pipeline(child.stdout,createWriteStream(partial,{flags:'wx',mode:0o600})),exit]);
    requireThat(result.every(r=>r.status==='fulfilled'),'EXPORT_INCOMPLETE_NO_PASS');
    const cipher=await fileDigest(partial);
    const publicManifest={format:'caravana77-private-archive-v1',snapshotId:tree.snapshotId,createdAt:new Date().toISOString(),
      ciphertextSha256:cipher.sha256,ciphertextBytes:cipher.bytes,sourceProject:SOURCE,
      counts:{documents:tree.documents.length,users:tree.users.length,objects:tree.objects.length,missingParents:tree.missing.length},
      status:'CANDIDATE_SIGNATURE_AND_REAL_RECOVERY_REQUIRED',backupComplete:false,authPasswordRecoveryVerified:false};
    // Never overwrite either completed artifact; partials remain ciphertext on failure.
    try {await stat(output);throw Error('OUTPUT_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
    await writeFile(output+'.manifest.json',canonical(publicManifest)+'\n',{flag:'wx',mode:0o600});
    await link(partial,output);await unlink(partial);return publicManifest;
  } finally {if(child.exitCode===null)child.kill();}
}

export async function verifySignedCiphertext(file,manifestFile,signatureFile,verifySignature) {
  const bytes=await readFile(manifestFile);requireThat(bytes.length<=32768,'MANIFEST_BOUND');
  const signature=await readFile(signatureFile);requireThat(signature.length<=16384,'SIGNATURE_BOUND');
  requireThat(await verifySignature(bytes,signature),'MANIFEST_AUTHENTICITY_FAILED');
  const m=JSON.parse(bytes.toString('utf8')), actual=await fileDigest(file);
  const handle=await open(file,'r');const header=Buffer.alloc(Buffer.byteLength('age-encryption.org/v1\n'));try{await handle.read(header,0,header.length,0);}finally{await handle.close();}
  requireThat(header.toString('utf8')==='age-encryption.org/v1\n','AGE_CIPHERTEXT_HEADER_REQUIRED');
  requireThat(m.format==='caravana77-private-archive-v1'&&m.sourceProject===SOURCE&&m.ciphertextBytes===actual.bytes&&m.ciphertextSha256===actual.sha256,'CIPHERTEXT_MANIFEST_MISMATCH');return m;
}
export const verifyEd25519 = publicKey => (bytes,signature) => verify(null,bytes,publicKey,signature);
export async function decryptVerified({age,identity,file,manifestFile,signatureFile,verifySignature,syntheticIdentityInput}) {
  const manifest=await verifySignedCiphertext(file,manifestFile,signatureFile,verifySignature);
  const child=spawn(age,['--decrypt','--identity',identity,file],{stdio:[syntheticIdentityInput?'pipe':'inherit','pipe',syntheticIdentityInput?'ignore':'inherit'],windowsHide:true});
  if(syntheticIdentityInput){requireThat(identity==='-','SYNTHETIC_STDIN_IDENTITY_REQUIRED');child.stdin.end(syntheticIdentityInput);}
  const exit=new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('AGE_START_FAILED')));child.once('close',code=>code===0?resolve():reject(Error('DECRYPT_AUTHENTICATION_FAILED')));});
  const results=await Promise.allSettled([parseArchive(child.stdout),exit]);
  if(results.some(r=>r.status==='rejected')){child.kill();throw Error('ARCHIVE_NOT_VERIFIED_NO_RESTORE');}
  const tree=results[0].value;
  requireThat(tree.snapshotId===manifest.snapshotId,'SNAPSHOT_MANIFEST_REPLAY_MISMATCH');
  requireThat(tree.documents.length===manifest.counts.documents&&tree.users.length===manifest.counts.users&&tree.objects.length===manifest.counts.objects&&tree.missing.length===manifest.counts.missingParents,'COVERAGE_MANIFEST_MISMATCH');return tree;
}
