-- Phase 5 — Absences. Évolution additive de hr_requests; aucune donnée Punch dupliquée.
begin;

do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='mir_core.hr_requests'::regclass and contype='c' and (pg_get_constraintdef(oid) like '%request_type%' or pg_get_constraintdef(oid) like '%status%' or pg_get_constraintdef(oid) like '%decided_by%') loop
  execute format('alter table mir_core.hr_requests drop constraint %I',c.conname);
 end loop;
end$$;

alter table mir_core.hr_requests
 drop constraint if exists hr_requests_phase5_type,
 drop constraint if exists hr_requests_phase5_status,
 drop constraint if exists hr_requests_phase5_period,
 drop constraint if exists hr_requests_phase5_day_part,
 drop constraint if exists hr_requests_phase5_hours,
 drop constraint if exists hr_requests_phase5_decision,
 drop constraint if exists hr_requests_phase5_cancel;

alter table mir_core.hr_requests
 add column if not exists day_part text not null default 'full_day',
 add column if not exists start_time time,
 add column if not exists end_time time,
 add column if not exists submitted_at timestamptz,
 add column if not exists updated_at timestamptz not null default now(),
 add column if not exists cancelled_at timestamptz,
 add column if not exists cancelled_by uuid references auth.users(id),
 add column if not exists decision_request_id uuid;

update mir_core.hr_requests set request_type=case request_type when 'sickness_today' then 'sickness' when 'leave' then 'unpaid_leave' else request_type end,
 status=case status when 'pending' then 'submitted' else status end,
 submitted_at=coalesce(submitted_at,created_at),updated_at=coalesce(updated_at,created_at);

alter table mir_core.hr_requests
 add constraint hr_requests_phase5_type check(request_type in('vacation','sickness','appointment','unpaid_leave','other')),
 add constraint hr_requests_phase5_status check(status in('draft','submitted','approved','refused','cancelled')),
 add constraint hr_requests_phase5_period check(end_date>=start_date),
 add constraint hr_requests_phase5_day_part check(day_part in('full_day','partial')),
 add constraint hr_requests_phase5_hours check((day_part='full_day' and start_time is null and end_time is null) or(day_part='partial' and start_date=end_date and start_time is not null and end_time is not null and end_time>start_time)),
 add constraint hr_requests_phase5_decision check((status in('approved','refused'))=(decided_by is not null and decided_at is not null)),
 add constraint hr_requests_phase5_cancel check((status='cancelled')=(cancelled_by is not null and cancelled_at is not null));

create table if not exists mir_core.hr_request_events(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),request_id uuid not null,
 actor_id uuid not null references auth.users(id),action text not null check(action in('draft_saved','submitted','approved','refused','cancelled','attachment_added')),
 reason text not null default '' check(length(reason)<=1000),before_state jsonb not null default '{}' check(jsonb_typeof(before_state)='object'),
 after_state jsonb not null default '{}' check(jsonb_typeof(after_state)='object'),client_request_id uuid,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,request_id) references mir_core.hr_requests(organization_id,id) on delete cascade
);
create unique index if not exists hr_request_events_idempotency on mir_core.hr_request_events(organization_id,actor_id,client_request_id) where client_request_id is not null;
create index if not exists hr_request_events_trace on mir_core.hr_request_events(organization_id,request_id,created_at,id);

