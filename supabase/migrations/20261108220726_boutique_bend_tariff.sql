begin;

-- Stop if the production functions have changed since the verified baseline.
do $$
begin
 if md5(pg_get_functiondef('public.mir_shared_snapshot(uuid)'::regprocedure))<>'739d8cc4966c7e95f2d4467921e64f69'
 or md5(pg_get_functiondef('public.mir_submit_request(uuid,uuid,uuid,integer,jsonb)'::regprocedure))<>'9a39dc5a40a8cd093e31c2659d3fec0b' then
  raise exception 'Fonctions Boutique modifiées depuis la revue. Comparaison requise.' using errcode='40001';
 end if;
end $$;

create table mir_core.boutique_bend_tariffs (
  organization_id uuid primary key references mir_core.organizations(id),
  area_rate numeric(12,6) not null check (area_rate between 0.000001 and 1000),
  bend_cents integer not null check (bend_cents between 0 and 1000000),
  aluminum_basis_points integer not null check (aluminum_basis_points between 0 and 100000),
  delivery_cents integer not null check (delivery_cents between 0 and 1000000),
  revision integer not null check (revision > 0)
);
alter table mir_core.boutique_bend_tariffs enable row level security;
revoke all on mir_core.boutique_bend_tariffs from public, anon, authenticated;

create function mir_core.boutique_bend_tariff(org uuid) returns jsonb
language sql stable security invoker set search_path=pg_catalog,mir_core as $$
  select coalesce(
    (select to_jsonb(t) - 'organization_id' from mir_core.boutique_bend_tariffs t where t.organization_id=org),
    '{"area_rate":0.014,"bend_cents":100,"aluminum_basis_points":0,"delivery_cents":6000,"revision":0}'::jsonb
  );
$$;

create function public.mir_admin_save_bend_tariff(org uuid, expected_revision integer, settings jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare current_tariff jsonb; rate numeric; result jsonb;
begin
  if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('boutique-bend-tariff:'||org::text,0));
  current_tariff:=mir_core.boutique_bend_tariff(org);
  if (current_tariff->>'revision')::integer is distinct from expected_revision then
    raise exception 'Tarifs modifiés. Actualisez avant de réessayer.' using errcode='40001';
  end if;
  rate:=(settings->>'area_rate')::numeric;
  if rate is null or rate<>round(rate,6) then
    raise exception 'Tarif au pouce carré invalide' using errcode='22023';
  end if;
  insert into mir_core.boutique_bend_tariffs as t
    (organization_id,area_rate,bend_cents,aluminum_basis_points,delivery_cents,revision)
  values (org,rate,(settings->>'bend_cents')::integer,(settings->>'aluminum_basis_points')::integer,
    (settings->>'delivery_cents')::integer,expected_revision+1)
  on conflict (organization_id) do update
    set area_rate=excluded.area_rate,bend_cents=excluded.bend_cents,
        aluminum_basis_points=excluded.aluminum_basis_points,delivery_cents=excluded.delivery_cents,
        revision=excluded.revision
  returning to_jsonb(t)-'organization_id' into result;
  return result;
end $$;

-- The catalogue stores customer-facing inches, including chantier fractions.
create function mir_core.boutique_inches(value text) returns numeric
language plpgsql immutable security invoker set search_path=pg_catalog as $$
declare normalized text; parts text[]; inches numeric; fraction text[];
begin
  if value is null or length(value)>64 then return null; end if;
  normalized:=lower(replace(value,',','.'));
  foreach fraction slice 1 in array array[
    ['¼','1/4'],['½','1/2'],['¾','3/4'],['⅛','1/8'],['⅜','3/8'],['⅝','5/8'],['⅞','7/8']
  ] loop
    normalized:=replace(normalized,fraction[1],' '||fraction[2]);
  end loop;
  normalized:=btrim(regexp_replace(regexp_replace(normalized,'[[:space:]]+',' ','g'),'[ ]*(po|in|["″])[ ]*$',''));
  normalized:=regexp_replace(normalized,'^\+ *','');
  if normalized ~ '^([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then
    inches:=normalized::numeric;
  else
    parts:=regexp_match(normalized,'^(?:([0-9]+) )?([0-9]+)/([0-9]+)$');
    if parts is null or parts[3]::numeric=0 then return null; end if;
    inches:=coalesce(parts[1]::numeric,0)+parts[2]::numeric/parts[3]::numeric;
  end if;
  if inches>0 and inches*25.4<=100000 then return inches; end if;
  return null;
