-- Explicit selected job for the existing Chef read model; no permission expansion.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;end$$;
create function public.mir_lead_job_snapshot(org uuid,job uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);a mir_core.team_day_assignments;begin
 if coalesce(r,'')<>'chef_equipe' then raise exception 'Chef équipe requis' using errcode='42501';end if;
 if not coalesce(mir_core.job_allowed(org,job),false) then raise exception 'Chantier non autorisé' using errcode='42501';end if;
 select * into a from mir_core.team_day_assignments x where x.organization_id=org and x.work_date=current_date and x.leader_id=auth.uid() and x.job_id=job order by x.created_at desc limit 1;
 return jsonb_build_object('role',r,'selectedJobId',job,'today',current_date,'assignment',case when a.id is null then null else jsonb_build_object('id',a.id,'teamId',a.team_id,'jobId',a.job_id,'startTime',a.start_time) end,
 'team',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(c.display_name,''),m.user_id::text),'status',coalesce(at.status,'unconfirmed')) order by c.display_name) from mir_core.team_members m left join mir_core.staff_capabilities c on(c.organization_id,c.user_id)=(m.organization_id,m.user_id) left join mir_core.team_attendance at on(at.organization_id,at.assignment_id,at.user_id)=(m.organization_id,a.id,m.user_id) where m.organization_id=org and m.team_id=a.team_id and m.active),'[]'),
 'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'completedAt',t.completed_at) order by (t.completed_at is not null),t.created_at) from mir_core.team_tasks t where t.organization_id=org and t.team_id=a.team_id and t.job_id=job and t.work_date=current_date),'[]'),
 'materialRequests',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from mir_core.material_requests m where m.organization_id=org and m.team_id=a.team_id and m.job_id=job),'[]'),
 'issues',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from mir_core.field_issues i where i.organization_id=org and i.team_id=a.team_id and i.job_id=job),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(d) order by d.submitted_at desc) from mir_core.daily_reports d where d.organization_id=org and d.leader_id=auth.uid() and d.job_id=job),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(j) order by j.created_at desc) from mir_core.job_activity j where j.organization_id=org and j.job_id=job),'[]'));
end$$;
revoke all on function public.mir_lead_job_snapshot(uuid,uuid) from public,anon;
grant execute on function public.mir_lead_job_snapshot(uuid,uuid) to authenticated;
create or replace function public.mir_field_job_snapshot(org uuid,job uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if auth.uid() is null or not coalesce(mir_core.job_dossier_allowed(org,job),false) then raise exception 'Dossier inaccessible' using errcode='42501';end if;
 return jsonb_build_object('jobId',job,'job',(select jsonb_build_object('id',j.id,'number',to_jsonb(j)->>'job_number','clientName',to_jsonb(j)->>'client_name','name',j.name,'address',j.address,'city',j.city,'phone',j.phone,'closed',j.archived) from mir_core.jobs j where j.organization_id=org and j.id=job),'issues',coalesce((select jsonb_agg(to_jsonb(i)-'client_request_id' order by i.created_at desc) from (select * from mir_core.field_issues x where x.organization_id=org and x.job_id=job order by x.created_at desc limit 50) i),'[]'::jsonb));end$$;
commit;
