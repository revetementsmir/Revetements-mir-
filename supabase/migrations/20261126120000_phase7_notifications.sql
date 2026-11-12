-- Phase 7 — Centre de notifications interne. Additif, sans courriel ni push.
begin;

do $$ begin
 if to_regclass('mir_core.notifications') is null or to_regclass('mir_core.memberships') is null then
  raise exception 'Socle notifications/membres absent: installation refusée';
 end if;
end $$;

create table if not exists mir_core.notification_events(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 event_key text not null check(length(event_key) between 8 and 240),
 module text not null check(module in('orders','folds','absences','expenses','punch','jobs','chat','support','inventory')),
 event_type text not null check(length(event_type) between 2 and 80),
 entity_id uuid,
 actor_id uuid references auth.users(id),
 title text not null check(length(title) between 1 and 160),
 summary text not null default '' check(length(summary)<=400),
 priority text not null default 'information' check(priority in('information','action_required','urgent')),
 route jsonb not null default '{}' check(jsonb_typeof(route)='object'),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,event_key)
);

create table if not exists mir_core.notification_preferences(
 organization_id uuid not null,
 user_id uuid not null,
 category text not null check(category in('orders','folds','absences','expenses','punch','jobs','chat','support','inventory')),
 enabled boolean not null default true,
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id,category),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id)
);

