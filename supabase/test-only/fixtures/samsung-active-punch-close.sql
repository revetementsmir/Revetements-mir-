-- Explicit coordinator cleanup AFTER the last native CI. No deletion or GPS event.
begin;
do $$
declare org uuid:='8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9';
 marker text:='QA-SAMSUNG-SYNTHETIC-NOT-PHYSICAL';stamp timestamptz:=now();
begin
 if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;
 perform pg_advisory_xact_lock(hashtext('MIR-SAMSUNG-ACTIVE-QA-20261114'));
 if exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id in('7da20261-1114-4000-8100-000000000001','7da20261-1114-4000-8100-000000000002') and (s.device_id is distinct from marker or (s.id='7da20261-1114-4000-8100-000000000001' and s.employee_id is distinct from '3980647a-d83a-48ad-9d90-8fc2b314807f') or (s.id='7da20261-1114-4000-8100-000000000002' and s.employee_id is distinct from 'ec421778-b39b-492e-9e4b-5e044015e98f')))
 then raise exception 'Unexpected QA fixture identity; cleanup refused';end if;
 if exists(select 1 from mir_core.punch_segments g join mir_core.punch_shifts s on(s.organization_id,s.id)=(g.organization_id,g.shift_id) where s.organization_id=org and s.device_id=marker and s.ended_at is null and g.ended_at is null and s.id in('7da20261-1114-4000-8100-000000000001','7da20261-1114-4000-8100-000000000002') and (g.job_id='7da20261-1114-4000-8000-000000000001' and((s.id='7da20261-1114-4000-8100-000000000001' and g.id='7da20261-1114-4000-8200-000000000001' and g.created_by='3980647a-d83a-48ad-9d90-8fc2b314807f')or(s.id='7da20261-1114-4000-8100-000000000002' and g.id='7da20261-1114-4000-8200-000000000002' and g.created_by='ec421778-b39b-492e-9e4b-5e044015e98f'))) is not true) then raise exception 'Unexpected active segment; cleanup refused';end if;
 update mir_core.punch_segments g set ended_at=stamp
 from mir_core.punch_shifts s
 where (g.organization_id,g.shift_id)=(s.organization_id,s.id) and s.organization_id=org and s.device_id=marker and s.ended_at is null and g.ended_at is null
 and ((s.id='7da20261-1114-4000-8100-000000000001' and g.id='7da20261-1114-4000-8200-000000000001' and g.created_by='3980647a-d83a-48ad-9d90-8fc2b314807f')
   or(s.id='7da20261-1114-4000-8100-000000000002' and g.id='7da20261-1114-4000-8200-000000000002' and g.created_by='ec421778-b39b-492e-9e4b-5e044015e98f'));
 update mir_core.punch_shifts set ended_at=stamp,status='review'
 where organization_id=org and device_id=marker and ended_at is null
 and ((id='7da20261-1114-4000-8100-000000000001' and employee_id='3980647a-d83a-48ad-9d90-8fc2b314807f')
   or(id='7da20261-1114-4000-8100-000000000002' and employee_id='ec421778-b39b-492e-9e4b-5e044015e98f'));
end$$;
commit;
