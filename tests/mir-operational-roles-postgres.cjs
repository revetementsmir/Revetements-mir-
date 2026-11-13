'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),dir=path.resolve(__dirname,'../supabase/migrations'),target='20261110120000_operational_roles_phase1.sql';
(async()=>{const db=new PGlite(),org=uuid(10),boss=uuid(1),adjointe=uuid(2),chef=uuid(3),employe=uuid(4),entrepot=uuid(5);try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema mir_core;create table mir_core.memberships(organization_id uuid,user_id uuid,role text,active boolean,primary key(organization_id,user_id));create table mir_core.staff_capabilities(organization_id uuid,user_id uuid,staff_role text,active boolean,primary key(organization_id,user_id));");
 await db.exec(fs.readFileSync(path.join(dir,target),'utf8'));
 for(const id of [boss,adjointe,chef,employe,entrepot])await db.query('insert into auth.users values($1)',[id]);
 await db.query("insert into mir_core.memberships values($1,$2,'admin',true),($1,$3,'employee',true),($1,$4,'employee',true),($1,$5,'employee',true),($1,$6,'employee',true)",[org,boss,adjointe,chef,employe,entrepot]);
 await db.query("insert into mir_core.staff_capabilities values($1,$2,'assistant',true),($1,$3,'chef_equipe',true),($1,$4,'employe',true),($1,$5,'warehouse',true)",[org,adjointe,chef,employe,entrepot]);
 const expected=new Map([[boss,'boss'],[adjointe,'adjointe'],[chef,'chef_equipe'],[employe,'employe_chantier'],[entrepot,'entrepot_livraison']]);
 for(const [id,role] of expected){await db.exec('begin;set local role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);const row=(await db.query('select public.mir_my_operational_access($1) access',[org])).rows[0].access;await db.exec('commit');assert.equal(row.role,role);assert.equal(row.navigation.length,4);assert.ok(!JSON.stringify(row).toLowerCase().includes('admin'));}
 console.log('Rôles opérationnels MIR: 5 rôles, navigation et absence de rôle Admin dans le contrat public OK');
}finally{await db.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
