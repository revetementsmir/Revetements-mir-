begin;

-- Public storefront rates only, for the single organization selected by MIR.
-- No caller-provided organization, customer data, or write access.
create function public.mir_public_bend_tariff() returns jsonb
language sql stable security definer set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'area_rate', tariff.value->'area_rate',
    'bend_cents', tariff.value->'bend_cents',
    'aluminum_basis_points', tariff.value->'aluminum_basis_points',
    'revision', tariff.value->'revision'
  )
  from mir_core.account_settings as settings
  cross join lateral (select mir_core.boutique_bend_tariff(settings.organization_id) as value) as tariff
  where settings.singleton;
$$;

revoke all on function public.mir_public_bend_tariff() from public, anon, authenticated;
grant execute on function public.mir_public_bend_tariff() to anon, authenticated;

commit;
