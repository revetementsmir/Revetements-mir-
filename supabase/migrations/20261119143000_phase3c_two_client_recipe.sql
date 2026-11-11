-- Phase 3C one-time TEST recipe support. Service role only for provisioning and notes.
begin;
do $preflight$
begin
 if to_regprocedure('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)') is null then raise exception 'Explicit Phase 3C scope is required' using errcode='55000';end if;
 if to_regprocedure('public.mir_support_recipe_clients_provision(uuid,uuid)') is not null then raise exception 'Recipe provision function already exists' using errcode='42710';end if;
end$preflight$;

create function public.mir_support_recipe_clients_provision(actor_a uuid,actor_b uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,auth as $fn$
declare a constant uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';b constant uuid:='3005c762-de14-4ab0-8bc8-16c4be92d0a4';
begin
 if actor_a=actor_b then raise exception 'Distinct fixtures required' using errcode='22023';end if;
 if not exists(select 1 from auth.users where id=actor_a and raw_app_meta_data->>'mir_test_fixture'='phase3c_client_a')
  or not exists(select 1 from auth.users where id=actor_b and raw_app_meta_data->>'mir_test_fixture'='phase3c_client_b') then raise exception 'Dedicated Auth fixtures required' using errcode='42501';end if;
 if exists(select 1 from mir_core.memberships where user_id in(actor_a,actor_b)) then
  if (select count(*) from mir_core.memberships where user_id=actor_a and organization_id=a and role='client' and active)<>1
   or (select count(*) from mir_core.memberships where user_id=actor_a)<>1
   or (select count(*) from mir_core.memberships where user_id=actor_b and organization_id=b and role='client' and active)<>1
   or (select count(*) from mir_core.memberships where user_id=actor_b)<>1 then raise exception 'Fixture membership incompatible' using errcode='23514';end if;
 else
  insert into mir_core.memberships(organization_id,user_id,role,active) values(a,actor_a,'client',true),(b,actor_b,'client',true);
 end if;
 return jsonb_build_object('provisioned',true,'distinct',true);
end$fn$;

create function public.mir_support_recipe_internal_note(org uuid,conversation uuid,body text) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core,auth as $fn$
declare message_id uuid;fixture text;customer uuid;
begin
 if length(btrim(coalesce(body,''))) not between 1 and 4000 then raise exception 'Invalid note' using errcode='22023';end if;
 select u.raw_app_meta_data->>'mir_test_fixture',c.customer_id into fixture,customer from mir_core.support_conversations c join auth.users u on u.id=c.customer_id where c.organization_id=org and c.id=conversation;
 if fixture not in('phase3c_client_a','phase3c_client_b') then raise exception 'Recipe conversation required' using errcode='42501';end if;
 insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body,internal_note) values(org,conversation,customer,btrim(body),true) returning id into message_id;
 return message_id;
end$fn$;

create function public.mir_client_support_search_scoped(org uuid,query_text text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();needle text:=btrim(coalesce(query_text,''));
begin
 if uid is null or length(needle) not between 2 and 120 or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and role='client' and active) then raise exception 'Recherche refusée' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'subject',c.subject,'status',c.status) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and c.customer_id=uid and(c.subject ilike '%'||needle||'%' or exists(select 1 from mir_core.support_messages m where(m.organization_id,m.conversation_id)=(c.organization_id,c.id) and not m.internal_note and m.body ilike '%'||needle||'%'))),'[]'::jsonb);
end$fn$;

revoke all on function public.mir_support_recipe_clients_provision(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mir_support_recipe_internal_note(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.mir_client_support_search_scoped(uuid,text) from public,anon;
grant execute on function public.mir_client_support_search_scoped(uuid,text) to authenticated;
do $grant$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.mir_support_recipe_clients_provision(uuid,uuid) to service_role;grant execute on function public.mir_support_recipe_internal_note(uuid,uuid,text) to service_role;end if;end$grant$;
commit;
