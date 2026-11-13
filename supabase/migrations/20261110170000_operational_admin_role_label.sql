do $migration$
declare
  function_sql text;
  target constant text := '''role'',coalesce(role_name,''boss'')';
  replacement constant text := '''role'',case when role_name=''admin'' then ''boss'' else coalesce(role_name,''boss'') end';
begin
  select pg_get_functiondef(p.oid)
    into function_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'mir_employee_operations_snapshot'
    and pg_get_function_identity_arguments(p.oid) = 'org uuid, job uuid';

  if function_sql is null then
    raise exception 'mir_employee_operations_snapshot introuvable';
  end if;
  if position(target in function_sql) = 0 then
    raise exception 'Expression de rôle opérationnel inattendue';
  end if;

  execute replace(function_sql, target, replacement);
end
$migration$;

comment on function public.mir_employee_operations_snapshot(uuid, uuid) is
  'Snapshot opérationnel MIR; le rôle technique admin est présenté comme Boss sans modifier ses permissions.';