end $$;

create function mir_core.boutique_bend_price(spec jsonb, measures jsonb, metal text, fixed_cents bigint, tariff jsonb)
returns bigint language plpgsql immutable security invoker set search_path=pg_catalog,mir_core as $$
declare topology jsonb:=coalesce(spec->'template',spec)->'topology'; segment jsonb; bend jsonb;
  width_in numeric:=0; side_in numeric; bend_count integer:=0; base_cents numeric:=fixed_cents; price bigint;
begin
  if topology->>'kind'='profile' then
    for segment in select value from jsonb_array_elements(topology->'segments') loop
      side_in:=mir_core.boutique_inches(measures->>(segment->>'label'));
      if side_in is null then raise exception 'Cote à compléter : %',segment->>'label' using errcode='22023'; end if;
      width_in:=width_in+side_in;
    end loop;
    for bend in select value from jsonb_array_elements(topology->'bends') loop
      if coalesce(bend->>'mode',bend->>'type')='hem'
        or (coalesce(bend->>'mode',bend->>'type')='signed' and (replace(bend->>'angle',',','.'))::numeric<>0)
        or (coalesce(bend->>'mode',bend->>'type')='interior' and (replace(bend->>'angle',',','.'))::numeric<>180) then
        bend_count:=bend_count+1;
      end if;
    end loop;
    base_cents:=coalesce(base_cents,width_in*120*(tariff->>'area_rate')::numeric*100+bend_count*(tariff->>'bend_cents')::integer);
  end if;
  if base_cents is null then return null; end if;
  price:=round(base_cents*(1+case when metal='aluminium' then (tariff->>'aluminum_basis_points')::numeric/10000 else 0 end));
  if price not between 1 and 10000000 then raise exception 'Montant de pliage hors limite' using errcode='22023'; end if;
  return price;
end $$;

-- Only the bounded Québec lookup below may use the optional HTTP extension.
do $$
declare f record;
begin
  if exists(select 1 from pg_available_extensions where name='http') then
    execute 'create schema if not exists extensions';
    execute 'create extension if not exists http with schema extensions';
    for f in select p.oid::regprocedure as signature from pg_proc p
      join pg_depend d on d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e'
      join pg_extension e on e.oid=d.refobjid and e.extname='http'
    loop
      execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    end loop;
  end if;
end $$;

create table mir_core.boutique_delivery_distances (
  address_id uuid primary key references mir_core.customer_addresses(id) on delete cascade,
  address_key text not null,
  distance_km numeric check(distance_km between 0 and 25000),
  checked_at timestamptz not null default now()
);
alter table mir_core.boutique_delivery_distances enable row level security;
revoke all on mir_core.boutique_delivery_distances from public,anon,authenticated;

create function mir_core.boutique_geocode_km(address jsonb) returns numeric
language plpgsql security invoker set search_path=pg_catalog,mir_core
set http.curlopt_connecttimeout_ms='1000' set http.curlopt_timeout_ms='2500' as $$
declare response jsonb; candidate jsonb; postal text; civic text; lat double precision; lng double precision;
begin
  postal:=upper(regexp_replace(address->>'postalCode','[^[:alnum:]]','','g'));
  civic:=substring(address->>'line1' from '^([0-9]+)[ ]');
  if postal is null or postal!~'^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$' or civic is null
      or coalesce(lower(address->>'province'),'') not in ('qc','québec','quebec')
      or length(coalesce(address->>'line1',''))>200 or length(coalesce(address->>'city','')) not between 1 and 200
      or to_regprocedure('extensions.http_get(character varying,jsonb)') is null then return null; end if;

  -- Adresses Québec (MRNF, CC BY 4.0). Send the civic address only.
  select h.content::jsonb into response
  from extensions.http_get(
    'https://servicescarto.mrnf.gouv.qc.ca/pes/rest/services/Territoire/Adresse_Geocodage/GeocodeServer/findAddressCandidates',
    jsonb_build_object('SingleLine',concat_ws(', ',address->>'line1',address->>'city',postal),
      'f','json','outSR','4326','maxLocations','4','outFields','Addr_type')
  ) h where h.status=200;

  select a.value into candidate from jsonb_array_elements(response->'candidates') a
    where a.value->'attributes'->>'Addr_type'='Feature'
      and (a.value->>'score')::numeric>=92
      and substring(a.value->>'address' from '^([0-9]+)[ ]')=civic
      and right(upper(regexp_replace(a.value->>'address','[^[:alnum:]]','','g')),6)=postal
    order by (a.value->>'score')::numeric desc limit 1;
  lat:=(candidate->'location'->>'y')::double precision;
  lng:=(candidate->'location'->>'x')::double precision;
  if lat not between 43 and 63 or lng not between -81 and -56 then return null; end if;
  -- Haversine, origin verified at 1653, avenue des Affaires, Québec.
  return (2*6371*asin(sqrt(power(sin(radians(lat-46.865006094931)/2),2)
    +cos(radians(lat))*cos(radians(46.865006094931))*power(sin(radians(lng+71.420601906333)/2),2))))::numeric;
