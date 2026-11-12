-- Business RPC extracted from the TEST-only two-client recipe migration.
-- No fixture, account, membership or recipe helper is included.
begin;
do $guard$
begin
 if to_regprocedure('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)') is null
  or to_regclass('mir_core.support_conversations') is null
  or to_regclass('mir_core.support_messages') is null then
  raise exception 'Explicit Phase 3C scope is required' using errcode='55000';
 end if;
 if to_regprocedure('public.mir_client_support_search_scoped(uuid,text)') is not null then
  raise exception 'Client support search already exists; inspect before applying' using errcode='42710';
 end if;
end$guard$;

create function public.mir_client_support_search_scoped(org uuid,query_text text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();needle text:=btrim(coalesce(query_text,''));
begin
 if uid is null or length(needle) not between 2 and 120 or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and role='client' and active) then raise exception 'Recherche refusée' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'subject',c.subject,'status',c.status) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and c.customer_id=uid and(c.subject ilike '%'||needle||'%' or exists(select 1 from mir_core.support_messages m where(m.organization_id,m.conversation_id)=(c.organization_id,c.id) and not m.internal_note and m.body ilike '%'||needle||'%'))),'[]'::jsonb);
end$fn$;

revoke all on function public.mir_client_support_search_scoped(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.mir_client_support_search_scoped(uuid,text) to authenticated,service_role;
commit;
