-- Reconstructed read-only from MIR TEST migration history version 20261110142928.
-- Schema only: no account, membership, customer data, secret or fixture.
-- MIR client center: FAQ, support conversations, attachments and account appearance.
begin;

create table mir_core.account_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 theme text not null default 'auto' check(theme in('auto','light','dark','high_visibility')),
 accent text not null default 'mir_green' check(accent in('mir_green','blue','orange','graphite')),
 text_size text not null default 'normal' check(text_size in('small','normal','large','xlarge')),
 high_contrast boolean not null default false,
 reduced_motion boolean not null default false,
 language text not null default 'fr-CA' check(language in('fr-CA','en-CA')),
 units text not null default 'fractions' check(units in('fractions','decimals','millimeters')),
 notifications jsonb not null default '{"email":true,"support":true,"orders":true}' check(jsonb_typeof(notifications)='object'),
 updated_at timestamptz not null default now()
);

create table mir_core.help_faq(
 organization_id uuid not null references mir_core.organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),slug text not null,category text not null,
 question text not null check(length(btrim(question)) between 4 and 240),
 answer text not null check(length(btrim(answer)) between 4 and 6000),
 position integer not null default 0,published boolean not null default true,
 updated_by uuid references auth.users(id),updated_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,slug)
);
create index help_faq_public_order on mir_core.help_faq(organization_id,published,category,position);

create table mir_core.support_conversations(
 organization_id uuid not null references mir_core.organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),customer_id uuid not null references auth.users(id),
 subject text not null check(length(btrim(subject)) between 3 and 180),
 category text not null check(category in('order','product','estimate','bending','other')),
 related_order_id uuid,related_project_id uuid,assigned_to uuid references auth.users(id),
 status text not null default 'waiting' check(status in('waiting','answered','resolved')),
 unread_customer integer not null default 0 check(unread_customer>=0),unread_staff integer not null default 0 check(unread_staff>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(organization_id,id)
);
create index support_conversations_customer on mir_core.support_conversations(organization_id,customer_id,updated_at desc);
create index support_conversations_staff on mir_core.support_conversations(organization_id,status,assigned_to,updated_at desc);

create table mir_core.support_messages(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),conversation_id uuid not null,
 sender_id uuid not null references auth.users(id),body text not null check(length(btrim(body)) between 1 and 4000),
 internal_note boolean not null default false,created_at timestamptz not null default now(),
 primary key(organization_id,id),foreign key(organization_id,conversation_id) references mir_core.support_conversations(organization_id,id) on delete cascade
);
create index support_messages_thread on mir_core.support_messages(organization_id,conversation_id,created_at,id);

create table mir_core.support_attachments(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),conversation_id uuid not null,message_id uuid,
 storage_path text not null,file_name text not null,mime_type text not null,size_bytes integer not null check(size_bytes between 1 and 15728640),
 uploaded_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(storage_path),
 foreign key(organization_id,conversation_id) references mir_core.support_conversations(organization_id,id) on delete cascade,
 foreign key(organization_id,message_id) references mir_core.support_messages(organization_id,id) on delete cascade
);

alter table mir_core.account_preferences enable row level security;
alter table mir_core.help_faq enable row level security;
alter table mir_core.support_conversations enable row level security;
alter table mir_core.support_messages enable row level security;
alter table mir_core.support_attachments enable row level security;
revoke all on mir_core.account_preferences,mir_core.help_faq,mir_core.support_conversations,mir_core.support_messages,mir_core.support_attachments from public,anon,authenticated;

create function mir_core.support_staff(org uuid,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.staff_role(org,member) in('assistant','boss','admin','warehouse');
$$;
create function mir_core.support_allowed(org uuid,conversation uuid,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select exists(select 1 from mir_core.support_conversations c where c.organization_id=org and c.id=conversation and (c.customer_id=member or mir_core.support_staff(org,member)));
$$;
revoke all on function mir_core.support_staff(uuid,uuid),mir_core.support_allowed(uuid,uuid,uuid) from public,anon,authenticated;

create function public.mir_help_faq() returns jsonb language sql stable security definer set search_path=pg_catalog,mir_core as $$
 with cfg as(select organization_id from mir_core.account_settings where singleton)
 select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'slug',f.slug,'category',f.category,'question',f.question,'answer',f.answer) order by f.category,f.position,f.question),'[]'::jsonb)
 from mir_core.help_faq f join cfg on cfg.organization_id=f.organization_id where f.published;
$$;

create function public.mir_account_preferences() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();p mir_core.account_preferences;begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501';end if;
 insert into mir_core.account_preferences(user_id) values(uid) on conflict do nothing;select * into p from mir_core.account_preferences where user_id=uid;
 return jsonb_build_object('theme',p.theme,'accent',p.accent,'textSize',p.text_size,'highContrast',p.high_contrast,'reducedMotion',p.reduced_motion,'language',p.language,'units',p.units,'notifications',p.notifications,'updatedAt',p.updated_at);