exception when others then
  -- A missing/ambiguous address or a provider outage requires a quote.
  return null;
end $$;

create function mir_core.boutique_delivery_km(address_id uuid, address jsonb) returns numeric
language plpgsql security invoker set search_path=pg_catalog,mir_core as $$
declare key text; distance numeric;
begin
  key:=md5(jsonb_build_array(address->>'line1',address->>'city',address->>'province',address->>'postalCode')::text);
  select d.distance_km into distance from mir_core.boutique_delivery_distances d
    where d.address_id=boutique_delivery_km.address_id and d.address_key=key
      and d.checked_at>now()-case when d.distance_km is null then interval '5 minutes' else interval '30 days' end;
  if found then return distance; end if;
  distance:=mir_core.boutique_geocode_km(address);
  insert into mir_core.boutique_delivery_distances as d(address_id,address_key,distance_km)
    values(address_id,key,distance)
    on conflict on constraint boutique_delivery_distances_pkey do update
      set address_key=excluded.address_key,distance_km=excluded.distance_km,checked_at=now();
  return distance;
end $$;

create function mir_core.boutique_delivery_result(distance numeric, subtotal bigint, fee bigint) returns jsonb
language sql immutable security invoker set search_path=pg_catalog as $$
  select jsonb_build_object('distanceKm',distance,'status',
    case when distance>80 then 'outside-zone' when distance is null or subtotal is null then 'quote-required' else 'confirmed' end,
    'feeCents',case when distance is null or distance>80 or subtotal is null then null
                    when distance<=40 and subtotal>30000 then 0 else fee end);
$$;

create function public.mir_boutique_delivery_distance(org uuid, address_id uuid, address_version text) returns numeric
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare saved mir_core.customer_addresses;
begin
  if not mir_core.has_role(org,array['client']) then raise exception 'Compte client requis' using errcode='42501'; end if;
  select * into saved from mir_core.customer_addresses a where a.id=address_id and a.user_id=auth.uid() for share;
  if not found or saved.updated_at::text is distinct from address_version then
    raise exception 'Adresse indisponible ou modifiée. Actualisez votre compte.' using errcode='PT409';
  end if;
  return mir_core.boutique_delivery_km(saved.id,saved.address);
end $$;

-- Called only after a new client confirms email and opens Mon compte.
create function public.mir_account_import_signup_address() returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=(mir_core.account_identity()->>'id')::uuid; staged jsonb; saved uuid;
begin
  select u.raw_user_meta_data->'mir_delivery_address' into staged from auth.users u where u.id=uid for update;
  if staged is null then return null; end if;
  saved:=public.mir_account_save_address(staged);
  update auth.users set raw_user_meta_data=raw_user_meta_data-'mir_delivery_address' where id=uid;
  perform mir_core.boutique_delivery_km(saved,staged);
  return saved;
end $$;

revoke all on function mir_core.boutique_geocode_km(jsonb),mir_core.boutique_delivery_km(uuid,jsonb),
  mir_core.boutique_delivery_result(numeric,bigint,bigint) from public,anon,authenticated;
revoke all on function public.mir_boutique_delivery_distance(uuid,uuid,text),
  public.mir_account_import_signup_address() from public,anon;
grant execute on function public.mir_boutique_delivery_distance(uuid,uuid,text),
  public.mir_account_import_signup_address() to authenticated;

-- Blank per-metal overrides use the shared tariff on parametric profiles.
alter table mir_core.model_publications drop constraint shared_published_prices;

