'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {HOST,ORG,JOB,ACTORS,LEAD_MEMBER,validateManifest,configuration,checkState,checkLead,run}=require('./verify-pr39-native-fixture.cjs');
const day=()=>new Date().toISOString().slice(0,10);
const make=()=>{const runId=crypto.randomUUID();return {ok:true,state:'active',projectRef:'hxtztkmbfpmzrieccwsg',runId,marker:'QA-NATIVE-RUN-'+runId.replaceAll('-',''),jobId:JOB,workDate:day(),
 employee:{id:ACTORS[0].id,shift:crypto.randomUUID(),segment:crypto.randomUUID()},
 chef:{id:ACTORS[1].id,shift:crypto.randomUUID(),segment:crypto.randomUUID()},
 lead:{assignmentId:crypto.randomUUID(),taskId:crypto.randomUUID(),memberId:LEAD_MEMBER}}};
const env={MIR_SANDBOX_ORG_ID:ORG,MIR_SANDBOX_PUBLISHABLE_KEY:'sb_publishable_QA_fixture_mock_not_a_real_key',
 MIR_SANDBOX_EMPLOYEE_EMAIL:'employee@example.invalid',MIR_SANDBOX_EMPLOYEE_PASSWORD:'QA-ONLY',
 MIR_SANDBOX_CHEF_EMAIL:'chef@example.invalid',MIR_SANDBOX_CHEF_PASSWORD:'QA-ONLY'};
function active(actor,started=Date.now()-20*60000){return {activeShift:{id:actor.shift,device_id:actor.marker,status:'active',ended_at:null,started_at:new Date(started).toISOString(),
 segment:{id:actor.segment,job_id:JOB,segment_type:'job',ended_at:null}}};}
test('Run-scoped identities: two different tests cannot share UUIDs or markers, even on same day',()=>{
 const one=validateManifest(make()),two=validateManifest(make());
 assert.notEqual(one.runId,two.runId);assert.notEqual(one.marker,two.marker);
 assert.notEqual(one.employee.shift,two.employee.shift);assert.notEqual(one.chef.segment,two.chef.segment);
 assert.notEqual(one.lead.assignmentId,two.lead.assignmentId);
 for(const bad of [
  {...one,projectRef:'gccltmaulvrnthrbnrpd'},
  {...one,marker:two.marker},
  {...one,workDate:'2026-11-14'},
  {...one,chef:{...one.chef,shift:one.employee.shift}},
  {...one,lead:{...one.lead,assignmentId:'7da20261-1115-4000-9220-000000000001'}},
  {...one,employee:{...one.employee,id:crypto.randomUUID()}}
 ])assert.throws(()=>validateManifest(bad),/invalid|incorrect|duplicated|old/);
});
test('Refuse wrong organization, missing credentials and stale manifest',()=>{
 const m=make();
 assert.throws(()=>configuration({...env,MIR_SANDBOX_ORG_ID:'production-forbidden'},m),/Organisation TEST/);
 assert.throws(()=>configuration({...env,MIR_SANDBOX_PUBLISHABLE_KEY:''},m),/Clé publique/);
 assert.throws(()=>configuration({...env,MIR_SANDBOX_CHEF_PASSWORD:''},m),/Compte QA absent/);
 assert.equal(configuration(env,m).actors.length,2);
});
test('Never weakens active shift, job, marker, segment and 15-minute window assertions',()=>{
 const m=make(),c=configuration(env,m);
 for(const actor of c.actors){
   const now=Date.now(),good=active(actor,now-20*60000);
   assert.equal(checkState(good,actor,now).jobId,JOB);
   assert.throws(()=>checkState({activeShift:null},actor,now),/manquant/);
   assert.throws(()=>checkState(active(actor,now-3*60000),actor,now),/15 min/);
   assert.throws(()=>checkState({...good,activeShift:{...good.activeShift,device_id:'QA-NATIVE-RUN-OTHER'}},actor,now),/incohérent/);
   assert.throws(()=>checkState({...good,activeShift:{...good.activeShift,ended_at:new Date().toISOString()}},actor,now),/incohérent/);
   assert.throws(()=>checkState({...good,activeShift:{...good.activeShift,segment:{...good.activeShift.segment,job_id:crypto.randomUUID()}}},actor,now),/incohérent/);
   assert.throws(()=>checkState({...good,activeShift:{...good.activeShift,id:crypto.randomUUID()}},actor,now),/incohérent/);
   assert.throws(()=>checkState({...good,activeShift:{...good.activeShift,segment:{...good.activeShift.segment,id:crypto.randomUUID()}}},actor,now),/incohérent/);
 }
});
test('Lead snapshot requires exact TODAY assignment, task, team member and uncompleted status',()=>{
 const m=make(),valid={role:'chef_equipe',today:m.workDate,assignment:{id:m.lead.assignmentId,jobId:JOB},team:[{id:LEAD_MEMBER}],tasks:[{id:m.lead.taskId,completedAt:null}]};
 assert.equal(checkLead(valid,m).taskId,m.lead.taskId);
 assert.throws(()=>checkLead({...valid,today:'2026-11-14'},m),/Chef du jour/);
 assert.throws(()=>checkLead({...valid,assignment:null},m),/Chef du jour/);
 assert.throws(()=>checkLead({...valid,assignment:{...valid.assignment,id:crypto.randomUUID()}},m),/Chef du jour/);
 assert.throws(()=>checkLead({...valid,tasks:[]},m),/Chef du jour/);
 assert.throws(()=>checkLead({...valid,team:[]},m),/Chef du jour/);
 assert.throws(()=>checkLead({...valid,tasks:[{id:m.lead.taskId,completedAt:new Date().toISOString()}]},m),/Chef du jour/);
});
test('Preflight authenticates exact TEST users, calls only read RPCs, never punch write',async()=>{
 const m=make(),calls=[],now=Date.now();
 const mock=async(url,options)=>{
   const body=JSON.parse(options.body),auth=url.includes('/auth/v1/token');
   const actor=auth?ACTORS[body.email.startsWith('employee')?0:1]:ACTORS[options.headers.authorization.endsWith('EMPLOYEE')?0:1];
   calls.push({url,method:options.method,body});
   const response=auth?{user:{id:actor.id},access_token:'QA_'+actor.key}:
     url.endsWith('mir_lead_today_snapshot')?{role:'chef_equipe',today:m.workDate,assignment:{id:m.lead.assignmentId,jobId:JOB},team:[{id:LEAD_MEMBER}],tasks:[{id:m.lead.taskId,completedAt:null}]}:
       active({...actor,...m[actor.name],marker:m.marker},now-20*60000);
   return {ok:true,status:200,json:async()=>response};
 };
 const r=await run(env,mock,m);
 assert.equal(r.roles.length,2);assert.equal(r.readOnly,true);
 assert.ok(calls.every(x=>x.method==='POST'&&x.url.startsWith('https://'+HOST+'/')));
 assert.ok(calls.filter(x=>x.url.endsWith('mir_punch_snapshot')).every(x=>x.body.org===ORG&&x.body.employee===null));
 assert.equal(calls.filter(x=>x.url.endsWith('mir_lead_today_snapshot')).length,1);
 assert.equal(r.roles[1].lead.assignmentId,m.lead.assignmentId);
 assert.ok(calls.every(x=>!/punch_action|punch_admin|gccltmaulvrnthrbnrpd|mir_qa_native_run/.test(x.url)));
});
