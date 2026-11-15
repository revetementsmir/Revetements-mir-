'use strict';
// PGlite-only contract for the PR39 native Chef daily fixture. No hosted credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const org='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9',leader='ec421778-b39b-492e-9e4b-5e044015e98f',
 team='7da20261-1114-4000-8000-000000000020',job='7da20261-1114-4000-8000-000000000001',
 member='552233d5-ae18-4c14-be85-0206e6f18549',
 assigned='7da20261-1114-4000-8920-000000000001',task='7da20261-1114-4000-8930-000000000001';
const prepare=fs.readFileSync('supabase/test-only/fixtures/pr39-native-chef-today-20261115.sql','utf8'),
 close=fs.readFileSync('supabase/test-only/fixtures/pr39-native-chef-today-close-20261115.sql','utf8');
(async()=>{
 const db=new PGlite();let checks=0;
 try{
  await db.exec('create schema mir_core;create table mir_core.memberships(organization_id uuid,user_id uuid,active bool);create table mir_core.staff_capabilities(organization_id uuid,user_id uuid,active bool,staff_role text);create table mir_core.teams(organization_id uuid,id uuid,leader_id uuid);create table mir_core.jobs(organization_id uuid,id uuid,archived bool);create table mir_core.team_members(organization_id uuid,team_id uuid,user_id uuid,active bool);create table mir_core.team_day_assignments(organization_id uuid,id uuid,team_id uuid,job_id uuid,leader_id uuid,work_date date,created_by uuid,start_time time,created_at timestamptz default now(),unique(organization_id,id),unique(organization_id,team_id,work_date));create table mir_core.team_tasks(organization_id uuid,id uuid,team_id uuid,job_id uuid,work_date date,title text,created_by uuid,created_at timestamptz default now(),completed_at timestamptz,unique(organization_id,id));create table mir_core.team_attendance(organization_id uuid,assignment_id uuid,user_id uuid);');
  async function fail(sql,pattern){await assert.rejects(()=>db.exec(sql),pattern);await db.exec('rollback');}
  await fail(prepare,/MIR TEST prerequisite/);checks++;
  await db.query('insert into mir_core.memberships values($1,$2,true)',[org,leader]);
  await db.query('insert into mir_core.staff_capabilities values($1,$2,true,$3)',[org,leader,'chef_equipe']);
  await db.query('insert into mir_core.teams values($1,$2,$3)',[org,team,leader]);
  await db.query('insert into mir_core.jobs values($1,$2,false)',[org,job]);
  await db.query('insert into mir_core.team_members values($1,$2,$3,true)',[org,team,member]);
  await db.query("insert into mir_core.team_day_assignments(organization_id,id,team_id,job_id,leader_id,work_date,created_by,start_time) values($1,'7da20261-1114-4000-8000-000000000040',$2,$3,$4,'2026-11-14',$4,'07:00')",[org,team,job,leader]);
  await db.query("insert into mir_core.team_tasks(organization_id,id,team_id,job_id,work_date,title,created_by) values($1,'7da20261-1114-4000-8000-000000000060',$2,$3,'2026-11-14','Ancienne QA',$4)",[org,team,job,leader]);
  await db.exec("select set_config('mir.target_project','hxtztkmbfpmzrieccwsg',false)");
  await db.query('update mir_core.staff_capabilities set active=false where user_id=$1',[leader]);
  await fail(prepare,/authorized QA chef/);checks++;
  await db.query('update mir_core.staff_capabilities set active=true where user_id=$1',[leader]);
  await db.exec(prepare);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_day_assignments where id=$1',[assigned])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_tasks where id=$1',[task])).rows[0].n,1);checks++;
  await db.exec(prepare);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_day_assignments')).rows[0].n,2);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_tasks')).rows[0].n,2);checks++;
  await db.exec("select set_config('mir.target_project','production-forbidden',false)");
  await fail(close,/MIR TEST prerequisite/);checks++;
  await db.exec("select set_config('mir.target_project','hxtztkmbfpmzrieccwsg',false)");
  await db.query('update mir_core.team_tasks set completed_at=now() where id=$1',[task]);
  await fail(close,/QA daily record changed or referenced/);checks++;
  await db.query('update mir_core.team_tasks set completed_at=null where id=$1',[task]);
  await db.exec(close);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_day_assignments')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from mir_core.team_tasks')).rows[0].n,1);checks++;
  await db.exec(close);assert.equal((await db.query('select count(*)::int n from mir_core.team_tasks')).rows[0].n,1);checks++;
  console.log('PASS PR39 Chef date UTC : '+checks+' contrôles PGlite, garde TEST, idempotence, ancien historique et nettoyage exact');
 }finally{await db.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
