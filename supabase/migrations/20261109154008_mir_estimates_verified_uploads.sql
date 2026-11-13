begin;
-- Compact extension of the existing service-only RPC. No additional role grants.
create or replace function public.mir_estimate_rpc(action text,body jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r mir_estimates.requests%rowtype;
begin
 perform pg_advisory_xact_lock(724191109);
 if action='verified' then
  select * into r from mir_estimates.requests where id=(body->>'id')::uuid for update;
  if not found or r.resume_hash<>body->>'resumeHash' then raise exception 'CAPABILITY';end if;
  if r.lease_token is distinct from (body->>'lease')::uuid or r.lease_until<=now() then raise exception 'BUSY';end if;
  -- Edge has verified every immutable object; reserve actual bytes, not five maxima.
  update mir_estimates.requests set reserved_bytes=(select coalesce(sum((f->>'bytes')::bigint),0) from jsonb_array_elements(files) f),updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r);
 end if;
 if action='prepare' then
  -- A cleaned staging request can resume from its local files with a fresh TUS session.
  update mir_estimates.requests set uploads='{}' where id=(body->>'id')::uuid and state='expired' and resume_hash=body->>'resumeHash' and content_hash=body->>'contentHash';
 end if;
 return mir_estimates.rpc(action,body);
end $$;
revoke all on function public.mir_estimate_rpc(text,jsonb) from public,anon,authenticated;
grant execute on function public.mir_estimate_rpc(text,jsonb) to service_role;
commit;