end$$;

create function public.mir_account_preferences_save(payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();begin
 if uid is null or jsonb_typeof(payload)<>'object' then raise exception 'Préférences invalides' using errcode='22023';end if;
 insert into mir_core.account_preferences(user_id,theme,accent,text_size,high_contrast,reduced_motion,language,units,notifications)
 values(uid,coalesce(payload->>'theme','auto'),coalesce(payload->>'accent','mir_green'),coalesce(payload->>'textSize','normal'),coalesce((payload->>'highContrast')::boolean,false),coalesce((payload->>'reducedMotion')::boolean,false),coalesce(payload->>'language','fr-CA'),coalesce(payload->>'units','fractions'),coalesce(payload->'notifications','{"email":true,"support":true,"orders":true}'::jsonb))
 on conflict(user_id) do update set theme=excluded.theme,accent=excluded.accent,text_size=excluded.text_size,high_contrast=excluded.high_contrast,reduced_motion=excluded.reduced_motion,language=excluded.language,units=excluded.units,notifications=excluded.notifications,updated_at=now();
 return public.mir_account_preferences();
end$$;

create function public.mir_client_center_snapshot() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();org uuid;begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501';end if;select organization_id into org from mir_core.account_settings where singleton;
 if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and active) then raise exception 'Compte inactif' using errcode='42501';end if;
 return jsonb_build_object('conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'subject',c.subject,'category',c.category,'status',c.status,'assignedTo',c.assigned_to,'updatedAt',c.updated_at,'unread',c.unread_customer,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'createdAt',m.created_at,'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'path',a.storage_path)) from mir_core.support_attachments a where (a.organization_id,a.message_id)=(m.organization_id,m.id)),'[]'::jsonb)) order by m.created_at) from mir_core.support_messages m where m.organization_id=org and m.conversation_id=c.id and not m.internal_note),'[]'::jsonb)) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and c.customer_id=uid),'[]'::jsonb));
end$$;

create function public.mir_client_support_action(action text,conversation uuid default null,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();org uuid;cid uuid:=coalesce(conversation,gen_random_uuid());mid uuid;body text:=btrim(coalesce(payload->>'body',''));begin
 if uid is null or jsonb_typeof(payload)<>'object' then raise exception 'Connexion requise' using errcode='42501';end if;select organization_id into org from mir_core.account_settings where singleton;
 if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and active and role='client') then raise exception 'Compte client requis' using errcode='42501';end if;
 if action='create' then
  if coalesce(payload->>'category','') not in('order','product','estimate','bending','other') or length(btrim(coalesce(payload->>'subject',''))) not between 3 and 180 or length(body) not between 1 and 4000 then raise exception 'Demande invalide' using errcode='22023';end if;
  insert into mir_core.support_conversations(organization_id,id,customer_id,subject,category,related_order_id,related_project_id,unread_staff) values(org,cid,uid,btrim(payload->>'subject'),payload->>'category',nullif(payload->>'orderId','')::uuid,nullif(payload->>'projectId','')::uuid,1);
 elsif action='message' then
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or length(body) not between 1 and 4000 then raise exception 'Conversation invalide' using errcode='42501';end if;
  update mir_core.support_conversations set status='waiting',unread_staff=unread_staff+1,updated_at=now() where organization_id=org and id=cid;
 elsif action='attachment' then
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or
     not exists(select 1 from mir_core.support_messages where organization_id=org and conversation_id=cid and id=(payload->>'messageId')::uuid and sender_id=uid) or
     payload->>'path' !~ ('^'||org::text||'/'||cid::text||'/'||uid::text||'/[0-9a-f-]+\\.(jpg|jpeg|png|webp|pdf)$') or
     coalesce(payload->>'mimeType','') not in('image/jpeg','image/png','image/webp','application/pdf') or
     coalesce((payload->>'sizeBytes')::integer,0) not between 1 and 15728640 then raise exception 'Pièce jointe invalide' using errcode='22023';end if;
  insert into mir_core.support_attachments(organization_id,conversation_id,message_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values(org,cid,(payload->>'messageId')::uuid,payload->>'path',left(payload->>'fileName',240),payload->>'mimeType',(payload->>'sizeBytes')::integer,uid);
  return jsonb_build_object('ok',true);
 elsif action='read' then update mir_core.support_conversations set unread_customer=0 where organization_id=org and id=cid and customer_id=uid;return jsonb_build_object('ok',found);else raise exception 'Action invalide' using errcode='22023';end if;
 insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body) values(org,cid,uid,body) returning id into mid;
 insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) select org,s.user_id,'support_message','Nouveau message client',jsonb_build_object('view','support-center','conversationId',cid),cid from mir_core.staff_capabilities s where s.organization_id=org and s.active and s.staff_role='assistant';
 return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid);
end$$;

