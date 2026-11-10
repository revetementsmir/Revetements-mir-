-- MIR Prompt 2 phase 1: per-account appearance preferences.
-- Additive foundation only; no production deployment in this commit.
begin;

create table mir_core.user_appearance_preferences(
  organization_id uuid not null,
  user_id uuid not null,
  theme text not null default 'automatic'
    check(theme in ('automatic','mir_light','mir_dark','jobsite_high_visibility')),
  accent text not null default 'mir_green'
    check(accent in ('mir_green','blue','orange','graphite')),
  text_scale numeric(3,2) not null default 1.00
    check(text_scale between 0.80 and 1.50),
  high_contrast boolean not null default false,
  reduced_motion boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(organization_id,user_id),
  foreign key(organization_id,user_id)
    references mir_core.memberships(organization_id,user_id)
);

alter table mir_core.user_appearance_preferences enable row level security;
revoke all on mir_core.user_appearance_preferences from public,anon,authenticated;

create function public.mir_my_appearance(org uuid)
returns jsonb
language plpgsql stable security definer
set search_path=pg_catalog,mir_core
as $$
declare result jsonb;
begin
  if not exists(
    select 1 from mir_core.memberships m
    where m.organization_id=org and m.user_id=auth.uid() and m.active
  ) then
    raise exception 'Accès MIR inactif' using errcode='42501';
  end if;

  select jsonb_build_object(
    'theme',p.theme,
    'accent',p.accent,
    'textScale',p.text_scale,
    'highContrast',p.high_contrast,
    'reducedMotion',p.reduced_motion,
    'updatedAt',p.updated_at
  ) into result
  from mir_core.user_appearance_preferences p
  where p.organization_id=org and p.user_id=auth.uid();

  return coalesce(result,jsonb_build_object(
    'theme','automatic',
    'accent','mir_green',
    'textScale',1.00,
    'highContrast',false,
    'reducedMotion',false,
    'updatedAt',null
  ));
end;
$$;

create function public.mir_save_appearance(org uuid,payload jsonb)
returns jsonb
language plpgsql security definer
set search_path=pg_catalog,mir_core
as $$
declare
  selected_theme text:=coalesce(payload->>'theme','automatic');
  selected_accent text:=coalesce(payload->>'accent','mir_green');
  selected_scale numeric:=coalesce((payload->>'textScale')::numeric,1.00);
  selected_contrast boolean:=coalesce((payload->>'highContrast')::boolean,false);
  selected_motion boolean:=coalesce((payload->>'reducedMotion')::boolean,false);
begin
  if not exists(
    select 1 from mir_core.memberships m
    where m.organization_id=org and m.user_id=auth.uid() and m.active
  ) then
    raise exception 'Accès MIR inactif' using errcode='42501';
  end if;
  if selected_theme not in ('automatic','mir_light','mir_dark','jobsite_high_visibility') then
    raise exception 'Thème MIR invalide' using errcode='22023';
  end if;
  if selected_accent not in ('mir_green','blue','orange','graphite') then
    raise exception 'Accent MIR invalide' using errcode='22023';
  end if;
  if selected_scale not between 0.80 and 1.50 then
    raise exception 'Taille de texte invalide' using errcode='22023';
  end if;

  insert into mir_core.user_appearance_preferences(
    organization_id,user_id,theme,accent,text_scale,high_contrast,reduced_motion,updated_at
  ) values(
    org,auth.uid(),selected_theme,selected_accent,selected_scale,
    selected_contrast,selected_motion,now()
  )
  on conflict(organization_id,user_id) do update set
    theme=excluded.theme,
    accent=excluded.accent,
    text_scale=excluded.text_scale,
    high_contrast=excluded.high_contrast,
    reduced_motion=excluded.reduced_motion,
    updated_at=now();

  return public.mir_my_appearance(org);
end;
$$;

revoke all on function public.mir_my_appearance(uuid) from public,anon;
revoke all on function public.mir_save_appearance(uuid,jsonb) from public,anon;
grant execute on function public.mir_my_appearance(uuid) to authenticated;
grant execute on function public.mir_save_appearance(uuid,jsonb) to authenticated;

commit;
