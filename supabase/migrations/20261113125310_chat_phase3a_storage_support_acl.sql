-- Corrective dependency for Phase 3A. No policy or business-role replacement.
-- Generated with Supabase CLI; ordered after the prepared Phase 3A migration.
begin;
do $migration$
declare f regprocedure:=to_regprocedure('mir_core.support_object_allowed(text,boolean)');
 marker text;body_hash text;acl_hash text;policy_count integer;
begin
 select count(*) into policy_count from pg_policies where schemaname='storage' and policyname like 'mir_support_%';
 if f is null and policy_count=0 then
  raise notice 'Optional Support Storage module absent: no change';return;
 end if;
 if f is null or policy_count<>3 or to_regclass('mir_core.support_conversations') is null
  or to_regprocedure('mir_core.support_allowed(uuid,uuid,uuid)') is null
  or to_regprocedure('mir_core.support_staff(uuid,uuid)') is null then
  raise exception 'Support Storage partiel ou incompatible' using errcode='55000';end if;
 if not exists(select 1 from pg_proc where oid='mir_core.support_allowed(uuid,uuid,uuid)'::regprocedure
  and md5(prosrc)='b17b6b390cbeaaa5e050a4f842c638af' and prosecdef and proconfig=array['search_path=pg_catalog, mir_core'])
  or not exists(select 1 from pg_proc where oid='mir_core.support_staff(uuid,uuid)'::regprocedure
   and md5(prosrc)='0fb4c73abeb186aa051db3b1bf905e3f' and prosecdef and proconfig=array['search_path=pg_catalog, mir_core']) then
  raise exception 'Autorisation Support différente de la version auditée' using errcode='55000';end if;
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and permissive='PERMISSIVE'
  and roles=array['authenticated']::name[] and
  ((policyname='mir_support_insert' and cmd='INSERT' and with_check='((bucket_id = ''mir-support''::text) AND mir_core.support_object_allowed(name, true))')
   or(policyname='mir_support_select' and cmd='SELECT' and qual='((bucket_id = ''mir-support''::text) AND mir_core.support_object_allowed(name, false))')
   or(policyname='mir_support_delete' and cmd='DELETE' and qual='((bucket_id = ''mir-support''::text) AND mir_core.support_object_allowed(name, true))')))<>3 then
  raise exception 'Policies Support différentes de la version auditée' using errcode='55000';end if;
 select md5(prosrc),md5(coalesce(proacl::text,'')),obj_description(oid,'pg_proc') into body_hash,acl_hash,marker from pg_proc where oid=f;
 if marker='MIR chat Support ACL v1:'||body_hash||':'||acl_hash
   and has_function_privilege('authenticated',f,'EXECUTE') and not has_function_privilege('anon',f,'EXECUTE') then return;end if;
 if body_hash<>'31d75e84af8bd7bb5f5c2e4f0b25c3fa'
  or not exists(select 1 from pg_proc where oid=f and prosecdef and proconfig=array['search_path=pg_catalog, mir_core, storage'])
  or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then
  raise exception 'Helper Support/ACL incompatible: aucun grant aveugle' using errcode='55000';end if;
 execute $ddl$
create or replace function mir_core.support_object_allowed(object_name text,writing boolean default false) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $fn$
declare parts text[]:=string_to_array(object_name,'/');org uuid;conversation uuid;owner uuid;me uuid:=auth.uid();
begin
 if me is null or object_name is null or writing is null or length(object_name)>600
  or cardinality(parts) not in(4,5) or exists(select 1 from unnest(parts) p where p in('','.','..')) then return false;end if;
 begin org:=parts[1]::uuid;conversation:=parts[2]::uuid;owner:=parts[3]::uuid;
 exception when invalid_text_representation then return false;end;
 if not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=me and m.active)
  or(writing and owner<>me) then return false;end if;
 -- Four segments = published client RPC path. Five = legacy helper contract.
 -- Same organization/conversation/owner prefix; no traversal or identity argument from the caller.
 return coalesce(mir_core.support_allowed(org,conversation,me),false);
end$fn$;
$ddl$;
 -- These roles had no EXECUTE before. Only authenticated needs to evaluate the existing RLS policies.
 grant execute on function mir_core.support_object_allowed(text,boolean) to authenticated;
 select md5(prosrc),md5(coalesce(proacl::text,'')) into body_hash,acl_hash from pg_proc where oid=f;
 execute format('comment on function mir_core.support_object_allowed(text,boolean) is %L','MIR chat Support ACL v1:'||body_hash||':'||acl_hash);
end$migration$;
commit;
