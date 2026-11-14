'use strict';
// Reads a personal QA capability from stdin, never from CLI args or logs.
// No service key, arbitrary URL, production request or mail transport exists here.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),readline=require('node:readline');
const BASE='https://hxtztkmbfpmzrieccwsg.supabase.co',KEY='sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh',dir=path.resolve('artifacts/employee-auth-audit/hosted');
const file=path.join(dir,'.private-qa-session.json');fs.mkdirSync(dir,{recursive:true});
async function request(endpoint,body,bearer){assert.ok(endpoint.startsWith('/')&&!endpoint.includes('://'));const r=await fetch(BASE+endpoint,{method:body===undefined?'GET':'POST',headers:{apikey:KEY,authorization:'Bearer '+(bearer||KEY),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(25000)});let data;try{data=await r.json();}catch{data={};}return{status:r.status,data};}
async function run(input){
 if(input.stage==='activate'&&fs.existsSync(file))throw Error('QA credentials already exist; use the existing recipe stages, do not overwrite them.');
 let state=input.stage==='activate'?{email:input.email,token:input.token,password:crypto.randomBytes(24).toString('base64url')+'-QA',requestId:crypto.randomUUID()}:JSON.parse(fs.readFileSync(file,'utf8'));
 const save=()=>fs.writeFileSync(file,JSON.stringify(state),{mode:0o600});
 const report=[];const pass=(name,details={})=>{report.push({name,passed:true,...details});console.log('PASS '+name);};
 if(input.stage==='seed-web'){assert.match(input.email,/^mir-auth-qa-.*@example\.invalid$/);assert.match(input.token,/^[A-Za-z0-9_-]{43}$/);state.webActivation={email:input.email,token:input.token,password:crypto.randomBytes(24).toString('base64url')+'-QA'};save();pass('hosted web activation capability stored privately');}
 if(input.stage==='activate'){
  assert.match(state.email,/^mir-auth-qa-.*@example\.invalid$/);assert.match(state.token,/^[A-Za-z0-9_-]{43}$/);save();
  let r=await request('/functions/v1/mir-team-invitations',{action:'activate',token:state.token,email:'wrong@example.invalid',password:state.password,requestId:crypto.randomUUID()});assert.equal(r.status,403);pass('hosted wrong email refused without enrollment');
  r=await request('/functions/v1/mir-team-invitations',{action:'activate',token:state.token,email:state.email,password:state.password,requestId:state.requestId});
  if(r.status!==200){console.log(JSON.stringify({activationStatus:r.status,errorCode:r.data?.error?.code}));throw Error('Hosted activation failed; inspect server trace without exposing credentials');}
  assert.equal(r.data.activated,true);assert.ok(r.data.session?.access_token&&r.data.session.refresh_token);state.session=r.data.session;save();pass('hosted no-account activation returned only employee session');
  r=await request('/auth/v1/user',undefined,state.session.access_token);assert.equal(r.status,200);assert.equal(r.data.email,state.email);assert.ok(r.data.email_confirmed_at);state.userId=r.data.id;save();pass('hosted exact invited email confirmed');
  r=await request('/rest/v1/rpc/mir_account_snapshot',{},state.session.access_token);assert.equal(r.status,200);assert.equal(r.data.role,'employee');pass('hosted server account role employee');
  r=await request('/functions/v1/mir-team-invitations',{action:'activate',token:state.token,email:state.email,password:state.password,requestId:state.requestId});assert.equal(r.status,409);assert.equal(r.data.error.code,'ACCOUNT_EXISTS');assert.equal(r.data.session,undefined);pass('hosted replay never returns session or duplicates account');
  r=await request('/auth/v1/token?grant_type=password',{email:state.email,password:state.password});assert.equal(r.status,200);assert.equal(r.data.user.id,state.userId);state.session=r.data;save();pass('hosted password sign-in to activated account');
  r=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:state.session.refresh_token});assert.equal(r.status,200);assert.equal(r.data.user.id,state.userId);state.session=r.data;save();pass('hosted refresh retains same employee identity');
  r=await request('/rest/v1/rpc/mir_team_enrollment',{p_action:'claim',p_token:state.token,p_email:state.email,p_request_id:crypto.randomUUID(),p_user_id:null,p_password_tag:'a'.repeat(64)});assert.ok([401,403].includes(r.status));pass('hosted service-only enrollment RPC denied to publishable caller');
 }
 if(input.stage.startsWith('links')){
  for(const [name,token,expected]of [['rotated old link',input.oldToken,403],['renewed link for existing account',input.newToken,409],['revoked link',input.revokedToken,403],['expired link',input.expiredToken,403]]){
   if(!token)continue;assert.match(token,/^[A-Za-z0-9_-]{43}$/);const r=await request('/functions/v1/mir-team-invitations',{action:'activate',token,email:state.email,password:state.password,requestId:crypto.randomUUID()});assert.equal(r.status,expected,name);assert.equal(r.data.session,undefined);pass('hosted '+name+' enforces capability without issuing session');
  }
 }
 if(input.stage==='disabled'){
  let r=await request('/functions/v1/mir-team-invitations',{action:'activate',token:state.token,email:state.email,password:state.password,requestId:crypto.randomUUID()});assert.equal(r.status,409);pass('hosted old link cannot reactivate disabled employee');
  r=await request('/rest/v1/rpc/mir_account_snapshot',{},state.session.access_token);assert.ok([400,401,403].includes(r.status));pass('hosted disabled employee denied business account');
 }
 fs.writeFileSync(path.join(dir,'results-'+input.stage+'.json'),JSON.stringify({projectRef:'hxtztkmbfpmzrieccwsg',environment:'hosted TEST',emailSent:false,productionRequests:false,managerAuthentication:'SQL claims simulation, not a Boss browser login',employeeId:state.userId||null,checks:report},null,2)+'\n');
}
const reader=readline.createInterface({input:process.stdin});reader.once('line',line=>{reader.close();process.stdin.pause();run(JSON.parse(line)).catch(error=>{console.error(error.message);process.exitCode=1;});});
