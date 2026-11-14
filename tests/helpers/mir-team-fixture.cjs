'use strict';
const {PGlite}=require('../../tools/database/node_modules/@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function createFixture(){const db=new PGlite();try{
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema mir_core;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
create table mir_core.account_settings(singleton boolean,organization_id uuid);
create table mir_core.memberships(organization_id uuid,user_id uuid,role text,active boolean,primary key(organization_id,user_id));
create table mir_core.staff_capabilities(organization_id uuid,user_id uuid,staff_role text,display_name text,configured_by uuid,active boolean default true,primary key(organization_id,user_id));
create table mir_core.jobs(organization_id uuid,id uuid,name text,archived boolean default false);
create table mir_core.job_memberships(organization_id uuid,job_id uuid,user_id uuid,primary key(organization_id,job_id,user_id));
create table mir_core.account_invitations(id uuid default gen_random_uuid() primary key,organization_id uuid,email text,token_hash text unique,job_ids uuid[],request_id uuid,created_by uuid,expires_at timestamptz default now()+interval '72 hours',created_at timestamptz default now(),accepted_by uuid,accepted_at timestamptz,revoked_at timestamptz,unique(organization_id,request_id));
create function public.mir_account_create_invitation(text,uuid[],uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
create function public.mir_account_revoke_invitation(uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
create function public.mir_portal_accept_invitation(text) returns jsonb language sql as $$select '{}'::jsonb$$;
`);
const original=fs.readFileSync('supabase/migrations/20261108134535_mir_account_customer_auth.sql','utf8');
const identity=original.slice(original.indexOf('create function mir_core.account_identity()'));
await db.exec(identity.slice(0,identity.indexOf('end $$;')+7));
await db.exec(fs.readFileSync('supabase/migrations/20261110120000_operational_roles_phase1.sql','utf8'));
const migration=fs.readFileSync('supabase/proposals/employee-auth/team-invitations-test.sql','utf8');
await assert.rejects(()=>db.exec(migration),/Verified MIR TEST/);await db.exec('rollback');
await db.exec("set mir.target_project='hxtztkmbfpmzrieccwsg'");await db.exec(migration);
for(let n=1;n<=7;n++)await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id(n),'user'+n+'@example.invalid']);
await db.query('insert into mir_core.account_settings values(true,$1)',[id(10)]);
for(const [n,org,role,staff]of [[1,10,'employee','boss'],[2,10,'employee','assistant'],[3,10,'employee','employe'],[4,20,'employee','boss']]){
 await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[id(org),id(n),role]);await db.query('insert into mir_core.staff_capabilities values($1,$2,$3,$4,$2,true)',[id(org),id(n),staff,'Person']);}
await db.query('insert into mir_core.jobs values($1,$2,$3,false)',[id(10),id(30),'TEST']);
await db.query('insert into mir_core.jobs values($1,$2,$3,false)',[id(20),id(31),'OTHER']);
async function actor(n,sql,args=[]){await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id(n),JSON.stringify({iss:'https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1'})]);await db.exec('set local role authenticated');const result=(await db.query(sql,args)).rows[0]?.r;await db.exec('commit');return result;}catch(e){await db.exec('rollback');throw e;}}
const action=(n,kind,request,data)=>actor(n,'select public.mir_team_invitation($1,$2,$3) r',[kind,id(request),data]);
const prepare=(n,request,email='user5@example.invalid',role='employe',job=id(30))=>action(n,'prepare',request,{email,name:'Test Person',role,jobIds:[job]});
const token=r=>new URL(r.activationPath,'https://example.invalid').searchParams.get('invitation');

return {db,actor,action,prepare,token};
}catch(error){await db.close();throw error;}}
module.exports={createFixture,id};