alter table mir_core.notifications
 add column if not exists event_id uuid,
 add column if not exists summary text not null default '',
 add column if not exists module text not null default 'support',
 add column if not exists priority text not null default 'information',
 add column if not exists action_required boolean not null default false,
 add column if not exists treated_at timestamptz,
 add column if not exists updated_at timestamptz not null default now();

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.notifications'::regclass and conname='notifications_phase7_module_check') then
  alter table mir_core.notifications add constraint notifications_phase7_module_check check(module in('orders','folds','absences','expenses','punch','jobs','chat','support','inventory'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='mir_core.notifications'::regclass and conname='notifications_phase7_priority_check') then
  alter table mir_core.notifications add constraint notifications_phase7_priority_check check(priority in('information','action_required','urgent'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='mir_core.notifications'::regclass and conname='notifications_phase7_event_fk') then
  alter table mir_core.notifications add constraint notifications_phase7_event_fk foreign key(organization_id,event_id) references mir_core.notification_events(organization_id,id);
 end if;
end $$;

create unique index if not exists notification_recipient_event_unique on mir_core.notifications(organization_id,event_id,user_id) where event_id is not null;
create index if not exists notification_events_entity on mir_core.notification_events(organization_id,module,entity_id,occurred_at desc);
create index if not exists notification_recipient_feed on mir_core.notifications(organization_id,user_id,created_at desc,id desc);
create index if not exists notification_recipient_actions on mir_core.notifications(organization_id,user_id,created_at desc) where action_required and treated_at is null;

alter table mir_core.notification_events enable row level security;
alter table mir_core.notification_preferences enable row level security;
alter table mir_core.notifications enable row level security;
revoke all on mir_core.notification_events,mir_core.notification_preferences,mir_core.notifications from public,anon,authenticated;

drop policy if exists notification_events_recipient_read on mir_core.notification_events;
create policy notification_events_recipient_read on mir_core.notification_events for select to authenticated
 using(auth.uid() is not null and exists(select 1 from mir_core.notifications n where(n.organization_id,n.event_id,n.user_id)=(notification_events.organization_id,notification_events.id,auth.uid())));
drop policy if exists notification_recipients_own_read on mir_core.notifications;
create policy notification_recipients_own_read on mir_core.notifications for select to authenticated
 using(auth.uid() is not null and user_id=auth.uid() and exists(select 1 from mir_core.memberships m where(m.organization_id,m.user_id)=(notifications.organization_id,auth.uid()) and m.active));
drop policy if exists notification_preferences_own_read on mir_core.notification_preferences;
create policy notification_preferences_own_read on mir_core.notification_preferences for select to authenticated
 using(auth.uid() is not null and user_id=auth.uid() and exists(select 1 from mir_core.memberships m where(m.organization_id,m.user_id)=(notification_preferences.organization_id,auth.uid()) and m.active));

create or replace function mir_core.notification_module(kind text,route jsonb) returns text
language sql immutable set search_path=pg_catalog as $$
 select case
  when kind in('message') then 'chat'
  when kind in('absence','hr_request','hr_decision') then 'absences'
  when kind like 'expense%' then 'expenses'
  when kind like 'punch%' or kind like 'time_%' then 'punch'
  when kind in('material_request','delivery_issue','order','order_update') then 'orders'
  when kind like 'fold%' then 'folds'
  when kind in('field_issue','daily_report','extra','job_assignment','team_change') then 'jobs'
  when kind like 'inventory%' then 'inventory'
  else 'support' end
$$;

create or replace function mir_core.notification_legacy_normalize() returns trigger
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare e uuid;key text;mod text;prio text;
begin
 mod:=mir_core.notification_module(new.kind,new.route);
 prio:=case when new.kind in('field_issue','inventory_critical') then 'urgent' when new.kind in('hr_request','delivery_issue','punch_correction','material_request') then 'action_required' else 'information' end;
 if new.entity_id is not null and new.kind in('hr_decision','expense_approved','expense_refused','expense_needs_correction','punch_correction_decision','job_assignment') then
  update mir_core.notifications set treated_at=coalesce(treated_at,now()),updated_at=now() where organization_id=new.organization_id and entity_id=new.entity_id and action_required and treated_at is null;
 end if;
 key:=new.organization_id||':legacy:'||new.kind||':'||coalesce(new.entity_id::text,new.id::text)||':'||new.user_id;
 insert into mir_core.notification_events(organization_id,event_key,module,event_type,entity_id,actor_id,title,summary,priority,route,metadata,occurred_at)
 values(new.organization_id,key,mod,new.kind,new.entity_id,auth.uid(),new.title,'',prio,new.route,'{}',new.created_at)
 on conflict(organization_id,event_key) do nothing returning id into e;
 if e is null then select id into e from mir_core.notification_events where organization_id=new.organization_id and event_key=key;end if;
 new.event_id:=coalesce(new.event_id,e);new.module:=mod;new.priority:=prio;new.action_required:=prio in('action_required','urgent');new.updated_at:=now();
 return new;
end $$;
drop trigger if exists notification_legacy_normalize on mir_core.notifications;
create trigger notification_legacy_normalize before insert on mir_core.notifications for each row when(new.event_id is null) execute function mir_core.notification_legacy_normalize();

create or replace function mir_core.notification_immutable() returns trigger
language plpgsql set search_path=pg_catalog as $$begin raise exception 'Événement de notification immuable' using errcode='42501';end$$;
drop trigger if exists notification_events_immutable on mir_core.notification_events;
create trigger notification_events_immutable before update or delete on mir_core.notification_events for each row execute function mir_core.notification_immutable();

create or replace function mir_core.notification_emit(
 org uuid,p_event_key text,module text,event_type text,entity uuid,actor uuid,title text,summary text,priority text,route jsonb,recipient_rule text,p_owner_id uuid default null,p_job_id uuid default null,metadata jsonb default '{}'
) returns uuid language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare eid uuid;target uuid;essential boolean:=priority in('action_required','urgent');
begin
 if actor is null or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=actor and active) or(auth.uid() is not null and actor is distinct from auth.uid()) then raise exception 'Émetteur MIR refusé' using errcode='42501';end if;
 if module not in('orders','folds','absences','expenses','punch','jobs','chat','support','inventory') or priority not in('information','action_required','urgent') or length(p_event_key) not between 8 and 240 then raise exception 'Événement invalide' using errcode='22023';end if;
 insert into mir_core.notification_events(organization_id,event_key,module,event_type,entity_id,actor_id,title,summary,priority,route,metadata)
 values(org,p_event_key,module,event_type,entity,actor,left(title,160),left(coalesce(summary,''),400),priority,coalesce(route,'{}'),coalesce(metadata,'{}'))
 on conflict(organization_id,event_key) do nothing returning id into eid;
 if eid is null then select ne.id into eid from mir_core.notification_events ne where ne.organization_id=org and ne.event_key=p_event_key;end if;
 for target in
  select distinct m.user_id from mir_core.memberships m
  left join mir_core.staff_capabilities s on(s.organization_id,s.user_id)=(m.organization_id,m.user_id) and s.active
  where m.organization_id=org and m.active and(
   (recipient_rule='owner' and m.user_id=p_owner_id) or
   (recipient_rule='owner_management' and(m.user_id=p_owner_id or s.staff_role in('assistant','boss') or m.role='admin')) or
   (recipient_rule='warehouse' and(s.staff_role='warehouse' or m.role='admin')) or
   (recipient_rule='management' and(s.staff_role in('assistant','boss') or m.role='admin')) or
   (recipient_rule='boss_admin' and(s.staff_role='boss' or m.role='admin')) or
   (recipient_rule='job_team' and(p_job_id is not null and(m.user_id=p_owner_id or s.staff_role in('assistant','boss') or m.role='admin' or exists(select 1 from mir_core.job_memberships a where a.organization_id=org and a.job_id=p_job_id and a.user_id=m.user_id))))
  )
 loop
  if essential or coalesce((select p.enabled from mir_core.notification_preferences p where(p.organization_id,p.user_id,p.category)=(org,target,module)),true) then
   insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id,event_id,summary,module,priority,action_required)
   values(org,target,event_type,left(title,240),route,entity,eid,left(coalesce(summary,''),400),module,priority,essential)
   on conflict(organization_id,event_id,user_id) where event_id is not null do nothing;
  end if;
 end loop;
 return eid;
