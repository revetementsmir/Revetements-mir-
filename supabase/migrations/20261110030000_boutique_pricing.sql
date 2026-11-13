-- Boutique MIR: authoritative published prices and immutable audit trail.
create table if not exists mir_core.boutique_price_suggestions (
  item_id text not null,
  format_id text not null default '',
  unit text not null,
  regional_average_cents integer not null check (regional_average_cents > 0),
  suggested_price_cents integer not null check (suggested_price_cents > 0),
  currency text not null default 'CAD' check (currency = 'CAD'),
  researched_on date not null,
  primary key (item_id, format_id)
);

create table if not exists mir_core.boutique_prices (
  organization_id uuid not null references mir_core.organizations(id) on delete cascade,
  item_id text not null,
  format_id text not null default '',
  state text not null check (state in ('automatic','adjusted','on_request')),
  published_price_cents integer,
  currency text not null default 'CAD' check (currency = 'CAD'),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  reason text,
  primary key (organization_id, item_id, format_id),
  check (published_price_cents is null or published_price_cents between 1 and 10000000),
  check ((state = 'adjusted' and published_price_cents is not null) or (state <> 'adjusted' and published_price_cents is null)),
  check (reason is null or char_length(reason) <= 500)
);

create table if not exists mir_core.boutique_price_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references mir_core.organizations(id) on delete cascade,
  item_id text not null,
  format_id text not null default '',
  old_state text check (old_state is null or old_state in ('automatic','adjusted','on_request')),
  old_price_cents integer,
  new_state text not null check (new_state in ('automatic','adjusted','on_request')),
  new_price_cents integer,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text,
  check (reason is null or char_length(reason) <= 500)
);

create index if not exists boutique_price_history_lookup
  on mir_core.boutique_price_history (organization_id, item_id, format_id, changed_at desc);
create index if not exists boutique_prices_updated_by_idx on mir_core.boutique_prices(updated_by);
create index if not exists boutique_price_history_changed_by_idx on mir_core.boutique_price_history(changed_by);

alter table mir_core.boutique_price_suggestions enable row level security;
alter table mir_core.boutique_prices enable row level security;
alter table mir_core.boutique_price_history enable row level security;
revoke all on mir_core.boutique_price_suggestions, mir_core.boutique_prices, mir_core.boutique_price_history from public, anon, authenticated;
revoke all on sequence mir_core.boutique_price_history_id_seq from public, anon, authenticated;

insert into mir_core.boutique_price_suggestions(item_id,format_id,unit,regional_average_cents,suggested_price_cents,currency,researched_on) values
 ('hardieplank-select-625','','pièce de 12 pi',1572,1807,'CAD','2026-11-09'),
 ('hardieplank-select-825','','pièce de 12 pi',1576,1812,'CAD','2026-11-09'),
 ('hardiepanel','48x96','panneau',10551,12134,'CAD','2026-11-09'),
 ('hardiepanel','48x120','panneau',11840,13616,'CAD','2026-11-09'),
 ('hardiepanel-cedarmill','48x96','panneau',9058,10416,'CAD','2026-11-09'),
 ('hardiepanel-cedarmill','48x120','panneau',11560,13294,'CAD','2026-11-09'),
 ('hardieshingle-straight','','pièce',2554,2937,'CAD','2026-11-09'),
 ('hardieshingle-staggered','','pièce',2196,2525,'CAD','2026-11-09'),
 ('canexel-ridgewood-d5','','paquet de 4 planches',14148,16270,'CAD','2026-11-09'),
 ('canexel-vstyle','','paquet de 4 planches',15398,17707,'CAD','2026-11-09'),
 ('rialux-bosco','','pi²',440,506,'CAD','2026-11-09'),
 ('rialux-timberland-soffit','','pi²',720,828,'CAD','2026-11-09'),
 ('rialux-tiago','','pi²',722,830,'CAD','2026-11-09'),
 ('jdp-akta-306-antique','','pi²',721,829,'CAD','2026-11-09'),
 ('jdp-bluhouss-307','','pi²',774,890,'CAD','2026-11-09'),
 ('adseal-4580','','cartouche de 304 ml',973,1119,'CAD','2026-11-09'),
 ('canexel-touch-up-284ml','','contenant de 284 ml',3242,3728,'CAD','2026-11-09')
