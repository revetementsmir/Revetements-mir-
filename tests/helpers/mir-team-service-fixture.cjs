'use strict';
const assert=require('node:assert/strict');
const {createFixture,id}=require('./mir-team-fixture.cjs');
const {createTeamInvitationService,TEST_URL}=require('../../supabase/functions/_shared/team-invitations.mjs');
async function createServiceFixture(){
 const fixture=await createFixture(),{db,actor}=fixture;const sessions=new Map([['manager-access',2]]),users=new Map(),passwords=new Map(),proofs=new Map();let next=8,createCount=0;
 const env={SUPABASE_URL:TEST_URL,SUPABASE_SERVICE_ROLE_KEY:'local-service-only',SUPABASE_ANON_KEY:'sb_publishable_test',MIR_TEAM_ENROLLMENT_ENABLED:'true',MIR_TEAM_HELP_EMAIL:'aide@example.invalid'};
 const fetchImpl=async(input,init)=>{
  const u=new URL(input);assert.equal(u.origin,TEST_URL,'only simulated MIR TEST');const body=init.body?JSON.parse(init.body):{},bearer=init.headers.authorization.slice(7);let result,status=200;
  try{
   if(u.pathname==='/rest/v1/rpc/mir_team_enrollment'){
    assert.equal(bearer,'local-service-only');await db.exec('begin');try{await db.exec('set local role service_role');result=(await db.query('select public.mir_team_enrollment($1,$2,$3,$4,$5,$6) r',[body.p_action,body.p_token,body.p_email,body.p_request_id,body.p_user_id,body.p_password_tag])).rows[0].r;await db.exec('commit');}catch(e){await db.exec('rollback');throw e;}
   }else if(u.pathname==='/auth/v1/admin/users'){
    assert.equal(bearer,'local-service-only');const n=next++;const user={id:id(n),email:body.email,email_confirmed_at:null,app_metadata:body.app_metadata};await db.query('insert into auth.users values($1,$2,null,$3)',[user.id,user.email,JSON.stringify(user.app_metadata)]);users.set(n,user);passwords.set(n,body.password);createCount++;result=user;
   }else if(u.pathname==='/auth/v1/admin/generate_link'){
    const entry=[...users.entries()].find(([,user])=>user.email===body.email);assert.ok(entry);assert.equal(entry[1].email_confirmed_at,null);const proof='local-proof-'+entry[0];proofs.set(proof,entry[0]);result={hashed_token:proof,verification_type:'invite',id:entry[1].id};
   }else if(u.pathname==='/auth/v1/verify'){
    const n=proofs.get(body.token_hash);assert.ok(n);proofs.delete(body.token_hash);const user=users.get(n);user.email_confirmed_at='2026-11-14T01:00:00Z';await db.query('update auth.users set email_confirmed_at=$2 where id=$1',[user.id,user.email_confirmed_at]);sessions.set('local-access-'+n,n);result={access_token:'local-access-'+n,refresh_token:'local-refresh-'+n,expires_in:3600};
   }else if(u.pathname==='/auth/v1/user'){
    const n=sessions.get(bearer);assert.ok(n);result=users.get(n)||(await db.query('select id,email,email_confirmed_at from auth.users where id=$1',[id(n)])).rows[0];
   }else if(u.pathname==='/rest/v1/rpc/mir_team_accept_invitation'){
    const n=sessions.get(bearer);assert.ok(n);result=await actor(n,'select public.mir_team_accept_invitation($1) r',[body.p_token]);
   }else if(u.pathname==='/rest/v1/rpc/mir_team_invitation_preview'){
    const n=sessions.get(bearer);assert.ok(n);result=await actor(n,'select public.mir_team_invitation_preview($1) r',[body.p_token]);
   }else throw Error('unexpected transport '+u.pathname);
  }catch(error){status=403;result={code:error.code||'42501',message:'Denied',details:error.detail};}
  return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
 };
 const handler=createTeamInvitationService({env,fetchImpl});
 return {...fixture,handler,createCount:()=>createCount,users,checkPassword:(email,password)=>[...users].find(([n,u])=>u.email===email&&passwords.get(n)===password)?.[1]||null};
}
module.exports={createServiceFixture};
