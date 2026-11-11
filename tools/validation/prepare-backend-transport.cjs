'use strict';
// Deterministic transport generator. No network or hosted database calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ROOT,lit}=require('./production-schema.cjs');
const files=[
 '20261110020000_punch_gps.sql',
 '20261110120000_operational_roles_phase1.sql',
 '20261110130000_punch_phase2_integrity.sql',
 '20261110140000_punch_phase2_workflow.sql',
 '20261110150000_punch_phase2_corrections.sql',
 '20261110160000_punch_phase2_completion.sql',
 '20261111120000_job_dossier_central.sql'
];
const fingerprint=`select md5(string_agg(item,E'\\n' order by item)) from (
 select 'table:'||n.nspname||'.'||c.relname||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'') item from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relkind in('r','p') and c.relname<>'backend_migration_checkpoints'
 union all select 'column:'||n.nspname||'.'||c.relname||'.'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='mir_core' and a.attnum>0 and not a.attisdropped and c.relname<>'backend_migration_checkpoints'
 union all select 'constraint:'||n.nspname||'.'||c.relname||'.'||k.conname||':'||pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relname<>'backend_migration_checkpoints'
 union all select 'index:'||indexdef from pg_indexes where schemaname='mir_core' and tablename<>'backend_migration_checkpoints'
 union all select 'function:'||pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and (n.nspname='mir_core' or n.nspname='public' and p.proname like 'mir_%')
 union all select 'policy:'||to_jsonb(p)::text from pg_policies p where schemaname='mir_core' or schemaname='storage' and policyname like 'mir_job_document_%'
 union all select 'trigger:'||pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and not t.tgisinternal
 union all select 'bucket:'||id||':'||public||':'||file_size_limit||':'||allowed_mime_types::text from storage.buckets where id='mir-job-documents'
) state`;
function transport(file,index){
 const source=fs.readFileSync(path.join(ROOT,'supabase/migrations',file),'utf8');
 const body=source.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 if(/\bdrop\s+(policy|table|function)|\btruncate\b/i.test(body))throw Error('Instruction interdite: '+file);
 const checksum=crypto.createHash('sha256').update(source).digest('hex');
 const previous=files.slice(0,index).map(lit).join(',');
 const jobColumnGuard=index===0?`if exists(select 1 from pg_attribute a join (values ('latitude','numeric(9,6)',false),('longitude','numeric(9,6)',false),('client_name','text',true),('scheduled_start','time without time zone',false)) expected(name,type,required) on expected.name=a.attname where a.attrelid='mir_core.jobs'::regclass and not a.attisdropped and (format_type(a.atttypid,a.atttypmod)<>expected.type or a.attnotnull<>expected.required)) then raise exception 'Colonnes jobs incompatibles avant Punch'; end if;`:'';
 // A first application requires an absent target. Renamed canonical functions are
 // intentional wrappers; all other collisions stop instead of replacing an object.
 const renamed=[...body.matchAll(/alter function\s+([\w.]+)\s*\([^;]+?\)\s*rename to\s+(\w+)/gi)].map(m=>({source:m[1],target:m[1].split('.')[0]+'.'+m[2]}));
 const tables=[...body.matchAll(/create table(?: if not exists)?\s+([\w.]+)/gi)].map(m=>m[1]);
 const funcs=[...body.matchAll(/create(?: or replace)? function\s+([\w.]+)/gi)].map(m=>m[1]);
 const collisions=[...tables.map(n=>`if to_regclass(${lit(n)}) is not null then raise exception 'Table préexistante incompatible avec une première application: ${n}'; end if;`),...funcs.filter(n=>!renamed.some(r=>r.source===n)).map(n=>`if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${lit(n.split('.')[0])} and p.proname=${lit(n.split('.')[1])}) then raise exception 'Fonction préexistante à comparer avant installation: ${n}'; end if;`),...renamed.map(r=>`if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=${lit(r.target.split('.')[0])} and p.proname=${lit(r.target.split('.')[1])}) then raise exception 'Alias préexistant à comparer: ${r.target}'; end if;`)];
 return `-- Transport sécurisé généré depuis ${file}\n-- Ne pas rejouer le fichier historique en parallèle de ce transport.\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='120s';\nselect pg_advisory_xact_lock(hashtextextended('mir-backend-punch-transport',0));\ncreate table if not exists mir_core.backend_migration_checkpoints(\n source_file text primary key, source_sha256 text not null, schema_fingerprint text not null, applied_at timestamptz not null default now()\n);\nalter table mir_core.backend_migration_checkpoints enable row level security;\nrevoke all on mir_core.backend_migration_checkpoints from public,anon,authenticated,service_role;\ndo $transport$\ndeclare existing record; current_fingerprint text;\nbegin\n ${fingerprint} into current_fingerprint;\n select * into existing from mir_core.backend_migration_checkpoints where source_file=${lit(file)};\n if found then\n  if existing.source_sha256<>${lit(checksum)} or existing.schema_fingerprint<>current_fingerprint then\n   raise exception 'Checkpoint incompatible ou dérive de schéma: ${file}';\n  end if;\n  return;\n end if;\n if exists(select 1 from mir_core.backend_migration_checkpoints where schema_fingerprint<>current_fingerprint) then\n  raise exception 'Dérive de schéma avant ${file}';\n end if;\n${index?`if (select count(*) from mir_core.backend_migration_checkpoints where source_file in(${previous}))<>${index} then raise exception 'Dépendance de transport absente avant ${file}'; end if;`:''}\n${jobColumnGuard}\n ${collisions.join('\n ')}\n execute ${lit(body)};\n ${fingerprint} into current_fingerprint;\n update mir_core.backend_migration_checkpoints set schema_fingerprint=current_fingerprint;\n insert into mir_core.backend_migration_checkpoints(source_file,source_sha256,schema_fingerprint) values(${lit(file)},${lit(checksum)},current_fingerprint);\nend$transport$;\ncommit;\n`;
}
module.exports={files,transport,fingerprint};
if(require.main===module){
 // Emit an apply_patch document; caller applies it, preserving reviewable files.
 const patches=files.map((f,i)=>`*** Add File: ${ROOT}/supabase/production-transport/${f}\n+`+transport(f,i).trimEnd().split('\n').join('\n+'));
 process.stdout.write('*** Begin Patch\n'+patches.join('\n')+'\n*** End Patch\n');
}
