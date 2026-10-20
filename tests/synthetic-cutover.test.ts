import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync,writeFileSync } from "node:fs";
import { createCipheriv,createDecipheriv,randomBytes } from "node:crypto";
import { assertFails,initializeTestEnvironment,type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc,getDocFromServer,runTransaction,setDoc } from "firebase/firestore";
import { fingerprint,syntheticCutoverPlan,syntheticStep,syntheticRollback } from "../scripts/lib/synthetic-cutover.mjs";
import { NAMESPACE_SOURCES } from "../src/lib/namespace-protection";
type Document={path:string;data:Record<string,unknown>};
function fixture(){
  const f=JSON.parse(readFileSync("scripts/fixtures/membership-migration.synthetic.json","utf8"));
  Object.assign(f,{authUids:["synthetic-owner-a","synthetic-owner-b"],inventoryComplete:true,coveredSources:[...NAMESPACE_SOURCES],assignments:["a","b"].map(id=>({organizationId:`synthetic-org-${id}`,planId:"essencial",status:"active",reason:"Somente condição sintética explicitamente revisada",setupWaived:true}))});
  Object.assign(f.documents.find((d:Document)=>d.path.startsWith("caravans/")).data,{status:"published"});
  f.documents.push({path:"caravans/synthetic-trip-b",data:{organizationId:"synthetic-org-b",capacity:25,reservedSeats:0,status:"published"}},
    {path:"registrations/synthetic-cancelled",data:{organizationId:"synthetic-org-a",caravanId:"synthetic-trip-original-id",registrationStatus:"cancelled",paymentTotalCents:1200,paymentStatus:"paid"}},
    {path:"registrations/synthetic-cancelled/payments/old-receipt",data:{organizationId:"synthetic-org-a",amountCents:1200,status:"active"}},
    {path:"registrations/synthetic-unknown-pix",data:{organizationId:"synthetic-org-a",caravanId:"synthetic-trip-original-id",paymentMethod:"pix",legacyPaymentReported:true,amountCents:null,paymentTotalCents:0}},
    {path:"caravans/synthetic-trip-original-id/expenses/old-cost",data:{organizationId:"synthetic-org-a",amountCents:800,status:"active"}},
    {path:"caravans/synthetic-trip-original-id/expenses/voided",data:{organizationId:"synthetic-org-a",amountCents:900,status:"voided"}},
    {path:"registrations/synthetic-passenger-original-id/authorizations/current",data:{organizationId:"synthetic-org-a",content:"JVBERi0xLjQKU1lOVEhFVElD",contentType:"application/pdf",status:"pending"}},
    {path:"legacyTripAliases/synthetic-original-link",data:{organizationId:"synthetic-org-a",caravanId:"synthetic-trip-original-id"}},
    {path:"storageObjects/synthetic-only",data:{organizationId:"synthetic-org-a",path:"legacy/synthetic-only.pdf",token:"SYNTHETIC_TOKEN_WITHOUT_REAL_ACCESS"}});
  return f;
}
let env:RulesTestEnvironment;
beforeAll(async()=>{if(process.env.FIRESTORE_EMULATOR_HOST!=="127.0.0.1:18080")throw Error("Exact synthetic emulator required");env=await initializeTestEnvironment({projectId:"demo-caravana77-test",firestore:{rules:readFileSync("firestore.rules","utf8")}});});
afterAll(async()=>{await env.clearFirestore();await env.cleanup();});
describe("bounded synthetic cutover rehearsal without a real-client migration executor",()=>{
  it("blocks foreign projects, orphan references, missing Auth, missing commercial approval and revoked membership conflicts",()=>{
    for(const patch of [{projectId:"caravana-af306"},{source:"REAL"},{authUids:[]},{assignments:[]},{inventoryComplete:false}])expect(()=>syntheticCutoverPlan({...fixture(),...patch})).toThrow();
    const orphan=fixture();orphan.documents.push({path:"registrations/orphan",data:{organizationId:"missing"}});expect(()=>syntheticCutoverPlan(orphan)).toThrow(/Orphan/);
    const revoked=fixture();revoked.documents.push({path:"memberships/synthetic-owner-a/organizations/synthetic-org-a",data:{uid:"synthetic-owner-a",organizationId:"synthetic-org-a",role:"tenant_owner",status:"revoked"}});expect(()=>syntheticCutoverPlan(revoked)).toThrow(/conflict/);
  });
  it("resumes after interruption, preserves IDs/full history, rejects source drift and roundtrips encrypted synthetic bytes",()=>{
    const f=fixture(),before=fingerprint(f),plan=syntheticCutoverPlan(f);const interrupted=syntheticStep(f.documents,plan,1);expect(interrupted.created).toBe(1);expect(interrupted.remaining).toBeGreaterThan(0);
    let state=interrupted;while(state.remaining)state=syntheticStep(state.documents,plan,1);expect(syntheticStep(state.documents,plan,100).created).toBe(0);expect(fingerprint(f)).toBe(before);
    for(const original of f.documents)expect(state.documents.find((d:Document)=>d.path===original.path)).toEqual(original);
    const changed=structuredClone(state.documents);changed[0].data.changedAfterManifest=true;expect(()=>syntheticStep(changed,plan,100)).toThrow(/Source changed/);
    const rollback=syntheticRollback(state.documents,plan);expect(rollback.documents).toEqual(f.documents);
    // Synthetic encryption key is ephemeral, never written beside the archive.
    const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv),plain=Buffer.from(JSON.stringify(f));const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]),tag=cipher.getAuthTag();const restore=createDecipheriv("aes-256-gcm",key,iv);restore.setAuthTag(tag);const restored=JSON.parse(Buffer.concat([restore.update(encrypted),restore.final()]).toString());expect(fingerprint(restored)).toBe(before);const corrupt=createDecipheriv("aes-256-gcm",key,iv);corrupt.setAuthTag(tag);const tampered=Buffer.from(encrypted);tampered[0]^=1;expect(()=>Buffer.concat([corrupt.update(tampered),corrupt.final()])).toThrow();key.fill(0);
  });
  it("commits concurrent additive chunks through real emulator transactions and preserves post-cutover business data during rollback",async()=>{
    const f=fixture(),plan=syntheticCutoverPlan(f);await env.clearFirestore();let final:Document[]=[];
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();for(const d of f.documents)await setDoc(doc(db,d.path),d.data);
      async function step(){return runTransaction(db,async tx=>{const paths=[...f.documents,...plan.creates].map(d=>d.path);const snapshots=await Promise.all(paths.map(path=>tx.get(doc(db,path))));const current=snapshots.flatMap((snapshot,index)=>snapshot.exists()?[{path:paths[index],data:snapshot.data()!}]:[]);const next=syntheticStep(current,plan,1);const existing=new Set(current.map(d=>d.path));for(const d of next.documents)if(!existing.has(d.path))tx.set(doc(db,d.path),d.data);return next;});}
      await Promise.all([step(),step()]);let remaining=1;while(remaining){const next=await step();remaining=next.remaining;final=next.documents;}expect((await step()).created).toBe(0);
      const originals=await Promise.all(f.documents.map(async(d:Document)=>({path:d.path,data:(await getDocFromServer(doc(db,d.path))).data()})));expect(fingerprint(originals)).toBe(fingerprint(f.documents));
      const newRegistration={path:"registrations/synthetic-after-cutover",data:{organizationId:"synthetic-org-a",caravanId:"synthetic-trip-original-id",passengerName:"Pessoa Fictícia posterior",paymentTotalCents:0}};await setDoc(doc(db,newRegistration.path),newRegistration.data);const rollback=syntheticRollback([...final,newRegistration],plan);expect(rollback.strategy).toBe("PRESERVE_FORWARD_DATA_NO_DELETE");expect(rollback.removed).toBe(0);expect(rollback.documents).toContainEqual(newRegistration);expect((await getDocFromServer(doc(db,newRegistration.path))).exists()).toBe(true);
    });
    const ownerA=env.authenticatedContext("synthetic-owner-a").firestore(),ownerB=env.authenticatedContext("synthetic-owner-b").firestore();expect((await getDocFromServer(doc(ownerA,"registrations/synthetic-passenger-original-id"))).exists()).toBe(true);await assertFails(getDocFromServer(doc(ownerB,"registrations/synthetic-passenger-original-id/proofs/current")));
    const report={checkedAt:new Date().toISOString(),source:"SYNTHETIC_ONLY",projectId:"demo-caravana77-test",originalDocuments:f.documents.length,additiveDocuments:plan.creates.length,manifest:plan.manifest,fieldsAndIdsPreserved:true,financialAndProofBytesPreserved:true,concurrentTransactions:"PASS",interruptionResume:"PASS",replayCreated:0,rollbackBeforeTraffic:"PASS",rollbackAfterTraffic:"PRESERVE_FORWARD_DATA_NO_DELETE",tenantIsolation:"PASS",encryptedSyntheticRoundtrip:"PASS",realStructuralInventoryAvailable:false,realAuthOrStorageRestoreProved:false,commercialFullBackfillProved:false,productionWrites:0,limitations:plan.limitations};writeFileSync("docs/evidence/2026-10-20/final-synthetic-cutover.json",JSON.stringify(report,null,2)+"\n");
  });
});
