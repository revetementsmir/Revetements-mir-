begin;
-- One master model; destinations are independent, not separate product copies.
create table mir_core.model_publications (
 organization_id uuid not null, model_id uuid not null, version integer not null,
 boutique boolean not null default false, store boolean not null default false, supplier_po boolean not null default false,
 aluminum_cents bigint check(aluminum_cents>0), steel_cents bigint check(steel_cents>0),
 conditions text not null default '', standard_measures jsonb not null default '{}',
 locked_measures jsonb not null default '{}', archived boolean not null default false,
 revision integer not null default 1 check(revision>0),
 primary key(organization_id,model_id),
 foreign key(organization_id,model_id,version) references mir_core.model_versions,
 check(not boutique or (aluminum_cents is not null and steel_cents is not null))
);
alter table mir_core.model_publications enable row level security;
revoke all on mir_core.model_publications from public,anon,authenticated;
grant select on mir_core.model_publications to authenticated;
create policy publication_read on mir_core.model_publications for select to authenticated using(
 mir_core.has_role(organization_id,array['admin']) or (not archived and (
 (boutique and mir_core.has_role(organization_id,array['client'])) or
 (store and mir_core.has_role(organization_id,array['employee'])))));
create function mir_core.publish_model(org uuid,model uuid,model_version integer,expected_revision integer,settings jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare current_revision integer; result integer; begin
 if not mir_core.has_role(org,array['admin']) then raise exception 'Admin requis' using errcode='42501';end if;
 perform 1 from mir_core.models where organization_id=org and id=model for update;
 if not found then raise exception 'Modèle absent';end if;
 select revision into current_revision from mir_core.model_publications where organization_id=org and model_id=model;
 if coalesce(current_revision,0) is distinct from expected_revision then raise exception 'Conflit de révision' using errcode='40001';end if;
 insert into mir_core.model_publications(organization_id,model_id,version,boutique,store,supplier_po,aluminum_cents,steel_cents,conditions,standard_measures,locked_measures,archived)
 values(org,model,model_version,coalesce((settings->>'boutique')::boolean,false),coalesce((settings->>'store')::boolean,false),coalesce((settings->>'supplier_po')::boolean,false),(settings->>'aluminum_cents')::bigint,(settings->>'steel_cents')::bigint,coalesce(settings->>'conditions',''),coalesce(settings->'standard_measures','{}'),coalesce(settings->'locked_measures','{}'),coalesce((settings->>'archived')::boolean,false))
 on conflict(organization_id,model_id) do update set version=excluded.version,boutique=excluded.boutique,store=excluded.store,supplier_po=excluded.supplier_po,aluminum_cents=excluded.aluminum_cents,steel_cents=excluded.steel_cents,conditions=excluded.conditions,standard_measures=excluded.standard_measures,locked_measures=excluded.locked_measures,archived=excluded.archived,revision=mir_core.model_publications.revision+1
 returning revision into result;return result;
end $$;
revoke all on function mir_core.publish_model(uuid,uuid,integer,integer,jsonb) from public;
grant execute on function mir_core.publish_model(uuid,uuid,integer,integer,jsonb) to authenticated;
commit;
