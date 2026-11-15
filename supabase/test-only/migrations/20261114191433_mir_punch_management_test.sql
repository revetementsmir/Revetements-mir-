-- MIR TEST only. One Punch ledger; management proposals use its corrections.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST session required';end if;end$$;

create or replace function mir_core.punch_management_guard(org uuid) returns text
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare r text:=mir_core.staff_role(org);
begin
 if (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iss') is distinct from 'https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1'
 or auth.uid() is null or coalesce(r,'') not in('assistant','boss')
 or not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=auth.uid() and m.active)
 then raise exception 'Gestion MIR TEST active requise' using errcode='42501';end if;
 return r;
end$$;
revoke all on function mir_core.punch_management_guard(uuid) from public,anon,authenticated;

create or replace function mir_core.punch_redact_location(value jsonb) returns jsonb language plpgsql immutable security invoker set search_path=pg_catalog as $$declare result jsonb;k text;v jsonb;begin
 if jsonb_typeof(value)='object' then result:='{}';for k,v in select * from jsonb_each(value) loop if k<>all(array['latitude','longitude','lat','lon','lng','accuracy','accuracy_m','gps','position','location','coords','coordinates']) then result:=result||jsonb_build_object(k,mir_core.punch_redact_location(v));end if;end loop;return result;
 elsif jsonb_typeof(value)='array' then select coalesce(jsonb_agg(mir_core.punch_redact_location(x)),'[]') into result from jsonb_array_elements(value)x;return result;end if;return value;
end$$;
revoke all on function mir_core.punch_redact_location(jsonb) from public,anon,authenticated;

-- Pure arithmetic, used by preview, writes, snapshots and exports. No GPS or
-- guessed lunch timestamp. Automatic allocation is accounting, not observation.
create or replace function mir_core.punch_calculate(start_at timestamptz,end_at timestamptz,segments jsonb,settings jsonb,lunch_exception boolean default false,break_override integer default null) returns jsonb
language plpgsql immutable security invoker set search_path=pg_catalog as $$
declare g jsonb;cursor_at timestamptz:=start_at;gs timestamptz;ge timestamptz;gross numeric;explicit_break numeric:=0;job_seconds numeric:=0;travel_seconds numeric:=0;warehouse_seconds numeric:=0;policy_seconds numeric;extra_break numeric;allocatable numeric;jobs jsonb;actual_segments jsonb:='[]';
begin
 if start_at is null or end_at is null or end_at<start_at or jsonb_typeof(segments) is distinct from 'array' or jsonb_array_length(segments)=0 then raise exception 'Bornes et segments requis' using errcode='22023';end if;
 gross:=extract(epoch from(end_at-start_at));
 for g in select value from jsonb_array_elements(segments) order by (value->>'startedAt')::timestamptz,value->>'id' loop
  gs:=(g->>'startedAt')::timestamptz;ge:=coalesce(nullif(g->>'endedAt','')::timestamptz,end_at);
  if gs is distinct from cursor_at or ge<gs or ge>end_at or coalesce(g->>'type','') not in('job','travel','warehouse','break') then raise exception 'Segments discontinus, inversés ou chevauchants' using errcode='22023';end if;
  cursor_at:=ge;actual_segments:=actual_segments||jsonb_build_array(g||jsonb_build_object('seconds',extract(epoch from(ge-gs))));
  case g->>'type' when 'break' then explicit_break:=explicit_break+extract(epoch from(ge-gs));when 'job' then job_seconds:=job_seconds+extract(epoch from(ge-gs));when 'travel' then travel_seconds:=travel_seconds+extract(epoch from(ge-gs));else warehouse_seconds:=warehouse_seconds+extract(epoch from(ge-gs));end case;
 end loop;
 if cursor_at is distinct from end_at then raise exception 'La fin des segments diffère du quart' using errcode='22023';end if;
 if break_override is not null and (break_override<0 or break_override>1440) then raise exception 'Pause invalide' using errcode='22023';end if;
 policy_seconds:=case when break_override is not null then break_override*60 when lunch_exception then 0 when coalesce((settings->>'auto_break_enabled')::boolean,true) and gross>coalesce((settings->>'break_threshold_minutes')::integer,300)*60 then coalesce((settings->>'break_minutes')::integer,15)*60 else 0 end;
 extra_break:=least(greatest(0,gross-explicit_break),greatest(0,policy_seconds-explicit_break));allocatable:=least(extra_break,job_seconds);
 with amounts as(select value->>'jobId' jid,sum((value->>'seconds')::numeric) seconds from jsonb_array_elements(actual_segments) where value->>'type'='job' group by value->>'jobId'),
 raw as(select *,case when job_seconds>0 then allocatable*seconds/job_seconds else 0 end portion from amounts),
 rounded as(select *,floor(portion*1000000) base,row_number() over(order by portion*1000000-floor(portion*1000000) desc,jid nulls last) priority from raw),
 exact as(select *,(base+case when priority<=round(allocatable*1000000)-sum(base) over() then 1 else 0 end)/1000000 deducted from rounded)
 select coalesce(jsonb_agg(jsonb_build_object('jobId',jid,'actualSeconds',seconds,'accountingBreakSeconds',deducted,'paidSeconds',seconds-deducted) order by jid),'[]') into jobs from exact;
 return jsonb_build_object('grossSeconds',gross,'explicitBreakSeconds',explicit_break,'policyBreakSeconds',policy_seconds,'automaticRemainderSeconds',extra_break,'totalBreakSeconds',explicit_break+extra_break,'paidSeconds',greatest(0,gross-explicit_break-extra_break),'jobSeconds',job_seconds,'travelSeconds',travel_seconds,'warehouseSeconds',warehouse_seconds,'unallocatedAccountingBreakSeconds',extra_break-allocatable,'jobs',jobs,'segments',actual_segments,'allocation','accounting-pro-rata-job','rule','strictly-over-threshold-v1');
