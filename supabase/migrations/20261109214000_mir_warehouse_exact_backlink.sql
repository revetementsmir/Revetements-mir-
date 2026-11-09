begin;
create or replace function public.mir_warehouse_register(org uuid,kind text,source_ref text,sku_code text,display_name text,unit_name text,step numeric)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare sku_row mir_core.warehouse_skus;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if kind not in ('hardware','bending') or source_ref is null or length(btrim(source_ref)) not between 1 and 300
  or sku_code is null or sku_code !~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$'
  or display_name is null or length(btrim(display_name)) not between 1 and 180
  or unit_name is null or length(btrim(unit_name)) not between 1 and 40
  or step is null or step<=0 or step>1000 or scale(step)>3 then
  raise exception 'Référence de stock invalide' using errcode='22023';
 end if;
 if kind='bending' and not exists(
   select 1 from mir_core.models m where m.organization_id=org
   and m.id::text=source_ref and not m.archived
 ) then raise exception 'Moulure introuvable dans Mes pliages partagés' using errcode='22023';end if;
 insert into mir_core.warehouse_skus(organization_id,source_kind,source_ref,sku,name,unit,quantity_step)
 values(org,kind,source_ref,sku_code,btrim(display_name),btrim(unit_name),step)
 on conflict on constraint warehouse_skus_organization_id_source_kind_source_ref_key do nothing;
 select * into sku_row from mir_core.warehouse_skus
 where organization_id=org and source_kind=kind and warehouse_skus.source_ref=mir_warehouse_register.source_ref;
 if sku_row.sku<>sku_code or sku_row.name<>btrim(display_name) or sku_row.unit<>btrim(unit_name) or sku_row.quantity_step<>step then
  raise exception 'Référence existante : aucune modification silencieuse de SKU/QR' using errcode='40001';end if;
 insert into mir_core.warehouse_stock(organization_id,sku_id) values(org,sku_row.id) on conflict do nothing;
 insert into mir_core.warehouse_fulfillment(organization_id,order_line_id,sku_id)
 select org,l.id,sku_row.id from mir_core.order_lines l join mir_core.orders o on(o.organization_id,o.id)=(l.organization_id,l.order_id) where l.organization_id=org and o.kind='employee' and o.status<>'cancelled' and coalesce(l.specification->>'stockKey',l.specification->>'inventoryKey')=sku_row.source_ref and l.unit=sku_row.unit and mod(l.quantity,sku_row.quantity_step)=0 on conflict do nothing;
 return jsonb_build_object('id',sku_row.id,'sku',sku_row.sku,'qrToken',sku_row.qr_token);
end$$;


commit;
