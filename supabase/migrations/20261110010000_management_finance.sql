-- MIR management and finance workspace. Additive; public and production modules unchanged.
begin;

create table mir_core.management_permissions(
 organization_id uuid not null,user_id uuid not null,permission text not null,allowed boolean not null default true,
 granted_by uuid not null references auth.users(id),granted_at timestamptz not null default now(),
 primary key(organization_id,user_id,permission),foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id));
create table mir_core.dashboard_preferences(
 organization_id uuid not null,user_id uuid not null,block_key text not null,position integer not null default 0,
 visible boolean not null default true,collapsed boolean not null default false,max_items integer not null default 5 check(max_items between 1 and 20),
 updated_at timestamptz not null default now(),primary key(organization_id,user_id,block_key),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id));
create table mir_core.clients(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),name text not null,email text not null default '',phone text not null default '',address text not null default '',
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(organization_id,id));
create table mir_core.estimates(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),number text not null,client_id uuid not null,job_id uuid,
 status text not null default 'draft' check(status in ('draft','incomplete','review','boss_approval','approved','sent','viewed','change_requested','accepted','refused','expired','converted','archived')),
 title text not null,address text not null default '',current_version integer not null default 1,contract_value numeric(14,2) not null default 0,
 estimated_cost numeric(14,2) not null default 0,margin_percent numeric(7,2) generated always as(case when contract_value=0 then 0 else (contract_value-estimated_cost)*100/contract_value end) stored,
 created_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),approved_at timestamptz,sent_at timestamptz,accepted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,number),foreign key(organization_id,client_id) references mir_core.clients(organization_id,id),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id));
create table mir_core.estimate_versions(
 organization_id uuid not null,estimate_id uuid not null,version integer not null,status text not null default 'draft',snapshot jsonb not null default '{}',change_reason text not null default '',
 frozen_at timestamptz,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(organization_id,estimate_id,version),
 foreign key(organization_id,estimate_id) references mir_core.estimates(organization_id,id));
create table mir_core.change_orders(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),job_id uuid not null,number text not null,description text not null,reason text not null default '',amount numeric(14,2) not null default 0,delay_days integer not null default 0,
 status text not null default 'draft' check(status in ('draft','approval','sent','accepted','refused','invoiced')),created_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),created_at timestamptz not null default now(),
 primary key(organization_id,id),unique(organization_id,number),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id));
create table mir_core.employee_cost_rates(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),employee_id uuid not null,hourly_wage numeric(10,2) not null,real_hourly_cost numeric(10,2) not null,billable_rate numeric(10,2),valid_from date not null,valid_to date,
 changed_by uuid not null references auth.users(id),change_reason text not null,created_at timestamptz not null default now(),primary key(organization_id,id),
 foreign key(organization_id,employee_id) references mir_core.memberships(organization_id,user_id),check(valid_to is null or valid_to>=valid_from));
create unique index employee_cost_current on mir_core.employee_cost_rates(organization_id,employee_id) where valid_to is null;
create table mir_core.time_entries(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),employee_id uuid not null,job_id uuid not null,work_date date not null,regular_hours numeric(6,2) not null default 0,overtime_hours numeric(6,2) not null default 0,work_type text not null default '',note text not null default '',status text not null default 'submitted' check(status in ('draft','submitted','approved','refused')),calculated_cost numeric(12,2) not null default 0,
 created_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,id),foreign key(organization_id,employee_id) references mir_core.memberships(organization_id,user_id),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id));
create table mir_core.job_finances(
 organization_id uuid not null,job_id uuid not null,contract_value numeric(14,2) not null default 0,accepted_extras numeric(14,2) not null default 0,estimated_cost numeric(14,2) not null default 0,committed_cost numeric(14,2) not null default 0,actual_cost numeric(14,2) not null default 0,progress_percent numeric(5,2) not null default 0,updated_at timestamptz not null default now(),primary key(organization_id,job_id),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id));
create table mir_core.invoices(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),number text not null,client_id uuid not null,job_id uuid,invoice_type text not null default 'progress',status text not null default 'draft' check(status in ('draft','review','ready','sent','partial','paid','overdue','disputed','cancelled','credited')),
 issue_date date not null default current_date,due_date date not null,total numeric(14,2) not null default 0,paid_amount numeric(14,2) not null default 0,internal_note text not null default '',client_note text not null default '',created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,id),unique(organization_id,number),foreign key(organization_id,client_id) references mir_core.clients(organization_id,id),foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),check(paid_amount>=0 and paid_amount<=total));
create table mir_core.invoice_payments(
 organization_id uuid not null,id uuid not null default gen_random_uuid(),invoice_id uuid not null,amount numeric(14,2) not null check(amount>0),paid_at timestamptz not null default now(),method text not null default '',note text not null default '',recorded_by uuid not null references auth.users(id),primary key(organization_id,id),foreign key(organization_id,invoice_id) references mir_core.invoices(organization_id,id));
create table mir_core.management_audit(
 organization_id uuid not null,id bigint generated always as identity,actor_id uuid not null references auth.users(id),action text not null,entity_type text not null,entity_id uuid,previous_data jsonb,new_data jsonb,reason text not null default '',created_at timestamptz not null default now(),primary key(organization_id,id));

do $$declare t text;begin foreach t in array array['management_permissions','dashboard_preferences','clients','estimates','estimate_versions','change_orders','employee_cost_rates','time_entries','job_finances','invoices','invoice_payments','management_audit'] loop execute format('alter table mir_core.%I enable row level security',t);execute format('revoke all on mir_core.%I from public,anon,authenticated',t);end loop;end$$;
create index estimates_status on mir_core.estimates(organization_id,status,updated_at desc);
create index invoices_due on mir_core.invoices(organization_id,status,due_date);
create index time_entries_job_date on mir_core.time_entries(organization_id,job_id,work_date desc);
create index management_audit_entity on mir_core.management_audit(organization_id,entity_type,entity_id,created_at desc);

