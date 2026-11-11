'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const Portal=require('../dist/portal-client.js'),config=require('./mir-account-config-helper.cjs')();
const id='30000000-0000-4000-8000-000000000001',org='30000000-0000-4000-8000-000000000010',conversation='30000000-0000-4000-8000-000000000100';
async function setup(){
 const calls=[];let hold,resolve;
 const snapshot={mode:'connected',demo:false,actorId:id,members:[{id,role:'employee',active:true}],jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}};
 const sdk={auth:{getUser:async()=>({data:{user:{id}}}),onAuthStateChange:()=>({}),signOut:async()=>({})},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name===hold)await new Promise(r=>resolve=r);
  if(name==='mir_account_snapshot')return {data:{userId:id,role:'employee',organizationId:org}};
  if(name==='mir_portal_snapshot')return {data:snapshot};
  if(name==='mir_employee_operations_snapshot')return {data:{role:'employe'}};
  if(name==='mir_messaging_snapshot')return {data:{contacts:[],teams:[],messages:[],conversations:[]}};
  if(name==='mir_punch_snapshot')return {data:{enabled:false}};
  return {data:{items:[],hasMore:false,nextCursor:null}};
 },storage:{from:bucket=>({async createSignedUrl(path,ttl){calls.push({bucket,path,ttl});if(hold==='storage')await new Promise(r=>resolve=r);return {data:{signedUrl:'https://example.invalid/signed-fixture'}};}})}};
 const client=Portal.create({config,sdk:{createClient:()=>sdk},operationStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 await client.start();assert.equal(client.getStatus().phase,'ready');
 return {client,calls,hold(name){hold=name;},resolve(){resolve({});},waiting(){return !!resolve;}};
}
test('API chat utilise organisation vérifiée, limite bornée et curseur opaque',async t=>{
 const {client,calls}=await setup();t.after(()=>client.dispose());const cursor={id:conversation,sentAt:'2026-11-11T12:00:00Z'};
 await client.chatMessages(conversation,cursor,9999);assert.deepEqual(calls.at(-1),{name:'mir_chat_messages',args:{org,conversation,page_size:50,page_before:cursor}});
 await client.chatConversations(null,-1);assert.equal(calls.at(-1).args.page_size,1);
 await client.chatSearch('texte',cursor);assert.equal(calls.at(-1).name,'mir_chat_search');
 await client.validateMessageAttachment(conversation,'forged');assert.equal(calls.at(-1).name,'mir_message_attachment_validate');
 await client.ackChatMessage(conversation);assert.deepEqual(calls.at(-1).args,{org,message:conversation,state:'read'});
 await client.openConversation('job',conversation);assert.equal(calls.at(-1).name,'mir_conversation_open');
 await assert.rejects(()=>client.chatMessages('bad'),/invalide/i);
});
test('réponse chat tardive après déconnexion rejetée',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());s.hold('mir_chat_messages');const reading=s.client.chatMessages(conversation);
 while(!s.waiting())await new Promise(r=>setImmediate(r));await s.client.signOut();s.resolve();await assert.rejects(reading,/session a changé/i);
 await assert.rejects(()=>s.client.chatConversations(),/connectez-vous/i);
});
test('fichiers privés: URL signée 300 secondes et réponse tardive rejetée',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());const path=`${org}/message/${conversation}/${id}/${conversation}.jpg`;
 assert.equal(await s.client.chatPhotoURL(path),'https://example.invalid/signed-fixture');assert.deepEqual(s.calls.at(-1),{bucket:'mir-internal',path,ttl:300});
 await assert.rejects(()=>s.client.chatPhotoURL('foreign/message/file'),/invalide/i);
 s.hold('storage');const reading=s.client.chatPhotoURL(path);while(!s.waiting())await new Promise(r=>setImmediate(r));await s.client.signOut();s.resolve();await assert.rejects(reading,/session a changé/i);
});
test('migration sans DROP POLICY/FUNCTION, bornes serveur et ACL explicites',()=>{
 const migration=fs.readFileSync('supabase/migrations/20261112114958_chat_phase3a_security.sql','utf8');
 assert.doesNotMatch(migration,/drop\s+(policy|function|table)|truncate|disable row level security/i);
 assert.match(migration,/Schéma clavardage partiel ou incompatible/);assert.match(migration,/Already identical/);
 assert.equal((migration.match(/least\(greatest\(coalesce\(page_size,20\),1\),50\)/g)||[]).length,3);
 assert.match(migration,/auth\.uid\(\) is not null and member=auth\.uid\(\)/);
 assert.match(migration,/chat_storage_object\(obj.name,obj.owner,obj.owner_id,obj.metadata\)/);
 assert.match(migration,/as restrictive/g);assert.match(migration,/revoke all on function/);
 assert.doesNotMatch(migration,/grant\s+(all|select|insert|update|delete)\s+on\s+(table\s+)?mir_core\./i);
});
test('modules protégés inchangés; cartes Aujourd’hui et fonctions Punch conservées',()=>{
 const baseline=require('./fixtures/mir-chat-baseline.json'),hash=x=>createHash('sha256').update(x).digest('hex');
 for(const [file,value]of Object.entries(baseline.files))assert.equal(hash(fs.readFileSync(file)),value,file);
 const source=fs.readFileSync('dist/chantier-app.js','utf8');
 for(const [name,value]of Object.entries(baseline.functions)){const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+1);assert.ok(start>=0,name);assert.equal(hash(source.slice(start,end<0?undefined:end)),value,name);}
 const client=fs.readFileSync('dist/portal-client.js','utf8');assert.match(client,/createSignedUrl\(path,300\)/);assert.doesNotMatch(client,/getPublicUrl/);
});
