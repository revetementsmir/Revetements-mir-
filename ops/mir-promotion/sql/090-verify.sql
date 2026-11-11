-- READ ONLY. Catalog verification only; no customer rows are returned.
begin read only;
select
 to_regclass('mir_core.chat_file_validations') is not null as gateway_table,
 to_regprocedure('public.mir_chat_conversations(uuid,integer,jsonb)') is not null as chat_page_rpc,
 to_regprocedure('public.mir_chat_file_authorize(uuid,uuid,text)') is not null as gateway_read_rpc,
 to_regprocedure('public.mir_chat_file_upload_authorize(uuid,uuid)') is not null as gateway_upload_rpc,
 exists(select 1 from storage.buckets where id='mir-internal' and not public
   and file_size_limit=10485760 and 'application/pdf'=any(allowed_mime_types)) as internal_pdf_private,
 (select count(*) from pg_policies where schemaname='storage' and tablename='objects'
   and policyname like 'mir_chat_phase3a_%')=4 as four_chat_restrictive_policies,
 not has_function_privilege('anon','public.mir_chat_file_authorize(uuid,uuid,text)','execute') as anon_gateway_denied,
 has_function_privilege('authenticated','public.mir_chat_file_authorize(uuid,uuid,text)','execute') as authenticated_gateway_allowed;
rollback;
