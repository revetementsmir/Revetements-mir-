-- READ ONLY. Run on MIR production immediately before any approved promotion.
begin read only;
select
 current_setting('transaction_read_only')='on' as read_only,
 to_regclass('mir_core.conversations') is not null as conversations_present,
 to_regclass('mir_core.messages') is not null as messages_present,
 to_regclass('mir_core.chat_file_validations') is null as gateway_not_installed,
 to_regclass('mir_core.help_faq') is null as help_center_not_installed,
 exists(select 1 from storage.buckets where id='mir-internal' and not public
   and file_size_limit=10485760
   and allowed_mime_types=array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]) as internal_bucket_baseline,
 not exists(select 1 from storage.buckets where id='mir-support') as support_bucket_not_installed,
 to_regprocedure('public.mir_chat_conversations(uuid,integer,jsonb)') is null as chat_page_rpc_not_installed,
 to_regprocedure('public.mir_chat_file_authorize(uuid,uuid,text)') is null as gateway_rpc_not_installed,
 to_regprocedure('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)') is null as support_rpc_not_installed,
 (select array_agg(attname::text order by attnum) from pg_attribute
   where attrelid='mir_core.conversations'::regclass and attnum>0 and not attisdropped)
 =array['organization_id','id','kind','team_id','created_by','created_at']::text[] as conversations_columns_match;
rollback;
