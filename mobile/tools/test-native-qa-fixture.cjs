'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {settings,start,finish,post,TEST}=require('./native-qa-fixture.cjs');
const now=()=>new Date().toISOString().slice(0,10);
function testEnv(tmp){return {GITHUB_ACTIONS:'true',MIR_TEST_TARGET:'sandbox',MIR_SANDBOX_ORG_ID:'8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',
 MIR_SANDBOX_PUBLISHABLE_KEY:'sb_publishable_QA_mock_key_never_used',
 MIR_SANDBOX_BOSS_EMAIL:'boss@example.invalid',MIR_SANDBOX_BOSS_PASSWORD:'QA_ONLY',
 RUNNER_TEMP:path.join(tmp,'private')};}
function mockService(){
 const requests=[],ids=new Set(),active=new Map();
 const fetcher=async(url,options)=>{
   assert.ok(url.startsWith('https://'+TEST+'.supabase.co/'),'TEST-only network');
   const body=JSON.parse(options.body);requests.push({url,action:body.p_action,runId:body.p_run_id});
   if(url.includes('/auth/v1/token'))return {ok:true,status:200,json:async()=>({user:{id:crypto.randomUUID()},access_token:'TEST_FAKE_ONLY'})};
   if(body.p_action==='recover')return {ok:true,status:200,json:async()=>({ok:true,projectRef:TEST,state:'none'})};
   const runId=body.p_run_id;
   if(body.p_action==='start'){
     assert.equal(ids.has(runId),false);
     ids.add(runId);active.set(runId,true);
     const response={ok:true,state:'active',projectRef:TEST,runId,
       marker:'QA-NATIVE-RUN-'+runId.replaceAll('-',''),jobId:'7da20261-1114-4000-8000-000000000001',workDate:now(),
       employee:{id:'3980647a-d83a-48ad-9d90-8fc2b314807f',shift:crypto.randomUUID(),segment:crypto.randomUUID()},
       chef:{id:'ec421778-b39b-492e-9e4b-5e044015e98f',shift:crypto.randomUUID(),segment:crypto.randomUUID()},
       lead:{assignmentId:crypto.randomUUID(),taskId:crypto.randomUUID(),memberId:'552233d5-ae18-4c14-be85-0206e6f18549'}};
     return {ok:true,status:200,json:async()=>response};
   }
   if(body.p_action==='finish'){
     assert.equal(active.has(runId),true,'must not close a different run');
     active.set(runId,false);
     return {ok:true,status:200,json:async()=>({ok:true,projectRef:TEST,state:'closed',runId,closedShifts:2,deletedTeamFixtures:2,preservedPunchHistory:true})};
   }
   throw Error('unexpected request');
 };
 return {fetcher,requests,active};
}
test('Only GitHub MIR TEST, with correct org/boss/private file',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mir-qa-settings-'));
 try{
   const env=testEnv(dir);
   assert.throws(()=>settings({...env,MIR_TEST_TARGET:'production'}),/MIR TEST/);
   assert.throws(()=>settings({...env,GITHUB_ACTIONS:'false'}),/hosted CI/);
   assert.throws(()=>settings({...env,MIR_SANDBOX_ORG_ID:'other'}),/hosted CI/);
   assert.throws(()=>settings({...env,MIR_SANDBOX_BOSS_PASSWORD:''}),/boss login/);
   assert.ok(settings(env).privateFile.startsWith(env.RUNNER_TEMP));
   await assert.rejects(post(fetch,'https://gccltmaulvrnthrbnrpd.supabase.co/auth/v1/token',{}),/Forbidden non-TEST/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Different CI runs get distinct UUIDs, strict separate ownership and finish only own fixtures',async()=>{
 const original=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-qa-native-'));
 fs.mkdirSync(path.join(tmp,'private'));process.chdir(tmp);
 try{
   const env=testEnv(tmp),srv=mockService(),first=await start(srv.fetcher,env);
   assert.ok(fs.existsSync(settings(env).privateFile));
   assert.equal(fs.statSync(settings(env).privateFile).mode&0o777,0o600);
   const artifact=fs.readFileSync(path.resolve('artifacts/phase11/native-qa-run-manifest.json'),'utf8');
   assert.doesNotMatch(artifact,/QA_ONLY|TEST_FAKE_ONLY|boss@example\.invalid/);
   await assert.rejects(start(srv.fetcher,env),/already owns/,'cannot allocate twice without finishing');
   const done=await finish(srv.fetcher,env);assert.equal(done.state,'closed');
   assert.equal(fs.existsSync(settings(env).privateFile),false);
   const again=await finish(srv.fetcher,env);assert.equal(again.state,'none');
   const second=await start(srv.fetcher,env);
   assert.notEqual(second.runId,first.runId);assert.notEqual(second.marker,first.marker);
   assert.notEqual(second.employee.shift,first.employee.shift);
   await finish(srv.fetcher,env);
   assert.deepEqual([...srv.active.values()],[false,false]);
   assert.equal(srv.requests.filter(x=>x.action==='start').length,2);
   assert.equal(srv.requests.filter(x=>x.action==='finish').length,2);
   assert.ok(srv.requests.every(x=>x.url.startsWith('https://'+TEST+'.supabase.co/')));
 }finally{process.chdir(original);fs.rmSync(tmp,{recursive:true,force:true});}
});
test('Fail-closed cleanup failure keeps private session for retry; no false success',async()=>{
 const original=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-qa-retry-'));
 fs.mkdirSync(path.join(tmp,'private'));process.chdir(tmp);
 try{
   const env=testEnv(tmp),srv=mockService();await start(srv.fetcher,env);
   const unavailable=async(url,options)=>{
     if(url.endsWith('/rest/v1/rpc/mir_qa_native_run')&&JSON.parse(options.body).p_action==='finish')
       return {ok:false,status:503,json:async()=>({error:'unavailable'})};
     return srv.fetcher(url,options);
   };
   await assert.rejects(finish(unavailable,env),/rejected/);
   assert.equal(fs.existsSync(settings(env).privateFile),true,'runner still has recovery token');
   await finish(srv.fetcher,env);assert.equal(fs.existsSync(settings(env).privateFile),false);
 }finally{process.chdir(original);fs.rmSync(tmp,{recursive:true,force:true});}
});
