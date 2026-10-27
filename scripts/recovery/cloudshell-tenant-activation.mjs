// Private Cloud Shell only. NO copy, Rules, Auth, plan, business-data or public-cutover writes.
import os from 'node:os';
import path from 'node:path';
import { readFile,writeFile,lstat,realpath } from 'node:fs/promises';
import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { SOURCE,ROOT,canonical,officialAccessToken,requireThat } from './safety.mjs';
import { GoogleSource,boundedBody } from './google-source.mjs';
import { planTenantActivation,validateActivationState,validateActivationPlan,activationCopyDocuments,activationCandidatePaths,commitActivation } from './tenant-activation.mjs';
let attempted=false,phase='PREFLIGHT';
try {
  const [mode,directory]=process.argv.slice(2);
  requireThat(process.argv.length===4&&['--preview','--apply','--verify'].includes(mode),'ACTIVATION_EXPLICIT_MODE_REQUIRED');
  requireThat(process.platform==='linux'&&process.env.CLOUD_SHELL==='true'&&!/lab\d|alunos?|shared|public/i.test(os.hostname()+' '+os.userInfo().username),'ACTIVATION_PRIVATE_CLOUD_SHELL_REQUIRED');
  requireThat(path.isAbsolute(directory)&&directory.startsWith(os.homedir()+'/caravana-italo-tenant-')&&path.basename(directory)==='private'&&await realpath(directory)===directory,'ACTIVATION_PRIVATE_DIRECTORY_REQUIRED');
  const privateFile=async(name,max=64000000)=>{
    const file=path.join(directory,name),info=await lstat(file);
    requireThat((name===''?info.isDirectory():info.isFile())&&!info.isSymbolicLink()&&(info.mode&0o077)===0&&info.uid===process.getuid()&&info.size<=max,'ACTIVATION_PRIVATE_PERMISSIONS_OR_BOUND');return name===''?null:readFile(file);
  };
  await privateFile('');const key=await privateFile('snapshot.key',32);requireThat(key.length===32,'ACTIVATION_KEY_LENGTH');
  const decrypt=async name=>{const bytes=await privateFile(name);requireThat(bytes.length>28,'ACTIVATION_CIPHERTEXT_TRUNCATED');const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));d.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([d.update(bytes.subarray(28)),d.final()]));};
  const snapshot=await decrypt('snapshot.enc'),copyPlan=await decrypt('copy-plan.enc');
  // Pin the already executed operation. There is deliberately no apply-copy flag.
  requireThat(copyPlan.planHash==='5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'&&snapshot.documents.length===24&&activationCopyDocuments(copyPlan).length===29,'ACTIVATION_REPORTED_COPY_IDENTITY_MISMATCH');
  const review=mode==='--preview'?JSON.parse(await privateFile('activation-review.json',200000)):null;
  const token=officialAccessToken('nexus7devstudio@gmail.com'),source=new GoogleSource(token);
  const metadata=await source.metadata();requireThat(String(metadata.project.projectNumber)==='742921744156','ACTIVATION_PROJECT_NUMBER_MISMATCH');const users=await source.users();
  requireThat(copyPlan.request.ownerUids.every(uid=>users.some(user=>user.localId===uid&&user.disabled!==true)),'ACTIVATION_AUTH_OWNER_MISSING_OR_DISABLED');
  const database=`projects/${SOURCE}/databases/(default)`;
  const paths=[...new Set([...snapshot.documents.map(d=>d.name),...activationCopyDocuments(copyPlan).map(d=>d.name),...activationCandidatePaths.map(p=>`${ROOT}/${p}`),...['subscriptions/italo','tenantEntitlements/italo','organizations/italo/commercialFeatures/current'].map(p=>`${ROOT}/${p}`)])];
  const api=async(suffix,body)=>{
    requireThat([`${database}/documents:batchGet`,`${database}/documents:beginTransaction`,`${database}/documents:commit`,`${database}/documents:rollback`].includes(suffix),'ACTIVATION_API_ALLOWLIST');
    const response=await fetch('https://firestore.googleapis.com/v1/'+suffix,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    requireThat(response.status===200,`ACTIVATION_HTTP_${response.status}`);return JSON.parse((await boundedBody(response)).toString());
  };
  const read=async transaction=>{
    const result=await api(`${database}/documents:batchGet`,{documents:paths,...(transaction?{transaction}:{})});const rows=Array.isArray(result)?result:[result],seen=new Set(),documents=[];
    for(const row of rows){const name=row.found?.name||row.missing;requireThat(paths.includes(name)&&!seen.has(name),'ACTIVATION_UNEXPECTED_BATCH_ENTRY');seen.add(name);if(row.found)documents.push(row.found);}
    requireThat(seen.size===paths.length,'ACTIVATION_INCOMPLETE_BATCH');return documents;
  };
  phase='READ_COPY_AND_ORIGINALS';let plan;
  if(mode==='--preview') {
    const current=await read();let saved=false;
    try {await lstat(path.join(directory,'activation-plan.enc'));saved=true;}catch(error){if(error.code!=='ENOENT')throw error;}
    if(saved){plan=await decrypt('activation-plan.enc');validateActivationPlan(snapshot,copyPlan,plan);requireThat(canonical(plan.review)===canonical(review),'ACTIVATION_REVIEW_CHANGED_NO_OVERWRITE');validateActivationState(plan,current);}
    else {
      plan=planTenantActivation(snapshot,copyPlan,current,review);
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([cipher.update(Buffer.from(canonical(plan))),cipher.final()]);
      await writeFile(path.join(directory,'activation-plan.enc'),Buffer.concat([iv,cipher.getAuthTag(),bytes]),{mode:0o600,flag:'wx'});
      validateActivationPlan(snapshot,copyPlan,await decrypt('activation-plan.enc'));
    }
    console.log(JSON.stringify({status:'PRIVATE_ACTIVATION_PREVIEW',planHash:plan.planHash,...plan.summary,projectWrites:0,accessAuthenticated:false,publicCutover:false}));
  } else {
    plan=await decrypt('activation-plan.enc');validateActivationPlan(snapshot,copyPlan,plan);
    if(mode==='--apply') {
      await commitActivation(plan,{
        begin:async()=> (await api(`${database}/documents:beginTransaction`,{options:{readWrite:{}}})).transaction,
        read,
        commit:(transaction,writes)=>api(`${database}/documents:commit`,{transaction,writes}),
        rollback:transaction=>api(`${database}/documents:rollback`,{transaction}),
      },()=>{phase='ATOMIC_COMPANIONS';attempted=true;});
    }
    phase='READBACK';const state=validateActivationState(plan,await read());requireThat(state.pending.length===0,'ACTIVATION_READBACK_INCOMPLETE');
    console.log(JSON.stringify({status:'PRIVATE_ACTIVATION_COMPANIONS_VERIFIED',planHash:plan.planHash,originalDocuments:24,copiedDocuments:29,companions:plan.creates.length,commitAttempted:attempted,authWrites:0,businessWrites:0,ruleWrites:0,commercialAssignments:0,accessAuthenticated:false,publicCutover:false}));
  }
} catch(error){console.error(JSON.stringify({status:attempted?'ACTIVATION_VERIFY_REQUIRED_DO_NOT_RETRY_COMMIT':'ACTIVATION_STOP_NO_COMMIT',phase,commitAttempted:attempted,reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'PRIVATE_DETAILS_SUPPRESSED'}));process.exitCode=1;}