revoke all on function mir_core.boutique_bend_tariff(uuid),mir_core.boutique_inches(text),
  mir_core.boutique_bend_price(jsonb,jsonb,text,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.mir_admin_save_bend_tariff(uuid,integer,jsonb) from public,anon;
grant execute on function public.mir_admin_save_bend_tariff(uuid,integer,jsonb) to authenticated;

create or replace function public.mir_shared_snapshot(org uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;result jsonb;begin
 select role into actor_role from mir_core.memberships where organization_id=org and user_id=auth.uid() and active;
 if actor_role is null then raise exception 'Accès MIR inactif' using errcode='42501';end if;
 select jsonb_build_object('capabilities',jsonb_build_object('publicationRules',true),'role',actor_role,'organizationId',org,
 'bendTariff',case when actor_role in ('admin','client') then mir_core.boutique_bend_tariff(org) end,
 'deliveryAddresses',case when actor_role='client' then coalesce((
  select jsonb_agg(jsonb_build_object('id',a.id,'version',a.updated_at::text,
    'label',concat_ws(', ',a.address->>'line1',a.address->>'city',a.address->>'postalCode')) order by a.created_at)
  from mir_core.customer_addresses a where a.user_id=auth.uid()),'[]') end,'catalogue',coalesce((
 select jsonb_agg(jsonb_build_object('id',p.model_id,'version',p.version,'revision',p.revision,'name',m.name,
 'configurationRules',p.configuration_rules,'specification',v.specification,'standards',p.standard_measures,'locks',p.locked_measures,
 'aluminumCents',case when actor_role<>'employee' then p.aluminum_cents end,
 'steelCents',case when actor_role<>'employee' then p.steel_cents end,'conditions',p.conditions,
 'saleLengthIn',p.sale_length_in,'boutique',p.boutique,'store',p.store,'supplierPo',p.supplier_po,'archived',p.archived))
 from mir_core.model_publications p join mir_core.models m on (m.organization_id,m.id)=(p.organization_id,p.model_id)
 join mir_core.model_versions v on (v.organization_id,v.model_id,v.version)=(p.organization_id,p.model_id,p.version)
 where p.organization_id=org and (actor_role='admin' or (not p.archived and not m.archived and
 ((actor_role='client' and p.boutique) or(actor_role='employee' and p.store))))),'[]'),
 'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'name',j.name)) from mir_core.jobs j where j.organization_id=org and not j.archived and (actor_role='admin' or (actor_role='employee' and exists(select 1 from mir_core.job_memberships a where a.organization_id=org and a.job_id=j.id and a.user_id=auth.uid())))),'[]'),
 'members',case when actor_role='admin' then coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',coalesce(to_jsonb(u)->>'email',m.user_id::text),'role',m.role)) from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and m.active),'[]') else '[]'::jsonb end,
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'status',o.status,'revision',o.revision,'createdAt',o.created_at,
 'snapshot',r.snapshot)) from mir_core.orders o join mir_core.order_revisions r
 on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
 where o.organization_id=org and (actor_role='admin' or(o.owner_id=auth.uid() and o.kind=actor_role))),'[]')) into result;
 return result;
end $$;

