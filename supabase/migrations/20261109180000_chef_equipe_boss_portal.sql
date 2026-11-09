-- Mobile Chef d'equipe and Boss operations. Internal only; public site unchanged.
begin;

alter table mir_core.staff_capabilities drop constraint staff_capabilities_staff_role_check;
update mir_core.staff_capabilities set staff_role=case staff_role when 'leader' then 'chef_equipe' when 'employee' then 'employe' else staff_role end;
delete from mir_core.staff_capabilities s using mir_core.memberships m where (m.organization_id,m.user_id)=(s.organization_id,s.user_id) and m.active and m.role='admin';
alter table mir_core.staff_capabilities add constraint staff_capabilities_staff_role_check
 check(staff_role in ('boss','assistant','chef_equipe','employe','warehouse'));

create or replace function mir_core.staff_role(org uuid,member uuid default auth.uid()) returns text
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select case when exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=member and m.active and m.role='admin') then 'admin'
 else (select p.staff_role from mir_core.staff_capabilities p join mir_core.memberships m
  on(m.organization_id,m.user_id)=(p.organization_id,p.user_id)
  where p.organization_id=org and p.user_id=member and p.active and m.active and m.role='employee') end;
$$;
drop function mir_core.job_allowed(uuid,uuid,uuid);
create function mir_core.job_allowed(org uuid,job uuid,member uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.staff_role(org,member) in ('admin','boss') or exists(select 1 from mir_core.job_memberships j
  join mir_core.memberships m on(m.organization_id,m.user_id)=(j.organization_id,j.user_id)
  where j.organization_id=org and j.job_id=job and j.user_id=member and m.active and m.role='employee');
$$;
create or replace function mir_core.job_allowed(org uuid,jid uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$select mir_core.job_allowed(org,jid,auth.uid())$$;
create or replace function mir_core.internal_object_allowed(object_name text,writing boolean default false) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$declare parts text[];org uuid;scope text;entity uuid;owner uuid;begin
 parts:=storage.foldername(object_name);if cardinality(parts)<>4 then return false;end if;
 begin org:=parts[1]::uuid;entity:=parts[3]::uuid;owner:=parts[4]::uuid;exception when others then return false;end;
 scope:=parts[2];if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=auth.uid() and active and role in ('admin','employee')) or(writing and owner<>auth.uid()) then return false;end if;
 if scope='message' then return mir_core.conversation_allowed(org,entity);end if;
 if scope in ('extra','issue','receipt','material','problem','report') then return mir_core.job_allowed(org,entity);end if;return false;end$$;

alter table mir_core.jobs add column if not exists address text not null default '' check(length(address)<=300);
alter table mir_core.jobs add column if not exists phone text not null default '' check(length(phone)<=40);
alter table mir_core.jobs add column if not exists city text not null default '' check(length(city)<=120);

create table mir_core.team_day_assignments(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),work_date date not null default current_date,
 team_id uuid not null,job_id uuid not null,leader_id uuid not null,start_time time,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,team_id,work_date),
 foreign key(organization_id,team_id) references mir_core.teams,
 foreign key(organization_id,job_id) references mir_core.jobs,
 foreign key(organization_id,leader_id) references mir_core.memberships(organization_id,user_id));
create table mir_core.team_attendance(
 organization_id uuid not null,assignment_id uuid not null,user_id uuid not null,
 status text not null check(status in ('present','absent','unconfirmed')) default 'unconfirmed',
 confirmed_by uuid references auth.users(id),confirmed_at timestamptz,
 primary key(organization_id,assignment_id,user_id),
 foreign key(organization_id,assignment_id) references mir_core.team_day_assignments,
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id));
create table mir_core.team_tasks(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),team_id uuid not null,job_id uuid not null,
 work_date date not null default current_date,title text not null check(length(btrim(title)) between 1 and 240),
 completed_at timestamptz,completed_by uuid references auth.users(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,team_id) references mir_core.teams,
 foreign key(organization_id,job_id) references mir_core.jobs);
