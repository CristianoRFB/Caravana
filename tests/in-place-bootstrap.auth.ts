import { beforeAll,beforeEach,afterAll,afterEach,describe,it,expect,vi } from 'vitest';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { initializeTestEnvironment,assertFails,type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp,deleteApp,type FirebaseApp } from 'firebase/app';
import { getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,type Auth } from 'firebase/auth';
import { getFirestore,connectFirestoreEmulator,doc,getDocFromServer,setDoc,updateDoc,terminate,type Firestore } from 'firebase/firestore';
import { planInPlaceBootstrap,applyBootstrapDemo,bootstrapHash,bootstrapRollbackDecision,rollbackBootstrapDemo } from '../scripts/recovery/in-place-bootstrap.mjs';
import { inPlaceFixture } from '../scripts/tests/in-place-fixture.mjs';
const runtime=vi.hoisted(()=>({db:null as Firestore|null,auth:{currentUser:{uid:''}},firebaseConfigured:true,assertIdentityAllowed:()=>undefined}));
vi.mock('../src/lib/firebase',()=>runtime);
import { findCaravan,reserveSeat,getRegistration } from '../src/lib/data';
import { createReservationAttempt } from '../src/lib/reservation-attempt';
import { toggleCheckin,cancelRegistration } from '../src/lib/registration-operations';
import { recordPassengerPayment,voidPassengerPayment } from '../src/lib/financial-operations';
import { saveOperationalReport } from '../src/lib/operational-tools-data';
import { assignTenantPlan } from '../src/lib/commercial-data';
import { pendingWrites } from '../src/lib/pending-writes';
import type { Registration } from '../src/lib/types';
let env:RulesTestEnvironment,appA:FirebaseApp,appB:FirebaseApp,authA:Auth,authB:Auth,dbA:Firestore,dbB:Firestore,uidA:string,uidB:string;
let fixture:ReturnType<typeof inPlaceFixture>,plan:ReturnType<typeof planInPlaceBootstrap>;
const password='SyntheticOnly-Review-2026',org='synthetic-org-a',regId='a'.repeat(64);
const emails={a:'bootstrap-a@caravana77.invalid',b:'bootstrap-b@caravana77.invalid'};
function as(db:Firestore,uid:string){runtime.db=db;runtime.auth.currentUser.uid=uid;}
beforeAll(async()=>{
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:18080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:19099')throw Error('Exact demo emulators required');
  env=await initializeTestEnvironment({projectId:'demo-caravana77-test',firestore:{rules:readFileSync('firestore.rules','utf8')}});
  appA=initializeApp({projectId:'demo-caravana77-test',apiKey:'synthetic-key'},'in-place-a');appB=initializeApp({projectId:'demo-caravana77-test',apiKey:'synthetic-key'},'in-place-b');
  authA=getAuth(appA);authB=getAuth(appB);connectAuthEmulator(authA,'http://127.0.0.1:19099',{disableWarnings:true});connectAuthEmulator(authB,'http://127.0.0.1:19099',{disableWarnings:true});
  uidA=(await createUserWithEmailAndPassword(authA,emails.a,password)).user.uid;uidB=(await createUserWithEmailAndPassword(authB,emails.b,password)).user.uid;
  dbA=getFirestore(appA);dbB=getFirestore(appB);connectFirestoreEmulator(dbA,'127.0.0.1',18080);connectFirestoreEmulator(dbB,'127.0.0.1',18080);
});
beforeEach(async()=>{
  await env.clearFirestore();const raw=JSON.stringify(inPlaceFixture()).replaceAll('synthetic-owner-a',uidA).replaceAll('synthetic-owner-b',uidB);fixture=JSON.parse(raw);plan=planInPlaceBootstrap(fixture.snapshot,fixture.reviews);
  await env.withSecurityRulesDisabled(async ctx=>{for(const d of fixture.snapshot.documents)await setDoc(doc(ctx.firestore(),d.path),d.data);});
  as(dbA,uidA);
});
afterEach(()=>{expect(pendingWrites()).toBe(0);runtime.db=null;});
afterAll(async()=>{await Promise.all([terminate(dbA),terminate(dbB)]);await Promise.all([deleteApp(appA),deleteApp(appB)]);await env.clearFirestore();await env.cleanup();});
const readCurrent=async(database:Firestore)=>{
  const paths=[...new Set([...plan.originals,...plan.creates].map(d=>d.path))];
  const values=await Promise.all(paths.map(async path=>{const s=await getDocFromServer(doc(database,path));return s.exists()?{path,data:s.data()}:null;}));return values.filter(Boolean);
};
async function bootstrap(afterCommit?:()=>Promise<void>){let result:Awaited<ReturnType<typeof applyBootstrapDemo>>|undefined;await env.withSecurityRulesDisabled(async ctx=>{result=await applyBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore()),afterCommit);});return result!;}
describe('in-place additive upgrade using actual SDK, Auth and unchanged candidate Rules',()=>{
  it('keeps legacy login/read access, applies full companions atomically under concurrency and preserves original fields and identity',async()=>{
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}`))).data()?.paymentTotalCents).toBe(7500);
    // Registration IDs are bearer portal capabilities; private proofs and
    // tenant queries, rather than a known public capability, prove isolation.
    await assertFails(getDocFromServer(doc(dbB,`registrations/${regId}/proofs/current`)));
    let results:Awaited<ReturnType<typeof applyBootstrapDemo>>[]=[];await env.withSecurityRulesDisabled(async ctx=>{results=await Promise.all([applyBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore())),applyBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore()))]);});
    expect(results.reduce((n,r)=>n+r.created,0)).toBe(plan.creates.length);expect((await bootstrap()).created).toBe(0);
    await env.withSecurityRulesDisabled(async ctx=>{
      for(const original of fixture.snapshot.documents){const data=(await getDocFromServer(doc(ctx.firestore(),original.path))).data();const patch=plan.patches.find(p=>p.path===original.path);
        expect(bootstrapHash(data)).toBe(bootstrapHash(patch?patch.after:original.data));}
      expect((await getDocFromServer(doc(ctx.firestore(),`platformOwners/${uidA}`))).exists()).toBe(false);
      expect((await getDocFromServer(doc(ctx.firestore(),`memberships/${uidB}/organizations/synthetic-org-b`))).exists()).toBe(false);
    });
    await signOut(authA);expect((await signInWithEmailAndPassword(authA,emails.a,password)).user.uid).toBe(uidA);
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}/proofs/current`))).data()?.content).toBe('JVBERi0xLjQKU1lOVEhFVElD');
    await assertFails(getDocFromServer(doc(dbB,`registrations/${regId}/proofs/current`)));
    expect((await getDocFromServer(doc(dbA,`tenantUsage/${org}`))).data()?.publishedCaravans).toBe(1);
    expect((await getDocFromServer(doc(dbA,`subscriptions/${org}`))).data()?.planId).toBe('pro');
    expect((await getDocFromServer(doc(dbA,`organizations/${org}/commercialFeatures/current`))).data()?.features).toContain('report_library');
  });
  it('recovers a lost commit acknowledgement without rewriting anything, then rejects financial drift',async()=>{
    await expect(bootstrap(async()=>{throw Error('SYNTHETIC_ACK_LOST');})).rejects.toThrow('SYNTHETIC_ACK_LOST');
    expect((await bootstrap()).created).toBe(0);
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),`registrations/${regId}`),{paymentTotalCents:7600}));
    await expect(bootstrap()).rejects.toThrow('SOURCE_DRIFT');
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}`))).data()?.paymentTotalCents).toBe(7600);
  });
  it('returns only its own additions before traffic, restores the before hash and keeps legacy access',async()=>{
    await bootstrap();let removed=0;
    await env.withSecurityRulesDisabled(async ctx=>{const result=await rollbackBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore()));removed=result.removed;
      expect(result.patched).toBe(1);expect((await rollbackBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore()))).removed).toBe(0);});
    expect(removed).toBe(plan.creates.length);expect((await getDocFromServer(doc(dbA,`registrations/${regId}`))).data()?.paymentTotalCents).toBe(7500);
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}/proofs/current`))).exists()).toBe(true);
  });
  it('runs old links, reservations/replay, check-in, compensations, reports/downgrade and revocation without deleting legacy history',async()=>{
    await bootstrap();
    const reg={id:regId,organizationId:org,caravanId:'synthetic-trip-a'} as Registration;
    as(env.unauthenticatedContext().firestore(),'');
    const trip=await findCaravan('synthetic-original-link');expect(trip?.id).toBe('synthetic-trip-a');
    const attempt=createReservationAttempt(),form={passengerName:'Pessoa Fictícia Nova',phone:'11900000000',email:'',city:'',boardingPointId:'synthetic-stop',boardingPointName:'Embarque fictício',emergencyContact:'',notes:''};
    const reservation=await reserveSeat(trip!,form,attempt);expect(await reserveSeat(trip!,form,attempt)).toBe(reservation);
    as(dbA,uidA);expect((await getRegistration(reservation))?.id).toBe(reservation);
    await toggleCheckin(reg,true,'1'.repeat(32));await toggleCheckin(reg,false,'2'.repeat(32));
    await recordPassengerPayment(reg,{amountCents:500,method:'cash',notes:'Teste estritamente fictício'},'3'.repeat(32));
    await voidPassengerPayment(regId,'3'.repeat(32),'Anulação fictícia de ensaio','4'.repeat(32));
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}`))).data()?.paymentTotalCents).toBe(7500);
    expect((await getDocFromServer(doc(dbA,'registrations/synthetic-unknown'))).data()?.paymentTotalCents).toBeNull();
    expect((await getDocFromServer(doc(dbA,`registrations/${regId}/payments/synthetic-original`))).data()?.amountCents).toBe(7500);
    const report='5'.repeat(32);await saveOperationalReport(org,{title:'Fotografia fictícia',from:'2026-10-01',to:'2026-10-31',caravanId:''},report);
    const operator='synthetic-plan-operator';await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),`platformOwners/${operator}`),{status:'active'}));
    as(env.authenticatedContext(operator).firestore(),operator);
    await assignTenantPlan({organizationId:org,planId:'essencial',status:'active',setupWaived:true,reason:'Downgrade fictício sem apagar histórico'},'6'.repeat(32));
    as(dbA,uidA);expect((await getDocFromServer(doc(dbA,`organizations/${org}/reports/${report}`))).exists()).toBe(true);
    await expect(saveOperationalReport(org,{title:'Bloqueado após downgrade',from:'',to:'',caravanId:''},'7'.repeat(32))).rejects.toThrow();
    const newReg={id:reservation,organizationId:org,caravanId:'synthetic-trip-a'} as Registration;await cancelRegistration(newReg,'8'.repeat(32));
    expect((await getDocFromServer(doc(dbA,'caravans/synthetic-trip-a'))).data()?.reservedSeats).toBe(1);
    await env.withSecurityRulesDisabled(async ctx=>{
      const current=await readCurrent(ctx.firestore());expect(bootstrapRollbackDecision(plan,current).deleteAllowed).toBe(false);
      expect((await rollbackBootstrapDemo(ctx.firestore(),plan,()=>readCurrent(ctx.firestore()))).removed).toBe(0);
      await updateDoc(doc(ctx.firestore(),`memberships/${uidA}/organizations/${org}`),{status:'revoked'});
    });
    await assertFails(getDocFromServer(doc(dbA,`registrations/${regId}/proofs/current`)));
    mkdirSync('docs/operations/goal-xi-italo',{recursive:true});writeFileSync('docs/operations/goal-xi-italo/sdk-rehearsal.json',JSON.stringify({checkedAt:new Date().toISOString(),strategy:'A_IN_PLACE_ADDITIVE',target:'demo-caravana77-test',
      actualAuthEmulatorLogin:true,uidChanged:false,authRecreatedByBootstrap:false,atomicConcurrency:true,replayCreates:0,legacyAliasPreserved:true,legacyMoneyPreserved:true,
      reservationReplay:true,checkinAndReversal:true,financialCompensation:true,proReportAndDowngradeHistory:true,revocationWithoutLegacyFallback:true,
      rollbackAfterWrites:'STOP_PRESERVE_FORWARD_DATA',realDataRead:false,stagingWrites:0,productionWrites:0,realBackup:false,realMigrationReady:false},null,2)+'\n');
  });
});
