begin;
create or replace function public.mir_account_snapshot() returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare identity jsonb;cfg mir_core.account_settings;uid uuid;actor_role text;orders jsonb;addresses jsonb;begin
 identity:=mir_core.account_identity();uid:=(identity->>'id')::uuid;
 select * into cfg from mir_core.account_settings where singleton;
 if cfg.organization_id is null then raise exception 'Le compte MIR attend sa configuration serveur' using errcode='42501',detail='ACCOUNT_NOT_CONFIGURED';end if;
 if exists(select 1 from mir_core.memberships m where m.organization_id=cfg.organization_id and m.user_id=uid and not m.active) then raise exception 'Votre accès employé est suspendu. Contactez MIR pour le réactiver.' using errcode='42501',detail='ACCESS_SUSPENDED';end if;
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
create function public.mir_estimate_owners() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$declare org uuid;out jsonb;begin if not public.mir_estimate_staff_allowed() then raise exception 'Estimations non autorisées' using errcode='42501';end if;select organization_id into org from mir_core.account_settings where singleton;select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,u.raw_user_meta_data->>'full_name',case when m.role='admin' then 'Administration MIR' else 'Adjointe MIR' end))),'[]') into out from mir_core.memberships m join auth.users u on u.id=m.user_id left join mir_core.staff_profiles p on(p.organization_id,p.user_id)=(m.organization_id,m.user_id) where m.organization_id=org and m.active and (m.role='admin' or (m.role='employee' and exists(select 1 from mir_core.coordination_access a join mir_core.admin_permissions x on(x.organization_id,x.user_id)=(a.organization_id,a.user_id) where a.organization_id=org and a.user_id=m.user_id and a.active and x.estimates)));return out;end$$;
revoke all on function public.mir_estimate_owners() from public,anon;grant execute on function public.mir_estimate_owners() to authenticated;
create unique index mir_store_catalogue_identity on mir_core.catalogue_items(organization_id,(specification->>'id')) where channel='store' and specification->>'id' is not null;
commit;
