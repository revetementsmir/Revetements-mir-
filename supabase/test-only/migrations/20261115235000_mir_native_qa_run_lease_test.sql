-- MIR TEST ONLY (hxtztkmbfpmzrieccwsg). NEVER place in supabase/migrations.
-- Per-CI-run UUIDs and a single guarded lease for two shared QA identities.
-- No existing punch is reopened; closed QA shifts and punch_audit are immutable.
begin;
select set_config('mir.target_project','hxtztkmbfpmzrieccwsg',true);
do $$begin
 if current_setting('mir.target_project',true) <> 'hxtztkmbfpmzrieccwsg'
 then raise exception 'MIR TEST REQUIRED';end if;
end$$;
create table if not exists mir_core.qa_native_runs(
 run_id uuid primary key,
 organization_id uuid not null,
 owner_id uuid not null,
 token_hash text not null,
 state text not null check(state in('active','closed')),
 marker text not null unique,
 employee_shift_id uuid not null unique,
 employee_segment_id uuid not null unique,
 chef_shift_id uuid not null unique,
 chef_segment_id uuid not null unique,
 assignment_id uuid not null unique,
 task_id uuid not null unique,
 job_id uuid not null,
 work_date date not null,
 created_at timestamptz not null default now(),
 lease_until timestamptz not null,
 closed_at timestamptz
);
create unique index if not exists qa_native_one_active_run on mir_core.qa_native_runs(organization_id) where state='active';
alter table mir_core.qa_native_runs enable row level security;
revoke all on mir_core.qa_native_runs from public,anon,authenticated;
create table if not exists mir_core.qa_native_run_audit(
 id bigint generated always as identity primary key,
 run_id uuid not null,
 actor_id uuid not null,
 action text not null check(action in('start','finish','recover')),
 occurred_at timestamptz not null default now()
);
alter table mir_core.qa_native_run_audit enable row level security;
revoke all on mir_core.qa_native_run_audit from public,anon,authenticated;

create or replace function public.mir_qa_native_run(p_action text,p_run_id uuid,p_token text)
returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core
as $qa$
declare
 v_org constant uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
 v_job constant uuid:='7da20261-1114-4000-8000-000000000001';
 v_team constant uuid:='7da20261-1114-4000-8000-000000000020';
 v_employee constant uuid:='3980647a-d83a-48ad-9d90-8fc2b314807f';
 v_chef constant uuid:='ec421778-b39b-492e-9e4b-5e044015e98f';
 v_member constant uuid:='552233d5-ae18-4c14-be85-0206e6f18549';
 v_actor uuid:=auth.uid();
 v_hash text;
 v_marker text;
 v_started timestamptz;
 v_closed timestamptz;
 v_row mir_core.qa_native_runs%rowtype;
 v_recover boolean:=false;