create table mir_core.material_requests(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),job_id uuid not null,team_id uuid not null,
 order_id uuid,item text not null check(length(btrim(item)) between 1 and 240),quantity numeric(15,3) not null check(quantity>0),
 note text not null default '' check(length(note)<=1200),photo_path text,urgency text not null default 'normal' check(urgency in ('normal','urgent')),
 status text not null default 'pending' check(status in ('pending','approved','refused','ordered','delivered')),
 requested_by uuid not null references auth.users(id),decided_by uuid references auth.users(id),decided_at timestamptz,
 client_request_id uuid not null,created_at timestamptz not null default now(),primary key(organization_id,id),
 unique(organization_id,requested_by,client_request_id),foreign key(organization_id,job_id) references mir_core.jobs,
 foreign key(organization_id,team_id) references mir_core.teams,foreign key(organization_id,order_id) references mir_core.orders);
create table mir_core.field_issues(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),job_id uuid not null,team_id uuid not null,
 note text not null check(length(btrim(note)) between 1 and 1200),photo_path text,audio_path text,
 urgency text not null default 'normal' check(urgency in ('normal','urgent','critical')),
 status text not null default 'open' check(status in ('open','in_progress','approved','refused','resolved')),
 reported_by uuid not null references auth.users(id),client_request_id uuid not null,created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,reported_by,client_request_id),
 foreign key(organization_id,job_id) references mir_core.jobs,foreign key(organization_id,team_id) references mir_core.teams);
create table mir_core.daily_reports(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),work_date date not null default current_date,
 job_id uuid not null,team_id uuid not null,leader_id uuid not null,work_done text not null check(length(btrim(work_done)) between 1 and 2000),
 had_problem boolean not null,missing_material boolean not null,photo_paths jsonb not null default '[]' check(jsonb_typeof(photo_paths)='array'),
 comment text not null default '' check(length(comment)<=1200),client_request_id uuid not null,submitted_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,leader_id,work_date),unique(organization_id,leader_id,client_request_id),
 foreign key(organization_id,job_id) references mir_core.jobs,foreign key(organization_id,team_id) references mir_core.teams,
 foreign key(organization_id,leader_id) references mir_core.memberships(organization_id,user_id));

alter table mir_core.job_activity drop constraint job_activity_activity_type_check;
alter table mir_core.job_activity add constraint job_activity_activity_type_check check(activity_type in
 ('plan','note','photo','extra','order','supplier_order','delivery','delivery_issue','team_arrived','attendance','task','material_request','material_decision','field_issue','daily_report'));
do $$declare t text;begin foreach t in array array['team_day_assignments','team_attendance','team_tasks','material_requests','field_issues','daily_reports'] loop
 execute format('alter table mir_core.%I enable row level security',t);execute format('revoke all on mir_core.%I from public,anon,authenticated',t);end loop;end$$;
create index team_day_lookup on mir_core.team_day_assignments(organization_id,work_date,leader_id);
create index team_tasks_today on mir_core.team_tasks(organization_id,team_id,work_date,completed_at);
create index material_requests_pending on mir_core.material_requests(organization_id,status,created_at) where status='pending';
create index field_issues_open on mir_core.field_issues(organization_id,status,created_at) where status in ('open','in_progress');
create index daily_reports_recent on mir_core.daily_reports(organization_id,submitted_at desc);

create or replace function public.mir_staff_configure(org uuid,member uuid,role_name text,display_name text default '') returns boolean
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if role_name not in ('boss','assistant','chef_equipe','employe','warehouse') or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=member and active and role='employee') then raise exception 'Profil interne invalide' using errcode='22023';end if;
 insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by) values(org,member,role_name,left(btrim(coalesce(display_name,'')),160),auth.uid())
 on conflict(organization_id,user_id) do update set staff_role=excluded.staff_role,display_name=excluded.display_name,active=true,configured_by=auth.uid(),configured_at=now();return true;end$$;
