-- MIR Phase 2: manager corrections, period approval/locking and visible bank history.
begin;

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
    'bankHistory',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc,b.id desc)
      from (select * from mir_core.time_bank_movements
        where organization_id=org and employee_id=target order by created_at desc,id desc limit 25) b),'[]'::jsonb),
    'periods',case when manager then coalesce((select jsonb_agg(to_jsonb(p) order by p.starts_on desc)
      from mir_core.time_periods p where p.organization_id=org and p.ends_on>=current_date-60),'[]'::jsonb) else '[]'::jsonb end
  );
  return result;
end$$;

revoke all on function public.mir_punch_snapshot_phase1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mir_punch_snapshot(uuid,uuid) from public,anon;
grant execute on function public.mir_punch_snapshot(uuid,uuid) to authenticated;

alter function public.mir_punch_admin(uuid,text,jsonb)
  rename to mir_punch_admin_phase2;

create function public.mir_punch_admin(org uuid, action text, payload jsonb default '{}')
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
  if action not in('period_save','approve_period','lock_period','shift_correct') then
    return public.mir_punch_admin_phase2(org,action,payload);
  end if;
  if role_name not in('admin','boss') then
    raise exception 'Boss requis' using errcode='42501';
  end if;
  if btrim(coalesce(payload->>'reason',''))='' then
    raise exception 'Motif requis' using errcode='22023';
  end if;

  if action='period_save' then
    insert into mir_core.time_periods(organization_id,label,starts_on,ends_on,status,reopen_reason)
    values(org,payload->>'label',(payload->>'startsOn')::date,(payload->>'endsOn')::date,'open',payload->>'reason')
    on conflict(organization_id,starts_on,ends_on) do update set label=excluded.label
    returning id into period_id;
  elsif action in('approve_period','lock_period') then
    period_id:=(payload->>'periodId')::uuid;
    update mir_core.time_periods
      set status=case when action='approve_period' then 'approved' else 'locked' end,
          locked_by=case when action='lock_period' then auth.uid() else locked_by end,
          locked_at=case when action='lock_period' then now() else locked_at end,
          reopen_reason=payload->>'reason'
      where organization_id=org and id=period_id
        and (action='approve_period' and status in('open','review','reopened')
          or action='lock_period' and status='approved');
    if not found then raise exception 'Transition de semaine invalide' using errcode='22023';end if;
    if action='lock_period' then
      update mir_core.punch_shifts s set status='locked'
      from mir_core.time_periods p
      where p.organization_id=org and p.id=period_id
        and s.organization_id=org and s.work_date between p.starts_on and p.ends_on;
    end if;
  else
    select * into shift_row from mir_core.punch_shifts
      where organization_id=org and id=(payload->>'shiftId')::uuid for update;
    if shift_row.id is null then raise exception 'Journée introuvable' using errcode='22023';end if;
    new_start:=coalesce(nullif(payload->>'startedAt','')::timestamptz,shift_row.started_at);
    new_end:=coalesce(nullif(payload->>'endedAt','')::timestamptz,shift_row.ended_at);
    if new_end is null or new_end<new_start then raise exception 'Heures corrigées invalides' using errcode='22023';end if;
    before_data:=jsonb_build_object('startedAt',shift_row.started_at,'endedAt',shift_row.ended_at,
      'workDate',shift_row.work_date,'autoBreakMinutes',shift_row.auto_break_minutes,'status',shift_row.status);
    update mir_core.punch_segments set started_at=new_start
      where organization_id=org and shift_id=shift_row.id and started_at=shift_row.started_at
        and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=shift_row.id order by started_at,id limit 1);
    update mir_core.punch_segments set ended_at=new_end
      where organization_id=org and shift_id=shift_row.id and ended_at=shift_row.ended_at
        and id=(select id from mir_core.punch_segments where organization_id=org and shift_id=shift_row.id order by started_at desc,id desc limit 1);
    update mir_core.punch_shifts set started_at=new_start,ended_at=new_end,work_date=(new_start at time zone 'America/Toronto')::date
      where organization_id=org and id=shift_row.id returning
      jsonb_build_object('startedAt',started_at,'endedAt',ended_at,'workDate',work_date,
        'autoBreakMinutes',auto_break_minutes,'status',status) into after_data;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
      values(org,auth.uid(),shift_row.employee_id,'shift_correct','shift',shift_row.id,payload->>'reason',
        jsonb_build_object('before',before_data,'after',after_data));
    return jsonb_build_object('ok',true,'before',before_data,'after',after_data);
  end if;

  insert into mir_core.punch_audit(organization_id,actor_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),action,'period',period_id,payload->>'reason',payload);
  return jsonb_build_object('ok',true,'periodId',period_id);
end$$;

revoke all on function public.mir_punch_admin_phase2(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_admin(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_punch_admin(uuid,text,jsonb) to authenticated;

commit;
