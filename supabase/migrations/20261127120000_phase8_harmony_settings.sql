-- Phase 8 — Apparence et réglages Harmony. Additif, rejouable, sans transport externe.
begin;

do $$ begin
 if to_regclass('mir_core.notification_preferences') is null or to_regclass('mir_core.memberships') is null then
  raise exception 'Phase 7 et membres MIR requis';
 end if;
end $$;

create table if not exists mir_core.harmony_preferences(
 organization_id uuid not null,
 user_id uuid not null,
 theme text not null default 'system' check(theme in('light','dark','system')),
 text_size text not null default 'standard' check(text_size in('standard','large')),
 reduced_motion text not null default 'auto' check(reduced_motion in('auto','on')),
 high_contrast boolean not null default false,
 date_locale text not null default 'fr-CA' check(date_locale='fr-CA'),
 updated_at timestamptz not null default now(),
 primary key(organization_id,user_id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id) on delete cascade
);

create table if not exists mir_core.harmony_preference_receipts(
 organization_id uuid not null,
 user_id uuid not null,
 request_id uuid not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id,request_id),
 foreign key(organization_id,user_id) references mir_core.memberships(organization_id,user_id) on delete cascade
);

alter table mir_core.harmony_preferences enable row level security;
alter table mir_core.harmony_preference_receipts enable row level security;
revoke all on mir_core.harmony_preferences,mir_core.harmony_preference_receipts from public,anon,authenticated;

drop policy if exists harmony_preferences_own_read on mir_core.harmony_preferences;
create policy harmony_preferences_own_read on mir_core.harmony_preferences for select to authenticated
 using((select auth.uid()) is not null and user_id=(select auth.uid()) and exists(
  select 1 from mir_core.memberships m where(m.organization_id,m.user_id)=(harmony_preferences.organization_id,(select auth.uid())) and m.active
 ));

create or replace function mir_core.harmony_categories(role_name text) returns text[]
language sql immutable set search_path=pg_catalog as $$
 select case role_name
  when 'entrepot_livraison' then array['orders','inventory']
  when 'chef_equipe' then array['orders','absences','punch','jobs','chat']
  when 'employe_chantier' then array['orders','expenses','absences','punch','jobs','chat','support']
  when 'adjointe' then array['orders','expenses','absences','punch','jobs','chat','support']
  when 'boss' then array['orders','expenses','absences','punch','jobs','chat','support','inventory']
  when 'admin' then array['orders','expenses','absences','punch','jobs','chat','support','inventory']
  else array[]::text[] end
$$;

