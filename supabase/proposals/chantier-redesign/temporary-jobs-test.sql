-- MIR TEST only. Creates a real job without starting or modifying a Punch.
-- Team and actor authority come from the existing memberships, never payload.
begin;
do $$begin
 if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then
  raise exception 'Verified MIR TEST session required';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='mir_core' and table_name='jobs' and column_name='revision')
 or not exists(select 1 from information_schema.columns where table_schema='mir_core' and table_name='jobs' and column_name='job_number') then
  raise exception 'Existing MIR job metadata and revision required';
 end if;
end$$;

create table if not exists mir_core.temporary_job_details(
 organization_id uuid not null,job_id uuid not null,team_id uuid,
 status text not null default 'pending_details' check(status in('pending_details','complete')),
 note text not null default '' check(length(note)<=1200),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 completed_by uuid references auth.users(id),completed_at timestamptz,
 primary key(organization_id,job_id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 foreign key(organization_id,team_id) references mir_core.teams(organization_id,id),
 foreign key(organization_id,created_by) references mir_core.memberships(organization_id,user_id)
);
create table if not exists mir_core.temporary_job_requests(
 organization_id uuid not null,request_id uuid not null,actor_id uuid not null,
 operation text not null check(operation in('create','complete')),job_id uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),before_value jsonb,
 result jsonb not null check(jsonb_typeof(result)='object'),created_at timestamptz not null default now(),
 primary key(organization_id,request_id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 foreign key(organization_id,actor_id) references mir_core.memberships(organization_id,user_id)
);
create index if not exists temporary_job_details_status on mir_core.temporary_job_details(organization_id,status,created_at);
create index if not exists temporary_job_details_team on mir_core.temporary_job_details(organization_id,team_id);
create index if not exists temporary_job_requests_job on mir_core.temporary_job_requests(organization_id,job_id,created_at);
alter table mir_core.temporary_job_details enable row level security;
alter table mir_core.temporary_job_requests enable row level security;
revoke all on mir_core.temporary_job_details,mir_core.temporary_job_requests from public,anon,authenticated;

-- Private helpers are only called by the guarded operations below.
create or replace function mir_core.temporary_job_role(org uuid) returns text
language plpgsql stable security invoker set search_path=pg_catalog,mir_core as $$
declare r text;begin
 if auth.uid() is null or (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iss')
  is distinct from 'https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1' then
  raise exception 'Active MIR TEST identity required' using errcode='42501';
 end if;
 r:=mir_core.staff_role(org,auth.uid());
 if r is null then raise exception 'Active MIR identity required' using errcode='42501';end if;
 return r;
end$$;
create or replace function mir_core.temporary_job_dto(org uuid,job uuid) returns jsonb
language sql stable security invoker set search_path=pg_catalog,mir_core as $$
 select jsonb_build_object('id',j.id,'jobId',j.id,'name',j.name,'number',coalesce(j.job_number,''),
  'address',j.address,'deliveryAddress',j.delivery_address,'city',j.city,'phone',j.phone,'clientName',j.client_name,
  'latitude',j.latitude,'longitude',j.longitude,'closed',j.archived,'revision',j.revision,
  'temporary',d.status='pending_details','detailsStatus',d.status,'note',d.note,
  'teamId',d.team_id,'teamName',coalesce(t.name,''),'teamAssigned',d.team_id is not null,
  'createdBy',d.created_by,'createdAt',d.created_at,'completedBy',d.completed_by,'completedAt',d.completed_at,
  'assignedMemberIds',coalesce((select jsonb_agg(jm.user_id order by jm.user_id)
   from mir_core.job_memberships jm where jm.organization_id=j.organization_id and jm.job_id=j.id),'[]'::jsonb))
 from mir_core.jobs j join mir_core.temporary_job_details d on(d.organization_id,d.job_id)=(j.organization_id,j.id)
 left join mir_core.teams t on(t.organization_id,t.id)=(d.organization_id,d.team_id)
 where j.organization_id=org and j.id=job;
$$;
revoke all on function mir_core.temporary_job_role(uuid),mir_core.temporary_job_dto(uuid,uuid) from public,anon,authenticated;

create or replace function mir_core.lead_temporary_job(org uuid,request_id uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid();r text;tid uuid;jid uuid;prior mir_core.temporary_job_requests;
 lat numeric;lon numeric;result jsonb;key text;
begin
 r:=mir_core.temporary_job_role(org);
 if r<>'chef_equipe' then raise exception 'Chef équipe requis' using errcode='42501';end if;
 if request_id is null or jsonb_typeof(payload) is distinct from 'object' or pg_column_size(payload)>8192
 or payload-array['name','address','city','note','latitude','longitude']<>'{}'::jsonb
 or jsonb_typeof(payload->'name') is distinct from 'string'
 or length(btrim(coalesce(payload->>'name',''))) not between 1 and 200 then
  raise exception 'Nom de chantier temporaire invalide' using errcode='22023';
 end if;
 foreach key in array array['address','city','note'] loop
  if payload?key and jsonb_typeof(payload->key) is distinct from 'string' then
   raise exception 'Information de chantier invalide' using errcode='22023';end if;
 end loop;
 if length(coalesce(payload->>'address',''))>300 or length(coalesce(payload->>'city',''))>120
 or length(coalesce(payload->>'note',''))>1200 then raise exception 'Information de chantier trop longue' using errcode='22023';end if;
 if (payload->>'latitude' is null)<>(payload->>'longitude' is null)
 or (payload->>'latitude' is not null and (jsonb_typeof(payload->'latitude')<>'number' or jsonb_typeof(payload->'longitude')<>'number')) then
  raise exception 'Coordonnées invalides' using errcode='22023';end if;
 lat:=(payload->>'latitude')::numeric;lon:=(payload->>'longitude')::numeric;
 if lat not between -90 and 90 or lon not between -180 and 180 then raise exception 'Coordonnées invalides' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('temporary-job:'||org::text||':'||request_id::text,0));
 select * into prior from mir_core.temporary_job_requests q where q.organization_id=org and q.request_id=lead_temporary_job.request_id;
 if found then
  if prior.actor_id<>actor then raise exception 'Requête attribuée à un autre compte' using errcode='42501';end if;
  if prior.operation<>'create' or prior.payload<>payload then raise exception 'Clé déjà utilisée avec une autre intention' using errcode='22023';end if;
  if not coalesce(mir_core.job_allowed(org,prior.job_id,actor),false) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
  return prior.result;
 end if;
 -- The leader's own active membership resolves at most one team. A chef
 -- without a configured team creates for himself; no invented team or users.
 select t.id into tid from mir_core.teams t join mir_core.team_members tm
  on(tm.organization_id,tm.team_id)=(t.organization_id,t.id)
  where t.organization_id=org and t.active and t.leader_id=actor and tm.user_id=actor and tm.active
  for share of t,tm;
 insert into mir_core.jobs(organization_id,name,address,delivery_address,city,latitude,longitude)
 values(org,btrim(payload->>'name'),btrim(coalesce(payload->>'address','')),btrim(coalesce(payload->>'address','')),
  btrim(coalesce(payload->>'city','')),lat,lon) returning id into jid;
 insert into mir_core.temporary_job_details(organization_id,job_id,team_id,note,created_by)
 values(org,jid,tid,btrim(coalesce(payload->>'note','')),actor);
 insert into mir_core.job_memberships(organization_id,job_id,user_id) values(org,jid,actor);
 if tid is not null then
  insert into mir_core.job_memberships(organization_id,job_id,user_id)
   select org,jid,tm.user_id from mir_core.team_members tm
   join mir_core.memberships m on(m.organization_id,m.user_id)=(tm.organization_id,tm.user_id)
   join mir_core.staff_capabilities sc on(sc.organization_id,sc.user_id)=(tm.organization_id,tm.user_id)
   where tm.organization_id=org and tm.team_id=tid and tm.active and m.active and m.role='employee'
    and sc.active and sc.staff_role in('chef_equipe','employe') on conflict do nothing;
 end if;
 result:=jsonb_build_object('ok',true,'jobId',jid,'temporary',true,'detailsStatus','pending_details','job',mir_core.temporary_job_dto(org,jid));
 insert into mir_core.temporary_job_requests(organization_id,request_id,actor_id,operation,job_id,payload,result)
 values(org,request_id,actor,'create',jid,payload,result);
 return result;
end$$;

create or replace function mir_core.temporary_jobs_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare r text:=mir_core.temporary_job_role(org);manager boolean;tid uuid;data jsonb;teams jsonb;
begin
 if r not in('employe','chef_equipe','assistant','boss') then
  raise exception 'Rôle métier chantier requis' using errcode='42501';end if;
 manager:=r in('boss','assistant');
 if r='chef_equipe' then
  select t.id into tid from mir_core.teams t join mir_core.team_members tm on(tm.organization_id,tm.team_id)=(t.organization_id,t.id)
   where t.organization_id=org and t.active and t.leader_id=auth.uid() and tm.user_id=auth.uid() and tm.active;
 end if;
 select coalesce(jsonb_agg(mir_core.temporary_job_dto(org,d.job_id) order by d.created_at desc,d.job_id),'[]') into data
  from mir_core.temporary_job_details d where d.organization_id=org
   and(manager or coalesce(mir_core.job_allowed(org,d.job_id,auth.uid()),false));
 if manager then
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'leaderId',t.leader_id) order by t.name),'[]') into teams
   from mir_core.teams t where t.organization_id=org and t.active;
 else teams:='[]';end if;
 return jsonb_build_object('canCreate',r='chef_equipe','canComplete',manager,'teamId',tid,'teamAssigned',tid is not null,'jobs',data,'teams',teams);
