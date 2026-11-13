-- Private employee attachments and messaging projection.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mir-internal','mir-internal',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function mir_core.internal_object_allowed(object_name text,writing boolean default false) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$declare parts text[];org uuid;scope text;entity uuid;owner uuid;begin
 parts:=storage.foldername(object_name);if cardinality(parts)<>4 then return false;end if;
 begin org:=parts[1]::uuid;entity:=parts[3]::uuid;owner:=parts[4]::uuid;exception when others then return false;end;
 scope:=parts[2];if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=auth.uid() and active and role in ('admin','employee')) or(writing and owner<>auth.uid()) then return false;end if;
 if scope='message' then return mir_core.conversation_allowed(org,entity);end if;
 if scope in ('extra','issue','receipt') then return mir_core.job_allowed(org,entity);end if;
 return false;
end$$;
revoke all on function mir_core.internal_object_allowed(text,boolean) from public,anon;
grant execute on function mir_core.internal_object_allowed(text,boolean) to authenticated;

create policy mir_internal_insert on storage.objects for insert to authenticated
 with check(bucket_id='mir-internal' and mir_core.internal_object_allowed(name,true));
create policy mir_internal_select on storage.objects for select to authenticated
 using(bucket_id='mir-internal' and mir_core.internal_object_allowed(name,false));
create policy mir_internal_delete on storage.objects for delete to authenticated
 using(bucket_id='mir-internal' and mir_core.internal_object_allowed(name,true));

create function public.mir_messaging_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare role_name text:=mir_core.staff_role(org);begin
 if role_name is null and not mir_core.has_role(org,array['admin']) then raise exception 'Accès interne requis' using errcode='42501';end if;
 return jsonb_build_object(
  'contacts',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(nullif(p.display_name,''),p.user_id::text),'role',p.staff_role) order by p.display_name) from mir_core.staff_capabilities p where p.organization_id=org and p.active and p.user_id<>auth.uid()),'[]'),
  'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'leaderId',t.leader_id)) from mir_core.teams t where t.organization_id=org and t.active and (mir_core.has_role(org,array['admin']) or exists(select 1 from mir_core.team_members x where x.organization_id=org and x.team_id=t.id and x.user_id=auth.uid() and x.active))),'[]'),
  'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'teamId',c.team_id,'participants',(select jsonb_agg(p.user_id) from mir_core.conversation_participants p where p.organization_id=org and p.conversation_id=c.id and p.active),'unread',(select count(*) from mir_core.message_receipts r join mir_core.messages m on(m.organization_id,m.id)=(r.organization_id,r.message_id) where r.organization_id=org and r.user_id=auth.uid() and r.read_at is null and m.conversation_id=c.id))) from mir_core.conversations c where c.organization_id=org and mir_core.conversation_allowed(org,c.id)),'[]'),
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversationId',m.conversation_id,'senderId',m.sender_id,'body',m.body,'jobId',m.job_id,'planDocumentId',m.plan_document_id,'attachmentPath',m.attachment_path,'sentAt',m.sent_at,'deliveredCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id and r.delivered_at is not null),'readCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id and r.read_at is not null),'recipientCount',(select count(*) from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id),'myReadAt',(select r.read_at from mir_core.message_receipts r where r.organization_id=org and r.message_id=m.id and r.user_id=auth.uid())) order by m.sent_at) from mir_core.messages m where m.organization_id=org and mir_core.conversation_allowed(org,m.conversation_id)),'[]'));
end$$;
revoke all on function public.mir_messaging_snapshot(uuid) from public,anon;
grant execute on function public.mir_messaging_snapshot(uuid) to authenticated;

-- Add conversation creation to the portal command while preserving other operations.
-- The main command delegates these two cases before the existing operation router.
create function public.mir_conversation_open(org uuid,kind text,target uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$begin
 if kind='private' then return public.mir_conversation_private(org,target);end if;
 if kind='team' then return public.mir_conversation_team(org,target);end if;
 raise exception 'Conversation invalide' using errcode='22023';
end$$;
revoke all on function public.mir_conversation_open(uuid,text,uuid) from public,anon;
grant execute on function public.mir_conversation_open(uuid,text,uuid) to authenticated;
commit;
