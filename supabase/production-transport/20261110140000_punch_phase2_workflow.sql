-- Transport sécurisé généré depuis 20261110140000_punch_phase2_workflow.sql
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
 select * into existing from mir_core.backend_migration_checkpoints where source_file='20261110140000_punch_phase2_workflow.sql';
 if found then
  if existing.source_sha256<>'68a1ce96fbb63e4fc28095f2d4f3825a5dd4620ca7f78f90d1cf6bd45d9dbb9d' or existing.schema_fingerprint<>current_fingerprint then
   raise exception 'Checkpoint incompatible ou dérive de schéma: 20261110140000_punch_phase2_workflow.sql';
  end if;
  return;
 end if;
 if exists(select 1 from mir_core.backend_migration_checkpoints where schema_fingerprint<>current_fingerprint) then
  raise exception 'Dérive de schéma avant 20261110140000_punch_phase2_workflow.sql';
 end if;
if (select count(*) from mir_core.backend_migration_checkpoints where source_file in('20261110020000_punch_gps.sql','20261110120000_operational_roles_phase1.sql','20261110130000_punch_phase2_integrity.sql'))<>3 then raise exception 'Dépendance de transport absente avant 20261110140000_punch_phase2_workflow.sql'; end if;

 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_snapshot_phase1') then raise exception 'Alias préexistant à comparer: public.mir_punch_snapshot_phase1'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_admin_phase2') then raise exception 'Alias préexistant à comparer: public.mir_punch_admin_phase2'; end if;
 execute '-- MIR Phase 2: manager corrections, period approval/locking and visible bank history.

alter function public.mir_punch_snapshot(uuid,uuid)
  rename to mir_punch_snapshot_phase1;

create function public.mir_punch_snapshot(org uuid, employee uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,mir_core,public
as $$
declare
  target uuid:=coalesce(employee,auth.uid());
  result jsonb;
  manager boolean:=mir_core.punch_manager(org);
begin
  result:=public.mir_punch_snapshot_phase1(org,target);
  result:=result||jsonb_build_object(
    ''bankHistory'',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc,b.id desc)
      from (select * from mir_core.time_bank_movements
        where organization_id=org and employee_id=target order by created_at desc,id desc limit 25) b),''[]''::jsonb),
    ''periods'',case when manager then coalesce((select jsonb_agg(to_jsonb(p) order by p.starts_on desc)
      from mir_core.time_periods p where p.organization_id=org and p.ends_on>=current_date-60),''[]''::jsonb) else ''[]''::jsonb end
  );
  return result;
end$$;

revoke all on function public.mir_punch_snapshot_phase1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mir_punch_snapshot(uuid,uuid) from public,anon;
grant execute on function public.mir_punch_snapshot(uuid,uuid) to authenticated;

alter function public.mir_punch_admin(uuid,text,jsonb)
  rename to mir_punch_admin_phase2;

create function public.mir_punch_admin(org uuid, action text, payload jsonb default ''{}'')
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,mir_core,public
as $$
declare
  role_name text:=mir_core.staff_role(org);
  period_id uuid;
  shift_row mir_core.punch_shifts;
  before_data jsonb;
  after_data jsonb;
  new_start timestamptz;
  new_end timestamptz;
begin
  if action not in(''period_save'',''approve_period'',''lock_period'',''shift_correct'') then
    return public.mir_punch_admin_phase2(org,action,payload);
  end if;
  if role_name not in(''admin'',''boss'') then
    raise exception ''Boss requis'' using errcode=''42501'';
  end if;
  if btrim(coalesce(payload->>''reason'',''''))='''' then
    raise exception ''Motif requis'' using errcode=''22023'';
  end if;

  if action=''period_save'' then
    insert into mir_core.time_periods(organization_id,label,starts_on,ends_on,status,reopen_reason)
    values(org,payload->>''label'',(payload->>''startsOn'')::date,(payload->>''endsOn'')::date,''open'',payload->>''reason'')
    on conflict(organization_id,starts_on,ends_on) do update set label=excluded.label
    returning id into period_id;
  elsif action in(''approve_period'',''lock_period'') then
    period_id:=(payload->>''periodId'')::uuid;
    update mir_core.time_periods
      set status=case when action=''approve_period'' then ''approved'' else ''locked'' end,
          locked_by=case when action=''lock_period'' then auth.uid() else locked_by end,
          locked_at=case when action=''lock_period'' then now() else locked_at end,
          reopen_reason=payload->>''reason''
      where organization_id=org and id=period_id
        and (action=''approve_period'' and status in(''open'',''review'',''reopened'')
          or action=''lock_period'' and status=''approved'');
    if not found then raise exception ''Transition de semaine invalide'' using errcode=''22023'';end if;
    if action=''lock_period'' then
      update mir_core.punch_shifts s set status=''locked''
      from mir_core.time_periods p
      where p.organization_id=org and p.id=period_id
        and s.organization_id=org and s.work_date between p.starts_on and p.ends_on;
    end if;
  else
    select * into shift_row from mir_core.punch_shifts
      where organization_id=org and id=(payload->>''shiftId'')::uuid for update;
    if shift_row.id is null then raise exception ''Journée introuvable'' using errcode=''22023'';end if;
    new_start:=coalesce(nullif(payload->>''startedAt'','''')::timestamptz,shift_row.started_at);
    new_end:=coalesce(nullif(payload->>''endedAt'','''')::timestamptz,shift_row.ended_at);
    if new_end is null or new_end<new_start then raise exception ''Heures corrigées invalides'' using errcode=''22023'';end if;
    before_data:=jsonb_build_object(''startedAt'',shift_row.started_at,''endedAt'',shift_row.ended_at,
      ''workDate'',shift_row.work_date,''autoBreakMinutes'',shift_row.auto_break_minutes,''status'',shift_row.status);
    update mir_core.punch_segments set started_at=new_start
      where organization_id=org and shift_id=shift_row.id and started_at=shift_row.started_at
        and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=shift_row.id order by started_at,id limit 1);
    update mir_core.punch_segments set ended_at=new_end
      where organization_id=org and shift_id=shift_row.id and ended_at=shift_row.ended_at
        and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=shift_row.id order by started_at desc,id desc limit 1);
    update mir_core.punch_shifts set started_at=new_start,ended_at=new_end,work_date=(new_start at time zone ''America/Toronto'')::date
      where organization_id=org and id=shift_row.id returning
      jsonb_build_object(''startedAt'',started_at,''endedAt'',ended_at,''workDate'',work_date,
        ''autoBreakMinutes'',auto_break_minutes,''status'',status) into after_data;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
      values(org,auth.uid(),shift_row.employee_id,''shift_correct'',''shift'',shift_row.id,payload->>''reason'',
        jsonb_build_object(''before'',before_data,''after'',after_data));
    return jsonb_build_object(''ok'',true,''before'',before_data,''after'',after_data);
  end if;

  insert into mir_core.punch_audit(organization_id,actor_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),action,''period'',period_id,payload->>''reason'',payload);
  return jsonb_build_object(''ok'',true,''periodId'',period_id);
end$$;

revoke all on function public.mir_punch_admin_phase2(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_admin(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_punch_admin(uuid,text,jsonb) to authenticated;

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
 insert into mir_core.backend_migration_checkpoints(source_file,source_sha256,schema_fingerprint) values('20261110140000_punch_phase2_workflow.sql','68a1ce96fbb63e4fc28095f2d4f3825a5dd4620ca7f78f90d1cf6bd45d9dbb9d',current_fingerprint);
end$transport$;
commit;
