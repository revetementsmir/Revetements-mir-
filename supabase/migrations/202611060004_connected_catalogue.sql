begin;
alter table mir_core.model_publications add column sale_length_in integer not null default 120 check(sale_length_in in (120,144));
alter table mir_core.model_publications add constraint shared_price_bounds check((aluminum_cents is null or aluminum_cents<=10000000) and (steel_cents is null or steel_cents<=10000000));
alter table mir_core.model_publications drop constraint model_publications_check;
alter table mir_core.model_publications add constraint shared_published_prices check(not boutique or sale_length_in=144 or (aluminum_cents is not null and steel_cents is not null));
create table mir_core.request_keys(
 organization_id uuid not null references mir_core.organizations,user_id uuid not null references auth.users,
 request_id uuid not null,payload jsonb not null,order_id uuid not null,
 primary key(organization_id,user_id,request_id),
 foreign key(organization_id,order_id) references mir_core.orders
);
alter table mir_core.request_keys enable row level security;
revoke all on mir_core.request_keys from public,anon,authenticated;
create table mir_core.jobs(organization_id uuid not null references mir_core.organizations,id uuid not null default gen_random_uuid(),name text not null,archived boolean not null default false,primary key(organization_id,id),unique(organization_id,name));
create table mir_core.job_memberships(organization_id uuid not null,job_id uuid not null,user_id uuid not null,primary key(organization_id,job_id,user_id),foreign key(organization_id,job_id) references mir_core.jobs,foreign key(organization_id,user_id) references mir_core.memberships);
alter table mir_core.jobs enable row level security;
alter table mir_core.job_memberships enable row level security;
revoke all on mir_core.jobs,mir_core.job_memberships from public,anon,authenticated;
create function public.mir_shared_snapshot(org uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;result jsonb;begin
 select role into actor_role from mir_core.memberships where organization_id=org and user_id=auth.uid() and active;
 if actor_role is null then raise exception 'Accès MIR inactif' using errcode='42501';end if;
 select jsonb_build_object('role',actor_role,'organizationId',org,'catalogue',coalesce((
 select jsonb_agg(jsonb_build_object('id',p.model_id,'version',p.version,'revision',p.revision,'name',m.name,
 'specification',v.specification,'standards',p.standard_measures,'locks',p.locked_measures,
 'aluminumCents',case when actor_role<>'employee' then p.aluminum_cents end,
 'steelCents',case when actor_role<>'employee' then p.steel_cents end,'conditions',p.conditions,
 'saleLengthIn',p.sale_length_in,'boutique',p.boutique,'store',p.store,'supplierPo',p.supplier_po,'archived',p.archived))
 from mir_core.model_publications p join mir_core.models m on (m.organization_id,m.id)=(p.organization_id,p.model_id)
 join mir_core.model_versions v on (v.organization_id,v.model_id,v.version)=(p.organization_id,p.model_id,p.version)
 where p.organization_id=org and (actor_role='admin' or (not p.archived and not m.archived and
 ((actor_role='client' and p.boutique) or(actor_role='employee' and p.store))))),'[]'),
 'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'name',j.name)) from mir_core.jobs j where j.organization_id=org and not j.archived and (actor_role='admin' or (actor_role='employee' and exists(select 1 from mir_core.job_memberships a where a.organization_id=org and a.job_id=j.id and a.user_id=auth.uid())))),'[]'),
 'members',case when actor_role='admin' then coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',coalesce(to_jsonb(u)->>'email',m.user_id::text),'role',m.role)) from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and m.active),'[]') else '[]'::jsonb end,
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'status',o.status,'createdAt',o.created_at,
 'snapshot',r.snapshot)) from mir_core.orders o join mir_core.order_revisions r
 on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
 where o.organization_id=org and (actor_role='admin' or(o.owner_id=auth.uid() and o.kind=actor_role))),'[]')) into result;
 return result;
