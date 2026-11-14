-- Additive follow-up to 20261114191433. MIR TEST only; no hours or settings rewrite.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST session required';end if;end$$;

alter function public.mir_punch_admin(uuid,text,jsonb) rename to mir_punch_admin_before_management_hardening;
create function public.mir_punch_admin(org uuid,action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
begin
 if action='approve_period' then
  if coalesce(mir_core.staff_role(org),'') not in('boss','admin') then raise exception 'Boss requis' using errcode='42501';end if;
  -- Same exclusive gate as all period transitions; personal/management writes
  -- take its shared side. The ownership check cannot race a new personal shift.
  perform pg_advisory_xact_lock(hashtextextended(org::text||'punch-period',77));
  if exists(select 1 from mir_core.punch_shifts s join mir_core.time_periods p on p.organization_id=s.organization_id and s.work_date between p.starts_on and p.ends_on where p.organization_id=org and p.id=(payload->>'periodId')::uuid and s.employee_id=auth.uid()) then
   raise exception 'Auto-approbation interdite : cette semaine contient vos propres heures' using errcode='42501';
  end if;
 end if;
 return public.mir_punch_admin_before_management_hardening(org,action,payload);
end$$;
revoke all on function public.mir_punch_admin_before_management_hardening(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_admin(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_punch_admin(uuid,text,jsonb) to authenticated;

alter function public.mir_punch_management_snapshot(uuid,date,date,uuid) rename to mir_punch_management_snapshot_before_hardening;
create function public.mir_punch_management_snapshot(org uuid,start_on date,end_on date,employee uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare result jsonb;absences jsonb;
begin
 result:=public.mir_punch_management_snapshot_before_hardening(org,start_on,end_on,employee);
 select coalesce(jsonb_agg(a.value||jsonb_build_object('dayPart',coalesce(to_jsonb(h)->>'day_part','full_day'),'startTime',to_jsonb(h)->'start_time','endTime',to_jsonb(h)->'end_time')),'[]') into absences
 from jsonb_array_elements(result->'absences') a(value) join mir_core.hr_requests h on h.organization_id=org and h.id=(a.value->>'id')::uuid;
 return result||jsonb_build_object('absences',absences);
end$$;
revoke all on function public.mir_punch_management_snapshot_before_hardening(uuid,date,date,uuid) from public,anon,authenticated;
revoke all on function public.mir_punch_management_snapshot(uuid,date,date,uuid) from public,anon;
grant execute on function public.mir_punch_management_snapshot(uuid,date,date,uuid) to authenticated;

-- Keep the existing paginated audit query and its access checks. Toronto dates
-- delimit calendar days, and authors remain identifiable after deactivation.
alter function public.mir_punch_journal(uuid,jsonb,integer,bigint) rename to mir_punch_journal_before_management_hardening;
create function public.mir_punch_journal(org uuid,filters jsonb default '{}',page_size integer default 25,page_after bigint default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core set timezone='America/Toronto' as $$
declare result jsonb;items jsonb;
begin
 result:=public.mir_punch_journal_before_management_hardening(org,filters,page_size,page_after);
 select coalesce(jsonb_agg(mir_core.punch_redact_location(a.value)||jsonb_build_object('actor_name',coalesce(nullif(sc.display_name,''),case when a.value->>'actor_id' is null then 'Système' else 'Auteur historique' end)) order by (a.value->>'id')::bigint desc),'[]') into items
 from jsonb_array_elements(result->'items') a(value) left join mir_core.staff_capabilities sc on sc.organization_id=org and sc.user_id=(a.value->>'actor_id')::uuid;
 return result||jsonb_build_object('items',items);
end$$;
revoke all on function public.mir_punch_journal_before_management_hardening(uuid,jsonb,integer,bigint) from public,anon,authenticated;
revoke all on function public.mir_punch_journal(uuid,jsonb,integer,bigint) from public,anon;
grant execute on function public.mir_punch_journal(uuid,jsonb,integer,bigint) to authenticated;
commit;
