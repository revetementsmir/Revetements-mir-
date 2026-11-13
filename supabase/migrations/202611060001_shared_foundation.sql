-- Additive foundation. Deliberately outside the public API schema.
-- Apply only after inspecting the target project's existing schema and backup.
begin;
create schema mir_core;
revoke all on schema mir_core from public;
grant usage on schema mir_core to authenticated;

create table mir_core.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 200)
);
create table mir_core.memberships (
  organization_id uuid not null references mir_core.organizations,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','employee','client')),
  active boolean not null default true,
  primary key (organization_id,user_id)
);
-- Identity is always auth.uid(), never a browser-supplied user/role claim.
create function mir_core.has_role(org uuid, roles text[]) returns boolean
language sql stable security definer set search_path = pg_catalog, mir_core as $$
  select exists(select 1 from mir_core.memberships m where m.organization_id=org
    and m.user_id=auth.uid() and m.active and m.role=any(roles));
$$;
revoke all on function mir_core.has_role(uuid,text[]) from public;
grant execute on function mir_core.has_role(uuid,text[]) to authenticated;

create table mir_core.models (
  organization_id uuid not null references mir_core.organizations,
  id uuid not null default gen_random_uuid(), name text not null,
  archived boolean not null default false, primary key(organization_id,id)
);
create table mir_core.model_versions (
  organization_id uuid not null, model_id uuid not null, version integer not null check(version>0),
  -- Snapshot retains existing fractions, geometry, material and finish structures.
  specification jsonb not null check(jsonb_typeof(specification)='object'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(organization_id,model_id,version),
  foreign key(organization_id,model_id) references mir_core.models
);
create table mir_core.catalogue_items (
  organization_id uuid not null references mir_core.organizations,
  id uuid not null default gen_random_uuid(), name text not null,
  channel text not null check(channel in ('boutique','store')),
  published boolean not null default false, archived boolean not null default false,
  -- Public-facing specification only; costs belong to private supplier/order data.
  specification jsonb not null check(jsonb_typeof(specification)='object'),
  price_cents bigint check(price_cents>=0), currency text not null default 'CAD' check(currency='CAD'),
  model_id uuid, model_version integer,
  primary key(organization_id,id),
  check((model_id is null)=(model_version is null)),
  foreign key(organization_id,model_id,model_version) references mir_core.model_versions
);
create table mir_core.suppliers (
  organization_id uuid not null references mir_core.organizations,
  id uuid not null default gen_random_uuid(), name text not null, email text,
  verified_at timestamptz, archived boolean not null default false,
  contact jsonb not null default '{}', primary key(organization_id,id)
);
create table mir_core.orders (
  organization_id uuid not null references mir_core.organizations,
  id uuid not null default gen_random_uuid(),
  kind text not null check(kind in ('supplier','employee','client')),
  owner_id uuid not null references auth.users(id), supplier_id uuid,
  status text not null default 'draft' check(status in ('draft','approved','cancelled','closed')),
  revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(),
  primary key(organization_id,id),
  foreign key(organization_id,supplier_id) references mir_core.suppliers,
  check((kind='supplier')=(supplier_id is not null))
);
create function mir_core.can_read_order(org uuid, order_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,mir_core as $$
  select exists(select 1 from mir_core.orders o where o.organization_id=org and o.id=order_id
    and (mir_core.has_role(org,array['admin']) or (o.owner_id=auth.uid()
      and mir_core.has_role(org,array[o.kind]) and o.kind in ('employee','client'))));
$$;
revoke all on function mir_core.can_read_order(uuid,uuid) from public;
grant execute on function mir_core.can_read_order(uuid,uuid) to authenticated;
create table mir_core.order_revisions (
  organization_id uuid not null, order_id uuid not null, revision integer not null check(revision>0),
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), primary key(organization_id,order_id,revision),
  foreign key(organization_id,order_id) references mir_core.orders
);
create table mir_core.order_lines (
  organization_id uuid not null, order_id uuid not null, revision integer not null,
  id uuid not null default gen_random_uuid(), quantity numeric not null check(quantity>0),
  unit text not null check(length(unit)>0), specification jsonb not null check(jsonb_typeof(specification)='object'),
  price_cents bigint check(price_cents>=0),
  -- Nullable model reference deliberately supports direct addition to a PO.
  model_id uuid, model_version integer,
  primary key(organization_id,id),
  check((model_id is null)=(model_version is null)),
  foreign key(organization_id,order_id,revision) references mir_core.order_revisions,
  foreign key(organization_id,model_id,model_version) references mir_core.model_versions
);
create table mir_core.order_events (
  organization_id uuid not null, order_id uuid not null, id uuid not null default gen_random_uuid(),
  event_type text not null, actor_id uuid not null default auth.uid() references auth.users(id),
  details jsonb not null default '{}', created_at timestamptz not null default now(),
  primary key(organization_id,id), foreign key(organization_id,order_id) references mir_core.orders
);
create table mir_core.documents (
  organization_id uuid not null, id uuid not null default gen_random_uuid(),
  order_id uuid not null, revision integer not null,
  object_path text not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  primary key(organization_id,id), unique(organization_id,object_path),
  foreign key(organization_id,order_id,revision) references mir_core.order_revisions,
  unique(organization_id,id,order_id,revision)
);
-- Preparation only: no mail provider, trigger or network dispatch is installed.
create table mir_core.send_jobs (
  organization_id uuid not null, id uuid not null default gen_random_uuid(),
  order_id uuid not null, revision integer not null, document_id uuid not null,
  operation text not null check(operation in ('purchase-order','cancellation')),
  idempotency_key uuid not null, recipient text not null,
  status text not null default 'queued' check(status in ('queued','processing','accepted','delivered','failed','uncertain')),
  provider_message_id text, created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(organization_id,idempotency_key),
  unique(organization_id,order_id,revision,operation),
  foreign key(organization_id,document_id,order_id,revision) references mir_core.documents(organization_id,id,order_id,revision)
);
create table mir_core.send_attempts (
  organization_id uuid not null, id uuid not null default gen_random_uuid(), job_id uuid not null,
  status text not null check(status in ('accepted','failed','uncertain')),
  provider_message_id text, created_at timestamptz not null default now(),
  primary key(organization_id,id), foreign key(organization_id,job_id) references mir_core.send_jobs,
  check(status<>'accepted' or coalesce(length(provider_message_id),0)>0)
);
create table mir_core.import_batches (
  organization_id uuid not null references mir_core.organizations,
  id uuid not null default gen_random_uuid(), backup_sha256 text not null check(backup_sha256 ~ '^[a-f0-9]{64}$'),
  -- Quarantine only: never inserts into live models/orders or sends an email.
  backup jsonb not null, state text not null default 'staged' check(state in ('staged','reverted')),
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
  primary key(organization_id,id), unique(organization_id,backup_sha256)
);

-- Deny by default. No anonymous access, no browser write to send/import tables.
do $$ declare t text; begin
  foreach t in array array['organizations','memberships','models','model_versions','catalogue_items','suppliers','orders','order_revisions','order_lines','order_events','documents','send_jobs','send_attempts','import_batches'] loop
    execute format('alter table mir_core.%I enable row level security',t);
    execute format('revoke all on mir_core.%I from public, anon, authenticated',t);
    execute format('grant select on mir_core.%I to authenticated',t);
  end loop;
end $$;
create policy organization_read on mir_core.organizations for select to authenticated
  using(mir_core.has_role(id,array['admin','employee','client']));
create policy membership_read on mir_core.memberships for select to authenticated
  using(mir_core.has_role(organization_id,array['admin']) or (user_id=auth.uid() and active));
-- Membership writes deliberately require a trusted provisioning path, preventing
-- self-escalation and accidental removal of the last administrator.
do $$ declare t text; begin
  foreach t in array array['models','model_versions','suppliers','orders','order_revisions','order_lines','order_events','documents'] loop
    execute format('create policy admin_access on mir_core.%I for all to authenticated using(mir_core.has_role(organization_id,array[''admin''])) with check(mir_core.has_role(organization_id,array[''admin'']))',t);
    execute format('grant insert on mir_core.%I to authenticated',t);
  end loop;
end $$;
grant update on mir_core.models,mir_core.suppliers,mir_core.orders to authenticated;
-- Version snapshots, lines, documents and events remain append-only for API users.
create policy catalogue_read on mir_core.catalogue_items for select to authenticated using(
  mir_core.has_role(organization_id,array['admin']) or (published and not archived and
    ((channel='store' and mir_core.has_role(organization_id,array['employee'])) or
     (channel='boutique' and mir_core.has_role(organization_id,array['client'])))));
create policy catalogue_write on mir_core.catalogue_items for all to authenticated
  using(mir_core.has_role(organization_id,array['admin'])) with check(mir_core.has_role(organization_id,array['admin']));
grant insert,update on mir_core.catalogue_items to authenticated;
create policy owner_order_read on mir_core.orders for select to authenticated
  using(mir_core.can_read_order(organization_id,id));
do $$ declare t text; begin
  foreach t in array array['order_revisions','order_lines'] loop
    execute format('create policy owner_read on mir_core.%I for select to authenticated using(mir_core.can_read_order(organization_id,order_id))',t);
  end loop;
  foreach t in array array['send_jobs','send_attempts','import_batches'] loop
    execute format('create policy admin_read on mir_core.%I for select to authenticated using(mir_core.has_role(organization_id,array[''admin'']))',t);
  end loop;
end $$;
create index memberships_user on mir_core.memberships(user_id);
create index orders_owner on mir_core.orders(organization_id,owner_id);

-- Stage a validated exact-text local backup. Idempotence is computed server-side.
create function mir_core.stage_local_backup(org uuid, payload jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare entry jsonb; parsed jsonb; rows jsonb; record jsonb; k text; digest text; result uuid; begin
  if not mir_core.has_role(org,array['admin']) then raise exception 'Admin actif requis' using errcode='42501'; end if;
  if payload is null or payload->>'schema' is distinct from 'mir-local-backup-1' or jsonb_typeof(payload->'entries') is distinct from 'array'
    or jsonb_array_length(payload->'entries')=0 or octet_length(payload::text)>10485760 then
    raise exception 'Sauvegarde invalide' using errcode='22023';
  end if;
  for entry in select value from jsonb_array_elements(payload->'entries') loop
    k:=entry->>'key';
    if k is null or k not in ('mir_production_templates_v1','mir_production_requests_v1',
      'mir_production_admin_dossier_v1','mir_production_employee_dossier_v1',
      'mir_production_client_dossier_v1','mir_admin_procurement_v1','mir_production_admin_orders_v1')
      or jsonb_typeof(entry->'raw') is distinct from 'string' then
      raise exception 'Clé de sauvegarde interdite' using errcode='22023';
    end if;
    parsed:=(entry->>'raw')::jsonb;
    rows:=null;
    if k='mir_production_admin_orders_v1' then
      if jsonb_typeof(parsed) is distinct from 'array' then raise exception 'Archive invalide' using errcode='22023'; end if;
      rows:=parsed;
    elsif jsonb_typeof(parsed) is distinct from 'object' or parsed->>'version' is distinct from '1' then
      raise exception 'Version locale inconnue' using errcode='22023';
    elsif k='mir_production_templates_v1' then rows:=parsed->'records';
    elsif k='mir_production_requests_v1' then rows:=parsed->'requests';
    elsif k='mir_admin_procurement_v1' then
      rows:=parsed->'suppliers';
      if jsonb_typeof(rows) is distinct from 'array' or jsonb_typeof(parsed->'orders') is distinct from 'array' then
        raise exception 'Fournisseurs/bons invalides' using errcode='22023';
      end if;
      rows:=rows || (parsed->'orders');
    else rows:=parsed->'order'->'items';
    end if;
    if jsonb_typeof(rows) is distinct from 'array' then raise exception 'Liste locale absente' using errcode='22023'; end if;
    for record in select value from jsonb_array_elements(rows) loop
      if jsonb_typeof(record) is distinct from 'object' or jsonb_typeof(record->'id') is distinct from 'string'
        or length(record->>'id')=0 then raise exception 'Identifiant local invalide' using errcode='22023'; end if;
      if k='mir_production_templates_v1' and (jsonb_typeof(record->'versions') is distinct from 'array'
        or jsonb_array_length(record->'versions')=0) then raise exception 'Versions absentes' using errcode='22023'; end if;
    end loop;
    -- Suppliers and orders have separate identity spaces.
    if k='mir_admin_procurement_v1' then
      if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(parsed->'suppliers'))
        or (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(parsed->'orders')) then
        raise exception 'Identifiant dupliqué' using errcode='22023'; end if;
    elsif (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(rows)) then
      raise exception 'Identifiant dupliqué' using errcode='22023';
    end if;
  end loop;
  if (select count(*)<>count(distinct value->>'key') from jsonb_array_elements(payload->'entries')) then
    raise exception 'Clé dupliquée' using errcode='22023';
  end if;
  -- Sort by key; browser dates and entry order cannot defeat deduplication.
  select encode(sha256(convert_to(jsonb_agg(jsonb_build_object('key',value->>'key','raw',value->>'raw') order by value->>'key')::text,'UTF8')),'hex')
    into digest from jsonb_array_elements(payload->'entries');
  insert into mir_core.import_batches(organization_id,backup_sha256,backup)
    values(org,digest,payload) on conflict(organization_id,backup_sha256) do nothing;
  select id into result from mir_core.import_batches where organization_id=org and backup_sha256=digest;
  return result;
end $$;
create function mir_core.revert_staged_backup(org uuid,batch uuid) returns void
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
begin
  if not mir_core.has_role(org,array['admin']) then raise exception 'Admin actif requis' using errcode='42501'; end if;
  update mir_core.import_batches set state='reverted' where organization_id=org and id=batch;
  if not found then raise exception 'Import absent' using errcode='22023'; end if;
end $$;
revoke all on function mir_core.stage_local_backup(uuid,jsonb),mir_core.revert_staged_backup(uuid,uuid) from public;
grant execute on function mir_core.stage_local_backup(uuid,jsonb),mir_core.revert_staged_backup(uuid,uuid) to authenticated;
commit;
