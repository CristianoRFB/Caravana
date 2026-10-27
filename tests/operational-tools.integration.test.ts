import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, serverTimestamp, setDoc, updateDoc, writeBatch, Timestamp, type Firestore } from "firebase/firestore";
import type { PlanId } from "../src/lib/plan-catalog";
import { operationalSummary } from "../src/lib/operational-tools";
import { pendingWrites } from "../src/lib/pending-writes";
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: "platform" } } }));
vi.mock("../src/lib/firebase", () => runtime);
import { assignTenantPlan } from "../src/lib/commercial-data";
import { applyWorklistTemplate, decodedWorklist, saveOperationalReport, saveWorklist, toolOperationId } from "../src/lib/operational-tools-data";
let env: RulesTestEnvironment;
const filter = { title: "Fechamento de outubro", from: "2026-10-01", to: "2026-10-31", caravanId: "" };
const template = { title: "Preparação da equipe", kind: "template" as const, caravanId: null, items: [{label:"Conferir horário com equipe",done:false},{label:"Separar material da viagem",done:false}], archived:false };
function as(uid: string) { runtime.auth.currentUser.uid = uid; runtime.db = env.authenticatedContext(uid, { aud:"demo-caravana77-test",email:`${uid}@example.test` }).firestore(); return runtime.db; }
async function read(path: string) { return (await getDocFromServer(doc(runtime.db!, path))).data()!; }
beforeAll(async () => { if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") throw new Error("Local synthetic emulator required."); env = await initializeTestEnvironment({projectId:"demo-caravana77-test",firestore:{rules:readFileSync("firestore.rules","utf8")}}); });
afterEach(async () => { expect(pendingWrites()).toBe(0); await env.clearFirestore(); runtime.db=null; }); afterAll(async () => env.cleanup());
async function assign(planId: PlanId, status: "active" | "suspended" = "active") {
  as("platform"); await assignTenantPlan({organizationId:"a",planId,status,setupWaived:true,reason:"Condição sintética de teste"}); as("owner-a");
}
async function seed(planId: PlanId="premium") {
  await env.withSecurityRulesDisabled(async ctx => {
    const database=ctx.firestore(); await setDoc(doc(database,"platformOwners/platform"),{status:"active"});
    for(const org of ["a","b"]){
      await setDoc(doc(database,`organizations/${org}`),{name:"Organizadora sintética",status:"active"});
      await setDoc(doc(database,`tenantUsage/${org}`),{organizationId:org,version:"commercial-v1",publishedCaravans:1,activeMembers:1,activeOwners:1});
      await setDoc(doc(database,`memberships/owner-${org}/organizations/${org}`),{uid:`owner-${org}`,organizationId:org,role:"tenant_owner",status:"active"});
      await setDoc(doc(database,`caravans/trip-${org}`),{organizationId:org,name:"Viagem fictícia",date:"2026-10-20",capacity:60,status:"published",reservedSeats:1});
    }
    await setDoc(doc(database,"memberships/staff-a/organizations/a"),{uid:"staff-a",organizationId:"a",role:"staff",status:"active"});
    await setDoc(doc(database,"registrations/PRIVATE_SYNTHETIC_ID"),{organizationId:"a",caravanId:"trip-a",passengerName:"DADO_PRIVADO_NAO_EXPORTAR",cpf:"00000000000",registrationStatus:"confirmed",amountCents:8500,paymentTotalCents:2500});
    await setDoc(doc(database,"caravans/trip-a/expenses/cost"),{organizationId:"a",caravanId:"trip-a",amountCents:500,status:"active"});
  });
  await assign(planId);
}
async function forgeReport(database: Firestore, patch: Record<string,unknown>={}) {
  const id=toolOperationId(),time=serverTimestamp();const data={...filter,summary:operationalSummary("a",filter,[],[],[]),organizationId:"a",revision:1,createdAt:time,createdBy:runtime.auth.currentUser.uid,updatedAt:time,updatedBy:runtime.auth.currentUser.uid,lastToolOperationId:id,...patch};
  const batch=writeBatch(database);batch.set(doc(database,`organizations/a/reports/${id}`),data);batch.set(doc(database,`organizations/a/toolEvents/${id}`),{organizationId:"a",actorUid:runtime.auth.currentUser.uid,at:time,kind:"report",entityId:id,payloadHash:"f".repeat(64),before:null,after:data});return batch.commit();
}
describe("functional plan enforcement using actual SDK and candidate Rules", () => {
  it("projects the canonical capabilities without private price overrides and denies self-grants",async()=>{
    await seed("pro"); as("staff-a");const policy=await read("organizations/a/commercialFeatures/current");expect(policy.features).toContain("report_library");expect(policy.features).not.toContain("worklists");expect(policy.monthlyCents).toBeUndefined();
    await assertFails(updateDoc(doc(runtime.db!,"organizations/a/commercialFeatures/current"),{features:["worklists"]}));as("owner-b");await assertFails(getDocFromServer(doc(runtime.db!,"organizations/a/commercialFeatures/current")));
  });
  it("saves one Pro report under concurrent exact retries, redacts passengers and keeps audit immutable",async()=>{
    await seed("pro");const id=toolOperationId();expect(await Promise.all([saveOperationalReport("a",filter,id),saveOperationalReport("a",filter,id)])).toEqual([id,id]);
    const report=await read(`organizations/a/reports/${id}`);expect(report.summary.finance).toMatchObject({receivedCents:2500,expenseCents:500});expect(JSON.stringify(report)).not.toContain("DADO_PRIVADO_NAO_EXPORTAR");expect(JSON.stringify(report)).not.toContain("00000000000");
    expect((await getDocsFromServer(collection(runtime.db!,"organizations/a/reports"))).size).toBe(1);
    await expect(saveOperationalReport("a",{...filter,title:"Outro título"},id)).rejects.toThrow("outros dados");
    await assertFails(updateDoc(doc(runtime.db!,`organizations/a/reports/${id}`),{title:"Reescrita"}));await assertFails(deleteDoc(doc(runtime.db!,`organizations/a/toolEvents/${id}`)));
  });
  it("persists explicit unknown report totals with audit and rejects falsely complete null totals", async () => {
    await seed("pro");
    await env.withSecurityRulesDisabled(async ctx => updateDoc(doc(ctx.firestore(), "registrations/PRIVATE_SYNTHETIC_ID"), { paymentTotalCents: null }));
    const id = await saveOperationalReport("a", filter);
    const report = await read(`organizations/a/reports/${id}`);
    expect(report.summary.finance).toMatchObject({ unknownPaymentCount: 1, receivedCents: null, receivableCents: null, recordedBalanceCents: null });
    for (const patch of [{ unknownPaymentCount: 0 }, { unknownPaymentCount: -1 }, { receivedCents: 0 }]) {
      await assertFails(forgeReport(runtime.db!, { summary: { ...report.summary, finance: { ...report.summary.finance, ...patch } } }));
    }
  });
  it("blocks Essential service and a forged complete SDK report/audit, without hiding existing finance",async()=>{
    await seed("essencial");await expect(saveOperationalReport("a",filter)).rejects.toThrow("requer um plano");await assertFails(forgeReport(runtime.db!));
    expect((await read("registrations/PRIVATE_SYNTHETIC_ID")).paymentTotalCents).toBe(2500);await assign("pro");await saveOperationalReport("a",filter);
  });
  it("creates Premium templates, applies them to a trip, reverses tasks and preserves every revision",async()=>{
    await seed();const id=await saveWorklist("a",template);const original=decodedWorklist({...await read(`organizations/a/worklists/${id}`),id});
    as("staff-a");await assertFails(saveWorklist("a",template));const trip=applyWorklistTemplate(original,"trip-a");const tripId=await saveWorklist("a",trip);
    await saveWorklist("a",{...trip,items:trip.items.map((item,i)=>({...item,done:i===0}))},toolOperationId(),{id:tripId,revision:1});
    await saveWorklist("a",trip,toolOperationId(),{id:tripId,revision:2});expect((await read(`organizations/a/worklists/${tripId}`)).revision).toBe(3);
    expect(decodedWorklist(await read(`organizations/a/worklists/${id}`)).items[0].done).toBe(false);expect((await getDocsFromServer(collection(runtime.db!,"organizations/a/toolEvents"))).size).toBe(4);
  });
  it("serializes stale editors, keeps a committed retry idempotent and audits archive/reopen",async()=>{
    await seed();const value={...template,kind:"trip" as const,caravanId:"trip-a"};const id=await saveWorklist("a",value), op=toolOperationId();
    const edits=await Promise.allSettled([saveWorklist("a",{...value,archived:true},op,{id,revision:1}),saveWorklist("a",{...value,title:"Edição concorrente"},toolOperationId(),{id,revision:1})]);expect(edits.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    const state=await read(`organizations/a/worklists/${id}`);expect(state.revision).toBe(2);
    if(state.archived)expect(await saveWorklist("a",{...value,archived:true},op,{id,revision:1})).toBe(id);
    await saveWorklist("a",{...value,archived:false},toolOperationId(),{id,revision:2});
  });
  it("preserves reports/tasks after downgrade while refusing growth, suspension, cross-tenant and revoked access",async()=>{
    await seed();const report=await saveOperationalReport("a",filter),task=await saveWorklist("a",template);
    await assign("essencial");expect((await read(`organizations/a/reports/${report}`)).title).toBe(filter.title);expect((await read(`organizations/a/worklists/${task}`)).revision).toBe(1);
    await expect(saveWorklist("a",template)).rejects.toThrow("requer um plano");await assertFails(forgeReport(runtime.db!));await assign("pro","suspended");await expect(saveOperationalReport("a",filter)).rejects.toThrow("requer um plano");
    as("owner-b");await assertFails(getDocFromServer(doc(runtime.db!,`organizations/a/reports/${report}`)));as("platform");await assertFails(getDocsFromServer(collection(runtime.db!,"organizations/a/worklists")));
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),"memberships/owner-a/organizations/a"),{status:"revoked"}));as("owner-a");await assertFails(getDocFromServer(doc(runtime.db!,`organizations/a/reports/${report}`)));
  });
  it("rejects malformed snapshots, invented dates and forged financial totals through the direct SDK",async()=>{
    await seed("pro");for(const patch of [{from:"2026-02-30"},{createdBy:"owner-b"},{summary:{trips:1,capacity:60,boarded:0,pendingAuthorizations:0,finance:{}}},{title:"x"}])await assertFails(forgeReport(runtime.db!,patch));
    expect((await getDocsFromServer(collection(runtime.db!,"organizations/a/reports"))).size).toBe(0);
  });
  it("denies Pro worklists, foreign trips and unaudited direct task updates",async()=>{
    await seed("pro");await expect(saveWorklist("a",template)).rejects.toThrow("requer um plano");await assign("premium");
    await assertFails(saveWorklist("a",{...template,kind:"trip",caravanId:"trip-b"}));const id=await saveWorklist("a",template);
    await assertFails(updateDoc(doc(runtime.db!,`organizations/a/worklists/${id}`),{archived:true}));await assertFails(deleteDoc(doc(runtime.db!,`organizations/a/worklists/${id}`)));
  });
  it("accepts the maximum twenty-task payload with valid audit and reverses its full state",async()=>{
    await seed();const value={...template,items:Array.from({length:20},(_,i)=>({label:`Tarefa ${i} `+"a".repeat(100),done:false}))};
    const id=await saveWorklist("a",value);await saveWorklist("a",{...value,items:value.items.map(item=>({...item,done:true}))},toolOperationId(),{id,revision:1});
    expect(decodedWorklist(await read(`organizations/a/worklists/${id}`)).items.every(item=>item.done)).toBe(true);
  });
  it("supports the original legacy admin at maximum payload without weakening atomic audit",async()=>{
    await seed();await env.withSecurityRulesDisabled(async ctx=>{await deleteDoc(doc(ctx.firestore(),"memberships/owner-a/organizations/a"));await setDoc(doc(ctx.firestore(),"admins/owner-a"),{organizationId:"a",role:"admin"});});
    as("owner-a");await saveOperationalReport("a",filter);const value={...template,items:Array.from({length:20},(_,i)=>({label:`Tarefa ${i}`,done:false}))};await saveWorklist("a",value);
    const op=toolOperationId();await assertFails(setDoc(doc(runtime.db!,`organizations/a/toolEvents/${op}`),{organizationId:"a",actorUid:"owner-a",at:serverTimestamp(),kind:"report",entityId:op,payloadHash:"f".repeat(64),before:null,after:{lastToolOperationId:op,updatedAt:serverTimestamp()}}));
  });
  it("denies expired assisted access and suspended organizations at the Rules level",async()=>{
    await seed("pro");await env.withSecurityRulesDisabled(async ctx=>{
      await updateDoc(doc(ctx.firestore(),"subscriptions/a"),{status:"trial",trialEndsAt:Timestamp.fromMillis(1)});
      await updateDoc(doc(ctx.firestore(),"organizations/a/commercialFeatures/current"),{status:"trial",validUntil:Timestamp.fromMillis(1)});
    });await expect(saveOperationalReport("a",filter)).rejects.toThrow("requer um plano");await assertFails(forgeReport(runtime.db!));
    await assign("pro");await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),"organizations/a"),{status:"suspended"}));await assertFails(forgeReport(runtime.db!));
  });
  it("rejects invalid task encodings and immutable-field or audit tampering through complete direct SDK batches",async()=>{
    await seed();const id=await saveWorklist("a",template);const before=await read(`organizations/a/worklists/${id}`);
    for(const patch of [{tasksText:""},{tasksText:"x".repeat(121),doneMask:"0"},{doneMask:"2"},{doneMask:"0"},{doneMask:"0".repeat(21),tasksText:Array(21).fill("a").join("\n")},{createdBy:"owner-b"},{kind:"trip",caravanId:"trip-b"}]){
      const op=toolOperationId(),time=serverTimestamp(),after={...before,...patch,revision:2,updatedAt:time,updatedBy:"owner-a",lastToolOperationId:op};const batch=writeBatch(runtime.db!);
      batch.set(doc(runtime.db!,`organizations/a/worklists/${id}`),after);batch.set(doc(runtime.db!,`organizations/a/toolEvents/${op}`),{organizationId:"a",actorUid:"owner-a",at:time,kind:"worklist",entityId:id,payloadHash:"f".repeat(64),before,after});await assertFails(batch.commit());
    }expect((await read(`organizations/a/worklists/${id}`)).revision).toBe(1);
  });
});
