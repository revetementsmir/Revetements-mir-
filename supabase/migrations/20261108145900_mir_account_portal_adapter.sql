-- Correct the legacy portal envelope without inventing stock or delivery quantities.
begin;
create or replace function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare account jsonb;org uuid;uid uuid;shared jsonb;members jsonb;catalogue jsonb;jobs jsonb;begin
 account:=public.mir_account_snapshot();org:=(account->>'organizationId')::uuid;uid:=(account->>'userId')::uuid;
 if account->>'role' not in ('employee','admin') then raise exception 'Accès équipe MIR requis' using errcode='42501',detail='ACCESS_DENIED';end if;
 shared:=public.mir_shared_snapshot(org);
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'full_name',u.email),'email',u.email,'role',m.role,'active',m.active)),'[]') into members
 from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and (account->>'role'='admin' or m.user_id=uid);
 select coalesce(jsonb_agg(c.specification||jsonb_build_object('id',c.id,'name',c.name,'active',true)),'[]') into catalogue from mir_core.catalogue_items c where c.organization_id=org and c.channel='store' and c.published and not c.archived;
 select coalesce(jsonb_agg(j||jsonb_build_object('assignedMemberIds',(select coalesce(jsonb_agg(jm.user_id),'[]') from mir_core.job_memberships jm where jm.organization_id=org and jm.job_id=(j->>'id')::uuid and (account->>'role'='admin' or jm.user_id=uid)))),'[]') into jobs from jsonb_array_elements(shared->'jobs') j;
 return jsonb_build_object('mode','connected','demo',false,'actorId',uid,'members',members,'jobs',jobs,'planVersions','[]'::jsonb,'catalogue',catalogue,
 'orders','[]'::jsonb,'sharedOrders',shared->'orders','deliveries','[]'::jsonb,'movements','[]'::jsonb,'inventory','{}'::jsonb,'favorites','{}'::jsonb,
 'capabilities',jsonb_build_object('documents',false,'checkout',false));
end $$;
revoke all on function public.mir_portal_snapshot() from public,anon;
grant execute on function public.mir_portal_snapshot() to authenticated;


-- Existing catalogue requests are read through sharedOrders. Unconnected legacy commands
-- fail definitively instead of leaving a request in an uncertain retry loop.
create function public.mir_portal_command(p_request_id uuid,p_command text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare account jsonb;org uuid;member uuid;ids uuid[];begin
 account:=public.mir_account_snapshot();org:=(account->>'organizationId')::uuid;
 if account->>'role'<>'admin' then raise exception 'Action réservée à l’administration MIR' using errcode='42501';end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Action invalide' using errcode='22023';end if;
 if p_command='ASSIGN_MEMBER_JOBS' then
  member:=(p_payload->>'memberId')::uuid;
  if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=member and active and role='employee') then raise exception 'Employé actif requis' using errcode='42501';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_payload->'jobIds');
  if exists(select 1 from unnest(ids) id where not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=id and not j.archived)) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
  perform 1 from mir_core.memberships where organization_id=org and user_id=member for update;
  delete from mir_core.job_memberships where organization_id=org and user_id=member and not(job_id=any(ids));
  insert into mir_core.job_memberships(organization_id,job_id,user_id) select org,id,member from unnest(ids) id on conflict do nothing;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Cette action n’est pas encore raccordée au portail. Aucune commande ni quantité n’a été enregistrée.' using errcode='0A000';
end $$;
revoke all on function public.mir_portal_command(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_portal_command(uuid,text,jsonb) to authenticated;
commit;
