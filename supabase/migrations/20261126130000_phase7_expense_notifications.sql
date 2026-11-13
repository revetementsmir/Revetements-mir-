-- Phase 7 corrective: canonical expense events feed internal notifications.
-- Apply after 20261126120000_phase7_notifications.sql. Additive and replay-safe.
begin;

do $$ begin
 if to_regclass('mir_core.expense_events') is null or to_regclass('mir_core.notification_events') is null then
  raise exception 'Phase 4 expenses and Phase 7 notifications are required';
 end if;
end $$;

create or replace function mir_core.notification_expense_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare owner uuid; title text; priority text:='information'; recipient_rule text:='owner'; route jsonb;
begin
 if new.action not in('submitted','returned','approved','refused') then return new; end if;
 select e.employee_id into owner from mir_core.expenses e
  where (e.organization_id,e.id)=(new.organization_id,new.expense_id);
 if owner is null then raise exception 'Dépense canonique absente' using errcode='23503'; end if;
 route:=jsonb_build_object('view','expenses','expenseId',new.expense_id);
 if new.action='submitted' then
  title:='Nouvelle dépense à traiter'; priority:='action_required'; recipient_rule:='management';
 else
  title:=case new.action when 'returned' then 'Précision demandée pour votre dépense' when 'approved' then 'Dépense approuvée' else 'Dépense refusée' end;
  update mir_core.notifications set treated_at=coalesce(treated_at,new.created_at),updated_at=now()
   where organization_id=new.organization_id and entity_id=new.expense_id and module='expenses' and action_required and treated_at is null;
 end if;
 perform mir_core.notification_emit(
  new.organization_id,new.organization_id||':expense:'||new.id,'expenses','expense_'||new.action,
  new.expense_id,new.actor_id,title,'Ouvrez Dépenses pour consulter l’état autorisé.',priority,route,
  recipient_rule,owner,null,jsonb_build_object('expenseEventId',new.id)
 );
 return new;
end $$;

drop trigger if exists notification_expense_event on mir_core.expense_events;
create trigger notification_expense_event after insert on mir_core.expense_events
 for each row execute function mir_core.notification_expense_event();

revoke all on function mir_core.notification_expense_event() from public,anon,authenticated;
comment on function mir_core.notification_expense_event() is
 'Phase 7 corrective: transactionally maps immutable expense events to minimal internal notifications; no email or push.';

create or replace function mir_core.notification_warehouse_movement() returns trigger
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
begin
 perform mir_core.notification_emit(
  new.organization_id,new.organization_id||':warehouse:'||new.id,'inventory','warehouse_'||new.kind,
  new.id,new.actor_id,case new.kind when 'receipt' then 'Réception d’inventaire enregistrée' when 'delivery' then 'Livraison d’inventaire enregistrée' else 'Mouvement d’inventaire enregistré' end,
  'Ouvrez Entrepôt pour consulter le mouvement autorisé.','information',jsonb_build_object('view','warehouse-inventory','movementId',new.id),
  'warehouse',null,null,jsonb_build_object('warehouseMovementId',new.id)
 );
 return new;
end $$;
revoke all on function mir_core.notification_warehouse_movement() from public,anon,authenticated;
do $$ begin
 if to_regclass('mir_core.warehouse_movements') is not null then
  drop trigger if exists notification_warehouse_movement on mir_core.warehouse_movements;
  create trigger notification_warehouse_movement after insert on mir_core.warehouse_movements
   for each row execute function mir_core.notification_warehouse_movement();
 end if;
end $$;
commit;
