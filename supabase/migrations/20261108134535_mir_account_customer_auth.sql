-- Account API on the existing MIR foundation. No order or membership is replaced.
begin;
create table mir_core.account_settings (
 singleton boolean primary key default true check(singleton),
 organization_id uuid not null references mir_core.organizations(id),
 allow_client_signup boolean not null default false
);
alter table mir_core.account_settings enable row level security;
revoke all on mir_core.account_settings from public,anon,authenticated;
create table mir_core.customer_addresses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id),
 address jsonb not null check(jsonb_typeof(address)='object' and octet_length(address::text)<=4000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table mir_core.customer_addresses enable row level security;
grant select,insert,update,delete on mir_core.customer_addresses to authenticated;
create policy account_address_read on mir_core.customer_addresses for select to authenticated using(user_id=(select auth.uid()));
create policy account_address_insert on mir_core.customer_addresses for insert to authenticated with check(user_id=(select auth.uid()));
create policy account_address_update on mir_core.customer_addresses for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy account_address_delete on mir_core.customer_addresses for delete to authenticated using(user_id=(select auth.uid()));
create index customer_addresses_owner on mir_core.customer_addresses(user_id);
create table mir_core.account_invitations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references mir_core.organizations(id),
 email text not null,token_hash text not null unique,job_ids uuid[] not null default '{}',
 request_id uuid not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '72 hours'),accepted_by uuid references auth.users(id),accepted_at timestamptz,revoked_at timestamptz,
 unique(organization_id,request_id)
);
alter table mir_core.account_invitations enable row level security;
revoke all on mir_core.account_invitations from public,anon,authenticated;

create function mir_core.account_identity() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid();email text;confirmed timestamptz;begin
 if uid is null then raise exception 'Connexion requise' using errcode='42501',detail='AUTH_REQUIRED';end if;
 select u.email,u.email_confirmed_at into email,confirmed from auth.users u where u.id=uid;
 if email is null or confirmed is null then raise exception 'Confirmez votre adresse courriel avant de continuer' using errcode='42501',detail='EMAIL_UNCONFIRMED';end if;
 return jsonb_build_object('id',uid,'email',email);
end $$;
revoke all on function mir_core.account_identity() from public,anon,authenticated;

create function public.mir_account_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;cfg mir_core.account_settings;uid uuid;actor_role text;orders jsonb;addresses jsonb;begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;
 select * into cfg from mir_core.account_settings where singleton;
 if cfg.organization_id is null then raise exception 'Le compte MIR attend sa configuration serveur' using errcode='42501',detail='ACCOUNT_NOT_CONFIGURED';end if;
 select m.role into actor_role from mir_core.memberships m where m.organization_id=cfg.organization_id and m.user_id=uid and m.active;
 if actor_role is null then
  if exists(select 1 from mir_core.memberships m where m.organization_id=cfg.organization_id and m.user_id=uid) or not cfg.allow_client_signup then
   raise exception 'Votre accès doit être confirmé par MIR' using errcode='42501',detail='ACCESS_DENIED';end if;
  -- The public caller supplies neither a role nor an organization. Never reactivate an inactive member.
  insert into mir_core.memberships(organization_id,user_id,role,active) values(cfg.organization_id,uid,'client',true) on conflict do nothing;
  select m.role into actor_role from mir_core.memberships m where m.organization_id=cfg.organization_id and m.user_id=uid and m.active;
 end if;
 if actor_role is null then raise exception 'Accès MIR inactif' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'status',o.status,'createdAt',o.created_at,'revision',o.revision,
 'events',coalesce((select jsonb_agg(jsonb_build_object('createdAt',e.created_at,'label',case e.event_type when 'request-submitted' then 'Demande reçue' when 'delivered' then 'Livrée' when 'shipped' then 'Expédiée' else 'Statut mis à jour' end) order by e.created_at)
 from mir_core.order_events e where e.organization_id=o.organization_id and e.order_id=o.id),'[]')) order by o.created_at desc),'[]') into orders
 from mir_core.orders o where o.organization_id=cfg.organization_id and o.kind='client' and o.owner_id=uid;
 select coalesce(jsonb_agg(a.address||jsonb_build_object('id',a.id) order by a.created_at),'[]') into addresses from mir_core.customer_addresses a where a.user_id=uid;
 return jsonb_build_object('userId',uid,'email',identity->>'email','role',actor_role,'organizationId',cfg.organization_id,'orders',orders,'addresses',addresses,
 'capabilities',jsonb_build_object('customerCheckout',false,'payment',false));
