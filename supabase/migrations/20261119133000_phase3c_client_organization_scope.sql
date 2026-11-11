-- Phase 3C: derive the client organization from the authenticated membership.
begin;

create or replace function public.mir_client_center_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;org_count integer;
begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501';end if;
 select (array_agg(distinct organization_id))[1],count(distinct organization_id) into org,org_count from mir_core.memberships where user_id=uid and active and role='client';
 if org_count<>1 then raise exception 'Organisation client invalide' using errcode='42501';end if;
 return jsonb_build_object('organizationId',org,'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'subject',c.subject,'category',c.category,'status',c.status,'assignedTo',c.assigned_to,'updatedAt',c.updated_at,'unread',c.unread_customer,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'senderId',m.sender_id,'body',m.body,'createdAt',m.created_at,'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'path',a.storage_path)) from mir_core.support_attachments a where(a.organization_id,a.message_id)=(m.organization_id,m.id)),'[]'::jsonb)) order by m.created_at) from mir_core.support_messages m where m.organization_id=org and m.conversation_id=c.id and not m.internal_note),'[]'::jsonb)) order by c.updated_at desc) from mir_core.support_conversations c where c.organization_id=org and c.customer_id=uid),'[]'::jsonb));
end$fn$;

create or replace function public.mir_client_support_action(action text,conversation uuid default null,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;org_count integer;cid uuid:=conversation;mid uuid;body text:=btrim(coalesce(payload->>'body',''));rid uuid:=nullif(payload->>'requestId','')::uuid;
begin
 if uid is null or jsonb_typeof(payload)<>'object' then raise exception 'Connexion requise' using errcode='42501';end if;
 select (array_agg(distinct organization_id))[1],count(distinct organization_id) into org,org_count from mir_core.memberships where user_id=uid and active and role='client';
 if org_count<>1 then raise exception 'Organisation client invalide' using errcode='42501';end if;
 if action in('create','message') and rid is null then raise exception 'Identifiant de requête requis' using errcode='22023';end if;
 if action='create' then
  select id into cid from mir_core.support_conversations where organization_id=org and customer_id=uid and client_request_id=rid;
  if found then select id into mid from mir_core.support_messages where organization_id=org and conversation_id=cid and sender_id=uid and client_request_id=rid;return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid,'replayed',true);end if;
  cid:=gen_random_uuid();
  if coalesce(payload->>'category','') not in('order','product','estimate','bending','account','other') or length(btrim(coalesce(payload->>'subject',''))) not between 3 and 180 or length(body) not between 1 and 4000 then raise exception 'Demande invalide' using errcode='22023';end if;
  insert into mir_core.support_conversations(organization_id,id,customer_id,subject,category,related_order_id,related_project_id,unread_staff,client_request_id) values(org,cid,uid,btrim(payload->>'subject'),payload->>'category',nullif(payload->>'orderId','')::uuid,nullif(payload->>'projectId','')::uuid,1,rid);
 elsif action='message' then
  select id into mid from mir_core.support_messages where organization_id=org and sender_id=uid and client_request_id=rid;if found then return jsonb_build_object('ok',true,'organizationId',org,'conversationId',conversation,'messageId',mid,'replayed',true);end if;cid:=conversation;
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or length(body) not between 1 and 4000 then raise exception 'Conversation invalide' using errcode='42501';end if;update mir_core.support_conversations set status='waiting',unread_staff=unread_staff+1,updated_at=now() where organization_id=org and id=cid;
 elsif action='attachment' then cid:=conversation;
  if not exists(select 1 from mir_core.support_conversations where organization_id=org and id=cid and customer_id=uid) or not exists(select 1 from mir_core.support_messages where organization_id=org and conversation_id=cid and id=(payload->>'messageId')::uuid and sender_id=uid) or payload->>'path' !~ ('^'||org::text||'/'||cid::text||'/'||uid::text||'/[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$') or coalesce(payload->>'mimeType','') not in('image/jpeg','image/png','image/webp','application/pdf') or coalesce((payload->>'sizeBytes')::integer,0) not between 1 and 15728640 then raise exception 'Pièce jointe invalide' using errcode='22023';end if;
  insert into mir_core.support_attachments(organization_id,conversation_id,message_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values(org,cid,(payload->>'messageId')::uuid,payload->>'path',left(payload->>'fileName',240),payload->>'mimeType',(payload->>'sizeBytes')::integer,uid);return jsonb_build_object('ok',true);
 elsif action='read' then update mir_core.support_conversations set unread_customer=0 where organization_id=org and id=conversation and customer_id=uid;return jsonb_build_object('ok',found);
 else raise exception 'Action invalide' using errcode='22023';end if;
 insert into mir_core.support_messages(organization_id,conversation_id,sender_id,body,client_request_id) values(org,cid,uid,body,rid) returning id into mid;
 insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id) select org,s.user_id,'support_message','Nouvelle demande client',jsonb_build_object('view','support-center','conversationId',cid),cid from mir_core.staff_capabilities s where s.organization_id=org and s.active and s.staff_role='assistant';
 return jsonb_build_object('ok',true,'organizationId',org,'conversationId',cid,'messageId',mid,'replayed',false);
end$fn$;

create or replace function public.mir_help_faq() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
declare uid uuid:=auth.uid();org uuid;audience text[]:=array['public'];role_name text;org_count integer;
begin
 if uid is null then select organization_id into org from mir_core.account_settings where singleton;
 else
  select (array_agg(distinct organization_id))[1],count(distinct organization_id),(array_agg(role order by role))[1] into org,org_count,role_name from mir_core.memberships where user_id=uid and active;
  if org_count<>1 then raise exception 'Organisation active ambiguë' using errcode='42501';end if;
  if role_name='client' then audience:=array['public','client'];else role_name:=coalesce(mir_core.staff_role(org,uid),role_name);audience:=array['public','staff',role_name];end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'slug',f.slug,'category',f.category,'kind',f.content_kind,'question',f.question,'answer',f.answer) order by f.category,f.position,f.question) from mir_core.help_faq f where f.organization_id=org and f.published and f.audience_roles&&audience),'[]'::jsonb);
end$fn$;

revoke all on function public.mir_client_center_snapshot() from public;
revoke all on function public.mir_client_support_action(text,uuid,jsonb) from public;
grant execute on function public.mir_client_center_snapshot() to authenticated;
grant execute on function public.mir_client_support_action(text,uuid,jsonb) to authenticated;
commit;
