-- Transport sécurisé généré depuis 20261110120000_operational_roles_phase1.sql
-- Ne pas rejouer le fichier historique en parallèle de ce transport.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(hashtextextended('mir-backend-punch-transport',0));
create table if not exists mir_core.backend_migration_checkpoints(
 source_file text primary key, source_sha256 text not null, schema_fingerprint text not null, applied_at timestamptz not null default now()
);
alter table mir_core.backend_migration_checkpoints enable row level security;
revoke all on mir_core.backend_migration_checkpoints from public,anon,authenticated,service_role;
do $transport$
declare existing record; current_fingerprint text;
begin
 select md5(string_agg(item,E'\n' order by item)) from (
 select 'table:'||n.nspname||'.'||c.relname||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'') item from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relkind in('r','p') and c.relname<>'backend_migration_checkpoints'
 union all select 'column:'||n.nspname||'.'||c.relname||'.'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='mir_core' and a.attnum>0 and not a.attisdropped and c.relname<>'backend_migration_checkpoints'
 union all select 'constraint:'||n.nspname||'.'||c.relname||'.'||k.conname||':'||pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relname<>'backend_migration_checkpoints'
 union all select 'index:'||indexdef from pg_indexes where schemaname='mir_core' and tablename<>'backend_migration_checkpoints'
 union all select 'function:'||pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and (n.nspname='mir_core' or n.nspname='public' and p.proname like 'mir_%')
 union all select 'policy:'||to_jsonb(p)::text from pg_policies p where schemaname='mir_core' or schemaname='storage' and policyname like 'mir_job_document_%'
 union all select 'trigger:'||pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and not t.tgisinternal
 union all select 'bucket:'||id||':'||public||':'||file_size_limit||':'||allowed_mime_types::text from storage.buckets where id='mir-job-documents'
) state into current_fingerprint;
 select * into existing from mir_core.backend_migration_checkpoints where source_file='20261110120000_operational_roles_phase1.sql';
 if found then
  if existing.source_sha256<>'896c3a7b4a1b5a0fecb640ceb587caaeb1ac0ecace8270f2a2e54f22ebffbed4' or existing.schema_fingerprint<>current_fingerprint then
   raise exception 'Checkpoint incompatible ou dérive de schéma: 20261110120000_operational_roles_phase1.sql';
  end if;
  return;
 end if;
 if exists(select 1 from mir_core.backend_migration_checkpoints where schema_fingerprint<>current_fingerprint) then
  raise exception 'Dérive de schéma avant 20261110120000_operational_roles_phase1.sql';
 end if;
if (select count(*) from mir_core.backend_migration_checkpoints where source_file in('20261110020000_punch_gps.sql'))<>1 then raise exception 'Dépendance de transport absente avant 20261110120000_operational_roles_phase1.sql'; end if;

 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='mir_core' and p.proname='operational_role') then raise exception 'Fonction préexistante à comparer avant installation: mir_core.operational_role'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_my_operational_access') then raise exception 'Fonction préexistante à comparer avant installation: public.mir_my_operational_access'; end if;
 execute '-- Phase 1: stable operational role contract for the MIR internal platform.
-- Existing membership roles remain untouched for backward compatibility.

create or replace function mir_core.operational_role(org uuid, member uuid default auth.uid())
returns text
language sql stable security definer
set search_path=pg_catalog,mir_core
as $$
  select case
    when exists (
      select 1 from mir_core.memberships m
      where m.organization_id=org and m.user_id=member and m.active and m.role=''admin''
    ) then ''boss''
    else (
      select case p.staff_role
        when ''assistant'' then ''adjointe''
        when ''chef_equipe'' then ''chef_equipe''
        when ''employe'' then ''employe_chantier''
        when ''warehouse'' then ''entrepot_livraison''
        when ''boss'' then ''boss''
      end
      from mir_core.staff_capabilities p
      join mir_core.memberships m
        on (m.organization_id,m.user_id)=(p.organization_id,p.user_id)
      where p.organization_id=org and p.user_id=member
        and p.active and m.active and m.role=''employee''
    )
  end;
$$;

comment on function mir_core.operational_role(uuid,uuid) is
''Canonical internal role: boss, adjointe, chef_equipe, employe_chantier or entrepot_livraison. Never trusts a browser supplied role.'';

revoke all on function mir_core.operational_role(uuid,uuid) from public,anon;
grant execute on function mir_core.operational_role(uuid,uuid) to authenticated;

create or replace function public.mir_my_operational_access(org uuid)
returns jsonb
language plpgsql stable security definer
set search_path=pg_catalog,mir_core
as $$
declare r text;
begin
  r:=mir_core.operational_role(org,auth.uid());
  if r is null then
    raise exception ''Accès MIR inactif'' using errcode=''42501'';
  end if;
  return jsonb_build_object(
    ''role'',r,
    ''navigation'',case r
      when ''boss'' then jsonb_build_array(''aujourdhui'',''chantiers'',''argent'',''plus'')
      when ''adjointe'' then jsonb_build_array(''aujourdhui'',''cedule'',''demandes'',''plus'')
      when ''chef_equipe'' then jsonb_build_array(''aujourdhui'',''plans'',''photos'',''plus'')
      when ''employe_chantier'' then jsonb_build_array(''aujourdhui'',''plans'',''photos'',''plus'')
      when ''entrepot_livraison'' then jsonb_build_array(''ma_journee'',''scanner'',''livraisons'',''inventaire'')
    end
  );
end;
$$;

revoke all on function public.mir_my_operational_access(uuid) from public,anon;
grant execute on function public.mir_my_operational_access(uuid) to authenticated;

';
 select md5(string_agg(item,E'\n' order by item)) from (
 select 'table:'||n.nspname||'.'||c.relname||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'') item from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relkind in('r','p') and c.relname<>'backend_migration_checkpoints'
 union all select 'column:'||n.nspname||'.'||c.relname||'.'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='mir_core' and a.attnum>0 and not a.attisdropped and c.relname<>'backend_migration_checkpoints'
 union all select 'constraint:'||n.nspname||'.'||c.relname||'.'||k.conname||':'||pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and c.relname<>'backend_migration_checkpoints'
 union all select 'index:'||indexdef from pg_indexes where schemaname='mir_core' and tablename<>'backend_migration_checkpoints'
 union all select 'function:'||pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and (n.nspname='mir_core' or n.nspname='public' and p.proname like 'mir_%')
 union all select 'policy:'||to_jsonb(p)::text from pg_policies p where schemaname='mir_core' or schemaname='storage' and policyname like 'mir_job_document_%'
 union all select 'trigger:'||pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='mir_core' and not t.tgisinternal
 union all select 'bucket:'||id||':'||public||':'||file_size_limit||':'||allowed_mime_types::text from storage.buckets where id='mir-job-documents'
) state into current_fingerprint;
 update mir_core.backend_migration_checkpoints set schema_fingerprint=current_fingerprint;
 insert into mir_core.backend_migration_checkpoints(source_file,source_sha256,schema_fingerprint) values('20261110120000_operational_roles_phase1.sql','896c3a7b4a1b5a0fecb640ceb587caaeb1ac0ecace8270f2a2e54f22ebffbed4',current_fingerprint);
end$transport$;
commit;
