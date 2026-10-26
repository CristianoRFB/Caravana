// Owner-operated CLI. Default dry-run NEVER opens configuration, credentials or data.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile,open,unlink,stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { SOURCE,requireThat,requirePrivateDevice,outsideRepo,officialAccessToken,canonical } from './recovery/safety.mjs';
import { GoogleSource } from './recovery/google-source.mjs';
import { inventorySummary,migrationPreview,validatePreview } from './recovery/inventory.mjs';
import { exportEncrypted,decryptVerified } from './recovery/archive.mjs';
import { PrivateDrive } from './recovery/drive.mjs';
import { EmulatorRestore,restoreVerifiedTree } from './recovery/restore.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
  const args=process.argv.slice(2),mode=args[0]||'--dry-run';
  if(mode==='--dry-run'){
    requireThat(args.length<=1,'UNKNOWN_ARGUMENTS');
    console.log(JSON.stringify({mode:'DRY_RUN',sourceProject:SOURCE,sourceRequests:0,credentialsRead:false,configurationRead:false,
      payloadRead:false,filesCreated:0,productionApplySupported:false,
      privateModes:['--private-inventory','--private-export','--private-drive','--private-restore-dry-run','--private-restore-apply']}));
  }else{
    requireThat(['--private-inventory','--private-export','--private-drive','--private-restore-dry-run','--private-restore-apply'].includes(mode)&&args.length===3&&args[1]==='--config','UNKNOWN_ARGUMENTS');
    requireThat(!/lab\d|alunos?|shared|public/i.test(os.hostname()+' '+os.userInfo().username),'SHARED_DEVICE_REFUSED');
    for(const key of ['FIREBASE_TOKEN','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_OAUTH_ACCESS_TOKEN','CLOUDSDK_AUTH_ACCESS_TOKEN'])requireThat(!process.env[key],'ENV_CREDENTIAL_SELECTOR_REFUSED');
    const configPath=outsideRepo(args[2],repo),raw=await readFile(configPath,'utf8');requireThat(raw.length<=32768,'CONFIG_BOUND');
    const config=JSON.parse(raw);
    requireThat(config.schemaVersion===1&&config.sourceProject===SOURCE&&config.ownerAttestedPrivate===true&&config.noNewBillingOrTerms===true&&config.custodyAndSecondCopyTested===true,'PRIVATE_ATTESTATIONS_REQUIRED');
    const directory=outsideRepo(config.privateDirectory,repo);
    requirePrivateDevice(directory,true);requirePrivateDevice(path.dirname(configPath),true);
    const fixedFile=name=>{requireThat(typeof name==='string'&&name===path.basename(name)&&!name.includes('..')&&/^[a-zA-Z0-9_.-]+$/.test(name),'PRIVATE_FILENAME_REQUIRED');return path.join(directory,name);};
    const file=fixedFile(config.ciphertextName),manifestFile=file+'.manifest.json',signatureFile=manifestFile+'.sig';
    const signerFile=outsideRepo(config.allowedSignersFile,repo);
    const verifySignature=(bytes)=>{
      const r=spawnSync('ssh-keygen',['-Y','verify','-f',signerFile,'-I','caravana77-owner','-n','caravana77-backup','-s',signatureFile],{input:bytes,timeout:15000,maxBuffer:32768,windowsHide:true});
      return r.status===0;
    };
    if(mode==='--private-inventory'||mode==='--private-export'){
      requireThat(config.ownerReviewedReadBudget===true&&config.crossServiceWriteWindowControlled===true,'READ_QUOTA_AND_CONSISTENCY_REVIEW_REQUIRED');
      const source=new GoogleSource(officialAccessToken(config.expectedPrincipal));
      if(mode==='--private-inventory'){
        const tree=await source.collect(),summary=inventorySummary(tree,config),preview=migrationPreview(tree);
        console.log(JSON.stringify({status:'PRIVATE_READ_ONLY_INVENTORY',summary,migrationCreates:preview.creates.length,migrationConflicts:preview.conflicts.length,
          authPasswordRecoveryVerified:false,realBackupCreated:false,realMigrationReady:false}));
      }else{
        requireThat(config.ageExecutable&&config.publicRecipient&&config.allowPrivateReadOnlyExport===true,'EXPORT_INTENT_REQUIRED');
        const age=outsideRepo(config.ageExecutable,repo);
        const free=await stat(directory,{bigint:true});requireThat(free.isDirectory(),'PRIVATE_DIRECTORY_REQUIRED');
        const manifest=await exportEncrypted(source,{age,recipient:config.publicRecipient,output:file,reviewedNonAttachmentUrlHashes:config.reviewedNonAttachmentUrlHashes||[]});
        console.log(JSON.stringify({status:manifest.status,counts:manifest.counts,ciphertextBytes:manifest.ciphertextBytes,backupComplete:false,
          next:'Owner signs the canonical manifest personally using the pinned public signer; no private key is read by this CLI.'}));
      }
    }else if(mode==='--private-drive'){
      requireThat(config.allowPrivateCiphertextUpload===true,'UPLOAD_INTENT_REQUIRED');
      const drive=new PrivateDrive(officialAccessToken(config.expectedPrincipal),config.expectedPrincipal,config.approvedDriveFolderId);
      const report=await drive.uploadVerify({file,manifestFile,signatureFile,verifySignature,download:fixedFile(config.downloadName)});
      console.log(JSON.stringify(report));
    }else{
      requireThat(config.ageExecutable&&config.encryptedIdentityFile&&config.ownerRestoreIsolationReviewed===true,'RESTORE_ISOLATION_REQUIRED');
      const age=outsideRepo(config.ageExecutable,repo),identity=outsideRepo(config.encryptedIdentityFile,repo);
      requirePrivateDevice(path.dirname(identity),true);
      const tree=await decryptVerified({age,identity,file:fixedFile(config.downloadName),manifestFile,signatureFile,verifySignature});
      const preview=tree.migrationPreview;if(!preview.conflicts.length)validatePreview(tree,preview);
      const apply=mode==='--private-restore-apply';
      requireThat(!apply||config.allowDemoOfflineRestore===true,'DEMO_RESTORE_INTENT_REQUIRED');
      // Same-machine single-writer lock. A crash leaves a lock requiring investigation;
      // never automatically remove a stale lock or clear the emulator's data.
      const lockPath=path.join(directory,'restore-single-writer.lock');
      let lock;
      try{
        if(apply)lock=await open(lockPath,'wx',0o600);
        const report=await restoreVerifiedTree(tree,new EmulatorRestore(),{dryRun:!apply});
        console.log(JSON.stringify(report));
      }finally{if(lock){await lock.close();await unlink(lockPath);}}
    }
  }
}catch(error){
  const reason=/^[A-Z0-9_]+$/.test(error.message)?error.message:'PRIVATE_OPERATION_BLOCKED_DETAILS_SUPPRESSED';
  console.error(JSON.stringify({status:'BLOCKED',reason,ready:false}));process.exitCode=1;
}
