-- Phase 4: canonical expenses and private receipts.  This migration does not
-- seed accounting data and never grants direct table access to browser roles.
begin;

create table if not exists mir_core.expense_categories(
 organization_id uuid not null references mir_core.organizations(id),
 code text not null check(code ~ '^[a-z0-9_]{2,48}$'), label text not null check(length(btrim(label)) between 2 and 100),
 active boolean not null default true, position integer not null default 0,
 primary key(organization_id,code)
);

create table if not exists mir_core.expenses(
 organization_id uuid not null references mir_core.organizations(id), id uuid not null default gen_random_uuid(),
 employee_id uuid not null references auth.users(id), job_id uuid,
 expense_date date not null default current_date, supplier text not null default '' check(length(supplier)<=180), category_code text not null,
 amount_before_tax numeric(12,2) not null default 0 check(amount_before_tax>=0), tps_amount numeric(12,2) not null default 0 check(tps_amount>=0),
 tvq_amount numeric(12,2) not null default 0 check(tvq_amount>=0), total_amount numeric(12,2) not null default 0 check(total_amount>=0),
 note text not null default '' check(length(note)<=2000), status text not null default 'draft' check(status in('draft','submitted','needs_correction','approved','refused')),
 client_request_id uuid not null, submitted_at timestamptz, decided_at timestamptz, decided_by uuid references auth.users(id), decision_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(organization_id,id), unique(organization_id,employee_id,client_request_id),
 foreign key(organization_id,category_code) references mir_core.expense_categories(organization_id,code),
 foreign key(organization_id,job_id) references mir_core.jobs(organization_id,id),
 check(round(amount_before_tax+tps_amount+tvq_amount,2)=total_amount),
 check((status in('approved','refused')) = (decided_at is not null))
);
create index if not exists expenses_queue on mir_core.expenses(organization_id,status,updated_at desc);
create index if not exists expenses_employee on mir_core.expenses(organization_id,employee_id,updated_at desc);

create table if not exists mir_core.expense_receipts(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), expense_id uuid not null,
 object_path text not null check(length(object_path)<=600 and object_path !~ '\.\.'), file_name text not null check(length(file_name)<=240),
 mime_type text not null check(mime_type in('image/jpeg','image/png','application/pdf')), size_bytes bigint not null check(size_bytes between 1 and 10485760),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), uploaded_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(organization_id,id), unique(organization_id,object_path), foreign key(organization_id,expense_id) references mir_core.expenses(organization_id,id) on delete cascade
);

create table if not exists mir_core.expense_events(
 organization_id uuid not null, id uuid not null default gen_random_uuid(), expense_id uuid not null, actor_id uuid not null references auth.users(id),
 action text not null check(action in('draft_saved','submitted','returned','approved','refused','receipt_attached')), reason text not null default '',
 before_state jsonb not null default '{}' check(jsonb_typeof(before_state)='object'), after_state jsonb not null default '{}' check(jsonb_typeof(after_state)='object'), created_at timestamptz not null default now(),
 primary key(organization_id,id), foreign key(organization_id,expense_id) references mir_core.expenses(organization_id,id) on delete cascade
);
create index if not exists expense_events_trace on mir_core.expense_events(organization_id,expense_id,created_at);

insert into mir_core.expense_categories(organization_id,code,label,position)
select o.id,x.code,x.label,x.position from mir_core.organizations o cross join (values
 ('materials','Matériaux',10),('travel','Déplacement',20),('tools','Outils',30),('meals','Repas',40),('other','Autre',50)
) x(code,label,position) on conflict do nothing;

alter table mir_core.expense_categories enable row level security;
alter table mir_core.expenses enable row level security;
alter table mir_core.expense_receipts enable row level security;
alter table mir_core.expense_events enable row level security;
revoke all on mir_core.expense_categories,mir_core.expenses,mir_core.expense_receipts,mir_core.expense_events from public,anon,authenticated;

create or replace function mir_core.expense_role(org uuid, member uuid default auth.uid()) returns text language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select mir_core.operational_role(org,member)
$$;
revoke all on function mir_core.expense_role(uuid,uuid) from public,anon;
grant execute on function mir_core.expense_role(uuid,uuid) to authenticated;

create or replace function mir_core.expense_visible(org uuid, expense uuid, member uuid default auth.uid()) returns boolean language sql stable security definer set search_path=pg_catalog,mir_core as $$
 select exists(select 1 from mir_core.expenses e where e.organization_id=org and e.id=expense and (e.employee_id=member or mir_core.expense_role(org,member) in('adjointe','boss') or (mir_core.expense_role(org,member)='chef_equipe' and e.job_id is not null and mir_core.job_allowed(org,e.job_id,member))))
$$;
revoke all on function mir_core.expense_visible(uuid,uuid,uuid) from public,anon;
grant execute on function mir_core.expense_visible(uuid,uuid,uuid) to authenticated;

create or replace function public.mir_expense_snapshot(org uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare r text:=mir_core.expense_role(org);begin
 if r is null then raise exception 'Accès MIR requis' using errcode='42501';end if;
 return jsonb_build_object('role',r,'categories',coalesce((select jsonb_agg(jsonb_build_object('code',c.code,'label',c.label) order by c.position) from mir_core.expense_categories c where c.organization_id=org and c.active),'[]'),'expenses',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'jobId',e.job_id,'date',e.expense_date,'supplier',e.supplier,'category',e.category_code,'beforeTax',e.amount_before_tax,'tps',e.tps_amount,'tvq',e.tvq_amount,'total',e.total_amount,'note',e.note,'status',e.status,'reason',e.decision_reason,'updatedAt',e.updated_at,'receiptCount',(select count(*) from mir_core.expense_receipts x where x.organization_id=org and x.expense_id=e.id)) order by e.updated_at desc) from mir_core.expenses e where e.organization_id=org and mir_core.expense_visible(org,e.id)),'[]'));
end$$;

revoke all on function public.mir_expense_snapshot(uuid) from public,anon;
grant execute on function public.mir_expense_snapshot(uuid) to authenticated;
commit;
