begin;
create function mir_core.warehouse_allocated(org uuid,line_id uuid) returns numeric language sql stable security definer set search_path=pg_catalog,mir_core as $$select coalesce(sum(r.quantity),0) from mir_core.coordination_lines l join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(l.organization_id,l.id) where l.organization_id=org and l.employee_line_id=line_id and r.route='warehouse'$$;
revoke all on function mir_core.warehouse_allocated(uuid,uuid) from public,anon,authenticated;
create or replace function public.mir_warehouse_snapshot(org uuid,qr uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare product mir_core.warehouse_skus;stock mir_core.warehouse_stock;pending jsonb;log_rows jsonb;begin
 if not mir_core.warehouse_allowed(org) then raise exception 'Accès Entrepôt requis' using errcode='42501';end if;
 select * into product from mir_core.warehouse_skus where organization_id=org and qr_token=qr and not archived;
 if not found then raise exception 'Code QR inconnu ou article archivé' using errcode='22023';end if;
 select * into stock from mir_core.warehouse_stock where organization_id=org and sku_id=product.id;
 select coalesce(jsonb_agg(jsonb_build_object(
  'orderId',ol.order_id,'lineId',ol.id,'skuId',product.id,'requestedQty',mir_core.warehouse_allocated(org,ol.id),
  'deliveredQty',f.delivered_qty,'cancelledQty',f.cancelled_qty,
  'remainingQty',greatest(0,mir_core.warehouse_allocated(org,ol.id)-f.delivered_qty-f.cancelled_qty),
  'job',coalesce(r.snapshot->>'job',''),'status',o.status
 ) order by o.created_at desc),'[]'::jsonb) into pending
 from mir_core.warehouse_fulfillment f
 join mir_core.order_lines ol on ol.organization_id=f.organization_id and ol.id=f.order_line_id
 join mir_core.orders o on o.organization_id=ol.organization_id and o.id=ol.order_id
 left join mir_core.order_revisions r on r.organization_id=o.organization_id and r.order_id=o.id and r.revision=o.revision
 where f.organization_id=org and f.sku_id=product.id and mir_core.warehouse_allocated(org,ol.id)>f.delivered_qty+f.cancelled_qty and o.status<>'cancelled';
 select coalesce(jsonb_agg(jsonb_build_object('at',m.created_at,'delta',m.delta,'kind',m.kind,
 'reason',m.reason,'actorId',m.actor_id,'orderLineId',m.order_line_id)
 order by m.created_at desc),'[]'::jsonb) into log_rows
 from (select * from mir_core.warehouse_movements where organization_id=org and sku_id=product.id order by created_at desc limit 40)m;
 return jsonb_build_object(
  'sku',jsonb_build_object('id',product.id,'sku',product.sku,'name',product.name,'unit',product.unit,
    'sourceKind',product.source_kind,'sourceRef',product.source_ref,
    'step',product.quantity_step,'qrToken',product.qr_token,'onHand',coalesce(stock.on_hand,0),'revision',stock.revision),
  'orders',pending,'movements',log_rows
 );
end$$;

create or replace function public.mir_warehouse_queue(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare out jsonb;begin
 if not mir_core.warehouse_allowed(org) then raise exception 'Accès Entrepôt requis' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'orderId',c.order_id,'lineId',c.id,'skuId',s.id,'qrToken',s.qr_token,'sku',s.sku,'name',s.name,
 'requestedQty',mir_core.warehouse_allocated(org,c.id),'deliveredQty',f.delivered_qty,
 'remainingQty',greatest(0,mir_core.warehouse_allocated(org,c.id)-f.delivered_qty-f.cancelled_qty),'unit',s.unit,
 'job',coalesce(r.snapshot->>'job','')
 ) order by o.created_at desc),'[]'::jsonb) into out
 from mir_core.warehouse_fulfillment f
 join mir_core.order_lines c on (c.organization_id,c.id)=(f.organization_id,f.order_line_id)
 join mir_core.orders o on (o.organization_id,o.id)=(c.organization_id,c.order_id)
 join mir_core.warehouse_skus s on (s.organization_id,s.id)=(f.organization_id,f.sku_id)
 left join mir_core.order_revisions r on (r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
 where f.organization_id=org and mir_core.warehouse_allocated(org,c.id)>f.delivered_qty+f.cancelled_qty and o.status<>'cancelled';
 return out;
end$$;

create or replace function public.mir_warehouse_move(
 org uuid,qr uuid,line_id uuid,delta numeric,request_id uuid,reason text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare sku_row mir_core.warehouse_skus;balance mir_core.warehouse_stock;
 fulfil mir_core.warehouse_fulfillment;line_row mir_core.order_lines;ord mir_core.orders;
 prior mir_core.warehouse_movements;kind text;rem numeric;out jsonb; note text;begin
 if not mir_core.warehouse_allowed(org) then raise exception 'Accès Entrepôt requis' using errcode='42501';end if;
 if qr is null or request_id is null or delta is null or delta=0 or abs(delta)>100000 or scale(delta)>3 then
  raise exception 'Mouvement invalide' using errcode='22023';end if;
 note:=btrim(coalesce(reason,''));
 if length(note) not between 3 and 300 then raise exception 'Motif requis' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,0));
 select * into prior from mir_core.warehouse_movements
  where organization_id=org and warehouse_movements.request_id=mir_warehouse_move.request_id;
 if found then
  if prior.actor_id<>auth.uid() or prior.delta<>delta or
    prior.order_line_id is distinct from line_id or prior.reason<>note or
    not exists(select 1 from mir_core.warehouse_skus p where p.organization_id=org
    and p.id=prior.sku_id and p.qr_token=qr) then
   raise exception 'La requête a déjà servi pour un mouvement différent' using errcode='40001';end if;
  return jsonb_build_object('movementId',prior.id,'stockAfter',prior.stock_after,
    'remainingAfter',prior.remaining_after,'replayed',true);
 end if;
 select * into sku_row from mir_core.warehouse_skus where organization_id=org and qr_token=qr and not archived;
 if not found then raise exception 'QR de stock inconnu' using errcode='22023';end if;
 if abs(delta)/sku_row.quantity_step<>trunc(abs(delta)/sku_row.quantity_step) then
  raise exception 'Format de vente incompatible avec cette quantité' using errcode='22023';end if;
 if line_id is not null then
  perform co.id from mir_core.coordination_orders co join mir_core.coordination_lines cl on(cl.organization_id,cl.coordination_id)=(co.organization_id,co.id) where cl.organization_id=org and cl.employee_line_id=line_id for update of co;
  if not found then raise exception 'Répartissez cette commande avant de préparer le lot Entrepôt' using errcode='22023';end if;
 end if;
 select * into balance from mir_core.warehouse_stock where organization_id=org and sku_id=sku_row.id for update;
 if not found then raise exception 'Stock non initialisé' using errcode='22023';end if;
 if balance.on_hand+delta<0 then raise exception 'Stock insuffisant' using errcode='22023';end if;
 rem:=null;
 if line_id is not null then
  if delta>=0 then raise exception 'Une livraison est une sortie de stock' using errcode='22023';end if;
  select * into fulfil from mir_core.warehouse_fulfillment where organization_id=org and order_line_id=line_id for update;
  if not found or fulfil.sku_id<>sku_row.id then raise exception 'Ligne non associée à ce QR' using errcode='22023';end if;
  select * into line_row from mir_core.order_lines where organization_id=org and id=line_id;
  select * into ord from mir_core.orders where organization_id=org and id=line_row.order_id;
  if ord.kind<>'employee' or ord.status='cancelled' then raise exception 'Commande non livrable' using errcode='22023';end if;
  rem:=mir_core.warehouse_allocated(org,line_id)-fulfil.delivered_qty-fulfil.cancelled_qty;
  if -delta>rem then raise exception 'Quantité supérieure au reliquat' using errcode='22023';end if;
  update mir_core.warehouse_fulfillment set delivered_qty=delivered_qty-delta,updated_at=now()
   where organization_id=org and order_line_id=line_id;
  rem:=rem+delta;kind:='delivery';
 else
  if delta>0 then kind:='receipt';
  else kind:='adjustment';end if;
 end if;
 update mir_core.warehouse_stock set on_hand=on_hand+delta,revision=revision+1,updated_at=now()
   where organization_id=org and sku_id=sku_row.id;
 insert into mir_core.warehouse_movements(organization_id,sku_id,order_line_id,actor_id,request_id,
  delta,reason,kind,stock_before,stock_after,remaining_after)
 values(org,sku_row.id,line_id,auth.uid(),request_id,delta,note,kind,balance.on_hand,balance.on_hand+delta,rem)
 returning id into prior.id;
 return jsonb_build_object('movementId',prior.id,'stockAfter',balance.on_hand+delta,
   'remainingAfter',rem,'replayed',false);
end$$;


commit;
