begin;
alter table mir_core.send_jobs add column lease_until timestamptz;
alter table mir_core.send_jobs add column attempts integer not null default 0;
alter table mir_core.send_jobs add column last_error text;
alter table mir_core.send_jobs add column approved_snapshot jsonb;
alter table mir_core.send_jobs add constraint send_jobs_global_id unique(id);
create function mir_core.reset_supplier_verification() returns trigger
language plpgsql set search_path=pg_catalog,mir_core as $$
begin
  if new.email is distinct from old.email then new.verified_at:=null; end if;
  return new;
end $$;
revoke all on function mir_core.reset_supplier_verification() from public;
create trigger supplier_contact_changed before update of email on mir_core.suppliers
  for each row execute function mir_core.reset_supplier_verification();
-- Browser callers cannot supply HTML, attachment bytes, sender or a forged role.
create function mir_core.queue_supplier_pdf(org uuid, po uuid, expected_revision integer,
  document uuid, request_id uuid, confirmed_recipient text) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.orders; s mir_core.suppliers; d mir_core.documents; job mir_core.send_jobs; snapshot jsonb;
begin
  if not mir_core.has_role(org,array['admin']) then raise exception 'Admin actif requis' using errcode='42501'; end if;
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
revoke all on function mir_core.queue_supplier_pdf(uuid,uuid,integer,uuid,uuid,text) from public;
grant execute on function mir_core.queue_supplier_pdf(uuid,uuid,integer,uuid,uuid,text) to authenticated;
commit;
