-- MIR TEST compatibility: Storage authorizes an INSERT before uploading bytes.
-- The provisional row may have no metadata (Storage v1.29.3) or contentLength,
-- not final size (newer Storage). This is NOT MIME/content validation.
-- SELECT and mir_message_attachment_validate retain the strict final validator.
begin;
do $migration$
declare signature text:='mir_core.chat_storage_upload(text,uuid,text,jsonb)';marker text;fingerprint text;
begin
 perform pg_advisory_xact_lock(hashtextextended('mir-chat-phase3a-storage-upload-probe-v1',0));
 if to_regprocedure('mir_core.chat_phase3a_catalog()') is null or not exists(
  select 1 from pg_attribute where attrelid='mir_core.conversations'::regclass and attname='job_id'
  and col_description(attrelid,attnum)='MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog()) then
  raise exception 'Catalogue Phase3A absent ou incompatible' using errcode='55000';end if;
 if to_regprocedure(signature) is not null then
  select obj_description(oid,'pg_proc'),md5(pg_get_functiondef(oid)||coalesce(proacl::text,'')||
   (select with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname='mir_chat_phase3a_insert'))
   into marker,fingerprint from pg_proc where oid=to_regprocedure(signature);
  if marker is distinct from 'MIR chat upload probe v1:'||fingerprint then
   raise exception 'Correctif Storage partiel ou incompatible' using errcode='55000';end if;
  return;
 end if;
 if not exists(select 1 from pg_proc where oid='mir_core.chat_storage_object(text,uuid,text,jsonb)'::regprocedure
  and md5(prosrc)='5abf42b269453e7c88ff2a1507df8e89' and not prosecdef and proconfig=array['search_path=pg_catalog'])
  or not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
   and policyname='mir_chat_phase3a_insert' and cmd='INSERT' and permissive='RESTRICTIVE'
   and roles=array['authenticated']::name[] and md5(with_check)='a2fdd937cb0cfd9e5c282ab9ef205baf') then
  raise exception 'Validateur ou policy Storage inattendu' using errcode='55000';end if;
 execute $install$
create function mir_core.chat_storage_upload(path text,object_owner uuid,owner_id text,metadata jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $fn$
declare extension text:=split_part(split_part(path,'/',5),'.',2);probe jsonb;
begin
 -- Authorization probe only. The existing strict validator still checks canonical
 -- org/conversation/owner/filename syntax. No provisional object can be attached
 -- or read: both those paths require final metadata with a real positive size.
 if metadata is null or metadata='{}'::jsonb then
  probe:=jsonb_build_object('size',1,'mimetype',case extension
   when 'jpg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp'
   when 'heic' then 'image/heic' when 'heif' then 'image/heif' end);
 else
  probe:=case when not metadata?'size' and metadata?'contentLength'
   then metadata||jsonb_build_object('size',metadata->'contentLength') else metadata end;
 end if;
 return mir_core.chat_storage_object(path,object_owner,owner_id,probe);
end$fn$;
revoke all on function mir_core.chat_storage_upload(text,uuid,text,jsonb) from public,anon;
grant execute on function mir_core.chat_storage_upload(text,uuid,text,jsonb) to authenticated;
alter policy mir_chat_phase3a_insert on storage.objects with check(
 case when bucket_id='mir-internal' and split_part(name,'/',2)='message' then
  mir_core.chat_attachment_writable(name) and mir_core.chat_storage_upload(name,owner,owner_id,metadata)
 else true end);
$install$;
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant execute on function mir_core.chat_storage_upload(text,uuid,text,jsonb) to service_role;end if;
 select md5(pg_get_functiondef(oid)||coalesce(proacl::text,'')||
  (select with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname='mir_chat_phase3a_insert'))
  into fingerprint from pg_proc where oid=to_regprocedure(signature);
 execute format('comment on function %s is %L',signature,'MIR chat upload probe v1:'||fingerprint);
 -- Explicitly acknowledge this verified additive catalog evolution. The original
 -- guarded migration remains repeatable and still refuses unrelated drift.
 execute format('comment on column mir_core.conversations.job_id is %L','MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog());
end$migration$;
commit;
