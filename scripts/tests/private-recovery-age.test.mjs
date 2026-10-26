import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir,mkdtemp,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateKeyPairSync,sign } from 'node:crypto';
import { exportEncrypted,fileDigest } from '../recovery/archive.mjs';
import { GoogleSource } from '../recovery/google-source.mjs';
import { fakeGoogle } from './recovery-fixture.mjs';
const tool=path.resolve('.firebase/tools/age-v1.3.2/age');
const exe=name=>path.join(tool,name+(process.platform==='win32'?'.exe':''));
const run=(file,args,input)=>spawnSync(file,args,{input,timeout:30000,maxBuffer:4*1024*1024,windowsHide:true});
test('actual REST exporter to age, signed ciphertext and independent recovery process; corruption/wrong key rejected',async()=>{
  await mkdir('.firebase/goal-x-synthetic',{recursive:true});const dir=await mkdtemp(path.resolve('.firebase/goal-x-synthetic/run-'));
  const identity=run(exe('age-keygen'),[]).stdout,wrong=run(exe('age-keygen'),[]).stdout;
  assert.ok(identity?.length);const pub=run(exe('age-keygen'),['-y'],identity);assert.equal(pub.status,0);
  const file=path.join(dir,'synthetic.age'),f=fakeGoogle();
  const manifest=await exportEncrypted(new GoogleSource('SYNTHETIC_TOKEN',f.fetcher),{age:exe('age'),recipient:pub.stdout.toString().trim(),output:file});
  assert.equal(manifest.backupComplete,false);assert.equal(manifest.counts.documents,10);
  const {privateKey,publicKey}=generateKeyPairSync('ed25519'),manifestFile=file+'.manifest.json',signatureFile=manifestFile+'.sig';
  await writeFile(signatureFile,sign(null,await readFile(manifestFile),privateKey));
  const cfg={kind:'SYNTHETIC_TEST_ONLY',age:exe('age'),file,manifestFile,signatureFile,publicKey:publicKey.export({type:'spki',format:'pem'}),identity:identity.toString('base64')};
  const child=mode=>run(process.execPath,['scripts/recovery/synthetic-restore-child.mjs',mode],JSON.stringify(cfg));
  const good=child('--synthetic-only');assert.equal(good.status,0,good.stderr?.toString());assert.equal(JSON.parse(good.stdout).unknownTotals,2);
  cfg.identity=wrong.toString('base64');assert.equal(child('--synthetic-only').status,1);cfg.identity=identity.toString('base64');
  const cipher=await readFile(file),bad=Buffer.from(cipher);bad[bad.length-1]^=1;await writeFile(file,bad);assert.equal(child('--synthetic-only').status,1);
  // Even a newly signed outer checksum cannot hide age's authenticated corruption.
  const tamperedManifest={...manifest,ciphertextSha256:(await fileDigest(file)).sha256};
  await writeFile(manifestFile,JSON.stringify(tamperedManifest));await writeFile(signatureFile,sign(null,await readFile(manifestFile),privateKey));
  assert.equal(child('--synthetic-only').status,1);
  await writeFile(file,cipher);await writeFile(manifestFile,JSON.stringify(manifest));await writeFile(signatureFile,sign(null,await readFile(manifestFile),privateKey));
  if(process.env.CARAVANA_SYNTHETIC_RESTORE_EMULATORS==='1'){
    const first=child('--synthetic-emulator');assert.equal(first.status,0,first.stderr?.toString());
    const replay=child('--synthetic-emulator');assert.equal(replay.status,0,replay.stderr?.toString());assert.equal(JSON.parse(replay.stdout).emulator.created,0);
  }
  identity.fill(0);wrong.fill(0);
  console.log(JSON.stringify({status:'PASS_SYNTHETIC_STREAMING_AGE_INDEPENDENT',documents:10,objects:1,authMetadata:1,ownerKeyGenerated:false,
    emulatorRoundtrip:process.env.CARAVANA_SYNTHETIC_RESTORE_EMULATORS==='1',realBackup:false,realRestore:false}));
});