end$$;
revoke all on function mir_core.punch_calculate(timestamptz,timestamptz,jsonb,jsonb,boolean,integer) from public,anon,authenticated;

create or replace function mir_core.punch_management_shift(org uuid,sid uuid,as_of timestamptz default clock_timestamp()) returns jsonb
language plpgsql stable security invoker set search_path=pg_catalog,mir_core as $$
declare s mir_core.punch_shifts;settings jsonb;segs jsonb;totals jsonb;raw jsonb;exception_applied boolean;override_minutes integer;
begin
 select * into s from mir_core.punch_shifts where organization_id=org and id=sid;if not found then return null;end if;
 select to_jsonb(p) into settings from mir_core.punch_settings p where p.organization_id=org;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'jobId',g.job_id,'jobName',j.name,'jobNumber',to_jsonb(j)->>'job_number','type',g.segment_type,'startedAt',g.started_at,'endedAt',g.ended_at,'nextJobId',g.next_job_id) order by g.started_at,g.id),'[]') into segs from mir_core.punch_segments g left join mir_core.jobs j on(j.organization_id,j.id)=(g.organization_id,g.job_id) where g.organization_id=org and g.shift_id=sid;
 select exists(select 1 from mir_core.punch_corrections c where c.organization_id=org and c.shift_id=sid and c.correction_type='lunch_not_taken' and c.status='approved') into exception_applied;
 select (c.proposed_data->>'breakMinutes')::integer into override_minutes from mir_core.punch_corrections c where c.organization_id=org and c.shift_id=sid and c.status='approved' and c.proposed_data->>'management'='true' and c.proposed_data->>'breakMinutes' is not null order by c.decided_at desc,c.id desc limit 1;
 raw:=jsonb_build_object('shift',to_jsonb(s),'segments',segs,'calculationPolicy',jsonb_build_object('enabled',settings->'auto_break_enabled','threshold',settings->'break_threshold_minutes','minutes',settings->'break_minutes','travelRule',settings->'travel_rule','lunchException',exception_applied,'breakOverride',override_minutes));
 begin totals:=mir_core.punch_calculate(s.started_at,coalesce(s.ended_at,as_of),segs,coalesce(settings,'{}'),exception_applied,override_minutes);exception when sqlstate '22023' then totals:=jsonb_build_object('invalid',true,'error','Chronologie à vérifier');end;
 return raw||jsonb_build_object('revision',md5(raw::text),'totals',totals,'provisional',s.ended_at is null);
end$$;
revoke all on function mir_core.punch_management_shift(uuid,uuid,timestamptz) from public,anon,authenticated;

create table if not exists mir_core.punch_management_receipts(
 organization_id uuid not null,request_id uuid not null,actor_id uuid not null,intent jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(organization_id,request_id),foreign key(organization_id,actor_id) references mir_core.memberships(organization_id,user_id));
alter table mir_core.punch_management_receipts enable row level security;
revoke all on mir_core.punch_management_receipts from public,anon,authenticated;