end $$;
create function public.mir_submit_request(org uuid,request_id uuid,model uuid,publication_revision integer,configuration jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;p mir_core.model_publications;prior mir_core.request_keys;oid uuid;
 spec jsonb;payload jsonb;quantity integer;metal text;price bigint;field record;begin
 select role into actor_role from mir_core.memberships where organization_id=org and user_id=auth.uid() and active;
 if actor_role not in ('client','employee') or actor_role is null then raise exception 'Compte client ou employé actif requis' using errcode='42501';end if;
 payload:=jsonb_build_object('model',model,'revision',publication_revision,'configuration',configuration);
 perform pg_advisory_xact_lock(hashtextextended(org::text||auth.uid()::text||request_id::text,0));
 select * into prior from mir_core.request_keys k where k.organization_id=org and k.user_id=auth.uid() and k.request_id=mir_submit_request.request_id;
 if found then
 if prior.payload is distinct from payload then raise exception 'Référence utilisée avec un autre contenu' using errcode='22023';end if;
 return prior.order_id;end if;
 select * into p from mir_core.model_publications where organization_id=org and model_id=model for share;
 if not found or p.archived or p.revision<>publication_revision or
 not(case actor_role when 'client' then p.boutique else p.store end) then raise exception 'Publication indisponible ou modifiée' using errcode='40001';end if;
 if exists(select 1 from mir_core.models where organization_id=org and id=model and archived) then raise exception 'Modèle archivé';end if;
 select specification into spec from mir_core.model_versions where organization_id=org and model_id=model and version=p.version;
 if jsonb_typeof(configuration) is distinct from 'object' or octet_length(configuration::text)>65536 then raise exception 'Configuration invalide';end if;
 quantity:=(configuration->>'quantity')::integer;metal:=configuration->>'metal';
 if quantity is null or quantity<1 or quantity>10000 or metal not in ('aluminium','acier') or metal is null then raise exception 'Quantité ou métal invalide';end if;
 if jsonb_typeof(spec->'allowed'->'materials')='array' and not (spec->'allowed'->'materials' @> jsonb_build_array(metal)) then raise exception 'Métal non proposé pour ce modèle';end if;
 -- No client price, stock, role, owner or geometry is accepted as authoritative.
 if configuration - array['quantity','metal','color','measures','chantier','note'] <> '{}'::jsonb then raise exception 'Champs non autorisés';end if;
 if jsonb_typeof(configuration->'measures') is distinct from 'object' then raise exception 'Mesures requises';end if;
 for field in select * from jsonb_each(p.locked_measures) loop
 if configuration->'measures'->field.key is distinct from field.value then raise exception 'Mesure verrouillée : %',field.key;end if;
 end loop;
 if configuration->'measures'->>'length' is distinct from p.sale_length_in::text then raise exception 'Longueur de vente non autorisée';end if;
 if coalesce(btrim(configuration->>'color'),'')='' or length(configuration->>'color')>200 then raise exception 'Couleur requise';end if;
 if actor_role='employee' and not exists(select 1 from mir_core.jobs j join mir_core.job_memberships a on(a.organization_id,a.job_id)=(j.organization_id,j.id) where j.organization_id=org and j.id::text=configuration->>'chantier' and not j.archived and a.user_id=auth.uid()) then raise exception 'Chantier non affecté' using errcode='42501';end if;
 price:=case when actor_role='client' and p.sale_length_in=120 then case metal when 'aluminium' then p.aluminum_cents else p.steel_cents end else null end;
 if actor_role='client' and p.sale_length_in=120 and price is null then raise exception 'Tarif non défini';end if;
 select specification into spec from mir_core.model_versions where organization_id=org and model_id=model and version=p.version;
 insert into mir_core.orders(organization_id,kind,owner_id) values(org,actor_role,auth.uid()) returning id into oid;
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot) values(org,oid,1,
 jsonb_build_object('modelId',model,'modelVersion',p.version,'publicationRevision',p.revision,'specification',spec,
 'configuration',configuration,'measureUnit','in','unitPriceCents',price,'totalCents',price*quantity,'currency','CAD','saleLengthIn',p.sale_length_in,'conditions',p.conditions,
 'validation','pending-admin-review','availability','unknown'));
 insert into mir_core.order_events(organization_id,order_id,event_type) values(org,oid,'request-submitted');
 insert into mir_core.request_keys values(org,auth.uid(),request_id,payload,oid);return oid;