create function public.mir_support_management_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.staff_role(org);begin
 if role_name not in('assistant','boss','admin','warehouse') then raise exception 'Accès support refusé' using errcode='42501';end if;
 return jsonb_build_object('role',role_name,'faq',coalesce((select jsonb_agg(to_jsonb(f) order by category,position) from mir_core.help_faq f where f.organization_id=org),'[]'::jsonb),'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'customerId',c.customer_id,'subject',c.subject,'category',c.category,'status',c.status,'assignedTo',c.assigned_to,'updatedAt',c.updated_at,'unread',c.unread_staff,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'internal',m.internal_note,'createdAt',m.created_at) order by m.created_at) from mir_core.support_messages m where (m.organization_id,m.conversation_id)=(c.organization_id,c.id)),'[]'::jsonb)) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and(role_name<>'warehouse' or c.assigned_to=auth.uid())),'[]'::jsonb));
end$$;

create function public.mir_support_management_action(org uuid,action text,entity uuid default null,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.staff_role(org);uid uuid:=auth.uid();mid uuid;begin
 if role_name not in('assistant','boss','admin','warehouse') or jsonb_typeof(payload)<>'object' then raise exception 'Accès support refusé' using errcode='42501';end if;
 if action in('faq_save','faq_hide','faq_publish') then
  if role_name not in('assistant','boss','admin') then raise exception 'Gestion FAQ refusée' using errcode='42501';end if;
  if action='faq_save' then insert into mir_core.help_faq(organization_id,id,slug,category,question,answer,position,published,updated_by) values(org,coalesce(entity,gen_random_uuid()),payload->>'slug',payload->>'category',payload->>'question',payload->>'answer',coalesce((payload->>'position')::integer,0),coalesce((payload->>'published')::boolean,true),uid) on conflict(organization_id,id) do update set slug=excluded.slug,category=excluded.category,question=excluded.question,answer=excluded.answer,position=excluded.position,published=excluded.published,updated_by=uid,updated_at=now();
  else update mir_core.help_faq set published=(action='faq_publish'),updated_by=uid,updated_at=now() where organization_id=org and id=entity;end if;
 elsif action in('reply','note') then
  if not mir_core.support_allowed(org,entity,uid) or length(btrim(coalesce(payload->>'body',''))) not between 1 and 4000 then raise exception 'Message invalide' using errcode='22023';end if;
  insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body,internal_note) values(org,entity,uid,btrim(payload->>'body'),action='note') returning id into mid;
  update mir_core.support_conversations set status=case when action='reply' then 'answered' else status end,unread_customer=unread_customer+case when action='reply' then 1 else 0 end,unread_staff=0,updated_at=now() where organization_id=org and id=entity;
 elsif action='assign' then
  if role_name not in('assistant','boss','admin') or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=(payload->>'assigneeId')::uuid and active) then raise exception 'Assignation invalide' using errcode='22023';end if;update mir_core.support_conversations set assigned_to=(payload->>'assigneeId')::uuid,updated_at=now() where organization_id=org and id=entity;
 elsif action='status' then update mir_core.support_conversations set status=payload->>'status',updated_at=now() where organization_id=org and id=entity and(payload->>'status') in('waiting','answered','resolved');else raise exception 'Action invalide' using errcode='22023';end if;
 return jsonb_build_object('ok',true,'messageId',mid);
end$$;

-- Initial FAQ content is versioned separately in supabase/seed/client_center_initial_content.sql.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mir-support','mir-support',false,15728640,array['image/jpeg','image/png','image/webp','application/pdf']);
create function mir_core.support_object_allowed(object_name text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$declare parts text[];org uuid;conversation uuid;owner uuid;begin parts:=storage.foldername(object_name);if cardinality(parts)<>4 then return false;end if;begin org:=parts[1]::uuid;conversation:=parts[2]::uuid;owner:=parts[3]::uuid;exception when others then return false;end;if writing and owner<>auth.uid() then return false;end if;return mir_core.support_allowed(org,conversation);end$$;
revoke all on function mir_core.support_object_allowed(text,boolean) from public,anon,authenticated;
create policy mir_support_insert on storage.objects for insert to authenticated with check(bucket_id='mir-support' and mir_core.support_object_allowed(name,true));
create policy mir_support_select on storage.objects for select to authenticated using(bucket_id='mir-support' and mir_core.support_object_allowed(name,false));
create policy mir_support_delete on storage.objects for delete to authenticated using(bucket_id='mir-support' and mir_core.support_object_allowed(name,true));

revoke all on function public.mir_help_faq(),public.mir_account_preferences(),public.mir_account_preferences_save(jsonb),public.mir_client_center_snapshot(),public.mir_client_support_action(text,uuid,jsonb),public.mir_support_management_snapshot(uuid),public.mir_support_management_action(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mir_help_faq() to anon,authenticated;
grant execute on function public.mir_account_preferences(),public.mir_account_preferences_save(jsonb),public.mir_client_center_snapshot(),public.mir_client_support_action(text,uuid,jsonb),public.mir_support_management_snapshot(uuid),public.mir_support_management_action(uuid,text,uuid,jsonb) to authenticated;
commit;
