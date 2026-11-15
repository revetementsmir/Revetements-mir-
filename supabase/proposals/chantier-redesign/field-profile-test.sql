-- Operational display identity of the authenticated field user, TEST only.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'MIR TEST prerequisite required';end if;end$$;
create function public.mir_field_profile(org uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare r text:=mir_core.staff_role(org);name text;begin
 if auth.uid() is null or coalesce(r,'') not in('employe','chef_equipe') or not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=auth.uid() and m.active and m.role='employee') then raise exception 'Profil chantier refusé' using errcode='42501';end if;
 select nullif(btrim(c.display_name),'') into name from mir_core.staff_capabilities c where c.organization_id=org and c.user_id=auth.uid() and c.active;
 return jsonb_build_object('id',auth.uid(),'name',name,'role',r);
end$$;
revoke all on function public.mir_field_profile(uuid) from public,anon;
grant execute on function public.mir_field_profile(uuid) to authenticated;
commit;
