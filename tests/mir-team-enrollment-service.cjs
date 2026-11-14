'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createTeamInvitationService,TEST_URL}=require('../supabase/functions/_shared/team-invitations.mjs');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),token='a'.repeat(43),email='new@example.invalid',password='phrase-de-test-unique-123';
function harness({existing=false,accepted=false,revoked=false,expires=false,wrongIdentity=false,transport=null,failAt=null}={}){
 let user=existing?{id:id(5),email,email_confirmed_at:'2026-11-14T01:00:00Z'}:null,claimed=false,membership=false,creates=0,acceptedCount=0;const calls=[];
 const env={SUPABASE_URL:TEST_URL,SUPABASE_SERVICE_ROLE_KEY:'server-only-privileged',SUPABASE_ANON_KEY:'sb_publishable_test',MIR_TEAM_ENROLLMENT_ENABLED:'true',MIR_TEAM_HELP_EMAIL:'aide@example.invalid',MIR_TEAM_TRANSPORT:'simulation'};
 const fetchImpl=async(input,init)=>{
  const url=new URL(input);assert.equal(url.origin,TEST_URL);const path=url.pathname,data=init.body?JSON.parse(init.body):{};calls.push({path,data,headers:init.headers});let result={},status=200;
  if(failAt===path)throw Error('Network detail must stay private');
  if(path==='/rest/v1/rpc/mir_team_enrollment'){
   assert.equal(init.headers.authorization,'Bearer server-only-privileged');if(data.p_email!==email)return new Response(JSON.stringify({code:'42501'}),{status:403});assert.match(data.p_password_tag,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(data).includes(password),false);
   if(revoked||expires||data.p_token!==token){status=403;result={code:'42501'};}
   else if(existing||accepted)result={existingAccount:true};
   else if(data.p_action==='claim'){if(claimed){status=409;result={details:'TEAM_BUSY'};}else{claimed=true;result={invitationId:id(10),email,userId:null};}}
   else{assert.equal(data.p_user_id,user?.id);result={invitationId:id(10),email,userId:user.id};}
  }else if(path==='/auth/v1/admin/users'){
   assert.equal(user,null,'existing account must never be overwritten');creates++;assert.equal(data.email_confirm,false);assert.equal(data.app_metadata.mir_team_invitation,id(10));user={id:id(5),email,app_metadata:data.app_metadata};result=user;
  }else if(path==='/auth/v1/admin/generate_link'){assert.equal(data.type,'invite');assert.equal(data.password,undefined);result={hashed_token:'one-time-auth-proof',verification_type:'invite',id:user.id};}
  else if(path==='/auth/v1/verify'){assert.equal(data.token_hash,'one-time-auth-proof');user.email_confirmed_at='2026-11-14T01:00:00Z';result={access_token:'employee-access',refresh_token:'employee-refresh',expires_in:3600};}
  else if(path==='/auth/v1/user'){assert.equal(init.headers.authorization,'Bearer '+(init.headers.authorization.includes('manager')?'manager-access':'employee-access'));result=wrongIdentity?{...user,email:'wrong@example.invalid'}:user||{id:id(1),email:'manager@example.invalid'};}
  else if(path==='/rest/v1/rpc/mir_team_accept_invitation'){assert.equal(init.headers.authorization,'Bearer employee-access');if(revoked){status=403;result={code:'42501'};}else{membership=true;acceptedCount++;accepted=true;result={ok:true};}}
  else if(path==='/rest/v1/rpc/mir_team_invitation_preview'){assert.equal(init.headers.authorization,'Bearer manager-access');result={email,name:'Personne TEST',expiresAt:'2026-11-17T17:00:00Z'};}
  else throw Error('Unexpected request '+path);
  return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
 };
 const handler=createTeamInvitationService({env,fetchImpl,transport});
 async function request(patch={},headers={}){const r=await handler(new Request('https://edge.example/endpoint',{method:'POST',headers:{origin:'https://localhost','content-type':'application/json',...headers},body:JSON.stringify({action:'activate',token,email,password,requestId:id(20),...patch})}));const body=await r.json();assert.equal(JSON.stringify(body).includes('server-only-privileged'),false);assert.equal(JSON.stringify(body).includes(password),false);return{status:r.status,body,cache:r.headers.get('cache-control')};}
 return{request,calls,env,handler,state:()=>({user,membership,creates,acceptedCount})};
}
test('new invited employee: create unconfirmed identity, verify exact email, accept server rights, return own session',async()=>{
 const h=harness(),r=await h.request();assert.equal(r.status,200);assert.equal(r.body.activated,true);assert.equal(r.body.session.access_token,'employee-access');assert.equal(r.cache,'no-store');assert.deepEqual(h.state().membership,true);assert.equal(h.state().creates,1);assert.equal(h.state().acceptedCount,1);
 const again=await h.request();assert.equal(again.status,409);assert.equal(again.body.error.code,'ACCOUNT_EXISTS');assert.equal(again.body.session,undefined);assert.equal(h.state().creates,1);
});
test('existing account never receives a password reset, new identity or session from invitation capability',async()=>{
 const h=harness({existing:true}),r=await h.request();assert.equal(r.status,409);assert.equal(r.body.error.code,'ACCOUNT_EXISTS');assert.equal(h.state().creates,0);assert.equal(h.calls.some(c=>c.path.startsWith('/auth/')),false);
});
test('revoked, expired and foreign tokens never create an Auth identity',async()=>{
 for(const scenario of [{revoked:true},{expires:true}]){const h=harness(scenario);assert.equal((await h.request()).status,403);assert.equal(h.state().creates,0);}
 const h=harness();assert.equal((await h.request({token:'b'.repeat(43)})).status,403);assert.equal(h.state().creates,0);
});
test('wrong email, role injection and organization injection cannot start enrollment',async()=>{
 const h=harness();for(const patch of [{role:'boss'},{organizationId:id(44)},{email:'wrong@example.invalid'},{requestId:'bad'},{password:'short'}]){const r=await h.request(patch);assert.notEqual(r.status,200);}assert.equal(h.state().creates,0);
});
test('simultaneous activation is claimed once; no duplicate user or duplicated right',async()=>{
 const h=harness();const result=await Promise.all([h.request(),h.request()]);assert.equal(result.filter(r=>r.status===200).length,1);assert.equal(h.state().creates,1);assert.equal(h.state().acceptedCount,1);
});
test('unverified/mismatched identity cannot receive business rights or session',async()=>{
 const h=harness({wrongIdentity:true}),r=await h.request();assert.equal(r.status,403);assert.equal(h.state().membership,false);assert.equal(r.body.session,undefined);
});
test('ambiguous Auth provider response is not exposed or retried automatically',async()=>{
 const h=harness({failAt:'/auth/v1/admin/users'}),r=await h.request();assert.equal(r.status,503);assert.equal(r.body.error.code,'AUTH_UNCERTAIN');assert.equal(JSON.stringify(r.body).includes('Network detail'),false);assert.equal(h.calls.filter(c=>c.path==='/auth/v1/admin/users').length,1);
});
test('preview and simulated delivery do not report a real dispatch',async()=>{
 const h=harness({transport:async envelope=>{assert.equal(envelope.to,email);assert.match(envelope.html,/Activer mon accès/);return{simulated:true,receipt:'local-ack'};}});
 const preview=await h.handler(new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer manager-access','content-type':'application/json'},body:JSON.stringify({action:'preview',token})}));assert.equal(preview.status,200);const p=await preview.json();assert.equal(p.emailSent,false);assert.match(p.envelope.text,/heure de Toronto/);
 const sim=await h.handler(new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer manager-access','content-type':'application/json'},body:JSON.stringify({action:'simulate',token})}));const s=await sim.json();assert.equal(sim.status,200);assert.equal(s.simulated,true);assert.equal(s.emailSent,false);assert.equal(s.deliveryStatus,'pending');
});
test('without injected local transport, simulation cannot claim an acknowledgement',async()=>{
 const h=harness();const r=await h.handler(new Request('https://edge.example',{method:'POST',headers:{authorization:'Bearer manager-access'},body:JSON.stringify({action:'simulate',token})}));assert.equal(r.status,503);
});
test('wrong project, disabled capability, foreign origin and oversized input fail closed',async()=>{
 const h=harness();h.env.MIR_TEAM_ENROLLMENT_ENABLED='false';assert.equal((await h.request()).status,503);h.env.MIR_TEAM_ENROLLMENT_ENABLED='true';assert.equal((await h.request({}, {origin:'https://evil.example'})).status,403);assert.equal((await h.request({padding:'x'.repeat(5000)})).status,413);
 const handler=createTeamInvitationService({env:{SUPABASE_URL:'https://other-project.example'},fetchImpl:()=>{throw Error('must not fetch');}});assert.equal((await handler(new Request('https://edge.example'))).status,503);
});
