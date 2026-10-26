// For the owner's private device only. Never called through a lab connector.
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { link,unlink,stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { requireThat } from './safety.mjs';
import { boundedBody } from './google-source.mjs';
import { fileDigest, verifySignedCiphertext } from './archive.mjs';
export class PrivateDrive {
  constructor(token,principal,folder,fetcher=fetch) {
    requireThat(/^[a-zA-Z0-9_-]{10,150}$/.test(folder),'APPROVED_FOLDER_REQUIRED');
    this.token=token;this.principal=principal;this.folder=folder;this.fetcher=fetcher;
  }
  async request(url,options={}) {
    const u=new URL(url);
    requireThat(u.protocol==='https:'&&u.hostname==='www.googleapis.com'&&!u.username&&!u.password&&/^\/(?:drive\/v3|upload\/drive\/v3)\//.test(u.pathname),'DRIVE_ENDPOINT_REFUSED');
    const r=await this.fetcher(u,{...options,redirect:'error',signal:AbortSignal.timeout(120000),
      headers:{...options.headers,Authorization:`Bearer ${this.token}`}});
    requireThat([200,201,308].includes(r.status),`DRIVE_HTTP_${r.status}`);return r;
  }
  async json(resource,query={}) {
    const u=new URL('https://www.googleapis.com/drive/v3/'+resource);
    for(const[k,v]of Object.entries(query))u.searchParams.set(k,v);
    return JSON.parse((await boundedBody(await this.request(u))).toString('utf8'));
  }
  async privateFile(id,folder=false) {
    requireThat(/^[a-zA-Z0-9_-]{10,150}$/.test(id),'DRIVE_ID_REFUSED');
    const f=await this.json(`files/${id}`,{fields:'id,mimeType,trashed,driveId,parents,owners(emailAddress,me),capabilities(canAddChildren),size,sha256Checksum'});
    requireThat(f.id===id&&!f.trashed&&!f.driveId&&f.owners?.length===1&&f.owners[0].me===true&&f.owners[0].emailAddress===this.principal,'DRIVE_WRONG_OWNER_OR_SHARED_DRIVE');
    if(folder)requireThat(f.mimeType==='application/vnd.google-apps.folder'&&f.capabilities?.canAddChildren===true,'DRIVE_FOLDER_REQUIRED');
    else requireThat(f.mimeType==='application/octet-stream'&&f.parents?.length===1&&f.parents[0]===this.folder,'DRIVE_FILE_PARENT_OR_TYPE');
    let page,permissions=[],seen=new Set();
    do {
      const p=await this.json(`files/${id}/permissions`,{fields:'nextPageToken,permissions(type,role,emailAddress,deleted)',pageSize:'100',...(page?{pageToken:page}:{})});
      requireThat(Array.isArray(p.permissions),'DRIVE_PERMISSIONS_REQUIRED');permissions.push(...p.permissions);
      page=p.nextPageToken;if(page){requireThat(!seen.has(page),'DRIVE_PAGINATION_LOOP');seen.add(page);}requireThat(seen.size<=20,'DRIVE_PAGE_BOUND');
    }while(page);
    requireThat(permissions.length===1&&permissions[0].type==='user'&&permissions[0].role==='owner'&&permissions[0].emailAddress===this.principal&&!permissions[0].deleted,'DRIVE_NOT_OWNER_ONLY');return f;
  }
  async preflight(requiredBytes) {
    const a=await this.json('about',{fields:'user(emailAddress),storageQuota(limit,usage)'});
    requireThat(a.user?.emailAddress===this.principal,'DRIVE_IDENTITY_MISMATCH');
    const limit=BigInt(a.storageQuota?.limit||0),used=BigInt(a.storageQuota?.usage||0);
    requireThat(limit>0n&&limit-used>BigInt(requiredBytes),'DRIVE_CAPACITY_UNPROVED');
    await this.privateFile(this.folder,true);
  }
  async uploadVerify({file,manifestFile,signatureFile,verifySignature,download}) {
    const manifest=await verifySignedCiphertext(file,manifestFile,signatureFile,verifySignature);
    // Reentry must not allocate a second remote upload before discovering a
    // retained download/partial from the previous attempt.
    for(const candidate of [download,download+'.partial']){
      try{await stat(candidate);throw Error('RETAINED_TRANSFER_REQUIRES_REVIEW');}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    await this.preflight(manifest.ciphertextBytes);
    const start=await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{
      method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(manifest.ciphertextBytes)},
      body:JSON.stringify({name:`caravana77-${randomUUID()}.age`,mimeType:'application/octet-stream',parents:[this.folder]})});
    const location=start.headers.get('location');requireThat(location,'DRIVE_UPLOAD_SESSION_REQUIRED');
    // A lost PUT acknowledgement is UNKNOWN. Never create a duplicate upload automatically.
    const response=await this.request(location,{method:'PUT',headers:{'Content-Type':'application/octet-stream','Content-Length':String(manifest.ciphertextBytes)},body:createReadStream(file),duplex:'half'});
    requireThat(response.status===200||response.status===201,'UPLOAD_INCOMPLETE');
    const uploaded=JSON.parse((await boundedBody(response)).toString('utf8'));
    const metadata=await this.privateFile(uploaded.id);
    requireThat(String(metadata.size)===String(manifest.ciphertextBytes)&&metadata.sha256Checksum===manifest.ciphertextSha256,'DRIVE_REMOTE_CHECKSUM');
    const media=await this.request(`https://www.googleapis.com/drive/v3/files/${uploaded.id}?alt=media`);
    requireThat(media.status===200,'DRIVE_DOWNLOAD_FAILED');
    let size=0;
    async function* bound(){for await(const b of media.body){size+=b.length;requireThat(size<=manifest.ciphertextBytes,'DRIVE_DOWNLOAD_BOUND');yield b;}}
    await pipeline(Readable.from(bound()),createWriteStream(download+'.partial',{flags:'wx',mode:0o600}));
    const actual=await fileDigest(download+'.partial');
    requireThat(actual.bytes===manifest.ciphertextBytes&&actual.sha256===manifest.ciphertextSha256,'DRIVE_DOWNLOAD_CHECKSUM');
    await this.privateFile(this.folder,true);await this.privateFile(uploaded.id);
    // Signature already binds the downloaded bytes by the same ciphertext digest.
    await link(download+'.partial',download);await unlink(download+'.partial');
    return {status:'PASS_CIPHERTEXT_TRANSFER_ONLY',bytes:actual.bytes,ciphertextSha256:actual.sha256,privateOwnerOnly:true,realRestoreVerified:false};
  }
}
