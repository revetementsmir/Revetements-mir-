-- Production promotion prerequisite: make Supabase automatic function grants explicit.
-- Definitions are pinned to the MIR TEST bodies certified for Phase 3C.
begin;
do $guard$
declare mismatch text;
begin
 select string_agg(v.signature,', ' order by v.signature) into mismatch
 from (values
  ('public.mir_help_faq()','51f2cfe0f386c9808914cefd118698e3'),
  ('public.mir_account_preferences()','8fb829292f5dc66f2d35175f992a1cc6'),
  ('public.mir_account_preferences_save(jsonb)','d57437715b20b440c579ccab6f457c77'),
  ('public.mir_client_center_snapshot()','9dd912842cf60c498dabd54bc2db23be'),
  ('public.mir_client_support_action(text,uuid,jsonb)','9ed0623f94d4d738bc998e338fb35b80'),
  ('public.mir_support_management_snapshot(uuid)','c28d307f22949a766ce1fb7c24023eee'),
  ('public.mir_support_management_action(uuid,text,uuid,jsonb)','2e6ff2c3f34b1cb53f2f00f94fa4d9ae'),
  ('public.mir_help_faq_scoped(uuid)','384f1b0f12df76832ac8a800b64df790'),
  ('public.mir_client_center_snapshot_scoped(uuid)','3dc64aac711070a01b7fe2281c731297'),
  ('public.mir_client_support_action_scoped(uuid,text,uuid,jsonb)','70f13de4df8f385ded325dd4bc1cf69f'),
  ('public.mir_client_support_search_scoped(uuid,text)','549df35b0710655a8845838163659efa')
 ) v(signature,body_hash)
 where to_regprocedure(v.signature) is null
    or (select md5(prosrc) from pg_proc where oid=to_regprocedure(v.signature))<>v.body_hash;
 if mismatch is not null then
  raise exception 'Phase 3C function definitions incompatible: %',mismatch using errcode='55000';
 end if;
end$guard$;

revoke all on function
 public.mir_help_faq(),
 public.mir_account_preferences(),
 public.mir_account_preferences_save(jsonb),
 public.mir_client_center_snapshot(),
 public.mir_client_support_action(text,uuid,jsonb),
 public.mir_support_management_snapshot(uuid),
 public.mir_support_management_action(uuid,text,uuid,jsonb),
 public.mir_help_faq_scoped(uuid),
 public.mir_client_center_snapshot_scoped(uuid),
 public.mir_client_support_action_scoped(uuid,text,uuid,jsonb),
 public.mir_client_support_search_scoped(uuid,text)
from public,anon,authenticated,service_role;

grant execute on function public.mir_help_faq() to anon,authenticated,service_role;
grant execute on function
 public.mir_account_preferences(),
 public.mir_account_preferences_save(jsonb),
 public.mir_client_center_snapshot(),
 public.mir_client_support_action(text,uuid,jsonb),
 public.mir_support_management_snapshot(uuid),
 public.mir_support_management_action(uuid,text,uuid,jsonb),
 public.mir_help_faq_scoped(uuid),
 public.mir_client_center_snapshot_scoped(uuid),
 public.mir_client_support_action_scoped(uuid,text,uuid,jsonb),
 public.mir_client_support_search_scoped(uuid,text)
to authenticated,service_role;
commit;
