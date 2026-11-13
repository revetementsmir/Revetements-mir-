-- MIR Phase 2 completion: decisions, notifications, journal and time-bank requests.
begin;

create table mir_core.time_bank_requests(
  organization_id uuid not null,
  id uuid not null default gen_random_uuid(),
  employee_id uuid not null,
  quantity numeric(8,2) not null check(quantity>0),
  requested_for date not null,
  explanation text not null check(length(btrim(explanation)) between 3 and 1200),
  status text not null default 'pending' check(status in('pending','clarification','approved','refused','cancelled')),
  decided_by uuid references auth.users(id),
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(organization_id,id),
  foreign key(organization_id,employee_id) references mir_core.memberships(organization_id,user_id)
);
create index time_bank_requests_employee on mir_core.time_bank_requests(organization_id,employee_id,created_at desc);
alter table mir_core.time_bank_requests enable row level security;
revoke all on mir_core.time_bank_requests from public,anon,authenticated;

alter function public.mir_punch_snapshot(uuid,uuid) rename to mir_punch_snapshot_phase2_workflow;
create function public.mir_punch_snapshot(org uuid,employee uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,public as $$
declare target uuid:=coalesce(employee,auth.uid()); result jsonb; manager boolean:=mir_core.punch_manager(org);
begin
  result:=public.mir_punch_snapshot_phase2_workflow(org,target);
  result:=result||jsonb_build_object(
    'corrections',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object(
      'employeeName',coalesce(nullif(sc.display_name,''),'Employé'),
      'workDate',s.work_date,
      'jobName',(select j.name from mir_core.jobs j where j.organization_id=org and j.id=coalesce(c.proposed_job_id,(c.proposed_data->>'jobId')::uuid)),
      'decisionHistory',coalesce((select jsonb_agg(jsonb_build_object('action',a.action,'reason',a.reason,'actorId',a.actor_id,'createdAt',a.created_at) order by a.created_at,a.id)
        from mir_core.punch_audit a where a.organization_id=org and a.entity_type='correction' and a.entity_id=c.id),'[]'::jsonb)
    ) order by c.created_at desc) from mir_core.punch_corrections c
      left join mir_core.punch_shifts s on(s.organization_id,s.id)=(c.organization_id,c.shift_id)
      left join mir_core.staff_capabilities sc on(sc.organization_id,sc.user_id)=(c.organization_id,c.employee_id)
      where c.organization_id=org and (c.employee_id=target or manager)),'[]'::jsonb),
    'bankRequests',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('employeeName',coalesce(nullif(sc.display_name,''),'Employé')) order by r.created_at desc)
      from mir_core.time_bank_requests r left join mir_core.staff_capabilities sc on(sc.organization_id,sc.user_id)=(r.organization_id,r.employee_id)
      where r.organization_id=org and (r.employee_id=target or manager)),'[]'::jsonb)
  );
  return result;
end$$;
revoke all on function public.mir_punch_snapshot_phase2_workflow(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mir_punch_snapshot(uuid,uuid) from public,anon;
grant execute on function public.mir_punch_snapshot(uuid,uuid) to authenticated;

alter function public.mir_punch_correction(uuid,uuid,jsonb) rename to mir_punch_correction_phase2_apply;
create function public.mir_punch_correction(org uuid,correction uuid default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core,public as $$
declare result uuid; c mir_core.punch_corrections; target uuid; paid_minutes integer; decision text:=payload->>'decision';
begin
  if correction is null then
    result:=public.mir_punch_correction_phase2_apply(org,null,payload);
    for target in select sc.user_id from mir_core.staff_capabilities sc
      where sc.organization_id=org and sc.active and sc.staff_role in('boss','assistant')
    loop
      insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id)
      values(org,target,'punch_correction','Nouvelle correction de punch',jsonb_build_object('view','punch','correctionId',result),result)
      on conflict do nothing;
    end loop;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
      values(org,auth.uid(),auth.uid(),'notification_correction_created','notification',result,'Avis envoyé à Simon et Esther',jsonb_build_object('correctionId',result));
    return result;
  end if;
  select * into c from mir_core.punch_corrections where organization_id=org and id=correction for update;
  if c.id is null then raise exception 'Correction introuvable' using errcode='22023';end if;
  if c.status not in('pending','clarification') then raise exception 'Cette demande a déjà été décidée' using errcode='40001';end if;
  result:=public.mir_punch_correction_phase2_apply(org,correction,payload);
  if decision in('approved','refused') then
    select greatest(0,floor(extract(epoch from(s.ended_at-s.started_at))/60)-s.auto_break_minutes)::int into paid_minutes
      from mir_core.punch_shifts s where s.organization_id=org and s.id=c.shift_id;
    insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id)
      values(org,c.employee_id,'punch_decision',case decision when 'approved' then 'Correction de punch approuvée' else 'Correction de punch refusée' end,
        jsonb_build_object('view','hours','correctionId',c.id,'paidMinutes',coalesce(paid_minutes,0)),c.id);
  elsif decision='clarification' then
    insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id)
      values(org,c.employee_id,'punch_clarification','Précision demandée pour votre punch',jsonb_build_object('view','hours','correctionId',c.id),c.id);
  end if;
  update mir_core.notifications set read_at=coalesce(read_at,now()) where organization_id=org and entity_id=c.id and user_id<>c.employee_id and kind='punch_correction';
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),c.employee_id,'notification_correction_decided','notification',c.id,payload->>'reason',jsonb_build_object('decision',decision,'paidMinutes',paid_minutes));
  return result;
