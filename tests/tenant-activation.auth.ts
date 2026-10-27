import { beforeAll,beforeEach,afterAll,describe,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment,assertFails,type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp,deleteApp,type FirebaseApp } from 'firebase/app';
import { getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,type Auth } from 'firebase/auth';
import { getFirestore,connectFirestoreEmulator,doc,getDocFromServer,getDocs,collection,setDoc,updateDoc,terminate,type Firestore } from 'firebase/firestore';
import { activationFixture } from '../scripts/tests/tenant-activation-fixture.mjs';
import { activationCandidatePaths,activationCopyDocuments,planTenantActivation,commitActivation,validateActivationState } from '../scripts/recovery/tenant-activation.mjs';
import { planTenantCopy } from '../scripts/recovery/tenant-copy.mjs';
import { ROOT,documentPath } from '../scripts/recovery/safety.mjs';
import { fields } from '../scripts/recovery/inventory.mjs';
const runtime=vi.hoisted(()=>({db:null as Firestore|null,auth:{currentUser:{uid:''}},firebaseConfigured:true}));
vi.mock('../src/lib/firebase',()=>runtime);
import { watchTenantAccess } from '../src/lib/tenant-access';
import { resolveTenantSlug } from '../src/lib/tenant-branding-data';
import { recordPassengerPayment } from '../src/lib/financial-operations';
import type { Registration } from '../src/lib/types';
let env:RulesTestEnvironment,app:FirebaseApp,auth:Auth,database:Firestore,uid:string,secondUid:string;
let f:ReturnType<typeof activationFixture>,plan:ReturnType<typeof planTenantActivation>,paths:string[];
const password='SyntheticOnly-Activation-2026',email='activation-owner@caravana77.invalid';
const demoRoot='projects/demo-caravana77-test/databases/(default)/documents';
const api=async(method:string,suffix:string,body?:unknown)=>{
 const response=await fetch('http://127.0.0.1:18080/v1/projects/demo-caravana77-test/databases/(default)/documents'+suffix,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body).replaceAll(ROOT,demoRoot)});
 if(response.status!==200)throw new Error('Synthetic REST HTTP '+response.status);
 return JSON.parse((await response.text()).replaceAll(demoRoot,ROOT));
};
const read=async(transaction?:string)=>{
 const rows=await api('POST',':batchGet',{documents:paths,...(transaction?{transaction}:{})});
 return (Array.isArray(rows)?rows:[rows]).filter(row=>row.found).map(row=>row.found);
};
const apply=()=>commitActivation(plan,{
 begin:async()=> (await api('POST',':beginTransaction',{options:{readWrite:{}}})).transaction,
 read,
 commit:(transaction:string,writes:unknown)=>api('POST',':commit',{transaction,writes}),
 rollback:(transaction:string)=>api('POST',':rollback',{transaction}),
});
beforeAll(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:18080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:19099')throw Error('Only fixed demo emulators');
 env=await initializeTestEnvironment({projectId:'demo-caravana77-test',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 app=initializeApp({projectId:'demo-caravana77-test',apiKey:'synthetic-only'},'activation-owner');auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
 uid=(await createUserWithEmailAndPassword(auth,email,password)).user.uid;
 secondUid=(await createUserWithEmailAndPassword(auth,'activation-second@caravana77.invalid',password)).user.uid;
 await signOut(auth);await signInWithEmailAndPassword(auth,email,password);
 database=getFirestore(app);connectFirestoreEmulator(database,'127.0.0.1',18080);
});
afterAll(async()=>{if(database)await terminate(database);if(app)await deleteApp(app);if(env)await env.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();f=activationFixture([uid,secondUid]);
 await env.withSecurityRulesDisabled(async ctx=>{for(const raw of f.snapshot.documents)await setDoc(doc(ctx.firestore(),documentPath(raw.name)),fields(raw));});
 paths=f.snapshot.documents.map(raw=>raw.name);f.snapshot.documents=await read();
 f.copyPlan=planTenantCopy(f.snapshot,{sourceOrganizationId:'caravana-77',targetOrganizationId:'italo',targetName:'Ítalo fictício'});
 f.review.copyPlanHash=f.copyPlan.planHash;
 await api('POST',':commit',{writes:activationCopyDocuments(f.copyPlan).map(update=>({update,currentDocument:{exists:false}}))});
 paths=[...paths,...activationCopyDocuments(f.copyPlan).map(raw=>raw.name),...activationCandidatePaths.map(path=>`${ROOT}/${path}`),...['subscriptions/italo','tenantEntitlements/italo','organizations/italo/commercialFeatures/current'].map(path=>`${ROOT}/${path}`)];
 plan=planTenantActivation(f.snapshot,f.copyPlan,await read(),f.review);runtime.db=database;runtime.auth.currentUser.uid=uid;
});
describe('existing copied tenant: real demo Auth, transaction, Rules and application resolvers',()=>{
 it('applies companions atomically, replays without writes and preserves existing Auth UID/source/unknown totals',async()=>{
  expect((await apply()).created).toBe(4);expect((await apply()).created).toBe(0);
  expect(validateActivationState(plan,await read()).pending).toHaveLength(0);
  await signOut(auth);expect((await signInWithEmailAndPassword(auth,email,password)).user.uid).toBe(uid);
  const source=await getDocFromServer(doc(database,'registrations/'+'b'.repeat(64)));expect(source.data()?.paymentTotalCents).toBeNull();
  expect((await getDocFromServer(doc(database,'subscriptions/italo'))).exists()).toBe(false);
  expect((await getDocFromServer(doc(database,`platformOwners/${uid}`))).exists()).toBe(false);
 });
 it('resolves both legacy and italo memberships and exact public alias after refresh',async()=>{
  await apply();expect(await resolveTenantSlug('italo')).toBe('italo');
  const access=await new Promise<string[]>((resolve,reject)=>{let stop=()=>{};const timer=setTimeout(()=>{stop();reject(Error('Resolver timeout'));},10000);stop=watchTenantAccess(uid,items=>{if(items.length===2){clearTimeout(timer);stop();resolve(items.map(i=>i.organizationId));}},reject);});
  expect(access).toEqual(['caravana-77','italo']);
 });
 it('keeps imported draft private, legacy URL readable, and denies B private proof/list access',async()=>{
  await apply();const mapped=f.copyPlan.pathMap.find(p=>p.sourcePath==='registrations/'+'a'.repeat(64))!.targetPath;
  const own=await getDocFromServer(doc(database,mapped+'/proofs/current'));expect(own.data()?.content).toContain('JVBER');
  const foreign=env.authenticatedContext('synthetic-intruder').firestore();await assertFails(getDocFromServer(doc(foreign,mapped+'/proofs/current')));
  await assertFails(getDocs(collection(foreign,'registrations')));
  const trip=f.copyPlan.creates.find(w=>w.targetPath.startsWith('caravans/')&&!w.targetPath.includes('/expenses/'))!;
  await assertFails(getDocFromServer(doc(env.unauthenticatedContext().firestore(),trip.targetPath)));
  expect((await getDocFromServer(doc(env.unauthenticatedContext().firestore(),'caravans/original-trip'))).exists()).toBe(true);
  await assertFails(updateDoc(doc(database,trip.targetPath),{importPending:false}));
  await assertFails(updateDoc(doc(database,trip.targetPath),{status:'published'}));
 });
 it('revocation immediately blocks private data and preview; no legacy fallback into italo',async()=>{
  await apply();const mapped=f.copyPlan.pathMap.find(p=>p.sourcePath==='registrations/'+'a'.repeat(64))!.targetPath;
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),`memberships/${uid}/organizations/italo`),{status:'revoked'}));
  await assertFails(getDocFromServer(doc(database,mapped+'/proofs/current')));
  expect((await getDocFromServer(doc(database,'caravans/original-trip'))).exists()).toBe(true);
  await expect(apply()).rejects.toThrow('DRIFT');
 });
 it('unknown copied payment totals cannot be initialized or paid implicitly by the app or direct SDK',async()=>{
  await apply();const mapped=f.copyPlan.pathMap.find(p=>p.sourcePath==='registrations/'+'b'.repeat(64))!.targetPath;
  const data=(await getDocFromServer(doc(database,mapped))).data()!;
  await expect(recordPassengerPayment({...data,id:mapped.split('/')[1]} as Registration,{amountCents:100,method:'cash',notes:'synthetic'},'3'.repeat(32))).rejects.toThrow('não conciliado');
  await assertFails(updateDoc(doc(database,mapped),{paymentTotalCents:0}));
  expect((await getDocFromServer(doc(database,mapped))).data()?.paymentTotalCents).toBeNull();
 });
 it('concurrent private activation commits once and the losing caller can verify/replay safely',async()=>{
  const results=await Promise.allSettled([apply(),apply()]);
  const committed=results.filter(r=>r.status==='fulfilled').reduce((n,r)=>n+(r.status==='fulfilled'?r.value.created:0),0);
  expect(committed).toBe(4);expect((await apply()).created).toBe(0);
  expect(validateActivationState(plan,await read()).pending).toHaveLength(0);
 });
 it('lost commit acknowledgement never causes another commit and the ledger is client-immutable',async()=>{
  let commits=0;
  await expect(commitActivation(plan,{
   begin:async()=> (await api('POST',':beginTransaction',{options:{readWrite:{}}})).transaction,read,
   commit:async(transaction:string,writes:unknown)=>{commits++;await api('POST',':commit',{transaction,writes});throw Error('SYNTHETIC_ACK_LOST');},
   rollback:(transaction:string)=>api('POST',':rollback',{transaction}),
  })).rejects.toThrow('SYNTHETIC_ACK_LOST');
  expect(commits).toBe(1);expect((await apply()).created).toBe(0);
  const ledger=doc(database,'organizations/italo/tenantActivations/private-v1');
  expect((await getDocFromServer(ledger)).data()?.mode).toBe('private_history_only');
  await assertFails(updateDoc(ledger,{publicCutover:true}));
 });
 it('stale originals and companion conflicts stop before any create',async()=>{
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'organizations/caravana-77'),{newHistoricalField:'synthetic'}));
  await expect(apply()).rejects.toThrow('DRIFT');
  expect((await getDocFromServer(doc(database,'publicTenantSettings/italo'))).exists()).toBe(false);
 });
});