on conflict (item_id,format_id) do update set
 unit=excluded.unit, regional_average_cents=excluded.regional_average_cents,
 suggested_price_cents=excluded.suggested_price_cents, currency=excluded.currency,
 researched_on=excluded.researched_on;

create or replace function mir_core.boutique_price_history_immutable()
returns trigger language plpgsql security invoker set search_path=pg_catalog,mir_core as $$
begin raise exception 'Historique de prix immuable' using errcode='42501'; end $$;
drop trigger if exists boutique_price_history_immutable on mir_core.boutique_price_history;
create trigger boutique_price_history_immutable before update or delete on mir_core.boutique_price_history
for each row execute function mir_core.boutique_price_history_immutable();

create or replace function public.mir_public_boutique_prices()
returns jsonb language sql stable security definer set search_path=pg_catalog,mir_core as $$
 with cfg as (select organization_id from mir_core.account_settings where singleton),
 keys as (
   select item_id,format_id from mir_core.boutique_price_suggestions
   union select p.item_id,p.format_id from mir_core.boutique_prices p join cfg on cfg.organization_id=p.organization_id
 ), resolved as (
   select k.item_id,k.format_id,coalesce(p.state,case when s.item_id is null then 'on_request' else 'automatic' end) state,
     case when p.state='adjusted' then p.published_price_cents when p.state='on_request' then null else s.suggested_price_cents end amount_cents,
     coalesce(s.unit,'unité') unit
   from keys k left join mir_core.boutique_price_suggestions s using(item_id,format_id)
   left join cfg on true left join mir_core.boutique_prices p on p.organization_id=cfg.organization_id and (p.item_id,p.format_id)=(k.item_id,k.format_id)
 ) select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'formatId',nullif(format_id,''),'state',state,'amountCents',amount_cents,'currency','CAD','unit',unit) order by item_id,format_id),'[]'::jsonb) from resolved;
$$;

