-- ════════════════════════════════════════════════════════════════
-- StrayPaw, ward-level density.
--
-- WHAT THIS IS FOR
--
-- A pin per animal answers "is there a dog here". It does not answer the
-- question an NGO, a corporation or a ward officer actually asks, which is
-- "how many, over what area, and how much of that area has anybody
-- checked". That question needs a denominator, and the denominator is the
-- ward.
--
-- So boundaries go in the database, animals are counted inside them by
-- PostGIS, and the map shades wards rather than scattering dots.
--
-- THE RULE THAT MATTERS MOST
--
-- A ward with no records is NOT a ward with no dogs. It is a ward nobody
-- has surveyed. Those are opposite findings and a choropleth that paints
-- both of them the palest colour is lying to whoever reads it — usually in
-- the direction of "this area is fine", which is the most expensive
-- direction to be wrong in.
--
-- Every function here returns `surveyed` alongside the counts, and returns
-- null rather than 0 for rates that have no denominator.
--
-- WHY THIS FILE REBUILDS RATHER THAN MIGRATES
--
-- Earlier versions tried to carry an existing `wards` table forward with
-- alters, and failed four separate ways: create-table-if-not-exists is a
-- no-op on an existing table, create-or-replace cannot change a function's
-- return type, adding an argument makes an overload instead of a
-- replacement, and a half-applied run leaves a shape no alter script
-- predicted.
--
-- None of that was worth defending, because this table holds no original
-- data. Every row in it is imported from a published boundary file that is
-- checked into this repository. So the table and its functions are dropped
-- and rebuilt from nothing on every run. There is exactly one code path,
-- it does not depend on what was here before, and it cannot half-apply.
--
-- Cost: the boundary loaders have to run again afterwards. They are in
-- this same directory and take a minute.
--
-- Safe to run any number of times, from any starting state.
-- Depends on: RUN-ALL-MIGRATIONS.sql (dogs).
-- ════════════════════════════════════════════════════════════════

create extension if not exists postgis;

-- ── 0. Demolition ───────────────────────────────────────────────────
--
-- Every ward_* function goes, whatever arguments it was declared with.
-- Naming the signatures explicitly is what broke the last two attempts:
-- a signature you did not predict survives, and then a two-argument call
-- is ambiguous against the one-argument leftover. pg_proc knows them all.

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('ward_area_km2', 'ward_at', 'ward_density',
                         'ward_density_geojson', 'ward_coverage', 'ward_cities')
  loop
    execute format('drop function if exists %s cascade', fn.sig);
  end loop;
end $$;

drop table if exists wards cascade;

-- ── 1. Boundaries ───────────────────────────────────────────────────
--
-- Provenance is a column, not a README. This data is going to be quoted
-- back at a municipality one day, and "where did you get these boundaries"
-- has to have an answer that survives the person who loaded them leaving.

create table wards (
  id          uuid primary key default gen_random_uuid(),
  -- 'district' covers all of India at 641 polygons and is what the national
  -- view reads; 'ward' is the municipal tier a city pilot works in. One
  -- table because the counting is identical and only the polygon changes.
  level       text not null default 'ward' check (level in ('district', 'ward')),
  city        text not null,
  state       text,
  ward_no     text not null,
  ward_name   text,
  zone_name   text,
  geom        geometry(MultiPolygon, 4326) not null,
  source_name text not null,
  source_url  text not null,
  licence     text not null,
  loaded_at   timestamptz not null default now(),
  unique (level, city, ward_no)
);

create index wards_geom_idx on wards using gist (geom);
create index wards_city_idx on wards (level, city);

-- Area is derived, never entered. Cast to geography so it is real square
-- kilometres on the spheroid rather than degrees squared, which is the
-- mistake that makes northern wards look smaller than southern ones.
create function ward_area_km2(g geometry)
returns numeric language sql immutable parallel safe as $$
  select round((st_area(g::geography) / 1000000.0)::numeric, 4);
$$;

alter table wards enable row level security;

-- Boundaries are public reference data. Anyone may read them; only the
-- service role loads them.
drop policy if exists wards_read on wards;
create policy wards_read on wards for select using (true);

grant select on wards to anon, authenticated, service_role;

-- ── 2. Which ward is a point in ─────────────────────────────────────

create function ward_at(
  p_lat double precision, p_lng double precision, p_level text default 'ward'
) returns uuid language sql stable parallel safe as $$
  select w.id
    from wards w
   where w.level = p_level
     and st_contains(w.geom, st_setsrid(st_point(p_lng, p_lat), 4326))
   limit 1;
