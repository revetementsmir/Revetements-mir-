-- Phase 10 corrective: Boss and Adjointe are the operational managers.
-- Additive and replayable. Published models and received orders are revised,
-- never overwritten. No email, push, supplier order or external transport.
begin;

do $$ begin
 if to_regclass('mir_core.model_versions') is null
    or to_regclass('mir_core.model_publications') is null
    or to_regclass('mir_core.order_revisions') is null
    or to_regclass('mir_core.order_lines') is null then
  raise exception 'Socle modèles/commandes absent : correctif Phase 10 refusé';
 end if;
end $$;

create table if not exists mir_core.model_management_events(
 organization_id uuid not null,
 id uuid not null default gen_random_uuid(),
 request_id uuid not null,
 model_id uuid not null,
 model_version integer not null,
 action text not null check(action in ('created','revised','archived','reactivated','published')),
 reason text not null check(length(btrim(reason)) between 3 and 500),
 before_value jsonb,
 after_value jsonb not null check(jsonb_typeof(after_value)='object'),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(organization_id,id),
 unique(organization_id,request_id),
 foreign key(organization_id,model_id,model_version) references mir_core.model_versions
);

create table if not exists mir_core.order_revision_audits(
 organization_id uuid not null,
 order_id uuid not null,
 revision integer not null,
 reason text not null check(length(btrim(reason)) between 3 and 500),
 before_value jsonb not null check(jsonb_typeof(before_value)='object'),
 after_value jsonb not null check(jsonb_typeof(after_value)='object'),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 production_warning boolean not null default false,
 requires_new_production boolean not null default false,
 primary key(organization_id,order_id,revision),
 foreign key(organization_id,order_id,revision) references mir_core.order_revisions
);

alter table mir_core.documents add column if not exists supersedes_document_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.documents'::regclass and conname='documents_supersedes_fk') then
  alter table mir_core.documents add constraint documents_supersedes_fk
   foreign key(organization_id,supersedes_document_id) references mir_core.documents(organization_id,id);
 end if;
end $$;

alter table mir_core.model_management_events enable row level security;
alter table mir_core.order_revision_audits enable row level security;
revoke all on mir_core.model_management_events,mir_core.order_revision_audits from public,anon,authenticated;
grant select on mir_core.model_management_events,mir_core.order_revision_audits to authenticated;

drop policy if exists phase10_model_management_read on mir_core.model_management_events;
create policy phase10_model_management_read on mir_core.model_management_events for select to authenticated
 using(coalesce(mir_core.staff_role(organization_id) in ('boss','assistant'),false));
drop policy if exists phase10_order_revision_read on mir_core.order_revision_audits;
create policy phase10_order_revision_read on mir_core.order_revision_audits for select to authenticated
 using(coalesce(mir_core.staff_role(organization_id) in ('boss','assistant'),false));

