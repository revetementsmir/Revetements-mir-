-- PR41 MIR TEST native QA daily cleanup: DELETE only the two new 9120/9130 records.
-- Existing November 14 team assignments, team tasks, memberships and all punches/audit remain.
-- Never run until PR41 and integrated PR37 dependent native checks are finished.
-- New isolated QA ownership: 9200/9210 shifts and 9220/9230 chef artifacts;
-- the prior closed 9100/9110 and 9120/9130 remain unchanged.
begin;
-- Mandatory same-transaction session guard; run ONLY through the MIR TEST project connector.
select set_config('mir.target_project','hxtztkmbfpmzrieccwsg',true);
do $$
declare
  org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
  job uuid:='7da20261-1114-4000-8000-000000000001';
  team uuid:='7da20261-1114-4000-8000-000000000020';
  leader uuid:='ec421778-b39b-492e-9e4b-5e044015e98f';
  assignment uuid:='7da20261-1115-4000-9220-000000000001';
  task uuid:='7da20261-1115-4000-9230-000000000001';
begin
  if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg'
     then raise exception 'MIR TEST prerequisite required';end if;
  perform pg_advisory_xact_lock(hashtext('MIR-PR41-NATIVE-CHEF-QA-20261115'));
  if exists(select 1 from mir_core.team_day_assignments a
    where a.organization_id=org and a.id=assignment and
    (a.team_id<>team or a.job_id<>job or a.leader_id<>leader
     or a.work_date<>date '2026-11-15' or a.created_by<>leader))
  or exists(select 1 from mir_core.team_tasks t
    where t.organization_id=org and t.id=task and
    (t.team_id<>team or t.job_id<>job or t.work_date<>date '2026-11-15'
     or t.created_by<>leader or t.completed_at is not null))
  or exists(select 1 from mir_core.team_attendance att
    where att.organization_id=org and att.assignment_id=assignment)
  then raise exception 'QA daily record changed or referenced; cleanup refused';end if;
  delete from mir_core.team_tasks t
    where t.organization_id=org and t.id=task and t.team_id=team and t.job_id=job
      and t.work_date=date '2026-11-15' and t.created_by=leader and t.completed_at is null;
  delete from mir_core.team_day_assignments a
    where a.organization_id=org and a.id=assignment and a.team_id=team and a.job_id=job
      and a.work_date=date '2026-11-15' and a.leader_id=leader and a.created_by=leader;
end$$;
commit;
