begin;
alter table mir_core.coordination_routes add column delivered_qty numeric(15,3) not null default 0 check(delivered_qty>=0 and delivered_qty<=received_qty);
update mir_core.coordination_routes set delivered_qty=received_qty where receipt_destination='job';
create or replace function public.mir_coordination_supplier_receive(
 org uuid,coord_id uuid,route_id uuid,quantity numeric,expected_revision integer,request_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;r mir_core.coordination_routes;
 l mir_core.coordination_lines;rev integer;payload jsonb;prior jsonb;result jsonb;sku mir_core.warehouse_skus;balance mir_core.warehouse_stock;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe MIR requise' using errcode='42501';end if;
 payload:=jsonb_build_object('coord',coord_id,'route',route_id,'quantity',quantity,'expectedRevision',expected_revision);
 prior:=mir_core.coordination_replay(org,request_id,'supplier_receive',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 if not found then raise exception 'Commande introuvable' using errcode='22023';end if;
 if o.revision<>expected_revision then raise exception 'Commande modifiée : actualiser' using errcode='40001';end if;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id for update;
 select * into l from mir_core.coordination_lines where organization_id=org and id=r.coordination_line_id and coordination_id=o.id;
 if not found or r.route<>'supplier' or r.supplier_order_id is null then raise exception 'Bon fournisseur inexistant' using errcode='22023';end if;
 if quantity is null or quantity<=0 or scale(quantity)>3 or r.received_qty+quantity>r.quantity
 then raise exception 'Réception supérieure à la quantité fournisseur' using errcode='22023';end if;
 if r.receipt_destination='stock' then
  select * into sku from mir_core.warehouse_skus where organization_id=org and source_ref=l.variant_key and not archived;
  if not found then raise exception 'Créez le SKU exact avant la réception en stock' using errcode='22023';end if;
  select * into balance from mir_core.warehouse_stock where organization_id=org and sku_id=sku.id for update;
  if not found then raise exception 'Stock non initialisé' using errcode='22023';end if;
  update mir_core.warehouse_stock set on_hand=on_hand+quantity,revision=revision+1,updated_at=now() where organization_id=org and sku_id=sku.id;
  insert into mir_core.warehouse_movements(organization_id,sku_id,actor_id,request_id,delta,reason,kind,stock_before,stock_after) values(org,sku.id,auth.uid(),request_id,quantity,'Réception du bon '||r.supplier_order_id,'receipt',balance.on_hand,balance.on_hand+quantity);
 end if;
 update mir_core.coordination_routes set delivered_qty=coordination_routes.delivered_qty+case when receipt_destination='job' then mir_coordination_supplier_receive.quantity else 0 end,received_qty=coordination_routes.received_qty+mir_coordination_supplier_receive.quantity,
 production_status=case when coordination_routes.received_qty+mir_coordination_supplier_receive.quantity=coordination_routes.quantity
 then 'received' else 'received_partial' end where organization_id=org and id=r.id;
 rev:=o.revision+1;update mir_core.coordination_orders set revision=rev,updated_at=now() where organization_id=org and id=o.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,o.id,rev,'supplier_received',jsonb_build_object('supplierId',r.supplier_id,'poId',r.supplier_order_id,
  'lineId',l.id,'receivedQty',quantity,'totalReceived',r.received_qty+quantity),auth.uid());
 result:=jsonb_build_object('revision',rev,'receivedQty',r.received_qty+quantity,
  'remainingQty',r.quantity-r.received_qty-quantity);
 return mir_core.coordination_receipt(org,request_id,'supplier_receive',payload,result);
end$$;

create or replace function public.mir_coordination_detail(org uuid,coord_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare out jsonb;co mir_core.coordination_orders;begin
 if not(mir_core.coordination_allowed(org) or mir_core.warehouse_allowed(org)) then
 raise exception 'Accès interdit' using errcode='42501';end if;
 select * into co from mir_core.coordination_orders where organization_id=org and id=coord_id;
 if not found then raise exception 'Commande introuvable' using errcode='22023';end if;
 select jsonb_build_object('id',co.id,'sourceOrderId',co.employee_order_id,'revision',co.revision,
  'job',co.job,'address',co.delivery_address,'team',co.team,'priority',co.priority,
  'shippedAt',co.shipped_at,'notes',case when mir_core.coordination_allowed(org) then co.notes else '' end,
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'id',l.id,'sourceLineId',l.employee_line_id,'name',l.item_name,'unit',l.unit,'requestedQty',l.requested_qty,
    'variantKey',l.variant_key,'routes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'lane',a.route,'quantity',a.quantity,'supplierId',a.supplier_id,
      'expectedDate',a.expected_date,'responsibleId',a.responsible_id,'destination',a.receipt_destination,'deliveredQty',a.delivered_qty,'supplierOrderId',a.supplier_order_id,'receivedQty',a.received_qty,'productionStatus',a.production_status,
       'pickedQty',case when a.route='warehouse' then coalesce((select f.delivered_qty from mir_core.warehouse_fulfillment f where f.organization_id=l.organization_id and f.order_line_id=l.employee_line_id),0) else null end))
      from mir_core.coordination_routes a where a.organization_id=org and a.coordination_line_id=l.id),'[]'::jsonb))
    order by l.created_at) from mir_core.coordination_lines l
    where l.organization_id=org and l.coordination_id=co.id),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(jsonb_build_object(
    'revision',e.revision,'type',e.event_type,'payload',e.payload,'actorId',e.actor_id,'at',e.created_at))
    from mir_core.coordination_events e where e.organization_id=org and e.coordination_id=co.id),'[]'::jsonb)
 ) into out;
 return out;
