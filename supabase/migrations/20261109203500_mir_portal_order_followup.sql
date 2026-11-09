begin;
-- Preserve the established employee model's fields and include supplier receipts in totals.
alter function public.mir_portal_snapshot() rename to mir_portal_snapshot_admin_base;
revoke all on function public.mir_portal_snapshot_admin_base() from public,anon,authenticated;
create function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare out jsonb;rows jsonb;org uuid;begin
 out:=public.mir_portal_snapshot_admin_base();select organization_id into org from mir_core.account_settings where singleton;
 select coalesce(jsonb_agg(o||jsonb_build_object('requestedById',o->>'memberId','lines',(select coalesce(jsonb_agg(l||jsonb_build_object('deliveredQty',coalesce((l->>'deliveredQty')::numeric,0)+coalesce((select sum(r.received_qty) from mir_core.coordination_lines c join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(c.organization_id,c.id) where c.organization_id=org and c.employee_line_id=(l->>'id')::uuid and r.route='supplier'),0),'remainingQty',greatest(0,(l->>'requestedQty')::numeric-coalesce((l->>'deliveredQty')::numeric,0)-coalesce((l->>'cancelledQty')::numeric,0)-coalesce((select sum(r.received_qty) from mir_core.coordination_lines c join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(c.organization_id,c.id) where c.organization_id=org and c.employee_line_id=(l->>'id')::uuid and r.route='supplier'),0)))),'[]') from jsonb_array_elements(o->'lines') l))),'[]') into rows from jsonb_array_elements(out->'orders') o;
 return jsonb_set(out,'{orders}',rows);
end$$;
revoke all on function public.mir_portal_snapshot() from public,anon;grant execute on function public.mir_portal_snapshot() to authenticated;
commit;
