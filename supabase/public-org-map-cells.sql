-- Public, privacy-preserving spatial summary for NGO widgets and public pages.
-- Coordinates come only from public_animal_profiles, which already rounds positions
-- to 0.01 degrees and strips private operational fields.

create or replace view public.public_org_map_cells
with (security_invoker = true)
as
select
  ngo_id,
  lat,
  lng,
  count(*)::integer as records
from public.public_animal_profiles
where ngo_id is not null
  and lat is not null
  and lng is not null
group by ngo_id, lat, lng;

grant select on public.public_org_map_cells to anon, authenticated;

comment on view public.public_org_map_cells is
  'Aggregated public-safe NGO map cells derived from coarse public animal positions.';
