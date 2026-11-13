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
select
 to_regclass('mir_core.account_preferences') is not null as account_preferences,
 to_regclass('mir_core.help_faq') is not null as help_faq,
 to_regclass('mir_core.support_conversations') is not null as support_conversations,
 to_regclass('mir_core.support_messages') is not null as support_messages,
 to_regclass('mir_core.support_attachments') is not null as support_attachments,
 exists(select 1 from storage.buckets where id='mir-support' and not public) as support_bucket_private,
 to_regprocedure('public.mir_client_support_search_scoped(uuid,text)') is not null as scoped_search_rpc,
 (select count(*) from pg_policies where schemaname='storage' and tablename='objects'
   and policyname like 'mir_support_%')=3 as three_support_policies;
select p.signature,
 not has_function_privilege('anon',p.signature,'execute') as anon_denied,
 has_function_privilege('authenticated',p.signature,'execute') as authenticated_allowed,
 has_function_privilege('service_role',p.signature,'execute') as service_role_allowed
from (values
 ('public.mir_account_preferences()'),
 ('public.mir_account_preferences_save(jsonb)'),
 ('public.mir_client_center_snapshot()'),
 ('public.mir_client_support_action(text,uuid,jsonb)'),
 ('public.mir_support_management_snapshot(uuid)'),
 ('public.mir_support_management_action(uuid,text,uuid,jsonb)'),
 ('public.mir_help_faq_scoped(uuid)'),
 ('public.mir_client_center_snapshot_scoped(uuid)'),
 ('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)'),
 ('public.mir_client_support_search_scoped(uuid,text)')
) p(signature);
select
 has_function_privilege('anon','public.mir_help_faq()','execute') as anon_public_faq_allowed,
 has_function_privilege('authenticated','public.mir_help_faq()','execute') as authenticated_public_faq_allowed;
rollback;