create table if not exists mir_core.hr_request_attachments(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),request_id uuid not null,object_path text not null,
 file_name text not null check(length(file_name) between 1 and 240),mime_type text not null check(mime_type in('image/jpeg','image/png','application/pdf')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 uploaded_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(organization_id,id),
 unique(organization_id,object_path),foreign key(organization_id,request_id) references mir_core.hr_requests(organization_id,id) on delete cascade,
 check(object_path!~'\.\.' and length(object_path)<=600)
);
alter table mir_core.hr_request_events enable row level security;
alter table mir_core.hr_request_attachments enable row level security;
revoke all on mir_core.hr_requests,mir_core.hr_request_events,mir_core.hr_request_attachments from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mir-absence-files','mir-absence-files',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function mir_core.absence_role(org uuid,member uuid default auth.uid()) returns text language sql stable security definer set search_path=pg_catalog,mir_core as $$select mir_core.operational_role(org,member)$$;
create or replace function mir_core.absence_visible(org uuid,request uuid,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select exists(select 1 from mir_core.hr_requests h where h.organization_id=org and h.id=request and(h.employee_id=member or mir_core.absence_role(org,member) in('adjointe','boss','admin') or(mir_core.absence_role(org,member)='chef_equipe' and exists(select 1 from mir_core.team_members tm join mir_core.teams t on(t.organization_id,t.id)=(tm.organization_id,tm.team_id) where tm.organization_id=org and tm.user_id=h.employee_id and tm.active and t.active and t.leader_id=member))))
$$;

create or replace function mir_core.absence_file_allowed(object_name text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$
declare p text[]:=string_to_array(object_name,'/');org uuid;request uuid;actor uuid:=auth.uid();h mir_core.hr_requests;
begin
 if actor is null or array_length(p,1)<>5 or p[2]<>'absence' or p[5]!~'^[0-9a-f-]{36}\.(jpg|png|pdf)$' or object_name~'\.\.' then return false;end if;
 begin org:=p[1]::uuid;request:=p[3]::uuid;exception when others then return false;end;
 select * into h from mir_core.hr_requests where organization_id=org and id=request;
 if not found or not mir_core.absence_visible(org,request,actor) then return false;end if;
 return not writing or(h.employee_id=actor and h.status='draft' and p[4]=actor::text);
end$$;

drop policy if exists mir_absence_file_insert on storage.objects;
drop policy if exists mir_absence_file_select on storage.objects;
drop policy if exists mir_absence_file_delete on storage.objects;
create policy mir_absence_file_insert on storage.objects for insert to authenticated with check(bucket_id='mir-absence-files' and mir_core.absence_file_allowed(name,true));
create policy mir_absence_file_select on storage.objects for select to authenticated using(bucket_id='mir-absence-files' and mir_core.absence_file_allowed(name,false));
create policy mir_absence_file_delete on storage.objects for delete to authenticated using(bucket_id='mir-absence-files' and mir_core.absence_file_allowed(name,true));

create or replace function mir_core.hr_event_immutable() returns trigger language plpgsql set search_path=pg_catalog as $$begin raise exception 'Historique immuable' using errcode='42501';end$$;
drop trigger if exists hr_request_events_immutable on mir_core.hr_request_events;
create trigger hr_request_events_immutable before update or delete on mir_core.hr_request_events for each row execute function mir_core.hr_event_immutable();

create or replace function public.mir_absence_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.absence_role(org);begin
 if r is null then raise exception 'Accès MIR requis' using errcode='42501';end if;
 return jsonb_build_object('role',r,'requests',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'employeeId',h.employee_id,'type',h.request_type,'startDate',h.start_date,'endDate',h.end_date,'dayPart',h.day_part,'startTime',h.start_time,'endTime',h.end_time,'note',h.employee_note,'status',h.status,'decisionReason',h.decision_note,'createdAt',h.created_at,'updatedAt',h.updated_at,'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'createdAt',a.created_at) order by a.created_at,a.id) from mir_core.hr_request_attachments a where a.organization_id=org and a.request_id=h.id),'[]'::jsonb),'events',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'reason',e.reason,'actorId',e.actor_id,'createdAt',e.created_at) order by e.created_at,e.id) from mir_core.hr_request_events e where e.organization_id=org and e.request_id=h.id),'[]'::jsonb)) order by h.updated_at desc) from mir_core.hr_requests h where h.organization_id=org and mir_core.absence_visible(org,h.id)),'[]'::jsonb));end$$;

create or replace function public.mir_absence_save_draft(org uuid,request_key uuid,absence_id uuid,data jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid();h mir_core.hr_requests;old jsonb;kind text;part text;start_on date;end_on date;from_time time;to_time time;note text;
begin
 if actor is null or request_key is null or mir_core.absence_role(org,actor) is null then raise exception 'Session MIR et idempotence requises' using errcode='42501';end if;
 select r.* into h from mir_core.hr_requests r join mir_core.hr_request_events e on(e.organization_id,e.request_id)=(r.organization_id,r.id) where e.organization_id=org and e.actor_id=actor and e.client_request_id=request_key limit 1;if found then return jsonb_build_object('id',h.id,'status',h.status,'idempotent',true);end if;
 begin kind:=data->>'type';part:=coalesce(data->>'dayPart','full_day');start_on:=(data->>'startDate')::date;end_on:=coalesce(nullif(data->>'endDate','')::date,start_on);from_time:=nullif(data->>'startTime','')::time;to_time:=nullif(data->>'endTime','')::time;exception when others then raise exception 'Dates ou heures invalides' using errcode='22023';end;
 note:=btrim(coalesce(data->>'note',''));if kind not in('vacation','sickness','appointment','unpaid_leave','other') or part not in('full_day','partial') or end_on<start_on or length(note)>500 or(part='partial' and(start_on<>end_on or from_time is null or to_time is null or to_time<=from_time)) then raise exception 'Demande invalide' using errcode='22023';end if;
 if part='full_day' then from_time:=null;to_time:=null;end if;
 if absence_id is null then insert into mir_core.hr_requests(organization_id,employee_id,request_type,start_date,end_date,employee_note,status,client_request_id,day_part,start_time,end_time) values(org,actor,kind,start_on,end_on,note,'draft',request_key,part,from_time,to_time) returning * into h;old:='{}';
 else select * into h from mir_core.hr_requests where organization_id=org and id=absence_id for update;if not found or h.employee_id<>actor or h.status<>'draft' then raise exception 'Brouillon non modifiable' using errcode='42501';end if;old:=to_jsonb(h);update mir_core.hr_requests set request_type=kind,start_date=start_on,end_date=end_on,employee_note=note,day_part=part,start_time=from_time,end_time=to_time,updated_at=now() where organization_id=org and id=absence_id returning * into h;end if;
 insert into mir_core.hr_request_events(organization_id,request_id,actor_id,action,before_state,after_state,client_request_id) values(org,h.id,actor,'draft_saved',old,to_jsonb(h),request_key);
 return jsonb_build_object('id',h.id,'status',h.status,'idempotent',false);end$$;

create or replace function public.mir_absence_submit(org uuid,request_key uuid,absence_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare actor uuid:=auth.uid();h mir_core.hr_requests;old jsonb;begin
 if actor is null or request_key is null then raise exception 'Session requise' using errcode='42501';end if;if exists(select 1 from mir_core.hr_request_events where organization_id=org and actor_id=actor and client_request_id=request_key) then return jsonb_build_object('id',absence_id,'idempotent',true);end if;
 select * into h from mir_core.hr_requests where organization_id=org and id=absence_id for update;if not found or h.employee_id<>actor or h.status<>'draft' then raise exception 'Soumission non autorisée' using errcode='42501';end if;
 if exists(select 1 from mir_core.hr_requests x where x.organization_id=org and x.employee_id=actor and x.id<>h.id and x.status in('submitted','approved') and daterange(x.start_date,x.end_date,'[]')&&daterange(h.start_date,h.end_date,'[]')) then raise exception 'Une absence existe déjà sur cette période' using errcode='23P01';end if;
 old:=to_jsonb(h);update mir_core.hr_requests set status='submitted',submitted_at=now(),updated_at=now() where organization_id=org and id=absence_id returning * into h;insert into mir_core.hr_request_events(organization_id,request_id,actor_id,action,before_state,after_state,client_request_id) values(org,h.id,actor,'submitted',old,to_jsonb(h),request_key);return jsonb_build_object('id',h.id,'status',h.status,'idempotent',false);end$$;

create or replace function public.mir_absence_attach(org uuid,request_key uuid,absence_id uuid,object_path text,file_name text,mime_type text,size_bytes bigint,sha256 text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core,storage as $$
declare actor uuid:=auth.uid();h mir_core.hr_requests;a mir_core.hr_request_attachments;expected text;before jsonb;
begin
 if actor is null or request_key is null or mime_type not in('image/jpeg','image/png','application/pdf') or size_bytes not between 1 and 10485760 or sha256!~'^[a-f0-9]{64}$' then raise exception 'Pièce jointe invalide' using errcode='22023';end if;
 if exists(select 1 from mir_core.hr_request_events where organization_id=org and actor_id=actor and client_request_id=request_key) then select * into a from mir_core.hr_request_attachments where organization_id=org and request_id=absence_id and uploaded_by=actor order by created_at desc limit 1;return jsonb_build_object('id',a.id,'idempotent',true);end if;
 select * into h from mir_core.hr_requests where organization_id=org and id=absence_id for update;if not found or h.employee_id<>actor or h.status<>'draft' then raise exception 'Brouillon non modifiable' using errcode='42501';end if;
 expected:=org||'/absence/'||absence_id||'/'||actor||'/';if object_path not like expected||'%' or not mir_core.absence_file_allowed(object_path,true) then raise exception 'Chemin de fichier invalide' using errcode='42501';end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='mir-absence-files' and o.name=object_path and o.owner=actor and coalesce(o.metadata->>'mimetype','')=mime_type and coalesce((o.metadata->>'size')::bigint,-1)=size_bytes) then raise exception 'Fichier absent ou métadonnées invalides' using errcode='22023';end if;
 insert into mir_core.hr_request_attachments(organization_id,request_id,object_path,file_name,mime_type,size_bytes,sha256,uploaded_by) values(org,absence_id,object_path,left(file_name,240),mime_type,size_bytes,sha256,actor) returning * into a;
 insert into mir_core.hr_request_events(organization_id,request_id,actor_id,action,after_state,client_request_id) values(org,absence_id,actor,'attachment_added',jsonb_build_object('attachmentId',a.id,'mimeType',a.mime_type,'sizeBytes',a.size_bytes),request_key);
 return jsonb_build_object('id',a.id,'idempotent',false);end$$;

create or replace function public.mir_absence_attachment_access(org uuid,attachment_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare a mir_core.hr_request_attachments;begin
 select * into a from mir_core.hr_request_attachments where organization_id=org and id=attachment_id;if not found or not mir_core.absence_visible(org,a.request_id) then raise exception 'Pièce jointe non disponible' using errcode='42501';end if;
 return jsonb_build_object('bucket','mir-absence-files','path',a.object_path,'expiresIn',120);end$$;

create or replace function public.mir_absence_decide(org uuid,request_key uuid,absence_id uuid,decision text,reason text default '') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare actor uuid:=auth.uid();r text;h mir_core.hr_requests;old jsonb;begin
 r:=mir_core.absence_role(org,actor);if actor is null or request_key is null or r not in('adjointe','boss','admin') or decision not in('approved','refused') or(decision='refused' and length(btrim(reason))<2) then raise exception 'Décision non autorisée' using errcode='42501';end if;if exists(select 1 from mir_core.hr_request_events where organization_id=org and actor_id=actor and client_request_id=request_key) then return jsonb_build_object('id',absence_id,'idempotent',true);end if;
 select * into h from mir_core.hr_requests where organization_id=org and id=absence_id for update;if not found or h.status<>'submitted' or not mir_core.absence_visible(org,h.id,actor) then raise exception 'Demande non disponible' using errcode='42501';end if;old:=to_jsonb(h);update mir_core.hr_requests set status=decision,decided_by=actor,decided_at=now(),decision_note=left(btrim(reason),500),decision_request_id=request_key,updated_at=now() where organization_id=org and id=absence_id returning * into h;insert into mir_core.hr_request_events(organization_id,request_id,actor_id,action,reason,before_state,after_state,client_request_id) values(org,h.id,actor,decision,btrim(reason),old,to_jsonb(h),request_key);return jsonb_build_object('id',h.id,'status',h.status,'idempotent',false);end$$;

create or replace function public.mir_absence_cancel(org uuid,request_key uuid,absence_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare actor uuid:=auth.uid();h mir_core.hr_requests;old jsonb;begin
 if actor is null or request_key is null then raise exception 'Session requise' using errcode='42501';end if;if exists(select 1 from mir_core.hr_request_events where organization_id=org and actor_id=actor and client_request_id=request_key) then return jsonb_build_object('id',absence_id,'idempotent',true);end if;select * into h from mir_core.hr_requests where organization_id=org and id=absence_id for update;if not found or h.employee_id<>actor or h.status not in('draft','submitted') then raise exception 'Annulation non autorisée' using errcode='42501';end if;old:=to_jsonb(h);update mir_core.hr_requests set status='cancelled',cancelled_by=actor,cancelled_at=now(),updated_at=now() where organization_id=org and id=absence_id returning * into h;insert into mir_core.hr_request_events(organization_id,request_id,actor_id,action,before_state,after_state,client_request_id) values(org,h.id,actor,'cancelled',old,to_jsonb(h),request_key);return jsonb_build_object('id',h.id,'status',h.status,'idempotent',false);end$$;

revoke all on function mir_core.absence_role(uuid,uuid),mir_core.absence_visible(uuid,uuid,uuid),mir_core.absence_file_allowed(text,boolean),public.mir_absence_snapshot(uuid),public.mir_absence_save_draft(uuid,uuid,uuid,jsonb),public.mir_absence_submit(uuid,uuid,uuid),public.mir_absence_attach(uuid,uuid,uuid,text,text,text,bigint,text),public.mir_absence_attachment_access(uuid,uuid),public.mir_absence_decide(uuid,uuid,uuid,text,text),public.mir_absence_cancel(uuid,uuid,uuid) from public,anon;
grant execute on function mir_core.absence_file_allowed(text,boolean) to authenticated;
grant execute on function public.mir_absence_snapshot(uuid),public.mir_absence_save_draft(uuid,uuid,uuid,jsonb),public.mir_absence_submit(uuid,uuid,uuid),public.mir_absence_attach(uuid,uuid,uuid,text,text,text,bigint,text),public.mir_absence_attachment_access(uuid,uuid),public.mir_absence_decide(uuid,uuid,uuid,text,text),public.mir_absence_cancel(uuid,uuid,uuid) to authenticated;
commit;
