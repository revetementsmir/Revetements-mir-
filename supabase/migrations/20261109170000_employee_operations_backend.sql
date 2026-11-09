-- MIR employee operations: messaging, teams, HR, extras, delivery receipts,
-- job activity, notifications and reminders. Additive; public site unchanged.
begin;

create table mir_core.staff_capabilities(
 organization_id uuid not null,
 user_id uuid not null,
 staff_role text not null default 'employee' check(staff_role in ('boss','assistant','leader','employee','warehouse')),
 display_name text not null default '' check(length(display_name)<=160),
 active boolean not null default true,
 configured_by uuid not null references auth.users(id),
 configured_at timestamptz not null default now(),
 primary key(organization_id,user_id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);
create table mir_core.teams(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 name text not null check(length(name) between 1 and 120),
 leader_id uuid not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,name),
 foreign key(organization_id,leader_id) references mir_core.memberships(organization_id,user_id)
);
create table mir_core.team_members(
 organization_id uuid not null,
 team_id uuid not null,
 user_id uuid not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(organization_id,team_id,user_id),
 foreign key(organization_id,team_id) references mir_core.teams(organization_id,id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);
create unique index team_one_active_membership on mir_core.team_members(organization_id,user_id) where active;

create function mir_core.staff_role(org uuid,member uuid default auth.uid()) returns text
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select case when mir_core.has_role(org,array['admin']) and member=auth.uid() then 'boss'
  else (select p.staff_role from mir_core.staff_capabilities p join mir_core.memberships m
   on(m.organization_id,m.user_id)=(p.organization_id,p.user_id)
   where p.organization_id=org and p.user_id=member and p.active and m.active and m.role='employee') end;
$$;
create function mir_core.job_allowed(org uuid,job uuid,member uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.has_role(org,array['admin']) or exists(select 1 from mir_core.job_memberships j
  join mir_core.memberships m on(m.organization_id,m.user_id)=(j.organization_id,j.user_id)
  where j.organization_id=org and j.job_id=job and j.user_id=member and m.active and m.role='employee');
$$;
revoke all on function mir_core.staff_role(uuid,uuid),mir_core.job_allowed(uuid,uuid,uuid) from public,anon;
grant execute on function mir_core.staff_role(uuid,uuid),mir_core.job_allowed(uuid,uuid,uuid) to authenticated;

create table mir_core.conversations(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 kind text not null check(kind in ('private','team')),
 team_id uuid,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 foreign key(organization_id,team_id) references mir_core.teams(organization_id,id),
 check((kind='team')=(team_id is not null))
);
create unique index conversations_one_team on mir_core.conversations(organization_id,team_id) where kind='team';
create table mir_core.conversation_participants(
 organization_id uuid not null,
 conversation_id uuid not null,
 user_id uuid not null,
 active boolean not null default true,
 joined_at timestamptz not null default now(),
 primary key(organization_id,conversation_id,user_id),
 foreign key(organization_id,conversation_id) references mir_core.conversations(organization_id,id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);
create table mir_core.messages(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 conversation_id uuid not null,
 sender_id uuid not null references auth.users(id),
 client_request_id uuid not null,
 body text not null check(length(btrim(body)) between 1 and 4000),
 job_id uuid,
 plan_document_id uuid,
 attachment_path text,
 sent_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,sender_id,client_request_id),
 foreign key(organization_id,conversation_id) references mir_core.conversations(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 foreign key(organization_id,plan_document_id) references mir_core.documents(organization_id,id)
);
create index messages_conversation_time on mir_core.messages(organization_id,conversation_id,sent_at desc,id);
create table mir_core.message_receipts(
 organization_id uuid not null,
 message_id uuid not null,
 user_id uuid not null,
 delivered_at timestamptz,
 read_at timestamptz,
 primary key(organization_id,message_id,user_id),
 foreign key(organization_id,message_id) references mir_core.messages(organization_id,id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id),
 check(read_at is null or delivered_at is not null)
);

create table mir_core.extras(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 job_id uuid not null,
 created_by uuid not null references auth.users(id),
 client_request_id uuid not null,
 description text not null check(length(btrim(description)) between 1 and 1200),
 photo_path text,
 status text not null default 'pending' check(status in ('pending','approved','refused','completed')),
 due_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,created_by,client_request_id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create table mir_core.delivery_receipts(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 order_id uuid not null,
 order_line_id uuid not null,
 job_id uuid not null,
 quantity numeric(15,3) not null check(quantity>0),
 received_by uuid not null references auth.users(id),
 received_where text not null check(length(received_where) between 1 and 240),
 photo_path text,
 client_request_id uuid not null,
 received_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,received_by,client_request_id),
 foreign key(organization_id,order_id) references mir_core.orders(organization_id,id),
 foreign key(organization_id,order_line_id) references mir_core.order_lines(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create index delivery_receipts_line on mir_core.delivery_receipts(organization_id,order_line_id);
create table mir_core.delivery_issues(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 job_id uuid not null,
 order_id uuid,
 order_line_id uuid,
 supplier_order_id uuid,
 reported_by uuid not null references auth.users(id),
 client_request_id uuid not null,
 comment text not null check(length(btrim(comment)) between 1 and 1200),
 photo_path text,
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,reported_by,client_request_id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 foreign key(organization_id,order_id) references mir_core.orders(organization_id,id),
 foreign key(organization_id,order_line_id) references mir_core.order_lines(organization_id,id),
 foreign key(organization_id,supplier_order_id) references mir_core.orders(organization_id,id)
);

create table mir_core.hr_requests(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 employee_id uuid not null,
 request_type text not null check(request_type in ('sickness_today','leave','vacation')),
 start_date date not null,
 end_date date not null,
 employee_note text not null default '' check(length(employee_note)<=500),
 status text not null default 'pending' check(status in ('pending','approved','refused')),
 decided_by uuid references auth.users(id),
 decision_note text not null default '' check(length(decision_note)<=500),
 decided_at timestamptz,
 client_request_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,employee_id,client_request_id),
 foreign key(organization_id,employee_id) references mir_core.memberships(organization_id,user_id),
 check(end_date>=start_date),
 check((status='pending' and decided_by is null and decided_at is null) or(status<>'pending' and decided_by is not null and decided_at is not null))
);
create index hr_requests_employee_time on mir_core.hr_requests(organization_id,employee_id,created_at desc);
create index hr_requests_pending on mir_core.hr_requests(organization_id,created_at) where status='pending';

create table mir_core.job_activity(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 job_id uuid not null,
 activity_type text not null check(activity_type in ('plan','note','photo','extra','order','supplier_order','delivery','delivery_issue')),
 entity_id uuid,
 actor_id uuid not null references auth.users(id),
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id)
);
create index job_activity_feed on mir_core.job_activity(organization_id,job_id,created_at desc,id);
create table mir_core.notifications(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 user_id uuid not null,
 kind text not null,
 title text not null check(length(title) between 1 and 240),
 route jsonb not null check(jsonb_typeof(route)='object'),
 entity_id uuid,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);
create index notifications_unread on mir_core.notifications(organization_id,user_id,created_at desc) where read_at is null;
create table mir_core.reminders(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 user_id uuid not null,
 kind text not null check(kind in ('late_delivery','pending_extra')),
 entity_id uuid not null,
 due_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','sent','cancelled')),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,user_id,kind,entity_id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);
create index reminders_due on mir_core.reminders(due_at) where status='pending';

do $$declare t text;begin
 foreach t in array array['staff_capabilities','teams','team_members','conversations','conversation_participants','messages','message_receipts','extras','delivery_receipts','delivery_issues','hr_requests','job_activity','notifications','reminders'] loop
  execute format('alter table mir_core.%I enable row level security',t);
  execute format('revoke all on mir_core.%I from public,anon,authenticated',t);
 end loop;
end$$;

create function mir_core.conversation_allowed(org uuid,conversation uuid,member uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select exists(select 1 from mir_core.conversation_participants p join mir_core.memberships m
  on(m.organization_id,m.user_id)=(p.organization_id,p.user_id)
  where p.organization_id=org and p.conversation_id=conversation and p.user_id=member and p.active and m.active);
$$;
revoke all on function mir_core.conversation_allowed(uuid,uuid,uuid) from public,anon;
grant execute on function mir_core.conversation_allowed(uuid,uuid,uuid) to authenticated;

create function public.mir_staff_configure(org uuid,member uuid,role_name text,display_name text default '') returns boolean
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if role_name not in ('boss','assistant','leader','employee','warehouse') or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=member and active and role in ('admin','employee')) then raise exception 'Profil interne invalide' using errcode='22023';end if;
 insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by) values(org,member,role_name,left(btrim(coalesce(display_name,'')),160),auth.uid())
 on conflict(organization_id,user_id) do update set staff_role=excluded.staff_role,display_name=excluded.display_name,active=true,configured_by=auth.uid(),configured_at=now();return true;
end$$;
create function public.mir_team_save(org uuid,team uuid,name text,leader uuid,members uuid[]) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid:=coalesce(team,gen_random_uuid());m uuid;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if length(btrim(name)) not between 1 and 120 or mir_core.staff_role(org,leader)<>'leader' then raise exception 'Équipe ou chef invalide' using errcode='22023';end if;
 insert into mir_core.teams(organization_id,id,name,leader_id) values(org,result,btrim(name),leader)
 on conflict(organization_id,id) do update set name=excluded.name,leader_id=excluded.leader_id,active=true;
 delete from mir_core.team_members where organization_id=org and team_id=result;
 foreach m in array coalesce(members,'{}') loop
  if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=m and active and role='employee') then raise exception 'Membre invalide' using errcode='22023';end if;
  insert into mir_core.team_members values(org,result,m,true,now());
 end loop;
 insert into mir_core.team_members values(org,result,leader,true,now()) on conflict do nothing;
 return result;
end$$;

create function public.mir_conversation_private(org uuid,other uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare me uuid:=auth.uid();mine text;theirs text;result uuid;begin
 mine:=mir_core.staff_role(org,me);theirs:=mir_core.staff_role(org,other);
 if me=other or mine is null or theirs is null or not(
  mine='boss' or(mine='assistant' and theirs in ('employee','leader')) or
  (mine='leader' and theirs='boss') or
  (mine='employee' and theirs in ('assistant','boss')) or
  (mine in ('leader','employee') and theirs in ('leader','employee') and exists(select 1 from mir_core.team_members a join mir_core.team_members b on(a.organization_id,a.team_id)=(b.organization_id,b.team_id) where a.organization_id=org and a.user_id=me and b.user_id=other and a.active and b.active))
 ) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 select c.id into result from mir_core.conversations c where c.organization_id=org and c.kind='private'
 and exists(select 1 from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.user_id=me and p.active)
 and exists(select 1 from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.user_id=other and p.active)
 and (select count(*) from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.active)=2 limit 1;
 if result is null then result:=gen_random_uuid();insert into mir_core.conversations values(org,result,'private',null,me,now());insert into mir_core.conversation_participants values(org,result,me,true,now()),(org,result,other,true,now());end if;return result;
end$$;
create function public.mir_conversation_team(org uuid,team uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;begin
 if not exists(select 1 from mir_core.team_members where organization_id=org and team_id=team and user_id=auth.uid() and active) and not mir_core.has_role(org,array['admin']) then raise exception 'Équipe non autorisée' using errcode='42501';end if;
 select id into result from mir_core.conversations where organization_id=org and team_id=team;
 if result is null then result:=gen_random_uuid();insert into mir_core.conversations values(org,result,'team',team,auth.uid(),now());insert into mir_core.conversation_participants select org,result,user_id,true,now() from mir_core.team_members where organization_id=org and team_id=team and active;end if;return result;
end$$;

create function public.mir_message_send(org uuid,conversation uuid,body text,job uuid,plan uuid,attachment text,request_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;recipient uuid;begin
 if not mir_core.conversation_allowed(org,conversation) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 if request_id is null or length(btrim(body)) not between 1 and 4000 or (job is not null and not mir_core.job_allowed(org,job)) then raise exception 'Message invalide' using errcode='22023';end if;
 select id into result from mir_core.messages where organization_id=org and sender_id=auth.uid() and client_request_id=request_id;
 if found then return jsonb_build_object('id',result,'state','sent','sentAt',(select sent_at from mir_core.messages where organization_id=org and id=result));end if;
 insert into mir_core.messages(organization_id,conversation_id,sender_id,client_request_id,body,job_id,plan_document_id,attachment_path)
 values(org,conversation,auth.uid(),request_id,btrim(body),job,plan,nullif(btrim(attachment),'')) on conflict(organization_id,sender_id,client_request_id) do nothing;
 select id into result from mir_core.messages where organization_id=org and sender_id=auth.uid() and client_request_id=request_id;
 for recipient in select user_id from mir_core.conversation_participants where organization_id=org and conversation_id=conversation and active and user_id<>auth.uid() loop
  insert into mir_core.message_receipts(organization_id,message_id,user_id) values(org,result,recipient) on conflict do nothing;
  insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,recipient,'message','Nouveau message',jsonb_build_object('view','messages','conversationId',conversation),result);
 end loop;
 return jsonb_build_object('id',result,'state','sent','sentAt',(select sent_at from mir_core.messages where organization_id=org and id=result));
end$$;
create function public.mir_message_ack(org uuid,message uuid,state text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare row mir_core.message_receipts;begin
 if state not in ('delivered','read') then raise exception 'Accusé invalide' using errcode='22023';end if;
 update mir_core.message_receipts set delivered_at=coalesce(delivered_at,now()),read_at=case when state='read' then coalesce(read_at,now()) else read_at end where organization_id=org and message_id=message and user_id=auth.uid() returning * into row;
 if not found then raise exception 'Message non autorisé' using errcode='42501';end if;
 return jsonb_build_object('deliveredAt',row.delivered_at,'readAt',row.read_at);
end$$;

create function public.mir_extra_submit(org uuid,job uuid,description text,photo text,due_at timestamptz,request_id uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;target uuid;begin
 if not mir_core.job_allowed(org,job) or request_id is null or length(btrim(description)) not between 1 and 1200 then raise exception 'Extra invalide' using errcode='22023';end if;
 select id into result from mir_core.extras where organization_id=org and created_by=auth.uid() and client_request_id=request_id;if found then return result;end if;
 insert into mir_core.extras(organization_id,job_id,created_by,client_request_id,description,photo_path,due_at) values(org,job,auth.uid(),request_id,btrim(description),nullif(btrim(photo),''),due_at) on conflict do nothing;
 select id into result from mir_core.extras where organization_id=org and created_by=auth.uid() and client_request_id=request_id;
 insert into mir_core.job_activity values(org,gen_random_uuid(),job,'extra',result,auth.uid(),jsonb_build_object('status','pending'),now()) on conflict do nothing;
 for target in select user_id from mir_core.memberships where organization_id=org and active and role='admin' loop insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,target,'extra','Nouvel extra à vérifier',jsonb_build_object('view','job','jobId',job,'extraId',result),result);end loop;
 if due_at is not null then insert into mir_core.reminders(organization_id,user_id,kind,entity_id,due_at) select org,user_id,'pending_extra',result,due_at from mir_core.memberships where organization_id=org and active and role='admin' on conflict do nothing;end if;return result;
end$$;

create function public.mir_delivery_receive(org uuid,job uuid,p_order uuid,line uuid,quantity numeric,place text,photo text,request_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare requested numeric;already numeric;result uuid;begin
 if not mir_core.job_allowed(org,job) or request_id is null or quantity<=0 or length(btrim(place)) not between 1 and 240 then raise exception 'Réception invalide' using errcode='22023';end if;
 select l.quantity into requested from mir_core.order_lines l where l.organization_id=org and l.id=line and l.order_id=p_order;if not found then raise exception 'Article introuvable' using errcode='22023';end if;
 select id into result from mir_core.delivery_receipts where organization_id=org and received_by=auth.uid() and client_request_id=request_id;
 if found then select coalesce(sum(r.quantity),0) into already from mir_core.delivery_receipts r where r.organization_id=org and r.order_line_id=line;return jsonb_build_object('id',result,'receivedQty',least(requested,already),'remainingQty',greatest(0,requested-already));end if;
 select coalesce(sum(r.quantity),0) into already from mir_core.delivery_receipts r where r.organization_id=org and r.order_line_id=line;
 if already+quantity>requested then raise exception 'Quantité supérieure au reliquat' using errcode='22023';end if;
 insert into mir_core.delivery_receipts(organization_id,order_id,order_line_id,job_id,quantity,received_by,received_where,photo_path,client_request_id) values(org,p_order,line,job,quantity,auth.uid(),btrim(place),nullif(btrim(photo),''),request_id) on conflict do nothing;
 select id into result from mir_core.delivery_receipts where organization_id=org and received_by=auth.uid() and client_request_id=request_id;
 insert into mir_core.job_activity values(org,gen_random_uuid(),job,'delivery',result,auth.uid(),jsonb_build_object('orderId',p_order,'lineId',line,'quantity',quantity,'where',btrim(place)),now()) on conflict do nothing;
 return jsonb_build_object('id',result,'receivedQty',least(requested,already+quantity),'remainingQty',greatest(0,requested-already-quantity));
end$$;
create function public.mir_delivery_issue(org uuid,job uuid,p_order uuid,line uuid,supplier_order uuid,comment text,photo text,request_id uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;target uuid;begin
 if not mir_core.job_allowed(org,job) or request_id is null or length(btrim(comment)) not between 1 and 1200 then raise exception 'Signalement invalide' using errcode='22023';end if;
 select id into result from mir_core.delivery_issues where organization_id=org and reported_by=auth.uid() and client_request_id=request_id;if found then return result;end if;
 insert into mir_core.delivery_issues(organization_id,job_id,order_id,order_line_id,supplier_order_id,reported_by,client_request_id,comment,photo_path) values(org,job,p_order,line,supplier_order,auth.uid(),request_id,btrim(comment),nullif(btrim(photo),'')) on conflict do nothing;
 select id into result from mir_core.delivery_issues where organization_id=org and reported_by=auth.uid() and client_request_id=request_id;
 insert into mir_core.job_activity values(org,gen_random_uuid(),job,'delivery_issue',result,auth.uid(),jsonb_build_object('status','open'),now()) on conflict do nothing;
 for target in select p.user_id from mir_core.staff_capabilities p where p.organization_id=org and p.active and p.staff_role='assistant' loop insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,target,'delivery_issue','Problème de livraison',jsonb_build_object('view','material-issue','jobId',job,'issueId',result),result);end loop;return result;
end$$;

create function public.mir_hr_submit(org uuid,kind text,start_on date,end_on date,note text,request_id uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare result uuid;target uuid;begin
 if mir_core.staff_role(org) is null or kind not in ('sickness_today','leave','vacation') or request_id is null or end_on<start_on or(kind='sickness_today' and(start_on<>current_date or end_on<>current_date)) then raise exception 'Demande RH invalide' using errcode='22023';end if;
 select id into result from mir_core.hr_requests where organization_id=org and employee_id=auth.uid() and client_request_id=request_id;if found then return result;end if;
 insert into mir_core.hr_requests(organization_id,employee_id,request_type,start_date,end_date,employee_note,client_request_id) values(org,auth.uid(),kind,start_on,end_on,left(coalesce(note,''),500),request_id) on conflict do nothing;
 select id into result from mir_core.hr_requests where organization_id=org and employee_id=auth.uid() and client_request_id=request_id;
 if kind='sickness_today' then
  for target in select t.leader_id from mir_core.teams t join mir_core.team_members m on(m.organization_id,m.team_id)=(t.organization_id,t.id) where m.organization_id=org and m.user_id=auth.uid() and m.active and t.active loop
   insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,target,'absence',(select coalesce(nullif(display_name,''),'Un employé')||' sera absent aujourd’hui' from mir_core.staff_capabilities where organization_id=org and user_id=auth.uid()),jsonb_build_object('view','team-availability'),result);
  end loop;
 else
  for target in select user_id from mir_core.memberships where organization_id=org and active and role='admin' loop insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,target,'hr_request','Nouvelle demande de congé',jsonb_build_object('view','hr','requestId',result),result);end loop;
 end if;return result;
end$$;
create function public.mir_hr_decide(org uuid,request uuid,decision text,note text default '') returns boolean
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare employee uuid;begin
 if not mir_core.has_role(org,array['admin']) or decision not in ('approved','refused') then raise exception 'Admin requis' using errcode='42501';end if;
 update mir_core.hr_requests set status=decision,decided_by=auth.uid(),decision_note=left(coalesce(note,''),500),decided_at=now() where organization_id=org and id=request and status='pending' returning employee_id into employee;if not found then raise exception 'Demande déjà traitée ou absente' using errcode='40001';end if;
 insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) values(org,employee,'hr_decision',case decision when 'approved' then 'Demande approuvée' else 'Demande refusée' end,jsonb_build_object('view','account','section','requests','requestId',request),request);return true;
end$$;

create function public.mir_employee_operations_snapshot(org uuid,job uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare role_name text:=mir_core.staff_role(org);begin
 if role_name is null and not mir_core.has_role(org,array['admin']) then raise exception 'Accès interne requis' using errcode='42501';end if;
 if job is not null and not mir_core.job_allowed(org,job) then raise exception 'Chantier non autorisé' using errcode='42501';end if;
 return jsonb_build_object('role',coalesce(role_name,'boss'),
  'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'leaderId',t.leader_id)) from mir_core.teams t where t.organization_id=org and t.active and (mir_core.has_role(org,array['admin']) or exists(select 1 from mir_core.team_members m where m.organization_id=org and m.team_id=t.id and m.user_id=auth.uid() and m.active))),'[]'),
  'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'teamId',c.team_id,'unread',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.user_id=auth.uid() and r.read_at is null and exists(select 1 from mir_core.messages x where x.organization_id=org and x.id=r.message_id and x.conversation_id=c.id)))) from mir_core.conversations c where c.organization_id=org and mir_core.conversation_allowed(org,c.id)),'[]'),
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversationId',m.conversation_id,'senderId',m.sender_id,'body',m.body,'jobId',m.job_id,'planDocumentId',m.plan_document_id,'attachmentPath',m.attachment_path,'sentAt',m.sent_at,'deliveredCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id and r.delivered_at is not null),'readCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id and r.read_at is not null),'recipientCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id)) order by m.sent_at desc) from mir_core.messages m where m.organization_id=org and mir_core.conversation_allowed(org,m.conversation_id)),'[]'),
  'hrRequests',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'employeeId',h.employee_id,'type',h.request_type,'startDate',h.start_date,'endDate',h.end_date,'status',h.status,'createdAt',h.created_at) order by h.created_at desc) from mir_core.hr_requests h where h.organization_id=org and(h.employee_id=auth.uid() or mir_core.has_role(org,array['admin']))),'[]'),
  'extras',coalesce((select jsonb_agg(to_jsonb(e)-'client_request_id') from mir_core.extras e where e.organization_id=org and(job is null or e.job_id=job) and mir_core.job_allowed(org,e.job_id)),'[]'),
  'receipts',coalesce((select jsonb_agg(to_jsonb(r)-'client_request_id') from mir_core.delivery_receipts r where r.organization_id=org and(job is null or r.job_id=job) and mir_core.job_allowed(org,r.job_id)),'[]'),
  'issues',coalesce((select jsonb_agg(to_jsonb(i)-'client_request_id') from mir_core.delivery_issues i where i.organization_id=org and(job is null or i.job_id=job) and(mir_core.job_allowed(org,i.job_id) or role_name='assistant')),'[]'),
  'activity',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from mir_core.job_activity a where a.organization_id=org and(job is null or a.job_id=job) and mir_core.job_allowed(org,a.job_id)),'[]'),
  'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from mir_core.notifications n where n.organization_id=org and n.user_id=auth.uid()),'[]'));
