-- Phase 4: cover the composite category foreign key reported by the database advisor.
-- Safe to replay.
begin;

create index if not exists expenses_category_fk_idx
  on mir_core.expenses(organization_id, category_code);

commit;
