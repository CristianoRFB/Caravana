import { spawn,spawnSync } from 'node:child_process';
import { mkdirSync,openSync,closeSync,unlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { requireThat } from './safety.mjs';
requireThat(process.argv.length===2&&!process.env.GOOGLE_APPLICATION_CREDENTIALS&&!process.env.FIREBASE_TOKEN,'SYNTHETIC_EMULATOR_FLAGS_ONLY');
mkdirSync('.firebase',{recursive:true});
const lockPath='.firebase/goal-x-synthetic-runner.lock',lock=openSync(lockPath,'wx',0o600);
try{
  // Do not start or clean up if any dedicated listener predated this run.
  for(const port of [18081,19151,19098,19198,14401,14501])await new Promise((resolve,reject)=>{
    const server=createServer();server.once('error',()=>reject(Error('DEDICATED_PORT_ALREADY_IN_USE')));
    server.listen(port,'127.0.0.1',()=>server.close(resolve));
  });
  const started=new Date().toISOString();
  const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec',
    '--non-interactive','--config','firebase.recovery.test.json','--project','demo-caravana77-recovery','--only','firestore,auth,storage',
    'node --test scripts/tests/private-recovery-age.test.mjs'],{stdio:'inherit',windowsHide:true,
    env:{...process.env,CARAVANA_SYNTHETIC_RESTORE_EMULATORS:'1',CI:'true'}});
  const exitCode=await new Promise((resolve,reject)=>{child.once('error',()=>reject(Error('SYNTHETIC_EMULATORS_UNAVAILABLE')));child.once('exit',code=>resolve(code??1));});
  if(process.platform==='win32'){
    // Oracle's Java launcher may exit and orphan the real JVM. Parent PID alone
    // is insufficient. Ports were free under our workspace lock; require exact
    // jar/project/port AND creation after this run before stopping that Java PID.
    const command=`$ErrorActionPreference='Stop'; $ids=@(Get-NetTCPConnection -LocalPort 18081,19151 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach($id in $ids){$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$id); if($p.Name -ne 'java.exe' -or $p.CommandLine -notmatch 'cloud-firestore-emulator-v1.22.0.jar' -or $p.CommandLine -notmatch 'demo-caravana77-recovery' -or $p.CommandLine -notmatch '18081' -or $p.CreationDate.ToUniversalTime() -lt [DateTime]::Parse('${started}').ToUniversalTime()){throw 'Owned emulator identity not established'}; Stop-Process -Id $id -ErrorAction Stop}`;
    const cleanup=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,timeout:15000,encoding:'utf8'});
    requireThat(cleanup.status===0,'OWN_EMULATOR_CLEANUP_UNCONFIRMED');
  }
  process.exitCode=exitCode;
}finally{closeSync(lock);unlinkSync(lockPath);}