end$$;

create or replace function mir_core.temporary_job_complete(org uuid,job uuid,request_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid();r text:=mir_core.temporary_job_role(org);j mir_core.jobs;d mir_core.temporary_job_details;
 prior mir_core.temporary_job_requests;before_value jsonb;result jsonb;tid uuid;lat numeric;lon numeric;key text;
begin
 if r not in('boss','assistant') then raise exception 'Adjointe ou Boss requis' using errcode='42501';end if;
 if request_id is null or job is null or jsonb_typeof(payload) is distinct from 'object' or pg_column_size(payload)>8192
 or payload-array['expectedRevision','number','name','address','city','phone','clientName','latitude','longitude','teamId']<>'{}'::jsonb
 or coalesce(payload->>'expectedRevision','')!~'^[1-9][0-9]{0,8}$' then
  raise exception 'Révision ou informations invalides' using errcode='22023';end if;
 foreach key in array array['number','name','address'] loop
  if jsonb_typeof(payload->key) is distinct from 'string' or length(btrim(coalesce(payload->>key,'')))=0 then
   raise exception 'Numéro, nom et adresse requis' using errcode='22023';end if;
 end loop;
 foreach key in array array['city','phone','clientName'] loop
  if payload?key and jsonb_typeof(payload->key) is distinct from 'string' then
   raise exception 'Information de chantier invalide' using errcode='22023';end if;
 end loop;
 if length(payload->>'number')>60 or length(payload->>'name')>200 or length(payload->>'address')>300
 or length(coalesce(payload->>'city',''))>120 or length(coalesce(payload->>'phone',''))>40
 or length(coalesce(payload->>'clientName',''))>200 then raise exception 'Information de chantier trop longue' using errcode='22023';end if;
 if (payload->>'latitude' is null)<>(payload->>'longitude' is null)
 or (payload->>'latitude' is not null and (jsonb_typeof(payload->'latitude')<>'number' or jsonb_typeof(payload->'longitude')<>'number')) then
  raise exception 'Coordonnées invalides' using errcode='22023';end if;
 if payload?'teamId' and jsonb_typeof(payload->'teamId') not in('string','null') then raise exception 'Équipe invalide' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('temporary-job:'||org::text||':'||request_id::text,0));
 select * into prior from mir_core.temporary_job_requests q where q.organization_id=org and q.request_id=temporary_job_complete.request_id;
 if found then
  if prior.actor_id<>actor then raise exception 'Requête attribuée à un autre compte' using errcode='42501';end if;
  if prior.operation<>'complete' or prior.job_id<>job or prior.payload<>payload then raise exception 'Clé déjà utilisée avec une autre intention' using errcode='22023';end if;
  return prior.result;
 end if;
 select * into j from mir_core.jobs x where x.organization_id=org and x.id=job for update;
 select * into d from mir_core.temporary_job_details x where x.organization_id=org and x.job_id=job for update;
 if j.id is null or d.job_id is null or j.archived then raise exception 'Chantier temporaire inaccessible' using errcode='42501';end if;
 if j.revision<>(payload->>'expectedRevision')::integer then raise exception 'La fiche a changé; rechargez-la avant de modifier' using errcode='40001';end if;
 tid:=case when payload?'teamId' then nullif(payload->>'teamId','')::uuid else d.team_id end;
 if tid is not null then
  perform 1 from mir_core.teams t where t.organization_id=org and t.id=tid and t.active for share;
  if not found then raise exception 'Équipe inaccessible' using errcode='42501';end if;
 end if;
 lat:=case when payload?'latitude' then (payload->>'latitude')::numeric else j.latitude end;
 lon:=case when payload?'longitude' then (payload->>'longitude')::numeric else j.longitude end;
 if (lat is null)<>(lon is null) or lat not between -90 and 90 or lon not between -180 and 180 then
  raise exception 'Coordonnées invalides' using errcode='22023';end if;
 before_value:=mir_core.temporary_job_dto(org,job);
 update mir_core.jobs x set job_number=btrim(payload->>'number'),name=btrim(payload->>'name'),
  address=btrim(payload->>'address'),delivery_address=btrim(payload->>'address'),
  city=case when payload?'city' then btrim(payload->>'city') else x.city end,
  phone=case when payload?'phone' then btrim(payload->>'phone') else x.phone end,
  client_name=case when payload?'clientName' then btrim(payload->>'clientName') else x.client_name end,
  latitude=lat,longitude=lon,revision=x.revision+1 where x.organization_id=org and x.id=job;
 update mir_core.temporary_job_details x set status='complete',team_id=tid,completed_by=actor,completed_at=now()
  where x.organization_id=org and x.job_id=job;
 if tid is not null then
  insert into mir_core.job_memberships(organization_id,job_id,user_id)
   select org,job,tm.user_id from mir_core.team_members tm
   join mir_core.memberships m on(m.organization_id,m.user_id)=(tm.organization_id,tm.user_id)
   join mir_core.staff_capabilities sc on(sc.organization_id,sc.user_id)=(tm.organization_id,tm.user_id)
   where tm.organization_id=org and tm.team_id=tid and tm.active and m.active and m.role='employee'
    and sc.active and sc.staff_role in('chef_equipe','employe') on conflict do nothing;
 end if;
 result:=jsonb_build_object('ok',true,'jobId',job,'temporary',false,'detailsStatus','complete','job',mir_core.temporary_job_dto(org,job));
 insert into mir_core.temporary_job_requests(organization_id,request_id,actor_id,operation,job_id,payload,before_value,result)
 values(org,request_id,actor,'complete',job,payload,before_value,result);
 return result;
