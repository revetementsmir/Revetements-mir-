'use strict';
/* MIR TEST-only, CI-run-scoped QA lifecycle. Never imported into the APK or dist.
 * The privileged SQL RPC lives ONLY in supabase/test-only/migrations.
 * Credentials + run token live in the ephemeral GitHub runner, never in artifacts. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TEST='hxtztkmbfpmzrieccwsg',ORGANIZATION='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
const BASE='https://'+TEST+'.supabase.co';
const CHECK=/^sb_publishable_[A-Za-z0-9_-]+$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TOKEN=/^[0-9a-f]{64}$/;
function settings(env=process.env){
  if(env.GITHUB_ACTIONS!=='true'||env.MIR_TEST_TARGET!=='sandbox'||env.MIR_SANDBOX_ORG_ID!==ORGANIZATION)
    throw Error('MIR TEST hosted CI only; production or local mutation refused');
  const key=env.MIR_SANDBOX_PUBLISHABLE_KEY,email=env.MIR_SANDBOX_BOSS_EMAIL,password=env.MIR_SANDBOX_BOSS_PASSWORD;
  if(!CHECK.test(key||'')||!email||!password)throw Error('MIR TEST boss login or public key absent');
  if(!env.RUNNER_TEMP||!path.isAbsolute(env.RUNNER_TEMP))throw Error('Private runner directory missing');
  const privateFile=path.join(env.RUNNER_TEMP,'mir-qa-native-run-private.json');
  const manifestFile=path.resolve('artifacts/phase11/native-qa-run-manifest.json');
  return {key,email,password,privateFile,manifestFile};
}
async function post(fetchImpl,url,body,headers={}){
  if(!url.startsWith(BASE+'/'))throw Error('Forbidden non-TEST endpoint');
  const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  let data;try{data=await response.json();}catch{throw Error('MIR TEST request unreadable '+response.status);}
  if(!response.ok||typeof data!=='object'||data===null){
    const failure=/^QA_[A-Z_]+/.exec(String(data?.message||''))?.[0]||'REJECTED';
    throw Error('MIR TEST rejected QA request (HTTP '+response.status+'; '+failure+')');
  }
  return data;
}
async function login(fetchImpl,config){
  const body=await post(fetchImpl,BASE+'/auth/v1/token?grant_type=password',{email:config.email,password:config.password},{apikey:config.key});
  if(!body.access_token||body.user?.id===undefined)throw Error('MIR TEST boss identity unconfirmed');
  return {apikey:config.key,authorization:'Bearer '+body.access_token};
}
async function rpc(fetchImpl,headers,action,session){
  const value=await post(fetchImpl,BASE+'/rest/v1/rpc/mir_qa_native_run',
    {p_action:action,p_run_id:session.runId,p_token:session.token},headers);
  if(value.ok!==true||value.projectRef!==TEST)throw Error('QA RPC project confirmation missing');
  return value;
}
function writePrivate(file,session){
  const fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(session),{encoding:'utf8'});}finally{fs.closeSync(fd);}
  fs.chmodSync(file,0o600);
}
function readPrivate(file){
  if(!fs.existsSync(file))return null;
  const s=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!UUID.test(s.runId)||!TOKEN.test(s.token)||s.projectRef!==TEST)throw Error('QA private session invalid');
  return s;
}
function verifyManifest(body,session){
  if(body.ok!==true||body.state!=='active'||body.runId!==session.runId
    ||body.projectRef!==TEST||body.marker!=='QA-NATIVE-RUN-'+session.runId.replaceAll('-','')
    ||body.jobId!=='7da20261-1114-4000-8000-000000000001'
    ||!/^\d{4}-\d{2}-\d{2}$/.test(body.workDate)
    ||!UUID.test(body.employee?.shift)||!UUID.test(body.employee?.segment)
    ||!UUID.test(body.chef?.shift)||!UUID.test(body.chef?.segment)
    ||!UUID.test(body.lead?.assignmentId)||!UUID.test(body.lead?.taskId))
    throw Error('QA fixture RPC returned inconsistent per-run identities');
  return Object.freeze({...body,readOnlyPreflight:true});
}
/* The server refuses new QA dates during the last ten UTC minutes.
 * Never create a fixture that may cross the day boundary mid-instrumentation.
 * In CI only, wait for the next day before allocating the lease; no DB writes
 * or external mail calls occur during the wait. */
async function waitUntilSafeUtc(nowFn=()=>new Date(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 const now=nowFn(),midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
 const remaining=midnight-now.getTime();
 if(remaining>0&&remaining<12*60*1000){
   console.log('MIR TEST QA: UTC date boundary; starting on the next test day');
   await sleep(remaining+1500);
   return {waited:true,ms:remaining+1500};
 }
 return {waited:false,ms:0};
}
async function start(fetchImpl=fetch,env=process.env,safeWindow=waitUntilSafeUtc){
  const c=settings(env);
  if(fs.existsSync(c.privateFile))throw Error('QA runner already owns a private fixture: finish it first');
  const session={runId:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),projectRef:TEST};
  writePrivate(c.privateFile,session); // recoverable even when network fails after commit
  const h=await login(fetchImpl,c);
  await rpc(fetchImpl,h,'recover',session); // ONLY expired, exact, synthetic records
  await safeWindow(); // never lease a fixture across a UTC work_date rollover
  const response=verifyManifest(await rpc(fetchImpl,h,'start',session),session);
  fs.mkdirSync(path.dirname(c.manifestFile),{recursive:true});
  const {ok,state,projectRef,runId,marker,jobId,workDate,employee,chef,lead}=response;
  fs.writeFileSync(c.manifestFile,JSON.stringify({ok,state,projectRef,runId,marker,jobId,workDate,employee,chef,lead},null,2)+'\n');
  console.log('MIR TEST QA prepared: unique run, two guarded shifts, fresh chef day; no production or external delivery');
  return response;
}
async function finish(fetchImpl=fetch,env=process.env){
  const c=settings(env),session=readPrivate(c.privateFile);
  if(!session){console.log('MIR TEST QA finish: no private fixture in this runner');return {state:'none'};}
  const h=await login(fetchImpl,c);
  const result=await rpc(fetchImpl,h,'finish',session);
  if(result.state==='missing'){fs.rmSync(c.privateFile);console.log('MIR TEST QA: no run was allocated');return result;}
  if(result.state!=='closed'||result.runId&&result.runId!==session.runId)throw Error('QA cleanup not confirmed by server');
  if(result.closedShifts!==undefined&&(result.closedShifts!==2||result.deletedTeamFixtures!==2||result.preservedPunchHistory!==true))
    throw Error('QA cleanup counts not certified');
  fs.rmSync(c.privateFile);
  console.log('MIR TEST QA cleanup confirmed: only this run closed; old audit and shifts retained');
  return result;
}
if(require.main===module){
  const action=process.argv[2];
  (action==='start'?start:action==='finish'?finish:async()=>{throw Error('Expected start or finish')})()
   .catch(err=>{console.error('QA lifecycle: '+err.message.replace(/Bearer\s+\S+/g,'[redacted]'));process.exitCode=1;});
}
module.exports={TEST,ORGANIZATION,BASE,settings,post,login,rpc,readPrivate,verifyManifest,waitUntilSafeUtc,start,finish};
