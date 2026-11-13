'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const Portal=require('../dist/portal-client.js'),config=require('./mir-account-config-helper.cjs')();
const id='30000000-0000-4000-8000-000000000001',org='30000000-0000-4000-8000-000000000010',conversation='30000000-0000-4000-8000-000000000100';
async function setup(){
 const calls=[];let hold,resolve;
 const snapshot={mode:'connected',demo:false,actorId:id,members:[{id,role:'employee',active:true}],jobs:[],planVersions:[],catalogue:[],orders:[],deliveries:[],movements:[],inventory:{},favorites:{}};
 const sdk={auth:{getUser:async()=>({data:{user:{id}}}),getSession:async()=>({data:{session:{access_token:'test-user-session-not-a-secret'}}}),onAuthStateChange:()=>({}),signOut:async()=>({})},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name===hold)await new Promise(r=>resolve=r);
  if(name==='mir_account_snapshot')return {data:{userId:id,role:'employee',organizationId:org}};
  if(name==='mir_portal_snapshot')return {data:snapshot};
  if(name==='mir_employee_operations_snapshot')return {data:{role:'employe'}};
  if(name==='mir_messaging_snapshot')return {data:{contacts:[],teams:[],messages:[],conversations:[]}};
  if(name==='mir_punch_snapshot')return {data:{enabled:false}};
  return {data:{items:[],hasMore:false,nextCursor:null}};
 },storage:{from:bucket=>({async createSignedUrl(path,ttl){calls.push({bucket,path,ttl});if(hold==='storage')await new Promise(r=>resolve=r);return {data:{signedUrl:'https://example.invalid/signed-fixture'}};}})}};
 const revoked=[];let serial=0;
 const client=Portal.create({config,sdk:{createClient:()=>sdk},operationStorage:{getItem:()=>null,setItem(){},removeItem(){}},objectURL:{createObjectURL(){return'blob:fixture-'+(++serial);},revokeObjectURL(url){revoked.push(url);}},fetch:async(url,options)=>{
  calls.push({url,options});if(hold==='file')await new Promise(r=>resolve=r);const b=JSON.parse(options.body),ext=b.mime==='application/pdf'?'pdf':'png';
  return {ok:true,blob:async()=>new Blob(['fixture'],{type:String(b.path||'').endsWith('.pdf')?'application/pdf':'image/png'}),json:async()=>b.action==='upload'?{path:`${org}/message/${b.conversation}/${id}/${conversation}.${ext}`,mime:b.mime,size:Buffer.from(b.base64,'base64').length}:{path:b.path}};
 }});
 await client.start();assert.equal(client.getStatus().phase,'ready');
 return {client,calls,revoked,hold(name){hold=name;},resolve(){resolve({});},waiting(){return !!resolve;}};
}
test('API chat utilise organisation vérifiée, limite bornée et curseur opaque',async t=>{
 const {client,calls}=await setup();t.after(()=>client.dispose());const cursor={id:conversation,sentAt:'2026-11-11T12:00:00Z'};
 await client.chatMessages(conversation,cursor,9999);assert.deepEqual(calls.at(-1),{name:'mir_chat_messages',args:{org,conversation,page_size:50,page_before:cursor}});
 await client.chatConversations(null,-1);assert.equal(calls.at(-1).args.page_size,1);
 await client.chatSearch('texte',cursor);assert.equal(calls.at(-1).name,'mir_chat_search');
 await assert.rejects(()=>client.validateMessageAttachment(conversation,'forged'),/invalide/i);
 await client.validateMessageAttachment(conversation,`${org}/message/${conversation}/${id}/${conversation}.png`);assert.equal(calls.at(-1).name,'mir_message_attachment_validate');
 await client.ackChatMessage(conversation);assert.deepEqual(calls.at(-1).args,{org,message:conversation,state:'read'});
 await client.openConversation('job',conversation);assert.equal(calls.at(-1).name,'mir_conversation_open');
 await assert.rejects(()=>client.chatMessages('bad'),/invalide/i);
});
test('réponse chat tardive après déconnexion rejetée',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());s.hold('mir_chat_messages');const reading=s.client.chatMessages(conversation);
 while(!s.waiting())await new Promise(r=>setImmediate(r));await s.client.signOut();s.resolve();await assert.rejects(reading,/session a changé/i);
 await assert.rejects(()=>s.client.chatConversations(),/connectez-vous/i);
});
test('fichiers chat: POST privé, pas de lien Storage, blob révoqué et réponse tardive rejetée',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());const path=`${org}/message/${conversation}/${id}/${conversation}.jpg`;
 assert.equal(await s.client.chatPhotoURL(path),'blob:fixture-1');assert.equal(s.calls.at(-1).options.method,'POST');assert.equal(s.calls.at(-1).options.cache,'no-store');assert.match(s.calls.at(-1).url,/functions\/v1\/mir-chat-files$/);assert.equal(s.calls.some(c=>c.bucket),false);
 await assert.rejects(()=>s.client.chatPhotoURL('foreign/message/file'),/invalide/i);
 s.hold('file');const reading=s.client.internalPhotoURL(path);while(!s.waiting())await new Promise(r=>setImmediate(r));await s.client.signOut();s.resolve();await assert.rejects(reading,/session a changé/i);assert.deepEqual(s.revoked,['blob:fixture-1']);
});
test('fichier de l’ancienne session jamais livré après changement de compte',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());const path=`${org}/message/${conversation}/${id}/${conversation}.jpg`;
 s.hold('file');const reading=s.client.chatPhotoURL(path);while(!s.waiting())await new Promise(r=>setImmediate(r));
 await s.client.signOut();s.resolve();await assert.rejects(reading,/session a changé/i);assert.deepEqual(s.revoked,[]);
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
test('upload chat via serveur, autres photos inchangées et blobs invalidés au rafraîchissement',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());const file=new Blob([require('./fixtures/mir-chat-png.cjs').png()],{type:'image/png'});
 const p=await s.client.uploadInternal(file,'message',conversation);assert.equal(p,`${org}/message/${conversation}/${id}/${conversation}.png`);
 assert.equal(JSON.parse(s.calls.at(-1).options.body).action,'upload');assert.equal(s.calls.some(c=>c.bucket),false);
 await s.client.chatPhotoURL(p);await s.client.refresh();assert.deepEqual(s.revoked,['blob:fixture-1']);
 assert.equal(await s.client.internalPhotoURL(`${org}/report/${conversation}/${id}/${conversation}.jpg`),'https://example.invalid/signed-fixture');assert.equal(s.calls.at(-1).ttl,300);
});
test('PDF chat utilise la passerelle et reste interdit aux autres scopes',async t=>{
 const s=await setup();t.after(()=>s.client.dispose());const bytes=require('./fixtures/mir-chat-pdf.cjs').pdf(),file=new Blob([bytes],{type:'application/pdf'});
 const p=await s.client.uploadInternal(file,'message',conversation);assert.match(p,/\.pdf$/);assert.equal(JSON.parse(s.calls.at(-1).options.body).mime,'application/pdf');
 assert.equal(await s.client.chatFileURL(p),'blob:fixture-1');assert.equal(s.calls.some(c=>c.bucket),false);
 await assert.rejects(()=>s.client.uploadInternal(file,'report',conversation),/photo/i);
});
test('modules protégés inchangés; cartes Aujourd’hui et fonctions Punch conservées',()=>{
 const baseline=require('./fixtures/mir-chat-baseline.json'),hash=x=>createHash('sha256').update(x).digest('hex');
 for(const [file,value]of Object.entries(baseline.files))assert.equal(hash(fs.readFileSync(file)),value,file);
 const beck=require('./fixtures/mir-chat-main-215259.json');
 const approvedProtectedChanges={
  'dist/catalogue-fd6866b49d21.json':'a08b9bf28abba1f286d0854690ae4979eaaa723a3fe04eb86a75dffc82efdc63',
  'dist/commerce.js':'bf460f572d63fa97f0e48ea7ff328f70ec378c210adbe9e8d8f2e0cd0d0d5f8e'
 };
 if(process.env.GITHUB_EVENT_NAME==='pull_request'&&process.env.GITHUB_EVENT_PATH){
  // Actions checks a synthetic merge with today's main, which other approved
  // PRs may change. Guard OUR head's diff, not freeze their catalogue globally.
  const pr=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).pull_request;
  assert.match(pr.base.sha,/^[0-9a-f]{40}$/);assert.match(pr.head.sha,/^[0-9a-f]{40}$/);
  const git=(...args)=>require('node:child_process').execFileSync('git',args,{encoding:'utf8'}).trim();
  const ancestor=git('merge-base',pr.base.sha,pr.head.sha);
  const changed=git('diff','--name-only',ancestor,pr.head.sha,'--',...Object.keys(beck.files)).split('\n').filter(Boolean);
  for(const file of changed)assert.equal(hash(fs.readFileSync(file)),approvedProtectedChanges[file],`Phase3A protected file not explicitly approved: ${file}`);
 }else for(const [file,value]of Object.entries(beck.files))assert.equal(hash(fs.readFileSync(file)),approvedProtectedChanges[file]||value,'BECK/main '+file);
 const source=fs.readFileSync('dist/chantier-app.js','utf8');
 for(const [name,value]of Object.entries(baseline.functions)){const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+1);assert.ok(start>=0,name);assert.equal(hash(source.slice(start,end<0?undefined:end)),value,name);}
 const client=fs.readFileSync('dist/portal-client.js','utf8');assert.match(client,/createSignedUrl\(path,300\)/);assert.doesNotMatch(client,/getPublicUrl/);
});
