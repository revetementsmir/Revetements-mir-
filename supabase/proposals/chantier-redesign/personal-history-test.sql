-- Self-only read history. No management right or punch mutation is granted.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;end$$;
create or replace function public.mir_punch_personal_history(org uuid,filters jsonb default '{}',page_size integer default 25,page_after jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare rows jsonb;size integer:=least(greatest(coalesce(page_size,25),1),100);begin
 if auth.uid() is null or coalesce(mir_core.staff_role(org),'') not in('employe','chef_equipe') then raise exception 'Historique personnel refusé' using errcode='42501';end if;
 if coalesce(jsonb_typeof(filters),'null')<>'object' or exists(select 1 from jsonb_object_keys(filters) k where k not in('from','to','jobId')) or exists(select 1 from jsonb_each(filters) x where jsonb_typeof(x.value)<>'string') then raise exception 'Filtres invalides' using errcode='22023';end if;
 if page_after is not null and (jsonb_typeof(page_after)<>'object' or not(page_after ? 'date' and page_after ? 'id')) then raise exception 'Page invalide' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.work_date desc,x.id desc),'[]'::jsonb) into rows from(
 select s.id,s.work_date,s.started_at,s.ended_at,s.status,s.auto_break_minutes,s.source,
 coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'jobId',g.job_id,'jobName',j.name,'type',g.segment_type,'startedAt',g.started_at,'endedAt',g.ended_at) order by g.started_at,g.id) from mir_core.punch_segments g left join mir_core.jobs j on(j.organization_id,j.id)=(g.organization_id,g.job_id) where g.organization_id=org and g.shift_id=s.id),'[]'::jsonb) segments,
 coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'type',c.correction_type,'status',c.status,'explanation',c.explanation,'decisionReason',c.decision_reason,'createdAt',c.created_at) order by c.created_at,c.id) from mir_core.punch_corrections c where c.organization_id=org and c.employee_id=auth.uid() and c.shift_id=s.id),'[]'::jsonb) corrections,
 coalesce((select jsonb_agg(jsonb_build_object('label',p.label,'status',p.status,'startsOn',p.starts_on,'endsOn',p.ends_on)) from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on),'[]'::jsonb) periods
 from mir_core.punch_shifts s where s.organization_id=org and s.employee_id=auth.uid()
 and (nullif(filters->>'from','') is null or s.work_date>=(filters->>'from')::date) and (nullif(filters->>'to','') is null or s.work_date<=(filters->>'to')::date)
 and (nullif(filters->>'jobId','') is null or exists(select 1 from mir_core.punch_segments g where g.organization_id=org and g.shift_id=s.id and g.job_id=(filters->>'jobId')::uuid))
 and (page_after is null or (s.work_date,s.id)<((page_after->>'date')::date,(page_after->>'id')::uuid))
 order by s.work_date desc,s.id desc limit size
 )x;
 return jsonb_build_object('items',rows,'nextAfter',case when jsonb_array_length(rows)=size then jsonb_build_object('date',rows->-1->>'work_date','id',rows->-1->>'id') else null end);
end$$;
revoke all on function public.mir_punch_personal_history(uuid,jsonb,integer,jsonb) from public,anon;
grant execute on function public.mir_punch_personal_history(uuid,jsonb,integer,jsonb) to authenticated;
commit;
