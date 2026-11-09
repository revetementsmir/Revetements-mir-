begin;
create or replace function public.mir_supplier_stock_dispatch(org uuid,route_id uuid,quantity numeric,request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
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
 update mir_core.coordination_routes set delivered_qty=delivered_qty+mir_supplier_stock_dispatch.quantity where organization_id=org and id=r.id;
 update mir_core.coordination_orders set revision=revision+1,updated_at=now() where organization_id=org and id=c.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id) values(org,c.id,c.revision+1,'supplier_received',jsonb_build_object('routeId',r.id,'stockDispatched',quantity),auth.uid());
 result:=jsonb_build_object('revision',c.revision+1,'deliveredQty',r.delivered_qty+quantity);return mir_core.coordination_receipt(org,request_id,'supplier_stock_dispatch',payload,result);
end$$;

commit;