create or replace function public.mir_team_save(org uuid,team uuid,name text,leader uuid,members uuid[]) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid:=coalesce(team,gen_random_uuid());m uuid;begin
 if mir_core.staff_role(org) not in ('admin','boss') then raise exception 'Boss ou admin requis' using errcode='42501';end if;
 if length(btrim(name)) not between 1 and 120 or mir_core.staff_role(org,leader)<>'chef_equipe' then raise exception 'Équipe ou chef invalide' using errcode='22023';end if;
 insert into mir_core.teams(organization_id,id,name,leader_id) values(org,result,btrim(name),leader) on conflict(organization_id,id) do update set name=excluded.name,leader_id=excluded.leader_id,active=true;
 delete from mir_core.team_members where organization_id=org and team_id=result;
 foreach m in array coalesce(members,'{}') loop if mir_core.staff_role(org,m) not in ('employe','chef_equipe') then raise exception 'Membre invalide' using errcode='22023';end if;insert into mir_core.team_members values(org,result,m,true,now());end loop;
 insert into mir_core.team_members values(org,result,leader,true,now()) on conflict do nothing;return result;end$$;

create or replace function public.mir_conversation_private(org uuid,other uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare me uuid:=auth.uid();mine text;theirs text;result uuid;begin
 mine:=mir_core.staff_role(org,me);theirs:=mir_core.staff_role(org,other);
 if me=other or mine is null or theirs is null or not(
  mine='boss' or(mine='assistant' and theirs in ('employe','chef_equipe')) or
  (mine='chef_equipe' and theirs='boss') or(mine='employe' and theirs in ('assistant','boss')) or
  (mine in ('chef_equipe','employe') and theirs in ('chef_equipe','employe') and exists(select 1 from mir_core.team_members a join mir_core.team_members b on(a.organization_id,a.team_id)=(b.organization_id,b.team_id) where a.organization_id=org and a.user_id=me and b.user_id=other and a.active and b.active))
 ) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 select c.id into result from mir_core.conversations c where c.organization_id=org and c.kind='private'
 and exists(select 1 from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.user_id=me and p.active)
 and exists(select 1 from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.user_id=other and p.active)
 and (select count(*) from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.active)=2 limit 1;
 if result is null then result:=gen_random_uuid();insert into mir_core.conversations values(org,result,'private',null,me,now());insert into mir_core.conversation_participants values(org,result,me,true,now()),(org,result,other,true,now());end if;return result;end$$;

create function public.mir_lead_today_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);a mir_core.team_day_assignments;begin
 if r<>'chef_equipe' then raise exception 'Chef équipe requis' using errcode='42501';end if;
 select * into a from mir_core.team_day_assignments x where x.organization_id=org and x.work_date=current_date and x.leader_id=auth.uid() order by x.created_at desc limit 1;
 return jsonb_build_object('role',r,'today',current_date,'assignment',case when a.id is null then null else jsonb_build_object('id',a.id,'teamId',a.team_id,'jobId',a.job_id,'startTime',a.start_time) end,
 'team',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(c.display_name,''),m.user_id::text),'status',coalesce(at.status,'unconfirmed')) order by c.display_name) from mir_core.team_members m left join mir_core.staff_capabilities c on(c.organization_id,c.user_id)=(m.organization_id,m.user_id) left join mir_core.team_attendance at on(at.organization_id,at.assignment_id,at.user_id)=(m.organization_id,a.id,m.user_id) where m.organization_id=org and m.team_id=a.team_id and m.active),'[]'),
 'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'completedAt',t.completed_at) order by (t.completed_at is not null),t.created_at) from mir_core.team_tasks t where t.organization_id=org and t.team_id=a.team_id and t.work_date=current_date),'[]'),
 'materialRequests',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from mir_core.material_requests m where m.organization_id=org and m.team_id=a.team_id),'[]'),
 'issues',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from mir_core.field_issues i where i.organization_id=org and i.team_id=a.team_id),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(d) order by d.submitted_at desc) from mir_core.daily_reports d where d.organization_id=org and d.leader_id=auth.uid()),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(j) order by j.created_at desc) from mir_core.job_activity j where j.organization_id=org and j.job_id=a.job_id),'[]'));
