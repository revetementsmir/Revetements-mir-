-- Compensatory safety stop. Preserves every table, row and Storage object.
-- Apply only with explicit production rollback approval.
begin;
revoke execute on function public.mir_chat_conversations(uuid,integer,jsonb) from authenticated;
revoke execute on function public.mir_chat_messages(uuid,uuid,integer,jsonb) from authenticated;
revoke execute on function public.mir_chat_search(uuid,text,integer,jsonb) from authenticated;
revoke execute on function public.mir_chat_file_authorize(uuid,uuid,text) from authenticated;
revoke execute on function public.mir_chat_file_upload_authorize(uuid,uuid) from authenticated;
do $$
begin
 if to_regprocedure('public.mir_help_faq_scoped(uuid)') is not null then
  execute 'revoke execute on function public.mir_help_faq_scoped(uuid) from authenticated';
 end if;
 if to_regprocedure('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)') is not null then
  execute 'revoke execute on function public.mir_client_support_action_scoped(uuid,text,uuid,jsonb) from authenticated';
 end if;
 if to_regprocedure('public.mir_client_support_search_scoped(uuid,text)') is not null then
  execute 'revoke execute on function public.mir_client_support_search_scoped(uuid,text) from authenticated';
 end if;
end $$;
commit;
