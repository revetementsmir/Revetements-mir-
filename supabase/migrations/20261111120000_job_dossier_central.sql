-- Phase 1: dossier chantier central. Additive only; canonical domain tables remain unchanged.
begin;

create table if not exists mir_core.job_documents(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 job_id uuid not null,
 family_id uuid not null,
 version integer not null check(version>0),
 name text not null check(length(btrim(name)) between 1 and 240),
 object_path text not null,
 mime text not null check(mime in ('application/pdf','image/jpeg','image/png','image/webp')),
 size_bytes bigint not null check(size_bytes between 1 and 26214400),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,job_id,family_id,version),
 unique(object_path),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create index if not exists mir_job_documents_job on mir_core.job_documents(organization_id,job_id,created_at desc,id);
create index if not exists mir_job_documents_author on mir_core.job_documents(organization_id,created_by,created_at desc);
alter table mir_core.job_documents enable row level security;
revoke all on mir_core.job_documents from public,anon,authenticated;

create or replace function mir_core.job_dossier_allowed(org uuid,jid uuid,member uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select member is not null
 and exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=member and m.active)
 and (
   mir_core.has_role(org,array['admin'])
   or mir_core.staff_role(org,member) in ('boss','assistant')
   or mir_core.job_allowed(org,jid,member)
   or (mir_core.staff_role(org,member)='warehouse' and exists(
     select 1 from mir_core.delivery_run_orders dro
     join mir_core.delivery_runs dr on (dr.organization_id,dr.id)=(dro.organization_id,dro.run_id)
     where dro.organization_id=org and dro.job_id=jid
       and (dr.driver_id=member or mir_core.staff_role(org,member)='warehouse')
   ))
 );
$$;
revoke all on function mir_core.job_dossier_allowed(uuid,uuid,uuid) from public,anon;
grant execute on function mir_core.job_dossier_allowed(uuid,uuid,uuid) to authenticated;

create or replace function mir_core.job_storage_read(path text) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 return exists(select 1 from mir_core.job_documents d where d.object_path=path and mir_core.job_dossier_allowed(d.organization_id,d.job_id));
end$$;
create or replace function mir_core.job_storage_write(path text) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;jid uuid;begin
 if array_length(string_to_array(path,'/'),1)<>4 then return false;end if;
 org:=split_part(path,'/',1)::uuid;jid:=split_part(path,'/',2)::uuid;
 return (mir_core.has_role(org,array['admin']) or mir_core.staff_role(org) in ('boss','assistant'))
  and exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=jid and not j.archived)
  and split_part(path,'/',3)~'^[0-9a-f-]{36}$'
  and split_part(path,'/',4)~'^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$';
 exception when invalid_text_representation then return false;
