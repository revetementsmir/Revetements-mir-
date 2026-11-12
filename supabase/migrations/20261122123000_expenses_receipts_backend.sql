-- Phase 4: server-authoritative commands, private receipt bucket and ACL.
-- This migration is deliberately additive and replay-safe. Browser clients have
-- no table grants: every state transition is checked here from auth.uid().
begin;

create table if not exists mir_core.expense_tax_settings(
 organization_id uuid primary key references mir_core.organizations(id),
 tps_rate numeric(7,5) not null default .05000 check(tps_rate between 0 and 1),
 tvq_rate numeric(7,5) not null default .09975 check(tvq_rate between 0 and 1),
 updated_at timestamptz not null default now()
);
insert into mir_core.expense_tax_settings(organization_id)
select id from mir_core.organizations on conflict do nothing;

alter table mir_core.expense_events add column if not exists client_request_id uuid;
create unique index if not exists expense_events_idempotency
 on mir_core.expense_events(organization_id,actor_id,client_request_id)
 where client_request_id is not null;

alter table mir_core.expense_tax_settings enable row level security;
revoke all on mir_core.expense_tax_settings from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mir-expense-receipts','mir-expense-receipts',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function mir_core.expense_receipt_object_allowed(object_name text, writing boolean default false)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,mir_core,storage as $$
declare p text[]; org uuid; expense uuid; owner uuid; role_name text;
begin
 if auth.uid() is null then return false; end if;
 p:=storage.foldername(object_name);
 if cardinality(p)<>4 or p[2]<>'expense' then return false; end if;
 begin org:=p[1]::uuid; expense:=p[3]::uuid; owner:=p[4]::uuid; exception when others then return false; end;
 role_name:=mir_core.expense_role(org,auth.uid());
 if role_name is null then return false; end if;
 if writing then
  return owner=auth.uid() and exists(select 1 from mir_core.expenses e where e.organization_id=org and e.id=expense and e.employee_id=auth.uid() and e.status in('draft','needs_correction'));
 end if;
 return mir_core.expense_visible(org,expense,auth.uid());
end$$;
revoke all on function mir_core.expense_receipt_object_allowed(text,boolean) from public,anon;
grant execute on function mir_core.expense_receipt_object_allowed(text,boolean) to authenticated;

drop policy if exists mir_expense_receipt_insert on storage.objects;
drop policy if exists mir_expense_receipt_select on storage.objects;
drop policy if exists mir_expense_receipt_delete on storage.objects;
create policy mir_expense_receipt_insert on storage.objects for insert to authenticated
 with check(bucket_id='mir-expense-receipts' and mir_core.expense_receipt_object_allowed(name,true));
create policy mir_expense_receipt_select on storage.objects for select to authenticated
 using(bucket_id='mir-expense-receipts' and mir_core.expense_receipt_object_allowed(name,false));
create policy mir_expense_receipt_delete on storage.objects for delete to authenticated
 using(bucket_id='mir-expense-receipts' and mir_core.expense_receipt_object_allowed(name,true));

create or replace function mir_core.expense_write_values(org uuid, data jsonb)
returns table(expense_date date,supplier text,category_code text,job_id uuid,amount_before_tax numeric,tps_amount numeric,tvq_amount numeric,total_amount numeric,note text)
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare mode text:=coalesce(data->>'amountMode','before_tax'); raw numeric; tps numeric; tvq numeric;
begin
 if jsonb_typeof(data)<> 'object' then raise exception 'Dépense invalide' using errcode='22023'; end if;
 begin expense_date:=coalesce((data->>'expenseDate')::date,current_date); raw:=round((data->>'amount')::numeric,2); job_id:=nullif(data->>'jobId','')::uuid; exception when others then raise exception 'Montant, date ou JOB invalide' using errcode='22023'; end;
 supplier:=btrim(coalesce(data->>'supplier','')); category_code:=btrim(coalesce(data->>'categoryCode','')); note:=coalesce(data->>'note','');
 if mode not in('before_tax','total') or supplier='' or length(supplier)>180 or category_code !~ '^[a-z0-9_]{2,48}$' or length(note)>2000 or raw<0 or raw>9999999999.99 then raise exception 'Données de dépense invalides' using errcode='22023'; end if;
 if not exists(select 1 from mir_core.expense_categories c where c.organization_id=org and c.code=category_code and c.active) then raise exception 'Catégorie inactive ou inconnue' using errcode='22023'; end if;
 if job_id is not null and not exists(select 1 from mir_core.jobs j where j.organization_id=org and j.id=job_id and not j.archived) then raise exception 'JOB inconnu ou archivé' using errcode='22023'; end if;
 select s.tps_rate,s.tvq_rate into tps,tvq from mir_core.expense_tax_settings s where s.organization_id=org;
 if mode='total' then amount_before_tax:=round(raw/(1+tps+tvq),2); else amount_before_tax:=raw; end if;
 tps_amount:=round(amount_before_tax*tps,2); tvq_amount:=round(amount_before_tax*tvq,2); total_amount:=round(amount_before_tax+tps_amount+tvq_amount,2);
 return next;