end$$;
revoke all on function public.mir_punch_correction_phase2_apply(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.mir_punch_correction(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_punch_correction(uuid,uuid,jsonb) to authenticated;

create function public.mir_punch_journal(org uuid,filters jsonb default '{}',page_size integer default 25,page_after bigint default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core,public as $$
declare size integer:=least(greatest(coalesce(page_size,25),1),100); rows jsonb; next_id bigint;
begin
  if not mir_core.punch_manager(org) then raise exception 'Accès au journal refusé' using errcode='42501';end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb),min(x.id) into rows,next_id from(
    select a.id,a.created_at,a.action,a.entity_type,a.entity_id,a.reason,a.employee_id,a.actor_id,a.payload,
      coalesce(nullif(sc.display_name,''),'Système') employee_name
    from mir_core.punch_audit a left join mir_core.staff_capabilities sc on(sc.organization_id,sc.user_id)=(a.organization_id,a.employee_id)
    where a.organization_id=org and (page_after is null or a.id<page_after)
      and (nullif(filters->>'employeeId','') is null or a.employee_id=(filters->>'employeeId')::uuid)
      and (nullif(filters->>'action','') is null or a.action=filters->>'action')
      and (nullif(filters->>'weekStart','') is null or a.created_at>=(filters->>'weekStart')::date)
      and (nullif(filters->>'weekEnd','') is null or a.created_at<(filters->>'weekEnd')::date+1)
      and (nullif(filters->>'jobId','') is null or a.payload->>'jobId'=filters->>'jobId' or a.payload#>>'{after,jobId}'=filters->>'jobId')
    order by a.id desc limit size
  ) x;
  return jsonb_build_object('items',rows,'nextAfter',case when jsonb_array_length(rows)=size then next_id else null end);
end$$;
revoke all on function public.mir_punch_journal(uuid,jsonb,integer,bigint) from public,anon;
grant execute on function public.mir_punch_journal(uuid,jsonb,integer,bigint) to authenticated;

create function public.mir_time_bank_request(org uuid,request uuid default null,payload jsonb default '{}') returns uuid
language plpgsql security definer set search_path=pg_catalog,mir_core,public as $$
declare result uuid:=coalesce(request,gen_random_uuid()); row_request mir_core.time_bank_requests; decision text:=payload->>'decision'; target uuid; movement jsonb; balance numeric; movement_id uuid;
begin
  if request is null then
    insert into mir_core.time_bank_requests(organization_id,id,employee_id,quantity,requested_for,explanation)
      values(org,result,auth.uid(),(payload->>'quantity')::numeric,(payload->>'requestedFor')::date,btrim(payload->>'explanation'));
    for target in select sc.user_id from mir_core.staff_capabilities sc where sc.organization_id=org and sc.active and sc.staff_role in('boss','assistant') loop
      insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id)
        values(org,target,'time_bank_request','Nouvelle demande de banque d’heures',jsonb_build_object('view','punch','bankRequestId',result),result);
    end loop;
    insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
      values(org,auth.uid(),auth.uid(),'bank_request','time_bank_request',result,payload->>'explanation',payload);
    return result;
  end if;
  if not mir_core.punch_manager(org) then raise exception 'Approbateur requis' using errcode='42501';end if;
  select * into row_request from mir_core.time_bank_requests where organization_id=org and id=request for update;
  if row_request.id is null or row_request.status not in('pending','clarification') then raise exception 'Demande déjà décidée' using errcode='40001';end if;
  if row_request.employee_id=auth.uid() then raise exception 'Auto-approbation interdite' using errcode='42501';end if;
  if decision not in('approved','refused','clarification') or length(btrim(coalesce(payload->>'reason','')))<3 then raise exception 'Décision et raison requises' using errcode='22023';end if;
  if decision='approved' then
    perform pg_advisory_xact_lock(hashtextextended(org::text||row_request.employee_id::text||'time-bank',0));
    select coalesce((select balance_after from mir_core.time_bank_movements where organization_id=org and employee_id=row_request.employee_id order by created_at desc,id desc limit 1),0) into balance;
    if balance<row_request.quantity then raise exception 'Solde de banque insuffisant' using errcode='22023';end if;
    insert into mir_core.time_bank_movements(organization_id,employee_id,quantity,multiplier,balance_before,balance_after,reason,created_by,approved_by)
      values(org,row_request.employee_id,-row_request.quantity,1,balance,balance-row_request.quantity,'Utilisation approuvée : '||(payload->>'reason'),auth.uid(),auth.uid()) returning id into movement_id;
    movement:=jsonb_build_object('movementId',movement_id,'balanceBefore',balance,'balanceAfter',balance-row_request.quantity);
  end if;
  update mir_core.time_bank_requests set status=decision,decided_by=auth.uid(),decision_reason=btrim(payload->>'reason'),decided_at=now() where organization_id=org and id=request;
  insert into mir_core.notifications(organization_id,user_id,kind,title,route,entity_id)
    values(org,row_request.employee_id,'time_bank_decision',case decision when 'approved' then 'Utilisation de banque approuvée' when 'refused' then 'Utilisation de banque refusée' else 'Précision demandée pour votre banque' end,jsonb_build_object('view','hours','bankRequestId',request),request);
  insert into mir_core.punch_audit(organization_id,actor_id,employee_id,action,entity_type,entity_id,reason,payload)
    values(org,auth.uid(),row_request.employee_id,'bank_request_'||decision,'time_bank_request',request,payload->>'reason',jsonb_build_object('quantity',row_request.quantity,'movement',movement));
  return result;
end$$;
revoke all on function public.mir_time_bank_request(uuid,uuid,jsonb) from public,anon;
grant execute on function public.mir_time_bank_request(uuid,uuid,jsonb) to authenticated;

commit;
