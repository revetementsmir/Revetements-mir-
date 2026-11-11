-- Transport sécurisé généré depuis 20261110150000_punch_phase2_corrections.sql
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
 select * into existing from mir_core.backend_migration_checkpoints where source_file='20261110150000_punch_phase2_corrections.sql';
 if found then
  if existing.source_sha256<>'d5d02ac31e360a2794fb6ef60e50dda9d5fed1a37466e7b22b0b99870051ec22' or existing.schema_fingerprint<>current_fingerprint then
   raise exception 'Checkpoint incompatible ou dérive de schéma: 20261110150000_punch_phase2_corrections.sql';
  end if;
  return;
 end if;
 if exists(select 1 from mir_core.backend_migration_checkpoints where schema_fingerprint<>current_fingerprint) then
  raise exception 'Dérive de schéma avant 20261110150000_punch_phase2_corrections.sql';
 end if;
if (select count(*) from mir_core.backend_migration_checkpoints where source_file in('20261110020000_punch_gps.sql','20261110120000_operational_roles_phase1.sql','20261110130000_punch_phase2_integrity.sql','20261110140000_punch_phase2_workflow.sql'))<>4 then raise exception 'Dépendance de transport absente avant 20261110150000_punch_phase2_corrections.sql'; end if;

 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='mir_punch_correction_phase2') then raise exception 'Alias préexistant à comparer: public.mir_punch_correction_phase2'; end if;
 execute '-- MIR Phase 2: apply approved arrival, departure, job and travel corrections.

alter function public.mir_punch_correction(uuid,uuid,jsonb)
  rename to mir_punch_correction_phase2;

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
  g mir_core.punch_segments;
  correction_type text:=payload->>''type'';
  proposed_at timestamptz;
  proposed_start timestamptz;
  proposed_end timestamptz;
  before_data jsonb;
  after_data jsonb;
