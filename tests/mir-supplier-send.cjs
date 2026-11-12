'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const {createQueueHandler,processNext,retryUncertain}=require('../server/supplier-send.cjs');
const {createRepository}=require('../server/postgres-send-repository.cjs');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('Envoi : vraie file PostgreSQL, prestataire simulé uniquement dans ce test',async t=>{
  const db=new PGlite(),pdf=Buffer.from('%PDF-1.4\nfixture\n%%EOF'),hash=createHash('sha256').update(pdf).digest('hex');
  const actor=async(user,sql,params=[])=>{await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const r=await db.query(sql,params);await db.exec('commit');return r;}catch(e){await db.exec('rollback');throw e;}};
  const queue=(user=id(1),key=id(80),recipient='supplier@example.invalid',po=id(60))=>actor(user,'select mir_core.queue_supplier_pdf($1,$2,1,$3,$4,$5) as id',[id(10),po,id(70),key,recipient]);
  let mode='success',calls=0;const receipts=new Map();
  const provider={supportsIdempotency:true,async send(req){
    calls++;assert.equal(req.from,'mir@example.invalid');assert.equal(req.to,'supplier@example.invalid');assert.deepEqual(req.attachments[0].content,pdf);
    if(receipts.has(req.idempotencyKey))return receipts.get(req.idempotencyKey);
    if(mode==='failure')throw Error('network failure');
    const receipt={accepted:true,messageId:'simulated-'+req.idempotencyKey};receipts.set(req.idempotencyKey,receipt);
    if(mode==='timeout-after-accept')throw Error('uncertain');return receipt;
  },async lookup(key){return receipts.get(key)||{definitivelyNotAccepted:mode==='failure'};}};
  const repository=createRepository(db),storage={async read(p){assert.equal(p,'private/order.pdf');return pdf;}},sender={verified:true,address:'mir@example.invalid'};
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,unique(bucket_id,name));alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
    for(const f of fs.readdirSync(path.join(__dirname,'../supabase/migrations')).filter(f=>f.endsWith('.sql')&&!f.includes('mir_estimates')&&!f.includes('mir_estimate_recipe')&&!f.includes('chat_phase3a')&&!f.includes('chat_phase3b')&&!f.includes('phase3c')&&!f.includes('client_center_20261110')&&!f.includes('phase6_commandes')).sort())await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
    await db.exec(`insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}');
      insert into mir_core.organizations values('${id(10)}','MIR'),('${id(20)}','Autre');
      insert into mir_core.memberships values('${id(10)}','${id(1)}','admin',true),('${id(10)}','${id(2)}','employee',true),('${id(20)}','${id(3)}','admin',true);
      insert into mir_core.suppliers(organization_id,id,name,email,verified_at) values('${id(10)}','${id(50)}','Test','supplier@example.invalid',now());
      insert into mir_core.orders(organization_id,id,kind,owner_id,supplier_id,status) values('${id(10)}','${id(60)}','supplier','${id(1)}','${id(50)}','approved');
      insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot,created_by) values('${id(10)}','${id(60)}',1,'{"poNumber":"TEST"}','${id(1)}');`);
    await db.query('insert into mir_core.documents(organization_id,id,order_id,revision,object_path,sha256) values($1,$2,$3,1,$4,$5)',[id(10),id(70),id(60),'private/order.pdf',hash]);
    await t.test('Admin actif requis, destinataire vérifié et bon approuvé',async()=>{
      for(const user of [id(2),id(3)])await assert.rejects(queue(user),e=>e.code==='42501');
      await assert.rejects(queue(id(1),id(80),'attacker@example.invalid'),e=>e.code==='22023');
      await db.exec("update mir_core.suppliers set verified_at=null");await assert.rejects(queue(),e=>e.code==='22023');await db.exec('update mir_core.suppliers set verified_at=now()');
      await db.exec("update mir_core.orders set status='draft'");await assert.rejects(queue(),e=>e.code==='22023');await db.exec("update mir_core.orders set status='approved'");
    });
    let job;
    await t.test('Double clic : une tâche et un seul événement, même avec deux requestId',async()=>{
      job=(await queue()).rows[0].id;assert.equal((await queue()).rows[0].id,job);assert.equal((await queue(id(1),id(81))).rows[0].id,job);
      assert.equal((await db.query('select count(*)::int as n from mir_core.send_jobs')).rows[0].n,1);
      assert.equal((await db.query('select count(*)::int as n from mir_core.order_events')).rows[0].n,1);
    });
    await t.test('Succès : pièce jointe réelle, identifiant prestataire et pas de renvoi',async()=>{
      assert.equal((await processNext({repository,storage,provider,sender})).state,'accepted');assert.equal(calls,1);
      assert.equal((await processNext({repository,storage,provider,sender})).state,'idle');assert.equal(calls,1);
      const saved=(await db.query('select * from mir_core.send_jobs')).rows[0];assert.equal(saved.provider_message_id,'simulated-'+job);
      assert.equal((await db.query('select count(*)::int as n from mir_core.send_attempts')).rows[0].n,1);
    });
    await t.test('Erreur : aucun faux succès; reprise après preuve de non-acceptation',async()=>{
      await db.exec("update mir_core.send_jobs set status='queued',provider_message_id=null");receipts.clear();mode='failure';
      assert.equal((await processNext({repository,storage,provider,sender})).state,'uncertain');
      assert.equal((await db.query('select provider_message_id from mir_core.send_jobs')).rows[0].provider_message_id,null);
      assert.equal((await retryUncertain({repository,provider,jobId:job})).state,'queued');mode='success';
      assert.equal((await processNext({repository,storage,provider,sender})).state,'accepted');
    });
    await t.test('Timeout après acceptation : rapprochement sans second envoi',async()=>{
      await db.exec("update mir_core.send_jobs set status='queued',provider_message_id=null");receipts.clear();mode='timeout-after-accept';
      assert.equal((await processNext({repository,storage,provider,sender})).state,'uncertain');const before=calls;
      assert.equal((await retryUncertain({repository,provider,jobId:job})).state,'accepted');assert.equal(calls,before);
    });
    await t.test('PDF altéré et expéditeur non vérifié ne peuvent pas être transmis',async()=>{
      await assert.rejects(processNext({repository,storage,provider,sender:{verified:false}}));
      await db.exec("update mir_core.send_jobs set status='queued'");const before=calls;
      assert.equal((await processNext({repository,storage:{read:async()=>Buffer.from('%PDF-corrupt')},provider,sender})).state,'uncertain');assert.equal(calls,before);
    });
    await t.test('Bail durable : pas de deuxième prise pendant le traitement',async()=>{
      await db.exec("update mir_core.send_jobs set status='queued'");const first=await repository.claim();assert.ok(first);assert.equal(await repository.claim(),null);
      await db.exec("update mir_core.send_jobs set lease_until=now()-interval '1 minute'");const second=await repository.claim();assert.equal(first.id,second.id);assert.equal(second.attempts,first.attempts+1);
      assert.equal(await repository.finish(first,{status:'accepted',messageId:'stale'}),false);
      assert.equal(await repository.finish(second,{status:'uncertain'}),true);
    });
    await t.test('Contact modifié après préparation : vérification retirée et traitement bloqué',async()=>{
      await db.exec("update mir_core.send_jobs set status='queued';update mir_core.suppliers set email='changed@example.invalid'");
      assert.equal((await db.query('select verified_at from mir_core.suppliers')).rows[0].verified_at,null);
      assert.equal(await repository.claim(),null);
      await db.exec("update mir_core.suppliers set email='supplier@example.invalid';update mir_core.suppliers set verified_at=now()");
    });
    await t.test('Endpoint HTTP : authentification, droits SQL et état queued distinct de sent',async()=>{
      const handler=createQueueHandler({createUserClient:async token=>({auth:{getUser:async()=>({data:{user:{id:token}}})},schema:()=>({rpc:async(name,p)=>{try{return {data:(await actor(token,`select mir_core.${name}($1,$2,$3,$4,$5,$6) as id`,[p.org,p.po,p.expected_revision,p.document,p.request_id,p.confirmed_recipient])).rows[0].id};}catch(error){return {error};}}})})});
      const body={organizationId:id(10),orderId:id(60),documentId:id(70),requestId:id(80),revision:1,recipient:'supplier@example.invalid',role:'admin'};
      const req=token=>new Request('https://test.invalid/queue',{method:'POST',headers:token?{authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
      assert.equal((await handler(req())).status,401);assert.equal((await handler(req(id(2)))).status,403);
      const response=await handler(req(id(1)));assert.equal(response.status,202);assert.equal((await response.json()).state,'queued');
    });
  }finally{await db.close();}
});
