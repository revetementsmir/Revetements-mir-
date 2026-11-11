-- Audit de catalogue uniquement. Exécuter séparément sur chacun des deux project_id vérifiés.
-- Aucune donnée métier ni identité utilisateur n'est exportée.
begin read only;
select jsonb_build_object(
'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relkind in ('r','p')),
'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'hash',md5(pg_get_functiondef(p.oid)),'definer',p.prosecdef,'acl',p.proacl::text)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('mir_core','public') and p.prokind='f' and (p.proname ilike '%punch%' or p.proname ilike '%job%' or p.proname in ('actor','job_allowed','internal_object_allowed','mir_employee_operations_snapshot'))),
'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public)) from storage.buckets)
) as audit;
commit;
begin read only;
select jsonb_build_object(
'columns',(select jsonb_agg(to_jsonb(x)) from (select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='mir_core' order by table_name,ordinal_position)x),
'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid))) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core'),
'indexes',(select jsonb_agg(to_jsonb(x)) from pg_indexes x where schemaname='mir_core'),
'triggers',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and not t.tgisinternal),
'policies',(select jsonb_agg(to_jsonb(x)) from pg_policies x where schemaname in ('mir_core','storage')),
'grants',(select jsonb_agg(to_jsonb(x)) from information_schema.table_privileges x where table_schema='mir_core' and grantee in ('anon','authenticated','service_role','PUBLIC')),
'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'hash',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text,'config',p.proconfig,'definer',p.prosecdef)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('mir_core','public') and p.prokind='f')
) as detail;
commit;
