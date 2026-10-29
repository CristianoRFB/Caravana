import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,type Firestore} from 'firebase/firestore';
import {buildPlatformOperationalRules} from '../scripts/recovery/platform-operational-rules.mjs';
import {onboardTenant,changeTenantStatus} from '../src/lib/platform';
import {seedSyntheticNamespaceBootstrap} from './fixtures/namespace-bootstrap';
const runtime=vi.hoisted(()=>({db:null as Firestore|null,auth:{currentUser:{uid:'global-owner'}},firebaseConfigured:true}));
vi.mock('../src/lib/firebase',()=>runtime);
let env:RulesTestEnvironment;
beforeAll(async()=>{const rules=buildPlatformOperationalRules(readFileSync('firestore.italo-operational.rules'),readFileSync('firestore.rules'));expect(rules).toBe(readFileSync('firestore.platform-operational.rules','utf8'));env=await initializeTestEnvironment({projectId:'demo-caravana77-test',firestore:{rules}});});
afterAll(async()=>env?.cleanup());
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore();await seedSyntheticNamespaceBootstrap(d,['caravana-77','italo']);
  for(const [p,v]of Object.entries({
    'platformOwners/global-owner':{status:'active'},
    'organizations/caravana-77':{name:'Original fictício',status:'active'},
    'organizations/italo':{name:'Tenant fictício',status:'active',importPending:false},
    'admins/global-owner':{organizationId:'caravana-77'},
    'memberships/global-owner/organizations/italo':{uid:'global-owner',organizationId:'italo',role:'tenant_owner',status:'active'},
    'caravans/source-trip':{id:'source-trip',organizationId:'caravana-77',name:'Fictício',status:'published',capacity:25,reservedSeats:0},
    'registrations/private-person':{organizationId:'italo',caravanId:'target-trip',passengerName:'Pessoa fictícia'},
    'organizations/italo/tenantCutovers/operational-v1':{version:'italo-operational-cutover-v1',copyPlanHash:'5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10',sourceOrganizationId:'caravana-77',targetOrganizationId:'italo',sourceCaravanId:'source-trip',targetCaravanId:'target-trip',capacityCeiling:25,operationalIntentConfirmed:true,everActivated:true,phase:'target_active',writerOrganizationId:'italo',generation:5}
  }))await setDoc(doc(d,p),v);
});runtime.db=env.authenticatedContext('global-owner').firestore();});
describe('platform management composed with activated Italo',()=>{
  it('lists all organizations only for the explicit active global owner',async()=>{
    expect((await getDocs(collection(runtime.db!,'organizations'))).size).toBe(2);
    await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),'organizations')));
    await assertFails(getDocs(collection(env.authenticatedContext('normal-owner').firestore(),'organizations')));
  });
  it('never lets a client create or edit platform owners, including its own role',async()=>{
    await assertFails(setDoc(doc(env.authenticatedContext('normal-owner').firestore(),'platformOwners/normal-owner'),{status:'active'}));
    await assertFails(updateDoc(doc(runtime.db!,'platformOwners/global-owner'),{status:'revoked'}));
    expect((await getDoc(doc(env.authenticatedContext('normal-owner').firestore(),'platformOwners/normal-owner'))).exists()).toBe(false);
  });
  it('revocation denies global organization and audit enumeration',async()=>{
    await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'platformOwners/global-owner'),{status:'revoked'}));
    await assertFails(getDocs(collection(runtime.db!,'organizations')));
    await assertFails(getDocs(collection(runtime.db!,'platformAudit')));
  });
  it('changes status with the existing atomic immutable audit and preserves cutover',async()=>{
    await changeTenantStatus('italo','suspended','1'.repeat(32));
    expect((await getDoc(doc(runtime.db!,'organizations/italo'))).data()?.status).toBe('suspended');
    expect((await getDoc(doc(runtime.db!,'platformAudit','1'.repeat(32)))).data()?.action).toBe('tenant_status_changed');
    await assertFails(updateDoc(doc(runtime.db!,'organizations/italo'),{importPending:true}));
    await env.withSecurityRulesDisabled(async c=>expect((await getDoc(doc(c.firestore(),'organizations/italo/tenantCutovers/operational-v1'))).data()?.generation).toBe(5));
  });
  it('does not reopen original writes even for a global owner with legacy and tenant roles',async()=>{
    await assertFails(updateDoc(doc(runtime.db!,'caravans/source-trip'),{name:'Bypass fictício'}));
    await assertFails(updateDoc(doc(runtime.db!,'organizations/italo/tenantCutovers/operational-v1'),{phase:'source_active',writerOrganizationId:'caravana-77'}));
    await assertFails(setDoc(doc(runtime.db!,'caravans/new-unlicensed-trip'),{organizationId:'italo',status:'published',capacity:50,reservedSeats:0}));
  });
  it('preserves complete audited onboarding for an actually new namespace',async()=>{
    const id=await onboardTenant({name:'Organização fictícia nova',slug:'synthetic-platform-new',ownerUid:'synthetic-new-owner',ownerUidConfirmed:true,planId:'essencial',setupWaived:false},'2'.repeat(32));
    expect(id).toBe('synthetic-platform-new');
    expect((await getDoc(doc(runtime.db!,'organizations',id))).data()?.ownerUid).toBe('synthetic-new-owner');
    expect((await getDoc(doc(runtime.db!,'subscriptions',id))).data()?.planId).toBe('essencial');
  });
});
