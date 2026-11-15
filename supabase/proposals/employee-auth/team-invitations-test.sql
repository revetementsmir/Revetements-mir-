-- TEST ONLY. Deliberate install prerequisite; never run against production.
-- In a verified TEST-only migration session: SET mir.target_project='hxtztkmbfpmzrieccwsg';
begin;
do $$begin if current_setting('mir.target_project',true) is distinct from 'hxtztkmbfpmzrieccwsg' then raise exception 'Verified MIR TEST migration session required';end if;end$$;
alter table mir_core.account_invitations add column full_name text not null default '';
alter table mir_core.account_invitations add column team_role text not null default 'employe' check(team_role in ('employe','chef_equipe','warehouse','assistant','boss'));
alter table mir_core.account_invitations add column delivery_status text not null default 'pending' check(delivery_status in ('pending','sent','failed','unknown'));
alter table mir_core.account_invitations add column provider_receipt text;
create table mir_core.team_invitation_requests(organization_id uuid not null,actor_id uuid not null,request_id uuid not null,payload jsonb not null,result jsonb not null,primary key(organization_id,actor_id,request_id));
alter table mir_core.team_invitation_requests enable row level security;
revoke all on mir_core.team_invitation_requests from public,anon,authenticated;
create function mir_core.team_test_identity() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
begin
 if (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'iss') is distinct from 'https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1' then raise exception 'MIR TEST identity required' using errcode='42501';end if;
 return mir_core.account_identity();
end$$;
revoke all on function mir_core.team_test_identity() from public,anon,authenticated;
create function mir_core.team_invite_manager(org uuid) returns void language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text;begin
 perform mir_core.team_test_identity();actor_role:=mir_core.operational_role(org,auth.uid());
 if actor_role is null or actor_role not in ('boss','adjointe') then raise exception 'Droits Boss ou Adjointe requis' using errcode='42501';end if;