create or replace function public.mir_harmony_settings(org uuid,request_id uuid default null,changes jsonb default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,mir_core as $$
declare
 uid uuid:=auth.uid(); role_name text; p mir_core.harmony_preferences; allowed text[]; entry record;
 payload jsonb:=coalesce(changes,'{}'::jsonb); old_payload jsonb; reset_all boolean:=false;
begin
 select mir_core.operational_role(org,uid) into role_name;
 if uid is null or role_name is null then raise exception 'Réglages refusés' using errcode='42501';end if;
 if exists(select 1 from mir_core.memberships m where(m.organization_id,m.user_id,m.role,m.active)=(org,uid,'admin',true)) then role_name:='admin';end if;
 allowed:=mir_core.harmony_categories(role_name);
 if changes is not null then
  if jsonb_typeof(changes)<>'object' or request_id is null or exists(select 1 from jsonb_object_keys(changes) k where k not in('theme','textSize','reducedMotion','highContrast','dateLocale','notifications','reset')) then
   raise exception 'Réglages invalides' using errcode='22023';
  end if;
  reset_all:=coalesce((changes->>'reset')::boolean,false);
  if changes ? 'theme' and changes->>'theme' not in('light','dark','system') then raise exception 'Thème invalide' using errcode='22023';end if;
  if changes ? 'textSize' and changes->>'textSize' not in('standard','large') then raise exception 'Taille invalide' using errcode='22023';end if;
  if changes ? 'reducedMotion' and changes->>'reducedMotion' not in('auto','on') then raise exception 'Mouvement invalide' using errcode='22023';end if;
  if changes ? 'highContrast' and jsonb_typeof(changes->'highContrast')<>'boolean' then raise exception 'Contraste invalide' using errcode='22023';end if;
  if changes ? 'dateLocale' and changes->>'dateLocale'<>'fr-CA' then raise exception 'Format régional invalide' using errcode='22023';end if;
  if changes ? 'notifications' and jsonb_typeof(changes->'notifications')<>'object' then raise exception 'Notifications invalides' using errcode='22023';end if;
  select r.payload into old_payload from mir_core.harmony_preference_receipts r where(r.organization_id,r.user_id,r.request_id)=(org,uid,$2);
  if old_payload is not null and old_payload<>payload then raise exception 'Référence déjà utilisée' using errcode='23505';end if;
  if old_payload is null then
   insert into mir_core.harmony_preferences(organization_id,user_id,theme,text_size,reduced_motion,high_contrast,date_locale)
   values(org,uid,case when reset_all then 'system' else coalesce(changes->>'theme','system') end,case when reset_all then 'standard' else coalesce(changes->>'textSize','standard') end,case when reset_all then 'auto' else coalesce(changes->>'reducedMotion','auto') end,case when reset_all then false else coalesce((changes->>'highContrast')::boolean,false) end,'fr-CA')
   on conflict(organization_id,user_id) do update set
    theme=case when reset_all then 'system' else coalesce(changes->>'theme',harmony_preferences.theme) end,
    text_size=case when reset_all then 'standard' else coalesce(changes->>'textSize',harmony_preferences.text_size) end,
    reduced_motion=case when reset_all then 'auto' else coalesce(changes->>'reducedMotion',harmony_preferences.reduced_motion) end,
    high_contrast=case when reset_all then false else coalesce((changes->>'highContrast')::boolean,harmony_preferences.high_contrast) end,
    date_locale='fr-CA',updated_at=now();
   if reset_all then
    delete from mir_core.notification_preferences where organization_id=org and user_id=uid and category=any(allowed);
   elsif changes ? 'notifications' then
    for entry in select key,value from jsonb_each(changes->'notifications') loop
     if not(entry.key=any(allowed)) or jsonb_typeof(entry.value)<>'boolean' then raise exception 'Catégorie interdite' using errcode='42501';end if;
     insert into mir_core.notification_preferences(organization_id,user_id,category,enabled) values(org,uid,entry.key,(entry.value::text)::boolean)
     on conflict(organization_id,user_id,category) do update set enabled=excluded.enabled,updated_at=now();
    end loop;
   end if;
   insert into mir_core.harmony_preference_receipts(organization_id,user_id,request_id,payload) values(org,uid,$2,payload);
  end if;
 end if;
 insert into mir_core.harmony_preferences(organization_id,user_id) values(org,uid) on conflict do nothing;
 select * into p from mir_core.harmony_preferences where(organization_id,user_id)=(org,uid);
 return jsonb_build_object(
  'role',role_name,'theme',p.theme,'textSize',p.text_size,'reducedMotion',p.reduced_motion,'highContrast',p.high_contrast,'dateLocale',p.date_locale,'updatedAt',p.updated_at,
  'notifications',(select coalesce(jsonb_object_agg(c,coalesce(np.enabled,true)),'{}'::jsonb) from unnest(allowed)c left join mir_core.notification_preferences np on(np.organization_id,np.user_id,np.category)=(org,uid,c)),
  'applicable',to_jsonb(allowed),'mandatory',jsonb_build_array('urgent','action_required'),'email',false,'sms',false,'push',false,'realtime',false
 );
end $$;

revoke all on function mir_core.harmony_categories(text),public.mir_harmony_settings(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mir_harmony_settings(uuid,uuid,jsonb) to authenticated;
comment on table mir_core.harmony_preferences is 'Phase 8: apparence et accessibilité Harmony par organisation et utilisateur; aucune préférence de transport.';
comment on function public.mir_harmony_settings(uuid,uuid,jsonb) is 'Phase 8: lecture/écriture idempotente des réglages propres à auth.uid(); réutilise les préférences Phase 7.';
commit;
