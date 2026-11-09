begin;
create or replace function mir_core.can_read_order(org uuid,order_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$select exists(select 1 from mir_core.orders o where o.organization_id=org and o.id=order_id and (mir_core.has_role(org,array['admin']) or mir_core.coordination_allowed(org) or (o.owner_id=auth.uid() and o.kind in('employee','client') and mir_core.has_role(org,array[o.kind]) and (o.kind='client' or o.job_id is null or mir_core.job_allowed(org,o.job_id)))))$$;
alter function public.mir_portal_snapshot() rename to mir_portal_snapshot_orders_base;
revoke all on function public.mir_portal_snapshot_orders_base() from public,anon,authenticated;
create function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare out jsonb;org uuid;rows jsonb;begin
 out:=public.mir_portal_snapshot_orders_base();select organization_id into org from mir_core.account_settings where singleton;
 select coalesce(jsonb_agg(m||case when p.id is not null then jsonb_build_object('name',p.name,'team',p.team,'profileId',p.id) else '{}'::jsonb end),'[]') into rows from jsonb_array_elements(out->'members') m left join mir_core.staff_profiles p on p.organization_id=org and p.user_id=(m->>'id')::uuid;
 return jsonb_set(out,'{members}',rows)||jsonb_build_object('organizationId',org);
end$$;
revoke all on function public.mir_portal_snapshot() from public,anon;grant execute on function public.mir_portal_snapshot() to authenticated;
commit;