end $$;

create or replace function public.mir_notification_center(org uuid,filter_name text default 'all',page_size integer default 30,page_before timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();lim integer:=least(greatest(coalesce(page_size,30),1),50);role_name text;items jsonb;unread integer;actions integer;
begin
 select mir_core.operational_role(org,uid) into role_name;
 if uid is null or role_name is null or filter_name not in('all','today','unread','actions') then raise exception 'Accès notifications refusé' using errcode='42501';end if;
 select count(*) filter(where read_at is null),count(*) filter(where action_required and treated_at is null) into unread,actions from mir_core.notifications where organization_id=org and user_id=uid;
 select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]') into items from(
  select n.created_at,n.id,jsonb_build_object('id',n.id,'eventId',n.event_id,'module',n.module,'type',n.kind,'title',n.title,'summary',n.summary,'priority',n.priority,'route',n.route,'entityId',n.entity_id,'createdAt',n.created_at,'readAt',n.read_at,'treatedAt',n.treated_at,'actionRequired',n.action_required) row_data
  from mir_core.notifications n where n.organization_id=org and n.user_id=uid and(page_before is null or n.created_at<page_before)
   and(filter_name='all' or(filter_name='today' and n.created_at>=current_date)or(filter_name='unread' and n.read_at is null)or(filter_name='actions' and n.action_required and n.treated_at is null))
  order by n.created_at desc,n.id desc limit lim
 )q;
 return jsonb_build_object('role',role_name,'filter',filter_name,'items',items,'unreadCount',unread,'actionCount',actions,'nextBefore',case when jsonb_array_length(items)=lim then(items->(lim-1)->>'createdAt')::timestamptz end,'serverAt',now());
end $$;

