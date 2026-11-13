'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {baseline}=require('./fixtures/mir-chat-database.cjs');
const root=path.resolve(__dirname,'..');
const ordered=[
 'supabase/migrations/20261110142928_client_center_20261110.sql',
 'supabase/migrations/20261112114958_chat_phase3a_security.sql',
 'supabase/migrations/20261113125310_chat_phase3a_storage_support_acl.sql',
 'supabase/migrations/20261114131000_chat_phase3a_storage_upload_probe.sql',
 'supabase/migrations/20261115134647_chat_phase3a_private_file_gateway.sql',
 'supabase/proposals/20261116135048_chat_phase3a_private_file_activate.sql',
 'supabase/migrations/20261118120000_chat_phase3b_pdf_attachments.sql',
 'supabase/migrations/20261118123000_chat_phase3b_pdf_gateway_acl.sql',
 'supabase/migrations/20261118124500_chat_phase3b_pdf_attestation_constraint.sql',
 'supabase/migrations/20261119120000_phase3c_help_support_hardening.sql',
 'supabase/migrations/20261119123000_phase3c_support_create_fix.sql',
 'supabase/migrations/20261119124500_phase3c_support_account_category.sql',
 'supabase/migrations/20261119133000_phase3c_client_organization_scope.sql',
 'supabase/migrations/20261119140000_phase3c_explicit_client_scope.sql',
 'supabase/migrations/20261112115900_phase3c_client_search.sql',
 'supabase/migrations/20261112120000_phase3c_acl_alignment.sql'
];
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
(async()=>{
 const db=await baseline({hosted:true,clientCenter:false});let checks=0,applied=0,skipped=0;
 const ok=(v,n)=>{assert.ok(v,n);checks++;console.log('PASS '+n);};
 await db.exec('create table public.mir_promotion_history(path text primary key,sha256 text not null,applied_at timestamptz not null default now())');
 async function promote(){
  for(const rel of ordered){const sql=fs.readFileSync(path.join(root,rel),'utf8'),sha=crypto.createHash('sha256').update(sql).digest('hex'),seen=await db.query('select sha256 from public.mir_promotion_history where path=$1',[rel]);
   if(seen.rows.length){assert.equal(seen.rows[0].sha256,sha,'migration modifiée après application '+rel);skipped++;continue;}
   await db.exec(sql);await db.query('insert into public.mir_promotion_history(path,sha256) values($1,$2)',[rel,sha]);applied++;
  }
 }
 await promote();ok(applied===ordered.length,'chaîne complète appliquée dans l’ordre');
 const org=uuid(1),client=uuid(2),assistant=uuid(3),conversation=uuid(4),message=uuid(5);
 await db.query('insert into mir_core.organizations(id,name) values($1,$2)',[org,'Organisation fictive']);
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[client,'client@example.invalid',assistant,'assistant@example.invalid']);
 await db.query("insert into mir_core.memberships(organization_id,user_id,role,active) values($1,$2,'client',true),($1,$3,'employee',true)",[org,client,assistant]);
 await db.query("insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by) values($1,$2,'assistant','Adjointe fictive',$2)",[org,assistant]);
 await db.query("insert into mir_core.support_conversations(organization_id,id,customer_id,subject,category,client_request_id) values($1,$2,$3,'Demande fictive','account',$4)",[org,conversation,client,uuid(6)]);
 await db.query("insert into mir_core.support_messages(organization_id,id,conversation_id,sender_id,body,client_request_id) values($1,$2,$3,$4,'Message fictif',$5)",[org,message,conversation,client,uuid(7)]);
 const before=(await db.query('select (select count(*) from mir_core.support_conversations) conversations,(select count(*) from mir_core.support_messages) messages,(select count(*) from mir_core.help_faq) faq')).rows[0];
 applied=0;skipped=0;await promote();
 const after=(await db.query('select (select count(*) from mir_core.support_conversations) conversations,(select count(*) from mir_core.support_messages) messages,(select count(*) from mir_core.help_faq) faq')).rows[0];
 ok(applied===0&&skipped===ordered.length,'réexécution pilotée par historique sans SQL rejoué');
 ok(JSON.stringify(before)===JSON.stringify(after),'réexécution sans perte ni doublon');
 ok(Number(after.faq)===0,'contenu initial séparé du schéma');
 const catalog=(await db.query(`select
  to_regclass('mir_core.chat_file_validations') is not null gateway,
  to_regclass('mir_core.help_faq') is not null faq,
  to_regclass('mir_core.support_conversations') is not null support,
  to_regprocedure('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)') is not null scoped,
  exists(select 1 from storage.buckets where id='mir-internal' and 'application/pdf'=any(allowed_mime_types)) pdf,
  exists(select 1 from storage.buckets where id='mir-support' and not public) support_bucket`)).rows[0];
 ok(Object.values(catalog).every(Boolean),'catalogue final 3A/3B/3C présent');
 const snapshotSql=fs.readFileSync(path.join(root,'ops/mir-promotion/sql/080-catalog-snapshot.sql'),'utf8');
 const localSnapshot=(await db.query(snapshotSql)).rows[0].snapshot;
 const hostedSnapshot=structuredClone(require('../ops/mir-promotion/mir-test-catalog-reference.json').snapshot);
 const normalize=s=>{s.constraints=s.constraints.filter(x=>!x.includes('_not_null|NOT NULL '));s.functions=s.functions.map(x=>x.replace(/\|acl=.*$/,'')).sort();return s;};
 normalize(localSnapshot);normalize(hostedSnapshot);
 assert.deepEqual(localSnapshot,hostedSnapshot);ok(true,'catalogue local identique aux définitions MIR TEST');
 const authOnly=['mir_account_preferences()','mir_account_preferences_save(jsonb)','mir_client_center_snapshot()','mir_client_support_action(text,uuid,jsonb)','mir_support_management_snapshot(uuid)','mir_support_management_action(uuid,text,uuid,jsonb)','mir_help_faq_scoped(uuid)','mir_client_center_snapshot_scoped(uuid)','mir_client_support_action_scoped(uuid,text,uuid,jsonb)','mir_client_support_search_scoped(uuid,text)'];
 for(const signature of authOnly){const rights=(await db.query("select has_function_privilege('anon',$1,'execute') anon,has_function_privilege('authenticated',$1,'execute') authenticated,has_function_privilege('service_role',$1,'execute') service",[signature])).rows[0];assert.deepEqual(rights,{anon:false,authenticated:true,service:true});}
 ok(true,'ACL finales explicites : anon refusé, authenticated/service_role accordés');
 await db.close();console.log(`Chaîne promotion locale: ${checks}/${checks}, ${ordered.length} migrations, données fictives conservées`);
})().catch(e=>{console.error(e);process.exitCode=1;});