end$$;
create function public.mir_boss_operations_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$begin
 if mir_core.staff_role(org)<>'boss' then raise exception 'Boss requis' using errcode='42501';end if;
 return jsonb_build_object('role','boss',
 'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'name',j.name,'address',j.address,'phone',j.phone,'city',j.city) order by j.name) from mir_core.jobs j where j.organization_id=org and not j.archived),'[]'),
 'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'leaderId',t.leader_id,'jobId',a.job_id,'members',(select count(*) from mir_core.team_members m where m.organization_id=org and m.team_id=t.id and m.active)) order by t.name) from mir_core.teams t left join mir_core.team_day_assignments a on a.organization_id=org and a.team_id=t.id and a.work_date=current_date where t.organization_id=org and t.active),'[]'),
 'pendingMaterials',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from mir_core.material_requests m where m.organization_id=org and m.status='pending'),'[]'),
 'openIssues',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from mir_core.field_issues i where i.organization_id=org and i.status in ('open','in_progress')),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(d) order by d.submitted_at desc) from mir_core.daily_reports d where d.organization_id=org and d.work_date=current_date),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(j) order by j.created_at desc) from mir_core.job_activity j where j.organization_id=org limit 100),'[]'));
end$$;

create function public.mir_lead_action(org uuid,request_id uuid,action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare a mir_core.team_day_assignments;eid uuid;status text;begin
 if mir_core.staff_role(org)<>'chef_equipe' or request_id is null then raise exception 'Chef équipe requis' using errcode='42501';end if;
 select * into a from mir_core.team_day_assignments x where x.organization_id=org and x.work_date=current_date and x.leader_id=auth.uid() order by x.created_at desc limit 1;
 if a.id is null then raise exception 'Aucune affectation aujourd’hui' using errcode='42501';end if;
 if action='attendance' then eid:=(payload->>'userId')::uuid;status:=payload->>'status';if status not in ('present','absent','unconfirmed') or not exists(select 1 from mir_core.team_members where organization_id=org and team_id=a.team_id and user_id=eid and active) then raise exception 'Présence invalide' using errcode='22023';end if;insert into mir_core.team_attendance values(org,a.id,eid,status,auth.uid(),now()) on conflict(organization_id,assignment_id,user_id) do update set status=excluded.status,confirmed_by=auth.uid(),confirmed_at=now();
 elsif action='task_add' then insert into mir_core.team_tasks(organization_id,team_id,job_id,title,created_by) values(org,a.team_id,a.job_id,btrim(payload->>'title'),auth.uid()) returning id into eid;
 elsif action='task_complete' then eid:=(payload->>'id')::uuid;update mir_core.team_tasks set completed_at=coalesce(completed_at,now()),completed_by=auth.uid() where organization_id=org and id=eid and team_id=a.team_id and job_id=a.job_id;if not found then raise exception 'Tâche non autorisée' using errcode='42501';end if;
 elsif action='material_request' then insert into mir_core.material_requests(organization_id,job_id,team_id,order_id,item,quantity,note,photo_path,urgency,requested_by,client_request_id) values(org,a.job_id,a.team_id,nullif(payload->>'orderId','')::uuid,btrim(payload->>'item'),(payload->>'quantity')::numeric,left(coalesce(payload->>'note',''),1200),nullif(payload->>'photoPath',''),coalesce(nullif(payload->>'urgency',''),'normal'),auth.uid(),request_id) on conflict(organization_id,requested_by,client_request_id) do nothing returning id into eid;
 elsif action='field_issue' then insert into mir_core.field_issues(organization_id,job_id,team_id,note,photo_path,audio_path,urgency,reported_by,client_request_id) values(org,a.job_id,a.team_id,btrim(payload->>'note'),nullif(payload->>'photoPath',''),nullif(payload->>'audioPath',''),coalesce(nullif(payload->>'urgency',''),'normal'),auth.uid(),request_id) on conflict(organization_id,reported_by,client_request_id) do nothing returning id into eid;
 elsif action='daily_report' then insert into mir_core.daily_reports(organization_id,job_id,team_id,leader_id,work_done,had_problem,missing_material,photo_paths,comment,client_request_id) values(org,a.job_id,a.team_id,auth.uid(),btrim(payload->>'workDone'),coalesce((payload->>'hadProblem')::boolean,false),coalesce((payload->>'missingMaterial')::boolean,false),coalesce(payload->'photoPaths','[]'),left(coalesce(payload->>'comment',''),1200),request_id) on conflict(organization_id,leader_id,client_request_id) do nothing returning id into eid;
 else raise exception 'Action inconnue' using errcode='22023';end if;
 if action<>'attendance' then insert into mir_core.job_activity(organization_id,job_id,activity_type,entity_id,actor_id,payload) values(org,a.job_id,case action when 'task_add' then 'task' when 'task_complete' then 'task' when 'material_request' then 'material_request' when 'field_issue' then 'field_issue' else 'daily_report' end,eid,auth.uid(),payload);end if;
 if action in ('material_request','field_issue','daily_report') then insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) select org,s.user_id,action,case action when 'material_request' then 'Demande de matériel' when 'field_issue' then 'Problème chantier' else 'Rapport de fin de journée' end,jsonb_build_object('view','boss','jobId',a.job_id,'entityId',eid),eid from mir_core.staff_capabilities s where s.organization_id=org and s.active and s.staff_role='boss';end if;
 return jsonb_build_object('ok',true,'id',eid);end$$;
