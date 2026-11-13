-- Phase 10 corrective hardening: reject request_id reuse with different input
-- and serialize identical concurrent retries. Additive and replayable.
begin;

create table if not exists mir_core.phase10_management_requests(
 organization_id uuid not null,
 request_id uuid not null,
 operation text not null check(operation in ('model-manage','order-revise')),
 entity_id uuid not null,
 payload_hash text not null check(payload_hash ~ '^[a-f0-9]{32}$'),
 result jsonb not null check(jsonb_typeof(result)='object'),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table mir_core.phase10_management_requests enable row level security;
revoke all on mir_core.phase10_management_requests from public,anon,authenticated;

do $$ begin
 if to_regprocedure('public.mir_bending_model_manage_phase10_v1(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text)') is null then
  alter function public.mir_bending_model_manage(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text)
   rename to mir_bending_model_manage_phase10_v1;
 end if;
 if to_regprocedure('public.mir_received_order_revise_phase10_v1(uuid,uuid,uuid,integer,text,jsonb)') is null then
  alter function public.mir_received_order_revise(uuid,uuid,uuid,integer,text,jsonb)
   rename to mir_received_order_revise_phase10_v1;
 end if;
end $$;

-- PL/pgSQL keeps qualified parameter references as source text when a
-- function is renamed. Rebind those references to the private v1 names.
do $$ declare definition text;begin
 select pg_get_functiondef('public.mir_bending_model_manage_phase10_v1(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text)'::regprocedure) into definition;
 execute replace(definition,'mir_bending_model_manage.','mir_bending_model_manage_phase10_v1.');
 select pg_get_functiondef('public.mir_received_order_revise_phase10_v1(uuid,uuid,uuid,integer,text,jsonb)'::regprocedure) into definition;
 execute replace(definition,'mir_received_order_revise.','mir_received_order_revise_phase10_v1.');
end $$;

revoke all on function public.mir_bending_model_manage_phase10_v1(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text) from public,anon,authenticated;
revoke all on function public.mir_received_order_revise_phase10_v1(uuid,uuid,uuid,integer,text,jsonb) from public,anon,authenticated;

create or replace function public.mir_bending_model_manage(
 org uuid,request_id uuid,action text,model_id uuid,expected_version integer,expected_revision integer,
 name text,description text,specification jsonb,settings jsonb,reason text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare receipt mir_core.phase10_management_requests;payload_hash text;operation_result jsonb;
begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if request_id is null then raise exception 'request_id obligatoire' using errcode='22023';end if;
 payload_hash:=md5(jsonb_build_object(
  'action',action,'modelId',model_id,'expectedVersion',expected_version,'expectedRevision',expected_revision,
  'name',name,'description',description,'specification',specification,'settings',settings,'reason',reason
 )::text);
 perform pg_advisory_xact_lock(hashtextextended('phase10:'||org::text||':'||request_id::text,0));
 select * into receipt from mir_core.phase10_management_requests r
  where r.organization_id=org and r.request_id=mir_bending_model_manage.request_id;
 if found then
  if receipt.operation<>'model-manage' or receipt.entity_id<>model_id or receipt.payload_hash<>payload_hash then
   raise exception 'request_id déjà utilisé avec un contenu différent' using errcode='22023';
  end if;
  return receipt.result||jsonb_build_object('idempotent',true);
 end if;
 if exists(select 1 from mir_core.model_management_events e where e.organization_id=org and e.request_id=mir_bending_model_manage.request_id) then
  raise exception 'request_id historique déjà utilisé; fournissez un nouvel identifiant' using errcode='22023';
 end if;
 operation_result:=public.mir_bending_model_manage_phase10_v1(
  org,request_id,action,model_id,expected_version,expected_revision,name,description,specification,settings,reason
 );
 insert into mir_core.phase10_management_requests(organization_id,request_id,operation,entity_id,payload_hash,result,actor_id)
 values(org,request_id,'model-manage',model_id,payload_hash,operation_result,auth.uid());
 return operation_result;
end $$;

create or replace function public.mir_received_order_revise(
 org uuid,request_id uuid,order_id uuid,expected_revision integer,reason text,revised_snapshot jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare receipt mir_core.phase10_management_requests;payload_hash text;operation_result jsonb;complete_before jsonb;
begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if request_id is null then raise exception 'request_id obligatoire' using errcode='22023';end if;
 payload_hash:=md5(jsonb_build_object(
  'orderId',order_id,'expectedRevision',expected_revision,'reason',reason,'revisedSnapshot',revised_snapshot
 )::text);
 perform pg_advisory_xact_lock(hashtextextended('phase10:'||org::text||':'||request_id::text,0));
 select * into receipt from mir_core.phase10_management_requests r
  where r.organization_id=org and r.request_id=mir_received_order_revise.request_id;
 if found then
  if receipt.operation<>'order-revise' or receipt.entity_id<>order_id or receipt.payload_hash<>payload_hash then
   raise exception 'request_id déjà utilisé avec un contenu différent' using errcode='22023';
  end if;
  return receipt.result||jsonb_build_object('idempotent',true);
 end if;
 if exists(select 1 from mir_core.order_events e where e.organization_id=org and e.event_type='management-revision' and e.details->>'requestId'=request_id::text) then
  raise exception 'request_id historique déjà utilisé; fournissez un nouvel identifiant' using errcode='22023';
 end if;
 select r.snapshot||jsonb_build_object('lines',coalesce((select jsonb_agg(jsonb_build_object(
   'sourceLineId',l.id,'quantity',l.quantity,'unit',l.unit,'specification',l.specification,
   'modelId',l.model_id,'modelVersion',l.model_version) order by l.id)
   from mir_core.order_lines l where (l.organization_id,l.order_id,l.revision)=(r.organization_id,r.order_id,r.revision)),'[]'::jsonb))
 into complete_before from mir_core.order_revisions r
 where (r.organization_id,r.order_id,r.revision)=(org,mir_received_order_revise.order_id,expected_revision);
 operation_result:=public.mir_received_order_revise_phase10_v1(org,request_id,order_id,expected_revision,reason,revised_snapshot);
 -- Complete the newly-created revision while it is still in this transaction.
 -- Older revisions are never rewritten.
 update mir_core.order_revisions r set snapshot=revised_snapshot
  where (r.organization_id,r.order_id,r.revision)=(org,mir_received_order_revise.order_id,(operation_result->>'revision')::integer);
 update mir_core.order_revision_audits a set before_value=complete_before,after_value=revised_snapshot
  where (a.organization_id,a.order_id,a.revision)=(org,mir_received_order_revise.order_id,(operation_result->>'revision')::integer);
 insert into mir_core.phase10_management_requests(organization_id,request_id,operation,entity_id,payload_hash,result,actor_id)
 values(org,request_id,'order-revise',order_id,payload_hash,operation_result,auth.uid());
 return operation_result;
end $$;

-- The operational status is orders.status. ux_status remains the immutable
-- submission lifecycle used to select received orders.
create or replace function public.mir_bending_management_snapshot(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare role_name text:=mir_core.staff_role(org);models_json jsonb;orders_json jsonb;begin
 if role_name is null or role_name not in('boss','assistant') then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'archived',m.archived,'version',p.version,'revision',p.revision,
    'description',p.conditions,'boutique',p.boutique,'store',p.store,'supplierPo',p.supplier_po,'aluminumCents',p.aluminum_cents,'steelCents',p.steel_cents,
    'standardMeasures',p.standard_measures,'lockedMeasures',p.locked_measures,'configurationRules',p.configuration_rules,'specification',v.specification) order by m.name),'[]'::jsonb) into models_json
   from mir_core.models m join mir_core.model_publications p on(p.organization_id,p.model_id)=(m.organization_id,m.id)
   join mir_core.model_versions v on(v.organization_id,v.model_id,v.version)=(p.organization_id,p.model_id,p.version)
   where m.organization_id=org;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'revision',o.revision,'status',o.status,'uxStatus',o.ux_status,'jobId',o.job_id,'jobReference',o.pending_job_reference,
    'snapshot',r.snapshot,'lines',coalesce((select jsonb_agg(jsonb_build_object('sourceLineId',l.id,'quantity',l.quantity,'unit',l.unit,'specification',l.specification,'modelId',l.model_id,'modelVersion',l.model_version) order by l.id)
      from mir_core.order_lines l where (l.organization_id,l.order_id,l.revision)=(o.organization_id,o.id,o.revision)),'[]'::jsonb),
    'productionStarted',exists(select 1 from mir_core.coordination_orders co join mir_core.coordination_lines cl on(cl.organization_id,cl.coordination_id)=(co.organization_id,co.id)
      join mir_core.coordination_routes cr on(cr.organization_id,cr.coordination_line_id)=(cl.organization_id,cl.id)
      where co.organization_id=org and co.employee_order_id=o.id and cr.production_status in('in_production','ready','received_partial','received'))) order by o.created_at desc),'[]'::jsonb) into orders_json
   from mir_core.orders o join mir_core.order_revisions r on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
   where o.organization_id=org and o.ux_status='submitted';
 return jsonb_build_object('role',role_name,'organizationId',org,'bendTariff',mir_core.boutique_bend_tariff(org),
  'capabilities',jsonb_build_object('createModel',true,'reviseCanonicalModel',true,'publishModel',true,'reviseReceivedOrder',true,'technicalAdminRequired',false),
  'models',models_json,'orders',orders_json);
end $$;

revoke all on function public.mir_bending_model_manage(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text) from public,anon;
grant execute on function public.mir_bending_model_manage(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text) to authenticated;
revoke all on function public.mir_received_order_revise(uuid,uuid,uuid,integer,text,jsonb) from public,anon;
grant execute on function public.mir_received_order_revise(uuid,uuid,uuid,integer,text,jsonb) to authenticated;
revoke all on function public.mir_bending_management_snapshot(uuid) from public,anon;
grant execute on function public.mir_bending_management_snapshot(uuid) to authenticated;

commit;
