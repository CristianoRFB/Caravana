// Explicit owner provisioning only, in the existing official private Cloud Shell.
// Email is read from a private request; password is hidden TTY input, never argv/env/file.
import os from 'node:os';
import path from 'node:path';
import {readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import {createHash,createCipheriv,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {GoogleSource,boundedBody} from './google-source.mjs';
import {officialAccessToken,requireThat,canonical} from './safety.mjs';
let authAttempted=false,grantAttempted=false;
function secretInput(){
  requireThat(process.stdin.isTTY&&typeof process.stdin.setRawMode==='function','PRIVATE_HIDDEN_TTY_REQUIRED');
  return new Promise((resolve,reject)=>{let value='';process.stdin.setEncoding('utf8');process.stdin.setRawMode(true);process.stdin.resume();
    const end=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.removeListener('data',input);};
    const input=chunk=>{for(const c of chunk){if(c==='\u0003'){end();reject(Error('OPERATOR_CANCELLED'));return;}if(c==='\r'||c==='\n'){end();resolve(value);return;}if(c==='\u007f'){value=value.slice(0,-1);}else if(c>=' '){value+=c;if(value.length>4096){end();reject(Error('PASSWORD_INPUT_BOUND'));return;}}}};
    process.stdin.on('data',input);console.log('OWNER_PASSWORD_INPUT_READY_NO_ECHO');
  });
}
try{
  const directory=process.argv[2];
  requireThat(process.argv.length===3&&process.platform==='linux'&&process.env.CLOUD_SHELL==='true'&&!/lab\d|alunos?|shared|public/i.test(os.hostname()+' '+os.userInfo().username),'OFFICIAL_PRIVATE_CLOUD_SHELL_REQUIRED');
  requireThat(path.isAbsolute(directory)&&directory.startsWith(os.homedir()+'/caravana-italo-tenant-')&&path.basename(directory)==='private'&&await realpath(directory)===directory,'PRIVATE_OWNER_DIRECTORY_REQUIRED');
  for(const name of ['', 'snapshot.key','platform-owner-request.json']){const st=await lstat(path.join(directory,name));requireThat(!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o077)===0,'PRIVATE_OWNER_FILE_PERMISSIONS_REQUIRED');}
  requireThat(!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'CLEAN_OPERATOR_SOURCE_REQUIRED');
  const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),request=JSON.parse(await readFile(path.join(directory,'platform-owner-request.json')));
  requireThat(request.role==='platform_owner'&&typeof request.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email),'EXPLICIT_PRIVATE_OWNER_REQUEST_REQUIRED');
  const key=await readFile(path.join(directory,'snapshot.key'));requireThat(key.length===32,'PRIVATE_KEY_REQUIRED');
  const token=officialAccessToken('nexus7devstudio@gmail.com'),api=new GoogleSource(token),metadata=await api.metadata(),config=await api.config(),before=await api.users();
  requireThat(String(metadata.project.projectNumber)==='742921744156'&&config.auth.signIn?.email?.enabled===true,'EXISTING_PROJECT_AND_PASSWORD_PROVIDER_REQUIRED');
  const actual=config.releases.find(r=>r.release.name.endsWith('/cloud.firestore'));
  const publishedHash=createHash('sha256').update(actual.ruleset.source.files[0].content).digest('hex');
  requireThat(publishedHash==='8ceb58325c16b02e2aedc5c1a11e13f7da92ebcf738e70bc5acfb5bff96c2454'||publishedHash===createHash('sha256').update(await readFile('firestore.platform-operational.rules')).digest('hex'),'PUBLISHED_OPERATIONAL_OR_PLATFORM_RULES_REQUIRED');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),ciphertext=Buffer.concat([cipher.update(Buffer.from(canonical({source,metadata,config,users:before}))),cipher.final()]);
  await writeFile(path.join(directory,'platform-owner-before.enc'),Buffer.concat([iv,cipher.getAuthTag(),ciphertext]),{mode:0o600,flag:'wx'});
  const require=createRequire(path.join(process.cwd(),'package.json')),admin=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth');
  const app=admin.initializeApp({projectId:'caravana-af306',credential:{getAccessToken:async()=>({access_token:token,expires_in:3600})}},'explicit-platform-owner');
  const auth=getAuth(app);let user;
  try{user=await auth.getUserByEmail(request.email);}catch(e){requireThat(e.code==='auth/user-not-found','OWNER_AUTH_LOOKUP_FAILED');}
  if(!user){let password=await secretInput();requireThat(password.length>=6&&password.length<=4096,'PASSWORD_POLICY_INPUT_REQUIRED');
    await writeFile(path.join(directory,'platform-owner-auth-attempt.json'),JSON.stringify({source,attemptedAt:new Date().toISOString(),retry:false}),{mode:0o600,flag:'wx'});authAttempted=true;
    user=await auth.createUser({email:request.email,password,emailVerified:false,disabled:false});password='';
  }
  requireThat(user.email?.toLowerCase()===request.email.toLowerCase()&&!user.disabled,'EXACT_ACTIVE_AUTH_ACCOUNT_REQUIRED');
  const after=await api.users();requireThat(after.length===before.length+(authAttempted?1:0)&&before.every(b=>after.some(a=>a.localId===b.localId&&a.email===b.email&&a.customAttributes===b.customAttributes&&!!a.disabled===!!b.disabled)),'EXISTING_AUTH_ACCOUNTS_MUST_REMAIN_UNCHANGED');
  const root='projects/caravana-af306/databases/(default)/documents',ownerPath=root+'/platformOwners/'+user.uid;
  const existing=await fetch('https://firestore.googleapis.com/v1/'+ownerPath,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(existing.status===200){const d=await existing.json();requireThat(d.fields?.status?.stringValue==='active','EXISTING_OWNER_CONFLICT_NO_REACTIVATION');}
  else{requireThat(existing.status===404,'OWNER_DOCUMENT_LOOKUP_REQUIRED');const id=randomBytes(16).toString('hex'),time=new Date().toISOString();
    const writes=[{update:{name:ownerPath,fields:{uid:{stringValue:user.uid},status:{stringValue:'active'},role:{stringValue:'platform_owner'},createdAt:{timestampValue:time},lastOwnerGrantOperationId:{stringValue:id}}},currentDocument:{exists:false}},
      {update:{name:root+'/platformOwnerGrants/'+id,fields:{uid:{stringValue:user.uid},role:{stringValue:'platform_owner'},action:{stringValue:'explicit_owner_provisioned'},at:{timestampValue:time},source:{stringValue:source}}},currentDocument:{exists:false}}];
    await writeFile(path.join(directory,'platform-owner-grant-attempt.json'),JSON.stringify({source,operationId:id,attemptedAt:time,retry:false}),{mode:0o600,flag:'wx'});grantAttempted=true;
    const response=await fetch('https://firestore.googleapis.com/v1/projects/caravana-af306/databases/(default)/documents:commit',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({writes}),redirect:'error',signal:AbortSignal.timeout(30000)});await boundedBody(response);
  }
  const check=await fetch('https://firestore.googleapis.com/v1/'+ownerPath,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)}),owner=await check.json();
  requireThat(check.status===200&&owner.fields?.status?.stringValue==='active','OWNER_GRANT_READBACK_REQUIRED');
  await writeFile(path.join(directory,'platform-owner-identity.json'),JSON.stringify({uid:user.uid,email:request.email}),{mode:0o600,flag:'wx'});
  const result={status:'REQUESTED_PLATFORM_OWNER_AUTH_AND_DB_VERIFIED',source,newAuthAccount:authAttempted,authAccounts:after.length,existingAccountsPreserved:before.length,ownerActive:true,grantCommitAttempted:grantAttempted,originalBusinessWrites:0,passwordStoredOutsideFirebaseAuth:false,credentialsExported:0,verifiedAt:new Date().toISOString()};
  await writeFile(path.join(directory,'platform-owner-provisioned.json'),JSON.stringify(result),{mode:0o600,flag:'wx'});console.log(JSON.stringify(result));
}catch(e){console.log(JSON.stringify({status:authAttempted||grantAttempted?'VERIFY_OWNER_STATE_DO_NOT_REPEAT_CREATION':'OWNER_PROVISION_STOP',reason:/^[A-Z0-9_]+$/.test(e.message)?e.message:'PRIVATE_DETAILS_SUPPRESSED',authAttempted,grantAttempted,credentialsExported:0}));process.exitCode=1;}
