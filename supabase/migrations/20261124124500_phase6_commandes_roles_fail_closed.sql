-- Phase 6 Commandes : un rôle opérationnel absent doit toujours refuser.
begin;
create or replace function mir_core.coordination_allowed(org uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select coalesce(mir_core.staff_role(org) in ('admin','boss','assistant'),false) or exists(
  select 1 from mir_core.memberships m join mir_core.coordination_access a
   on(a.organization_id,a.user_id)=(m.organization_id,m.user_id)
  where m.organization_id=org and m.user_id=auth.uid() and m.role='employee'
   and m.active and a.active
 );
$$;
revoke all on function mir_core.coordination_allowed(uuid) from public,anon;
grant execute on function mir_core.coordination_allowed(uuid) to authenticated;
commit;
