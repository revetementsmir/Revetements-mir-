-- Phase 1: stable operational role contract for the MIR internal platform.
-- Existing membership roles remain untouched for backward compatibility.
begin;

create or replace function mir_core.operational_role(org uuid, member uuid default auth.uid())
returns text
language sql stable security definer
set search_path=pg_catalog,mir_core
as $$
  select case
    when exists (
      select 1 from mir_core.memberships m
      where m.organization_id=org and m.user_id=member and m.active and m.role='admin'
    ) then 'boss'
    else (
      select case p.staff_role
        when 'assistant' then 'adjointe'
        when 'chef_equipe' then 'chef_equipe'
        when 'employe' then 'employe_chantier'
        when 'warehouse' then 'entrepot_livraison'
        when 'boss' then 'boss'
      end
      from mir_core.staff_capabilities p
      join mir_core.memberships m
        on (m.organization_id,m.user_id)=(p.organization_id,p.user_id)
      where p.organization_id=org and p.user_id=member
        and p.active and m.active and m.role='employee'
    )
  end;
$$;

comment on function mir_core.operational_role(uuid,uuid) is
'Canonical internal role: boss, adjointe, chef_equipe, employe_chantier or entrepot_livraison. Never trusts a browser supplied role.';

revoke all on function mir_core.operational_role(uuid,uuid) from public,anon;
grant execute on function mir_core.operational_role(uuid,uuid) to authenticated;

create or replace function public.mir_my_operational_access(org uuid)
returns jsonb
language plpgsql stable security definer
set search_path=pg_catalog,mir_core
as $$
declare r text;
begin
  r:=mir_core.operational_role(org,auth.uid());
  if r is null then
    raise exception 'Accès MIR inactif' using errcode='42501';
  end if;
  return jsonb_build_object(
    'role',r,
    'navigation',case r
      when 'boss' then jsonb_build_array('aujourdhui','chantiers','argent','plus')
      when 'adjointe' then jsonb_build_array('aujourdhui','cedule','demandes','plus')
      when 'chef_equipe' then jsonb_build_array('aujourdhui','plans','photos','plus')
      when 'employe_chantier' then jsonb_build_array('aujourdhui','plans','photos','plus')
      when 'entrepot_livraison' then jsonb_build_array('ma_journee','scanner','livraisons','inventaire')
    end
  );
end;
$$;

revoke all on function public.mir_my_operational_access(uuid) from public,anon;
grant execute on function public.mir_my_operational_access(uuid) to authenticated;

commit;
