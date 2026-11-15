'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ACTORS,ORG,JOB,MARKER,configuration,checkState,run}=require('./verify-pr39-native-fixture.cjs');
const env={
 MIR_SANDBOX_ORG_ID:ORG,MIR_SANDBOX_PUBLISHABLE_KEY:'sb_publishable_QA_fixture_mock_not_a_real_key',
 MIR_SANDBOX_EMPLOYEE_EMAIL:'employee@example.invalid',MIR_SANDBOX_EMPLOYEE_PASSWORD:'QA-ONLY',
 MIR_SANDBOX_CHEF_EMAIL:'chef@example.invalid',MIR_SANDBOX_CHEF_PASSWORD:'QA-ONLY'
};
function active(actor,started=Date.now()-20*60000){
 return {activeShift:{id:actor.shift,device_id:MARKER,status:'active',ended_at:null,started_at:new Date(started).toISOString(),
   segment:{id:actor.segment,job_id:JOB,segment_type:'job',ended_at:null}}};
}
test('Refuse toute autre organisation et secrets manquants',()=>{
 assert.throws(()=>configuration({...env,MIR_SANDBOX_ORG_ID:'production-forbidden'}),/Organisation TEST/);
 assert.throws(()=>configuration({...env,MIR_SANDBOX_PUBLISHABLE_KEY:''}),/Clé publique/);
 assert.throws(()=>configuration({...env,MIR_SANDBOX_CHEF_PASSWORD:''}),/Compte QA absent/);
});
test('Exige strictement deux quarts isolés, bons segments, 15 minutes déjà courues',()=>{
 for(const actor of ACTORS){
  const now=Date.now(),data=active(actor,now-20*60000);
  assert.equal(checkState(data,actor,now).jobId,JOB);
  assert.throws(()=>checkState({activeShift:null},actor,now),/manquant/);
  assert.throws(()=>checkState(active(actor,now-3*60000),actor,now),/15 min/);
  assert.throws(()=>checkState({...data,activeShift:{...data.activeShift,device_id:'VRAI-APPAREIL'}},actor,now),/incohérent/);
  assert.throws(()=>checkState({...data,activeShift:{...data.activeShift,ended_at:new Date().toISOString()}},actor,now),/incohérent/);
  assert.throws(()=>checkState({...data,activeShift:{...data.activeShift,segment:{...data.activeShift.segment,job_id:'00000000-0000-0000-0000-000000000001'}}},actor,now),/incohérent/);
 }
});
test('RPC de lecture utilise le projet TEST fixe, jamais la production',async()=>{
 const calls=[];
 const fakeFetch=async(url,options)=>{
  calls.push({url,method:options.method,body:JSON.parse(options.body)});
  const auth=url.includes('/auth/v1/token'),email=auth?JSON.parse(options.body).email:null;
  const actor=auth?ACTORS[email.startsWith('employee')?0:1]:ACTORS[options.headers.authorization.endsWith('EMPLOYEE')?0:1];
  return {ok:true,status:200,json:async()=>auth?{user:{id:actor.id},access_token:'QA_'+actor.key}:active(actor)};
 };
 const result=await run(env,fakeFetch);
 assert.equal(result.roles.length,2);assert.equal(result.readOnly,true);
 assert.ok(calls.every(c=>c.method==='POST'&&c.url.startsWith('https://hxtztkmbfpmzrieccwsg.supabase.co/')));
 assert.ok(calls.filter(c=>c.url.endsWith('mir_punch_snapshot')).every(c=>c.body.org===ORG && c.body.employee===null));
 assert.ok(calls.every(c=>!/punch_action|punch_admin|prod|gccltmaulvrnthrbnrpd/.test(c.url)));
});
