-- Additive, not applied remotely by CI or Pages. Inspect hosted schema before applying.
begin;
-- Refuse to replace a function changed by another contributor since the audit.
do $$
declare item record;begin
 for item in select * from (values
 ('public.mir_shared_snapshot(uuid)',array['8c5bc3a1954aa2958098f74476210628']),
 ('public.mir_submit_request(uuid,uuid,uuid,integer,jsonb)',array['6299362c756b6071529ec32434c79300']),
 ('public.mir_admin_publish_model(uuid,uuid,integer,jsonb)',array['79f43161228c0e7e45b3fdd3a2b113d6']),
 ('public.mir_add_master_version(uuid,uuid,integer,jsonb)',array['6b63c4845499272b6a2bf8eae9c21617','70aa54f7edcf682d377109f58511d2cb'])
 ) as expected(signature,hashes) loop
 if to_regprocedure(item.signature) is null or not(md5(pg_get_functiondef(to_regprocedure(item.signature)))=any(item.hashes)) then
 raise exception 'Fonction absente ou modifiée depuis audit : %. Arrêter et examiner les changements.',item.signature using errcode='40001';end if;
 end loop;
end $$;
alter table mir_core.model_publications add column configuration_rules jsonb not null default '{}' check(jsonb_typeof(configuration_rules)='object');
-- Pure validator: no privileged lookup and no new public RPC.
create function mir_core.validate_configuration_rules(rules jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog as $$
declare k text;v jsonb;begin
 if jsonb_typeof(rules) is distinct from 'object' or octet_length(rules::text)>32768 or rules-array['materials','colors','fixed_color','color_edit_roles','measure_edit_roles']<>'{}'::jsonb then raise exception 'Règles de configuration invalides' using errcode='22023';end if;
 foreach k in array array['materials','colors','color_edit_roles','measure_edit_roles'] loop
 if rules ? k then
 if jsonb_typeof(rules->k) is distinct from 'array' then raise exception 'Liste attendue : %',k using errcode='22023';end if;
 if jsonb_array_length(rules->k)>100 then raise exception 'Liste trop longue' using errcode='22023';end if;
 for v in select value from jsonb_array_elements(rules->k) loop
 if jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}')) not between 1 and 200 then raise exception 'Valeur invalide' using errcode='22023';end if;
 if k='materials' and v#>>'{}' not in ('aluminium','acier') then raise exception 'Métal inconnu' using errcode='22023';end if;
 if k in ('color_edit_roles','measure_edit_roles') and v#>>'{}' not in ('client','employee') then raise exception 'Rôle inconnu' using errcode='22023';end if;
 end loop;
 end if;end loop;
 if rules ? 'materials' and jsonb_array_length(rules->'materials')=0 then raise exception 'Au moins un métal requis' using errcode='22023';end if;
 if rules ? 'color_edit_roles' and not(rules->'color_edit_roles' @> '["client","employee"]'::jsonb) then
 if jsonb_typeof(rules->'fixed_color') is distinct from 'string' or length(btrim(rules->>'fixed_color')) not between 1 and 200 then raise exception 'Couleur fixe requise pour les rôles verrouillés' using errcode='22023';end if;
 end if;
 if rules ? 'fixed_color' and (jsonb_typeof(rules->'fixed_color') is distinct from 'string' or length(btrim(rules->>'fixed_color')) not between 1 and 200 or (jsonb_array_length(coalesce(rules->'colors','[]'))>0 and not(rules->'colors' @> jsonb_build_array(rules->>'fixed_color')))) then raise exception 'Couleur fixe non autorisée' using errcode='22023';end if;
end $$;
revoke all on function mir_core.validate_configuration_rules(jsonb) from public,anon,authenticated;
create or replace function public.mir_admin_publish_model(org uuid,model uuid,expected_revision integer,settings jsonb) returns integer
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
 if settings ? 'configuration_rules' then
 perform mir_core.validate_configuration_rules(settings->'configuration_rules');
 update mir_core.model_publications set configuration_rules=settings->'configuration_rules' where organization_id=org and model_id=model;
 end if;
 new_revision:=mir_core.publish_model(org,model,ver,expected_revision,settings);
 return new_revision;
end $$;

