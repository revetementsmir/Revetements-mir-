-- Additive MIR TEST adapter; the existing Punch engine remains authoritative.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST session required';end if;end$$;
create table mir_core.field_punch_receipts(
 organization_id uuid not null,request_id uuid not null,actor_id uuid not null,
 intent jsonb not null,first_observation jsonb not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(organization_id,request_id),foreign key(organization_id,actor_id) references mir_core.memberships(organization_id,user_id));
alter table mir_core.field_punch_receipts enable row level security;
revoke all on mir_core.field_punch_receipts from public,anon,authenticated;
create function public.mir_field_punch_action(org uuid,request_id uuid,action text,job uuid default null,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid();prior mir_core.field_punch_receipts;legacy mir_core.punch_events;intended jsonb;receipt jsonb;observation jsonb:=payload;sid uuid;gid uuid;
begin
 if (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iss') is distinct from 'https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1'
 or actor is null or coalesce(mir_core.staff_role(org,actor),'') not in('employe','chef_equipe')
 or not exists(select 1 from mir_core.memberships m where m.organization_id=$1 and m.user_id=actor and m.active)
 then raise exception 'Active MIR TEST field identity required' using errcode='42501';end if;
 if request_id is null or coalesce(action,'') not in('in','out','switch','travel_start','travel_arrive')
 or jsonb_typeof(payload) is distinct from 'object' or pg_column_size(payload)>16384
 then raise exception 'Invalid Punch intention' using errcode='22023';end if;
 -- Same lock as the engine, plus the org-wide request identity. This also
 -- prevents two different UUID actions from racing for the same active shift.
 perform pg_advisory_xact_lock(hashtextextended(org::text||actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,1));
 intended:=jsonb_build_object('action',action,'jobId',job);
 select * into prior from mir_core.field_punch_receipts r where r.organization_id=$1 and r.request_id=$2;
 if found then
  if prior.actor_id<>actor then raise exception 'Punch request belongs to another identity' using errcode='42501';end if;
  if prior.intent<>intended then raise exception 'Punch request already used for another intention' using errcode='22023';end if;
  return prior.result;
 end if;
 if exists(select 1 from mir_core.punch_events e where e.organization_id=$1 and e.request_id=$2 and e.employee_id<>actor)
 then raise exception 'Punch request belongs to another identity' using errcode='42501';end if;
 -- A persisted queue from an older APK may already have committed through the
 -- original RPC. Its event proves registration; never execute the engine again.
 select * into legacy from mir_core.punch_events e where e.organization_id=$1 and e.employee_id=actor and e.request_id=$2;
 if found then
  if legacy.event_type<>action or legacy.job_id is distinct from job then raise exception 'Punch request already used for another intention' using errcode='22023';end if;
  observation:=legacy.payload;receipt:=jsonb_build_object('ok',true,'alreadyRecorded',true,'legacyEvent',true,'serverAt',legacy.server_at,'shiftId',legacy.shift_id,'segmentId',null,'zone',legacy.zone_status,'distanceM',legacy.distance_m);
 else
  receipt:=public.mir_punch_action(org,request_id,action,job,payload);
  if receipt->>'ok' is distinct from 'true' then raise exception 'Punch receipt is incomplete';end if;
  sid:=(receipt->>'shiftId')::uuid;
  if action='out' then select g.id into gid from mir_core.punch_segments g where g.organization_id=$1 and g.shift_id=sid and g.ended_at=(receipt->>'serverAt')::timestamptz order by g.started_at desc limit 1;
  else select g.id into gid from mir_core.punch_segments g where g.organization_id=$1 and g.shift_id=sid and g.started_at=(receipt->>'serverAt')::timestamptz order by g.id limit 1;end if;
  receipt:=receipt||jsonb_build_object('segmentId',gid);
 end if;
 -- GPS, source and originalAt are observations. The first successful ones and
 -- receipt remain immutable; a legitimate offline retry may carry new values.
 insert into mir_core.field_punch_receipts(organization_id,request_id,actor_id,intent,first_observation,result)
 values(org,request_id,actor,intended,observation,receipt);
 return receipt;
end$$;
revoke all on function public.mir_field_punch_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_field_punch_action(uuid,uuid,text,uuid,jsonb) to authenticated;
commit;
