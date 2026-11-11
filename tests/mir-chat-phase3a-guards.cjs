'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {baseline,dir}=require('./fixtures/mir-chat-database.cjs');
const migration=fs.readFileSync(path.join(dir,'20261112114958_chat_phase3a_security.sql'),'utf8');
async function run(){
 const cases=[
  ['colonne job_id seule: état partiel refusé','alter table mir_core.conversations add column job_id uuid'],
  ['fonction existante différente refusée',"create or replace function mir_core.conversation_allowed(org uuid,conversation uuid,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$select true$$"],
  ['bucket public refusé',"update storage.buckets set public=true where id='mir-internal'"],
  ['métadonnées Storage incompatibles refusées','alter table storage.objects alter column metadata type text using metadata::text'],
  ['droit direct dangereux refusé','grant select on mir_core.messages to authenticated']
 ];const results=[];
 for(const [name,mutation]of cases){const db=await baseline();try{
  await db.exec(mutation);
  const before=JSON.stringify((await db.query("select oid::regprocedure::text signature,prosrc,proacl::text from pg_proc where proname like '%conversation%' or proname like '%message%' order by oid")).rows);
  await assert.rejects(()=>db.exec(migration),e=>e.code==='55000');await db.exec('rollback');
  const after=JSON.stringify((await db.query("select oid::regprocedure::text signature,prosrc,proacl::text from pg_proc where proname like '%conversation%' or proname like '%message%' order by oid")).rows);
  assert.equal(after,before);assert.equal((await db.query("select to_regprocedure('public.mir_conversation_job(uuid,uuid)') is null absent")).rows[0].absent,true);
  results.push({name,status:'passed'});console.log('PASS '+name+'; transaction sans changement');
 }finally{await db.close();}}
 return {kind:'disposable-postgres',checks:results};
}
module.exports={run};if(require.main===module)run().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
