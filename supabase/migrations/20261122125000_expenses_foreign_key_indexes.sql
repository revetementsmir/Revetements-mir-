-- Phase 4: indexes for foreign-key checks and role/history lookups.
-- CREATE INDEX IF NOT EXISTS keeps this safe to replay on MIR TEST and production.
begin;

create index if not exists expenses_employee_fk_idx
  on mir_core.expenses(employee_id);
create index if not exists expenses_job_fk_idx
  on mir_core.expenses(organization_id,job_id) where job_id is not null;
create index if not exists expenses_decided_by_fk_idx
  on mir_core.expenses(decided_by) where decided_by is not null;

create index if not exists expense_receipts_expense_fk_idx
  on mir_core.expense_receipts(organization_id,expense_id);
create index if not exists expense_receipts_uploaded_by_fk_idx
  on mir_core.expense_receipts(uploaded_by);

create index if not exists expense_events_expense_fk_idx
  on mir_core.expense_events(organization_id,expense_id);
create index if not exists expense_events_actor_fk_idx
  on mir_core.expense_events(actor_id);

commit;