end $$;
revoke all on function public.mir_account_snapshot() from public,anon;
grant execute on function public.mir_account_snapshot() to authenticated;

create function public.mir_account_save_address(p_address jsonb,p_id uuid default null) returns uuid language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;uid uuid;clean jsonb:='{}';key text;value text;address_id uuid:=coalesce(p_id,gen_random_uuid());begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;
 if jsonb_typeof(p_address)<>'object' or octet_length(p_address::text)>6000 then raise exception 'Adresse invalide' using errcode='22023';end if;
 foreach key in array array['label','recipient','line1','line2','city','province','postalCode','country'] loop
  value:=trim(coalesce(p_address->>key,''));
  if length(value)>200 then raise exception 'Un champ de l’adresse est trop long' using errcode='22023';end if;
  if key=any(array['recipient','line1','city','province','postalCode','country']) and value='' then raise exception 'Complétez les champs de livraison obligatoires' using errcode='22023';end if;
  clean:=clean||jsonb_build_object(key,value);
 end loop;
 if p_id is not null and not exists(select 1 from mir_core.customer_addresses a where a.id=p_id and a.user_id=uid) then raise exception 'Cette adresse ne vous appartient pas' using errcode='42501';end if;
 insert into mir_core.customer_addresses(id,user_id,address) values(address_id,uid,clean)
 on conflict(id) do update set address=excluded.address,updated_at=now() where customer_addresses.user_id=uid;
 if not found then raise exception 'Cette adresse ne vous appartient pas' using errcode='42501';end if;return address_id;
end $$;
revoke all on function public.mir_account_save_address(jsonb,uuid) from public,anon;
grant execute on function public.mir_account_save_address(jsonb,uuid) to authenticated;
create function public.mir_account_remove_address(p_id uuid) returns boolean language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;begin identity:=mir_core.account_identity();delete from mir_core.customer_addresses where id=p_id and user_id=(identity->>'id')::uuid;return found;end $$;
revoke all on function public.mir_account_remove_address(uuid) from public,anon;
grant execute on function public.mir_account_remove_address(uuid) to authenticated;

-- Adapter to the existing employee portal. Source data and access stay server-owned.
create function public.mir_portal_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare account jsonb;org uuid;uid uuid;shared jsonb;members jsonb;catalogue jsonb;begin
 account:=public.mir_account_snapshot();org:=(account->>'organizationId')::uuid;uid:=(account->>'userId')::uuid;
 if account->>'role' not in ('employee','admin') then raise exception 'Accès équipe MIR requis' using errcode='42501',detail='ACCESS_DENIED';end if;
 shared:=public.mir_shared_snapshot(org);
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'full_name',u.email),'email',u.email,'role',m.role,'active',m.active)),'[]') into members
 from mir_core.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org and (account->>'role'='admin' or m.user_id=uid);
 select coalesce(jsonb_agg(c.specification||jsonb_build_object('id',c.id,'name',c.name,'active',true)),'[]') into catalogue from mir_core.catalogue_items c where c.organization_id=org and c.channel='store' and c.published and not c.archived;
 return jsonb_build_object('mode','connected','demo',false,'actorId',uid,'members',members,'jobs',shared->'jobs','planVersions','[]'::jsonb,'catalogue',catalogue,
 'orders',shared->'orders','deliveries','[]'::jsonb,'movements','[]'::jsonb,'inventory','{}'::jsonb,'favorites','{}'::jsonb,
 'capabilities',jsonb_build_object('documents',false,'checkout',false));
end $$;
revoke all on function public.mir_portal_snapshot() from public,anon;
grant execute on function public.mir_portal_snapshot() to authenticated;

