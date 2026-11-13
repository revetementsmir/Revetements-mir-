-- Phase 6 Commandes: compléments additifs sur la source de vérité orders/coordination.
-- Aucun envoi fournisseur externe n'est déclenché par cette migration.
begin;

do $$ begin
 if to_regclass('mir_core.orders') is null
    or to_regclass('mir_core.coordination_orders') is null
    or to_regclass('mir_core.warehouse_stock') is null then
  raise exception 'Socle Commandes/Coordination/Entrepôt absent: installation refusée';
 end if;
end $$;

alter table mir_core.coordination_orders
 add column if not exists requested_for date,
 add column if not exists responsible_id uuid references auth.users(id),
 add column if not exists decision_status text not null default 'submitted',
 add column if not exists decision_reason text not null default '';

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.coordination_orders'::regclass and conname='coordination_orders_decision_status_check') then
  alter table mir_core.coordination_orders add constraint coordination_orders_decision_status_check
   check(decision_status in ('submitted','needs_clarification','approved','refused','cancelled'));
 end if;
end $$;

alter table mir_core.coordination_routes
 add column if not exists supplier_reference text,
 add column if not exists expected_on date,
 add column if not exists unit_price_cents bigint,
 add column if not exists tax_cents bigint,
 add column if not exists fee_cents bigint,
 add column if not exists shortage_qty numeric(15,3) not null default 0,
 add column if not exists damaged_qty numeric(15,3) not null default 0,
 add column if not exists substitution jsonb;

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.coordination_routes'::regclass and conname='coordination_routes_phase6_amounts_check') then
  alter table mir_core.coordination_routes add constraint coordination_routes_phase6_amounts_check
   check(coalesce(unit_price_cents,0)>=0 and coalesce(tax_cents,0)>=0 and coalesce(fee_cents,0)>=0
    and shortage_qty>=0 and damaged_qty>=0 and shortage_qty+damaged_qty<=quantity
    and (substitution is null or jsonb_typeof(substitution)='object'));
 end if;
end $$;

create table if not exists mir_core.order_attachments(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 order_id uuid not null,
 object_path text not null,
 file_name text not null check(length(file_name) between 1 and 240),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,object_path),
 foreign key(organization_id,order_id) references mir_core.orders(organization_id,id)
);

create table if not exists mir_core.order_receipts(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 coordination_id uuid not null,
 route_id uuid not null,
 request_id uuid not null,
 received_qty numeric(15,3) not null check(received_qty>=0),
 damaged_qty numeric(15,3) not null default 0 check(damaged_qty>=0),
 note text not null default '' check(length(note)<=500),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,request_id),
 foreign key(organization_id,coordination_id) references mir_core.coordination_orders(organization_id,id),
 foreign key(organization_id,route_id) references mir_core.coordination_routes(organization_id,id)
);

alter table mir_core.order_attachments enable row level security;
alter table mir_core.order_receipts enable row level security;
revoke all on mir_core.order_attachments,mir_core.order_receipts from public,anon,authenticated;
grant select on mir_core.order_attachments,mir_core.order_receipts to authenticated;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='mir_core' and tablename='order_attachments' and policyname='order_attachments_read') then
  create policy order_attachments_read on mir_core.order_attachments for select to authenticated
   using(mir_core.can_read_order(organization_id,order_id) or mir_core.coordination_allowed(organization_id) or mir_core.warehouse_allowed(organization_id));
 end if;
 if not exists(select 1 from pg_policies where schemaname='mir_core' and tablename='order_receipts' and policyname='order_receipts_read') then
  create policy order_receipts_read on mir_core.order_receipts for select to authenticated
   using(mir_core.coordination_allowed(organization_id) or mir_core.warehouse_allowed(organization_id));
 end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mir-order-files','mir-order-files',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,
 allowed_mime_types=array['image/jpeg','image/png','application/pdf'];