$$;

-- ── 3. The density itself ───────────────────────────────────────────
--
-- One row per ward, whether or not anything has been recorded in it, which
-- is the whole point: the empty ones are the finding.
--
-- Sterilisation is read from dogs.sterilisation_status, not dogs.sterilised.
-- The boolean cannot hold "nobody checked": abc-programme.sql keeps it in
-- step with the three-valued column by writing false for both "checked, not
-- sterilised" and "never examined". Counting the boolean therefore reports
-- every unexamined animal as a confirmed negative, which is the exact error
-- the rest of this file exists to prevent. The coalesce below is the same
-- reading abc-programme.sql uses when it backfills: a true boolean is a
-- positive record, a false one was only ever the column default.

create function ward_density(p_city text default null, p_level text default 'ward')
returns table (
  ward_id            uuid,
  city               text,
  ward_no            text,
  ward_name          text,
  zone_name          text,
  area_km2           numeric,
  animals            bigint,
  per_km2            numeric,
  sterilised         bigint,
  not_sterilised     bigint,
  sterilised_unknown bigint,
  vaccinated         bigint,
  needs_help         bigint,
  ster_pct_of_known  numeric,
  ster_pct_of_all    numeric,
  last_seen          timestamptz,
  surveyed           boolean
)
language sql stable parallel safe as $$
  with w as (
    select id, city, ward_no, ward_name, zone_name, geom,
           ward_area_km2(geom) as area_km2
      from wards
     -- Null region means the whole country at this level, which is what
     -- the national map asks for: all 641 districts in one payload.
     where wards.level = p_level
       and (p_city is null or wards.city = p_city)
  ),
  inside as (
    select w.id as ward_id,
           d.id as dog_id,
           coalesce(d.sterilisation_status,
                    case when d.sterilised then 'sterilised' else 'unknown' end)
             as ster,
           coalesce(d.vaccination_status,
                    case when d.vaccinated then 'vaccinated' else 'unknown' end)
             as vacc,
           d.needs_help,
           d.last_seen
      from w
      left join dogs d
        on d.lat is not null and d.lng is not null
       and st_contains(w.geom, st_setsrid(st_point(d.lng, d.lat), 4326))
  ),
  counted as (
    select ward_id,
           count(dog_id)                                        as animals,
           count(*) filter (where ster = 'sterilised')           as sterilised,
           count(*) filter (where ster = 'not_sterilised')       as not_sterilised,
           -- dog_id is not null guards the left join: without it every ward
           -- with no animals contributes its own empty row to "unknown",
           -- and 198 empty wards read as 198 unchecked animals.
           count(*) filter (where dog_id is not null
                              and ster not in ('sterilised', 'not_sterilised'))
                                                                 as sterilised_unknown,
           count(*) filter (where vacc = 'vaccinated')           as vaccinated,
           count(*) filter (where needs_help is true)            as needs_help,
           -- dogs carries last_seen, not updated_at.
           max(last_seen)                                        as last_seen
      from inside
     group by ward_id
  )
  select w.id, w.city, w.ward_no, w.ward_name, w.zone_name, w.area_km2,
         c.animals,
         -- Density is meaningless without observations, so it is null, not
         -- zero, until there are some.
         case when c.animals > 0 and w.area_km2 > 0
              then round((c.animals / w.area_km2)::numeric, 2) end as per_km2,
         c.sterilised, c.not_sterilised, c.sterilised_unknown,
         c.vaccinated, c.needs_help,
         -- Of the animals somebody actually checked. The honest numerator.
         case when (c.sterilised + c.not_sterilised) > 0
              then round(100.0 * c.sterilised / (c.sterilised + c.not_sterilised), 1) end,
         -- Of every animal on record, unknowns counted against. Shown beside
         -- the first so an unchecked ward cannot masquerade as a covered one.
         case when c.animals > 0
              then round(100.0 * c.sterilised / c.animals, 1) end,
         c.last_seen,
         c.animals > 0 as surveyed
    from w
    join counted c on c.ward_id = w.id
   order by w.ward_no;
$$;

grant execute on function ward_density(text, text) to anon, authenticated, service_role;
grant execute on function ward_at(double precision, double precision, text) to anon, authenticated, service_role;

