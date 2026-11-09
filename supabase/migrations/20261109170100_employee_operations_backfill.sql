-- Give every existing active employee the baseline employee capability.
-- Leader/assistant/warehouse capabilities remain explicit admin decisions.
begin;
insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by)
select m.organization_id,m.user_id,'employee',left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email,m.user_id::text),160),
 (select a.user_id from mir_core.memberships a where a.organization_id=m.organization_id and a.active and a.role='admin' order by a.user_id limit 1)
from mir_core.memberships m join auth.users u on u.id=m.user_id
where m.active and m.role='employee' and exists(select 1 from mir_core.memberships a where a.organization_id=m.organization_id and a.active and a.role='admin')
on conflict(organization_id,user_id) do nothing;
commit;
