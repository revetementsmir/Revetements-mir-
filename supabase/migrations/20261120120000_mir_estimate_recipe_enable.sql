begin;

do $$
declare changed integer;
begin
  update mir_estimates.settings set diagnostics=true where singleton;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'MIR_ESTIMATE_SETTINGS_MISMATCH';end if;
end $$;

commit;