begin
 -- This function is installed exclusively on MIR TEST. No other organization
 -- or staff role can ask it to mutate any fixture.
 if v_actor is null or coalesce(mir_core.staff_role(v_org,v_actor),'')<>'boss'
 then raise exception 'QA_BOSS_REQUIRED' using errcode='42501';end if;
 if p_action not in('start','finish','recover') or p_run_id is null
 then raise exception 'QA_ACTION_OR_RUN_ID' using errcode='22023';end if;
 if p_action<>'recover' and (p_token is null or p_token !~ '^[0-9a-f]{64}$')
 then raise exception 'QA_TOKEN_FORMAT' using errcode='22023';end if;
 v_hash:=case when p_token is null then '' else encode(sha256(convert_to(p_token,'UTF8')),'hex') end;
 perform pg_advisory_xact_lock(hashtextextended('MIR-TEST-NATIVE-QA-'||v_org::text,0));
 if p_action='start' then
   select * into v_row from mir_core.qa_native_runs where run_id=p_run_id for update;
   if found then
     if v_row.owner_id<>v_actor or v_row.token_hash<>v_hash or v_row.state<>'active'
        or v_row.lease_until<=now()
     then raise exception 'QA_RUN_OWNERSHIP_OR_STATE' using errcode='42501';end if;
   else
     if exists(select 1 from mir_core.qa_native_runs where organization_id=v_org and state='active')
     then raise exception 'QA_OTHER_RUN_ACTIVE_OR_STALE' using errcode='55P03';end if;
     if not exists(select 1 from mir_core.jobs where organization_id=v_org and id=v_job and not archived)
      or not exists(select 1 from mir_core.teams where organization_id=v_org and id=v_team and leader_id=v_chef)
      or not exists(select 1 from mir_core.team_members where organization_id=v_org and team_id=v_team and user_id=v_member and active)
     then raise exception 'QA_JOB_TEAM_PRECONDITION' using errcode='23514';end if;
     if (select count(*) from mir_core.staff_capabilities c
         join mir_core.memberships m on(m.organization_id,m.user_id)=(c.organization_id,c.user_id)
         join mir_core.job_memberships j on(j.organization_id,j.user_id)=(c.organization_id,c.user_id)
         where c.organization_id=v_org and c.user_id in(v_employee,v_chef) and c.active and m.active
           and j.job_id=v_job and c.staff_role=case when c.user_id=v_employee then 'employe' else 'chef_equipe' end)<>2
     then raise exception 'QA_ACTOR_PRECONDITION' using errcode='23514';end if;
     -- A real shift or team day entry always wins. Never overwrite, close,
     -- delete or reuse another run's (or a human's) business record.
     if exists(select 1 from mir_core.punch_shifts where organization_id=v_org
        and employee_id in(v_employee,v_chef) and ended_at is null)
       or exists(select 1 from mir_core.team_day_assignments
        where organization_id=v_org and team_id=v_team and work_date=current_date)
       or exists(select 1 from mir_core.time_periods where organization_id=v_org
        and status='locked' and (now() at time zone 'America/Toronto')::date between starts_on and ends_on)
     then raise exception 'QA_REAL_DATA_COLLISION_OR_LOCK' using errcode='23505';end if;
     if extract(epoch from ((date_trunc('day',now() at time zone 'UTC')+interval '1 day')-(now() at time zone 'UTC')))<10*60
     then raise exception 'QA_UTC_DAY_EDGE' using errcode='22023';end if;
     v_marker:='QA-NATIVE-RUN-'||replace(p_run_id::text,'-','');
     v_started:=clock_timestamp()-interval '20 minutes';
     insert into mir_core.qa_native_runs(run_id,organization_id,owner_id,token_hash,state,marker,
       employee_shift_id,employee_segment_id,chef_shift_id,chef_segment_id,assignment_id,task_id,job_id,work_date,lease_until)
     values(p_run_id,v_org,v_actor,v_hash,'active',v_marker,
       gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
       gen_random_uuid(),gen_random_uuid(),v_job,current_date,clock_timestamp()+interval '45 minutes')
     returning * into v_row;
     insert into mir_core.punch_shifts(organization_id,id,employee_id,work_date,started_at,status,source,device_id)
     values(v_org,v_row.employee_shift_id,v_employee,(v_started at time zone 'America/Toronto')::date,v_started,'active','online',v_marker),
           (v_org,v_row.chef_shift_id,v_chef,(v_started at time zone 'America/Toronto')::date,v_started,'active','online',v_marker);
     insert into mir_core.punch_segments(organization_id,id,shift_id,job_id,segment_type,started_at,created_by)
     values(v_org,v_row.employee_segment_id,v_row.employee_shift_id,v_job,'job',v_started,v_employee),
           (v_org,v_row.chef_segment_id,v_row.chef_shift_id,v_job,'job',v_started,v_chef);
     insert into mir_core.team_day_assignments(organization_id,id,work_date,team_id,job_id,leader_id,start_time,created_by)
     values(v_org,v_row.assignment_id,current_date,v_team,v_job,v_chef,'07:00',v_chef);
     insert into mir_core.team_tasks(organization_id,id,team_id,job_id,work_date,title,created_by)
     values(v_org,v_row.task_id,v_team,v_job,current_date,'QA NATIVE fictif — '||p_run_id::text,v_chef);
     insert into mir_core.qa_native_run_audit(run_id,actor_id,action) values(p_run_id,v_actor,'start');
   end if;
   return jsonb_build_object('ok',true,'state','active','projectRef','hxtztkmbfpmzrieccwsg',
     'runId',v_row.run_id,'marker',v_row.marker,'jobId',v_job,'workDate',v_row.work_date,
     'employee',jsonb_build_object('id',v_employee,'shift',v_row.employee_shift_id,'segment',v_row.employee_segment_id),
     'chef',jsonb_build_object('id',v_chef,'shift',v_row.chef_shift_id,'segment',v_row.chef_segment_id),
     'lead',jsonb_build_object('assignmentId',v_row.assignment_id,'taskId',v_row.task_id,'memberId',v_member));
 end if;

 if p_action='recover' then
   -- Only a truly expired lease, and only the exact synthetic rows it owns.
   select * into v_row from mir_core.qa_native_runs
   where organization_id=v_org and state='active' and lease_until<clock_timestamp()
   order by created_at for update limit 1;
   if not found then return jsonb_build_object('ok',true,'state','none','projectRef','hxtztkmbfpmzrieccwsg');end if;
   v_recover:=true;
 else
   select * into v_row from mir_core.qa_native_runs where run_id=p_run_id for update;
   if not found then return jsonb_build_object('ok',true,'state','missing','projectRef','hxtztkmbfpmzrieccwsg');end if;
   if v_row.owner_id<>v_actor or v_row.token_hash<>v_hash then
      raise exception 'QA_RUN_OWNERSHIP_OR_TOKEN' using errcode='42501';end if;
   if v_row.state='closed' then return jsonb_build_object('ok',true,'state','closed','projectRef','hxtztkmbfpmzrieccwsg');end if;
 end if;
 if v_row.organization_id<>v_org or v_row.job_id<>v_job or v_row.work_date>current_date
   or v_row.marker<>'QA-NATIVE-RUN-'||replace(v_row.run_id::text,'-','')
 then raise exception 'QA_RUN_IDENTITY_MISMATCH' using errcode='23514';end if;
 if (select count(*) from mir_core.punch_shifts s
     where s.organization_id=v_org and s.device_id=v_row.marker
       and ((s.id=v_row.employee_shift_id and s.employee_id=v_employee)
         or (s.id=v_row.chef_shift_id and s.employee_id=v_chef))
       and s.ended_at is null and s.status='active')<>2
   or (select count(*) from mir_core.punch_segments g
     where g.organization_id=v_org and g.ended_at is null and g.segment_type='job' and g.job_id=v_job
       and ((g.id=v_row.employee_segment_id and g.shift_id=v_row.employee_shift_id and g.created_by=v_employee)
        or(g.id=v_row.chef_segment_id and g.shift_id=v_row.chef_shift_id and g.created_by=v_chef)))<>2
   or (select count(*) from mir_core.team_day_assignments a
     where a.organization_id=v_org and a.id=v_row.assignment_id and a.team_id=v_team and a.job_id=v_job
       and a.leader_id=v_chef and a.created_by=v_chef and a.work_date=v_row.work_date)<>1
   or (select count(*) from mir_core.team_tasks t
     where t.organization_id=v_org and t.id=v_row.task_id and t.team_id=v_team and t.job_id=v_job
       and t.work_date=v_row.work_date and t.created_by=v_chef and t.completed_at is null)<>1
   or exists(select 1 from mir_core.team_attendance a where a.organization_id=v_org and a.assignment_id=v_row.assignment_id)
   or exists(select 1 from mir_core.punch_events e where e.organization_id=v_org and e.shift_id in(v_row.employee_shift_id,v_row.chef_shift_id))
   or exists(select 1 from mir_core.punch_corrections e where e.organization_id=v_org and e.shift_id in(v_row.employee_shift_id,v_row.chef_shift_id))
 then raise exception 'QA_RECORD_CHANGED_OR_REFERENCED; cleanup refused' using errcode='23514';end if;
 v_closed:=clock_timestamp();
 update mir_core.punch_segments set ended_at=v_closed where organization_id=v_org
   and id in(v_row.employee_segment_id,v_row.chef_segment_id) and ended_at is null;
 update mir_core.punch_shifts set ended_at=v_closed,status='review' where organization_id=v_org
   and id in(v_row.employee_shift_id,v_row.chef_shift_id) and ended_at is null;
 delete from mir_core.team_tasks where organization_id=v_org and id=v_row.task_id
   and team_id=v_team and completed_at is null;
 delete from mir_core.team_day_assignments where organization_id=v_org and id=v_row.assignment_id and team_id=v_team;
 update mir_core.qa_native_runs set state='closed',closed_at=v_closed where run_id=v_row.run_id;
 insert into mir_core.qa_native_run_audit(run_id,actor_id,action)
   values(v_row.run_id,v_actor,case when v_recover then 'recover' else 'finish' end);
 return jsonb_build_object('ok',true,'state','closed','runId',v_row.run_id,
     'projectRef','hxtztkmbfpmzrieccwsg','closedShifts',2,'deletedTeamFixtures',2,
     'preservedPunchHistory',true);
end
$qa$;
revoke all on function public.mir_qa_native_run(text,uuid,text) from public,anon;
grant execute on function public.mir_qa_native_run(text,uuid,text) to authenticated;
commit;
