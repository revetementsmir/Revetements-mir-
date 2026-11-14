-- MIR TEST follow-up: bind historical correction approval to its reviewed shift.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST session required';end if;end$$;
-- Read-only projection of stored personal corrections, using the one calculator.
create function mir_core.punch_management_legacy_preview(org uuid,employee uuid,correction uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare c mir_core.punch_corrections;v jsonb;b jsonb;segments jsonb:='[]';g jsonb;settings jsonb;totals jsonb;start_at timestamptz;end_at timestamptz;as_of timestamptz:=clock_timestamp();pos integer:=0;n integer;found_segment boolean:=false;jid uuid;exception_applied boolean;override_minutes integer;
begin
 perform mir_core.punch_management_guard(org);
 if coalesce(mir_core.staff_role(org,employee),'') not in('employe','chef_equipe','warehouse','assistant','boss') then raise exception 'Employé actif requis' using errcode='42501';end if;
 select to_jsonb(p) into settings from mir_core.punch_settings p where p.organization_id=org and p.module_enabled;if settings is null then raise exception 'Le système de punch est désactivé' using errcode='42501';end if;
 select * into c from mir_core.punch_corrections x where x.organization_id=org and x.employee_id=employee and x.id=correction and x.status in('pending','clarification');
 if c.id is null or c.proposed_data->>'management'='true' then raise exception 'Demande historique à vérifier requise' using errcode='22023';end if;
 v:=mir_core.punch_management_shift(org,c.shift_id,as_of);if v is null then raise exception 'Quart historique introuvable' using errcode='22023';end if;
 if exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=c.shift_id and(s.status in('locked','approved') or exists(select 1 from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on and p.status in('locked','approved')))) then raise exception 'Semaine approuvée ou verrouillée : réouverture Boss requise' using errcode='42501';end if;
 b:=c.proposed_data;start_at:=(v#>>'{shift,started_at}')::timestamptz;end_at:=nullif(v#>>'{shift,ended_at}','')::timestamptz;
 if c.correction_type in('missing_in','wrong_in') then start_at:=(b->>'proposedAt')::timestamptz;end if;
 if c.correction_type in('missing_out','wrong_out') then end_at:=(b->>'proposedAt')::timestamptz;end if;
 if start_at>as_of or end_at>as_of then raise exception 'Heures futures interdites' using errcode='22023';end if;
 if start_at is null or start_at>coalesce(end_at,as_of) then raise exception 'Bornes historiques invalides' using errcode='22023';end if;
 if exists(select 1 from mir_core.punch_shifts x where x.organization_id=org and x.employee_id=employee and x.id<>c.shift_id and tstzrange(x.started_at,x.ended_at,'[)')&&tstzrange(start_at,end_at,'[)')) then raise exception 'Chevauchement avec un autre quart' using errcode='23P01';end if;
 n:=jsonb_array_length(v->'segments');
 for g in select value from jsonb_array_elements(v->'segments') loop
  pos:=pos+1;
  if pos=1 and c.correction_type in('missing_in','wrong_in') then g:=g||jsonb_build_object('startedAt',start_at);end if;
  if pos=n and c.correction_type in('missing_out','wrong_out') then g:=g||jsonb_build_object('endedAt',end_at);end if;
  if c.correction_type in('wrong_job','wrong_travel') and g->>'id'=b->>'segmentId' then
   found_segment:=true;
   if c.correction_type='wrong_job' then
    jid:=(b->>'jobId')::uuid;
    if g->>'type'<>'job' or jid is null or not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=jid and not j.archived and mir_core.job_allowed(org,jid,employee)) then raise exception 'Chantier non autorisé pour cet employé' using errcode='42501';end if;
    g:=g||jsonb_build_object('jobId',jid);
   else
    if g->>'type'<>'travel' then raise exception 'Déplacement historique introuvable' using errcode='22023';end if;
    g:=g||jsonb_build_object('startedAt',(b->>'startedAt')::timestamptz,'endedAt',(b->>'endedAt')::timestamptz);
   end if;
  end if;
  segments:=segments||jsonb_build_array(g);
 end loop;
 if c.correction_type in('wrong_job','wrong_travel') and not found_segment then raise exception 'Segment historique introuvable' using errcode='22023';end if;
 exception_applied:=c.correction_type='lunch_not_taken' or coalesce((v#>>'{calculationPolicy,lunchException}')::boolean,false);override_minutes:=nullif(v#>>'{calculationPolicy,breakOverride}','')::integer;
 totals:=mir_core.punch_calculate(start_at,coalesce(end_at,as_of),segments,settings,exception_applied,override_minutes);
 return jsonb_build_object('kind',c.correction_type,'employeeId',employee,'shiftId',c.shift_id,'startedAt',start_at,'endedAt',end_at,'segments',segments,'totals',totals,'body',jsonb_build_object('legacyCorrectionId',c.id),'original',v-'totals'-'provisional','provisional',end_at is null);
end$$;
revoke all on function mir_core.punch_management_legacy_preview(uuid,uuid,uuid) from public,anon,authenticated;
alter function public.mir_punch_management_preview(uuid,uuid,jsonb) rename to mir_punch_management_preview_before_legacy;
create function public.mir_punch_management_preview(org uuid,employee uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin
 perform mir_core.punch_management_guard(org);
 if payload?'legacyCorrectionId' then
  if jsonb_typeof(payload)<>'object' or (payload-array['legacyCorrectionId'])<>'{}'::jsonb then raise exception 'Référence historique seule requise' using errcode='22023';end if;
  return mir_core.punch_management_legacy_preview(org,employee,(payload->>'legacyCorrectionId')::uuid);
 end if;
 return public.mir_punch_management_preview_before_legacy(org,employee,payload);
end$$;
revoke all on function public.mir_punch_management_preview_before_legacy(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_management_preview(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_management_preview(uuid,uuid,jsonb) to authenticated;

alter function public.mir_punch_management_action(uuid,uuid,text,uuid,jsonb) rename to mir_punch_management_action_before_legacy_revision;
create function public.mir_punch_management_action(org uuid,request_id uuid,action text,employee uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare c mir_core.punch_corrections;current_value jsonb;r text;
begin
 r:=mir_core.punch_management_guard(org);
 if action='decide' and payload->>'decision'='approved' then
  if r<>'boss' then raise exception 'Décision explicite du Boss requise' using errcode='42501';end if;
  -- Keep exactly the installed action's order, including the request lock.
  perform pg_advisory_xact_lock(hashtextextended(org::text||coalesce(employee::text,'period'),0));
  perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,1));
  perform pg_advisory_xact_lock_shared(hashtextextended(org::text||'punch-period',77));
  -- A committed receipt is checked by the original action, including actor and
  -- immutable intent, before looking at a now-changed revision or decided row.
  if exists(select 1 from mir_core.punch_management_receipts p where p.organization_id=org and p.request_id=$2) then return public.mir_punch_management_action_before_legacy_revision(org,request_id,action,employee,payload);end if;
  select * into c from mir_core.punch_corrections x where x.organization_id=org and x.id=(payload->>'correctionId')::uuid and x.employee_id=employee for update;
  if c.id is not null and c.proposed_data->>'management' is distinct from 'true' then
   perform 1 from mir_core.punch_settings where organization_id=org for share;
   perform 1 from mir_core.time_periods where organization_id=org order by id for share;
   perform 1 from mir_core.punch_shifts where organization_id=org and employee_id=employee order by id for update;
   perform 1 from mir_core.punch_segments g join mir_core.punch_shifts s on(s.organization_id,s.id)=(g.organization_id,g.shift_id) where g.organization_id=org and s.employee_id=employee order by g.id for update of g;
   if exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=c.shift_id and(s.status in('locked','approved') or exists(select 1 from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on and p.status in('locked','approved')))) then raise exception 'Semaine approuvée ou verrouillée : réouverture Boss requise' using errcode='42501';end if;
   current_value:=mir_core.punch_management_shift(org,c.shift_id);
   if current_value is null or nullif(payload->>'revision','') is null or payload->>'revision' is distinct from current_value->>'revision' then raise exception 'Les heures ou règles ont changé : vérifiez de nouveau la décision' using errcode='40001';end if;
   perform mir_core.punch_management_legacy_preview(org,employee,c.id);
  end if;
 end if;
 return public.mir_punch_management_action_before_legacy_revision(org,request_id,action,employee,payload);
end$$;
revoke all on function public.mir_punch_management_action_before_legacy_revision(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_management_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_management_action(uuid,uuid,text,uuid,jsonb) to authenticated;
commit;
