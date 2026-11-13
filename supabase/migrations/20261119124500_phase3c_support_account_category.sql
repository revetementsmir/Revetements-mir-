-- Phase 3C: align the support category constraint with the Help Center UI.
begin;
do $preflight$
declare current_definition text;
begin
  select pg_get_constraintdef(oid) into current_definition
  from pg_constraint
  where conrelid = 'mir_core.support_conversations'::regclass
    and conname = 'support_conversations_category_check';

  if current_definition is null
     or current_definition not like '%order%product%estimate%bending%other%' then
    raise exception 'Unexpected support category constraint: %', current_definition
      using errcode = '55000';
  end if;
end
$preflight$;

alter table mir_core.support_conversations
  drop constraint support_conversations_category_check;
alter table mir_core.support_conversations
  add constraint support_conversations_category_check
  check (category = any (array['order','product','estimate','bending','account','other']));
commit;
