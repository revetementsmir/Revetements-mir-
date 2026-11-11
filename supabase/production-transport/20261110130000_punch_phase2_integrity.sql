-- Transport sécurisé généré depuis 20261110130000_punch_phase2_integrity.sql
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
 select * into existing from mir_core.backend_migration_checkpoints where source_file='20261110130000_punch_phase2_integrity.sql';
 if found then
  if existing.source_sha256<>'ef7141911e8649adae1185b47f9538af9726489567ce073ac78a214f23e6bb23' or existing.schema_fingerprint<>current_fingerprint then
   raise exception 'Checkpoint incompatible ou dérive de schéma: 20261110130000_punch_phase2_integrity.sql';
  end if;
  return;
 end if;
 if exists(select 1 from mir_core.backend_migration_checkpoints where schema_fingerprint<>current_fingerprint) then
  raise exception 'Dérive de schéma avant 20261110130000_punch_phase2_integrity.sql';
 end if;
if (select count(*) from mir_core.backend_migration_checkpoints where source_file in('20261110020000_punch_gps.sql','20261110120000_operational_roles_phase1.sql'))<>2 then raise exception 'Dépendance de transport absente avant 20261110130000_punch_phase2_integrity.sql'; end if;

 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_action_phase1') then raise exception 'Alias préexistant à comparer: public.mir_punch_action_phase1'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_correction_phase1') then raise exception 'Alias préexistant à comparer: public.mir_punch_correction_phase1'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_admin_phase1') then raise exception 'Alias préexistant à comparer: public.mir_punch_admin_phase1'; end if;
 execute '-- MIR Phase 2: lunch exception, locked weeks and traceable time-bank balances.

create unique index if not exists punch_one_pending_lunch_request
  on mir_core.punch_corrections(organization_id, employee_id, shift_id)
  where correction_type = ''lunch_not_taken'' and status in (''pending'', ''clarification'');

alter function public.mir_punch_action(uuid,uuid,text,uuid,jsonb)
  rename to mir_punch_action_phase1;

create function public.mir_punch_action(org uuid, request_id uuid, action text, job uuid default null, payload jsonb default ''{}'')
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,mir_core,public
as $$
begin
  if exists (
    select 1 from mir_core.time_periods p
    where p.organization_id=org
      and current_date between p.starts_on and p.ends_on
      and p.status=''locked''
  ) then
    raise exception ''Cette semaine est verrouillée; demandez une correction documentée'' using errcode=''42501'';
  end if;
  return public.mir_punch_action_phase1(org,request_id,action,job,payload);
end$$;

revoke all on function public.mir_punch_action_phase1(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) to authenticated;

alter function public.mir_punch_correction(uuid,uuid,jsonb)
  rename to mir_punch_correction_phase1;

create function public.mir_punch_correction(org uuid, correction uuid default null, payload jsonb default ''{}'')
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,mir_core,public
as $$
declare
  result uuid;
  c mir_core.punch_corrections;
  s mir_core.punch_shifts;
begin
  if correction is null and payload->>''type''=''lunch_not_taken'' then
    select * into s from mir_core.punch_shifts
      where organization_id=org and id=nullif(payload->>''shiftId'','''')::uuid and employee_id=auth.uid();
    if s.id is null or s.ended_at is null then
      raise exception ''Une journée terminée est requise'' using errcode=''22023'';
    end if;
    if s.auto_break_minutes<=0 then
      raise exception ''Aucun dîner automatique à corriger'' using errcode=''22023'';
    end if;
    result:=public.mir_punch_correction_phase1(org,null,payload);
    update mir_core.punch_corrections
      set original_data=jsonb_build_object(
        ''startedAt'',s.started_at,''endedAt'',s.ended_at,
        ''autoBreakMinutes'',s.auto_break_minutes,
        ''grossMinutes'',floor(extract(epoch from(s.ended_at-s.started_at))/60)
      )
      where organization_id=org and id=result;
    return result;
  end if;

  if correction is not null then
    select * into c from mir_core.punch_corrections
      where organization_id=org and id=correction for update;
  end if;
  result:=public.mir_punch_correction_phase1(org,correction,payload);
  if correction is not null and payload->>''decision''=''approved'' and c.correction_type=''lunch_not_taken'' then
    select * into s from mir_core.punch_shifts
      where organization_id=org and id=c.shift_id for update;
    update mir_core.punch_shifts set auto_break_minutes=0
      where organization_id=org and id=c.shift_id;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),c.employee_id,''lunch_deduction_removed'',''shift'',c.shift_id,payload->>''reason'',
      jsonb_build_object(''beforeMinutes'',s.auto_break_minutes,''afterMinutes'',0,''correctionId'',correction));
  end if;
  return result;
end$$;

revoke all on function public.mir_punch_correction_phase1(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_correction(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_correction(uuid,uuid,jsonb) to authenticated;

alter function public.mir_punch_admin(uuid,text,jsonb)
  rename to mir_punch_admin_phase1;

create function public.mir_punch_admin(org uuid, action text, payload jsonb default ''{}'')
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,mir_core,public
as $$
declare
  employee uuid;
  delta numeric(8,2);
  previous numeric(8,2);
  movement uuid;
begin
  if action<>''bank_adjust'' then
    return public.mir_punch_admin_phase1(org,action,payload);
  end if;
  if mir_core.staff_role(org) not in(''admin'',''boss'') then
    raise exception ''Boss requis'' using errcode=''42501'';
  end if;
  employee:=nullif(payload->>''employeeId'','''')::uuid;
  delta:=nullif(payload->>''quantity'','''')::numeric;
  if employee is null or delta is null or delta=0 or btrim(coalesce(payload->>''reason'',''''))='''' then
    raise exception ''Employé, quantité et raison sont requis'' using errcode=''22023'';
  end if;
  if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=employee and active) then
    raise exception ''Employé introuvable'' using errcode=''22023'';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(org::text||employee::text||''time-bank'',0));
  select coalesce((select balance_after from mir_core.time_bank_movements
    where organization_id=org and employee_id=employee order by created_at desc,id desc limit 1),0) into previous;
  insert into mir_core.time_bank_movements(
    organization_id,employee_id,quantity,multiplier,balance_before,balance_after,reason,created_by,approved_by
  ) values(org,employee,delta,1,previous,previous+delta,payload->>''reason'',auth.uid(),auth.uid()) returning id into movement;
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),employee,''bank_adjust'',''time_bank'',movement,payload->>''reason'',
      jsonb_build_object(''quantity'',delta,''before'',previous,''after'',previous+delta));
  return jsonb_build_object(''ok'',true,''movementId'',movement,''balance'',previous+delta);
end$$;

revoke all on function public.mir_punch_admin_phase1(uuid,text,jsonb) from public,anon,authenticated;
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
 insert into mir_core.backend_migration_checkpoints(source_file,source_sha256,schema_fingerprint) values('20261110130000_punch_phase2_integrity.sql','ef7141911e8649adae1185b47f9538af9726489567ce073ac78a214f23e6bb23',current_fingerprint);
end$transport$;
commit;
