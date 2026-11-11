begin;
do $guard$
begin
 if (select md5(prosrc) from pg_proc where oid='mir_core.chat_storage_object(text,uuid,text,jsonb)'::regprocedure)<>'5abf42b269453e7c88ff2a1507df8e89' then
  raise exception 'chat_storage_object incompatible';
 end if;
 if (select md5(prosrc) from pg_proc where oid='public.mir_chat_file_record(uuid,text,text,text,uuid,text,integer,text)'::regprocedure)<>'37f4d1a04387300eef38b88dc83eeefd' then
  raise exception 'mir_chat_file_record incompatible';
 end if;
 if not exists(select 1 from storage.buckets where id='mir-internal' and not public and file_size_limit=10485760
  and allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']::text[]) then
  raise exception 'mir-internal PDF policy absent or incompatible';
 end if;
end$guard$;

create or replace function mir_core.chat_storage_object(path text,object_owner uuid,owner_id text,metadata jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $fn$
declare parts text[]:=string_to_array(path,'/');mime text:=metadata->>'mimetype';ext text;
begin
 if cardinality(parts)<>5 or parts[2]<>'message' or parts[1]!~'^[0-9a-f-]{36}$' or parts[3]!~'^[0-9a-f-]{36}$'
  or parts[4]!~'^[0-9a-f-]{36}$' or parts[5]!~'^[0-9a-f-]{36}\.(jpg|png|webp|heic|heif|pdf)$' then return false;end if;
 perform parts[1]::uuid,parts[3]::uuid,parts[4]::uuid,split_part(parts[5],'.',1)::uuid;
 if coalesce(owner_id,object_owner::text,'')<>parts[4] or(object_owner is not null and object_owner::text<>parts[4]) then return false;end if;
 ext:=case mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/heic' then 'heic' when 'image/heif' then 'heif' when 'application/pdf' then 'pdf' end;
 if ext is null or right(parts[5],length(ext)+1)<>'.'||ext or coalesce(metadata->>'size','')!~'^[0-9]{1,8}$' then return false;end if;
 return (metadata->>'size')::bigint between 1 and 10485760;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$fn$;
revoke all on function mir_core.chat_storage_object(text,uuid,text,jsonb) from public,anon;
grant execute on function mir_core.chat_storage_object(text,uuid,text,jsonb) to authenticated,service_role;

create or replace function public.mir_chat_file_record(object_id uuid,object_version text,content_sha256 text,inspector text,actor uuid,expected_path text,expected_size integer,expected_mime text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,storage as $fn$
declare obj storage.objects;org uuid;conversation uuid;owner uuid;previous mir_core.chat_file_validations;expected text;facts jsonb;version text;
begin
 select * into obj from storage.objects where id=object_id and bucket_id='mir-internal';
 if not found or obj.name is distinct from expected_path or (obj.metadata->>'size')::integer is distinct from expected_size
  or obj.metadata->>'mimetype' is distinct from expected_mime then raise exception 'Objet invalide' using errcode='22023';end if;
 version:=coalesce(to_jsonb(obj)->>'version','');
 if object_version is not null and version<>object_version then raise exception 'Version objet modifiée' using errcode='22023';end if;
 if not mir_core.chat_file_object_valid(obj) and not(obj.owner is null and coalesce(obj.owner_id,'')=''
  and actor is not null and split_part(obj.name,'/',4)=actor::text
  and mir_core.chat_storage_object(obj.name,actor,actor::text,obj.metadata)) then raise exception 'Propriétaire invalide' using errcode='22023';end if;
 org:=split_part(obj.name,'/',1)::uuid;conversation:=split_part(obj.name,'/',3)::uuid;owner:=split_part(obj.name,'/',4)::uuid;
 if actor is null or not mir_core.chat_member_allowed(org,conversation,actor) then raise exception 'Conversation non autorisée' using errcode='42501';end if;
 expected:=case obj.metadata->>'mimetype' when 'image/png' then 'png-crc-inflate-v1' when 'image/jpeg' then 'jpeg-signature-v1'
  when 'image/webp' then 'webp-signature-v1' when 'image/heic' then 'heif-signature-v1' when 'image/heif' then 'heif-signature-v1'
  when 'application/pdf' then 'pdf-structure-v1' end;
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
grant execute on function public.mir_chat_file_record(uuid,text,text,text,uuid,text,integer,text) to service_role;
commit;