end$$;
create function public.mir_notification_read(org uuid,notification uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin update mir_core.notifications set read_at=coalesce(read_at,now()) where organization_id=org and id=notification and user_id=auth.uid();if not found then raise exception 'Avis non autorisé' using errcode='42501';end if;return true;end$$;

-- Extend the existing idempotent portal command without changing public/client flows.
create or replace function public.mir_portal_command(p_request_id uuid,p_command text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare account jsonb;org uuid;member uuid;ids uuid[];result jsonb;scalar uuid;begin
 account:=public.mir_account_snapshot();org:=(account->>'organizationId')::uuid;
 if account->>'role' not in ('employee','admin') or p_request_id is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Action interne invalide' using errcode='42501';end if;
 if p_command='ASSIGN_MEMBER_JOBS' then
  if account->>'role'<>'admin' then raise exception 'Admin requis' using errcode='42501';end if;member:=(p_payload->>'memberId')::uuid;
  if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=member and active and role='employee') then raise exception 'Employé actif requis' using errcode='42501';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into ids from jsonb_array_elements_text(p_payload->'jobIds');
  if exists(select 1 from unnest(ids) id where not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=id and not j.archived)) then raise exception 'Chantier inaccessible' using errcode='42501';end if;
  perform 1 from mir_core.memberships where organization_id=org and user_id=member for update;delete from mir_core.job_memberships where organization_id=org and user_id=member and not(job_id=any(ids));insert into mir_core.job_memberships select org,id,member from unnest(ids) id on conflict do nothing;result:=jsonb_build_object('ok',true);
 elsif p_command='EXTRA_SUBMIT' then scalar:=public.mir_extra_submit(org,(p_payload->>'jobId')::uuid,p_payload->>'description',p_payload->>'photoPath',nullif(p_payload->>'dueAt','')::timestamptz,p_request_id);result:=jsonb_build_object('id',scalar);
 elsif p_command='DELIVERY_ISSUE' then scalar:=public.mir_delivery_issue(org,(p_payload->>'jobId')::uuid,nullif(p_payload->>'orderId','')::uuid,nullif(p_payload->>'lineId','')::uuid,nullif(p_payload->>'supplierOrderId','')::uuid,p_payload->>'comment',p_payload->>'photoPath',p_request_id);result:=jsonb_build_object('id',scalar);
 elsif p_command='DELIVERY_RECEIVE' then result:=public.mir_delivery_receive(org,(p_payload->>'jobId')::uuid,(p_payload->>'orderId')::uuid,(p_payload->>'lineId')::uuid,(p_payload->>'quantity')::numeric,p_payload->>'place',p_payload->>'photoPath',p_request_id);
 elsif p_command='HR_SUBMIT' then scalar:=public.mir_hr_submit(org,p_payload->>'kind',(p_payload->>'start')::date,(p_payload->>'end')::date,p_payload->>'note',p_request_id);result:=jsonb_build_object('id',scalar);
 elsif p_command='MESSAGE_SEND' then result:=public.mir_message_send(org,(p_payload->>'conversationId')::uuid,p_payload->>'body',nullif(p_payload->>'jobId','')::uuid,nullif(p_payload->>'planDocumentId','')::uuid,p_payload->>'attachmentPath',p_request_id);
 elsif p_command='MESSAGE_ACK' then result:=public.mir_message_ack(org,(p_payload->>'messageId')::uuid,p_payload->>'state');
 elsif p_command='NOTIFICATION_READ' then result:=jsonb_build_object('ok',public.mir_notification_read(org,(p_payload->>'notificationId')::uuid));
 else raise exception 'Cette action n est pas raccordée au portail' using errcode='0A000';end if;
 return jsonb_build_object('result',result,'snapshot',public.mir_portal_snapshot());