end$$;

create or replace function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare out jsonb;rows jsonb;org uuid;begin
 out:=public.mir_portal_snapshot_admin_base();select organization_id into org from mir_core.account_settings where singleton;
 select coalesce(jsonb_agg(o||jsonb_build_object('requestedById',o->>'memberId','lines',(select coalesce(jsonb_agg(l||jsonb_build_object('deliveredQty',coalesce((l->>'deliveredQty')::numeric,0)+coalesce((select sum(r.delivered_qty) from mir_core.coordination_lines c join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(c.organization_id,c.id) where c.organization_id=org and c.employee_line_id=(l->>'id')::uuid and r.route='supplier'),0),'remainingQty',greatest(0,(l->>'requestedQty')::numeric-coalesce((l->>'deliveredQty')::numeric,0)-coalesce((l->>'cancelledQty')::numeric,0)-coalesce((select sum(r.delivered_qty) from mir_core.coordination_lines c join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(c.organization_id,c.id) where c.organization_id=org and c.employee_line_id=(l->>'id')::uuid and r.route='supplier'),0)))),'[]') from jsonb_array_elements(o->'lines') l))),'[]') into rows from jsonb_array_elements(out->'orders') o;
 return jsonb_set(out,'{orders}',rows);
end$$;
create function public.mir_supplier_stock_dispatch(org uuid,route_id uuid,quantity numeric,request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare r mir_core.coordination_routes;l mir_core.coordination_lines;c mir_core.coordination_orders;sku mir_core.warehouse_skus;balance mir_core.warehouse_stock;payload jsonb;prior jsonb;result jsonb;begin
 if not mir_core.warehouse_allowed(org) then raise exception 'Entrepôt requis' using errcode='42501';end if;
 payload:=jsonb_build_object('route',route_id,'quantity',quantity);prior:=mir_core.coordination_replay(org,request_id,'supplier_stock_dispatch',payload);if prior is not null then return prior;end if;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id;
 select * into l from mir_core.coordination_lines where organization_id=org and id=r.coordination_line_id;
 select * into c from mir_core.coordination_orders where organization_id=org and id=l.coordination_id for update;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id for update;
 if r.receipt_destination<>'stock' or quantity is null or quantity<=0 or quantity>r.received_qty-r.delivered_qty then raise exception 'Quantité supérieure au reliquat reçu en stock' using errcode='22023';end if;
 select * into sku from mir_core.warehouse_skus where organization_id=org and source_ref=l.variant_key and not archived;
 select * into balance from mir_core.warehouse_stock where organization_id=org and sku_id=sku.id for update;
 if not found or balance.on_hand<quantity or mod(quantity,sku.quantity_step)<>0 then raise exception 'Stock ou quantité incompatible' using errcode='22023';end if;
 update mir_core.warehouse_stock set on_hand=on_hand-quantity,revision=revision+1,updated_at=now() where organization_id=org and sku_id=sku.id;
 insert into mir_core.warehouse_movements(organization_id,sku_id,actor_id,request_id,delta,reason,kind,stock_before,stock_after) values(org,sku.id,auth.uid(),request_id,-quantity,'Livraison chantier depuis réception du bon '||r.supplier_order_id,'delivery',balance.on_hand,balance.on_hand-quantity);
 update mir_core.coordination_routes set delivered_qty=delivered_qty+quantity where organization_id=org and id=r.id;
 update mir_core.coordination_orders set revision=revision+1,updated_at=now() where organization_id=org and id=c.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id) values(org,c.id,c.revision+1,'supplier_received',jsonb_build_object('routeId',r.id,'stockDispatched',quantity),auth.uid());
 result:=jsonb_build_object('revision',c.revision+1,'deliveredQty',r.delivered_qty+quantity);return mir_core.coordination_receipt(org,request_id,'supplier_stock_dispatch',payload,result);
end$$;
revoke all on function public.mir_supplier_stock_dispatch(uuid,uuid,numeric,uuid) from public,anon;grant execute on function public.mir_supplier_stock_dispatch(uuid,uuid,numeric,uuid) to authenticated;
commit;
