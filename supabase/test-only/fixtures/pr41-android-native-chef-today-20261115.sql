-- PR41 MIR TEST native QA: date-scoped CHEF team and task, without altering old rows.
-- External coordinator must set mir.target_project in THIS transaction.
-- This one-off run is deliberately restricted to the UTC database work_date 2026-11-15.
begin;
-- Mandatory same-transaction session guard; run ONLY through the MIR TEST project connector.
select set_config('mir.target_project','hxtztkmbfpmzrieccwsg',true);
do $$
declare
  org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
  job uuid:='7da20261-1114-4000-8000-000000000001';
  team uuid:='7da20261-1114-4000-8000-000000000020';
  leader uuid:='ec421778-b39b-492e-9e4b-5e044015e98f';
  assignment uuid:='7da20261-1114-4000-9120-000000000001';
  task uuid:='7da20261-1114-4000-9130-000000000001';
begin
  if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg'
     then raise exception 'MIR TEST prerequisite required';end if;
  if current_date <> date '2026-11-15'
     then raise exception 'QA day expired; allocate a fresh day and new IDs';end if;
  perform pg_advisory_xact_lock(hashtext('MIR-PR41-NATIVE-CHEF-QA-20261115'));
  if not exists(select 1 from mir_core.memberships m
     join mir_core.staff_capabilities c on(c.organization_id,c.user_id)=(m.organization_id,m.user_id)
     where m.organization_id=org and m.user_id=leader and m.active
       and c.active and c.staff_role='chef_equipe')
  or not exists(select 1 from mir_core.teams t where t.organization_id=org and t.id=team and t.leader_id=leader)
  or not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=job and not j.archived)
  or not exists(select 1 from mir_core.team_members tm where tm.organization_id=org and tm.team_id=team and tm.active)
  then raise exception 'Existing authorized QA chef, team, member and job required';end if;
  if exists(select 1 from mir_core.team_day_assignments a
     where a.organization_id=org and a.team_id=team and a.work_date=current_date and a.id<>assignment)
  or exists(select 1 from mir_core.team_day_assignments a
     where a.organization_id=org and a.id=assignment
       and (a.team_id<>team or a.job_id<>job or a.leader_id<>leader
         or a.work_date<>current_date or a.created_by<>leader))
  or exists(select 1 from mir_core.team_tasks t
     where t.organization_id=org and t.id=task
       and (t.team_id<>team or t.job_id<>job or t.work_date<>current_date
         or t.created_by<>leader or t.completed_at is not null))
  then raise exception 'Dedicated QA daily fixture collision; old records unchanged';end if;
  insert into mir_core.team_day_assignments
    (organization_id,id,work_date,team_id,job_id,leader_id,start_time,created_by)
  values(org,assignment,current_date,team,job,leader,'07:00',leader)
  on conflict (organization_id,id) do nothing;
  insert into mir_core.team_tasks
    (organization_id,id,team_id,job_id,work_date,title,created_by)
  values(org,task,team,job,current_date,'QA PR41 — Vérifier façade A (factice)',leader)
  on conflict (organization_id,id) do nothing;
  if not exists(select 1 from mir_core.team_day_assignments a
      where a.organization_id=org and a.id=assignment and a.team_id=team and a.work_date=current_date)
  or not exists(select 1 from mir_core.team_tasks t
      where t.organization_id=org and t.id=task and t.team_id=team and t.work_date=current_date)
  then raise exception 'QA daily fixture not created completely';end if;
end$$;
commit;