end$$;

create or replace function public.mir_expense_save_draft(org uuid, request_id uuid, expense_id uuid, data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid(); role_name text; e mir_core.expenses; old jsonb; v record; event_id uuid;
begin
 if actor is null or request_id is null then raise exception 'Session ou idempotence requise' using errcode='42501'; end if;
 role_name:=mir_core.expense_role(org,actor); if role_name is null or role_name not in('employe_chantier','chef_equipe') then raise exception 'Création de dépense non autorisée' using errcode='42501'; end if;
 select x.expense_id into event_id from mir_core.expense_events x where x.organization_id=org and x.actor_id=actor and x.client_request_id=request_id;
 if event_id is not null then select * into e from mir_core.expenses where organization_id=org and id=event_id; return jsonb_build_object('id',e.id,'status',e.status,'idempotent',true); end if;
 select * into v from mir_core.expense_write_values(org,data);
 if expense_id is null then
  insert into mir_core.expenses(organization_id,employee_id,job_id,expense_date,supplier,category_code,amount_before_tax,tps_amount,tvq_amount,total_amount,note,client_request_id)
  values(org,actor,v.job_id,v.expense_date,v.supplier,v.category_code,v.amount_before_tax,v.tps_amount,v.tvq_amount,v.total_amount,v.note,request_id) returning * into e;
  old:='{}'::jsonb;
 else
  select * into e from mir_core.expenses where organization_id=org and id=expense_id for update;
  if not found or e.employee_id<>actor or e.status not in('draft','needs_correction') then raise exception 'Brouillon non modifiable' using errcode='42501'; end if;
  old:=to_jsonb(e);
  update mir_core.expenses set job_id=v.job_id,expense_date=v.expense_date,supplier=v.supplier,category_code=v.category_code,amount_before_tax=v.amount_before_tax,tps_amount=v.tps_amount,tvq_amount=v.tvq_amount,total_amount=v.total_amount,note=v.note,updated_at=now() where organization_id=org and id=expense_id returning * into e;
 end if;
 insert into mir_core.expense_events(organization_id,expense_id,actor_id,action,before_state,after_state,client_request_id) values(org,e.id,actor,'draft_saved',old,to_jsonb(e),request_id);
 return jsonb_build_object('id',e.id,'status',e.status,'beforeTax',e.amount_before_tax,'tps',e.tps_amount,'tvq',e.tvq_amount,'total',e.total_amount,'idempotent',false);
end$$;

create or replace function public.mir_expense_attach_receipt(org uuid, request_id uuid, expense_id uuid, object_path text, file_name text, mime_type text, size_bytes bigint, sha256 text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core,storage as $$
declare actor uuid:=auth.uid(); e mir_core.expenses; r mir_core.expense_receipts; expected text;
begin
 if actor is null or request_id is null then raise exception 'Session ou idempotence requise' using errcode='42501'; end if;
 select * into e from mir_core.expenses where organization_id=org and id=expense_id for update;
 if not found or e.employee_id<>actor or e.status not in('draft','needs_correction') then raise exception 'Reçu non modifiable' using errcode='42501'; end if;
 expected:=org::text||'/expense/'||expense_id::text||'/'||actor::text||'/';
 if left(object_path,length(expected))<>expected or file_name='' or length(file_name)>240 or mime_type not in('image/jpeg','image/png','application/pdf') or size_bytes not between 1 and 10485760 or sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Fichier reçu invalide' using errcode='22023'; end if;
 if exists(select 1 from mir_core.expense_events x where x.organization_id=org and x.actor_id=actor and x.client_request_id=request_id) then return jsonb_build_object('idempotent',true); end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='mir-expense-receipts' and o.name=object_path and o.owner=actor and coalesce(o.metadata->>'mimetype','')=mime_type and coalesce((o.metadata->>'size')::bigint,-1)=size_bytes) then raise exception 'Fichier absent ou métadonnées invalides' using errcode='22023'; end if;
 insert into mir_core.expense_receipts(organization_id,expense_id,object_path,file_name,mime_type,size_bytes,sha256,uploaded_by) values(org,expense_id,object_path,file_name,mime_type,size_bytes,sha256,actor) returning * into r;
 insert into mir_core.expense_events(organization_id,expense_id,actor_id,action,before_state,after_state,client_request_id) values(org,expense_id,actor,'receipt_attached','{}',to_jsonb(r),request_id);
 return jsonb_build_object('id',r.id,'path',r.object_path,'idempotent',false);
exception when unique_violation then return jsonb_build_object('idempotent',true); end$$;

create or replace function public.mir_expense_submit(org uuid, request_id uuid, expense_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid(); e mir_core.expenses; old jsonb;
begin
 if actor is null or request_id is null then raise exception 'Session ou idempotence requise' using errcode='42501'; end if;
 if exists(select 1 from mir_core.expense_events x where x.organization_id=org and x.actor_id=actor and x.client_request_id=request_id) then return jsonb_build_object('id',expense_id,'idempotent',true); end if;
 select * into e from mir_core.expenses where organization_id=org and id=expense_id for update;
 if not found or e.employee_id<>actor or e.status not in('draft','needs_correction') then raise exception 'Soumission non autorisée' using errcode='42501'; end if;
 if not exists(select 1 from mir_core.expense_receipts r where r.organization_id=org and r.expense_id=mir_expense_submit.expense_id) then raise exception 'Un reçu est requis avant la soumission' using errcode='22023'; end if;
 old:=to_jsonb(e); update mir_core.expenses set status='submitted',submitted_at=now(),updated_at=now(),decision_reason=null,decided_at=null,decided_by=null where organization_id=org and id=expense_id returning * into e;
 insert into mir_core.expense_events(organization_id,expense_id,actor_id,action,before_state,after_state,client_request_id) values(org,expense_id,actor,'submitted',old,to_jsonb(e),request_id);
 return jsonb_build_object('id',e.id,'status',e.status,'idempotent',false);
end$$;

create or replace function public.mir_expense_decide(org uuid, request_id uuid, expense_id uuid, decision text, reason text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid(); role_name text; e mir_core.expenses; old jsonb; action_name text;
begin
 if actor is null or request_id is null then raise exception 'Session ou idempotence requise' using errcode='42501'; end if;
 role_name:=mir_core.expense_role(org,actor); if role_name is null or role_name not in('adjointe','boss') then raise exception 'Décision non autorisée' using errcode='42501'; end if;
 if decision not in('approved','refused','needs_correction') or (decision in('refused','needs_correction') and length(btrim(reason))<2) or length(reason)>2000 then raise exception 'Décision ou motif invalide' using errcode='22023'; end if;
 if exists(select 1 from mir_core.expense_events x where x.organization_id=org and x.actor_id=actor and x.client_request_id=request_id) then return jsonb_build_object('id',expense_id,'idempotent',true); end if;
 select * into e from mir_core.expenses where organization_id=org and id=expense_id for update;
 if not found or e.status<>'submitted' then raise exception 'Dépense non disponible pour décision' using errcode='42501'; end if;
 old:=to_jsonb(e); action_name:=case decision when 'approved' then 'approved' when 'refused' then 'refused' else 'returned' end;
 update mir_core.expenses set status=decision,decided_at=case when decision in('approved','refused') then now() else null end,decided_by=case when decision in('approved','refused') then actor else null end,decision_reason=btrim(reason),updated_at=now() where organization_id=org and id=expense_id returning * into e;
 insert into mir_core.expense_events(organization_id,expense_id,actor_id,action,reason,before_state,after_state,client_request_id) values(org,expense_id,actor,action_name,btrim(reason),old,to_jsonb(e),request_id);
 return jsonb_build_object('id',e.id,'status',e.status,'idempotent',false);
end$$;

create or replace function public.mir_expense_receipt_access(org uuid, receipt_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare r mir_core.expense_receipts;
begin
 select x.* into r from mir_core.expense_receipts x where x.organization_id=org and x.id=receipt_id;
 if not found or not mir_core.expense_visible(org,r.expense_id,auth.uid()) then raise exception 'Reçu non autorisé' using errcode='42501'; end if;
 return jsonb_build_object('bucket','mir-expense-receipts','path',r.object_path,'expiresIn',120);
end$$;

revoke all on function public.mir_expense_save_draft(uuid,uuid,uuid,jsonb),public.mir_expense_attach_receipt(uuid,uuid,uuid,text,text,text,bigint,text),public.mir_expense_submit(uuid,uuid,uuid),public.mir_expense_decide(uuid,uuid,uuid,text,text),public.mir_expense_receipt_access(uuid,uuid) from public,anon;
grant execute on function public.mir_expense_save_draft(uuid,uuid,uuid,jsonb),public.mir_expense_attach_receipt(uuid,uuid,uuid,text,text,text,bigint,text),public.mir_expense_submit(uuid,uuid,uuid),public.mir_expense_decide(uuid,uuid,uuid,text,text),public.mir_expense_receipt_access(uuid,uuid) to authenticated;
commit;