end $$;
revoke all on function public.mir_shared_snapshot(uuid),public.mir_submit_request(uuid,uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.mir_shared_snapshot(uuid),public.mir_submit_request(uuid,uuid,uuid,integer,jsonb) to authenticated;
create function public.mir_my_memberships() returns jsonb
language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.organization_id,'role',m.role,'name',o.name)),'[]')
 from mir_core.memberships m join mir_core.organizations o on o.id=m.organization_id
 where m.user_id=auth.uid() and m.active;
$$;
revoke all on function public.mir_my_memberships() from public,anon;
grant execute on function public.mir_my_memberships() to authenticated;
create table mir_core.model_sources(
 organization_id uuid not null references mir_core.organizations,legacy_id text not null,
 model_id uuid not null,source_record jsonb not null,
 primary key(organization_id,legacy_id),foreign key(organization_id,model_id) references mir_core.models);
alter table mir_core.model_sources enable row level security;
revoke all on mir_core.model_sources from public,anon,authenticated;
create function public.mir_import_master(org uuid,record jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare prior mir_core.model_sources;mid uuid;t jsonb;ver integer;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if jsonb_typeof(record) is distinct from 'object' or coalesce(record->>'id','')='' or
 jsonb_typeof(record->'versions') is distinct from 'array' or octet_length(record::text)>1048576 then raise exception 'Modèle local invalide';end if;
 if coalesce(record->'measurementDefaults'->>'unit','in')<>'in' then raise exception 'Convertir explicitement les mesures standards en pouces avant import';end if;
 perform pg_advisory_xact_lock(hashtextextended(org::text||(record->>'id'),0));
 select * into prior from mir_core.model_sources where organization_id=org and legacy_id=record->>'id';
 if found then
 if prior.source_record is distinct from record then raise exception 'Modèle déjà importé avec un contenu différent : révision explicite requise' using errcode='40001';end if;
 return prior.model_id;end if;
 insert into mir_core.models(organization_id,name) values(org,coalesce(record->>'name','Moulure')) returning id into mid;
 for t in select value from jsonb_array_elements(record->'versions') loop
  if t->>'schema' is distinct from 'mir-production-template-1' then raise exception 'Version géométrique inconnue';end if;
  ver:=(t->>'version')::integer;
  insert into mir_core.model_versions(organization_id,model_id,version,specification) values(org,mid,ver,jsonb_build_object('template',t,'allowed',record->'allowed'));
 end loop;
 ver:=(record->>'currentVersion')::integer;
 insert into mir_core.model_publications(organization_id,model_id,version,aluminum_cents,steel_cents,conditions,standard_measures,locked_measures,archived)
 values(org,mid,ver,(record->'commercial'->'priceCentsByMetal'->>'aluminium')::bigint,(record->'commercial'->'priceCentsByMetal'->>'acier')::bigint,coalesce(record->'commercial'->>'conditions',''),
 coalesce((select jsonb_object_agg(key,value->'value') from jsonb_each(coalesce(record->'measurementDefaults'->'values','{}')) where coalesce(value->>'value','')<>''),'{}'),
 coalesce((select jsonb_object_agg(key,value->'value') from jsonb_each(coalesce(record->'measurementDefaults'->'values','{}')) where value->>'locked'='true' and coalesce(value->>'value','')<>''),'{}'),coalesce((record->>'archived')::boolean,false));
 insert into mir_core.model_sources values(org,record->>'id',mid,record);
 return mid;
end $$;
create or replace function mir_core.publish_model(org uuid,model uuid,model_version integer,expected_revision integer,settings jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare current_revision integer; result integer; begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if (settings->>'sale_length_in')::integer=144 and not exists(select 1 from mir_core.models where organization_id=org and id=model and name ilike 'J%soffite%') then raise exception 'Exception 12 pi réservée au J à soffite';end if;
 perform 1 from mir_core.models where organization_id=org and id=model for update;
 if not found then raise exception 'Modèle absent';end if;
 select revision into current_revision from mir_core.model_publications where organization_id=org and model_id=model;
 if coalesce(current_revision,0) is distinct from expected_revision then raise exception 'Conflit de révision' using errcode='40001';end if;
 insert into mir_core.model_publications(organization_id,model_id,version,sale_length_in,boutique,store,supplier_po,aluminum_cents,steel_cents,conditions,standard_measures,locked_measures,archived)
 values(org,model,model_version,coalesce((settings->>'sale_length_in')::integer,(select sale_length_in from mir_core.model_publications where organization_id=org and model_id=model),120),coalesce((settings->>'boutique')::boolean,false),coalesce((settings->>'store')::boolean,false),coalesce((settings->>'supplier_po')::boolean,false),(settings->>'aluminum_cents')::bigint,(settings->>'steel_cents')::bigint,coalesce(settings->>'conditions',''),coalesce(settings->'standard_measures','{}'),coalesce(settings->'locked_measures','{}'),coalesce((settings->>'archived')::boolean,false))
 on conflict(organization_id,model_id) do update set version=excluded.version,sale_length_in=excluded.sale_length_in,boutique=excluded.boutique,store=excluded.store,supplier_po=excluded.supplier_po,aluminum_cents=excluded.aluminum_cents,steel_cents=excluded.steel_cents,conditions=excluded.conditions,standard_measures=excluded.standard_measures,locked_measures=excluded.locked_measures,archived=excluded.archived,revision=mir_core.model_publications.revision+1
 returning revision into result;return result;
end $$;
create function public.mir_admin_publish_model(org uuid,model uuid,expected_revision integer,settings jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare ver integer;new_revision integer;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if jsonb_typeof(settings->'standard_measures') is distinct from 'object' or jsonb_typeof(settings->'locked_measures') is distinct from 'object' then raise exception 'Mesures invalides';end if;
 perform 1 from mir_core.models where organization_id=org and id=model for update;
 select version into ver from mir_core.model_publications where organization_id=org and model_id=model;
 if settings ? 'sale_length_in' then
 if (settings->>'sale_length_in')::integer=144 and not exists(select 1 from mir_core.models where organization_id=org and id=model and name ilike 'J%soffite%') then raise exception 'Exception 12 pi réservée au J à soffite';end if;
 update mir_core.model_publications set sale_length_in=(settings->>'sale_length_in')::integer,aluminum_cents=(settings->>'aluminum_cents')::bigint,steel_cents=(settings->>'steel_cents')::bigint where organization_id=org and model_id=model;
 end if;
 new_revision:=mir_core.publish_model(org,model,ver,expected_revision,settings);
 return new_revision;
end $$;
revoke all on function public.mir_import_master(uuid,jsonb),public.mir_admin_publish_model(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.mir_import_master(uuid,jsonb),public.mir_admin_publish_model(uuid,uuid,integer,jsonb) to authenticated;
create function public.mir_add_master_version(org uuid,model uuid,expected_revision integer,template jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare v integer;p mir_core.model_publications;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 perform 1 from mir_core.models where organization_id=org and id=model for update;
 select * into p from mir_core.model_publications where organization_id=org and model_id=model;
 if not found or p.revision<>expected_revision then raise exception 'Conflit de révision' using errcode='40001';end if;
 if template->>'schema' is distinct from 'mir-production-template-1' or jsonb_typeof(template->'fields') is distinct from 'array' then raise exception 'Géométrie inconnue';end if;
 select max(version)+1 into v from mir_core.model_versions where organization_id=org and model_id=model;
 if (template->>'version')::integer is distinct from v then raise exception 'Numéro de version suivant requis';end if;
 insert into mir_core.model_versions(organization_id,model_id,version,specification) values(org,model,v,jsonb_build_object('template',template));
 update mir_core.model_publications set version=v,revision=revision+1,boutique=false,store=false where organization_id=org and model_id=model;
 return p.revision+1;
end $$;
revoke all on function public.mir_add_master_version(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.mir_add_master_version(uuid,uuid,integer,jsonb) to authenticated;
create function public.mir_assign_job(org uuid,job_name text,employee uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare jid uuid;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 if length(btrim(job_name)) not between 1 and 200 or not exists(select 1 from mir_core.memberships where organization_id=org and user_id=employee and role='employee' and active) then raise exception 'Chantier ou employé invalide';end if;
 insert into mir_core.jobs(organization_id,name) values(org,btrim(job_name)) on conflict(organization_id,name) do update set name=excluded.name returning id into jid;
 insert into mir_core.job_memberships values(org,jid,employee) on conflict do nothing;return jid;
end $$;
revoke all on function public.mir_assign_job(uuid,text,uuid) from public,anon;
grant execute on function public.mir_assign_job(uuid,text,uuid) to authenticated;
commit;