end$$;
revoke all on function mir_core.job_storage_read(text),mir_core.job_storage_write(text) from public,anon;
grant execute on function mir_core.job_storage_read(text),mir_core.job_storage_write(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mir-job-documents','mir-job-documents',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists mir_job_document_read on storage.objects;
drop policy if exists mir_job_document_insert on storage.objects;
create policy mir_job_document_read on storage.objects for select to authenticated
 using(bucket_id='mir-job-documents' and mir_core.job_storage_read(name));
create policy mir_job_document_insert on storage.objects for insert to authenticated
 with check(bucket_id='mir-job-documents' and mir_core.job_storage_write(name));

create or replace function public.mir_job_dossier_snapshot(
 org uuid,
 job uuid,
 page_size integer default 20,
 page_before timestamptz default null
) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare
 size integer:=least(greatest(coalesce(page_size,20),1),50);
 role_name text:=mir_core.staff_role(org);
 dossier jsonb;
begin
 if auth.uid() is null or not mir_core.job_dossier_allowed(org,job) then
  raise exception 'Chantier inaccessible' using errcode='42501';
 end if;
 select jsonb_build_object(
  'job',jsonb_build_object('id',j.id,'name',j.name,'address',j.address,'city',j.city,'phone',j.phone,'closed',j.archived),
  'access',jsonb_build_object('technicalRole',case when mir_core.has_role(org,array['admin']) then 'admin' else role_name end,'operationalLabel',case when mir_core.has_role(org,array['admin']) then 'boss' else role_name end,'canManage',(mir_core.has_role(org,array['admin']) or role_name in ('boss','assistant')),'readOnly',j.archived),
  'teams',coalesce((select jsonb_agg(x.data order by x.name) from (select distinct t.id,t.name,jsonb_build_object('id',t.id,'name',t.name,'leaderId',t.leader_id) data from mir_core.teams t join mir_core.team_day_assignments a on(a.organization_id,a.team_id)=(t.organization_id,t.id) where t.organization_id=org and a.job_id=j.id) x),'[]'::jsonb),
  'employees',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(p.display_name,''),m.user_id::text),'role',coalesce(p.staff_role,'employee')) order by coalesce(nullif(p.display_name,''),m.user_id::text)) from mir_core.job_memberships m left join mir_core.staff_capabilities p on(p.organization_id,p.user_id)=(m.organization_id,m.user_id) where m.organization_id=org and m.job_id=j.id),'[]'::jsonb),
  'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id) from (select d.id,d.family_id,d.version,d.name,d.object_path,d.mime,d.size_bytes,d.created_by,d.created_at from mir_core.job_documents d where d.organization_id=org and d.job_id=j.id order by d.created_at desc,d.id limit size) d),'[]'::jsonb),
  'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id) from (select t.id,t.team_id,t.work_date,t.title,t.completed_at,t.completed_by,t.created_at from mir_core.team_tasks t where t.organization_id=org and t.job_id=j.id order by t.created_at desc,t.id limit size) t),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at desc,r.id) from (select r.id,r.team_id,r.leader_id,r.work_date,r.work_done,r.had_problem,r.missing_material,r.photo_paths,r.comment,r.submitted_at from mir_core.daily_reports r where r.organization_id=org and r.job_id=j.id order by r.submitted_at desc,r.id limit size) r),'[]'::jsonb),
  'hours',case when role_name in ('assistant','boss') or mir_core.has_role(org,array['admin']) then coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'employeeId',e.employee_id,'workDate',e.work_date,'regularHours',e.regular_hours,'overtimeHours',e.overtime_hours,'status',e.status) order by e.work_date desc,e.id) from (select * from mir_core.time_entries e where e.organization_id=org and e.job_id=j.id order by e.work_date desc,e.id limit size) e),'[]'::jsonb) else '[]'::jsonb end,
  'punches',case when role_name in ('assistant','boss') or mir_core.has_role(org,array['admin']) then coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'employeeId',sh.employee_id,'startedAt',s.started_at,'endedAt',s.ended_at,'type',s.segment_type) order by s.started_at desc,s.id) from (select * from mir_core.punch_segments s where s.organization_id=org and s.job_id=j.id order by s.started_at desc,s.id limit size) s join mir_core.punch_shifts sh on(sh.organization_id,sh.id)=(s.organization_id,s.shift_id)),'[]'::jsonb) else '[]'::jsonb end,
  'extras',coalesce((select jsonb_agg(to_jsonb(e)-'client_request_id' order by e.created_at desc,e.id) from (select * from mir_core.extras e where e.organization_id=org and e.job_id=j.id order by e.created_at desc,e.id limit size) e),'[]'::jsonb),
  'requests',coalesce((select jsonb_agg(to_jsonb(r)-'client_request_id' order by r.created_at desc,r.id) from (select * from mir_core.material_requests r where r.organization_id=org and r.job_id=j.id order by r.created_at desc,r.id limit size) r),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'ownerId',o.owner_id,'createdAt',o.created_at) order by o.created_at desc,o.id) from (select o.* from mir_core.orders o where o.organization_id=org and exists(select 1 from mir_core.order_revisions rev where rev.organization_id=org and rev.order_id=o.id and rev.snapshot#>>'{configuration,chantier}'=j.id::text) order by o.created_at desc,o.id limit size) o),'[]'::jsonb),
  'suppliers',case when role_name in ('assistant','boss','warehouse') or mir_core.has_role(org,array['admin']) then coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name) from mir_core.suppliers s where s.organization_id=org and exists(select 1 from mir_core.orders o join mir_core.order_revisions rev on(rev.organization_id,rev.order_id)=(o.organization_id,o.id) where o.organization_id=org and o.kind='supplier' and rev.snapshot#>>'{configuration,chantier}'=j.id::text and rev.snapshot::text like '%'||s.id::text||'%')),'[]'::jsonb) else '[]'::jsonb end,
  'conversation',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversationId',m.conversation_id,'senderId',m.sender_id,'body',m.body,'sentAt',m.sent_at,'attachmentPath',m.attachment_path) order by m.sent_at desc,m.id) from (select m.* from mir_core.messages m where m.organization_id=org and m.job_id=j.id and mir_core.conversation_allowed(org,m.conversation_id) order by m.sent_at desc,m.id limit size) m),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc,a.id) from (select a.* from mir_core.job_activity a where a.organization_id=org and a.job_id=j.id and(page_before is null or a.created_at<page_before) order by a.created_at desc,a.id limit size) a),'[]'::jsonb),
  'nextBefore',(select min(a.created_at) from (select a.created_at from mir_core.job_activity a where a.organization_id=org and a.job_id=j.id and(page_before is null or a.created_at<page_before) order by a.created_at desc,a.id limit size) a)
 ) into dossier from mir_core.jobs j where j.organization_id=org and j.id=job;
 if dossier is null then raise exception 'Chantier introuvable' using errcode='42501';end if;
 return dossier;
end$$;
revoke all on function public.mir_job_dossier_snapshot(uuid,uuid,integer,timestamptz) from public,anon;
grant execute on function public.mir_job_dossier_snapshot(uuid,uuid,integer,timestamptz) to authenticated;

commit;