end$$;
revoke all on function public.mir_portal_command(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_portal_command(uuid,text,jsonb) to authenticated;

do $$declare signature text;begin
 foreach signature in array array[
  'public.mir_staff_configure(uuid,uuid,text,text)','public.mir_team_save(uuid,uuid,text,uuid,uuid[])',
  'public.mir_conversation_private(uuid,uuid)','public.mir_conversation_team(uuid,uuid)',
  'public.mir_message_send(uuid,uuid,text,uuid,uuid,text,uuid)','public.mir_message_ack(uuid,uuid,text)',
  'public.mir_extra_submit(uuid,uuid,text,text,timestamptz,uuid)',
  'public.mir_delivery_receive(uuid,uuid,uuid,uuid,numeric,text,text,uuid)',
  'public.mir_delivery_issue(uuid,uuid,uuid,uuid,uuid,text,text,uuid)',
  'public.mir_hr_submit(uuid,text,date,date,text,uuid)','public.mir_hr_decide(uuid,uuid,text,text)',
  'public.mir_employee_operations_snapshot(uuid,uuid)','public.mir_notification_read(uuid,uuid)'] loop
  execute 'revoke all on function '||signature||' from public,anon';execute 'grant execute on function '||signature||' to authenticated';
 end loop;
end$$;
commit;
