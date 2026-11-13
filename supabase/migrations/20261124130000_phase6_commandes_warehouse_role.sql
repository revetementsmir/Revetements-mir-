-- Phase 6 Commandes : Entrepôt suit le rôle opérationnel recalculé.
begin;
create or replace function mir_core.warehouse_allowed(org uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select coalesce(mir_core.staff_role(org) in ('admin','warehouse'),false) or exists(
  select 1 from mir_core.memberships m join mir_core.warehouse_access a
   on(a.organization_id,a.user_id)=(m.organization_id,m.user_id)
  where m.organization_id=org and m.user_id=auth.uid() and m.active and a.active
 );
$$;
revoke all on function mir_core.warehouse_allowed(uuid) from public,anon;
grant execute on function mir_core.warehouse_allowed(uuid) to authenticated;
commit;
