-- Compléments structurels READ ONLY; aucune ligne métier.
begin read only;
select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as identity,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.oid in(select tgfoid from pg_trigger where tgrelid in('storage.buckets'::regclass,'storage.objects'::regclass,'auth.users'::regclass) and not tgisinternal);
select n.nspname as schema,c.relname as name,pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and (n.nspname in('mir_core','public') or n.nspname='auth' and c.relname='users' or n.nspname='storage' and c.relname in('objects','buckets'));
select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as identity,pg_get_userbyid(p.proowner) as owner
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.prokind='f' and n.nspname in('mir_core','public','auth','storage');
select nspname as name,pg_get_userbyid(nspowner) as owner from pg_namespace where nspname in('mir_core','public','auth','storage');
commit;
