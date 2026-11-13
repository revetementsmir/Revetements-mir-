'use strict';
/* Contrat serveur réel UX Commandes + Pliages dans PostgreSQL jetable.
 * Auth est simulée par rôle PostgreSQL; aucun service Supabase hébergé. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const ROOT=path.join(__dirname,'../supabase'),uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{
 const db=new PGlite(),org=uuid(10),foreignOrg=uuid(11),admin=uuid(1),employeeA=uuid(2),employeeB=uuid(3),assistant=uuid(4),outsider=uuid(5),job=uuid(20),linkedJob=uuid(21);
 let checks=0;const ok=name=>{checks++;console.log('PASS '+name);};
 async function actor(user,sql,params=[]){await db.exec('begin;set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const out=await db.query(sql,params);await db.exec('commit');return out.rows;}catch(error){await db.exec('rollback');throw error;}}
 async function fail(user,sql,params=[],pattern){await assert.rejects(()=>actor(user,sql,params),error=>!pattern||pattern.test(error.message));}
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,unique(bucket_id,name));alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;");
  const dir=path.join(ROOT,'migrations');
  for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')&&!x.includes('mir_estimates')&&!x.includes('mir_estimate_recipe')&&!x.includes('chat_phase3a')&&!x.includes('chat_phase3b')&&!x.includes('phase3c')&&!x.includes('client_center_20261110')&&!x.includes('phase6_commandes')&&!x.includes('phase7_notifications')&&!x.includes('phase7_expense_notifications')&&!x.includes('phase8_harmony_settings')).sort())await db.exec(fs.readFileSync(path.join(dir,file),'utf8'));
  for(const file of ['202611070006_warehouse_stock_qr.sql','202611070007_order_coordination.sql','202611070008_order_coordination_operations.sql','202611070009_order_supplier_purchases.sql'])await db.exec(fs.readFileSync(path.join(ROOT,'proposals',file),'utf8'));
  for(const file of ['20261124120000_phase6_commandes.sql','20261124123000_phase6_commandes_roles.sql','20261124124500_phase6_commandes_roles_fail_closed.sql','20261124130000_phase6_commandes_warehouse_role.sql','20261125120000_phase6_commandes_ux_pliages.sql'])await db.exec(fs.readFileSync(path.join(dir,file),'utf8'));
  const migration=fs.readFileSync(path.join(dir,'20261125130000_phase6_commandes_ux_server_contract.sql'),'utf8');await db.exec(migration);await db.exec(migration);ok('migration serveur rejouée deux fois');
  const notificationsMigration=fs.readFileSync(path.join(dir,'20261126120000_phase7_notifications.sql'),'utf8');await db.exec(notificationsMigration);await db.exec(notificationsMigration);ok('migration notifications rejouée deux fois');
  await db.exec("insert into auth.users(id) values('"+[admin,employeeA,employeeB,assistant,outsider].join("'),('")+"');");
  await db.query("insert into mir_core.organizations(id,name) values($1,'MIR TEST'),($2,'AUTRE TEST')",[org,foreignOrg]);
  for(const [id,role] of [[admin,'admin'],[employeeA,'employee'],[employeeB,'employee'],[assistant,'employee']])await db.query('insert into mir_core.memberships(organization_id,user_id,role,active) values($1,$2,$3,true)',[org,id,role]);
  await db.query("insert into mir_core.memberships(organization_id,user_id,role,active) values($1,$2,'employee',true)",[foreignOrg,outsider]);
  for(const [id,role] of [[employeeA,'employe'],[employeeB,'employe'],[assistant,'assistant']])await db.query('insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,active,configured_by) values($1,$2,$3,true,$4)',[org,id,role,admin]);
  await db.query("insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,active,configured_by) values($1,$2,'employe',true,$3)",[foreignOrg,outsider,admin]);
  await db.query("insert into mir_core.jobs(organization_id,id,name) values($1,$2,'JOB 100'),($1,$3,'JOB 200')",[org,job,linkedJob]);
  await db.query('insert into mir_core.job_memberships(organization_id,job_id,user_id) values($1,$2,$3)',[org,job,employeeA]);
  await actor(admin,'select public.mir_coordination_grant($1,$2,true)',[org,assistant]);
  const itemIds=Array.from({length:8},(_,i)=>uuid(100+i));
  for(let i=0;i<itemIds.length;i++)await db.query("insert into mir_core.catalogue_items(organization_id,id,name,channel,published,specification) values($1,$2,$3,'store',true,$4)",[org,itemIds[i],i===2?'Pliage approuvé':'Matériel '+i,i===2?{unit:'pièce',customBending:true,measureFields:[{key:'A'}]}:{unit:'boîte'}]);
  const payload={jobId:job,lines:[
   {itemId:itemIds[0],quantity:2,colorId:'noir'},
   {itemId:itemIds[1],quantity:3,formatId:'standard'},
   {itemId:itemIds[2],quantity:4,colorId:'blanc',dimensionsIn:{A:6},specification:{}},
   {itemId:'sur-mesure-1',quantity:5,colorId:'noir',dimensionsIn:{A:4,B:8},specification:{kind:'fold',templateSnapshot:{schema:'mir-production-template-1',version:1},instanceSnapshot:{schema:'mir-production-instance-1',templateId:'sur-mesure-1',values:{measurements:{A:4,B:8},length:120,repere:'P-4'}}}}
  ],note:'RECETTE UX',deliveryMode:'delivery'};
  const draft=(await actor(employeeA,'select public.mir_order_draft_save($1,$2,null,$3) result',[org,uuid(500),payload]))[0].result;assert.equal(draft.status,'draft');ok('création du brouillon serveur');
  const lines=(await db.query('select specification,quantity from mir_core.order_lines where organization_id=$1 and order_id=$2 order by quantity',[org,draft.orderId])).rows;assert.equal(lines.length,4);assert.deepEqual(lines.slice(0,2).map(x=>Number(x.quantity)),[2,3]);ok('deux articles dans le même brouillon');
  assert.equal(lines.find(x=>Number(x.quantity)===4).specification.kind,'fold');ok('pliage de banque conservé');
  const custom=lines.find(x=>Number(x.quantity)===5).specification;assert.equal(custom.instanceSnapshot.values.repere,'P-4');ok('pliage sur mesure et instantané conservés');
  await fail(employeeA,'select public.mir_order_create_submit($1,$2,$3)',[org,uuid(501),{...payload,lines:[{itemId:itemIds[0],quantity:0}]}],/quantité|Ligne/i);ok('quantité zéro refusée');
  const submitted=(await actor(employeeA,'select public.mir_order_submit($1,$2,$3) result',[org,uuid(502),draft.orderId]))[0].result;assert.equal(submitted.status,'submitted');ok('soumission du brouillon');
  const assistantCenter=(await actor(assistant,"select public.mir_notification_center($1,'all',30,null) result",[org]))[0].result;assert.equal(assistantCenter.unreadCount,1);assert.equal(assistantCenter.items[0].module,'orders');assert.equal(assistantCenter.items[0].priority,'action_required');ok('événement commande routé à l Adjointe');
  const noticeId=assistantCenter.items[0].id;const marked=(await actor(assistant,"select public.mir_notification_state($1,$2,array[$3]::uuid[],'read') result",[org,uuid(700),noticeId]))[0].result;assert.equal(marked.unreadCount,0);ok('notification marquée lue et compteur serveur exact');
  const unread=(await actor(assistant,"select public.mir_notification_state($1,$2,array[$3]::uuid[],'unread') result",[org,uuid(701),noticeId]))[0].result;assert.equal(unread.unreadCount,1);ok('notification remise non lue');
  const employeeCenter=(await actor(employeeA,"select public.mir_notification_center($1,'all',30,null) result",[org]))[0].result;assert.equal(employeeCenter.items.length,0);ok('Employé ne reçoit pas la file de traitement');
  await fail(employeeB,"select public.mir_notification_state($1,$2,array[$3]::uuid[],'read')",[org,uuid(702),noticeId],/absente|interdite/i);ok('second Employé ne peut pas modifier la notification');
  const prefs=(await actor(employeeA,"select public.mir_notification_preferences($1,$2) result",[org,{chat:false}]))[0].result;assert.equal(prefs.categories.chat,false);assert.deepEqual(prefs.mandatory,['urgent','action_required']);ok('préférences non essentielles et obligatoires séparées');
  assert.equal(submitted.receiptId,uuid(502));ok('reçu serveur vérifiable');
  const replay=(await actor(employeeA,'select public.mir_order_submit($1,$2,$3) result',[org,uuid(502),draft.orderId]))[0].result;assert.equal(replay.orderId,draft.orderId);assert.equal(replay.idempotent,true);ok('soumission idempotente sans doublon');
  const assigned=(await actor(employeeA,'select public.mir_order_create_submit($1,$2,$3) result',[org,uuid(503),payload]))[0].result;assert.equal(assigned.jobMatchStatus,'matched');ok('commande avec chantier assigné');
  const pendingPayload={...payload,jobId:undefined,jobReference:'Je ne connais pas le numéro'};
  const pending=(await actor(employeeA,'select public.mir_order_create_submit($1,$2,$3) result',[org,uuid(504),pendingPayload]))[0].result;assert.equal(pending.jobMatchStatus,'to_confirm');ok('commande chantier à confirmer');
  const before=(await db.query('select pending_job_original_reference,pending_job_reference from mir_core.orders where organization_id=$1 and id=$2',[org,pending.orderId])).rows[0];assert.equal(before.pending_job_original_reference,'Je ne connais pas le numéro');ok('référence originale persistée');
  const linked=(await actor(assistant,'select public.mir_order_link_job($1,$2,$3,$4,$5) result',[org,uuid(505),pending.orderId,linkedJob,'Rapprochement vérifié']))[0].result;assert.equal(linked.originalJobReference,'Je ne connais pas le numéro');ok('rattachement Adjointe historisé sans écraser origine');
  const favAdd=(await actor(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,true,null) result',[org,uuid(510),'material',itemIds[0]]))[0].result;assert.equal(favAdd.count,1);ok('favori article ajouté');
  const favRemove=(await actor(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,false,null) result',[org,uuid(511),'material',itemIds[0]]))[0].result;assert.equal(favRemove.count,0);ok('favori article retiré et mode populaire réactivable');
  await actor(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,true,null)',[org,uuid(512),'fold',itemIds[2]]);await actor(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,false,null)',[org,uuid(513),'fold',itemIds[2]]);ok('favori pliage ajouté puis retiré');
  for(const [i,itemId] of [itemIds[0],itemIds[1],itemIds[3],itemIds[4],itemIds[5],itemIds[6]].entries())await actor(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,true,null)',[org,uuid(520+i),'material',itemId]);await fail(employeeA,'select public.mir_order_shortcut_update($1,$2,$3,$4,true,null)',[org,uuid(526),'material',itemIds[7]],/six favoris/i);ok('limite de six favoris appliquée');
  const popular=(await actor(employeeA,'select public.mir_order_shortcut_snapshot($1) result',[org]))[0].result;assert.equal(popular.material.length,6);ok('instantané raccourcis limité à l utilisateur courant');
  const employeeBRows=await actor(employeeB,'select count(*)::int n from mir_core.order_shortcut_favorites');assert.equal(employeeBRows[0].n,0);ok('isolation entre deux Employés');
  await fail(employeeA,'select public.mir_order_shortcut_snapshot($1)',[foreignOrg],/Employé actif|42501/);ok('isolation organisationnelle');
  await fail(assistant,'select public.mir_order_shortcut_update($1,$2,$3,$4,true,null)',[org,uuid(530),'material',itemIds[7]],/Employé actif|42501/);await fail(admin,'select public.mir_order_create_submit($1,$2,$3)',[org,uuid(531),payload],/Employé actif|42501/);ok('rôles non autorisés refusés');
  const events=(await db.query("select event_type,details from mir_core.order_events where organization_id=$1 and order_id=$2 order by created_at",[org,pending.orderId])).rows;assert.ok(events.some(e=>e.event_type==='job-linked'&&e.details.originalReference==='Je ne connais pas le numéro'));ok('historique immuable relu');
  assert.equal((await db.query("select count(*)::int n from mir_core.orders where organization_id=$1 and id=$2",[org,draft.orderId])).rows[0].n,1);ok('aucun doublon après rejeu');
  assert.equal(checks,30);console.log('MIR UX Commandes + notifications serveur: 30/30 scénarios réussis; PostgreSQL jetable, aucun service hébergé.');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
