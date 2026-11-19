'use strict';
// Disposable PostgreSQL engine with real migrations, roles and the actual Punch
// RPC. No hosted database, live account, mocked permissions or fake Punch rows.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const id=n=>'80000000-0000-4000-8000-'+String(n).padStart(12,'0');
const root=path.resolve(__dirname,'..'),sql=fs.readFileSync(path.join(root,'supabase/test-only/migrations/20261119015520_mir_field_temporary_jobs_test.sql'),'utf8');
assert.equal(sql,fs.readFileSync(path.join(root,'supabase/proposals/chantier-redesign/temporary-jobs-test.sql'),'utf8'),'tested migration and reviewed proposal are identical');
(async()=>{
 const db=new PGlite(),org=id(100),foreign=id(101),admin=id(1),chef=id(2),employee=id(3),assistant=id(4),boss=id(5),outsider=id(6),inactive=id(7),solo=id(8),foreignChef=id(9),foreignAdmin=id(10),unknown=id(11);let checks=0;
 const pass=label=>{checks++;console.log('PASS '+label);};
 async function actor(user,query,args=[],issuer='https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1'){
  await db.exec('begin;set local role authenticated;');
  try{await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[user||'',JSON.stringify({sub:user,iss:issuer})]);const rows=(await db.query(query,args)).rows;await db.exec('commit');return rows;}
  catch(error){await db.exec('rollback');throw error;}
 }
 const create=(user,request,payload,orgId=org)=>actor(user,'select public.mir_lead_temporary_job($1,$2,$3) r',[orgId,request,payload]).then(rows=>rows[0].r);
 const snapshot=(user,orgId=org)=>actor(user,'select public.mir_temporary_jobs_snapshot($1) r',[orgId]).then(rows=>rows[0].r);
 const complete=(user,job,request,payload,orgId=org)=>actor(user,'select public.mir_temporary_job_complete($1,$2,$3,$4) r',[orgId,job,request,payload]).then(rows=>rows[0].r);
 const punch=(user,request,action,job,payload={latitude:46.8139,longitude:-71.208})=>actor(user,'select public.mir_field_punch_action($1,$2,$3,$4,$5) r',[org,request,action,job,payload]).then(rows=>rows[0].r);
 const denied=async action=>assert.rejects(action,e=>e.code==='42501');
 const total=async table=>(await db.query('select count(*)::int n from mir_core.'+table)).rows[0].n;
 const punchRows=async()=>({shifts:(await db.query('select * from mir_core.punch_shifts order by id')).rows,segments:(await db.query('select * from mir_core.punch_segments order by id')).rows,events:(await db.query('select * from mir_core.punch_events order by id')).rows});
 try{
  await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;");
  const dir=path.join(root,'supabase/migrations');
  for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&!n.includes('mir_estimates')&&n<='20261110160000_punch_phase2_completion.sql').sort())await db.exec(fs.readFileSync(path.join(dir,name),'utf8'));
  // These existing TEST columns were verified from information_schema; the
  // old repository foundation predates this server-side job metadata.
  await db.exec("alter table mir_core.jobs add column job_number text,add column delivery_address text not null default '',add column team text not null default '',add column foreman text not null default '',add column revision integer not null default 1,add column created_at timestamptz not null default now();");
  await assert.rejects(()=>db.exec(sql),/Verified MIR TEST/);await db.exec('rollback');
  await db.exec("set mir.target_project='hxtztkmbfpmzrieccwsg';");
  await db.exec(fs.readFileSync(path.join(root,'supabase/proposals/chantier-redesign/punch-receipts-test.sql'),'utf8'));
  await db.exec(sql);await db.exec(sql);
  pass('Installation locale TEST vérifiée, rejet sans cible et réapplication additive');
  for(const user of [admin,chef,employee,assistant,boss,outsider,inactive,solo,foreignChef,foreignAdmin,unknown])await db.query('insert into auth.users(id) values($1)',[user]);
  await db.query("insert into mir_core.organizations(id,name) values($1,'MIR TEST QA'),($2,'Organisation étrangère QA')",[org,foreign]);
  for(const user of [admin,chef,employee,assistant,boss,outsider,inactive,solo,unknown])await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[org,user,user===admin?'admin':'employee']);
  for(const user of [foreignAdmin,foreignChef])await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[foreign,user,user===foreignAdmin?'admin':'employee']);
  for(const [user,role] of [[chef,'chef_equipe'],[employee,'employe'],[assistant,'assistant'],[boss,'boss'],[outsider,'employe'],[inactive,'employe'],[solo,'chef_equipe']])await actor(admin,'select public.mir_staff_configure($1,$2,$3,$4)',[org,user,role,'QA '+role]);
  await actor(foreignAdmin,'select public.mir_staff_configure($1,$2,$3,$4)',[foreign,foreignChef,'chef_equipe','Chef organisation étrangère']);
  const team=(await actor(admin,'select public.mir_team_save($1,null,$2,$3,$4) id',[org,'Équipe réelle QA',chef,[chef,employee,inactive]]))[0].id;
  await db.query('update mir_core.staff_capabilities set active=false where organization_id=$1 and user_id=$2',[org,inactive]);
  const foreignTeam=(await actor(foreignAdmin,'select public.mir_team_save($1,null,$2,$3,$4) id',[foreign,'Équipe étrangère',foreignChef,[foreignChef]]))[0].id;
  for(const user of [admin,assistant,boss,employee,outsider,inactive,unknown,foreignChef])await denied(()=>create(user,id(201),{name:'Interdit'}));
  await denied(()=>create(chef,id(202),{name:'Autre organisation'},foreign));
  await denied(()=>actor(chef,'select public.mir_lead_temporary_job($1,$2,$3)',[org,id(203),{name:'Mauvais émetteur'}],'https://foreign.example/auth/v1'));
  await denied(()=>actor(null,'select public.mir_lead_temporary_job($1,$2,$3)',[org,id(204),{name:'Anonyme'}]));
  await assert.rejects(()=>create(chef,id(205),{name:'Injection équipe',teamId:foreignTeam}),e=>e.code==='22023');
  pass('Création strictement Chef actif : employé, gestionnaires, admin technique, rôles absents, autre tenant et identité falsifiée refusés');
  const input={name:'Repère chantier QA',address:'Adresse à confirmer',latitude:46.8139,longitude:-71.208};
  const created=await create(chef,id(210),input),job=created.jobId;
  assert.equal(created.job.id,job);assert.equal(created.job.closed,false);assert.equal(created.job.temporary,true);assert.equal(created.job.revision,1);assert.equal(created.job.teamId,team);
  assert.deepEqual(created.job.assignedMemberIds.sort(),[chef,employee].sort());
  assert.equal(await total('team_day_assignments'),0);assert.equal(await total('punch_shifts'),0);
  assert.deepEqual(await create(chef,id(210),input),created);assert.equal(await total('jobs'),1);
  await assert.rejects(()=>create(chef,id(210),{...input,name:'Autre intention'}),e=>e.code==='22023');
  await denied(()=>create(solo,id(210),input));
  await assert.rejects(()=>create(chef,id(211),input),e=>e.code==='23505');assert.equal(await total('jobs'),1);
  pass('Vraie équipe active uniquement, aucun Punch/affectation implicite, rejeu unique et aucun détournement de job existante');
  const single=await create(solo,id(220),{name:'Chantier Chef sans équipe'});
  assert.equal(single.job.teamId,null);assert.equal(single.job.teamAssigned,false);assert.deepEqual(single.job.assignedMemberIds,[solo]);
  assert.equal((await snapshot(solo)).canCreate,true);assert.equal((await snapshot(solo)).teamAssigned,false);
  assert.equal((await snapshot(employee)).jobs.some(j=>j.id===job),true);assert.equal((await snapshot(outsider)).jobs.length,0);
  assert.equal((await snapshot(employee)).jobs.some(j=>j.id===single.jobId),false);
  assert.equal((await snapshot(assistant)).canComplete,true);assert.equal((await snapshot(boss)).canComplete,true);await denied(()=>snapshot(admin));
  pass('Chef sans équipe utilisable sans inventer une équipe; liste et capacités contrôlées par identité');
  await actor(admin,"select public.mir_punch_admin($1,'settings',$2)",[org,{enabled:true,gpsEnabled:true,gpsRequired:true,radiusM:250,outsidePolicy:'block',outsideReasonRequired:true,offlineEnabled:true,autoBreakEnabled:true,breakThresholdMinutes:300,breakMinutes:15,travelRule:'separate',bankEnabled:false,bankMultiplier:1}]);
  await assert.rejects(()=>punch(employee,id(300),'in',job,{}),/GPS requise/);
  await assert.rejects(()=>punch(employee,id(301),'in',job,{latitude:0,longitude:0}),/hors zone bloqué/);
  await denied(()=>punch(outsider,id(302),'in',job));
  const chefIn=await punch(chef,id(310),'in',job),employeeIn=await punch(employee,id(311),'in',job);
  assert.notEqual(chefIn.shiftId,employeeIn.shiftId);assert.notEqual(chefIn.segmentId,employeeIn.segmentId);
  const before=await punchRows();assert.equal(before.shifts.length,2);assert.equal(before.shifts.every(s=>[chef,employee].includes(s.employee_id)),true);
  const completion={expectedRevision:1,number:'QA-855',name:'Chantier confirmé QA',address:'855 rue Exemple',city:'Québec'};
  for(const user of [chef,employee,outsider,admin,foreignChef,unknown])await denied(()=>complete(user,job,id(320),completion));
  await denied(()=>complete(assistant,job,id(321),completion,foreign));
  await denied(()=>complete(assistant,id(999),id(322),completion));
  await denied(()=>complete(assistant,job,id(323),{...completion,teamId:foreignTeam}));
  const saved=await complete(assistant,job,id(330),completion);
  assert.equal(saved.jobId,job);assert.equal(saved.job.id,job);assert.equal(saved.job.revision,2);assert.equal(saved.job.detailsStatus,'complete');assert.equal(saved.job.temporary,false);
  assert.deepEqual(await punchRows(),before);assert.deepEqual(await complete(assistant,job,id(330),completion),saved);
  assert.deepEqual(await punch(chef,id(310),'in',job),chefIn);assert.deepEqual(await punch(employee,id(311),'in',job),employeeIn);
  pass('Chef et équipier pointent leurs propres heures; GPS conservé; Adjointe complète le même UUID sans modifier quart, segment ni événement');
  await assert.rejects(()=>complete(boss,job,id(331),completion),e=>e.code==='40001');
  await denied(()=>complete(boss,job,id(330),completion));
  await assert.rejects(()=>complete(assistant,job,id(330),{...completion,address:'Réutilisation incorrecte'}),e=>e.code==='22023');
  const revised=await complete(boss,job,id(332),{...completion,expectedRevision:2,address:'855 rue Exemple, porte B'});
  assert.equal(revised.job.revision,3);assert.equal(revised.job.id,job);assert.deepEqual(await punchRows(),before);
  assert.equal((await snapshot(assistant)).jobs.find(j=>j.id===job).revision,3);
  await complete(assistant,job,id(330),completion);assert.equal((await snapshot(assistant)).jobs.find(j=>j.id===job).revision,3);
  assert.equal((await db.query("select count(*)::int n from mir_core.temporary_job_requests where job_id=$1 and operation='complete' and before_value is not null",[job])).rows[0].n,2);
  pass('Modifications suivantes sur même job, audit avant/après, conflits de révision et idempotence après complétion');
  await punch(solo,id(340),'in',single.jobId);
  const singleAssigned=await complete(assistant,single.jobId,id(341),{expectedRevision:1,number:'QA-856',name:'Chantier affecté après création',address:'856 rue Exemple',teamId:team});
  assert.deepEqual(singleAssigned.job.assignedMemberIds.sort(),[solo,chef,employee].sort());
  await punch(solo,id(342),'out',single.jobId);await punch(chef,id(343),'out',job);await punch(employee,id(344),'out',job);
  const after=await punchRows();
  for(const original of before.shifts){const s=after.shifts.find(x=>x.id===original.id);assert.ok(s.ended_at);assert.equal(s.employee_id,original.employee_id);}
  for(const original of before.segments){const s=after.segments.find(x=>x.id===original.id);assert.ok(s.ended_at);assert.equal(s.job_id,job);assert.equal(s.shift_id,original.shift_id);}
  const history=(await actor(employee,'select public.mir_punch_snapshot($1,null) r',[org]))[0].r;
  assert.ok(history.week.some(s=>s.id===employeeIn.shiftId));
  pass('Affectation ultérieure par union : aucun membre historique retiré, sorties et historique restent possibles');
  await db.query('update mir_core.staff_capabilities set active=false where organization_id=$1 and user_id=$2',[org,chef]);
  await denied(()=>create(chef,id(210),input));
  await db.query('update mir_core.memberships set active=false where organization_id=$1 and user_id=$2',[org,assistant]);
  await denied(()=>complete(assistant,job,id(330),completion));
  for(const table of ['temporary_job_details','temporary_job_requests'])await denied(()=>actor(employee,'select * from mir_core.'+table));
  const exposed=(await db.query("select p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('mir_lead_temporary_job','mir_temporary_jobs_snapshot','mir_temporary_job_complete')")).rows;
  assert.equal(exposed.length,3);assert.ok(exposed.every(p=>!p.prosecdef));
  assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relname in('temporary_job_details','temporary_job_requests') and c.relrowsecurity")).rows[0].n,2);
  pass('Révocation immédiate même en rejeu, tables privées RLS et wrappers publics sans privilèges élevés');
  console.log('PASS Temporary jobs: '+checks+' PostgreSQL scenario groups; no hosted writes.');
 }finally{await db.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
