-- Make active administrators visible as bosses to the internal messaging rules.
begin;
create or replace function mir_core.staff_role(org uuid,member uuid default auth.uid()) returns text
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select case when exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=member and m.active and m.role='admin') then 'boss'
  else (select p.staff_role from mir_core.staff_capabilities p join mir_core.memberships m
   on(m.organization_id,m.user_id)=(p.organization_id,p.user_id)
   where p.organization_id=org and p.user_id=member and p.active and m.active and m.role='employee') end;
$$;
revoke all on function mir_core.staff_role(uuid,uuid) from public,anon;
grant execute on function mir_core.staff_role(uuid,uuid) to authenticated;

insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by)
select m.organization_id,m.user_id,'boss',left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email,m.user_id::text),160),m.user_id
from mir_core.memberships m join auth.users u on u.id=m.user_id where m.active and m.role='admin'
on conflict(organization_id,user_id) do update set staff_role='boss',active=true;
commit;
