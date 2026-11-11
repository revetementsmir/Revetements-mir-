begin;

create or replace function public.mir_estimate_recipe_result(fixture_tag text)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','mir_estimates'
as $$
declare
  account jsonb;
  item mir_estimates.requests;
  matches integer;
begin
  account:=public.mir_account_snapshot();
  if account->>'role'<>'admin' or not (select diagnostics from mir_estimates.settings where singleton) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if fixture_tag is null or fixture_tag !~ '^QA-PUBLIC-ESTIMATE-[A-Z-]+$' then
    raise exception 'INVALID_FIXTURE_TAG' using errcode='22023';
  end if;
  select count(*) into matches from mir_estimates.requests r where r.payload#>>'{note}' like '%'||fixture_tag||'%';
  if matches>1 then raise exception 'DUPLICATE_FIXTURE' using errcode='23505';end if;
  select * into item from mir_estimates.requests r where r.payload#>>'{note}' like '%'||fixture_tag||'%' order by r.created_at desc limit 1;
  if not found then return jsonb_build_object('found',false);end if;
  return jsonb_build_object('found',true,'id',item.id,'requestNumber',item.request_number,'state',item.state,'providerAccepted',item.message_id is not null,'acceptedAt',item.accepted_at,'source',item.payload->>'source','payload',item.payload);
end $$;

revoke all on function public.mir_estimate_recipe_result(text) from public,anon;
grant execute on function public.mir_estimate_recipe_result(text) to authenticated;

commit;
