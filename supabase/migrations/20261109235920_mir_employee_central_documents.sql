begin;
create or replace function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare out jsonb;org uuid;rows jsonb;begin
 out:=public.mir_portal_snapshot_orders_base();select organization_id into org from mir_core.account_settings where singleton;
 select coalesce(jsonb_agg(m||case when p.id is not null then jsonb_build_object('name',p.name,'team',p.team,'profileId',p.id) else '{}'::jsonb end),'[]') into rows from jsonb_array_elements(out->'members') m left join mir_core.staff_profiles p on p.organization_id=org and p.user_id=(m->>'id')::uuid;
 out:=jsonb_set(out,'{members}',rows)||jsonb_build_object('organizationId',org);
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'name',j.name,'number',j.job_number,'address',j.delivery_address,'archived',true,'assignedMemberIds',(select coalesce(jsonb_agg(m.user_id),'[]') from mir_core.job_memberships m where m.organization_id=org and m.job_id=j.id))),'[]') into rows from mir_core.jobs j where j.organization_id=org and j.archived and mir_core.job_allowed(org,j.id);
 out:=out||jsonb_build_object('historyJobs',rows);
 select coalesce(jsonb_agg(j||jsonb_build_object('documentCount',(select count(distinct d.family_id) from mir_core.job_documents d where d.organization_id=org and d.job_id=(j->>'id')::uuid)+coalesce((select jsonb_array_length(r.files) from mir_core.estimate_followups f join mir_estimates.requests r on(r.organization_id,r.id)=(f.organization_id,f.estimate_id) where f.organization_id=org and f.job_id=(j->>'id')::uuid),0))),'[]') into rows from jsonb_array_elements(out->'jobs') j;
 return jsonb_set(out,'{jobs}',rows);
end$$;

commit;
