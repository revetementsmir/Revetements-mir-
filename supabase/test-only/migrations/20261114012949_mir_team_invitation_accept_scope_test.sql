-- TEST only. Set mir.target_project explicitly in a verified TEST session.
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST migration session required';end if;end$$;
create or replace function public.mir_team_accept_invitation(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;inv mir_core.account_invitations;uid uuid:=auth.uid();m mir_core.memberships;staff mir_core.staff_capabilities;jid uuid;begin
 identity:=mir_core.team_test_identity();
 if p_token is null or p_token!~'^[A-Za-z0-9_-]{43}$' then raise exception 'Invitation invalide' using errcode='42501';end if;
 select * into inv from mir_core.account_invitations where organization_id=(select organization_id from mir_core.account_settings where singleton) and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or inv.revoked_at is not null or inv.expires_at<=now() or lower(identity->>'email')<>inv.email or (inv.accepted_by is not null and inv.accepted_by<>uid) then raise exception 'Invitation indisponible pour ce compte' using errcode='42501';end if;
 -- Serialize membership checks across different invitations for the same identity.
 perform pg_advisory_xact_lock(hashtextextended(inv.organization_id::text||uid::text,0));
 select * into m from mir_core.memberships where organization_id=inv.organization_id and user_id=uid for update;
 if found and (not m.active or m.role='admin') then raise exception 'Accès suspendu ou rôle incompatible' using errcode='42501';end if;
 select * into staff from mir_core.staff_capabilities where organization_id=inv.organization_id and user_id=uid for update;
 if found and (not staff.active or staff.staff_role<>inv.team_role) then raise exception 'Rôle existant à vérifier par le responsable' using errcode='42501';end if;
 if inv.accepted_by=uid then return jsonb_build_object('ok',true,'alreadyAccepted',true);end if;
 insert into mir_core.memberships(organization_id,user_id,role,active) values(inv.organization_id,uid,'employee',true) on conflict(organization_id,user_id) do update set role='employee';
 insert into mir_core.staff_capabilities(organization_id,user_id,staff_role,display_name,configured_by) values(inv.organization_id,uid,inv.team_role,inv.full_name,inv.created_by) on conflict(organization_id,user_id) do nothing;
 foreach jid in array inv.job_ids loop
  if not exists(select 1 from mir_core.jobs where organization_id=inv.organization_id and id=jid and not archived) then raise exception 'Affectation indisponible' using errcode='42501';end if;
  insert into mir_core.job_memberships(organization_id,job_id,user_id) values(inv.organization_id,jid,uid) on conflict do nothing;
 end loop;
 update mir_core.account_invitations set accepted_by=uid,accepted_at=now() where id=inv.id;return jsonb_build_object('ok',true);
end$$;
notify pgrst,'reload schema';
commit;
