-- Leave headroom for the other free MIR project and other application data.
begin;
alter table mir_estimates.settings alter column storage_budget_bytes set default 419430400;
update mir_estimates.settings set storage_budget_bytes=least(storage_budget_bytes,419430400);
commit;