create or replace function public.mir_punch_management_snapshot(org uuid,start_on date,end_on date,employee uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare role_name text;people jsonb;days jsonb;requests jsonb;anomalies jsonb;settings jsonb;as_of timestamptz:=statement_timestamp();
begin
 role_name:=mir_core.punch_management_guard(org);
 if start_on is null or end_on is null or end_on<start_on or end_on-start_on>31 then raise exception 'Période de 32 jours maximum requise' using errcode='22023';end if;
 select to_jsonb(p)-'updated_by' into settings from mir_core.punch_settings p where p.organization_id=org;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.user_id,'name',coalesce(nullif(c.display_name,''),'Employé'),'role',c.staff_role) order by c.display_name,c.user_id),'[]') into people from mir_core.staff_capabilities c join mir_core.memberships m on(m.organization_id,m.user_id)=(c.organization_id,c.user_id) where c.organization_id=org and c.active and m.active and m.role='employee' and c.staff_role in('employe','chef_equipe','warehouse','assistant','boss') and(employee is null or c.user_id=employee);
 select coalesce(jsonb_agg(mir_core.punch_management_shift(org,s.id,as_of) order by s.work_date,s.employee_id,s.started_at),'[]') into days from mir_core.punch_shifts s where s.organization_id=org and s.work_date between start_on and end_on and(employee is null or s.employee_id=employee);
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('requestedBy',(select a.actor_id from mir_core.punch_audit a where a.organization_id=org and a.entity_id=c.id and a.action in('management_proposed','correction_request') order by a.id limit 1)) order by c.created_at desc),'[]') into requests from mir_core.punch_corrections c left join mir_core.punch_shifts s on(s.organization_id,s.id)=(c.organization_id,c.shift_id) where c.organization_id=org and(employee is null or c.employee_id=employee) and(coalesce(s.work_date,nullif(c.proposed_data->>'workDate','')::date) between start_on and end_on or c.status in('pending','clarification'));
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'employeeId',e.employee_id,'shiftId',e.shift_id,'jobId',e.job_id,'kind',e.zone_status,'createdAt',e.server_at,'reason',e.outside_reason,'resolved',exists(select 1 from mir_core.punch_audit a where a.organization_id=org and a.entity_id=e.id and a.action='gps_resolved')) order by e.server_at desc),'[]') into anomalies from mir_core.punch_events e join mir_core.punch_shifts s on(s.organization_id,s.id)=(e.organization_id,e.shift_id) where e.organization_id=org and s.work_date between start_on and end_on and(employee is null or e.employee_id=employee) and e.zone_status in('outside','unavailable');
 anomalies:=anomalies||coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'employeeId',s.employee_id,'shiftId',s.id,'segmentId',g.id,'kind','job_missing','resolved',false)) from mir_core.punch_segments g join mir_core.punch_shifts s on(s.organization_id,s.id)=(g.organization_id,g.shift_id) where g.organization_id=org and g.segment_type='job' and g.job_id is null and s.work_date between start_on and end_on and(employee is null or s.employee_id=employee)),'[]');
 return jsonb_build_object('role',role_name,'asOf',as_of,'today',(as_of at time zone 'America/Toronto')::date,'people',people,'days',days,'requests',requests,'anomalies',anomalies,'settings',settings,
 'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'number',to_jsonb(j)->>'job_number','name',j.name,'address',j.address,'closed',j.archived,'members',coalesce((select jsonb_agg(jm.user_id) from mir_core.job_memberships jm where jm.organization_id=org and jm.job_id=j.id),'[]')) order by to_jsonb(j)->>'job_number',j.name) from mir_core.jobs j where j.organization_id=org),'[]'),
 'absences',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'employeeId',h.employee_id,'startDate',h.start_date,'endDate',h.end_date,'status',h.status)) from mir_core.hr_requests h where h.organization_id=org and h.status='approved' and h.start_date<=end_on and h.end_date>=start_on and(employee is null or h.employee_id=employee)),'[]'),
 'periods',coalesce((select jsonb_agg(to_jsonb(p) order by p.starts_on) from mir_core.time_periods p where p.organization_id=org and p.starts_on<=end_on and p.ends_on>=start_on),'[]'),
 'history',coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from(select id,created_at,actor_id,employee_id,action,entity_type,entity_id,reason,mir_core.punch_redact_location(payload) payload from mir_core.punch_audit where organization_id=org and(employee is null or employee_id=employee) and created_at>=(start_on::timestamp at time zone 'America/Toronto') and created_at<((end_on+1)::timestamp at time zone 'America/Toronto') order by id desc limit 100)a),'[]'));
end$$;
revoke all on function public.mir_punch_management_snapshot(uuid,date,date,uuid) from public,anon;
grant execute on function public.mir_punch_management_snapshot(uuid,date,date,uuid) to authenticated;

create or replace function mir_core.punch_management_time(value text) returns timestamptz
language plpgsql immutable security invoker set search_path=pg_catalog as $$
declare result timestamptz;
begin
 if nullif(value,'') is null then return null;end if;
 if value ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return value::timestamptz;end if;
 result:=value::timestamp at time zone 'America/Toronto';
 if to_char(result at time zone 'America/Toronto','YYYY-MM-DD"T"HH24:MI')<>left(value,16) then raise exception 'Heure locale inexistante' using errcode='22023';end if;
 return result;
end$$;
revoke all on function mir_core.punch_management_time(text) from public,anon,authenticated;