create or replace function public.mir_submit_request(org uuid,request_id uuid,model uuid,publication_revision integer,configuration jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;p mir_core.model_publications;prior mir_core.request_keys;oid uuid;
 spec jsonb;payload jsonb;quantity integer;metal text;price bigint;field record;
 tariff jsonb; delivery jsonb; delivery_address mir_core.customer_addresses; distance numeric; fixed_cents bigint;begin
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
 if jsonb_typeof(coalesce(p.configuration_rules->'materials',spec->'allowed'->'materials'))='array' and not (coalesce(p.configuration_rules->'materials',spec->'allowed'->'materials') @> jsonb_build_array(metal)) then raise exception 'Métal non proposé pour ce modèle';end if;
 -- No client price, stock, role, owner or geometry is accepted as authoritative.
 if configuration - array['quantity','metal','color','measures','chantier','note','tariffRevision','deliveryAddressId','deliveryAddressVersion','deliveryFeeCents'] <> '{}'::jsonb then raise exception 'Champs non autorisés';end if;
 if jsonb_typeof(configuration->'measures') is distinct from 'object' then raise exception 'Mesures requises';end if;
 for field in select * from jsonb_each(p.locked_measures) loop
 if configuration->'measures'->field.key is distinct from field.value then raise exception 'Mesure verrouillée : %',field.key;end if;
 end loop;
 if configuration->'measures'->>'length' is distinct from p.sale_length_in::text then raise exception 'Longueur de vente non autorisée';end if;
 if coalesce(btrim(configuration->>'color'),'')='' or length(configuration->>'color')>200 then raise exception 'Couleur requise';end if;
 if jsonb_array_length(coalesce(p.configuration_rules->'colors','[]'))>0 and not(p.configuration_rules->'colors' @> jsonb_build_array(configuration->>'color')) then raise exception 'Couleur non proposée' using errcode='22023';end if;
 if p.configuration_rules ? 'color_edit_roles' and not(p.configuration_rules->'color_edit_roles' @> jsonb_build_array(actor_role)) and configuration->>'color' is distinct from p.configuration_rules->>'fixed_color' then raise exception 'Couleur verrouillée' using errcode='42501';end if;
 if p.configuration_rules ? 'measure_edit_roles' and not(p.configuration_rules->'measure_edit_roles' @> jsonb_build_array(actor_role)) and (configuration->'measures')-'length' is distinct from (p.standard_measures||p.locked_measures)-'length' then raise exception 'Mesures réservées à un autre rôle' using errcode='42501';end if;
 if actor_role='employee' and not exists(select 1 from mir_core.jobs j join mir_core.job_memberships a on(a.organization_id,a.job_id)=(j.organization_id,j.id) where j.organization_id=org and j.id::text=configuration->>'chantier' and not j.archived and a.user_id=auth.uid()) then raise exception 'Chantier non affecté' using errcode='42501';end if;
 if actor_role='client' then
  perform pg_advisory_xact_lock_shared(hashtextextended('boutique-bend-tariff:'||org::text,0));
  tariff:=mir_core.boutique_bend_tariff(org);
  if coalesce(configuration->>'tariffRevision','0') is distinct from tariff->>'revision' then
   raise exception 'Les tarifs ont changé. Vérifiez le nouveau prix.' using errcode='PT409';
  end if;
  fixed_cents:=case metal when 'aluminium' then p.aluminum_cents else p.steel_cents end;
  price:=mir_core.boutique_bend_price(spec,configuration->'measures',metal,fixed_cents,tariff);
  if configuration ? 'deliveryAddressId' then
   select * into delivery_address from mir_core.customer_addresses a
     where a.id=(configuration->>'deliveryAddressId')::uuid and a.user_id=auth.uid() for share;
   if not found or delivery_address.updated_at::text is distinct from configuration->>'deliveryAddressVersion' then
    raise exception 'Adresse indisponible ou modifiée. Vérifiez la livraison.' using errcode='PT409';
   end if;
   distance:=mir_core.boutique_delivery_km(delivery_address.id,delivery_address.address);
   delivery:=mir_core.boutique_delivery_result(distance,price*quantity,(tariff->>'delivery_cents')::bigint)
     ||jsonb_build_object('address',delivery_address.address);
   if delivery->'feeCents' is distinct from configuration->'deliveryFeeCents' then
    raise exception 'Les frais de livraison ont changé. Vérifiez la livraison.' using errcode='PT409';
   end if;
  end if;
 elsif configuration ? 'deliveryAddressId' or configuration ? 'deliveryAddressVersion' or configuration ? 'deliveryFeeCents' or configuration ? 'tariffRevision' then
  raise exception 'Tarifs et livraison réservés à la Boutique' using errcode='42501';
 end if;
 insert into mir_core.orders(organization_id,kind,owner_id) values(org,actor_role,auth.uid()) returning id into oid;
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot) values(org,oid,1,
 jsonb_build_object('modelId',model,'modelVersion',p.version,'publicationRevision',p.revision,'specification',spec,
 'configurationRules',p.configuration_rules,'configuration',configuration,'measureUnit','in','unitPriceCents',price,'totalCents',price*quantity,'currency','CAD','billingLengthIn',case when price is not null then 120 end,
 'tariffRevision',(tariff->>'revision')::integer,'delivery',delivery,'saleLengthIn',p.sale_length_in,'conditions',p.conditions,
 'validation','pending-admin-review','availability','unknown'));
 insert into mir_core.order_events(organization_id,order_id,event_type) values(org,oid,'request-submitted');
 insert into mir_core.request_keys values(org,auth.uid(),request_id,payload,oid);return oid;
end $$;

commit;
