import { createHash } from 'node:crypto';
import { ROOT, SOURCE } from '../recovery/safety.mjs';
import { crc32c } from '../recovery/archive.mjs';
export function syntheticTree() {
  const bytes=Buffer.from('%PDF-1.4\nSYNTHETIC_FIXTURE_ONLY_ação\x00\xff');
  const f=value=>typeof value==='number'?{integerValue:String(value)}:value===null?{nullValue:null}:{stringValue:value};
  const d=(p,data)=>({name:ROOT+'/'+p,createTime:'2026-01-01T00:00:00Z',updateTime:'2026-01-01T00:00:00Z',fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,f(v)]))});
  return {readTime:new Date(Date.now()-5000).toISOString(),metadata:{project:{projectId:SOURCE,projectNumber:'77'},billing:{billingEnabled:false},database:{freeTier:true}},
    config:{auth:{},indexes:[],releases:[]},buckets:[{name:'synthetic-fixture-bucket',projectNumber:'77'}],
    users:[{localId:'synthetic-owner',email:'synthetic@caravana77.invalid',customAttributes:'{"role":"owner"}',passwordHash:'SYNTHETIC_NOT_REAL_HASH'}],
    documents:[d('organizations/synthetic-org',{}),d('admins/synthetic-owner',{organizationId:'synthetic-org',role:'owner'}),
      d('caravans/synthetic-trip',{organizationId:'synthetic-org',reservedSeats:3}),
      d('registrations/synthetic-one',{organizationId:'synthetic-org',caravanId:'synthetic-trip',paymentTotalCents:7500,registrationStatus:'cancelled'}),
      d('registrations/synthetic-one/payments/initial',{organizationId:'synthetic-org',amountCents:7500,status:'active'}),
      d('registrations/synthetic-one/payments/voided',{organizationId:'synthetic-org',amountCents:1234,status:'voided'}),
      d('registrations/synthetic-two',{organizationId:'synthetic-org',paymentTotalCents:null,amountCents:99900}),
      d('registrations/synthetic-three',{organizationId:'synthetic-org',paymentTotalCents:null}),
      d('registrations/synthetic-one/proofs/ação',{url:'gs://synthetic-fixture-bucket/synthetic.pdf'}),
      d('orphanContainers/synthetic-missing/history/synthetic-child',{organizationId:'synthetic-org'})],
    missing:[ROOT+'/orphanContainers/synthetic-missing'],
    objects:[{bucket:'synthetic-fixture-bucket',name:'synthetic.pdf',generation:'1',metageneration:'1',size:String(bytes.length),contentType:'application/pdf',md5Hash:createHash('md5').update(bytes).digest('base64'),crc32c:crc32c([bytes])}],
    objectBytes:[bytes]};
}
export function fakeGoogle({ mutate, fail, loop=false }={}) {
  const tree=syntheticTree(),calls=[];let authPasses=0;
  const page=(items,token,key)=>{const n=Number(token||0);return {[key]:items.slice(n,n+1),...(n+1<items.length?{nextPageToken:String(n+1)}:{})};};
  const fetcher=async (url,options)=>{
    const u=new URL(url);calls.push({host:u.host,path:u.pathname,method:options.method,query:Object.fromEntries(u.searchParams),body:options.body?JSON.parse(options.body):undefined});
    if(fail&&fail(u))return new Response('SYNTHETIC_ERROR',{status:403});
    const json=data=>new Response(JSON.stringify(data),{status:200,headers:{date:new Date().toUTCString(),'content-type':'application/json'}});
    if(u.host==='firebase.googleapis.com')return json({projectId:SOURCE,projectNumber:'77',state:'ACTIVE'});
    if(u.host==='cloudbilling.googleapis.com')return json({billingEnabled:false});
    if(u.host==='identitytoolkit.googleapis.com'){
      if(u.pathname.endsWith('/config'))return json({});
      authPasses++;if(mutate&&authPasses>1)mutate(tree);
      return json(page(tree.users,u.searchParams.get('nextPageToken'),'users'));
    }
    if(u.host==='firebaserules.googleapis.com')return json(u.pathname.endsWith('/releases')?page([
      {name:`projects/${SOURCE}/releases/cloud.firestore`,rulesetName:`projects/${SOURCE}/rulesets/synthetic`},
      {name:`projects/${SOURCE}/releases/firebase.storage/synthetic-fixture-bucket`,rulesetName:`projects/${SOURCE}/rulesets/synthetic-storage`}
    ],u.searchParams.get('pageToken'),'releases'):{source:{files:[{name:'synthetic.rules',content:'SYNTHETIC_DENY_ALL'}]}});
    if(u.host==='storage.googleapis.com'){
      if(u.searchParams.get('alt')==='media')return new Response(tree.objectBytes[0]);
      if(u.pathname.endsWith('/b'))return json(page(tree.buckets,u.searchParams.get('pageToken'),'items'));
      return json(page(tree.objects,u.searchParams.get('pageToken'),'items'));
    }
    const resource=decodeURIComponent(u.pathname.slice(4));
    if(resource.endsWith('/databases/(default)'))return json({freeTier:true,type:'FIRESTORE_NATIVE',databaseEdition:'STANDARD'});
    if(resource.endsWith('/indexes'))return json({indexes:[]});
    if(resource.endsWith(':listCollectionIds')){
      const parent=resource.slice(0,-':listCollectionIds'.length),body=JSON.parse(options.body);
      const collections=[...new Set([...tree.documents.map(d=>d.name),...tree.missing].filter(n=>n.startsWith(parent+'/')).map(n=>n.slice(parent.length+1).split('/')[0]))];
      return json(loop?{collectionIds:[],nextPageToken:'repeat'}:page(collections,body.pageToken,'collectionIds'));
    }
    const docs=[...tree.documents,...tree.missing.map(name=>({name}))].filter(d=>d.name.startsWith(resource+'/')&&d.name.split('/').length===resource.split('/').length+1);
    return json(page(docs,u.searchParams.get('pageToken'),'documents'));
  };
  return {tree,calls,fetcher};
}
