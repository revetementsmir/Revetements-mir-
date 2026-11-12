'use strict';
// Schema only: existing versioned migrations + captured MIR TEST function drift.
// No hosted users/data and no network connections. auth.uid is simulated.
const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../../tools/database/node_modules/@electric-sql/pglite');
const dir=path.resolve(__dirname,'../../supabase/migrations');
async function baseline({hosted=true,clientCenter=false}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
 // Phase-specific migrations are applied explicitly by their suites. Keeping
 // them out of the baseline also proves that a missing hosted-only prerequisite
 // fails closed instead of being silently manufactured by the fixture.
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql')&&!f.includes('mir_estimates')&&!f.includes('mir_estimate_recipe')&&!f.includes('chat_phase3a')&&!f.includes('chat_phase3b')&&!f.includes('phase3c')&&!f.includes('phase6_commandes')&&(clientCenter||!f.includes('client_center_20261110'))).sort())await db.exec(fs.readFileSync(path.join(dir,f),'utf8'));
 if(hosted){
  // Remove default on local 3-arg job_allowed before restoring hosted overloads.
  const fixture=require('./mir-chat-hosted-functions.json');
  for(const f of fixture.functions.filter(f=>f.signature!=='mir_core.job_allowed(uuid, uuid)'))await db.exec(f.definition);
 }
 return db;
}
async function actor(db,user,sql,args=[],role='authenticated'){
 await db.exec('begin;set local role '+role);
 try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);const result=await db.query(sql,args);await db.exec('commit');return result.rows;}
 catch(e){await db.exec('rollback');throw e;}
}
module.exports={baseline,actor,dir};