create or replace function public.mir_notification_state(org uuid,request_id uuid,notification_ids uuid[],action text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();changed integer;
begin
 if uid is null or request_id is null or action not in('read','unread') or coalesce(array_length(notification_ids,1),0) not between 1 and 100 or mir_core.operational_role(org,uid) is null then raise exception 'Action notification refusée' using errcode='42501';end if;
 update mir_core.notifications set read_at=case when action='read' then coalesce(read_at,now()) else null end,updated_at=now() where organization_id=org and user_id=uid and id=any(notification_ids);
 get diagnostics changed=row_count;
 if changed<>array_length(notification_ids,1) then raise exception 'Notification absente ou interdite' using errcode='42501';end if;
 return jsonb_build_object('ok',true,'changed',changed,'action',action,'unreadCount',(select count(*) from mir_core.notifications where organization_id=org and user_id=uid and read_at is null),'receiptId',request_id);
end $$;

create or replace function public.mir_notification_preferences(org uuid,changes jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();entry record;
begin
 if uid is null or mir_core.operational_role(org,uid) is null or(changes is not null and jsonb_typeof(changes)<>'object') then raise exception 'Préférences refusées' using errcode='42501';end if;
 if changes is not null then
  for entry in select key,value from jsonb_each(changes) loop
   if entry.key not in('orders','folds','absences','expenses','punch','jobs','chat','support','inventory') or jsonb_typeof(entry.value)<>'boolean' then raise exception 'Préférence invalide' using errcode='22023';end if;
   insert into mir_core.notification_preferences(organization_id,user_id,category,enabled) values(org,uid,entry.key,(entry.value::text)::boolean)
   on conflict(organization_id,user_id,category) do update set enabled=excluded.enabled,updated_at=now();
  end loop;
 end if;
 return jsonb_build_object('categories',(select jsonb_object_agg(c.category,coalesce(p.enabled,true)) from( select unnest(array['orders','folds','absences','expenses','punch','jobs','chat','support','inventory']) category)c left join mir_core.notification_preferences p on(p.organization_id,p.user_id,p.category)=(org,uid,c.category)),'mandatory',jsonb_build_array('urgent','action_required'),'email',false,'push',false);
end $$;

create or replace function mir_core.notification_order_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare owner uuid;module text:='orders';title text;prio text:='information';rule text:='owner';route jsonb;
begin
 if new.event_type='draft-saved' then return new;end if;
 select o.owner_id into owner from mir_core.orders o where(o.organization_id,o.id)=(new.organization_id,new.order_id);
 title:=case new.event_type when 'request-submitted' then 'Nouvelle commande à traiter' when 'job-linked' then 'Commande rattachée au chantier' else 'Mise à jour de commande' end;
 if new.event_type='request-submitted' then prio:='action_required';rule:='management';end if;
 route:=jsonb_build_object('view',case when rule='management' then 'management-files' else 'orders' end,'orderId',new.order_id);
 if new.event_type='job-linked' then update mir_core.notifications set treated_at=coalesce(treated_at,now()),updated_at=now() where organization_id=new.organization_id and entity_id=new.order_id and action_required and treated_at is null;end if;
 perform mir_core.notification_emit(new.organization_id,new.organization_id||':order:'||new.id,module,new.event_type,new.order_id,new.actor_id,title,'Ouvrez la commande pour consulter son état.',prio,route,rule,owner,null,jsonb_build_object('orderEventId',new.id));
 return new;
end $$;
drop trigger if exists notification_order_event on mir_core.order_events;
create trigger notification_order_event after insert on mir_core.order_events for each row execute function mir_core.notification_order_event();

revoke all on function mir_core.notification_module(text,jsonb),mir_core.notification_emit(uuid,text,text,text,uuid,uuid,text,text,text,jsonb,text,uuid,uuid,jsonb),public.mir_notification_center(uuid,text,integer,timestamptz),public.mir_notification_state(uuid,uuid,uuid[],text),public.mir_notification_preferences(uuid,jsonb) from public,anon;
revoke all on function public.mir_notification_center(uuid,text,integer,timestamptz),public.mir_notification_state(uuid,uuid,uuid[],text),public.mir_notification_preferences(uuid,jsonb) from authenticated;
grant execute on function public.mir_notification_center(uuid,text,integer,timestamptz),public.mir_notification_state(uuid,uuid,uuid[],text),public.mir_notification_preferences(uuid,jsonb) to authenticated;

comment on table mir_core.notification_events is 'Phase 7: événements métier immuables, minimaux et sans transport externe.';
comment on table mir_core.notifications is 'Destinataires et état individuel du centre interne; aucune source métier dupliquée.';
comment on table mir_core.notification_preferences is 'Préférences internes non essentielles par utilisateur et organisation.';
commit;
