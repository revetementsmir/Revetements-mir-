-- GUARDED ACTIVATION PROPOSAL, NOT IN THE AUTOMATIC MIGRATION CHAIN.
-- Requires distinct approval, deployed/tested gateway and matching frontend.
-- Existing cached responses/signed links cannot be purged by this SQL.
begin;
do $activation$
declare marker text;fingerprint text;source text;
begin
 perform pg_advisory_xact_lock(hashtextextended('mir-chat-file-gateway-activation-v1',0));
 if to_regprocedure('mir_core.chat_file_gateway_catalog()') is null
  or obj_description('mir_core.chat_file_validations'::regclass,'pg_class') is distinct from 'MIR chat files v1:'||mir_core.chat_file_gateway_catalog()
  or not exists(select 1 from pg_attribute where attrelid='mir_core.conversations'::regclass and attname='job_id'
   and col_description(attrelid,attnum)='MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog()) then
  raise exception 'Préparation fichiers absente ou incompatible' using errcode='55000';end if;
 select obj_description(oid,'pg_proc'),md5(prosrc||coalesce(proacl::text,'')||
  (select with_check from pg_policies where schemaname='storage' and policyname='mir_chat_phase3a_insert')||
  (select qual from pg_policies where schemaname='storage' and policyname='mir_chat_phase3a_select'))
  into marker,fingerprint from pg_proc where oid='public.mir_message_attachment_validate(uuid,uuid,text)'::regprocedure;
 if marker='MIR chat gateway active v1:'||fingerprint then return;end if;
 if not exists(select 1 from pg_proc where oid='public.mir_message_attachment_validate(uuid,uuid,text)'::regprocedure
  and md5(prosrc)='7da66ec6f30c684d7d94ed6c44f673eb' and prosecdef and proconfig=array['search_path=pg_catalog, mir_core, storage'])
  or (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and permissive='RESTRICTIVE'
   and roles=array['authenticated']::name[] and ((policyname='mir_chat_phase3a_select' and md5(qual)='47fb53329f575d405e7a620be06cb7eb')
    or(policyname='mir_chat_phase3a_insert' and md5(with_check)='7ece8d1a797b48d23070759f710e0351')))<>2 then
  raise exception 'Activation fichiers incompatible' using errcode='55000';end if;
 -- Narrow only the message scope. Other operations on the shared bucket retain
 -- their existing policies. No direct user upload/read/signing of chat files.
 alter policy mir_chat_phase3a_insert on storage.objects with check(not(bucket_id='mir-internal' and split_part(name,'/',2)='message'));
 alter policy mir_chat_phase3a_select on storage.objects using(not(bucket_id='mir-internal' and split_part(name,'/',2)='message'));
 select pg_get_functiondef('public.mir_message_attachment_validate(uuid,uuid,text)'::regprocedure) into source;
 source:=replace(source,'mir_core.chat_storage_object(obj.name,obj.owner,obj.owner_id,obj.metadata)','mir_core.chat_file_object_valid(obj)');
 source:=replace(source,' return jsonb_build_object(''path'',obj.name,',
 $guard$ if not exists(select 1 from mir_core.chat_file_validations v where v.object_id=obj.id
  and v.object_version=coalesce(to_jsonb(obj)->>'version','') and v.object_path=obj.name
  and v.organization_id=org and v.conversation_id=conversation and v.owner_id=auth.uid()
  and v.mime=obj.metadata->>'mimetype' and v.bytes=(obj.metadata->>'size')::integer) then
  raise exception 'Analyse serveur requise' using errcode='22023';end if;
 return jsonb_build_object('path',obj.name,$guard$);
 if source not like '%Analyse serveur requise%' or source not like '%mir_core.chat_file_object_valid(obj)%' then raise exception 'Validateur incompatible' using errcode='55000';end if;execute source;
 select md5(prosrc||coalesce(proacl::text,'')||
  (select with_check from pg_policies where schemaname='storage' and policyname='mir_chat_phase3a_insert')||
  (select qual from pg_policies where schemaname='storage' and policyname='mir_chat_phase3a_select'))
  into fingerprint from pg_proc where oid='public.mir_message_attachment_validate(uuid,uuid,text)'::regprocedure;
 execute format('comment on function public.mir_message_attachment_validate(uuid,uuid,text) is %L','MIR chat gateway active v1:'||fingerprint);
 execute format('comment on column mir_core.conversations.job_id is %L','MIR chat Phase3A v1:'||mir_core.chat_phase3a_catalog());
end$activation$;
commit;
