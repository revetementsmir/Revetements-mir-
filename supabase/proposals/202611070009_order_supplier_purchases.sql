-- MIR Coordination fournisseurs — proposition additive, NON appliquée à la base MIR.
-- Réutilise mir_core.orders(kind='supplier') et mir_core.suppliers. Jamais d'envoi implicite.
begin;

create function public.mir_coordination_suppliers(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare result jsonb;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe MIR requise' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'email',s.email,
  'verified',s.verified_at is not null) order by s.name),'[]'::jsonb) into result
 from mir_core.suppliers s where s.organization_id=org and not s.archived;
 return result;
end$$;

create function public.mir_coordination_metadata(
 org uuid,coord_id uuid,expected_revision integer,vals jsonb,request_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;payload jsonb;prior jsonb;result jsonb;rev integer;
 job text;address text;team text;priority text;notes text;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe MIR requise' using errcode='42501';end if;
 if jsonb_typeof(vals) is distinct from 'object' or vals-array['job','address','team','priority','notes']<>'{}'::jsonb then
 raise exception 'Métadonnées non autorisées' using errcode='22023';end if;
 payload:=jsonb_build_object('coord',coord_id,'revision',expected_revision,'values',vals);
 prior:=mir_core.coordination_replay(org,request_id,'metadata',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 if not found or o.shipped_at is not null then raise exception 'Commande inconnue ou déjà expédiée' using errcode='40001';end if;
 if o.revision<>expected_revision then raise exception 'Commande modifiée : actualiser' using errcode='40001';end if;
 job:=btrim(coalesce(vals->>'job',o.job));address:=btrim(coalesce(vals->>'address',o.delivery_address));
 team:=btrim(coalesce(vals->>'team',o.team));priority:=coalesce(vals->>'priority',o.priority);
 notes:=btrim(coalesce(vals->>'notes',o.notes));
 if length(job)>200 or length(address)>360 or length(team)>200 or length(notes)>800 or priority not in ('normal','urgent')
 then raise exception 'Chantier, livraison ou priorité invalide' using errcode='22023';end if;
 rev:=o.revision+1;
 update mir_core.coordination_orders set job=job,delivery_address=address,team=team,
 priority=priority,notes=notes,revision=rev,updated_at=now()
 where organization_id=org and id=o.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,o.id,rev,'note_changed',jsonb_build_object('job',job,'address',address,'team',team,'priority',priority),auth.uid());
 result:=jsonb_build_object('id',o.id,'revision',rev);
 return mir_core.coordination_receipt(org,request_id,'metadata',payload,result);
end$$;

-- Lier une seule affectation Fournisseur à un nouveau bon ou à un bon
-- fournisseur MIR existant encore brouillon. Une commande employé peut avoir
-- autant de bons différents que nécessaire, dans le même dossier parent.
create function public.mir_coordination_supplier_po(
 org uuid,coord_id uuid,route_id uuid,po_id uuid,expected_revision integer,request_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;r mir_core.coordination_routes;
 l mir_core.coordination_lines;src mir_core.order_lines;
 po mir_core.orders;po_line uuid;new_po boolean:=false;
 payload jsonb;prior jsonb;result jsonb;rev integer;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe MIR requise' using errcode='42501';end if;
 payload:=jsonb_build_object('coord',coord_id,'route',route_id,'po',po_id,'expectedRevision',expected_revision);
 prior:=mir_core.coordination_replay(org,request_id,'supplier_po',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 if not found or o.shipped_at is not null then raise exception 'Commande inconnue ou partie Entrepôt déjà expédiée' using errcode='40001';end if;
 if o.revision<>expected_revision then raise exception 'Commande modifiée : actualiser' using errcode='40001';end if;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id for update;
 select * into l from mir_core.coordination_lines where organization_id=org and id=r.coordination_line_id and coordination_id=o.id;
 if not found or r.route<>'supplier' then raise exception 'Répartition fournisseur introuvable' using errcode='22023';end if;
 if r.supplier_order_id is not null then raise exception 'Bon déjà associé à cette quantité' using errcode='40001';end if;
 if po_id is null then
  insert into mir_core.orders(organization_id,kind,owner_id,supplier_id)
  values(org,'supplier',auth.uid(),r.supplier_id) returning * into po;
  insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot,created_by)
  values(org,po.id,1,jsonb_build_object('sourceEmployeeOrderId',o.employee_order_id,
   'coordinationId',o.id,'job',o.job,'address',o.delivery_address,'team',o.team,
   'poNumber','MIR-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(po.id::text,1,6)),
   'status','draft','needsSupplierConfirmation',true),auth.uid());
  new_po:=true;
 else
  select * into po from mir_core.orders where organization_id=org and id=po_id for update;
  if not found or po.kind<>'supplier' or po.supplier_id<>r.supplier_id or po.status<>'draft' then
   raise exception 'Bon existant fermé ou fournisseur différent' using errcode='22023';end if;
 end if;
 select * into src from mir_core.order_lines where organization_id=org and id=l.employee_line_id;
 if not found then raise exception 'Ligne d origine introuvable' using errcode='22023';end if;
 insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification,model_id,model_version)
 values(org,po.id,po.revision,r.quantity,l.unit,src.specification||
  jsonb_build_object('sourceEmployeeOrderId',o.employee_order_id,'coordinationOrderId',o.id,
   'coordinationRouteId',r.id,'job',o.job,'address',o.delivery_address,'needsProductionReview',true),
  src.model_id,src.model_version) returning id into po_line;
 update mir_core.coordination_routes set supplier_order_id=po.id,supplier_line_id=po_line
 where organization_id=org and id=r.id;
 rev:=o.revision+1;update mir_core.coordination_orders set revision=rev,updated_at=now()
 where organization_id=org and id=o.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,o.id,rev,'po_linked',jsonb_build_object('supplierId',r.supplier_id,'poId',po.id,
  'poLineId',po_line,'lineId',l.id,'quantity',r.quantity),auth.uid());
 result:=jsonb_build_object('revision',rev,'supplierOrderId',po.id,'supplierLineId',po_line,
  'created',new_po,'status','draft','sent',false);
 return mir_core.coordination_receipt(org,request_id,'supplier_po',payload,result);
