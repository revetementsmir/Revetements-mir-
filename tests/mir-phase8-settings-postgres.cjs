'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {baseline,actor,dir}=require('./fixtures/mir-chat-database.cjs');
const id=n=>'88000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=await baseline(),org=id(10),foreign=id(11),employee=id(1),other=id(2),chef=id(3),assistant=id(4),warehouse=id(5),boss=id(6),admin=id(7),outsider=id(8);let checks=0;
 const pass=name=>{checks++;console.log('PASS '+name)};
 const rpc=async(user,args,role='authenticated')=>(await actor(db,user,'select public.mir_harmony_settings($1,$2,$3) r',args,role))[0].r;
 const denied=fn=>assert.rejects(fn,error=>['42501','22023','23505'].includes(error.code));
 const migration=fs.readFileSync(path.join(dir,'20261127120000_phase8_harmony_settings.sql'),'utf8');
 try{
  for(const [o,name] of [[org,'MIR PHASE 8'],[foreign,'AUTRE ORGANISATION']])await db.query('insert into mir_core.organizations(id,name) values($1,$2)',[o,name]);
  for(const user of [employee,other,chef,assistant,warehouse,boss,admin,outsider])await db.query('insert into auth.users(id) values($1)',[user]);
  for(const [user,o,role] of [[employee,org,'employee'],[other,org,'employee'],[chef,org,'employee'],[assistant,org,'employee'],[warehouse,org,'employee'],[boss,org,'employee'],[admin,org,'admin'],[outsider,foreign,'employee']])await db.query('insert into mir_core.memberships values($1,$2,$3,true)',[o,user,role]);
  for(const [user,o,role] of [[employee,org,'employe'],[other,org,'employe'],[chef,org,'chef_equipe'],[assistant,org,'assistant'],[warehouse,org,'warehouse'],[boss,org,'boss'],[outsider,foreign,'employe']])await db.query('insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,active,configured_by) values($1,$2,$3,true,$4)',[o,user,role,admin]);
  await db.exec(migration);await db.exec(migration);pass('migration Phase 8 rejouée deux fois');

  const expected=new Map([[employee,['orders','expenses','absences','punch','jobs','chat','support']],[chef,['orders','absences','punch','jobs','chat']],[assistant,['orders','expenses','absences','punch','jobs','chat','support']],[warehouse,['orders','inventory']],[boss,['orders','expenses','absences','punch','jobs','chat','support','inventory']],[admin,['orders','expenses','absences','punch','jobs','chat','support','inventory']]]);
  for(const [user,categories] of expected){const out=await rpc(user,[org,null,null]);assert.deepEqual(out.applicable,categories);assert.equal(out.email,false);assert.equal(out.sms,false);assert.equal(out.push,false);assert.equal(out.realtime,false);assert.deepEqual(out.mandatory,['urgent','action_required']);}
  assert.equal((await rpc(assistant,[org,null,null])).role,'adjointe');assert.equal((await rpc(warehouse,[org,null,null])).role,'entrepot_livraison');assert.equal((await rpc(admin,[org,null,null])).role,'admin');pass('six rôles relus côté serveur avec catégories applicables seulement');

  const request=id(100),changes={theme:'dark',textSize:'large',reducedMotion:'on',highContrast:true,dateLocale:'fr-CA',notifications:{expenses:false,orders:true}};
  const saved=await rpc(employee,[org,request,changes]);assert.equal(saved.theme,'dark');assert.equal(saved.textSize,'large');assert.equal(saved.notifications.expenses,false);pass('apparence, accessibilité et préférences Phase 7 persistées ensemble');
  await rpc(employee,[org,request,changes]);assert.equal((await db.query('select count(*)::int n from mir_core.harmony_preference_receipts where organization_id=$1 and user_id=$2',[org,employee])).rows[0].n,1);pass('rejeu idempotent sans doublon');
  await denied(()=>rpc(employee,[org,request,{theme:'light'}]));assert.equal((await rpc(employee,[org,null,null])).theme,'dark');pass('référence rejouée avec contenu différent refusée');

  const untouched=await rpc(other,[org,null,null]);assert.equal(untouched.theme,'system');assert.equal(untouched.notifications.expenses,true);pass('deux utilisateurs de la même organisation restent isolés');
  await denied(()=>rpc(outsider,[org,null,null]));assert.equal((await rpc(outsider,[foreign,null,null])).theme,'system');pass('isolation interorganisationnelle fail-closed');
  await denied(()=>rpc(null,[org,null,null]));pass('anon refusé');
  await denied(()=>actor(db,other,'select * from mir_core.harmony_preferences where organization_id=$1 and user_id=$2',[org,employee]));pass('aucune lecture ou modification directe du réglage d’un autre utilisateur');
  await denied(()=>rpc(chef,[org,id(101),{notifications:{expenses:false}}]));await denied(()=>rpc(warehouse,[org,id(102),{notifications:{absences:false}}]));pass('catégories non applicables refusées pour Chef et Entrepôt');

  const reset=await rpc(employee,[org,id(103),{reset:true}]);assert.equal(reset.theme,'system');assert.equal(reset.textSize,'standard');assert.equal(reset.reducedMotion,'auto');assert.equal(reset.highContrast,false);assert.equal(reset.notifications.expenses,true);pass('remise à zéro restaurée côté serveur');
  const acl=(await db.query("select proacl::text acl,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_harmony_settings'")).rows[0];assert.match(acl.acl,/authenticated=X/);assert.doesNotMatch(acl.acl,/anon=X/);assert.deepEqual(acl.proconfig,['search_path=pg_catalog, mir_core']);pass('RPC authenticated seulement et SECURITY DEFINER à search_path fixe');
  assert.equal((await db.query("select count(*)::int n from information_schema.tables where table_schema='mir_core' and table_name like '%notification%preference%' ")).rows[0].n,1);pass('préférences Notifications Phase 7 réutilisées sans second système');
  assert.equal(checks,13);console.log('Phase 8 Réglages PostgreSQL: 13/13 scénarios réussis.');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