end$$;
revoke all on function mir_core.team_invite_manager(uuid) from public,anon,authenticated;
create function public.mir_team_invitation(p_action text,p_request_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare org uuid;inv mir_core.account_invitations;prior mir_core.team_invitation_requests;payload jsonb;token text;result jsonb;invite_email text;role_name text;jobs uuid[];actor uuid:=auth.uid();begin
 select organization_id into org from mir_core.account_settings where singleton;perform mir_core.team_invite_manager(org);
 if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' or p_action not in ('prepare','resend','revoke') then raise exception 'Requête invalide' using errcode='22023';end if;
 payload:=jsonb_build_object('action',p_action,'data',p_data);
 perform pg_advisory_xact_lock(hashtextextended(org::text||actor::text||p_request_id::text,0));
 select * into prior from mir_core.team_invitation_requests where organization_id=org and actor_id=actor and request_id=p_request_id;
 if found then if prior.payload<>payload then raise exception 'Référence déjà utilisée' using errcode='22023';end if;return prior.result||jsonb_build_object('alreadyCreated',true);end if;
 if p_action='prepare' then
  invite_email:=lower(btrim(p_data->>'email'));role_name:=p_data->>'role';
  if invite_email is null or length(invite_email)>254 or invite_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(btrim(coalesce(p_data->>'name','')))=0 or length(p_data->>'name')>160 or role_name is null or role_name not in ('employe','chef_equipe','warehouse','assistant','boss') then raise exception 'Nom, courriel ou rôle invalide' using errcode='22023';end if;
  -- Adjointe cannot create another manager; Boss must approve manager roles.
  if role_name in ('assistant','boss') and mir_core.operational_role(org,actor)<>'boss' then raise exception 'Validation Boss requise' using errcode='42501';end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into jobs from jsonb_array_elements_text(coalesce(p_data->'jobIds','[]'));
  if cardinality(jobs)>100 or exists(select 1 from unnest(jobs) j where not exists(select 1 from mir_core.jobs x where x.organization_id=org and x.id=j and not x.archived)) then raise exception 'Affectation non autorisée' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(org::text||invite_email,0));
  if exists(select 1 from mir_core.account_invitations where organization_id=org and account_invitations.email=invite_email and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'Invitation déjà en attente : renouveler ou révoquer son lien' using errcode='23505';end if;
  token:=rtrim(translate(encode(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),'base64'),'+/','-_'),'=');
  insert into mir_core.account_invitations(organization_id,email,token_hash,job_ids,request_id,created_by,full_name,team_role) values(org,invite_email,encode(sha256(convert_to(token,'UTF8')),'hex'),jobs,p_request_id,actor,btrim(p_data->>'name'),role_name) returning * into inv;
 else
  select * into inv from mir_core.account_invitations where organization_id=org and id=(p_data->>'invitationId')::uuid for update;
  if not found or inv.accepted_at is not null then raise exception 'Invitation indisponible' using errcode='42501';end if;
  if inv.team_role in ('assistant','boss') and mir_core.operational_role(org,actor)<>'boss' then raise exception 'Validation Boss requise' using errcode='42501';end if;
  if p_action='revoke' then update mir_core.account_invitations set revoked_at=coalesce(revoked_at,now()) where id=inv.id;result:=jsonb_build_object('id',inv.id,'status','revoked');
  else
   if inv.revoked_at is not null then raise exception 'Invitation révoquée' using errcode='42501';end if;
   token:=rtrim(translate(encode(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),'base64'),'+/','-_'),'=');
   update mir_core.account_invitations set token_hash=encode(sha256(convert_to(token,'UTF8')),'hex'),expires_at=now()+interval '72 hours',delivery_status='pending',provider_receipt=null where id=inv.id returning * into inv;
  end if;
 end if;
 if result is null then result:=jsonb_build_object('id',inv.id,'status','pending','expiresAt',inv.expires_at,'deliveryStatus','pending','activationPath','chantier.html?recette=1&invitation='||token);end if;
 -- Idempotency receipt intentionally excludes the bearer secret.
 insert into mir_core.team_invitation_requests values(org,actor,p_request_id,payload,result-'activationPath');return result;