create or replace function mir_core.phase6_order_visible(org uuid,order_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select auth.uid() is not null and (
  mir_core.can_read_order(org,order_id)
  or mir_core.coordination_allowed(org)
  or mir_core.warehouse_allowed(org)
 );
$$;
revoke all on function mir_core.phase6_order_visible(uuid,uuid) from public,anon;
grant execute on function mir_core.phase6_order_visible(uuid,uuid) to authenticated;

create or replace function public.mir_order_attach(org uuid,order_id uuid,object_path text,file_name text,mime_type text,size_bytes bigint,sha256 text,request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core,storage as $$
declare actor uuid:=auth.uid();a mir_core.order_attachments;expected text;payload jsonb;prior jsonb;
begin
 if actor is null or request_id is null or mime_type not in('image/jpeg','image/png','application/pdf')
    or size_bytes not between 1 and 10485760 or sha256!~'^[a-f0-9]{64}$' then
  raise exception 'Pièce jointe invalide' using errcode='22023';
 end if;
 if not mir_core.phase6_order_visible(org,order_id) then raise exception 'Commande non disponible' using errcode='42501';end if;
 payload:=jsonb_build_object('orderId',order_id,'path',object_path,'fileName',left(file_name,240),'mimeType',mime_type,'sizeBytes',size_bytes,'sha256',sha256);
 prior:=mir_core.coordination_replay(org,request_id,'phase6_attach',payload);if prior is not null then return prior;end if;
 expected:=org||'/'||order_id||'/'||actor||'/';
 if object_path not like expected||'%' then raise exception 'Chemin de fichier invalide' using errcode='42501';end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='mir-order-files' and o.name=object_path
  and coalesce(o.owner_id,o.owner::text)=actor::text and coalesce(o.metadata->>'mimetype','')=mime_type
  and coalesce((o.metadata->>'size')::bigint,-1)=size_bytes) then
  raise exception 'Fichier absent ou métadonnées invalides' using errcode='22023';
 end if;
 insert into mir_core.order_attachments(organization_id,order_id,object_path,file_name,mime_type,size_bytes,sha256,created_by)
 values(org,order_id,object_path,left(file_name,240),mime_type,size_bytes,sha256,actor) returning * into a;
 return mir_core.coordination_receipt(org,request_id,'phase6_attach',payload,jsonb_build_object('id',a.id,'idempotent',false));
end $$;

create or replace function public.mir_order_attachment_access(org uuid,attachment_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare a mir_core.order_attachments;
begin
 select * into a from mir_core.order_attachments where organization_id=org and id=attachment_id;
 if not found or not mir_core.phase6_order_visible(org,a.order_id) then raise exception 'Pièce jointe non disponible' using errcode='42501';end if;
 return jsonb_build_object('bucket','mir-order-files','path',a.object_path,'expiresIn',120);
end $$;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mir_order_files_read') then
  create policy mir_order_files_read on storage.objects for select to authenticated using(
   bucket_id='mir-order-files'
   and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
   and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
   and mir_core.phase6_order_visible(((storage.foldername(name))[1])::uuid,((storage.foldername(name))[2])::uuid)
  );
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mir_order_files_write') then
  create policy mir_order_files_write on storage.objects for insert to authenticated with check(
   bucket_id='mir-order-files' and owner_id=auth.uid()::text
   and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
   and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
   and mir_core.phase6_order_visible(((storage.foldername(name))[1])::uuid,((storage.foldername(name))[2])::uuid)
  );
 end if;
end $$;

create or replace function public.mir_order_decide(org uuid,coord_id uuid,next_status text,reason text,request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare row_order mir_core.coordination_orders;prior jsonb;payload jsonb;result jsonb;rev integer;
begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe, Boss ou Admin requis' using errcode='42501';end if;
 if next_status not in ('needs_clarification','approved','refused','cancelled') then raise exception 'Décision invalide' using errcode='22023';end if;
 if next_status in ('needs_clarification','refused','cancelled') and length(btrim(coalesce(reason,'')))<3 then raise exception 'Motif requis' using errcode='22023';end if;
 payload:=jsonb_build_object('coordinationId',coord_id,'status',next_status,'reason',btrim(coalesce(reason,'')));
 prior:=mir_core.coordination_replay(org,request_id,'phase6_decide',payload);if prior is not null then return prior;end if;
 select * into row_order from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 if not found or row_order.decision_status in ('refused','cancelled') then raise exception 'Commande introuvable ou déjà décidée' using errcode='40001';end if;
 rev:=row_order.revision+1;
 update mir_core.coordination_orders set decision_status=next_status,decision_reason=btrim(coalesce(reason,'')),revision=rev,updated_at=now() where organization_id=org and id=coord_id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,coord_id,rev,'note_changed',jsonb_build_object('phase6Action','decision','previous',row_order.decision_status,'status',next_status,'reason',btrim(coalesce(reason,''))),auth.uid());
 result:=jsonb_build_object('id',coord_id,'revision',rev,'status',next_status);
 return mir_core.coordination_receipt(org,request_id,'phase6_decide',payload,result);
end $$;

create or replace function public.mir_order_supplier_confirm(org uuid,coord_id uuid,route_id uuid,reference text,expected_date date,price_cents bigint,taxes_cents bigint,fees_cents bigint,request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;r mir_core.coordination_routes;payload jsonb;prior jsonb;result jsonb;rev integer;
begin
 if not mir_core.coordination_allowed(org) then raise exception 'Adjointe, Boss ou Admin requis' using errcode='42501';end if;
 if length(btrim(coalesce(reference,''))) not between 1 and 120 or coalesce(price_cents,0)<0 or coalesce(taxes_cents,0)<0 or coalesce(fees_cents,0)<0 then raise exception 'Confirmation fournisseur invalide' using errcode='22023';end if;
 payload:=jsonb_build_object('coordinationId',coord_id,'routeId',route_id,'reference',btrim(reference),'expectedDate',expected_date,'priceCents',price_cents,'taxCents',taxes_cents,'feeCents',fees_cents);
 prior:=mir_core.coordination_replay(org,request_id,'phase6_supplier_confirm',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id and route='supplier' for update;
 if not found or r.supplier_order_id is null or not exists(select 1 from mir_core.coordination_lines l where l.organization_id=org and l.id=r.coordination_line_id and l.coordination_id=coord_id) then raise exception 'Route fournisseur invalide' using errcode='22023';end if;
 rev:=o.revision+1;
 update mir_core.coordination_routes set supplier_reference=btrim(reference),expected_on=expected_date,unit_price_cents=price_cents,tax_cents=taxes_cents,fee_cents=fees_cents,production_status=case when production_status='to_order' then 'ordered' else production_status end where organization_id=org and id=route_id;
 update mir_core.coordination_orders set revision=rev,updated_at=now() where organization_id=org and id=coord_id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,coord_id,rev,'supplier_status',jsonb_build_object('phase6Action','confirmation','routeId',route_id,'reference',btrim(reference),'expectedDate',expected_date),auth.uid());
 result:=jsonb_build_object('id',coord_id,'revision',rev,'reference',btrim(reference),'sent',false);
 return mir_core.coordination_receipt(org,request_id,'phase6_supplier_confirm',payload,result);
end $$;

create or replace function public.mir_order_issue(org uuid,coord_id uuid,route_id uuid,shortage numeric,damaged numeric,substitution jsonb,reason text,request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.coordination_orders;r mir_core.coordination_routes;payload jsonb;prior jsonb;result jsonb;rev integer;
begin
 if not (mir_core.coordination_allowed(org) or mir_core.warehouse_allowed(org)) then raise exception 'Opération non autorisée' using errcode='42501';end if;
 if coalesce(shortage,0)<0 or coalesce(damaged,0)<0 or coalesce(shortage,0)+coalesce(damaged,0)>100000 or length(btrim(coalesce(reason,'')))<3 or (substitution is not null and jsonb_typeof(substitution)<>'object') then raise exception 'Rupture ou substitution invalide' using errcode='22023';end if;
 payload:=jsonb_build_object('coordinationId',coord_id,'routeId',route_id,'shortage',shortage,'damaged',damaged,'substitution',substitution,'reason',btrim(reason));
 prior:=mir_core.coordination_replay(org,request_id,'phase6_issue',payload);if prior is not null then return prior;end if;
 select * into o from mir_core.coordination_orders where organization_id=org and id=coord_id for update;
 select * into r from mir_core.coordination_routes where organization_id=org and id=route_id for update;
 if not found or coalesce(shortage,0)+coalesce(damaged,0)>r.quantity then raise exception 'Quantités supérieures à la route' using errcode='22023';end if;
 rev:=o.revision+1;
 update mir_core.coordination_routes set shortage_qty=coalesce(shortage,0),damaged_qty=coalesce(damaged,0),substitution=mir_order_issue.substitution,notes=btrim(reason) where organization_id=org and id=route_id;
 update mir_core.coordination_orders set revision=rev,updated_at=now() where organization_id=org and id=coord_id;
 insert into mir_core.coordination_events(organization_id,coordination_id,revision,event_type,payload,actor_id)
 values(org,coord_id,rev,'note_changed',jsonb_build_object('phase6Action','issue','routeId',route_id,'shortage',shortage,'damaged',damaged,'substitution',substitution,'reason',btrim(reason)),auth.uid());
 result:=jsonb_build_object('id',coord_id,'revision',rev,'shortage',shortage,'damaged',damaged);
 return mir_core.coordination_receipt(org,request_id,'phase6_issue',payload,result);
end $$;

create or replace function public.mir_coordination_detail(org uuid,coord_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare out jsonb;co mir_core.coordination_orders;begin
 if not(mir_core.coordination_allowed(org) or mir_core.warehouse_allowed(org)) then raise exception 'Accès interdit' using errcode='42501';end if;
 select * into co from mir_core.coordination_orders where organization_id=org and id=coord_id;
 if not found then raise exception 'Commande introuvable' using errcode='22023';end if;
 select jsonb_build_object('id',co.id,'sourceOrderId',co.employee_order_id,'revision',co.revision,
  'job',co.job,'address',co.delivery_address,'team',co.team,'priority',co.priority,
  'requestedFor',co.requested_for,'responsibleId',co.responsible_id,'decisionStatus',co.decision_status,
  'decisionReason',co.decision_reason,'shippedAt',co.shipped_at,
  'notes',case when mir_core.coordination_allowed(org) then co.notes else '' end,
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'id',l.id,'sourceLineId',l.employee_line_id,'name',l.item_name,'unit',l.unit,'requestedQty',l.requested_qty,
    'variantKey',l.variant_key,'specification',l.specification,'routes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',a.id,'lane',a.route,'quantity',a.quantity,'supplierId',a.supplier_id,
      'supplierOrderId',a.supplier_order_id,'receivedQty',a.received_qty,'productionStatus',a.production_status,
      'supplierReference',a.supplier_reference,'expectedOn',a.expected_on,'unitPriceCents',a.unit_price_cents,
      'taxCents',a.tax_cents,'feeCents',a.fee_cents,'shortageQty',a.shortage_qty,'damagedQty',a.damaged_qty,
      'substitution',a.substitution,
      'pickedQty',case when a.route='warehouse' then coalesce((select f.delivered_qty from mir_core.warehouse_fulfillment f where f.organization_id=l.organization_id and f.order_line_id=l.employee_line_id),0) else null end))
      from mir_core.coordination_routes a where a.organization_id=org and a.coordination_line_id=l.id),'[]'::jsonb))
    order by l.created_at) from mir_core.coordination_lines l where l.organization_id=org and l.coordination_id=co.id),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(jsonb_build_object('revision',e.revision,'type',e.event_type,'payload',e.payload,'actorId',e.actor_id,'at',e.created_at) order by e.created_at)
    from mir_core.coordination_events e where e.organization_id=org and e.coordination_id=co.id),'[]'::jsonb),
  'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type,'sizeBytes',a.size_bytes,'at',a.created_at) order by a.created_at)
    from mir_core.order_attachments a where a.organization_id=org and a.order_id=co.employee_order_id),'[]'::jsonb)
 ) into out;
 return out;
end $$;

do $$ declare sig text;begin
 foreach sig in array array[
  'public.mir_order_decide(uuid,uuid,text,text,uuid)',
  'public.mir_order_supplier_confirm(uuid,uuid,uuid,text,date,bigint,bigint,bigint,uuid)',
  'public.mir_order_issue(uuid,uuid,uuid,numeric,numeric,jsonb,text,uuid)'
  ,'public.mir_order_attach(uuid,uuid,text,text,text,bigint,text,uuid)'
  ,'public.mir_order_attachment_access(uuid,uuid)'
 ] loop
  execute format('revoke all on function %s from public,anon',sig);
  execute format('grant execute on function %s to authenticated',sig);
 end loop;
end $$;

commit;