create or replace function public.mir_boutique_price_management(org uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,mir_core as $$
declare actor_role text; result jsonb;
begin
 actor_role:=mir_core.staff_role(org);
 if actor_role is null or actor_role not in ('assistant','boss','admin') then raise exception 'Accès Prix boutique refusé' using errcode='42501',detail='ACCESS_DENIED'; end if;
 with keys as (
   select item_id,format_id from mir_core.boutique_price_suggestions
   union select item_id,format_id from mir_core.boutique_prices where organization_id=org
 ), rows as (
   select k.item_id,k.format_id,coalesce(p.state,case when s.item_id is null then 'on_request' else 'automatic' end) state,
    s.unit,s.regional_average_cents,s.suggested_price_cents,
    case when p.state='adjusted' then p.published_price_cents when p.state='on_request' then null else s.suggested_price_cents end published_price_cents,
    p.updated_at,p.reason,
    coalesce((select jsonb_agg(h.x order by h.changed_at desc) from
      (select changed_at,jsonb_build_object('oldState',old_state,'oldPriceCents',old_price_cents,'newState',new_state,'newPriceCents',new_price_cents,'changedAt',changed_at,'changedBy',changed_by,'reason',reason) x
       from mir_core.boutique_price_history where organization_id=org and item_id=k.item_id and format_id=k.format_id order by changed_at desc limit 5) h),'[]'::jsonb) history
   from keys k left join mir_core.boutique_price_suggestions s using(item_id,format_id)
   left join mir_core.boutique_prices p on p.organization_id=org and (p.item_id,p.format_id)=(k.item_id,k.format_id)
 ) select jsonb_build_object('role',actor_role,'prices',coalesce(jsonb_agg(jsonb_build_object(
   'itemId',item_id,'formatId',nullif(format_id,''),'state',state,'unit',unit,'regionalAverageCents',regional_average_cents,
   'suggestedPriceCents',suggested_price_cents,'publishedPriceCents',published_price_cents,'updatedAt',updated_at,'reason',reason,'history',history
 ) order by item_id,format_id),'[]'::jsonb)) into result from rows;
 return result;
end $$;

create or replace function public.mir_boutique_price_action(org uuid,item text,format text,action text,new_price_cents integer default null,reason text default null)
returns jsonb language plpgsql volatile security definer set search_path=pg_catalog,mir_core as $$
declare uid uuid:=auth.uid(); actor_role text; fmt text:=coalesce(format,''); oldrow mir_core.boutique_prices; oldstate text; oldprice integer; nextstate text; nextprice integer;
begin
 if uid is null then raise exception 'Authentification requise' using errcode='42501'; end if;
 actor_role:=mir_core.staff_role(org,uid);
 if actor_role is null or actor_role not in ('assistant','boss','admin') then raise exception 'Modification de prix refusée' using errcode='42501',detail='ACCESS_DENIED'; end if;
 if item is null or item !~ '^[a-z0-9][a-z0-9._-]{0,99}$' or fmt !~ '^[a-zA-Z0-9._-]{0,99}$' then raise exception 'Article ou format invalide' using errcode='22023'; end if;
 if reason is not null and char_length(btrim(reason))>500 then raise exception 'Motif trop long' using errcode='22023'; end if;
 if action='adjust' then
   if new_price_cents is null or new_price_cents<1 or new_price_cents>10000000 then raise exception 'Le prix doit être compris entre 0,01 $ et 100 000 $' using errcode='22023'; end if;
   nextstate:='adjusted';nextprice:=new_price_cents;
 elsif action='restore' then
   if not exists(select 1 from mir_core.boutique_price_suggestions s where (s.item_id,s.format_id)=(item,fmt)) then raise exception 'Aucun prix suggéré pour cet article' using errcode='22023'; end if;
   nextstate:='automatic';nextprice:=null;
 elsif action='on_request' then nextstate:='on_request';nextprice:=null;
 else raise exception 'Action de prix invalide' using errcode='22023'; end if;
 select * into oldrow from mir_core.boutique_prices p where p.organization_id=org and (p.item_id,p.format_id)=(item,fmt) for update;
 oldstate:=coalesce(oldrow.state,case when exists(select 1 from mir_core.boutique_price_suggestions s where (s.item_id,s.format_id)=(item,fmt)) then 'automatic' else 'on_request' end);
 oldprice:=case when oldstate='adjusted' then oldrow.published_price_cents when oldstate='automatic' then (select s.suggested_price_cents from mir_core.boutique_price_suggestions s where (s.item_id,s.format_id)=(item,fmt)) else null end;
 insert into mir_core.boutique_prices(organization_id,item_id,format_id,state,published_price_cents,updated_by,updated_at,reason)
 values(org,item,fmt,nextstate,nextprice,uid,now(),nullif(btrim(reason),''))
 on conflict(organization_id,item_id,format_id) do update set state=excluded.state,published_price_cents=excluded.published_price_cents,updated_by=excluded.updated_by,updated_at=excluded.updated_at,reason=excluded.reason;
 insert into mir_core.boutique_price_history(organization_id,item_id,format_id,old_state,old_price_cents,new_state,new_price_cents,changed_by,reason)
 values(org,item,fmt,oldstate,oldprice,nextstate,case when nextstate='automatic' then (select s.suggested_price_cents from mir_core.boutique_price_suggestions s where (s.item_id,s.format_id)=(item,fmt)) else nextprice end,uid,nullif(btrim(reason),''));
 return jsonb_build_object('ok',true,'itemId',item,'formatId',nullif(fmt,''),'state',nextstate,'amountCents',case when nextstate='automatic' then (select s.suggested_price_cents from mir_core.boutique_price_suggestions s where (s.item_id,s.format_id)=(item,fmt)) else nextprice end);
end $$;

revoke all on function public.mir_public_boutique_prices() from public;
revoke all on function public.mir_boutique_price_management(uuid) from public;
revoke all on function public.mir_boutique_price_action(uuid,text,text,text,integer,text) from public;
revoke all on function public.mir_boutique_price_management(uuid) from anon;
revoke all on function public.mir_boutique_price_action(uuid,text,text,text,integer,text) from anon;
revoke all on function mir_core.boutique_price_history_immutable() from public,anon,authenticated;
grant execute on function public.mir_public_boutique_prices() to anon,authenticated;
grant execute on function public.mir_boutique_price_management(uuid) to authenticated;
grant execute on function public.mir_boutique_price_action(uuid,text,text,text,integer,text) to authenticated;
