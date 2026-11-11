-- MIR TEST only: minimal service-only provisioning for the one-time tenant-B recipe.
begin;
do $guard$
begin
 if to_regprocedure('public.mir_chat_tenant_b_recipe_provision(uuid)') is not null then
  raise exception 'mir_chat_tenant_b_recipe_provision already exists';
 end if;
 if to_regclass('mir_core.memberships') is null or to_regclass('mir_core.staff_capabilities') is null
  or to_regclass('mir_core.jobs') is null or to_regclass('mir_core.job_memberships') is null then
  raise exception 'MIR chat tenant-B prerequisites are incompatible';
 end if;
end$guard$;

create function public.mir_chat_tenant_b_recipe_provision(actor uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,auth as $fn$
declare
 b constant uuid:='3005c762-de14-4ab0-8bc8-16c4be92d0a4';
 fixture text:='phase3a_tenant_b';
 job_id uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then
  raise exception 'Service recipe only' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users u where u.id=actor and u.raw_app_meta_data->>'mir_test_fixture'=fixture) then
  raise exception 'Dedicated Auth fixture required' using errcode='42501';
 end if;
 if exists(select 1 from mir_core.memberships m where m.organization_id=b and m.active
  and m.role in('admin','employee') and m.user_id<>actor) then
  raise exception 'Equivalent tenant-B internal already exists' using errcode='23505';
 end if;
 insert into mir_core.memberships(organization_id,user_id,role,active) values(b,actor,'employee',true)
 on conflict(organization_id,user_id) do update set role='employee',active=true;
 insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,active,configured_by)
 values(b,actor,'employee','Recette Phase 3A tenant B',true,actor)
 on conflict(organization_id,user_id) do update set staff_role='employee',display_name=excluded.display_name,active=true,configured_by=actor,configured_at=now();
 select j.id into job_id from mir_core.jobs j where j.organization_id=b and j.name='[QA PHASE3A TENANT B] Isolation';
 if job_id is null then
  insert into mir_core.jobs(organization_id,name,job_number,delivery_address,team,foreman,address,phone,city,client_name)
  values(b,'[QA PHASE3A TENANT B] Isolation','QA3A-B','','','','','','','') returning id into job_id;
 end if;
 insert into mir_core.job_memberships(organization_id,job_id,user_id) values(b,job_id,actor) on conflict do nothing;
 return jsonb_build_object('organizationId',b,'userId',actor,'jobId',job_id,'role','employee');
end$fn$;
revoke all on function public.mir_chat_tenant_b_recipe_provision(uuid) from public,anon,authenticated;
do $grant$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant execute on function public.mir_chat_tenant_b_recipe_provision(uuid) to service_role;
 end if;
end$grant$;
commit;
