'use strict';
// RPC boundary tests only. No backend, browser or user's account is modified.
const test=require('node:test'),assert=require('node:assert/strict');
const Portal=require('../dist/portal-client.js');
const uuid=n=>'39000000-0000-4000-8000-'+String(n).padStart(12,'0');
const org=uuid(10),me=uuid(1),other=uuid(2),employee=uuid(3),jobId=uuid(20),teamId=uuid(30);
const base={...require('./mir-account-config-helper.cjs')({test:true}),environment:'test',fieldExperienceEnabled:true,accountEnabled:true};
const createPayload={name:'Repère chantier QA',address:'10 rue fictive QA',city:'Lévis',note:'À compléter par le bureau'};
const completePayload={number:'QA-TEMP-42',name:'Chantier QA complété',address:'10 rue fictive QA',city:'Lévis',phone:'',clientName:'Client fictif QA',expectedRevision:1};
const makeJob=(overrides={})=>({id:jobId,name:createPayload.name,address:createPayload.address,city:createPayload.city,phone:'',clientName:'',number:'',closed:false,temporary:true,detailsStatus:'pending_details',revision:1,assignedMemberIds:[me],teamId:null,teamAssigned:false,...overrides});
const receipt=job=>({ok:true,jobId:job.id,job:structuredClone(job)});
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(role='chef_equipe',config=base){
 let actor=me,currentRole=role,sequence=100,readFailures=0,storageFailure='',handler=null,client;
 const calls=[],values=new Map(),jobs=new Map(),clients=new Set();
 const storage={
  getItem:key=>values.get(key)??null,
  setItem(key,value){if(storageFailure==='throw')throw Error('QA storage unavailable');if(storageFailure!=='discard')values.set(key,value);},
  removeItem:key=>values.delete(key)
 };
 const key=(user=actor)=>`mir_temporary_jobs_intents_v1_${config.projectRef}_${org}_${user}`;
 const sdk={
  auth:{getUser:async()=>({data:{user:{id:actor,email:'qa@example.invalid'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  async rpc(name,args){
   const who=actor;calls.push({name,args:structuredClone(args||{}),actor:who});
   if(name==='mir_account_snapshot')return{data:{userId:who,role:currentRole==='admin'?'admin':'employee',organizationId:org}};
   if(name==='mir_portal_snapshot'){
    if(readFailures>0){readFailures--;return{error:{code:'NETWORK_UNCERTAIN',message:'QA lost refresh',definitive:false}};}
    return{data:{mode:'connected',demo:false,actorId:who,members:[{id:who,name:'Identité QA',role:currentRole==='admin'?'admin':'employee',active:true}],jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}}};
   }
   if(name==='mir_employee_operations_snapshot')return{data:{role:currentRole}};
   if(name==='mir_field_profile')return{data:{id:who,name:'Identité QA',role:currentRole}};
   if(name==='mir_messaging_snapshot')return{data:{contacts:[],conversations:[],messages:[]}};
   if(name==='mir_punch_snapshot')return{data:{enabled:true,settings:{offlineEnabled:true},activeShift:null,week:[]}};
   if(['mir_lead_today_snapshot','mir_lead_job_snapshot','mir_logistics_snapshot','mir_management_snapshot','mir_boutique_price_management','mir_boss_operations_snapshot'].includes(name))return{data:{jobs:[]}};
   if(name==='mir_temporary_jobs_snapshot')return{data:{canCreate:currentRole==='chef_equipe',canComplete:['assistant','boss'].includes(currentRole),teamId:null,teamAssigned:false,teams:[],jobs:[...jobs.values()].filter(job=>['assistant','boss','admin'].includes(currentRole)||job.assignedMemberIds.includes(who)).map(job=>structuredClone(job))}};
   if(['mir_lead_temporary_job','mir_temporary_job_complete'].includes(name)){
    if(handler)return handler(name,args,who);
    const created=name==='mir_lead_temporary_job';
    const job=created?makeJob({...args.payload,assignedMemberIds:[who]}):makeJob({...jobs.get(args.job),...args.payload,id:args.job,temporary:false,detailsStatus:'complete',revision:args.payload.expectedRevision+1});
    delete job.expectedRevision;jobs.set(job.id,job);return{data:receipt(job)};
   }
   return{error:{code:'PGRST202',message:'RPC absent from this fixture: '+name}};
  }
 };
 const build=()=>{const value=Portal.create({config,origin:config.siteOrigin,sdk:{createClient:()=>sdk},uuid:()=>uuid(sequence++),operationStorage:storage,temporaryJobStorage:storage});clients.add(value);return value;};
 client=build();
 return{
  get client(){return client;},calls,values,storage,key,
  writes:()=>calls.filter(call=>['mir_lead_temporary_job','mir_temporary_job_complete'].includes(call.name)),
  pending:(user=actor)=>JSON.parse(values.get(key(user))||'[]'),
  seed:job=>jobs.set(job.id,structuredClone(job)),
  handle:fn=>{handler=fn;},actor:(id,newRole=currentRole)=>{actor=id;currentRole=newRole;},
  failNextRefresh:()=>{readFailures++;},failStorage:value=>{storageFailure=value;},
  async reload(){client.dispose();client=build();return client.start();},
  close(){for(const value of clients)value.dispose();}
 };
}

test('chef alone: durable intention precedes the RPC, and a double click creates one request',async()=>{
 const f=fixture();try{
  await f.client.start();assert.equal(f.client.getStatus().snapshot.temporaryJobs.teamId,null);
  let release;f.handle((_name,args)=>{assert.equal(f.pending().length,1);assert.equal(f.pending()[0].requestId,args.request_id,'No RPC before the request identity is durably readable');return new Promise(resolve=>{release=resolve;});});
  const first=f.client.createTemporaryJob(createPayload,uuid(70)),second=f.client.createTemporaryJob({...createPayload},uuid(71));await nextTurn();assert.equal(f.writes().length,1);
  const created=makeJob();f.seed(created);release({data:receipt(created)});
  const results=await Promise.all([first,second]);assert.deepEqual(results[0],results[1]);assert.equal(results[0].jobId,jobId);assert.equal(results[0].job.teamAssigned,false);assert.deepEqual(results[0].job.assignedMemberIds,[me]);assert.equal(f.pending().length,0);
  assert.equal(f.calls.some(call=>/punch.*action/.test(call.name)),false,'Creating a job never punches anyone in');
 }finally{f.close();}
});

for(const role of ['assistant','boss'])test(role+' completes the same job ID and preserves the assigned people',async()=>{
 const f=fixture(role);try{
  f.seed(makeJob({assignedMemberIds:[me,employee],teamId,teamAssigned:true}));await f.client.start();
  const result=await f.client.completeTemporaryJob(jobId,completePayload,uuid(72));
  assert.equal(result.jobId,jobId);assert.equal(result.job.id,jobId);assert.equal(result.job.temporary,false);assert.equal(result.job.detailsStatus,'complete');assert.equal(result.job.revision,2);assert.deepEqual(result.job.assignedMemberIds,[me,employee]);
  const write=f.writes()[0];assert.equal(write.name,'mir_temporary_job_complete');assert.equal(write.args.org,org);assert.equal(write.args.job,jobId);assert.equal(write.args.payload.expectedRevision,1);assert.equal(f.pending().length,0);
  assert.equal(f.calls.some(call=>/punch.*action|mir_team_save|mir_boss_action/.test(call.name)),false,'Completing details does not change hours or the daily team assignment');
 }finally{f.close();}
});

for(const role of ['employe','warehouse','assistant','boss','admin'])test(role+' cannot create a temporary job',async()=>{
 const f=fixture(role);try{await f.client.start();await assert.rejects(()=>f.client.createTemporaryJob(createPayload),error=>error.code==='ACCESS_DENIED');assert.equal(f.writes().length,0);if(['admin','warehouse'].includes(role))assert.equal(f.calls.some(call=>call.name==='mir_temporary_jobs_snapshot'),false,'Technical admin and warehouse roles do not enter this operational feature');}finally{f.close();}
});
for(const role of ['employe','chef_equipe','warehouse','admin'])test(role+' cannot complete a temporary job',async()=>{
 const f=fixture(role);try{f.seed(makeJob());await f.client.start();await assert.rejects(()=>f.client.completeTemporaryJob(jobId,completePayload),error=>error.code==='ACCESS_DENIED');assert.equal(f.writes().length,0);}finally{f.close();}
});
for(const [label,config]of [['field feature disabled',{...base,fieldExperienceEnabled:false}],['production environment',{...base,environment:'production'}]])test(label+' cannot invoke temporary job mutations',async()=>{
 const f=fixture('chef_equipe',config);try{await f.client.start();await assert.rejects(()=>f.client.createTemporaryJob(createPayload),error=>error.code==='ACCESS_DENIED');assert.equal(f.writes().length,0);assert.equal(f.calls.some(call=>call.name==='mir_temporary_jobs_snapshot'),false);}finally{f.close();}
});

test('a lost response followed by reload reuses the original request ID and does not resubmit at startup',async()=>{
 const f=fixture();try{
  await f.client.start();const created=makeJob();let lost=true;
  f.handle((_name,args)=>{assert.equal(args.request_id,uuid(73));f.seed(created);if(lost){lost=false;return{error:{code:'NETWORK_UNCERTAIN',definitive:false}};}return{data:receipt(created)};});
  await assert.rejects(()=>f.client.createTemporaryJob(createPayload,uuid(73)),error=>error.needsRetry===true);assert.equal(f.pending()[0].requestId,uuid(73));
  await f.reload();assert.equal(f.writes().length,1,'Reload reads server state but never silently creates a job');
  const result=await f.client.createTemporaryJob({note:createPayload.note,city:createPayload.city,address:createPayload.address,name:'  '+createPayload.name+'  '},uuid(74));
  assert.equal(result.jobId,jobId);assert.deepEqual(f.writes().map(call=>call.args.request_id),[uuid(73),uuid(73)]);assert.deepEqual(f.writes()[0].args.payload,f.writes()[1].args.payload);assert.equal(f.pending().length,0);
 }finally{f.close();}
});

test('an incomplete receipt remains pending instead of being reported as a created job',async()=>{
 const f=fixture();try{
  await f.client.start();f.handle(()=>({data:{ok:true,jobId}}));
  await assert.rejects(()=>f.client.createTemporaryJob(createPayload,uuid(75)),error=>error.code==='RESPONSE_UNCERTAIN');assert.equal(f.pending()[0].requestId,uuid(75));
  await f.reload();const created=makeJob();f.seed(created);f.handle(()=>({data:receipt(created)}));await f.client.createTemporaryJob(createPayload,uuid(76));assert.deepEqual(f.writes().map(call=>call.args.request_id),[uuid(75),uuid(75)]);assert.equal(f.pending().length,0);
 }finally{f.close();}
});

test('completion never accepts a receipt for a different job',async()=>{
 const f=fixture('assistant');try{
  f.seed(makeJob());await f.client.start();f.handle(()=>({data:receipt(makeJob({id:uuid(21),temporary:false,detailsStatus:'complete',revision:2}))}));
  await assert.rejects(()=>f.client.completeTemporaryJob(jobId,completePayload,uuid(77)),error=>error.code==='RESPONSE_UNCERTAIN');assert.equal(f.pending()[0].requestId,uuid(77));
 }finally{f.close();}
});

test('a late receipt cannot clear or transfer the original actor intention after a session change',async()=>{
 const f=fixture();try{
  await f.client.start();let release;f.handle(()=>new Promise(resolve=>{release=resolve;}));const writing=f.client.createTemporaryJob(createPayload,uuid(78));await nextTurn();
  f.actor(other);await f.client.refresh();release({data:receipt(makeJob())});await assert.rejects(()=>writing,error=>error.code==='SESSION_CHANGED');
  assert.equal(f.pending(me)[0].requestId,uuid(78));assert.equal(f.pending(other).length,0);assert.equal(f.writes().length,1);assert.equal(f.client.getStatus().user.id,other);
 }finally{f.close();}
});

test('another actor after reload cannot adopt the first actor request identity',async()=>{
 const f=fixture();try{
  await f.client.start();f.handle(()=>({error:{code:'NETWORK_UNCERTAIN',definitive:false}}));await assert.rejects(()=>f.client.createTemporaryJob(createPayload,uuid(79)),error=>error.needsRetry===true);
  f.actor(other);await f.reload();const second=makeJob({id:uuid(21),assignedMemberIds:[other]});f.handle(()=>{f.seed(second);return{data:receipt(second)};});
  await f.client.createTemporaryJob(createPayload,uuid(80));assert.deepEqual(f.writes().map(call=>call.args.request_id),[uuid(79),uuid(80)]);assert.equal(f.pending(me)[0].requestId,uuid(79));assert.equal(f.pending(other).length,0);
 }finally{f.close();}
});

test('a verified receipt survives refresh failure; recovering the view does not repeat the mutation',async()=>{
 const f=fixture();try{
  await f.client.start();const created=makeJob();f.handle(()=>{f.seed(created);f.failNextRefresh();return{data:receipt(created)};});
  await assert.rejects(()=>f.client.createTemporaryJob(createPayload,uuid(81)));assert.equal(f.pending()[0].requestId,uuid(81));assert.equal(f.writes().length,1);
  await f.client.refresh();const result=await f.client.createTemporaryJob(createPayload,uuid(82));assert.equal(result.jobId,jobId);assert.equal(f.writes().length,1,'A confirmed write is not repeated to recover a read');assert.equal(f.pending().length,0);
 }finally{f.close();}
});

test('a confirmed write followed by reload still replays its durable ID after a failed refresh',async()=>{
 const f=fixture();try{
  await f.client.start();const created=makeJob();let first=true;f.handle((_name,args)=>{assert.equal(args.request_id,uuid(83));f.seed(created);if(first){first=false;f.failNextRefresh();}return{data:receipt(created)};});
  await assert.rejects(()=>f.client.createTemporaryJob(createPayload,uuid(83)));await f.reload();assert.equal(f.writes().length,1);
  await f.client.createTemporaryJob(createPayload,uuid(84));assert.deepEqual(f.writes().map(call=>call.args.request_id),[uuid(83),uuid(83)]);assert.equal(f.pending().length,0);
 }finally{f.close();}
});

for(const mode of ['throw','discard'])test('storage '+mode+' stops the mutation before any RPC can commit',async()=>{
 const f=fixture();try{await f.client.start();f.failStorage(mode);await assert.rejects(()=>f.client.createTemporaryJob(createPayload),error=>/STORAGE/.test(error.code));assert.equal(f.writes().length,0);}finally{f.close();}
});

test('confirmation of one intention retains a different pending intention for the same actor',async()=>{
 const f=fixture();try{
  await f.client.start();const releases=new Map();f.handle((_name,args)=>new Promise(resolve=>releases.set(args.request_id,resolve)));
  const first=f.client.createTemporaryJob(createPayload,uuid(85)),second=f.client.createTemporaryJob({...createPayload,name:'Autre repère QA'},uuid(86));await nextTurn();assert.equal(f.pending().length,2);
  const a=makeJob();f.seed(a);releases.get(uuid(85))({data:receipt(a)});await first;assert.deepEqual(f.pending().map(intent=>intent.requestId),[uuid(86)]);
  const b=makeJob({id:uuid(21),name:'Autre repère QA'});f.seed(b);releases.get(uuid(86))({data:receipt(b)});await second;assert.equal(f.pending().length,0);
 }finally{f.close();}
});

for(const create of [true,false])test((create?'creation':'completion')+': a changed form cannot reuse an uncertain request ID or erase its original intention',async()=>{
 const f=fixture(create?'chef_equipe':'assistant');try{
  if(!create)f.seed(makeJob());
  await f.client.start();
  const payload=create?createPayload:completePayload;
  const command=(body,id)=>create?f.client.createTemporaryJob(body,id):f.client.completeTemporaryJob(jobId,body,id);
  f.handle(()=>({error:{code:'NETWORK_UNCERTAIN',definitive:false}}));
  await assert.rejects(()=>command(payload,uuid(87)),error=>error.needsRetry===true);
  const original=structuredClone(f.pending());
  await f.reload();
  await assert.rejects(()=>command({...payload,name:'Repère modifié après coupure'},uuid(87)),error=>error.code==='REQUEST_CONFLICT');
  assert.equal(f.writes().length,1,'Reject changed content locally, before any server mutation or definitive server error');
  assert.deepEqual(f.pending(),original,'The original unresolved request remains recoverable after the form changed');
  const saved=makeJob(create?{}:{...completePayload,temporary:false,detailsStatus:'complete',revision:2});
  delete saved.expectedRevision;
  f.seed(saved);f.handle(()=>({data:receipt(saved)}));
  const result=await command({...payload},uuid(88));
  assert.equal(result.jobId,jobId);
  assert.deepEqual(f.writes().map(call=>call.args.request_id),[uuid(87),uuid(87)]);
  assert.deepEqual(f.writes()[0].args.payload,f.writes()[1].args.payload);
  assert.equal(f.pending().length,0);
 }finally{f.close();}
});
