import { ROOT } from '../recovery/safety.mjs';
import { planTenantCopy } from '../recovery/tenant-copy.mjs';
import { activationCopyDocuments } from '../recovery/tenant-activation.mjs';
export function activationFixture(ownerUids=['synthetic-activation-owner','synthetic-second-owner']) {
  const timestamp='2026-10-26T20:00:00.000Z';
  const encode=value=>value===null?{nullValue:null}:typeof value==='string'?{stringValue:value}:typeof value==='boolean'?{booleanValue:value}:typeof value==='number'?{integerValue:String(value)}:Array.isArray(value)?{arrayValue:{values:value.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
  const raw=(p,data)=>({name:`${ROOT}/${p}`,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)])),createTime:timestamp,updateTime:timestamp});
  const snapshot={readTime:timestamp,metadata:{project:{projectId:'caravana-af306'}},users:ownerUids.map(localId=>({localId})),documents:[
    raw('organizations/caravana-77',{name:'Marca histórica fictícia'}),
    ...ownerUids.map(uid=>raw(`admins/${uid}`,{organizationId:'caravana-77',role:'owner'})),
    raw('caravans/original-trip',{organizationId:'caravana-77',name:'Viagem fictícia',slug:'original-event',status:'published',capacity:60,reservedSeats:2,priceCents:7500}),
    raw('registrations/'+'a'.repeat(64),{organizationId:'caravana-77',caravanId:'original-trip',passengerName:'Pessoa Fictícia',phone:'11900000000',registrationStatus:'confirmed',paymentTotalCents:7500,amountCents:7500}),
    raw('registrations/'+'a'.repeat(64)+'/payments/initial',{organizationId:'caravana-77',caravanId:'original-trip',registrationId:'a'.repeat(64),amountCents:7500,status:'active'}),
    raw('registrations/'+'a'.repeat(64)+'/proofs/current',{organizationId:'caravana-77',content:'JVBERi0xLjQKU1lOVEhFVElD'}),
    raw('registrations/'+'b'.repeat(64),{organizationId:'caravana-77',caravanId:'original-trip',passengerName:'Pessoa Fictícia Incerta',registrationStatus:'confirmed',paymentTotalCents:null,amountCents:7500}),
  ]};
  const copyPlan=planTenantCopy(snapshot,{sourceOrganizationId:'caravana-77',targetOrganizationId:'italo',targetName:'Ítalo fictício'});
  const current=structuredClone([...snapshot.documents,...activationCopyDocuments(copyPlan).map(d=>({...d,createTime:timestamp,updateTime:timestamp}))]);
  const review={copyPlanHash:copyPlan.planHash,privateHistoryOnly:true,branding:{organizationId:'italo',slug:'italo',publicName:'Ítalo fictício',description:'',primaryColor:'#1d4ed8',logo:'',website:'',contactEmail:'',whatsapp:'',operationalMessage:''}};
  return {snapshot,copyPlan,current,review,raw};
}