create function public.mir_boss_action(org uuid,action text,entity uuid,decision text,payload jsonb default '{}') returns boolean
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare j uuid;target uuid;begin
 if mir_core.staff_role(org)<>'boss' then raise exception 'Boss requis' using errcode='42501';end if;
 if action='material_decision' and decision in ('approved','refused') then update mir_core.material_requests set status=decision,decided_by=auth.uid(),decided_at=now() where organization_id=org and id=entity and status='pending' returning job_id into j;
 elsif action='issue_decision' and decision in ('approved','refused','in_progress','resolved') then update mir_core.field_issues set status=decision where organization_id=org and id=entity returning job_id into j;
 elsif action='assign_day' then j:=(payload->>'jobId')::uuid;if not exists(select 1 from mir_core.teams where organization_id=org and id=entity and active) or not exists(select 1 from mir_core.jobs where organization_id=org and id=j and not archived) then raise exception 'Affectation invalide' using errcode='22023';end if;insert into mir_core.team_day_assignments(organization_id,work_date,team_id,job_id,leader_id,created_by) select org,current_date,t.id,j,t.leader_id,auth.uid() from mir_core.teams t where t.organization_id=org and t.id=entity on conflict(organization_id,team_id,work_date) do update set job_id=excluded.job_id,leader_id=excluded.leader_id;
 elsif action='move_member' then target:=(payload->>'teamId')::uuid;if not exists(select 1 from mir_core.teams where organization_id=org and id=target and active) or mir_core.staff_role(org,entity)<>'employe' then raise exception 'Déplacement invalide' using errcode='22023';end if;update mir_core.team_members set active=false where organization_id=org and user_id=entity and active;insert into mir_core.team_members values(org,target,entity,true,now()) on conflict(organization_id,team_id,user_id) do update set active=true;
 elsif action='substitute_leader' then target:=(payload->>'leaderId')::uuid;if mir_core.staff_role(org,target)<>'chef_equipe' then raise exception 'Chef remplaçant invalide' using errcode='22023';end if;update mir_core.teams set leader_id=target where organization_id=org and id=entity and active;update mir_core.team_day_assignments set leader_id=target where organization_id=org and team_id=entity and work_date=current_date;
 else raise exception 'Décision invalide' using errcode='22023';end if;if action in ('material_decision','issue_decision') and not found then raise exception 'Demande indisponible' using errcode='42501';end if;
 if j is not null then insert into mir_core.job_activity(organization_id,job_id,activity_type,entity_id,actor_id,payload) values(org,j,case when action='assign_day' then 'team_arrived' else 'material_decision' end,entity,auth.uid(),jsonb_build_object('decision',decision)||payload);end if;return true;end$$;

revoke all on function public.mir_lead_today_snapshot(uuid),public.mir_boss_operations_snapshot(uuid),public.mir_lead_action(uuid,uuid,text,jsonb),public.mir_boss_action(uuid,text,uuid,text,jsonb) from public,anon;
grant execute on function public.mir_lead_today_snapshot(uuid),public.mir_boss_operations_snapshot(uuid),public.mir_lead_action(uuid,uuid,text,jsonb),public.mir_boss_action(uuid,text,uuid,text,jsonb) to authenticated;

commit;
