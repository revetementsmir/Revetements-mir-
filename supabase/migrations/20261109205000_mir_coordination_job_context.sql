begin;
create or replace function public.mir_coordination_supplier_po(
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
 if not found then raise exception 'Commande inconnue' using errcode='22023';end if;
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
 if not new_po and not exists(select 1 from mir_core.order_revisions v where v.organization_id=org and v.order_id=po.id and v.revision=po.revision and v.snapshot->>'job'=o.job and v.snapshot->>'address'=o.delivery_address) then raise exception 'Le bon doit correspondre au même job et à la même adresse de livraison' using errcode='22023';end if;
 update mir_core.orders set job_id=(select job_id from mir_core.orders where organization_id=org and id=o.employee_order_id),order_number=(select snapshot->>'poNumber' from mir_core.order_revisions where organization_id=org and order_id=po.id and revision=po.revision) where organization_id=org and id=po.id;
 select * into src from mir_core.order_lines where organization_id=org and id=l.employee_line_id;
 if not found then raise exception 'Ligne d origine introuvable' using errcode='22023';end if;
 insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification,model_id,model_version)
 values(org,po.id,po.revision,r.quantity,l.unit,src.specification||
  jsonb_build_object('sourceEmployeeOrderId',o.employee_order_id,'coordinationOrderId',o.id,
   'coordinationRouteId',r.id,'job',o.job,'address',o.delivery_address,'needsProductionReview',true),
  src.model_id,src.model_version) returning id into po_line;
 update mir_core.coordination_routes set supplier_order_id=po.id,supplier_line_id=po_line,
 production_status='ordered' where organization_id=org and id=r.id;
 rev:=o.revision+1;update mir_core.coordination_orders set revision=rev,updated_at=now()
 where organization_id=org and id=o.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,o.id,rev,'po_linked',jsonb_build_object('supplierId',r.supplier_id,'poId',po.id,
  'poLineId',po_line,'lineId',l.id,'quantity',r.quantity),auth.uid());
 result:=jsonb_build_object('revision',rev,'supplierOrderId',po.id,'supplierLineId',po_line,
  'created',new_po,'status','draft','sent',false);
 return mir_core.coordination_receipt(org,request_id,'supplier_po',payload,result);
end$$;


alter table mir_core.coordination_routes add column expected_date date,add column responsible_id uuid references auth.users,add column receipt_destination text not null default 'job' check(receipt_destination in('job','stock'));
create function public.mir_coordination_expectation(org uuid,route_id uuid,expected_date date,responsible uuid,destination text,expected_revision integer,request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare c mir_core.coordination_orders;r mir_core.coordination_routes;payload jsonb;prior jsonb;result jsonb;begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe requise' using errcode='42501';end if;
 payload:=jsonb_build_object('route',route_id,'date',expected_date,'responsible',responsible,'destination',destination,'revision',expected_revision);prior:=mir_core.coordination_replay(org,request_id,'expectation',payload);if prior is not null then return prior;end if;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id;
 select co.* into c from mir_core.coordination_orders co join mir_core.coordination_lines l on(l.organization_id,l.coordination_id)=(co.organization_id,co.id) where co.organization_id=org and l.id=r.coordination_line_id for update of co;
 if not found or c.revision<>expected_revision then raise exception 'Commande modifiée. Actualisez.' using errcode='40001';end if;
 if r.route<>'supplier' or destination not in('job','stock') or (r.received_qty>0 and destination<>r.receipt_destination) then raise exception 'Destination invalide ou réception commencée' using errcode='22023';end if;
 if responsible is not null and not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=responsible and m.active and (m.role='admin' or exists(select 1 from mir_core.coordination_access a where a.organization_id=org and a.user_id=m.user_id and a.active))) then raise exception 'Responsable non autorisé' using errcode='42501';end if;
 update mir_core.coordination_routes set expected_date=mir_coordination_expectation.expected_date,responsible_id=responsible,receipt_destination=destination where organization_id=org and id=route_id;
 update mir_core.coordination_orders set revision=revision+1,updated_at=now() where organization_id=org and id=c.id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id) values(org,c.id,c.revision+1,'note_changed',payload,auth.uid());
 result:=jsonb_build_object('revision',c.revision+1);return mir_core.coordination_receipt(org,request_id,'expectation',payload,result);
end$$;
revoke all on function public.mir_coordination_expectation(uuid,uuid,date,uuid,text,integer,uuid) from public,anon;grant execute on function public.mir_coordination_expectation(uuid,uuid,date,uuid,text,integer,uuid) to authenticated;
create function public.mir_job_blockers(p_job_id uuid default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;out jsonb;begin
 select organization_id into org from mir_core.account_settings where singleton;
 if not mir_core.has_role(org,array['admin','employee']) then raise exception 'Accès équipe requis' using errcode='42501';end if;
 select coalesce(jsonb_agg(x),'[]') into out from(select jsonb_build_object('jobId',o.job_id,'orderId',o.id,'coordinationId',c.id,'routeId',r.id,'supplierOrderId',r.supplier_order_id,'quantity',r.quantity-r.received_qty,'unit',l.unit,'name',l.item_name,'expectedDate',r.expected_date,'overdue',r.expected_date<current_date,'responsible',coalesce(p.name,case when m.role='admin' then 'Administration' end,'Adjointe à attribuer'),'destination',r.receipt_destination,'message',(r.quantity-r.received_qty)::text||' '||l.unit||' attendus du fournisseur · '||coalesce(r.expected_date::text,'Date à confirmer')||' · suivi par '||coalesce(p.name,case when m.role='admin' then 'l’administration' end,'l’adjointe à attribuer')) x from mir_core.orders o join mir_core.coordination_orders c on(c.organization_id,c.employee_order_id)=(o.organization_id,o.id) join mir_core.coordination_lines l on(l.organization_id,l.coordination_id)=(c.organization_id,c.id) join mir_core.coordination_routes r on(r.organization_id,r.coordination_line_id)=(l.organization_id,l.id) left join mir_core.staff_profiles p on p.organization_id=org and p.user_id=r.responsible_id left join mir_core.memberships m on m.organization_id=org and m.user_id=r.responsible_id where o.organization_id=org and r.route='supplier' and r.received_qty<r.quantity and (p_job_id is null or o.job_id=p_job_id) and (mir_core.coordination_allowed(org) or mir_core.job_allowed(org,o.job_id))) q;return out;
end$$;
revoke all on function public.mir_job_blockers(uuid) from public,anon;grant execute on function public.mir_job_blockers(uuid) to authenticated;
commit;
