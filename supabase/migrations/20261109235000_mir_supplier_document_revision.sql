begin;
create function public.mir_supplier_document_revision(p_po uuid,p_revision integer,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare org uuid;o mir_core.orders;src mir_core.order_revisions;result jsonb;prior jsonb;payload jsonb;begin
 select organization_id into org from mir_core.account_settings where singleton;if not mir_core.coordination_allowed(org) then raise exception 'Coordination requise' using errcode='42501';end if;
 payload:=jsonb_build_object('po',p_po,'revision',p_revision);prior:=mir_core.coordination_replay(org,p_request_id,'po_document_revision',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.orders where organization_id=org and id=p_po and kind='supplier' for update;
 if not found or o.revision<>p_revision or o.status not in('approved','closed') then raise exception 'Révision approuvée courante requise. Actualisez le bon.' using errcode='40001';end if;
 select * into src from mir_core.order_revisions where organization_id=org and order_id=p_po and revision=p_revision;
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot) values(org,p_po,p_revision+1,src.snapshot||jsonb_build_object('documentCorrection',true,'previousRevision',p_revision,'revision',p_revision+1,'correctionNote','Correction de présentation uniquement. Aucune quantité supplémentaire.'));
 insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification,price_cents,model_id,model_version) select organization_id,order_id,p_revision+1,quantity,unit,specification,price_cents,model_id,model_version from mir_core.order_lines where organization_id=org and order_id=p_po and revision=p_revision;
 update mir_core.orders set revision=p_revision+1,status='draft' where organization_id=org and id=p_po;
 insert into mir_core.order_events(organization_id,order_id,event_type,details) values(org,p_po,'document_revision_created',jsonb_build_object('previousRevision',p_revision,'revision',p_revision+1,'quantitiesUnchanged',true));
 result:=jsonb_build_object('orderId',p_po,'revision',p_revision+1);return mir_core.coordination_receipt(org,p_request_id,'po_document_revision',payload,result);
end$$;
revoke all on function public.mir_supplier_document_revision(uuid,integer,uuid) from public,anon;grant execute on function public.mir_supplier_document_revision(uuid,integer,uuid) to authenticated;
commit;