end$$;

-- Only narrow public API wrappers are exposed. Private operations check the
-- signed-in identity again; no privileged key or direct table grant is added.
revoke all on function mir_core.lead_temporary_job(uuid,uuid,jsonb),mir_core.temporary_jobs_snapshot(uuid),mir_core.temporary_job_complete(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function mir_core.lead_temporary_job(uuid,uuid,jsonb),mir_core.temporary_jobs_snapshot(uuid),mir_core.temporary_job_complete(uuid,uuid,uuid,jsonb) to authenticated;
create or replace function public.mir_lead_temporary_job(org uuid,request_id uuid,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path=pg_catalog as $$select mir_core.lead_temporary_job(org,request_id,payload)$$;
create or replace function public.mir_temporary_jobs_snapshot(org uuid) returns jsonb
language sql stable security invoker set search_path=pg_catalog as $$select mir_core.temporary_jobs_snapshot(org)$$;
create or replace function public.mir_temporary_job_complete(org uuid,job uuid,request_id uuid,payload jsonb) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select mir_core.temporary_job_complete(org,job,request_id,payload)$$;
revoke all on function public.mir_lead_temporary_job(uuid,uuid,jsonb),public.mir_temporary_jobs_snapshot(uuid),public.mir_temporary_job_complete(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_lead_temporary_job(uuid,uuid,jsonb),public.mir_temporary_jobs_snapshot(uuid),public.mir_temporary_job_complete(uuid,uuid,uuid,jsonb) to authenticated;
commit;
