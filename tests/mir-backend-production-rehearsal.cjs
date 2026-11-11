'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../tools/database/node_modules/@electric-sql/pglite');
const {ROOT,snapshot,schemaSql}=require('../tools/validation/production-schema.cjs');
const {files,transport,fingerprint}=require('../tools/validation/prepare-backend-transport.cjs');
const uuid=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function run(){
 const db=new PGlite();const checks=[];
 const pass=s=>{checks.push(s);console.log('PASS '+s);};
 try{
  await db.exec(schemaSql());
  const tableCount=(await db.query("select count(*)::int n from pg_tables where schemaname in('mir_core','public') or schemaname='auth' and tablename='users' or schemaname='storage' and tablename in('objects','buckets')")).rows[0].n;
  assert.equal(tableCount,snapshot.tables.length);pass('Copie structurelle issue du catalogue production: '+tableCount+' tables, sans lignes privées');
  for(const t of snapshot.tables){
   const cols=(await db.query('select column_name,udt_name,is_nullable from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position',[t.schema,t.name])).rows;
   assert.deepEqual(cols.map(c=>c.column_name),t.columns.map(c=>c.name));
   const constraints=(await db.query("select conname from pg_constraint where conrelid=to_regclass($1) and contype<>'n' order by conname",[t.schema+'.'+t.name])).rows;
   assert.deepEqual(constraints.map(c=>c.conname),t.constraints.map(c=>c.name).sort());
   const attrs=(await db.query("select a.attname as name,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull as notnull,a.attidentity as identity,a.attgenerated as generated,pg_get_expr(d.adbin,d.adrelid) as default from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=to_regclass($1) and a.attnum>0 and not a.attisdropped order by a.attnum",[t.schema+'.'+t.name])).rows;
   assert.deepEqual(attrs,t.columns);
   const security=(await db.query('select relrowsecurity rls,relforcerowsecurity force_rls,relacl::text acl from pg_class where oid=to_regclass($1)',[t.schema+'.'+t.name])).rows[0];
   assert.equal(security.rls,t.rls);assert.equal(security.force_rls,t.force_rls);
   // ACL ordering is not semantically significant.
   const normalizeAcl=v=>(v||'').replace(/^\{|\}$/g,'').split(',').filter(Boolean).sort();
   assert.deepEqual(normalizeAcl(security.acl),normalizeAcl(t.acl));
  }
  pass('Colonnes/types/défauts/NOT NULL/identités, contraintes, RLS et ACL des 91 tables vérifiés');
  const engine=(await db.query('select version() version')).rows[0].version;
  // Out-of-order application must fail and roll back its checkpoint.
  await assert.rejects(()=>db.exec(fs.readFileSync(path.join(ROOT,'supabase/production-transport',files[1]),'utf8')),/Dépendance de transport absente/);
  await db.exec('rollback;');
  assert.equal((await db.query("select to_regclass('mir_core.backend_migration_checkpoints') object")).rows[0].object,null);
  pass('Ordre de dépendance incorrect refusé; aucun checkpoint partiel');
  const protectedBefore=(await db.query("select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','mir_core') order by 1")).rows;
  // Only artificial identities and one sentinel organization; never production data.
  await db.query('insert into mir_core.organizations(id,name) values($1,$2)',[uuid(10),'SENTINEL schema rehearsal']);
  for(let n=1;n<=6;n++){await db.query('insert into auth.users(id) values($1)',[uuid(n)]);await db.query('insert into mir_core.memberships(organization_id,user_id,role,active) values($1,$2,$3,true)',[uuid(10),uuid(n),n===1?'admin':'employee']);}
  for(const [i,file]of files.entries()){
   const sql=fs.readFileSync(path.join(ROOT,'supabase/production-transport',file),'utf8');
   assert.equal(sql,transport(file,i).trimEnd()+'\n','Transport obsolète: '+file);
   assert.equal(/\bdrop\s+(policy|table|function)\b/i.test(sql),false);
   await db.exec(sql);
   const afterFirst=(await db.query(fingerprint)).rows[0];
   await db.exec(sql);
   assert.deepEqual((await db.query(fingerprint)).rows[0],afterFirst);
   pass(file+': première puis deuxième exécution identiques');
  }
  const final=(await db.query(fingerprint)).rows[0];
  for(const file of files)await db.exec(fs.readFileSync(path.join(ROOT,'supabase/production-transport',file),'utf8'));
  assert.deepEqual((await db.query(fingerprint)).rows[0],final);pass('Lot complet rejoué après toutes les migrations: aucune dérive');
  assert.equal((await db.query('select name from mir_core.organizations where id=$1',[uuid(10)])).rows[0].name,'SENTINEL schema rehearsal');
  assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,6);pass('Sentinelles de données conservées et configuration Punch désactivée par défaut');
  assert.equal((await db.query('select module_enabled from mir_core.punch_settings where organization_id=$1',[uuid(10)])).rows[0].module_enabled,false);
  const protectedAfter=(await db.query("select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','mir_core') order by 1")).rows;
  for(const original of protectedBefore)assert.deepEqual(protectedAfter.find(f=>f.signature===original.signature),original);
  pass('Toutes les fonctions et ACL préexistantes production conservées exactement');
  const tables=['punch_settings','punch_shifts','punch_segments','punch_events','punch_corrections','time_periods','time_bank_movements','punch_audit','time_bank_requests','job_documents'];
  for(const table of tables){
   const s=(await db.query("select relrowsecurity from pg_class where oid=to_regclass($1)",['mir_core.'+table])).rows[0];assert.equal(s.relrowsecurity,true);
   for(const role of ['anon','authenticated'])for(const priv of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',[role,'mir_core.'+table,priv])).rows[0].ok,false);
  }
  pass('Dix tables protégées par RLS et sans accès direct anon/authenticated');
  const funcs=(await db.query("select p.oid::regprocedure::text signature,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,has_function_privilege('service_role',p.oid,'EXECUTE') service_role from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'mir_punch_%' or p.proname in('mir_time_bank_request','mir_my_operational_access','mir_job_dossier_snapshot')) order by 1")).rows;
  for(const f of funcs){assert.equal(f.anon,false);assert.equal(f.prosecdef,true);assert.ok(f.proconfig.some(c=>c.startsWith('search_path=')));if(/_phase[12]/.test(f.signature))assert.equal(f.authenticated,false);else assert.equal(f.authenticated,true);}
  pass('Signatures, SECURITY DEFINER, search_path et EXECUTE des RPC/alias vérifiés');
  const bucket=(await db.query("select public from storage.buckets where id='mir-job-documents'")).rows[0];assert.equal(bucket.public,false);
  assert.equal((await db.query("select count(*)::int n from pg_policies where schemaname='storage' and policyname in('mir_job_document_read','mir_job_document_insert')")).rows[0].n,2);pass('Bucket privé et deux policies conditionnelles présents');
  const policies=(await db.query("select oid from pg_policy where polrelid='storage.objects'::regclass and polname like 'mir_job_document_%' order by polname")).rows;
  const dossier=fs.readFileSync(path.join(ROOT,'supabase/migrations',files.at(-1)),'utf8');
  await db.exec(dossier);
  assert.deepEqual((await db.query("select oid from pg_policy where polrelid='storage.objects'::regclass and polname like 'mir_job_document_%' order by polname")).rows,policies);
  pass('Policies compatibles conservées avec leurs OID lors du rejeu dossier');
  await db.exec('alter policy mir_job_document_insert on storage.objects with check(false);');
  await assert.rejects(()=>db.exec(dossier),/Policy mir_job_document_insert incompatible/);
  await db.exec('rollback;');pass('Policy incompatible refusée sans suppression ni remplacement');
  // Drift must fail before any action and transaction must roll back.
  await db.exec('alter table mir_core.punch_shifts add column unexpected_drift text;');
  await assert.rejects(()=>db.exec(fs.readFileSync(path.join(ROOT,'supabase/production-transport',files[0]),'utf8')),/Checkpoint incompatible/);
  await db.exec('rollback;');pass('Dérive de schéma refusée avant réapplication; transaction annulée');
  const inventory=(await db.query("select c.relname,(select count(*)::int from pg_constraint k where k.conrelid=c.oid and k.contype<>'n') constraints,(select count(*)::int from pg_index i where i.indrelid=c.oid) indexes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relname=any($1::text[]) order by c.relname",[tables])).rows;
  assert.equal((await db.query("select count(*)::int n from pg_index i join pg_class c on c.oid=i.indrelid where c.relname=any($1::text[]) and not i.indisvalid",[tables])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from pg_constraint k join pg_class c on c.oid=k.conrelid where c.relname=any($1::text[]) and not k.convalidated",[tables])).rows[0].n,0);
  pass('Toutes les contraintes validées et tous les index valides');
  return {status:'PASS',project:'local disposable PostgreSQL',engine,sourceProject:'gccltmaulvrnthrbnrpd',sourceCapturedAt:snapshot.captured_at,finishedAt:new Date().toISOString(),checks,inventory,functions:funcs};
 }finally{await db.close();}
}
module.exports={run};
if(require.main===module)run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