create or replace function mir_core.phase10_management_allowed(org uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select auth.uid() is not null and coalesce(mir_core.staff_role(org) in ('boss','assistant'),false);
$$;
revoke all on function mir_core.phase10_management_allowed(uuid) from public,anon;
grant execute on function mir_core.phase10_management_allowed(uuid) to authenticated;

create or replace function mir_core.phase10_model_settings_valid(settings jsonb) returns boolean
language sql immutable security invoker set search_path=pg_catalog as $$
 select coalesce(jsonb_typeof(settings)='object'
  and settings-(array['boutique','store','production','archived','aluminum_cents','steel_cents','conditions','standard_measures','locked_measures','configuration_rules']::text[])='{}'::jsonb
  and jsonb_typeof(coalesce(settings->'standard_measures','{}'))='object'
  and jsonb_typeof(coalesce(settings->'locked_measures','{}'))='object'
  and jsonb_typeof(coalesce(settings->'configuration_rules','{}'))='object'
  and (not(settings?'aluminum_cents') or (settings->>'aluminum_cents')::bigint>0)
  and (not(settings?'steel_cents') or (settings->>'steel_cents')::bigint>0),false);
$$;
revoke all on function mir_core.phase10_model_settings_valid(jsonb) from public,anon,authenticated;

create or replace function public.mir_bending_model_manage(
 org uuid,request_id uuid,action text,model_id uuid,expected_version integer,expected_revision integer,
 name text,description text,specification jsonb,settings jsonb,reason text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare current_model mir_core.models;publication mir_core.model_publications;prior mir_core.model_management_events;
 current_spec jsonb;next_version integer;next_revision integer;result jsonb;event_action text;
begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if request_id is null or action not in('create','revise','archive','reactivate','publish')
    or length(btrim(coalesce(reason,''))) not between 3 and 500 then raise exception 'Action ou raison invalide' using errcode='22023';end if;
 select * into prior from mir_core.model_management_events where organization_id=org and model_management_events.request_id=mir_bending_model_manage.request_id;
 if found then return jsonb_build_object('modelId',prior.model_id,'version',prior.model_version,'action',prior.action,'idempotent',true);end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,0));
 if action='create' then
  if model_id is null or expected_version is distinct from 0 or expected_revision is distinct from 0 or length(btrim(coalesce(name,''))) not between 1 and 140
     or jsonb_typeof(specification)<>'object' or specification->>'schema' is distinct from 'mir-production-template-1'
     or specification->>'kind' not in('profile','panel') or jsonb_typeof(specification->'topology')<>'object' or octet_length(specification::text)>262144
     or not mir_core.phase10_model_settings_valid(coalesce(settings,'{}')) then raise exception 'Nouveau modèle invalide' using errcode='22023';end if;
  if exists(select 1 from mir_core.models where organization_id=org and id=model_id) then raise exception 'Identifiant de modèle déjà utilisé' using errcode='40001';end if;
  insert into mir_core.models(organization_id,id,name,archived) values(org,model_id,btrim(name),false);
  insert into mir_core.model_versions(organization_id,model_id,version,specification,created_by) values(org,model_id,1,specification,auth.uid());
  insert into mir_core.model_publications(organization_id,model_id,version,boutique,store,supplier_po,aluminum_cents,steel_cents,conditions,standard_measures,locked_measures,archived,configuration_rules)
   values(org,model_id,1,coalesce((settings->>'boutique')::boolean,false),coalesce((settings->>'store')::boolean,false),coalesce((settings->>'production')::boolean,false),
    (settings->>'aluminum_cents')::bigint,(settings->>'steel_cents')::bigint,left(coalesce(description,settings->>'conditions',''),500),coalesce(settings->'standard_measures','{}'),coalesce(settings->'locked_measures','{}'),false,coalesce(settings->'configuration_rules','{}'));
  next_version:=1;next_revision:=1;event_action:='created';current_spec:=null;
 else
  select m.* into current_model from mir_core.models m where m.organization_id=org and m.id=mir_bending_model_manage.model_id for update;
  select p.* into publication from mir_core.model_publications p where p.organization_id=org and p.model_id=mir_bending_model_manage.model_id for update;
  if not found or publication.version is distinct from expected_version or publication.revision is distinct from expected_revision then raise exception 'Modèle modifié : actualisez avant de poursuivre' using errcode='40001';end if;
  select v.specification into current_spec from mir_core.model_versions v where (v.organization_id,v.model_id,v.version)=(org,mir_bending_model_manage.model_id,publication.version);
  if action in('revise','publish') and (jsonb_typeof(specification)<>'object' or specification->>'schema' is distinct from 'mir-production-template-1' or specification->>'kind' not in('profile','panel') or jsonb_typeof(specification->'topology')<>'object' or octet_length(specification::text)>262144) then raise exception 'Version de modèle invalide' using errcode='22023';end if;
  if not mir_core.phase10_model_settings_valid(coalesce(settings,'{}')) then raise exception 'Réglages invalides' using errcode='22023';end if;
  next_version:=publication.version+1;next_revision:=publication.revision+1;
  insert into mir_core.model_versions(organization_id,model_id,version,specification,created_by)
   values(org,model_id,next_version,case when action in('revise','publish') then specification else current_spec end,auth.uid());
  update mir_core.models m set name=case when action in('revise','publish') then btrim(coalesce(nullif(mir_bending_model_manage.name,''),current_model.name)) else current_model.name end,
   archived=case action when 'archive' then true when 'reactivate' then false else m.archived end where m.organization_id=org and m.id=mir_bending_model_manage.model_id;
  update mir_core.model_publications p set version=next_version,revision=next_revision,
   boutique=coalesce((settings->>'boutique')::boolean,p.boutique),store=coalesce((settings->>'store')::boolean,p.store),supplier_po=coalesce((settings->>'production')::boolean,p.supplier_po),
   aluminum_cents=case when settings?'aluminum_cents' then (settings->>'aluminum_cents')::bigint else p.aluminum_cents end,
   steel_cents=case when settings?'steel_cents' then (settings->>'steel_cents')::bigint else p.steel_cents end,
   conditions=case when action in('revise','publish') then left(coalesce(mir_bending_model_manage.description,p.conditions),500) else p.conditions end,
   standard_measures=coalesce(settings->'standard_measures',p.standard_measures),locked_measures=coalesce(settings->'locked_measures',p.locked_measures),
   configuration_rules=coalesce(settings->'configuration_rules',p.configuration_rules),
   archived=case action when 'archive' then true when 'reactivate' then false else coalesce((settings->>'archived')::boolean,p.archived) end
   where p.organization_id=org and p.model_id=mir_bending_model_manage.model_id;
  event_action:=case action when 'revise' then 'revised' when 'archive' then 'archived' when 'reactivate' then 'reactivated' else 'published' end;
 end if;
 result:=jsonb_build_object('modelId',model_id,'version',next_version,'publicationRevision',next_revision,'action',event_action,'idempotent',false);
 insert into mir_core.model_management_events(organization_id,request_id,model_id,model_version,action,reason,before_value,after_value,actor_id)
 values(org,request_id,model_id,next_version,event_action,btrim(reason),current_spec,jsonb_build_object('name',btrim(name),'description',coalesce(description,''),'specification',specification,'settings',settings),auth.uid());
 return result;
