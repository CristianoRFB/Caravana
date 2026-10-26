// Test harness ONLY: independent process, fixed invented IDs, no remote source.
import { readFileSync } from 'node:fs';
import { createPublicKey } from 'node:crypto';
import { decryptVerified,verifyEd25519 } from './archive.mjs';
import { requireThat,documentPath } from './safety.mjs';
import { EmulatorRestore,restoreVerifiedTree } from './restore.mjs';
try{
  requireThat(process.argv.length===3&&['--synthetic-only','--synthetic-emulator'].includes(process.argv[2]),'SYNTHETIC_FLAG_REQUIRED');
  const raw=readFileSync(0);requireThat(raw.length<20000,'SYNTHETIC_INPUT_BOUND');const cfg=JSON.parse(raw);
  requireThat(cfg.kind==='SYNTHETIC_TEST_ONLY','SYNTHETIC_INPUT_REQUIRED');
  const identity=Buffer.from(cfg.identity,'base64');
  const tree=await decryptVerified({...cfg,identity:'-',syntheticIdentityInput:identity,verifySignature:verifyEd25519(createPublicKey(cfg.publicKey))});
  identity.fill(0);delete cfg.identity;
  requireThat(tree.users.every(u=>u.email?.endsWith('@caravana77.invalid'))&&tree.documents.every(d=>documentPath(d.name).split('/').some(p=>p.startsWith('synthetic'))),'FIXTURE_IDENTITIES_REQUIRED');
  let report={status:'PASS_INDEPENDENT_SYNTHETIC_PROCESS',documents:tree.documents.length,objects:tree.objects.length,users:tree.users.length,unknownTotals:tree.summary.unknownFinancialTotals,realRestore:false};
  if(process.argv[2]==='--synthetic-emulator')report={...report,emulator:await restoreVerifiedTree(tree,new EmulatorRestore(),{dryRun:false})};
  console.log(JSON.stringify(report));
}catch{console.error('SYNTHETIC_RECOVERY_CHILD_FAILED');process.exitCode=1;}