create function public.mir_account_create_invitation(p_email text,p_job_ids uuid[] default '{}',p_request_id uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;cfg mir_core.account_settings;uid uuid;token text;created mir_core.account_invitations;email text:=lower(trim(p_email));begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;select * into cfg from mir_core.account_settings where singleton;
 if not mir_core.has_role(cfg.organization_id,array['admin']) then raise exception 'Droits administrateur requis' using errcode='42501';end if;
 if email is null or length(email)>254 or email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or coalesce(cardinality(p_job_ids),0)>100 then raise exception 'Courriel ou chantiers invalides' using errcode='22023';end if;
 if exists(select 1 from unnest(p_job_ids) j where not exists(select 1 from mir_core.jobs x where x.organization_id=cfg.organization_id and x.id=j and not x.archived)) then raise exception 'Chantier non autorisé' using errcode='42501';end if;
 select * into created from mir_core.account_invitations where organization_id=cfg.organization_id and request_id=p_request_id;
 if found then return jsonb_build_object('id',created.id,'status','prepared','alreadyCreated',true,'activationPath',null);end if;
 token:=rtrim(translate(encode(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),'base64'),'+/','-_'),'=');
 insert into mir_core.account_invitations(organization_id,email,token_hash,job_ids,request_id,created_by) values(cfg.organization_id,email,encode(sha256(convert_to(token,'UTF8')),'hex'),coalesce(p_job_ids,'{}'),p_request_id,uid) returning * into created;
 return jsonb_build_object('id',created.id,'status','prepared','expiresAt',created.expires_at,'activationPath','chantier.html?invitation='||token,'delivery','manual');
end $$;
revoke all on function public.mir_account_create_invitation(text,uuid[],uuid) from public,anon;
grant execute on function public.mir_account_create_invitation(text,uuid[],uuid) to authenticated;

create function public.mir_portal_accept_invitation(p_token text) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;uid uuid;inv mir_core.account_invitations;jid uuid;begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;
 if p_token is null or p_token!~'^[A-Za-z0-9_-]{43}$' then raise exception 'Invitation invalide' using errcode='42501';end if;
 select * into inv from mir_core.account_invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or inv.revoked_at is not null or inv.expires_at<=now() or lower(identity->>'email')<>inv.email or (inv.accepted_by is not null and inv.accepted_by<>uid) then raise exception 'Invitation expirée, déjà utilisée ou destinée à une autre adresse' using errcode='42501',detail='INVITATION_INVALID';end if;
 if inv.accepted_by=uid then return jsonb_build_object('ok',true,'alreadyAccepted',true);end if;
 insert into mir_core.memberships(organization_id,user_id,role,active) values(inv.organization_id,uid,'employee',true)
 on conflict(organization_id,user_id) do update set role=case when memberships.role='admin' then 'admin' else 'employee' end,active=true;
 foreach jid in array inv.job_ids loop
  insert into mir_core.job_memberships(organization_id,job_id,user_id) values(inv.organization_id,jid,uid) on conflict do nothing;
 end loop;
 update mir_core.account_invitations set accepted_by=uid,accepted_at=now() where id=inv.id;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.mir_portal_accept_invitation(text) from public,anon;
grant execute on function public.mir_portal_accept_invitation(text) to authenticated;

create function public.mir_portal_list_invitations() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;cfg mir_core.account_settings;result jsonb;begin
 identity:=mir_core.account_identity();select * into cfg from mir_core.account_settings where singleton;
 if not mir_core.has_role(cfg.organization_id,array['admin']) then raise exception 'Droits administrateur requis' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'expiresAt',i.expires_at,'createdAt',i.created_at,'status',case when revoked_at is not null then 'revoked' when accepted_at is not null then 'accepted' when expires_at<=now() then 'expired' else 'pending' end) order by i.created_at desc),'[]') into result from mir_core.account_invitations i where i.organization_id=cfg.organization_id;return result;
end $$;
revoke all on function public.mir_portal_list_invitations() from public,anon;
grant execute on function public.mir_portal_list_invitations() to authenticated;
create function public.mir_account_revoke_invitation(p_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;cfg mir_core.account_settings;begin
 identity:=mir_core.account_identity();select * into cfg from mir_core.account_settings where singleton;
 if not mir_core.has_role(cfg.organization_id,array['admin']) then raise exception 'Droits administrateur requis' using errcode='42501';end if;
 update mir_core.account_invitations set revoked_at=coalesce(revoked_at,now()) where id=p_id and organization_id=cfg.organization_id and accepted_at is null;
 return jsonb_build_object('status','revoked');end $$;
revoke all on function public.mir_account_revoke_invitation(uuid) from public,anon;
grant execute on function public.mir_account_revoke_invitation(uuid) to authenticated;
commit;
