-- PREPARATION ONLY: no hosted application or activation authorized in this turn.
-- CLI-generated, reordered after the three Phase3A dependencies.
begin;
do $migration$
declare source text;fingerprint text;
begin
 perform pg_advisory_xact_lock(hashtextextended('mir-chat-file-gateway-v1',0));
 if to_regprocedure('mir_core.chat_phase3a_catalog()') is null or not exists(select 1 from pg_attribute
  where attrelid='mir_core.conversations'::regclass and attname='job_id'
  and col_description(attrelid,attnum)='MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog()) then
  raise exception 'Catalogue Phase3A incompatible' using errcode='55000';end if;
 if to_regclass('mir_core.chat_file_validations') is not null then
  if to_regprocedure('mir_core.chat_file_gateway_catalog()') is null then raise exception 'Passerelle fichiers partielle' using errcode='55000';end if;
  execute 'select mir_core.chat_file_gateway_catalog()' into fingerprint;
  if obj_description('mir_core.chat_file_validations'::regclass,'pg_class') is distinct from 'MIR chat files v1:'||fingerprint then
   raise exception 'Passerelle fichiers incompatible' using errcode='55000';end if;return;
 end if;
 if to_regprocedure('public.mir_chat_file_authorize(uuid,uuid,text)') is not null
  or to_regprocedure('public.mir_chat_file_upload_authorize(uuid,uuid)') is not null
  or to_regprocedure('public.mir_chat_file_record(uuid,text,text,text,uuid,text,integer,text)') is not null
  or to_regprocedure('mir_core.chat_file_object_valid(storage.objects)') is not null then
  raise exception 'RPC fichiers partielle' using errcode='55000';end if;
 create table mir_core.chat_file_validations(
  object_id uuid not null,object_version text not null,organization_id uuid not null,conversation_id uuid not null,
  owner_id uuid not null,object_path text not null,mime text not null,bytes integer not null check(bytes between 1 and 10485760),
  content_sha256 text not null check(content_sha256~'^[0-9a-f]{64}$'),
  inspector text not null check(inspector in('png-crc-inflate-v1','jpeg-signature-v1','webp-signature-v1','heif-signature-v1')),
  verified_by uuid not null,verified_at timestamptz not null default now(),primary key(object_id,object_version),
  foreign key(organization_id,conversation_id) references mir_core.conversations(organization_id,id));
 alter table mir_core.chat_file_validations enable row level security;
 revoke all on mir_core.chat_file_validations from public,anon,authenticated;
 execute $install$
-- Storage service-key uploads have no owner_id (official Storage ownership
-- contract). Only a private server attestation can bind such an object to its
-- canonical application owner. Never trust that path on its own.
create function mir_core.chat_file_object_valid(obj storage.objects) returns boolean
language plpgsql stable set search_path=pg_catalog,mir_core as $fn$
declare owner uuid;
begin
 if mir_core.chat_storage_object(obj.name,obj.owner,obj.owner_id,obj.metadata) then return true;end if;
 if obj.owner is not null or coalesce(obj.owner_id,'')<>'' then return false;end if;
 begin owner:=split_part(obj.name,'/',4)::uuid;exception when invalid_text_representation then return false;end;
 if not mir_core.chat_storage_object(obj.name,owner,owner::text,obj.metadata) then return false;end if;
 return exists(select 1 from mir_core.chat_file_validations v where v.object_id=obj.id
  and v.object_version=coalesce(to_jsonb(obj)->>'version','') and v.object_path=obj.name and v.owner_id=owner
  and v.organization_id=split_part(obj.name,'/',1)::uuid and v.conversation_id=split_part(obj.name,'/',3)::uuid
  and v.mime=obj.metadata->>'mimetype' and v.bytes=(obj.metadata->>'size')::integer);
end$fn$;
revoke all on function mir_core.chat_file_object_valid(storage.objects) from public,anon,authenticated;
create function public.mir_chat_file_upload_authorize(org uuid,conversation uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $fn$
begin
 if auth.uid() is null or not mir_core.conversation_allowed(org,conversation)
  or not mir_core.chat_attachment_writable(org::text||'/message/'||conversation::text||'/'||auth.uid()::text||'/00000000-0000-4000-8000-000000000001.png') then
  raise exception 'Conversation non autorisée' using errcode='42501';end if;
 return jsonb_build_object('userId',auth.uid(),'organizationId',org,'conversationId',conversation);
end$fn$;
create function public.mir_chat_file_authorize(org uuid,conversation uuid,object_path text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $fn$
declare obj storage.objects;
begin
 if auth.uid() is null or not mir_core.conversation_allowed(org,conversation) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 if object_path is null or length(object_path)>250 or object_path~'[%\\[:space:]?#]'
  or split_part(object_path,'/',1)<>org::text or split_part(object_path,'/',2)<>'message'
  or split_part(object_path,'/',3)<>conversation::text then raise exception 'Chemin invalide' using errcode='22023';end if;
 select o.* into obj from storage.objects o join storage.buckets b on b.id=o.bucket_id
  where o.bucket_id='mir-internal' and o.name=object_path and not b.public;
 if not found or not mir_core.chat_file_object_valid(obj) then raise exception 'Objet invalide' using errcode='22023';end if;
 return jsonb_build_object('userId',auth.uid(),'objectId',obj.id,'path',obj.name,'version',coalesce(to_jsonb(obj)->>'version',''),
  'mime',obj.metadata->>'mimetype','size',(obj.metadata->>'size')::integer);
end$fn$;
-- Not executable by a user. Only the authenticated server inspector can attest bytes.
create function public.mir_chat_file_record(object_id uuid,object_version text,content_sha256 text,inspector text,actor uuid,expected_path text,expected_size integer,expected_mime text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,storage as $fn$
declare obj storage.objects;org uuid;conversation uuid;owner uuid;previous mir_core.chat_file_validations;expected text;facts jsonb;version text;
begin
 select * into obj from storage.objects where id=object_id and bucket_id='mir-internal';
 if not found or obj.name is distinct from expected_path or (obj.metadata->>'size')::integer is distinct from expected_size
  or obj.metadata->>'mimetype' is distinct from expected_mime then raise exception 'Objet invalide' using errcode='22023';end if;
 version:=coalesce(to_jsonb(obj)->>'version','');
 if object_version is not null and version<>object_version then raise exception 'Version objet modifiée' using errcode='22023';end if;
 -- Fresh service-owned upload: only the verified uploader can claim it, and
 -- only through this service-only RPC with matching binary-inspection facts.
 if not mir_core.chat_file_object_valid(obj) and not(obj.owner is null and coalesce(obj.owner_id,'')=''
  and actor is not null and split_part(obj.name,'/',4)=actor::text
  and mir_core.chat_storage_object(obj.name,actor,actor::text,obj.metadata)) then raise exception 'Propriétaire invalide' using errcode='22023';end if;
 org:=split_part(obj.name,'/',1)::uuid;conversation:=split_part(obj.name,'/',3)::uuid;owner:=split_part(obj.name,'/',4)::uuid;
 if actor is null or not mir_core.chat_member_allowed(org,conversation,actor) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 expected:=case obj.metadata->>'mimetype' when 'image/png' then 'png-crc-inflate-v1' when 'image/jpeg' then 'jpeg-signature-v1'
  when 'image/webp' then 'webp-signature-v1' when 'image/heic' then 'heif-signature-v1' when 'image/heif' then 'heif-signature-v1' end;
 if inspector is distinct from expected or content_sha256 is null or content_sha256!~'^[0-9a-f]{64}$' then raise exception 'Analyse invalide' using errcode='22023';end if;
 facts:=jsonb_build_object('objectId',obj.id,'version',version,'path',obj.name,'mime',obj.metadata->>'mimetype','size',(obj.metadata->>'size')::integer,'userId',actor);
 perform pg_advisory_xact_lock(hashtextextended(object_id::text||version,0));
 select * into previous from mir_core.chat_file_validations v where v.object_id=mir_chat_file_record.object_id and v.object_version=version;
 if found then
  if previous.content_sha256<>content_sha256 or previous.object_path<>obj.name or previous.mime<>obj.metadata->>'mimetype'
   or previous.bytes<>(obj.metadata->>'size')::integer then raise exception 'Version objet modifiée' using errcode='22023';end if;return facts;
 end if;
 insert into mir_core.chat_file_validations(object_id,object_version,organization_id,conversation_id,owner_id,object_path,mime,bytes,content_sha256,inspector,verified_by)
 values(obj.id,version,org,conversation,owner,obj.name,obj.metadata->>'mimetype',(obj.metadata->>'size')::integer,content_sha256,inspector,actor);
 return facts;
end$fn$;
revoke all on function public.mir_chat_file_record(uuid,text,text,text,uuid,text,integer,text) from public,anon,authenticated;
revoke all on function public.mir_chat_file_authorize(uuid,uuid,text),public.mir_chat_file_upload_authorize(uuid,uuid) from public,anon;
grant execute on function public.mir_chat_file_authorize(uuid,uuid,text),public.mir_chat_file_upload_authorize(uuid,uuid) to authenticated;
create function mir_core.chat_file_gateway_catalog() returns text language sql stable set search_path=pg_catalog as $fn$
 select md5(concat(
 (select string_agg(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,''),'|' order by p.oid) from pg_proc p
  where p.proname in('mir_chat_file_authorize','mir_chat_file_upload_authorize','mir_chat_file_record','chat_file_gateway_catalog','chat_file_object_valid') and p.pronamespace in('public'::regnamespace,'mir_core'::regnamespace)),
 (select string_agg(attname||atttypid::text||attnotnull::text,'|' order by attnum) from pg_attribute where attrelid='mir_core.chat_file_validations'::regclass and attnum>0 and not attisdropped),
 (select string_agg(pg_get_constraintdef(oid),'|' order by conname) from pg_constraint where conrelid='mir_core.chat_file_validations'::regclass),
 (select relrowsecurity::text||coalesce(relacl::text,'') from pg_class where oid='mir_core.chat_file_validations'::regclass),
 (select string_agg(to_jsonb(p)::text,'|' order by policyname) from pg_policies p where schemaname='mir_core' and tablename='chat_file_validations')));
$fn$;
revoke all on function mir_core.chat_file_gateway_catalog() from public,anon,authenticated;
$install$;
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant execute on function public.mir_chat_file_record(uuid,text,text,text,uuid,text,integer,text) to service_role;end if;
 execute format('comment on table mir_core.chat_file_validations is %L','MIR chat files v1:'||mir_core.chat_file_gateway_catalog());
 execute format('comment on column mir_core.conversations.job_id is %L','MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog());
end$migration$;
commit;