create or replace function mir_core.punch_management_plan(org uuid,employee uuid,body jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,mir_core as $$
declare kind text:=body->>'kind';sid uuid:=nullif(body->>'shiftId','')::uuid;jid uuid:=nullif(body->>'jobId','')::uuid;gid uuid:=nullif(body->>'segmentId','')::uuid;current_value jsonb;s mir_core.punch_shifts;start_at timestamptz;end_at timestamptz;at_time timestamptz;work_on date;segments jsonb:='[]';proposed jsonb;g jsonb;found_segment boolean:=false;settings jsonb;totals jsonb;override_minutes integer;exception_applied boolean:=false;policy_key text;
begin
 if coalesce(kind,'') not in('hours','transfer','job','gps') or jsonb_typeof(body) is distinct from 'object' or pg_column_size(body)>12000 or length(btrim(coalesce(body->>'reason','')))<3 then raise exception 'Action et motif requis' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(body) key where key<>all(array['kind','shiftId','jobId','segmentId','at','startedAt','endedAt','workDate','reason','breakMinutes','revision','eventId','policyRevision'])) then raise exception 'Champ de proposition non autorisé' using errcode='22023';end if;
 if not exists(select 1 from mir_core.punch_settings where organization_id=org and module_enabled) then raise exception 'Le système de punch est désactivé' using errcode='42501';end if;
 select md5((to_jsonb(p)-'updated_by'-'updated_at')::text) into policy_key from mir_core.punch_settings p where p.organization_id=org;
 if body?'policyRevision' and body->>'policyRevision' is distinct from policy_key then raise exception 'Les règles ont changé : nouvel aperçu requis' using errcode='40001';end if;
 if not exists(select 1 from mir_core.staff_capabilities c join mir_core.memberships m on(m.organization_id,m.user_id)=(c.organization_id,c.user_id) where c.organization_id=org and c.user_id=employee and c.active and m.active and m.role='employee' and c.staff_role in('employe','chef_equipe','warehouse','assistant','boss')) then raise exception 'Employé actif requis' using errcode='42501';end if;
 if kind='gps' then
  if not exists(select 1 from mir_core.punch_events e where e.organization_id=org and e.id=(body->>'eventId')::uuid and e.employee_id=employee and e.zone_status in('outside','unavailable')) then raise exception 'Anomalie inaccessible' using errcode='42501';end if;
  return jsonb_build_object('kind',kind,'policyRevision',policy_key,'employeeId',employee,'workDate',(select s.work_date from mir_core.punch_events e join mir_core.punch_shifts s on(s.organization_id,s.id)=(e.organization_id,e.shift_id) where e.organization_id=org and e.id=(body->>'eventId')::uuid),'body',body,'original','{}'::jsonb,'totals',null);
 end if;
 if sid is not null then
  select * into s from mir_core.punch_shifts where organization_id=org and id=sid and employee_id=employee;
  if not found then raise exception 'Quart inaccessible' using errcode='42501';end if;
  current_value:=mir_core.punch_management_shift(org,sid);
  if body->>'revision' is distinct from current_value->>'revision' then raise exception 'Le quart a changé ; rechargez son détail' using errcode='40001';end if;
  start_at:=s.started_at;end_at:=s.ended_at;segments:=current_value->'segments';
  select exists(select 1 from mir_core.punch_corrections c where c.organization_id=org and c.shift_id=sid and c.correction_type='lunch_not_taken' and c.status='approved') into exception_applied;
 elsif kind<>'hours' then raise exception 'Quart requis' using errcode='22023';end if;
 if kind='hours' then
  if body?'startedAt' then start_at:=mir_core.punch_management_time(body->>'startedAt');end if;
  if body?'endedAt' then end_at:=mir_core.punch_management_time(body->>'endedAt');end if;
  if s.ended_at is not null and end_at is null then raise exception 'Un quart terminé ne peut pas être rouvert ici' using errcode='22023';end if;
  if start_at is null and end_at is null then raise exception 'Une entrée ou une sortie est requise' using errcode='22023';end if;
 end if;
 work_on:=(coalesce(start_at,end_at) at time zone 'America/Toronto')::date;
 if nullif(body->>'workDate','') is not null and (body->>'workDate')::date<>work_on then raise exception 'Date et heure ne correspondent pas' using errcode='22023';end if;
 if exists(select 1 from mir_core.time_periods p where p.organization_id=org and p.status in('locked','approved') and(daterange(work_on,(coalesce(end_at,start_at) at time zone 'America/Toronto')::date,'[]')&&daterange(p.starts_on,p.ends_on,'[]') or s.work_date between p.starts_on and p.ends_on)) or s.status in('locked','approved') then raise exception 'Semaine approuvée ou verrouillée : réouverture Boss requise' using errcode='42501';end if;
 if start_at>clock_timestamp() or end_at>clock_timestamp() or end_at<start_at then raise exception 'Heures futures ou inversées interdites' using errcode='22023';end if;
 if jid is not null and not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=jid and not j.archived and mir_core.job_allowed(org,jid,employee)) then raise exception 'Chantier non autorisé pour cet employé' using errcode='42501';end if;
 if sid is null then
  if jid is null then raise exception 'Chantier requis' using errcode='22023';end if;
  if start_at is null then return jsonb_build_object('kind','hours','policyRevision',policy_key,'employeeId',employee,'workDate',work_on,'incomplete',true,'body',body,'original','{}'::jsonb,'totals',null,'knownEndedAt',end_at);end if;
  segments:=jsonb_build_array(jsonb_build_object('id',null,'jobId',jid,'type','job','startedAt',start_at,'endedAt',end_at));
 elsif kind='hours' then
  proposed:='[]';
  for g in select value from jsonb_array_elements(segments) with ordinality x(value,n) order by n loop
   if g->>'id'=segments->0->>'id' then g:=g||jsonb_build_object('startedAt',start_at);end if;
   if g->>'id'=segments->(jsonb_array_length(segments)-1)->>'id' then g:=g||jsonb_build_object('endedAt',end_at);end if;
   proposed:=proposed||jsonb_build_array(g);
  end loop;segments:=proposed;
 elsif kind in('transfer','job') then
  if jid is null then raise exception 'Destination requise' using errcode='22023';end if;
  at_time:=mir_core.punch_management_time(body->>'at');proposed:='[]';
  for g in select value from jsonb_array_elements(segments) loop
   if(kind='job' and g->>'id'=gid::text) or(kind='transfer' and g->>'type'='job' and at_time>(g->>'startedAt')::timestamptz and at_time<coalesce(nullif(g->>'endedAt','')::timestamptz,clock_timestamp())) then
    if g->>'type'<>'job' or g->>'jobId'=jid::text then raise exception 'Segment ou destination invalide' using errcode='22023';end if;
    found_segment:=true;
    if kind='transfer' then proposed:=proposed||jsonb_build_array(g||jsonb_build_object('endedAt',at_time));g:=g||jsonb_build_object('id',null,'startedAt',at_time);end if;
    g:=g||jsonb_build_object('jobId',jid);
   end if;
   proposed:=proposed||jsonb_build_array(g);
  end loop;
  if not found_segment then raise exception 'Heure ou segment de transfert introuvable' using errcode='22023';end if;segments:=proposed;
 end if;
 if exists(select 1 from mir_core.punch_shifts x where x.organization_id=org and x.employee_id=employee and x.id is distinct from sid and tstzrange(x.started_at,x.ended_at,'[)')&&tstzrange(start_at,end_at,'[)')) then raise exception 'Chevauchement avec un autre quart' using errcode='23P01';end if;
 select to_jsonb(p) into settings from mir_core.punch_settings p where p.organization_id=org;
 if body?'breakMinutes' and nullif(body->>'breakMinutes','') is not null then override_minutes:=(body->>'breakMinutes')::integer;
 elsif sid is not null then override_minutes:=nullif(current_value#>>'{calculationPolicy,breakOverride}','')::integer;end if;
 totals:=mir_core.punch_calculate(start_at,coalesce(end_at,clock_timestamp()),segments,coalesce(settings,'{}'),exception_applied,override_minutes);
 return jsonb_build_object('kind',kind,'policyRevision',policy_key,'employeeId',employee,'shiftId',sid,'workDate',work_on,'startedAt',start_at,'endedAt',end_at,'segments',segments,'totals',totals,'body',body,'original',coalesce(current_value-'totals'-'provisional','{}'::jsonb),'provisional',end_at is null);
end$$;
revoke all on function mir_core.punch_management_plan(uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function public.mir_punch_management_preview(org uuid,employee uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin perform mir_core.punch_management_guard(org);return mir_core.punch_management_plan(org,employee,payload);end$$;
revoke all on function public.mir_punch_management_preview(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_management_preview(uuid,uuid,jsonb) to authenticated;

create or replace function public.mir_punch_management_action(org uuid,request_id uuid,action text,employee uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare r text;prior mir_core.punch_management_receipts;intent jsonb;plan jsonb;cid uuid;sid uuid;g jsonb;row_c mir_core.punch_corrections;body jsonb;result jsonb;decision text;current_value jsonb;after_value jsonb;reason text:=left(btrim(coalesce(payload->>'reason','')),1200);
begin
 r:=mir_core.punch_management_guard(org);
 if request_id is null or jsonb_typeof(payload) is distinct from 'object' or pg_column_size(payload)>16384 or coalesce(action,'') not in('submit','decide','period') then raise exception 'Intention de gestion invalide' using errcode='22023';end if;
 if action='period' and employee is not null then raise exception 'Une décision de période ne cible pas un employé' using errcode='22023';end if;
 if action<>'period' and coalesce(mir_core.staff_role(org,employee),'') not in('employe','chef_equipe','warehouse','assistant','boss') then raise exception 'Employé actif requis' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||coalesce(employee::text,'period'),0));perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,1));
 if action='period' then perform pg_advisory_xact_lock(hashtextextended(org::text||'punch-period',77));else perform pg_advisory_xact_lock_shared(hashtextextended(org::text||'punch-period',77));end if;
 perform 1 from mir_core.punch_settings where organization_id=org and module_enabled for share;if not found then raise exception 'Le système de punch est désactivé' using errcode='42501';end if;
 intent:=jsonb_build_object('action',action,'employee',employee,'payload',payload);
 select * into prior from mir_core.punch_management_receipts x where x.organization_id=org and x.request_id=$2;
 if found then if prior.actor_id<>auth.uid() then raise exception 'Intention d’un autre compte' using errcode='42501';end if;if prior.intent<>intent then raise exception 'Intention déjà utilisée différemment' using errcode='22023';end if;return prior.result;end if;
 if action='period' then
  if r<>'boss' or coalesce(payload->>'operation','') not in('period_save','approve_period','lock_period','reopen_period') then raise exception 'Décision Boss requise' using errcode='42501';end if;
  result:=public.mir_punch_admin(org,payload->>'operation',payload-'operation');
 elsif action='submit' then
  plan:=mir_core.punch_management_plan(org,employee,payload);cid:=gen_random_uuid();
  insert into mir_core.punch_corrections(organization_id,id,employee_id,shift_id,correction_type,explanation,original_data,proposed_data) values(org,cid,employee,nullif(plan->>'shiftId','')::uuid,case when plan->>'incomplete'='true' then 'missing_in' else 'management_'||(plan->>'kind') end,reason,plan->'original',payload||jsonb_build_object('management',true,'policyRevision',plan->>'policyRevision','workDate',plan->>'workDate','requestedBy',auth.uid()));
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload) values(org,auth.uid(),employee,'management_proposed','correction',cid,reason,jsonb_build_object('before',plan->'original','after',plan-'original'));
  result:=jsonb_build_object('ok',true,'correctionId',cid,'status','pending','incomplete',plan->>'incomplete'='true');
 else
  if r<>'boss' then raise exception 'Décision explicite du Boss requise' using errcode='42501';end if;
  cid:=(payload->>'correctionId')::uuid;decision:=payload->>'decision';
  select * into row_c from mir_core.punch_corrections c where c.organization_id=org and c.id=cid and c.employee_id=employee for update;
  if not found or row_c.status not in('pending','clarification') or employee=auth.uid() or decision not in('approved','refused','clarification') or length(reason)<3 then raise exception 'Décision ou demande non autorisée' using errcode='42501';end if;
  perform 1 from mir_core.time_periods where organization_id=org order by id for share;
  perform 1 from mir_core.punch_shifts where organization_id=org and employee_id=employee order by id for update;
  perform 1 from mir_core.punch_segments g join mir_core.punch_shifts s on(s.organization_id,s.id)=(g.organization_id,g.shift_id) where g.organization_id=org and s.employee_id=employee order by g.id for update of g;
  if decision='approved' and exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=row_c.shift_id and(s.status in('locked','approved') or exists(select 1 from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on and p.status in('locked','approved')))) then raise exception 'Semaine approuvée ou verrouillée : réouverture Boss requise' using errcode='42501';end if;
  if row_c.proposed_data->>'management' is distinct from 'true' then
   perform public.mir_punch_correction(org,cid,jsonb_build_object('decision',decision,'reason',reason));result:=jsonb_build_object('ok',true,'correctionId',cid,'status',decision);
  else
   body:=row_c.proposed_data-array['management','requestedBy','workDate'];
   if nullif(payload->>'startedAt','') is not null then body:=body||jsonb_build_object('startedAt',payload->>'startedAt');end if;
   if decision='approved' then
    plan:=mir_core.punch_management_plan(org,employee,body);
    if plan->>'incomplete'='true' then raise exception 'Complétez l’entrée connue avant approbation ; aucune durée n’est inventée' using errcode='22023';end if;
    if plan->'original'<>row_c.original_data then raise exception 'Les données ont changé depuis la demande' using errcode='40001';end if;
    if plan->>'kind'='gps' then
     insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload) values(org,auth.uid(),employee,'gps_resolved','punch_event',(body->>'eventId')::uuid,reason,jsonb_build_object('correctionId',cid));
    else
     sid:=nullif(plan->>'shiftId','')::uuid;
     if sid is null then
      insert into mir_core.punch_shifts(organization_id,employee_id,work_date,started_at,ended_at,status,auto_break_minutes,source,device_id) values(org,employee,(plan->>'workDate')::date,(plan->>'startedAt')::timestamptz,nullif(plan->>'endedAt','')::timestamptz,case when plan->>'endedAt' is null then 'active' else 'review' end,((plan#>>'{totals,policyBreakSeconds}')::numeric/60)::integer,'online','MIR-MANAGEMENT-EXPLICIT') returning id into sid;
     else
      update mir_core.punch_shifts set started_at=(plan->>'startedAt')::timestamptz,ended_at=nullif(plan->>'endedAt','')::timestamptz,status=case when plan->>'endedAt' is null then 'active' else 'review' end,work_date=(plan->>'workDate')::date,auto_break_minutes=((plan#>>'{totals,policyBreakSeconds}')::numeric/60)::integer where organization_id=org and id=sid;
     end if;
     -- Update originals in place, insert only the new piece of a transfer.
     for g in select value from jsonb_array_elements(plan->'segments') loop
      if nullif(g->>'id','') is null then insert into mir_core.punch_segments(organization_id,shift_id,job_id,segment_type,started_at,ended_at,next_job_id,created_by) values(org,sid,nullif(g->>'jobId','')::uuid,g->>'type',(g->>'startedAt')::timestamptz,nullif(g->>'endedAt','')::timestamptz,nullif(g->>'nextJobId','')::uuid,auth.uid());
      else update mir_core.punch_segments set job_id=nullif(g->>'jobId','')::uuid,started_at=(g->>'startedAt')::timestamptz,ended_at=nullif(g->>'endedAt','')::timestamptz where organization_id=org and shift_id=sid and id=(g->>'id')::uuid;end if;
     end loop;
     update mir_core.punch_corrections set shift_id=sid where organization_id=org and id=cid;
     after_value:=mir_core.punch_management_shift(org,sid);
    end if;
   end if;
   update mir_core.punch_corrections set status=decision,decided_by=auth.uid(),decision_reason=reason,decided_at=now(),proposed_data=proposed_data||case when payload?'startedAt' then jsonb_build_object('startedAt',payload->>'startedAt') else '{}'::jsonb end where organization_id=org and id=cid;
   if sid is not null then after_value:=mir_core.punch_management_shift(org,sid);end if;
   insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload) values(org,auth.uid(),employee,'management_'||decision,'correction',cid,reason,jsonb_build_object('before',row_c.original_data,'after',after_value,'proposed',body));
   result:=jsonb_build_object('ok',true,'correctionId',cid,'shiftId',sid,'status',decision);
  end if;
 end if;
 insert into mir_core.punch_management_receipts(organization_id,request_id,actor_id,intent,result) values(org,request_id,auth.uid(),intent,result);return result;
end$$;
revoke all on function public.mir_punch_management_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_management_action(uuid,uuid,text,uuid,jsonb) to authenticated;

-- Existing endpoints remain available, but cannot bypass the Boss decision for
-- the new management requests. Legacy personal requests keep their old route.
do $$begin if to_regprocedure('public.mir_punch_correction_before_management(uuid,uuid,jsonb)') is null then alter function public.mir_punch_correction(uuid,uuid,jsonb) rename to mir_punch_correction_before_management;end if;end$$;
create or replace function public.mir_punch_correction(org uuid,correction uuid default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare target uuid;sid uuid;begin
 if correction is not null and exists(select 1 from mir_core.punch_corrections c where c.organization_id=org and c.id=correction and c.proposed_data->>'management'='true') then raise exception 'Utilisez la décision Boss du poste Équipes et heures' using errcode='42501';end if;
 if correction is not null then
  select employee_id,shift_id into target,sid from mir_core.punch_corrections where organization_id=org and id=correction;
  if target is not null then perform pg_advisory_xact_lock(hashtextextended(org::text||target::text,0));end if;
  perform pg_advisory_xact_lock_shared(hashtextextended(org::text||'punch-period',77));
  perform 1 from mir_core.punch_shifts where organization_id=org and id=sid for update;
  if payload->>'decision'='approved' and exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=sid and(s.status in('locked','approved') or exists(select 1 from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on and p.status in('locked','approved')))) then raise exception 'Semaine verrouillée : réouverture Boss requise' using errcode='42501';end if;
 end if;
 return public.mir_punch_correction_before_management(org,correction,payload);
end$$;
revoke all on function public.mir_punch_correction_before_management(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_correction(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_correction(uuid,uuid,jsonb) to authenticated;

-- Shared period gate comes AFTER the employee advisory lock, including when
-- the field receipt adapter already owns that lock. Period decisions take the
-- exclusive gate before any row lock and never acquire employee advisories.
do $$begin if to_regprocedure('public.mir_punch_admin_before_management(uuid,text,jsonb)') is null then alter function public.mir_punch_admin(uuid,text,jsonb) rename to mir_punch_admin_before_management;end if;end$$;
create or replace function public.mir_punch_admin(org uuid,action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare result jsonb;target uuid;sid uuid;changed integer;
begin
 if coalesce(mir_core.staff_role(org),'') not in('boss','admin') then raise exception 'Boss requis' using errcode='42501';end if;
 if action in('period_save','approve_period','lock_period','reopen_period') then perform pg_advisory_xact_lock(hashtextextended(org::text||'punch-period',77));
 else
  if action='shift_correct' then select id,employee_id into sid,target from mir_core.punch_shifts where organization_id=org and id=(payload->>'shiftId')::uuid;if target is not null then perform pg_advisory_xact_lock(hashtextextended(org::text||target::text,0));end if;end if;
  perform pg_advisory_xact_lock_shared(hashtextextended(org::text||'punch-period',77));
  if sid is not null and exists(select 1 from mir_core.punch_shifts s where s.organization_id=org and s.id=sid and(s.status in('locked','approved') or exists(select 1 from mir_core.time_periods p where p.organization_id=org and s.work_date between p.starts_on and p.ends_on and p.status in('locked','approved')))) then raise exception 'Semaine verrouillée : réouverture Boss requise' using errcode='42501';end if;
 end if;
 if action in('approve_period','lock_period') and exists(select 1 from mir_core.punch_shifts s join mir_core.time_periods p on p.organization_id=s.organization_id and s.work_date between p.starts_on and p.ends_on where p.organization_id=org and p.id=(payload->>'periodId')::uuid and s.ended_at is null) then raise exception 'Un quart est encore en cours dans cette semaine' using errcode='22023';end if;
 result:=public.mir_punch_admin_before_management(org,action,payload);
 if action='reopen_period' then
  update mir_core.punch_shifts s set status=case when s.ended_at is null then 'active' else 'review' end from mir_core.time_periods p where p.organization_id=org and p.id=(payload->>'periodId')::uuid and p.status='reopened' and s.organization_id=org and s.work_date between p.starts_on and p.ends_on and s.status='locked';get diagnostics changed=row_count;
  if changed>0 then insert into mir_core.punch_audit(organization_id,actor_id,action,entity_type,entity_id,reason,payload) values(org,auth.uid(),'period_shifts_reopened','period',(payload->>'periodId')::uuid,payload->>'reason',jsonb_build_object('before','locked','after','review','count',changed));end if;
 end if;
 return result;
end$$;
revoke all on function public.mir_punch_admin_before_management(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_admin(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_punch_admin(uuid,text,jsonb) to authenticated;

-- Delegate to the existing engine, correcting only its TEST lunch boundary.
-- No parameter/configuration change and no replay of a business action.
do $$begin if to_regprocedure('public.mir_punch_action_before_management(uuid,uuid,text,uuid,jsonb)') is null then alter function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) rename to mir_punch_action_before_management;end if;end$$;
create or replace function public.mir_punch_action(org uuid,request_id uuid,action text,job uuid default null,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare result jsonb;s mir_core.punch_shifts;details jsonb;minutes integer;
begin
 if auth.uid() is not null then
  perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text,0));
  perform pg_advisory_xact_lock_shared(hashtextextended(org::text||'punch-period',77));
 end if;
 result:=public.mir_punch_action_before_management(org,request_id,action,job,payload);
 if action='out' and (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iss')='https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1' then
  select * into s from mir_core.punch_shifts where organization_id=org and id=(result->>'shiftId')::uuid and employee_id=auth.uid() for update;
  details:=mir_core.punch_management_shift(org,s.id);minutes:=((details#>>'{totals,policyBreakSeconds}')::numeric/60)::integer;
  if minutes is not null and minutes<>s.auto_break_minutes then
   update mir_core.punch_shifts set auto_break_minutes=minutes where organization_id=org and id=s.id;
   insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload) values(org,auth.uid(),auth.uid(),'break_policy_adjusted','shift',s.id,'Dîner strictement après le seuil',jsonb_build_object('beforeMinutes',s.auto_break_minutes,'afterMinutes',minutes,'rule','strictly-over-threshold-v1'));
  end if;
 end if;
 return result;
end$$;
revoke all on function public.mir_punch_action_before_management(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) to authenticated;

do $$begin if to_regprocedure('public.mir_punch_snapshot_before_management(uuid,uuid)') is null then alter function public.mir_punch_snapshot(uuid,uuid) rename to mir_punch_snapshot_before_management;end if;end$$;
create or replace function public.mir_punch_snapshot(org uuid,employee uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare result jsonb;week jsonb;active jsonb;
begin
 result:=public.mir_punch_snapshot_before_management(org,employee);
 select coalesce(jsonb_agg(value||jsonb_build_object('totals',mir_core.punch_management_shift(org,(value->>'id')::uuid)->'totals')),'[]') into week from jsonb_array_elements(coalesce(result->'week','[]'));
 active:=result->'activeShift';if active is not null and active<>'null'::jsonb then active:=active||jsonb_build_object('totals',mir_core.punch_management_shift(org,(active->>'id')::uuid)->'totals');end if;
 return result||jsonb_build_object('week',week,'activeShift',active);
end$$;
revoke all on function public.mir_punch_snapshot_before_management(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mir_punch_snapshot(uuid,uuid) from public,anon;
grant execute on function public.mir_punch_snapshot(uuid,uuid) to authenticated;

commit;
