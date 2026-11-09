begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mir-supplier-documents','mir-supplier-documents',false,20971520,array['application/pdf']) on conflict(id) do nothing;
create function mir_core.supplier_pdf_access(path text,write_access boolean) returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;po uuid;rev integer;begin if array_length(string_to_array(path,'/'),1)<>4 then return false;end if;org:=split_part(path,'/',1)::uuid;po:=split_part(path,'/',2)::uuid;rev:=split_part(path,'/',3)::integer;
 return mir_core.coordination_allowed(org) and exists(select 1 from mir_core.orders o where o.organization_id=org and o.id=po and o.kind='supplier' and (not write_access or (o.status='draft' and o.revision=rev))) and (not write_access or split_part(path,'/',4)~'^[0-9a-f-]{36}\.pdf$');exception when invalid_text_representation then return false;end$$;
revoke all on function mir_core.supplier_pdf_access(text,boolean) from public,anon;grant execute on function mir_core.supplier_pdf_access(text,boolean) to authenticated;
create policy mir_supplier_pdf_read on storage.objects for select to authenticated using(bucket_id='mir-supplier-documents' and mir_core.supplier_pdf_access(name,false));
create policy mir_supplier_pdf_insert on storage.objects for insert to authenticated with check(bucket_id='mir-supplier-documents' and mir_core.supplier_pdf_access(name,true));
create function public.mir_supplier_po_detail(p_po uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;out jsonb;begin select organization_id into org from mir_core.account_settings where singleton;if not mir_core.coordination_allowed(org) then raise exception 'Coordination requise' using errcode='42501';end if;
 select to_jsonb(o)||jsonb_build_object('snapshot',r.snapshot,'supplier',to_jsonb(s),'lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from mir_core.order_lines l where l.organization_id=org and l.order_id=o.id and l.revision=o.revision),'documents',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from mir_core.documents d where d.organization_id=org and d.order_id=o.id),'sendJobs',(select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'revision',j.revision,'status',j.status,'messageId',j.provider_message_id,'error',j.last_error)),'[]') from mir_core.send_jobs j where j.organization_id=org and j.order_id=o.id),'receivedQty',coalesce((select sum(cr.received_qty) from mir_core.coordination_routes cr where cr.organization_id=org and cr.supplier_order_id=o.id),0),'expectedQty',coalesce((select sum(cr.quantity) from mir_core.coordination_routes cr where cr.organization_id=org and cr.supplier_order_id=o.id),0)) into out from mir_core.orders o join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision) join mir_core.suppliers s on(s.organization_id,s.id)=(o.organization_id,o.supplier_id) where o.organization_id=org and o.id=p_po and o.kind='supplier';if out is null then raise exception 'Bon introuvable' using errcode='42501';end if;return out;
end$$;
create function public.mir_supplier_approve(p_po uuid,p_revision integer,p_path text,p_sha256 text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare org uuid;o mir_core.orders;d mir_core.documents;begin
 select organization_id into org from mir_core.account_settings where singleton;if not mir_core.coordination_allowed(org) then raise exception 'Coordination requise' using errcode='42501';end if;
 select * into o from mir_core.orders where organization_id=org and id=p_po and kind='supplier' for update;
 if not found or o.revision<>p_revision then raise exception 'Révision modifiée. Actualisez le bon.' using errcode='40001';end if;
 select * into d from mir_core.documents where organization_id=org and order_id=p_po and revision=p_revision;
 if found then if d.object_path<>p_path or d.sha256<>p_sha256 then raise exception 'PDF déjà figé. Créez une révision.' using errcode='40001';end if;return to_jsonb(d);end if;
 if o.status<>'draft' or p_sha256!~'^[a-f0-9]{64}$' or split_part(p_path,'/',2)<>p_po::text or split_part(p_path,'/',3)<>p_revision::text or not mir_core.supplier_pdf_access(p_path,true) or not exists(select 1 from storage.objects where bucket_id='mir-supplier-documents' and name=p_path and owner_id=auth.uid()::text and (metadata->>'size')::bigint between 1 and 20971520) then raise exception 'PDF privé de cette révision requis' using errcode='22023';end if;
 insert into mir_core.documents(organization_id,order_id,revision,object_path,sha256) values(org,p_po,p_revision,p_path,p_sha256) returning * into d;
 update mir_core.orders set status='approved' where organization_id=org and id=p_po;
 insert into mir_core.order_events(organization_id,order_id,event_type,details) values(org,p_po,'approved',jsonb_build_object('documentId',d.id,'revision',p_revision));return to_jsonb(d);
end$$;
create or replace function mir_core.queue_supplier_pdf(org uuid, po uuid, expected_revision integer,
  document uuid, request_id uuid, confirmed_recipient text) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.orders; s mir_core.suppliers; d mir_core.documents; job mir_core.send_jobs; snapshot jsonb;
begin
  if not mir_core.coordination_allowed(org) then raise exception 'Admin actif requis' using errcode='42501'; end if;
  select * into o from mir_core.orders where organization_id=org and id=po for update;
  if not found or o.kind<>'supplier' or o.status<>'approved' or o.revision<>expected_revision then
    raise exception 'Bon approuvé et révision courante requis' using errcode='22023'; end if;
  select * into s from mir_core.suppliers where organization_id=org and id=o.supplier_id;
  if s.archived or s.verified_at is null or s.email is null or s.email !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+\.[^[:space:]<>@]+$'
    or s.email is distinct from confirmed_recipient then raise exception 'Destinataire non confirmé' using errcode='22023'; end if;
  select * into d from mir_core.documents where organization_id=org and id=document and order_id=po and revision=expected_revision;
  if not found then raise exception 'PDF de la révision requis' using errcode='22023'; end if;
  select r.snapshot into snapshot from mir_core.order_revisions r where r.organization_id=org and r.order_id=po and r.revision=expected_revision;
  select * into job from mir_core.send_jobs where organization_id=org and idempotency_key=request_id;
  if found then
    if job.order_id<>po or job.revision<>expected_revision or job.document_id<>document or job.recipient<>confirmed_recipient then
      raise exception 'Identifiant déjà utilisé pour une autre demande' using errcode='22023'; end if;
    return job.id;
  end if;
  select * into job from mir_core.send_jobs where organization_id=org and order_id=po and revision=expected_revision and operation='purchase-order';
  if found then
    if job.document_id<>document or job.recipient<>confirmed_recipient then raise exception 'Révision déjà préparée avec un autre PDF/contact' using errcode='22023'; end if;
    return job.id;
  end if;
  insert into mir_core.send_jobs(organization_id,order_id,revision,document_id,operation,idempotency_key,recipient,approved_snapshot)
    values(org,po,expected_revision,document,'purchase-order',request_id,confirmed_recipient,snapshot) returning id into job.id;
  insert into mir_core.order_events(organization_id,order_id,event_type,details)
    values(org,po,'send-queued',jsonb_build_object('jobId',job.id,'revision',expected_revision));
  return job.id;
end $$;
create function public.mir_supplier_queue(p_po uuid,p_revision integer,p_document uuid,p_request_id uuid) returns uuid language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare org uuid;email text;begin select organization_id into org from mir_core.account_settings where singleton;if not mir_core.coordination_allowed(org) then raise exception 'Coordination requise' using errcode='42501';end if;select s.email into email from mir_core.orders o join mir_core.suppliers s on(s.organization_id,s.id)=(o.organization_id,o.supplier_id) where o.organization_id=org and o.id=p_po;return mir_core.queue_supplier_pdf(org,p_po,p_revision,p_document,p_request_id,email);end$$;
alter table mir_core.send_jobs add column first_attempt_at timestamptz;
create function public.mir_supplier_dispatch_rpc(action text,body jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare j mir_core.send_jobs;d mir_core.documents;begin
 if action='claim' then
  select * into j from mir_core.send_jobs where id=(body->>'id')::uuid for update;
  if not found then raise exception 'NOT_FOUND';end if;
  if j.status in('accepted','delivered') then return jsonb_build_object('job',to_jsonb(j));end if;
  if j.status='processing' and j.lease_until>now() then raise exception 'BUSY';end if;
  if j.first_attempt_at<now()-interval '23 hours' then raise exception 'RECONCILIATION_REQUIRED';end if;
  update mir_core.send_jobs set status='processing',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,lease_until=now()+interval '130 seconds' where id=j.id returning * into j;
  select * into d from mir_core.documents where organization_id=j.organization_id and id=j.document_id;
  return jsonb_build_object('job',to_jsonb(j),'document',to_jsonb(d));
 elsif action='complete' then
  select * into j from mir_core.send_jobs where id=(body->>'id')::uuid for update;
  if not found then raise exception 'NOT_FOUND';end if;
  if j.status in('accepted','delivered') then return to_jsonb(j);end if;
  if j.attempts<>(body->>'attempt')::integer or j.status<>'processing' then raise exception 'BUSY';end if;
  if body->>'status' not in('accepted','failed','uncertain') then raise exception 'INVALID';end if;
  if body->>'status'='accepted' and coalesce(body->>'messageId','')='' then raise exception 'INVALID';end if;
  update mir_core.send_jobs set status=body->>'status',provider_message_id=body->>'messageId',last_error=left(body->>'error',500),lease_until=null where id=j.id returning * into j;
  insert into mir_core.send_attempts(organization_id,job_id,status,provider_message_id) values(j.organization_id,j.id,j.status,j.provider_message_id);
  if j.status='accepted' then insert into mir_core.order_events(organization_id,order_id,event_type,actor_id,details) values(j.organization_id,j.order_id,'supplier_email_accepted',(select owner_id from mir_core.orders where organization_id=j.organization_id and id=j.order_id),jsonb_build_object('sendJobId',j.id,'messageId',j.provider_message_id,'revision',j.revision));end if;
  return to_jsonb(j);
 end if;raise exception 'INVALID';
end$$;
revoke all on function public.mir_supplier_dispatch_rpc(text,jsonb) from public,anon,authenticated;grant execute on function public.mir_supplier_dispatch_rpc(text,jsonb) to service_role;
revoke all on function public.mir_supplier_po_detail(uuid),public.mir_supplier_approve(uuid,integer,text,text),public.mir_supplier_queue(uuid,integer,uuid,uuid) from public,anon;grant execute on function public.mir_supplier_po_detail(uuid),public.mir_supplier_approve(uuid,integer,text,text),public.mir_supplier_queue(uuid,integer,uuid,uuid) to authenticated;
commit;