end$$;

-- Réception fournisseur distincte de la sortie Entrepôt : une livraison de
-- fabricant ne crée AUCUN mouvement physique de stock sans scan explicite.
create function public.mir_coordination_supplier_receive(
 org uuid,coord_id uuid,route_id uuid,quantity numeric,expected_revision integer,request_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;r mir_core.coordination_routes;
 l mir_core.coordination_lines;rev integer;payload jsonb;prior jsonb;result jsonb;begin
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
 update mir_core.coordination_routes set received_qty=received_qty+quantity where organization_id=org and id=r.id;
 rev:=o.revision+1;update mir_core.coordination_orders set revision=rev,updated_at=now() where organization_id=org and id=o.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,o.id,rev,'supplier_received',jsonb_build_object('supplierId',r.supplier_id,'poId',r.supplier_order_id,
  'lineId',l.id,'receivedQty',quantity,'totalReceived',r.received_qty+quantity),auth.uid());
 result:=jsonb_build_object('revision',rev,'receivedQty',r.received_qty+quantity,
  'remainingQty',r.quantity-r.received_qty-quantity);
 return mir_core.coordination_receipt(org,request_id,'supplier_receive',payload,result);
end$$;

do $$declare item record;begin
 for item in select * from (values
  ('public.mir_coordination_suppliers(uuid)'),
  ('public.mir_coordination_metadata(uuid,uuid,integer,jsonb,uuid)'),
  ('public.mir_coordination_supplier_po(uuid,uuid,uuid,uuid,integer,uuid)'),
  ('public.mir_coordination_supplier_receive(uuid,uuid,uuid,numeric,integer,uuid)')
 ) as signatures(signature) loop
 execute format('revoke all on function %s from public,anon',item.signature);
 execute format('grant execute on function %s to authenticated',item.signature);
 end loop;
end$$;
commit;