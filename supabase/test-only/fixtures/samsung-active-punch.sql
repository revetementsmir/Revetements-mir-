-- SYNTHETIC TEST DATA ONLY. Applied/read/closed explicitly by the coordinator.
-- No GPS, event, real attendance or user punch is claimed by these rows.
begin;
do $$
declare org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
 jid uuid:='7da20261-1114-4000-8000-000000000001';
 marker text:='QA-SAMSUNG-SYNTHETIC-NOT-PHYSICAL';
 who uuid; sid uuid; gid uuid; i integer:=0; start_at timestamptz:=now()-interval '15 minutes';
begin
 if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;
 perform pg_advisory_xact_lock(hashtext('MIR-SAMSUNG-ACTIVE-QA-20261114'));
 if not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=jid and not j.archived)
 or exists(select 1 from mir_core.time_periods p where p.organization_id=org and p.status='locked' and (now() at time zone 'America/Toronto')::date between p.starts_on and p.ends_on)
 then raise exception 'Active QA job and unlocked date required';end if;
 foreach who in array array['3980647a-d83a-48ad-9d90-8fc2b314807f'::uuid,'ec421778-b39b-492e-9e4b-5e044015e98f'::uuid] loop
  i:=i+1;sid:=('7da20261-1114-4000-8100-00000000000'||i)::uuid;gid:=('7da20261-1114-4000-8200-00000000000'||i)::uuid;
  if not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=who and m.active)
  or not exists(select 1 from mir_core.staff_capabilities c where c.organization_id=org and c.user_id=who and c.active and c.staff_role in('employe','chef_equipe'))
  or not exists(select 1 from mir_core.job_memberships m where m.organization_id=org and m.job_id=jid and m.user_id=who)
  then raise exception 'Existing authorized native QA account required';end if;
  perform 1 from mir_core.memberships m where m.organization_id=org and m.user_id=who for update;
  if exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.employee_id=who and s.ended_at is null and s.id<>sid)
  or exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=sid and (s.employee_id<>who or s.device_id<>marker or s.ended_at is not null))
  or exists(select 1 from mir_core.punch_segments s where s.organization_id=org and s.id=gid and (s.shift_id<>sid or s.job_id<>jid or s.created_by<>who or s.ended_at is not null))
  then raise exception 'QA fixture collision; no existing punch may be replaced or reactivated';end if;
  insert into mir_core.punch_shifts(organization_id,id,employee_id,work_date,started_at,status,auto_break_minutes,source,device_id)
   values(org,sid,who,(start_at at time zone 'America/Toronto')::date,start_at,'active',0,'online',marker) on conflict(organization_id,id) do nothing;
  insert into mir_core.punch_segments(organization_id,id,shift_id,job_id,segment_type,started_at,created_by)
   select org,gid,sid,jid,'job',s.started_at,who from mir_core.punch_shifts s where s.organization_id=org and s.id=sid on conflict(organization_id,id) do nothing;
 end loop;
end$$;
commit;

-- Cleanup is a separate explicit coordinator action AFTER the final CI:
-- close only the two exact marked shifts and their two exact segments;
-- preserve all rows and audit the synthetic nature. Never delete/reset others.
