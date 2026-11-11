-- Phase 3C: reconcile the existing TEST help/support module, then harden it.
-- This migration intentionally fails when the audited module is absent or incompatible.
begin;
do $preflight$
begin
 if to_regclass('mir_core.help_faq') is null or to_regclass('mir_core.support_conversations') is null
  or to_regclass('mir_core.support_messages') is null or to_regclass('mir_core.support_attachments') is null
  or to_regprocedure('public.mir_help_faq()') is null
  or to_regprocedure('public.mir_client_support_action(text,uuid,jsonb)') is null
  or to_regprocedure('public.mir_support_management_action(uuid,text,uuid,jsonb)') is null then
  raise exception 'Phase 3C audited backend is absent or incomplete' using errcode='55000';
 end if;
 if exists(select 1 from information_schema.columns where table_schema='mir_core' and table_name='help_faq' and column_name in('audience_roles','content_kind'))
  or exists(select 1 from information_schema.columns where table_schema='mir_core' and table_name in('support_conversations','support_messages') and column_name='client_request_id') then
  raise exception 'Phase 3C hardening columns already exist; inspect before applying' using errcode='55000';
 end if;
end$preflight$;

alter table mir_core.help_faq add column audience_roles text[] not null default array['public','client','staff'];
alter table mir_core.help_faq add column content_kind text not null default 'faq' check(content_kind in('faq','procedure'));
alter table mir_core.help_faq add constraint help_faq_audience_roles_valid check(
 cardinality(audience_roles) between 1 and 8 and audience_roles <@ array['public','client','staff','assistant','boss','admin','warehouse','chef_equipe','employe']::text[]);
alter table mir_core.support_conversations add column client_request_id uuid;
alter table mir_core.support_messages add column client_request_id uuid;
create unique index support_conversations_request_unique on mir_core.support_conversations(organization_id,customer_id,client_request_id) where client_request_id is not null;
create unique index support_messages_request_unique on mir_core.support_messages(organization_id,sender_id,client_request_id) where client_request_id is not null;

create or replace function public.mir_help_faq() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;audience text[]:=array['public'];role_name text;
begin
 select organization_id into org from mir_core.account_settings where singleton;
 if uid is not null and exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and active) then
  select role into role_name from mir_core.memberships where organization_id=org and user_id=uid and active;
  if role_name='client' then audience:=array['public','client'];
  else role_name:=coalesce(mir_core.staff_role(org,uid),role_name);audience:=array['public','staff',role_name];end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'slug',f.slug,'category',f.category,'kind',f.content_kind,'question',f.question,'answer',f.answer) order by f.category,f.position,f.question)
  from mir_core.help_faq f where f.organization_id=org and f.published and f.audience_roles&&audience),'[]'::jsonb);
end$fn$;

