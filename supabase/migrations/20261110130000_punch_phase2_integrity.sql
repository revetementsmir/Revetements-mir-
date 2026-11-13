-- MIR Phase 2: lunch exception, locked weeks and traceable time-bank balances.
begin;

create unique index if not exists punch_one_pending_lunch_request
  on mir_core.punch_corrections(organization_id, employee_id, shift_id)
  where correction_type = 'lunch_not_taken' and status in ('pending', 'clarification');

alter function public.mir_punch_action(uuid,uuid,text,uuid,jsonb)
  rename to mir_punch_action_phase1;

create function public.mir_punch_action(org uuid, request_id uuid, action text, job uuid default null, payload jsonb default '{}')
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
      and p.status='locked'
  ) then
    raise exception 'Cette semaine est verrouillée; demandez une correction documentée' using errcode='42501';
  end if;
  return public.mir_punch_action_phase1(org,request_id,action,job,payload);
end$$;

revoke all on function public.mir_punch_action_phase1(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_action(uuid,uuid,text,uuid,jsonb) to authenticated;

alter function public.mir_punch_correction(uuid,uuid,jsonb)
  rename to mir_punch_correction_phase1;

create function public.mir_punch_correction(org uuid, correction uuid default null, payload jsonb default '{}')
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
  if correction is null and payload->>'type'='lunch_not_taken' then
    select * into s from mir_core.punch_shifts
      where organization_id=org and id=nullif(payload->>'shiftId','')::uuid and employee_id=auth.uid();
    if s.id is null or s.ended_at is null then
      raise exception 'Une journée terminée est requise' using errcode='22023';
    end if;
    if s.auto_break_minutes<=0 then
      raise exception 'Aucun dîner automatique à corriger' using errcode='22023';
    end if;
    result:=public.mir_punch_correction_phase1(org,null,payload);
    update mir_core.punch_corrections
      set original_data=jsonb_build_object(
        'startedAt',s.started_at,'endedAt',s.ended_at,
        'autoBreakMinutes',s.auto_break_minutes,
        'grossMinutes',floor(extract(epoch from(s.ended_at-s.started_at))/60)
      )
      where organization_id=org and id=result;
    return result;
  end if;

  if correction is not null then
    select * into c from mir_core.punch_corrections
      where organization_id=org and id=correction for update;
  end if;
  result:=public.mir_punch_correction_phase1(org,correction,payload);
  if correction is not null and payload->>'decision'='approved' and c.correction_type='lunch_not_taken' then
    select * into s from mir_core.punch_shifts
      where organization_id=org and id=c.shift_id for update;
    update mir_core.punch_shifts set auto_break_minutes=0
      where organization_id=org and id=c.shift_id;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),c.employee_id,'lunch_deduction_removed','shift',c.shift_id,payload->>'reason',
      jsonb_build_object('beforeMinutes',s.auto_break_minutes,'afterMinutes',0,'correctionId',correction));
  end if;
  return result;
end$$;

revoke all on function public.mir_punch_correction_phase1(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_correction(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_correction(uuid,uuid,jsonb) to authenticated;

alter function public.mir_punch_admin(uuid,text,jsonb)
  rename to mir_punch_admin_phase1;

create function public.mir_punch_admin(org uuid, action text, payload jsonb default '{}')
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
  if action<>'bank_adjust' then
    return public.mir_punch_admin_phase1(org,action,payload);
  end if;
  if mir_core.staff_role(org) not in('admin','boss') then
    raise exception 'Boss requis' using errcode='42501';
  end if;
  employee:=nullif(payload->>'employeeId','')::uuid;
  delta:=nullif(payload->>'quantity','')::numeric;
  if employee is null or delta is null or delta=0 or btrim(coalesce(payload->>'reason',''))='' then
    raise exception 'Employé, quantité et raison sont requis' using errcode='22023';
  end if;
  if not exists(select 1 from mir_core.memberships where organization_id=org and user_id=employee and active) then
    raise exception 'Employé introuvable' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(org::text||employee::text||'time-bank',0));
  select coalesce((select balance_after from mir_core.time_bank_movements
    where organization_id=org and employee_id=employee order by created_at desc,id desc limit 1),0) into previous;
  insert into mir_core.time_bank_movements(
    organization_id,employee_id,quantity,multiplier,balance_before,balance_after,reason,created_by,approved_by
  ) values(org,employee,delta,1,previous,previous+delta,payload->>'reason',auth.uid(),auth.uid()) returning id into movement;
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),employee,'bank_adjust','time_bank',movement,payload->>'reason',
      jsonb_build_object('quantity',delta,'before',previous,'after',previous+delta));
  return jsonb_build_object('ok',true,'movementId',movement,'balance',previous+delta);
end$$;

revoke all on function public.mir_punch_admin_phase1(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_admin(uuid,text,jsonb) from public,anon;
grant execute on function public.mir_punch_admin(uuid,text,jsonb) to authenticated;

commit;
