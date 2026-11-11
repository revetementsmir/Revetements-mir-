'use strict';
// Disposable DB only. Binary analysis is separately tested in the service suite.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {baseline,actor,dir}=require('./fixtures/mir-chat-database.cjs');
const id=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=await baseline(),org=id(10),foreign=id(11),user=id(1),peer=id(2),other=id(3),con=id(20),foreignCon=id(21);let checks=0;
 const run=f=>db.exec(fs.readFileSync(f,'utf8')),one=async(u,name,args=[],role='authenticated')=>(await actor(db,u,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args,role))[0].r;
 const deny=async fn=>assert.rejects(fn,e=>['42501','22023'].includes(e.code));const pass=n=>{checks++;console.log('PASS '+n);};
 const prepare=path.join(dir,'20261115134647_chat_phase3a_private_file_gateway.sql'),activate=path.join(dir,'../proposals/20261116135048_chat_phase3a_private_file_activate.sql');
 try{
  await db.query('insert into mir_core.organizations(id,name) values($1,$2),($3,$4)',[org,'A fictif',foreign,'B fictif']);
  for(const [u,o]of [[user,org],[peer,org],[other,foreign]]){await db.query('insert into auth.users(id) values($1)',[u]);await db.query("insert into mir_core.memberships values($1,$2,'employee',true)",[o,u]);}
  for(const [c,o,u]of [[con,org,user],[foreignCon,foreign,other]]){await db.query("insert into mir_core.conversations(organization_id,id,kind,created_by) values($1,$2,'private',$3)",[o,c,u]);await db.query('insert into mir_core.conversation_participants values($1,$2,$3,true,now())',[o,c,u]);}
  await db.query('insert into mir_core.conversation_participants values($1,$2,$3,true,now())',[org,con,peer]);
  await run(path.join(dir,'20261112114958_chat_phase3a_security.sql'));await run(path.join(dir,'20261114131000_chat_phase3a_storage_upload_probe.sql'));
  const objectPath=`${org}/message/${con}/${user}/${id(30)}.png`,oid=id(50);
  await db.query('insert into storage.objects(id,bucket_id,name,owner,owner_id,metadata) values($1,$2,$3,$4::uuid,$4::text,$5)',[oid,'mir-internal',objectPath,user,{mimetype:'image/png',size:70}]);
  const policies=async()=>JSON.stringify((await db.query("select * from pg_policies where not(schemaname='storage' and policyname in('mir_chat_phase3a_insert','mir_chat_phase3a_select')) order by schemaname,tablename,policyname")).rows);
  const before=await policies();await run(prepare);const catalog=(await db.query('select mir_core.chat_file_gateway_catalog() hash')).rows[0].hash;await run(prepare);assert.equal((await db.query('select mir_core.chat_file_gateway_catalog() hash')).rows[0].hash,catalog);pass('préparation complète répétée sans changement et sans activation');
  assert.equal((await one(peer,'mir_chat_file_authorize',[org,con,objectPath])).objectId,oid);await deny(()=>one(other,'mir_chat_file_authorize',[org,con,objectPath]));await deny(()=>one(user,'mir_chat_file_authorize',[foreign,foreignCon,objectPath]));pass('accès courant propriétaire et lecteur, isolation des deux tenants');
  await deny(()=>one(user,'mir_chat_file_record',[oid,'','a'.repeat(64),'png-crc-inflate-v1',user]));await deny(()=>actor(db,user,'select * from mir_core.chat_file_validations'));pass('aucune auto-attestation ni lecture directe utilisateur');
  await run(activate);await run(activate);await run(prepare);await run(path.join(dir,'20261112114958_chat_phase3a_security.sql'));pass('activation deux fois puis préparation et migration initiale répétables');
  assert.equal(await policies(),before);pass('autres policies partagées strictement conservées');
  assert.equal((await actor(db,user,'select count(*)::int n from storage.objects where name=$1',[objectPath]))[0].n,0);await deny(()=>actor(db,user,'insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values($1,$2,$3::uuid,$3::text,$4)',['mir-internal',objectPath.replace(id(30),id(31)),user,{mimetype:'image/png',size:70}]));pass('accès et upload Storage directs chat fermés même pour propriétaire');
  await deny(()=>one(user,'mir_message_attachment_validate',[org,con,objectPath]));pass('métadonnées seules insuffisantes pour rattacher un PNG');
  const record=()=>one(null,'mir_chat_file_record',[oid,'','a'.repeat(64),'png-crc-inflate-v1',user],'service_role');await record();await record();assert.equal((await db.query('select count(*)::int n from mir_core.chat_file_validations')).rows[0].n,1);await one(user,'mir_message_attachment_validate',[org,con,objectPath]);pass('attestation serveur bornée et idempotente, rattachement autorisé après analyse');
  await deny(()=>one(null,'mir_chat_file_record',[oid,'','b'.repeat(64),'png-crc-inflate-v1',user],'service_role'));await deny(()=>one(null,'mir_chat_file_record',[oid,'','a'.repeat(64),'png-crc-inflate-v1',other],'service_role'));pass('version/faits différents et acteur étranger refusés');
  for(const p of [objectPath.replace(id(30),'%2e%2e'),objectPath.replace(id(30),'%252e%252e'),objectPath+'/../x'])await deny(()=>one(user,'mir_chat_file_authorize',[org,con,p]));pass('traversées et encodages refusés par le serveur SQL');
  await db.query('update mir_core.conversation_participants set active=false where organization_id=$1 and conversation_id=$2 and user_id=$3',[org,con,peer]);await deny(()=>one(peer,'mir_chat_file_authorize',[org,con,objectPath]));await db.query('update mir_core.conversation_participants set active=true where organization_id=$1 and conversation_id=$2 and user_id=$3',[org,con,peer]);await one(peer,'mir_chat_file_authorize',[org,con,objectPath]);pass('retrait immédiat et réintégration sans altérer la preuve ou le fichier');
  const acl=(await db.query("select has_function_privilege('anon','public.mir_chat_file_authorize(uuid,uuid,text)','EXECUTE') anon,has_function_privilege('authenticated','public.mir_chat_file_record(uuid,text,text,text,uuid)','EXECUTE') authattest,has_function_privilege('service_role','public.mir_chat_file_record(uuid,text,text,text,uuid)','EXECUTE') serverattest")).rows[0];assert.deepEqual(acl,{anon:false,authattest:false,serverattest:true});pass('grants explicites minimaux et aucun nouveau rôle');
  await db.exec('comment on table mir_core.chat_file_validations is null');await assert.rejects(()=>run(prepare),/incompatible/);await db.exec('rollback');pass('schéma partiel ou dérivé refusé');
  console.log(`Gateway PostgreSQL: ${checks} scénarios réussis.`);
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