-- ── 4. The map's payload ────────────────────────────────────────────
--
-- Geometry and numbers in one GeoJSON FeatureCollection, so the map makes a
-- single request and MapLibre can hand the whole thing to the GPU. Built in
-- the database rather than stitched together in the browser, because
-- joining 641 polygons to 641 rows client-side is work done once here and
-- once per visitor there.

create function ward_density_geojson(p_city text default null, p_level text default 'ward')
returns json language sql stable as $$
  -- row_number is computed in the subquery: a window function cannot be
  -- called inside an aggregate, and MapLibre needs a stable integer feature
  -- id per ward for hover and click state.
  select json_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(json_agg(f.feature), '[]'::json)
  )
    from (
      select json_build_object(
        'type', 'Feature',
        'id', row_number() over (order by d.ward_no),
        'geometry', st_asgeojson(w.geom)::json,
        'properties', json_build_object(
          'ward_id',   d.ward_id,
          'ward_no',   d.ward_no,
          'ward_name', d.ward_name,
          'zone_name', d.zone_name,
          'area_km2',  d.area_km2,
          'animals',   d.animals,
          'per_km2',   d.per_km2,
          'sterilised', d.sterilised,
          'not_sterilised', d.not_sterilised,
          'sterilised_unknown', d.sterilised_unknown,
          'vaccinated', d.vaccinated,
          'needs_help', d.needs_help,
          'ster_pct_of_known', d.ster_pct_of_known,
          'ster_pct_of_all', d.ster_pct_of_all,
          'surveyed',  d.surveyed
        )
      ) as feature
        from ward_density(p_city, p_level) d
        join wards w on w.id = d.ward_id
    ) f;
$$;

grant execute on function ward_density_geojson(text, text) to anon, authenticated, service_role;

-- ── 5. The headline a funder reads ──────────────────────────────────
--
-- Coverage first, because "we have surveyed 34 of 200 wards" is the honest
-- opening line and every rate below it is conditional on that number.

create function ward_coverage(p_city text default null, p_level text default 'ward')
returns json language sql stable as $$
  select json_build_object(
    'city', coalesce(p_city, 'India'),
    'wards_total', count(*),
    'wards_surveyed', count(*) filter (where surveyed),
    'wards_unsurveyed', count(*) filter (where not surveyed),
    'pct_wards_surveyed',
      case when count(*) > 0
           then round(100.0 * count(*) filter (where surveyed) / count(*), 1) end,
    'animals', coalesce(sum(animals), 0),
    'area_km2_total', round(coalesce(sum(area_km2), 0), 1),
    'area_km2_surveyed', round(coalesce(sum(area_km2) filter (where surveyed), 0), 1),
    'sterilised', coalesce(sum(sterilised), 0),
    'not_sterilised', coalesce(sum(not_sterilised), 0),
    'sterilised_unknown', coalesce(sum(sterilised_unknown), 0),
    'ster_pct_of_known',
      case when coalesce(sum(sterilised) + sum(not_sterilised), 0) > 0
           then round(100.0 * sum(sterilised) / (sum(sterilised) + sum(not_sterilised)), 1) end,
    'ster_pct_of_all',
      case when coalesce(sum(animals), 0) > 0
           then round(100.0 * sum(sterilised) / sum(animals), 1) end,
    -- Named so a report can cite the boundaries it was drawn against.
    'boundary_source', (select min(source_name) from wards where level = p_level and (p_city is null or city = p_city)),
    'boundary_source_url', (select min(source_url) from wards where level = p_level and (p_city is null or city = p_city)),
    'boundary_licence', (select min(licence) from wards where level = p_level and (p_city is null or city = p_city))
  )
    from ward_density(p_city, p_level);
$$;

grant execute on function ward_coverage(text, text) to anon, authenticated, service_role;

-- ── 6. Cities that have boundaries loaded ───────────────────────────

create function ward_cities()
returns table (level text, city text, wards bigint)
language sql stable as $$
  select level, city, count(*) from wards group by level, city order by level, city;
$$;

grant execute on function ward_cities() to anon, authenticated, service_role;

-- ── 7. Say what just happened ───────────────────────────────────────
--
-- The last result in the editor is the one you see, so this file ends by
-- telling you what state it left behind and what to run next, rather than
-- finishing silently and leaving you to guess.

select
  'ward-density installed'                                       as step,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'ward\_%')      as functions_expect_6,
  (select count(*) from wards where level = 'district')          as districts_load_next,
  (select count(*) from wards where level = 'ward')              as city_wards_load_next,
  'now run districts-india-1of5.sql .. -5of5.sql, then wards-chennai.sql' as next;
