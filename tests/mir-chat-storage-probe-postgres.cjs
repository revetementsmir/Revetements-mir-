'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {baseline,actor,dir}=require('./fixtures/mir-chat-database.cjs');
const id=n=>'50000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{const db=await baseline(),org=id(10),other=id(11),user=id(1),second=id(2),con=id(20);let checks=0;
 const core=fs.readFileSync(path.join(dir,'20261112114958_chat_phase3a_security.sql'),'utf8');
 const fix=fs.readFileSync(path.join(dir,'20261114131000_chat_phase3a_storage_upload_probe.sql'),'utf8');
 const pass=n=>{checks++;console.log('PASS '+n);};
 const insert=(name,owner,metadata)=>actor(db,user,'insert into storage.objects(bucket_id,name,owner,metadata) values($1,$2,$3,$4)',['mir-internal',name,owner,metadata]);
 const file=n=>`${org}/message/${con}/${user}/${id(n)}.png`;
 const validate=p=>actor(db,user,'select public.mir_message_attachment_validate($1,$2,$3)',[org,con,p]);
 try{
  await db.query('insert into mir_core.organizations(id,name) values($1,$2),($3,$4)',[org,'Fictif A',other,'Fictif B']);
  for(const u of [user,second]){await db.query('insert into auth.users(id) values($1)',[u]);await db.query("insert into mir_core.memberships values($1,$2,'employee',true)",[org,u]);}
  await db.query("insert into mir_core.conversations(organization_id,id,kind,created_by) values($1,$2,'private',$3)",[org,con,user]);
  for(const u of [user,second])await db.query('insert into mir_core.conversation_participants values($1,$2,$3,true,now())',[org,con,u]);
  await db.exec(core);
  await assert.rejects(()=>insert(file(30),user,null),e=>e.code==='42501');pass('refus réel reproduit: préautorisation sans métadonnées');
  const preserved=async()=>JSON.stringify((await db.query("select * from pg_policies where not(schemaname='storage' and policyname='mir_chat_phase3a_insert') order by schemaname,tablename,policyname")).rows);
  const before=await preserved();await db.exec(fix);const cat=(await db.query('select mir_core.chat_phase3a_catalog() hash')).rows[0].hash;
  await db.exec(fix);await db.exec(core);assert.equal((await db.query('select mir_core.chat_phase3a_catalog() hash')).rows[0].hash,cat);pass('correctif deux fois puis migration initiale: répétabilité complète');
  assert.equal(await preserved(),before);pass('toutes les autres policies inchangées');
  await insert(file(31),user,null);await insert(file(32),user,{});await insert(file(33),user,{mimetype:'image/png',contentLength:68});pass('sondes Storage historiques et actuelles acceptées');
  for(const n of [31,32,33]){assert.equal((await actor(db,user,'select count(*)::int n from storage.objects where name=$1',[file(n)]))[0].n,0);await assert.rejects(()=>validate(file(n)),e=>e.code==='22023');}pass('sondes sans métadonnées finales: ni lisibles ni rattachables');
  await insert(file(34),user,{mimetype:'image/png',size:68});await validate(file(34));pass('objet final valide accepté');
  for(const metadata of [{mimetype:'text/plain',size:68},{mimetype:'image/jpeg',size:68},{mimetype:'image/png',size:0},{mimetype:'image/png',size:10485761},{mimetype:'image/png',contentLength:10485761}])await assert.rejects(()=>insert(file(40),user,metadata),e=>e.code==='42501');pass('MIME déclaré, extension et taille invalides refusés');
  for(const name of [file(41).replace(org,other),file(42).replace(con,id(21)),file(43).replace('/'+user+'/', '/'+second+'/'),file(44).replace('.png','.exe'),file(45)+'/../x'])await assert.rejects(()=>insert(name,user,null),e=>e.code==='42501');pass('autres tenants, conversations, propriétaires, chemins refusés même sans métadonnées');
  await db.query('update mir_core.conversation_participants set active=false where organization_id=$1 and user_id=$2',[org,user]);await assert.rejects(()=>insert(file(46),user,null),e=>e.code==='42501');pass('accès retiré immédiatement refusé');
  const grants=(await db.query("select has_function_privilege('anon','mir_core.chat_storage_upload(text,uuid,text,jsonb)','EXECUTE') anon,has_function_privilege('authenticated','mir_core.chat_storage_upload(text,uuid,text,jsonb)','EXECUTE') auth")).rows[0];assert.deepEqual(grants,{anon:false,auth:true});pass('grants minimaux explicites, aucun SECURITY DEFINER supplémentaire');
  await db.exec("comment on function mir_core.chat_storage_upload(text,uuid,text,jsonb) is null");await assert.rejects(()=>db.exec(fix),/partiel|incompatible/);await db.exec('rollback');pass('état partiel refusé transactionnellement');
  console.log(`Storage probe PostgreSQL: ${checks} scénarios réussis.`);
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
