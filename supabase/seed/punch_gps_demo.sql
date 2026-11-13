-- MIR TEST only. Never apply to production: realistic punch/GPS fixtures.
do $$
declare org uuid;employee uuid;approver uuid;job_a uuid;job_b uuid;shift_id uuid:=gen_random_uuid();old_shift uuid:=gen_random_uuid();begin
 select id into org from mir_core.organizations where upper(name) like '%TEST%' order by name limit 1;
 if org is null then raise exception 'MIR TEST organization required';end if;
 select user_id into employee from mir_core.memberships where organization_id=org and active and role in('employee','chef_equipe') order by role limit 1;
 select user_id into approver from mir_core.memberships where organization_id=org and active and role in('admin','boss','assistant') order by case role when 'admin' then 1 else 2 end limit 1;
 select j.id into job_a from mir_core.jobs j join mir_core.job_memberships a on(a.organization_id,a.job_id)=(j.organization_id,j.id) where j.organization_id=org and a.user_id=employee and not j.archived order by j.name limit 1;
 select j.id into job_b from mir_core.jobs j join mir_core.job_memberships a on(a.organization_id,a.job_id)=(j.organization_id,j.id) where j.organization_id=org and a.user_id=employee and not j.archived and j.id<>job_a order by j.name limit 1;
 if employee is null or approver is null or job_a is null then raise exception 'MIR TEST employee, approver and assigned job required';end if;
 update mir_core.punch_settings set module_enabled=true,gps_enabled=true,gps_required=false,radius_m=250,outside_policy='review',offline_enabled=true,auto_break_enabled=true,break_threshold_minutes=300,break_minutes=15,updated_by=approver,updated_at=now() where organization_id=org;
 if not exists(select 1 from mir_core.punch_shifts where organization_id=org and employee_id=employee and device_id='MIR-DEMO-ACTIF' and ended_at is null) then
  insert into mir_core.punch_shifts(organization_id,id,employee_id,started_at,device_id,status) values(org,shift_id,employee,now()-interval '2 hours','MIR-DEMO-ACTIF','active');
  insert into mir_core.punch_segments(organization_id,shift_id,job_id,segment_type,started_at,created_by) values(org,shift_id,job_a,'job',now()-interval '2 hours',employee);
  insert into mir_core.punch_events(organization_id,shift_id,employee_id,job_id,event_type,request_id,server_at,latitude,longitude,accuracy_m,distance_m,zone_status,device_id,payload) values(org,shift_id,employee,job_a,'in',gen_random_uuid(),now()-interval '2 hours',46.813900,-71.208000,18,42,'inside','MIR-DEMO-ACTIF','{"demo":true}');
 end if;
 if not exists(select 1 from mir_core.punch_shifts where organization_id=org and employee_id=employee and device_id='MIR-DEMO-SEMAINE') then
  insert into mir_core.punch_shifts(organization_id,id,employee_id,started_at,ended_at,device_id,status,auto_break_minutes) values(org,old_shift,employee,date_trunc('day',now())-interval '1 day'+interval '7 hours',date_trunc('day',now())-interval '1 day'+interval '15 hours 30 minutes','MIR-DEMO-SEMAINE','approved',15);
  insert into mir_core.punch_segments(organization_id,shift_id,job_id,segment_type,started_at,ended_at,created_by) values(org,old_shift,job_a,'job',date_trunc('day',now())-interval '1 day'+interval '7 hours',date_trunc('day',now())-interval '1 day'+interval '10 hours 15 minutes',employee);
  if job_b is not null then
   insert into mir_core.punch_segments(organization_id,shift_id,job_id,next_job_id,segment_type,started_at,ended_at,created_by) values(org,old_shift,job_a,job_b,'travel',date_trunc('day',now())-interval '1 day'+interval '10 hours 15 minutes',date_trunc('day',now())-interval '1 day'+interval '10 hours 45 minutes',employee);
   insert into mir_core.punch_segments(organization_id,shift_id,job_id,segment_type,started_at,ended_at,created_by) values(org,old_shift,job_b,'job',date_trunc('day',now())-interval '1 day'+interval '10 hours 45 minutes',date_trunc('day',now())-interval '1 day'+interval '15 hours 30 minutes',employee);
  end if;
  insert into mir_core.punch_corrections(organization_id,employee_id,shift_id,correction_type,proposed_at,proposed_job_id,explanation,original_data,proposed_data) values(org,employee,old_shift,'wrong_time',date_trunc('day',now())-interval '1 day'+interval '6 hours 55 minutes',job_a,'Le camion a quitté l’entrepôt cinq minutes plus tôt.','{"start":"07:00"}','{"start":"06:55"}');
  insert into mir_core.time_bank_movements(organization_id,employee_id,quantity,multiplier,reason,balance_before,balance_after,created_by,approved_by) values(org,employee,2,1.5,'Heures supplémentaires démonstration',0,3,approver,approver);
 end if;
end$$;