end$$;
create function public.mir_team_invitations() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare org uuid;result jsonb;begin
 select organization_id into org from mir_core.account_settings where singleton;perform mir_core.team_invite_manager(org);
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'name',i.full_name,'role',i.team_role,'expiresAt',i.expires_at,'status',case when i.revoked_at is not null then 'revoked' when i.accepted_at is not null then 'accepted' when i.expires_at<=now() then 'expired' else 'pending' end,'deliveryStatus',i.delivery_status,'providerReceipt',i.provider_receipt,'memberActive',m.active) order by i.created_at desc),'[]') into result from mir_core.account_invitations i left join mir_core.memberships m on m.organization_id=i.organization_id and m.user_id=i.accepted_by where i.organization_id=org;return result;
end$$;
create function public.mir_team_accept_invitation(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
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
revoke all on function public.mir_team_invitation(text,uuid,jsonb),public.mir_team_invitations(),public.mir_team_accept_invitation(text) from public,anon;
grant execute on function public.mir_team_invitation(text,uuid,jsonb),public.mir_team_invitations(),public.mir_team_accept_invitation(text) to authenticated;
-- Legacy mutation endpoints must not bypass the TEST invitation contract.
revoke execute on function public.mir_account_create_invitation(text,uuid[],uuid),public.mir_account_revoke_invitation(uuid),public.mir_portal_accept_invitation(text) from public,anon,authenticated;

-- Enrollment holds no password, OTP or session. A server HMAC only binds retries
-- to the same chosen password; authority still comes from the personal token.
create table mir_core.team_enrollments(
 email text primary key, invitation_id uuid not null references mir_core.account_invitations(id),
 request_id uuid not null, user_id uuid references auth.users(id), password_tag text not null,
 lease_until timestamptz not null
);
alter table mir_core.team_enrollments enable row level security;
revoke all on mir_core.team_enrollments from public,anon,authenticated;
create function public.mir_team_enrollment(p_action text,p_token text,p_email text,p_request_id uuid,p_user_id uuid,p_password_tag text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare inv mir_core.account_invitations;enrollment mir_core.team_enrollments;u auth.users;org uuid;begin
 if p_action is null or p_action not in ('claim','bind') or p_request_id is null or p_token is null or p_token!~'^[A-Za-z0-9_-]{43}$' or p_password_tag is null or p_password_tag!~'^[a-f0-9]{64}$' then raise exception 'Invitation indisponible' using errcode='42501';end if;
 select organization_id into org from mir_core.account_settings where singleton;
 select * into inv from mir_core.account_invitations where organization_id=org and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or inv.revoked_at is not null or inv.expires_at<=now() or p_email is distinct from inv.email then raise exception 'Invitation indisponible' using errcode='42501';end if;
 if inv.accepted_at is not null then return jsonb_build_object('existingAccount',true);end if;
 perform pg_advisory_xact_lock(hashtextextended(inv.email,0));
 select * into enrollment from mir_core.team_enrollments where email=inv.email for update;
 select * into u from auth.users where lower(email)=inv.email order by id limit 1 for update;
 if u.id is not null and (u.email_confirmed_at is not null or u.raw_app_meta_data->>'mir_team_invitation' is distinct from inv.id::text) then return jsonb_build_object('existingAccount',true);end if;
 if p_action='claim' then
  if enrollment.email is not null and enrollment.lease_until>now() then raise exception 'Activation en cours' using errcode='55000',detail='TEAM_BUSY';end if;
  if enrollment.email is not null and (enrollment.invitation_id<>inv.id or enrollment.password_tag<>p_password_tag) then return jsonb_build_object('existingAccount',true);end if;
  insert into mir_core.team_enrollments(email,invitation_id,request_id,user_id,password_tag,lease_until) values(inv.email,inv.id,p_request_id,u.id,p_password_tag,now()+interval '180 seconds')
   on conflict(email) do update set request_id=excluded.request_id,user_id=excluded.user_id,lease_until=excluded.lease_until;
 else
  if enrollment.request_id is distinct from p_request_id or enrollment.invitation_id is distinct from inv.id or enrollment.password_tag is distinct from p_password_tag or enrollment.lease_until<=now() or u.id is distinct from p_user_id then raise exception 'Activation indisponible' using errcode='42501';end if;
  update mir_core.team_enrollments set user_id=u.id where email=inv.email;
 end if;
 return jsonb_build_object('invitationId',inv.id,'email',inv.email,'userId',u.id);
end$$;
revoke all on function public.mir_team_enrollment(text,text,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.mir_team_enrollment(text,text,text,uuid,uuid,text) to service_role;
create function public.mir_team_invitation_preview(p_token text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare org uuid;inv mir_core.account_invitations;begin
 select organization_id into org from mir_core.account_settings where singleton;perform mir_core.team_invite_manager(org);
 if p_token is null or p_token!~'^[A-Za-z0-9_-]{43}$' then raise exception 'Invitation indisponible' using errcode='42501';end if;
 select * into inv from mir_core.account_invitations where organization_id=org and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and revoked_at is null and accepted_at is null and expires_at>now();
 if not found then raise exception 'Invitation indisponible' using errcode='42501';end if;
 if inv.team_role in ('assistant','boss') and mir_core.operational_role(org,auth.uid())<>'boss' then raise exception 'Validation Boss requise' using errcode='42501';end if;
 return jsonb_build_object('name',inv.full_name,'email',inv.email,'expiresAt',inv.expires_at);
end$$;
revoke all on function public.mir_team_invitation_preview(text) from public,anon;
grant execute on function public.mir_team_invitation_preview(text) to authenticated;
notify pgrst,'reload schema';
commit;