end $$;

create or replace function public.mir_received_order_revise(
 org uuid,request_id uuid,order_id uuid,expected_revision integer,reason text,revised_snapshot jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare o mir_core.orders;before_snapshot jsonb;line jsonb;old_line mir_core.order_lines;next_revision integer;
 received numeric;started boolean;result jsonb;source_line_id uuid;target_model uuid;target_version integer;new_spec jsonb;new_price bigint;
begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if request_id is null or length(btrim(coalesce(reason,''))) not between 3 and 500 or jsonb_typeof(revised_snapshot)<>'object'
    or jsonb_typeof(revised_snapshot->'lines')<>'array' or jsonb_array_length(revised_snapshot->'lines')=0 then raise exception 'Révision invalide ou raison manquante' using errcode='22023';end if;
 if exists(select 1 from mir_core.order_events e where e.organization_id=org and e.event_type='management-revision' and e.details->>'requestId'=request_id::text) then
  select (e.details->>'revision')::integer into next_revision from mir_core.order_events e where e.organization_id=org and e.event_type='management-revision' and e.details->>'requestId'=request_id::text;
  return jsonb_build_object('orderId',order_id,'revision',next_revision,'idempotent',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||request_id::text,0));
 select src.* into o from mir_core.orders src where src.organization_id=org and src.id=mir_received_order_revise.order_id for update;
 if not found or o.revision<>expected_revision or coalesce(o.ux_status,'draft') not in('submitted','received','in_production') then raise exception 'Commande absente ou modifiée : actualisez' using errcode='40001';end if;
 select r.snapshot into before_snapshot from mir_core.order_revisions r where (r.organization_id,r.order_id,r.revision)=(org,o.id,o.revision);
 started:=exists(select 1 from mir_core.coordination_orders co join mir_core.coordination_lines cl on(cl.organization_id,cl.coordination_id)=(co.organization_id,co.id)
  join mir_core.coordination_routes cr on(cr.organization_id,cr.coordination_line_id)=(cl.organization_id,cl.id)
  where co.organization_id=org and co.employee_order_id=o.id and cr.production_status in('in_production','ready','received_partial','received'));
 next_revision:=o.revision+1;
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot,created_by)
  values(org,o.id,next_revision,revised_snapshot- 'lines',auth.uid());
 for line in select value from jsonb_array_elements(revised_snapshot->'lines') loop
  if jsonb_typeof(line)<>'object' or line->>'sourceLineId' is null or (line->>'quantity')::numeric<=0 then raise exception 'Ligne révisée invalide' using errcode='22023';end if;
  select source_line.* into old_line from mir_core.order_lines source_line where source_line.organization_id=org and source_line.order_id=o.id and source_line.revision=o.revision and source_line.id=(line->>'sourceLineId')::uuid;
  if not found then raise exception 'Ligne source étrangère ou absente' using errcode='42501';end if;
  source_line_id:=coalesce(nullif(old_line.specification->>'_revisionSourceLineId','')::uuid,old_line.id);
  target_model:=coalesce(nullif(line->>'modelId','')::uuid,old_line.model_id);target_version:=coalesce((line->>'modelVersion')::integer,old_line.model_version);
  new_spec:=coalesce(line->'specification',old_line.specification)||jsonb_build_object('_revisionSourceLineId',source_line_id);new_price:=null;
  select coalesce(sum(cr.received_qty),0) into received from mir_core.coordination_orders co join mir_core.coordination_lines cl on(cl.organization_id,cl.coordination_id)=(co.organization_id,co.id)
   join mir_core.coordination_routes cr on(cr.organization_id,cr.coordination_line_id)=(cl.organization_id,cl.id)
   where co.organization_id=org and co.employee_order_id=o.id and cl.employee_line_id=source_line_id;
  if (line->>'quantity')::numeric<received then raise exception 'Quantité inférieure à la quantité déjà reçue (%)',received using errcode='22023';end if;
  if target_model is not null then
   if not exists(select 1 from mir_core.model_versions v where (v.organization_id,v.model_id,v.version)=(org,target_model,target_version)) then raise exception 'Version de modèle étrangère ou absente' using errcode='42501';end if;
   select case new_spec#>>'{material,type}' when 'aluminium' then p.aluminum_cents when 'acier' then p.steel_cents end into new_price
    from mir_core.model_publications p where (p.organization_id,p.model_id,p.version)=(org,target_model,target_version) and not p.archived;
  end if;
  insert into mir_core.order_lines(organization_id,order_id,revision,quantity,unit,specification,price_cents,model_id,model_version)
   values(org,o.id,next_revision,(line->>'quantity')::numeric,coalesce(nullif(line->>'unit',''),old_line.unit),
    new_spec,case when new_price is not null then new_price when (new_spec-'_revisionSourceLineId')=(old_line.specification-'_revisionSourceLineId') then old_line.price_cents else null end,
    target_model,target_version);
 end loop;
 update mir_core.orders target set revision=next_revision,status=coalesce(nullif(revised_snapshot->>'status',''),target.status),job_id=coalesce(nullif(revised_snapshot->>'jobId','')::uuid,target.job_id),
  pending_job_reference=case when revised_snapshot?'jobReference' then nullif(btrim(revised_snapshot->>'jobReference'),'') else target.pending_job_reference end
  where target.organization_id=org and target.id=o.id;
 insert into mir_core.order_revision_audits(organization_id,order_id,revision,reason,before_value,after_value,actor_id,production_warning,requires_new_production)
  values(org,o.id,next_revision,btrim(reason),before_snapshot,revised_snapshot,auth.uid(),started,started);
 insert into mir_core.order_events(organization_id,order_id,event_type,details,actor_id)
  values(org,o.id,'management-revision',jsonb_build_object('requestId',request_id,'previousRevision',o.revision,'revision',next_revision,'reason',btrim(reason),'productionStarted',started,'requiresNewProduction',started,'supplierOrderCreated',false,'emailSent',false),auth.uid());
 result:=jsonb_build_object('orderId',o.id,'revision',next_revision,'previousRevision',o.revision,'productionWarning',started,'requiresNewProduction',started,'priceRevalidationRequired',true,'supplierOrderCreated',false,'emailSent',false,'idempotent',false);
 return result;