create or replace function public.mir_client_support_action(action text,conversation uuid default null,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;cid uuid:=coalesce(conversation,gen_random_uuid());mid uuid;body text:=btrim(coalesce(payload->>'body',''));rid uuid:=nullif(payload->>'requestId','')::uuid;
begin
 if uid is null or jsonb_typeof(payload)<>'object' then raise exception 'Connexion requise' using errcode='42501';end if;
 select organization_id into org from mir_core.account_settings where singleton;
 if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and active and role='client') then raise exception 'Compte client requis' using errcode='42501';end if;
 if action in('create','message') and rid is null then raise exception 'Identifiant de requête requis' using errcode='22023';end if;
 if action='create' then
  select id into cid from mir_core.support_conversations where organization_id=org and customer_id=uid and client_request_id=rid;
  if found then select id into mid from mir_core.support_messages where organization_id=org and conversation_id=cid and sender_id=uid and client_request_id=rid;return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid,'replayed',true);end if;
  if coalesce(payload->>'category','') not in('order','product','estimate','bending','account','other') or length(btrim(coalesce(payload->>'subject',''))) not between 3 and 180 or length(body) not between 1 and 4000 then raise exception 'Demande invalide' using errcode='22023';end if;
  insert into mir_core.support_conversations(organization_id,id,customer_id,subject,category,related_order_id,related_project_id,unread_staff,client_request_id) values(org,cid,uid,btrim(payload->>'subject'),payload->>'category',nullif(payload->>'orderId','')::uuid,nullif(payload->>'projectId','')::uuid,1,rid);
 elsif action='message' then
  select id into mid from mir_core.support_messages where organization_id=org and sender_id=uid and client_request_id=rid;
  if found then return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid,'replayed',true);end if;
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or length(body) not between 1 and 4000 then raise exception 'Conversation invalide' using errcode='42501';end if;
  update mir_core.support_conversations set status='waiting',unread_staff=unread_staff+1,updated_at=now() where organization_id=org and id=cid;
 elsif action='attachment' then
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or not exists(select 1 from mir_core.support_messages where organization_id=org and conversation_id=cid and id=(payload->>'messageId')::uuid and sender_id=uid)
   or payload->>'path' !~ ('^'||org::text||'/'||cid::text||'/'||uid::text||'/[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$') or coalesce(payload->>'mimeType','') not in('image/jpeg','image/png','image/webp','application/pdf') or coalesce((payload->>'sizeBytes')::integer,0) not between 1 and 15728640 then raise exception 'Pièce jointe invalide' using errcode='22023';end if;
  insert into mir_core.support_attachments(organization_id,conversation_id,message_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values(org,cid,(payload->>'messageId')::uuid,payload->>'path',left(payload->>'fileName',240),payload->>'mimeType',(payload->>'sizeBytes')::integer,uid);return jsonb_build_object('ok',true);
 elsif action='read' then update mir_core.support_conversations set unread_customer=0 where organization_id=org and id=cid and customer_id=uid;return jsonb_build_object('ok',found);
 else raise exception 'Action invalide' using errcode='22023';end if;
 insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body,client_request_id) values(org,cid,uid,body,rid) returning id into mid;
 insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) select org,s.user_id,'support_message','Nouvelle demande client',jsonb_build_object('view','support-center','conversationId',cid),cid from mir_core.staff_capabilities s where s.organization_id=org and s.active and s.staff_role='assistant';
 return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid,'replayed',false);
end$fn$;

create or replace function public.mir_support_management_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare role_name text:=mir_core.staff_role(org);
begin
 if role_name not in('assistant','boss','admin','warehouse') then raise exception 'Accès support refusé' using errcode='42501';end if;
 return jsonb_build_object('role',role_name,'faq',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'slug',f.slug,'category',f.category,'kind',f.content_kind,'question',f.question,'answer',f.answer,'published',f.published,'audienceRoles',f.audience_roles,'position',f.position) order by f.category,f.position) from mir_core.help_faq f where f.organization_id=org),'[]'::jsonb),'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'customerId',c.customer_id,'subject',c.subject,'category',c.category,'status',c.status,'assignedTo',c.assigned_to,'updatedAt',c.updated_at,'unread',c.unread_staff,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'internal',m.internal_note,'createdAt',m.created_at,'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'path',a.storage_path)) from mir_core.support_attachments a where(a.organization_id,a.message_id)=(m.organization_id,m.id)),'[]'::jsonb)) order by m.created_at) from mir_core.support_messages m where(m.organization_id,m.conversation_id)=(c.organization_id,c.id)),'[]'::jsonb)) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and(role_name<>'warehouse' or c.assigned_to=auth.uid())),'[]'::jsonb));
end$fn$;