create function mir_core.management_allowed(org uuid,capability text,member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.staff_role(org,member) in ('admin','boss') or (mir_core.staff_role(org,member)='assistant' and capability in ('dashboard','clients','estimates_prepare','invoices_prepare','payments_record','collections','documents')) or coalesce((select allowed from mir_core.management_permissions where organization_id=org and user_id=member and permission=capability),false);
$$;
revoke all on function mir_core.management_allowed(uuid,text,uuid) from public,anon;grant execute on function mir_core.management_allowed(uuid,text,uuid) to authenticated;

create function public.mir_management_snapshot(org uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare r text;finance boolean;begin
 r:=mir_core.staff_role(org);if r not in('assistant','boss','admin') then raise exception 'Accès gestion refusé' using errcode='42501';end if;finance:=mir_core.management_allowed(org,'finance_profit');
 return jsonb_build_object('role',r,'canSeeProfit',finance,
  'preferences',coalesce((select jsonb_agg(to_jsonb(p) order by position) from dashboard_preferences p where p.organization_id=org and p.user_id=auth.uid()),'[]'::jsonb),
  'estimates',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'number',e.number,'client',c.name,'title',e.title,'status',e.status,'value',e.contract_value,'margin',case when finance then e.margin_percent end,'updatedAt',e.updated_at) order by e.updated_at desc) from estimates e join clients c on(c.organization_id,c.id)=(e.organization_id,e.client_id) where e.organization_id=org),'[]'::jsonb),
  'invoices',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'number',i.number,'client',c.name,'status',i.status,'total',i.total,'paid',i.paid_amount,'dueDate',i.due_date) order by i.due_date) from invoices i join clients c on(c.organization_id,c.id)=(i.organization_id,i.client_id) where i.organization_id=org),'[]'::jsonb),
  'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'name',j.name,'contract',case when finance then f.contract_value end,'estimated',case when finance then f.estimated_cost end,'committed',case when finance then f.committed_cost end,'actual',case when finance then f.actual_cost end,'progress',f.progress_percent)) from jobs j left join job_finances f on(f.organization_id,f.job_id)=(j.organization_id,j.id) where j.organization_id=org and not j.archived),'[]'::jsonb));
end$$;

create function public.mir_management_action(org uuid,action text,entity uuid default null,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);result uuid;old jsonb;amt numeric;begin
 if r not in('assistant','boss','admin') then raise exception 'Accès gestion refusé' using errcode='42501';end if;
 if action='dashboard_save' then delete from dashboard_preferences where organization_id=org and user_id=auth.uid();insert into dashboard_preferences(organization_id,user_id,block_key,position,visible,collapsed,max_items) select org,auth.uid(),x->>'key',coalesce((x->>'position')::int,0),coalesce((x->>'visible')::boolean,true),coalesce((x->>'collapsed')::boolean,false),coalesce((x->>'maxItems')::int,5) from jsonb_array_elements(coalesce(payload->'blocks','[]')) x;return jsonb_build_object('ok',true);end if;
 if action='estimate_decide' then if r not in('boss','admin') then raise exception 'Boss requis' using errcode='42501';end if;select to_jsonb(e) into old from estimates e where organization_id=org and id=entity for update;if old is null then raise exception 'Soumission introuvable';end if;update estimates set status=case payload->>'decision' when 'approved' then 'approved' when 'refused' then 'refused' else 'review' end,approved_by=case when payload->>'decision'='approved' then auth.uid() end,approved_at=case when payload->>'decision'='approved' then now() end,updated_at=now() where organization_id=org and id=entity;
 elsif action='estimate_submit' then update estimates set status='boss_approval',updated_at=now() where organization_id=org and id=entity and status in('draft','incomplete','review');if not found then raise exception 'Soumission non modifiable';end if;
 elsif action='estimate_new_version' then select to_jsonb(e) into old from estimates e where organization_id=org and id=entity for update;if old is null or old->>'status' not in('sent','viewed','change_requested','accepted') then raise exception 'Version envoyée requise';end if;insert into estimate_versions select org,entity,(old->>'current_version')::int,'archived',old,payload->>'reason',now(),auth.uid(),now();update estimates set current_version=current_version+1,status='draft',updated_at=now() where organization_id=org and id=entity;
 elsif action='payment_record' then if not mir_core.management_allowed(org,'payments_record') then raise exception 'Permission paiement requise' using errcode='42501';end if;amt:=(payload->>'amount')::numeric;select to_jsonb(i) into old from invoices i where organization_id=org and id=entity for update;insert into invoice_payments(organization_id,invoice_id,amount,method,note,recorded_by) values(org,entity,amt,coalesce(payload->>'method',''),coalesce(payload->>'note',''),auth.uid()) returning id into result;update invoices set paid_amount=least(total,paid_amount+amt),status=case when paid_amount+amt>=total then 'paid' else 'partial' end,updated_at=now() where organization_id=org and id=entity;
 else raise exception 'Action inconnue';end if;
 insert into management_audit(organization_id,actor_id,action,entity_type,entity_id,previous_data,new_data,reason) values(org,auth.uid(),action,split_part(action,'_',1),entity,old,payload,coalesce(payload->>'reason',''));return jsonb_build_object('ok',true,'id',result);
end$$;
revoke all on function public.mir_management_snapshot(uuid),public.mir_management_action(uuid,text,uuid,jsonb) from public,anon;grant execute on function public.mir_management_snapshot(uuid),public.mir_management_action(uuid,text,uuid,jsonb) to authenticated;
commit;