create or replace function public.mir_shared_snapshot(org uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;result jsonb;begin
 select role into actor_role from mir_core.memberships where organization_id=org and user_id=auth.uid() and active;
 if actor_role is null then raise exception 'Accès MIR inactif' using errcode='42501';end if;
 select jsonb_build_object('capabilities',jsonb_build_object('publicationRules',true),'role',actor_role,'organizationId',org,'catalogue',coalesce((
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
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'kind',o.kind,'status',o.status,'createdAt',o.created_at,
 'snapshot',r.snapshot)) from mir_core.orders o join mir_core.order_revisions r
 on(r.organization_id,r.order_id,r.revision)=(o.organization_id,o.id,o.revision)
 where o.organization_id=org and (actor_role='admin' or(o.owner_id=auth.uid() and o.kind=actor_role))),'[]')) into result;
 return result;
end $$;

create or replace function public.mir_submit_request(org uuid,request_id uuid,model uuid,publication_revision integer,configuration jsonb)
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
 if jsonb_typeof(coalesce(p.configuration_rules->'materials',spec->'allowed'->'materials'))='array' and not (coalesce(p.configuration_rules->'materials',spec->'allowed'->'materials') @> jsonb_build_array(metal)) then raise exception 'Métal non proposé pour ce modèle';end if;
 -- No client price, stock, role, owner or geometry is accepted as authoritative.
 if configuration - array['quantity','metal','color','measures','chantier','note'] <> '{}'::jsonb then raise exception 'Champs non autorisés';end if;
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
 price:=case when actor_role='client' and p.sale_length_in=120 then case metal when 'aluminium' then p.aluminum_cents else p.steel_cents end else null end;
 if actor_role='client' and p.sale_length_in=120 and price is null then raise exception 'Tarif non défini';end if;
 select specification into spec from mir_core.model_versions where organization_id=org and model_id=model and version=p.version;
 insert into mir_core.orders(organization_id,kind,owner_id) values(org,actor_role,auth.uid()) returning id into oid;
 insert into mir_core.order_revisions(organization_id,order_id,revision,snapshot) values(org,oid,1,
 jsonb_build_object('modelId',model,'modelVersion',p.version,'publicationRevision',p.revision,'specification',spec,
 'configurationRules',p.configuration_rules,'configuration',configuration,'measureUnit','in','unitPriceCents',price,'totalCents',price*quantity,'currency','CAD','saleLengthIn',p.sale_length_in,'conditions',p.conditions,
 'validation','pending-admin-review','availability','unknown'));
 insert into mir_core.order_events(organization_id,order_id,event_type) values(org,oid,'request-submitted');
 insert into mir_core.request_keys values(org,auth.uid(),request_id,payload,oid);return oid;
end $$;

create or replace function public.mir_add_master_version(org uuid,model uuid,expected_revision integer,template jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare v integer;p mir_core.model_publications;begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 perform 1 from mir_core.models where organization_id=org and id=model for update;
 select * into p from mir_core.model_publications where organization_id=org and model_id=model;
 if not found or p.revision<>expected_revision then raise exception 'Conflit de révision' using errcode='40001';end if;
 if template->>'schema' is distinct from 'mir-production-template-1' or jsonb_typeof(template->'fields') is distinct from 'array' then raise exception 'Géométrie inconnue';end if;
 select max(version)+1 into v from mir_core.model_versions where organization_id=org and model_id=model;
 if (template->>'version')::integer is distinct from v then raise exception 'Numéro de version suivant requis';end if;
 insert into mir_core.model_versions(organization_id,model_id,version,specification) values(org,model,v,(select specification-'template' from mir_core.model_versions where organization_id=org and model_id=model and version=p.version)||jsonb_build_object('template',template));
 update mir_core.model_publications set version=v,revision=revision+1,boutique=false,store=false,supplier_po=false where organization_id=org and model_id=model;
 return p.revision+1;
end $$;
revoke all on function public.mir_shared_snapshot(uuid),public.mir_submit_request(uuid,uuid,uuid,integer,jsonb),public.mir_add_master_version(uuid,uuid,integer,jsonb),public.mir_admin_publish_model(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.mir_shared_snapshot(uuid),public.mir_submit_request(uuid,uuid,uuid,integer,jsonb),public.mir_add_master_version(uuid,uuid,integer,jsonb),public.mir_admin_publish_model(uuid,uuid,integer,jsonb) to authenticated;
commit;
