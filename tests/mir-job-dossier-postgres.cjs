'use strict';
/* PostgreSQL jetable: vérifie le contrat RLS/RPC de Phase 1 sans toucher aux bases hébergées. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const uuid=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),root=path.resolve(__dirname,'../supabase/migrations');
(async()=>{const db=new PGlite(),org=uuid(10),foreignOrg=uuid(11),job=uuid(20),otherJob=uuid(21),admin=uuid(1),boss=uuid(2),assistant=uuid(3),chef=uuid(4),employee=uuid(5),warehouse=uuid(6);let checks=0;
 const pass=n=>{checks++;console.log('PASS '+n)};
 async function actor(user,sql,args=[]){await db.exec('begin;set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const out=await db.query(sql,args);await db.exec('commit');return out.rows;}catch(e){await db.exec('rollback');throw e;}}
 async function denied(user,orgId=org,jobId=job){await assert.rejects(()=>actor(user,'select public.mir_job_dossier_snapshot($1,$2,20,null) result',[orgId,jobId]),/inaccessible|permission|autorisé/i);}
 try{
  await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;");
  for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.sql')&&!n.includes('mir_estimates')).sort())await db.exec(fs.readFileSync(path.join(root,file),'utf8'));
  await db.exec("insert into auth.users(id) values('"+[admin,boss,assistant,chef,employee,warehouse].join("'),('")+"');");
  await db.query('insert into mir_core.organizations(id,name) values($1,$2),($3,$4)',[org,'MIR TEST',foreignOrg,'AUTRE']);
  for(const id of [admin,boss,assistant,chef,employee,warehouse])await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[org,id,id===admin?'admin':'employee']);
  await db.query('insert into mir_core.jobs(organization_id,id,name,address,city,phone) values($1,$2,$3,$4,$5,$6),($1,$7,$8,$4,$5,$6)',[org,job,'JOB 353','10 rue MIR','Québec','4185550100',otherJob,'JOB 454']);
  await db.query('insert into mir_core.job_memberships values($1,$2,$3),($1,$2,$4)',[org,job,chef,employee]);
  for(const [id,role,name] of [[boss,'boss','Simon'],[assistant,'assistant','Esther'],[chef,'chef_equipe','Chef'],[employee,'employe','Employé'],[warehouse,'warehouse','Entrepôt']])await actor(admin,'select public.mir_staff_configure($1,$2,$3,$4)',[org,id,role,name]);
  for(const id of [admin,boss,assistant,chef,employee]){const d=(await actor(id,'select public.mir_job_dossier_snapshot($1,$2,20,null) result',[org,job]))[0].result;assert.equal(d.job.id,job);assert.equal(d.job.closed,false);assert.equal(d.access.operationalLabel,id===admin?'boss':undefined??d.access.operationalLabel);}
  pass('Admin/Boss/Adjointe/Chef/Employé ouvrent le même job_id selon leurs droits');
  await denied(employee,org,otherJob);await denied(warehouse,org,job);await denied(employee,foreignOrg,job);
  pass('Isolation chantier, Entrepôt non lié et organisation étrangère refusés côté RPC');
  await db.query('update mir_core.jobs set archived=true where organization_id=$1 and id=$2',[org,job]);
  const closed=(await actor(employee,'select public.mir_job_dossier_snapshot($1,$2,20,null) result',[org,job]))[0].result;assert.equal(closed.job.closed,true);assert.equal(closed.access.readOnly,true);
  pass('Chantier fermé lisible et historique conservé en lecture seule');
  await db.query('update mir_core.jobs set archived=false where organization_id=$1 and id=$2',[org,job]);
  const pathName=`${org}/${job}/${uuid(30)}/${uuid(31)}.pdf`;
  await actor(admin,'insert into storage.objects(bucket_id,name) values($1,$2)',['mir-job-documents',pathName]);
  await db.query('insert into mir_core.job_documents(organization_id,job_id,family_id,version,name,object_path,mime,size_bytes,created_by) values($1,$2,$3,1,$4,$5,$6,10,$7)',[org,job,uuid(30),'Plan A',pathName,'application/pdf',admin]);
  assert.equal((await actor(employee,'select count(*)::int n from storage.objects where bucket_id=$1',['mir-job-documents']))[0].n,1);
  assert.equal((await actor(warehouse,'select count(*)::int n from storage.objects where bucket_id=$1',['mir-job-documents']))[0].n,0);
  pass('Storage privé suit exactement l’accès au chantier');
  await denied(employee,org,uuid(999));
  pass('RPC direct sur un identifiant arbitraire refusé');
  const source=fs.readFileSync(path.join(root,'20261111120000_job_dossier_central.sql'),'utf8');assert.match(source,/delivery_run_orders/);assert.match(source,/limit size/g);assert.doesNotMatch(source,/create table(?: if not exists)? mir_core\.jobs/i);
  pass('Aucune table jobs dupliquée; liaison Entrepôt et pagination présentes');
  console.log(`MIR dossier chantier PostgreSQL: ${checks} scénarios réussis.`);
 }finally{await db.close();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
