begin;
create or replace function public.mir_coordination_inbox(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare out jsonb;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Coordination non autorisée' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'number',o.order_number,'unassignedQty',case when c.id is null then coalesce((select sum(ol.quantity) from mir_core.order_lines ol where ol.organization_id=org and ol.order_id=o.id),0) else coalesce((select sum(cl.requested_qty-coalesce((select sum(cr.quantity) from mir_core.coordination_routes cr where cr.organization_id=org and cr.coordination_line_id=cl.id),0)) from mir_core.coordination_lines cl where cl.organization_id=org and cl.coordination_id=c.id),0) end,'sourceOrderId',o.id,'id',c.id,'revision',c.revision,
  'job',coalesce(c.job,r.snapshot->'configuration'->>'chantier',r.snapshot->>'job',''),
  'address',coalesce(c.delivery_address,r.snapshot->>'address',''),
  'team',coalesce(c.team,''),
  'priority',coalesce(c.priority,'normal'),
  'lineCount',(select count(*) from mir_core.order_lines ol where ol.organization_id=org and ol.order_id=o.id),
  'status',case when c.shipped_at is not null then 'warehouse_shipped'
   when c.id is null then 'new' else 'in_progress' end
 ) order by o.created_at desc),'[]'::jsonb) into out
 from mir_core.orders o
 left join mir_core.coordination_orders c on (c.organization_id,c.employee_order_id)=(o.organization_id,o.id)
 left join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
 where o.organization_id=org and o.kind='employee' and o.status<>'cancelled';
 return out;
end$$;

create or replace function public.mir_administration(p_search text default '') returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare out jsonb;org uuid;begin out:=public.mir_administration_base(p_search);select organization_id into org from mir_core.account_settings where singleton;return jsonb_set(out,'{today}',out->'today'||jsonb_build_object('toSort',case when mir_core.coordination_allowed(org) then (select count(*) from jsonb_array_elements(public.mir_coordination_inbox(org)) x where (x->>'unassignedQty')::numeric>0 or x->>'id' is null) else 0 end,'preparations',case when mir_core.warehouse_allowed(org) then(select count(*) from mir_core.coordination_orders c where c.organization_id=org and c.shipped_at is null and exists(select 1 from mir_core.coordination_lines l join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(l.organization_id,l.id) where l.organization_id=org and l.coordination_id=c.id and r.route='warehouse')) else 0 end,'overdue',case when mir_core.coordination_allowed(org) then (select count(*) from mir_core.coordination_routes where organization_id=org and route='supplier' and delivered_qty<quantity and expected_date<current_date) else 0 end,'toSend',case when mir_core.coordination_allowed(org) then(select count(*) from mir_core.orders o where organization_id=org and kind='supplier' and status in('draft','approved') and not exists(select 1 from mir_core.send_jobs j where j.organization_id=org and j.order_id=o.id and j.revision=o.revision and j.status in('accepted','delivered'))) else 0 end));end$$;
commit;