create or replace function public.mir_support_management_action(org uuid,action text,entity uuid default null,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $fn$
declare role_name text:=mir_core.staff_role(org);uid uuid:=auth.uid();mid uuid;assignee uuid;
begin
 if role_name not in('assistant','boss','admin','warehouse') or jsonb_typeof(payload)<>'object' then raise exception 'Accès support refusé' using errcode='42501';end if;
 if action in('faq_save','faq_hide','faq_publish') then
  if role_name not in('assistant','boss','admin') then raise exception 'Gestion FAQ refusée' using errcode='42501';end if;
  if action='faq_save' then insert into mir_core.help_faq(organization_id,id,slug,category,question,answer,position,published,updated_by,audience_roles,content_kind) values(org,coalesce(entity,gen_random_uuid()),payload->>'slug',payload->>'category',payload->>'question',payload->>'answer',coalesce((payload->>'position')::integer,0),coalesce((payload->>'published')::boolean,true),uid,coalesce(array(select jsonb_array_elements_text(payload->'audienceRoles')),array['public','client','staff']),coalesce(payload->>'kind','faq')) on conflict(organization_id,id) do update set slug=excluded.slug,category=excluded.category,question=excluded.question,answer=excluded.answer,position=excluded.position,published=excluded.published,updated_by=uid,updated_at=now(),audience_roles=excluded.audience_roles,content_kind=excluded.content_kind;
  else update mir_core.help_faq set published=(action='faq_publish'),updated_by=uid,updated_at=now() where organization_id=org and id=entity;end if;
 elsif action in('reply','note') then
  if not mir_core.support_allowed(org,entity,uid) or length(btrim(coalesce(payload->>'body',''))) not between 1 and 4000 then raise exception 'Message invalide' using errcode='22023';end if;
  insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body,internal_note,client_request_id) values(org,entity,uid,btrim(payload->>'body'),action='note',nullif(payload->>'requestId','')::uuid) on conflict(organization_id,sender_id,client_request_id) where client_request_id is not null do nothing returning id into mid;
  update mir_core.support_conversations set status=case when action='reply' then 'answered' else status end,unread_customer=unread_customer+case when action='reply' then 1 else 0 end,unread_staff=0,updated_at=now() where organization_id=org and id=entity;
 elsif action='assign' then
  if role_name not in('assistant','boss','admin') then raise exception 'Assignation refusée' using errcode='42501';end if;assignee:=(payload->>'assigneeId')::uuid;
  if not mir_core.support_staff(org,assignee) then raise exception 'Assignation invalide' using errcode='22023';end if;
  update mir_core.support_conversations set assigned_to=assignee,updated_at=now() where organization_id=org and id=entity;
 elsif action='status' then update mir_core.support_conversations set status=payload->>'status',updated_at=now() where organization_id=org and id=entity and(payload->>'status') in('waiting','answered','resolved');
 else raise exception 'Action invalide' using errcode='22023';end if;
 return jsonb_build_object('ok',true,'messageId',mid);
end$fn$;

create or replace function public.mir_client_center_snapshot() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;
begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501';end if;select organization_id into org from mir_core.account_settings where singleton;
 if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=uid and active and role='client') then raise exception 'Compte client requis' using errcode='42501';end if;
 return jsonb_build_object('conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'subject',c.subject,'category',c.category,'status',c.status,'assignedTo',c.assigned_to,'updatedAt',c.updated_at,'unread',c.unread_customer,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'createdAt',m.created_at,'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'path',a.storage_path)) from mir_core.support_attachments a where(a.organization_id,a.message_id)=(m.organization_id,m.id)),'[]'::jsonb)) order by m.created_at) from mir_core.support_messages m where m.organization_id=org and m.conversation_id=c.id and not m.internal_note),'[]'::jsonb)) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and c.customer_id=uid),'[]'::jsonb));
end$fn$;

revoke all on function public.mir_help_faq(),public.mir_client_center_snapshot(),public.mir_client_support_action(text,uuid,jsonb),public.mir_support_management_snapshot(uuid),public.mir_support_management_action(uuid,text,uuid,jsonb) from public;
grant execute on function public.mir_help_faq() to anon,authenticated;
grant execute on function public.mir_client_center_snapshot(),public.mir_client_support_action(text,uuid,jsonb),public.mir_support_management_snapshot(uuid),public.mir_support_management_action(uuid,text,uuid,jsonb) to authenticated;
commit;
