-- Phase 6 Commandes UX + Pliages: favoris personnels et référence chantier à confirmer.
-- Additif seulement; aucun modèle maître, chantier ou historique existant n'est réécrit.
begin;

do $$ begin
 if to_regclass('mir_core.coordination_orders') is null or to_regclass('mir_core.catalogue_items') is null then
  raise exception 'Socle Phase 6 absent: installation refusée';
 end if;
end $$;

alter table mir_core.coordination_orders
 add column if not exists pending_job_reference text,
 add column if not exists pending_job_match_status text not null default 'matched';

do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='mir_core.coordination_orders'::regclass and conname='coordination_orders_pending_job_check') then
  alter table mir_core.coordination_orders add constraint coordination_orders_pending_job_check check(
   pending_job_match_status in ('matched','to_confirm')
   and ((pending_job_match_status='matched' and pending_job_reference is null)
     or (pending_job_match_status='to_confirm' and length(btrim(pending_job_reference)) between 1 and 200))
  );
 end if;
end $$;

create table if not exists mir_core.order_shortcut_favorites(
 organization_id uuid not null references mir_core.organizations(id),
 user_id uuid not null references auth.users(id),
 shortcut_kind text not null check(shortcut_kind in ('material','fold')),
 catalogue_item_id uuid not null,
 position smallint not null check(position between 1 and 6),
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id,shortcut_kind,catalogue_item_id),
 unique(organization_id,user_id,shortcut_kind,position),
 foreign key(organization_id,catalogue_item_id) references mir_core.catalogue_items(organization_id,id)
);
alter table mir_core.order_shortcut_favorites enable row level security;
revoke all on mir_core.order_shortcut_favorites from public,anon,authenticated;
grant select on mir_core.order_shortcut_favorites to authenticated;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='mir_core' and tablename='order_shortcut_favorites' and policyname='order_shortcut_favorites_self_read') then
  create policy order_shortcut_favorites_self_read on mir_core.order_shortcut_favorites for select to authenticated
   using(user_id=auth.uid() and exists(select 1 from mir_core.memberships m where m.organization_id=order_shortcut_favorites.organization_id and m.user_id=auth.uid() and m.active));
 end if;
end $$;

create or replace function public.mir_order_shortcut_set(org uuid,kind text,item_id uuid,favorite boolean,requested_position integer default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare actor uuid:=auth.uid();next_position integer;row_item mir_core.catalogue_items;
begin
 if actor is null or kind not in('material','fold') then raise exception 'Raccourci invalide' using errcode='22023';end if;
 if not exists(select 1 from mir_core.memberships m where m.organization_id=org and m.user_id=actor and m.active and m.role in('employee','chef_equipe','assistant','boss','admin')) then raise exception 'Accès refusé' using errcode='42501';end if;
 select * into row_item from mir_core.catalogue_items c where c.organization_id=org and c.id=item_id and c.channel='store' and c.published and not c.archived;
 if not found then raise exception 'Article indisponible' using errcode='42501';end if;
 if not favorite then delete from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=actor and f.shortcut_kind=kind and f.catalogue_item_id=item_id;
 else
  perform pg_advisory_xact_lock(hashtextextended(org::text||actor::text||kind,0));
  if (select count(*) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=actor and f.shortcut_kind=kind)>=6 then raise exception 'Maximum de six favoris atteint' using errcode='22023';end if;
  next_position:=coalesce(requested_position,(select coalesce(max(f.position),0)+1 from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=actor and f.shortcut_kind=kind));
  if next_position not between 1 and 6 then raise exception 'Position invalide' using errcode='22023';end if;
  insert into mir_core.order_shortcut_favorites(organization_id,user_id,shortcut_kind,catalogue_item_id,position) values(org,actor,kind,item_id,next_position)
  on conflict(organization_id,user_id,shortcut_kind,catalogue_item_id) do update set position=excluded.position;
 end if;
 return jsonb_build_object('kind',kind,'itemId',item_id,'favorite',favorite,'count',(select count(*) from mir_core.order_shortcut_favorites f where f.organization_id=org and f.user_id=actor and f.shortcut_kind=kind));
end $$;
revoke all on function public.mir_order_shortcut_set(uuid,text,uuid,boolean,integer) from public,anon;
grant execute on function public.mir_order_shortcut_set(uuid,text,uuid,boolean,integer) to authenticated;

create index if not exists order_shortcut_favorites_item_fk_idx on mir_core.order_shortcut_favorites(organization_id,catalogue_item_id);
create index if not exists coordination_orders_pending_job_idx on mir_core.coordination_orders(organization_id,pending_job_match_status) where pending_job_match_status='to_confirm';

commit;
