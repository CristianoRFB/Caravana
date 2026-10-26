import { NAMESPACE_SOURCES } from '../../src/lib/namespace-protection.ts';
import { bootstrapHash } from '../recovery/in-place-bootstrap.mjs';
export function inPlaceFixture(){
  const timestamp='2026-10-26T12:00:00.000Z';
  const documents=[
    {path:'organizations/synthetic-org-a',data:{name:'Organização fictícia A'}},
    {path:'organizations/synthetic-org-b',data:{name:'Organização fictícia B'}},
    {path:'admins/synthetic-owner-a',data:{organizationId:'synthetic-org-a',role:'admin'}},
    {path:'admins/synthetic-owner-b',data:{organizationId:'synthetic-org-b',role:'admin'}},
    {path:'caravans/synthetic-trip-a',data:{organizationId:'synthetic-org-a',name:'Viagem fictícia A',date:'2026-10-30',slug:'synthetic-original-link',capacity:25,reservedSeats:1,priceCents:8500,boardingPoints:[{id:'synthetic-stop',name:'Embarque fictício',address:'',time:'06:00'}]}},
    {path:'caravans/synthetic-trip-b',data:{organizationId:'synthetic-org-b',slug:'synthetic-other-trip',capacity:25,reservedSeats:0,status:'published'}},
    {path:'registrations/'+ 'a'.repeat(64),data:{organizationId:'synthetic-org-a',caravanId:'synthetic-trip-a',passengerName:'Pessoa Fictícia',registrationStatus:'confirmed',paymentStatus:'approved',paymentTotalCents:7500}},
    {path:'registrations/'+ 'a'.repeat(64)+'/payments/synthetic-original',data:{organizationId:'synthetic-org-a',amountCents:7500,status:'active'}},
    {path:'registrations/'+ 'a'.repeat(64)+'/proofs/current',data:{organizationId:'synthetic-org-a',content:'JVBERi0xLjQKU1lOVEhFVElD',contentType:'application/pdf'}},
    {path:'registrations/synthetic-unknown',data:{organizationId:'synthetic-org-a',caravanId:'synthetic-trip-a',paymentTotalCents:null}},
    {path:'legacyTripAliases/synthetic-original-link',data:{organizationId:'synthetic-org-a',caravanId:'synthetic-trip-a'}}
  ];
  const snapshot={projectId:'demo-caravana77-test',timestamp,inventoryComplete:true,coveredSources:[...NAMESPACE_SOURCES],
    authUids:['synthetic-owner-a','synthetic-owner-b'],documents};
  const reviews=[{organizationId:'synthetic-org-a',actorUid:'synthetic-owner-a',contractReviewed:true,
    assignment:{organizationId:'synthetic-org-a',planId:'pro',status:'active',setupWaived:true,reason:'Condição fictícia explicitamente revisada para ensaio in-place'},
    branding:{organizationId:'synthetic-org-a',slug:'synthetic-caravana-a',publicName:'Marca fictícia A',description:'',primaryColor:'#1d4ed8',logo:'',website:'',contactEmail:'',whatsapp:'',operationalMessage:'Demonstração fictícia; nenhum processamento bancário'},
    legacyVisibility:{'caravans/synthetic-trip-a':{status:'published',previousVisibilityReviewed:true,evidenceHash:bootstrapHash('SYNTHETIC_PUBLIC_VISIBILITY_REVIEW')}}}];
  return {snapshot,reviews};
}