begin
  if correction is null then
    if correction_type not in(''missing_in'',''missing_out'',''wrong_in'',''wrong_out'',''wrong_job'',''wrong_travel'',''lunch_not_taken'',''other'') then
      raise exception ''Type de correction invalide'' using errcode=''22023'';
    end if;
    select * into s from mir_core.punch_shifts
      where organization_id=org and id=nullif(payload->>''shiftId'','''')::uuid and employee_id=auth.uid();
    if s.id is null then raise exception ''Journée personnelle requise'' using errcode=''42501'';end if;
    proposed_at:=nullif(payload->>''proposedAt'','''')::timestamptz;
    if correction_type in(''missing_in'',''wrong_in'',''missing_out'',''wrong_out'') and proposed_at is null then
      raise exception ''Heure proposée requise'' using errcode=''22023'';
    end if;
    if correction_type=''wrong_job'' then
      select * into g from mir_core.punch_segments where organization_id=org
        and id=nullif(payload->>''segmentId'','''')::uuid and shift_id=s.id and segment_type=''job'';
      if g.id is null or nullif(payload->>''jobId'','''')::uuid is null
        or not mir_core.job_allowed(org,(payload->>''jobId'')::uuid,auth.uid()) then
        raise exception ''Segment et chantier autorisé requis'' using errcode=''42501'';
      end if;
    elsif correction_type=''wrong_travel'' then
      select * into g from mir_core.punch_segments where organization_id=org
        and id=nullif(payload->>''segmentId'','''')::uuid and shift_id=s.id and segment_type=''travel'';
      proposed_start:=nullif(payload->>''startedAt'','''')::timestamptz;
      proposed_end:=nullif(payload->>''endedAt'','''')::timestamptz;
      if g.id is null or proposed_start is null or proposed_end is null or proposed_end<proposed_start
        or proposed_start<s.started_at or proposed_end>coalesce(s.ended_at,clock_timestamp()) then
        raise exception ''Déplacement corrigé invalide'' using errcode=''22023'';
      end if;
    end if;
    result:=public.mir_punch_correction_phase2(org,null,payload);
    before_data:=jsonb_build_object(''shift'',jsonb_build_object(''startedAt'',s.started_at,''endedAt'',s.ended_at));
    if g.id is not null then before_data:=before_data||jsonb_build_object(''segment'',to_jsonb(g));end if;
    update mir_core.punch_corrections set original_data=before_data,proposed_data=payload
      where organization_id=org and id=result;
    return result;
  end if;

  select * into c from mir_core.punch_corrections where organization_id=org and id=correction for update;
  if c.id is null then raise exception ''Correction introuvable'' using errcode=''22023'';end if;
  result:=public.mir_punch_correction_phase2(org,correction,payload);
  if payload->>''decision''<>''approved'' or c.correction_type=''lunch_not_taken'' then return result;end if;

  select * into s from mir_core.punch_shifts where organization_id=org and id=c.shift_id for update;
  before_data:=c.original_data;
  if c.correction_type in(''missing_in'',''wrong_in'') then
    proposed_at:=nullif(c.proposed_data->>''proposedAt'','''')::timestamptz;
    if proposed_at is null or proposed_at>coalesce(s.ended_at,clock_timestamp()) then raise exception ''Arrivée corrigée invalide'';end if;
    update mir_core.punch_segments set started_at=proposed_at where organization_id=org and shift_id=s.id
      and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=s.id order by started_at,id limit 1);
    update mir_core.punch_shifts set started_at=proposed_at,work_date=(proposed_at at time zone ''America/Toronto'')::date
      where organization_id=org and id=s.id;
  elsif c.correction_type in(''missing_out'',''wrong_out'') then
    proposed_at:=nullif(c.proposed_data->>''proposedAt'','''')::timestamptz;
    if proposed_at is null or proposed_at<s.started_at then raise exception ''Départ corrigé invalide'';end if;
    update mir_core.punch_segments set ended_at=proposed_at where organization_id=org and shift_id=s.id
      and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=s.id order by started_at desc,id desc limit 1);
    update mir_core.punch_shifts set ended_at=proposed_at where organization_id=org and id=s.id;
  elsif c.correction_type=''wrong_job'' then
    update mir_core.punch_segments set job_id=(c.proposed_data->>''jobId'')::uuid
      where organization_id=org and shift_id=s.id and id=(c.proposed_data->>''segmentId'')::uuid;
    if not found then raise exception ''Segment chantier introuvable'';end if;
  elsif c.correction_type=''wrong_travel'' then
    proposed_start:=(c.proposed_data->>''startedAt'')::timestamptz;
    proposed_end:=(c.proposed_data->>''endedAt'')::timestamptz;
    update mir_core.punch_segments set started_at=proposed_start,ended_at=proposed_end
      where organization_id=org and shift_id=s.id and id=(c.proposed_data->>''segmentId'')::uuid and segment_type=''travel'';
    if not found then raise exception ''Déplacement introuvable'';end if;
  else
    return result;
  end if;
  select jsonb_build_object(''shift'',to_jsonb(x),''segments'',coalesce((select jsonb_agg(to_jsonb(y) order by y.started_at)
    from mir_core.punch_segments y where y.organization_id=org and y.shift_id=x.id),''[]''::jsonb)) into after_data
    from mir_core.punch_shifts x where x.organization_id=org and x.id=s.id;
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),c.employee_id,''correction_applied'',''shift'',s.id,payload->>''reason'',
      jsonb_build_object(''correctionId'',c.id,''type'',c.correction_type,''before'',before_data,''after'',after_data));
  return result;
end$$;

revoke all on function public.mir_punch_correction_phase2(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_correction(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_correction(uuid,uuid,jsonb) to authenticated;

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
 insert into mir_core.backend_migration_checkpoints(source_file,source_sha256,schema_fingerprint) values('20261110150000_punch_phase2_corrections.sql','d5d02ac31e360a2794fb6ef60e50dda9d5fed1a37466e7b22b0b99870051ec22',current_fingerprint);
end$transport$;
commit;