end $$;

create or replace function public.mir_revised_order_document_register(
 org uuid,order_id uuid,revision integer,object_path text,sha256 text,supersedes_document_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare doc_id uuid;begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if sha256!~'^[a-f0-9]{64}$' or object_path not like org::text||'/'||order_id::text||'/revision-'||revision::text||'/%'
    or not exists(select 1 from mir_core.order_revision_audits a where (a.organization_id,a.order_id,a.revision)=(org,mir_revised_order_document_register.order_id,mir_revised_order_document_register.revision))
    or (mir_revised_order_document_register.supersedes_document_id is not null and not exists(select 1 from mir_core.documents d where d.organization_id=org and d.order_id=mir_revised_order_document_register.order_id and d.id=mir_revised_order_document_register.supersedes_document_id and d.revision<mir_revised_order_document_register.revision))
 then raise exception 'Document révisé invalide' using errcode='22023';end if;
 insert into mir_core.documents(organization_id,order_id,revision,object_path,sha256,supersedes_document_id)
 values(org,order_id,revision,btrim(object_path),sha256,supersedes_document_id) returning id into doc_id;
 return jsonb_build_object('id',doc_id,'orderId',order_id,'revision',revision,'previousPreserved',supersedes_document_id is not null,'sent',false);
end $$;

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
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'revision',o.revision,'status',o.ux_status,'jobId',o.job_id,'jobReference',o.pending_job_reference,
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

create or replace function public.mir_bending_tariff_manage(org uuid,expected_revision integer,settings jsonb,reason text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare current_tariff jsonb;rate numeric;result jsonb;begin
 if not mir_core.phase10_management_allowed(org) then raise exception 'Boss ou Adjointe requis' using errcode='42501';end if;
 if length(btrim(coalesce(reason,'')))<3 then raise exception 'Raison obligatoire' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('boutique-bend-tariff:'||org::text,0));
 current_tariff:=mir_core.boutique_bend_tariff(org);
 if (current_tariff->>'revision')::integer is distinct from expected_revision then raise exception 'Tarifs modifiés. Actualisez avant de réessayer.' using errcode='40001';end if;
 rate:=(settings->>'area_rate')::numeric;
 if rate is null or rate<>round(rate,6) or (settings->>'bend_cents')::integer not between 0 and 1000000
    or (settings->>'aluminum_basis_points')::integer not between 0 and 100000
    or (settings->>'delivery_cents')::integer not between 0 and 1000000 then raise exception 'Tarif invalide' using errcode='22023';end if;
 insert into mir_core.boutique_bend_tariffs as t(organization_id,area_rate,bend_cents,aluminum_basis_points,delivery_cents,revision)
 values(org,rate,(settings->>'bend_cents')::integer,(settings->>'aluminum_basis_points')::integer,(settings->>'delivery_cents')::integer,expected_revision+1)
 on conflict(organization_id) do update set area_rate=excluded.area_rate,bend_cents=excluded.bend_cents,aluminum_basis_points=excluded.aluminum_basis_points,delivery_cents=excluded.delivery_cents,revision=excluded.revision
 returning to_jsonb(t)-'organization_id' into result;
 return result||jsonb_build_object('reason',btrim(reason),'actorId',auth.uid(),'sent',false);
end $$;

do $$ declare sig text;begin
 foreach sig in array array[
  'public.mir_bending_model_manage(uuid,uuid,text,uuid,integer,integer,text,text,jsonb,jsonb,text)',
  'public.mir_received_order_revise(uuid,uuid,uuid,integer,text,jsonb)',
  'public.mir_revised_order_document_register(uuid,uuid,integer,text,text,uuid)',
  'public.mir_bending_management_snapshot(uuid)',
  'public.mir_bending_tariff_manage(uuid,integer,jsonb,text)'
 ] loop
  execute format('revoke all on function %s from public,anon',sig);
  execute format('grant execute on function %s to authenticated',sig);
 end loop;
end $$;

commit;
