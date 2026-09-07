-- ════════════════════════════════════════════════════════════════
-- StrayPaw, searching the map and fencing it to India.
--
-- TWO JOBS, ONE FILE, BECAUSE BOTH NEED THE BOUNDARIES
--
-- 1. A search that answers "take me to Adyar", "take me to ward 172",
--    "take me to Thanjavur district". The boundaries are already in the
--    database; without this they are only ever drawn, never looked up.
--
-- 2. A mask that dims everything outside India. maxBounds fences the
--    camera, but a rectangle around India necessarily contains parts of
--    Pakistan, Nepal and Myanmar, and a map of India that opens showing
--    another country's territory undimmed is not a map of India.
--
-- WHY THE MASK IS COMPUTED HERE AND NOT IN THE BROWSER
--
-- The national outline is a union of all 641 district polygons: about
-- 19,000 vertices and 300 KB of GeoJSON even after simplification. That is
-- not something to ship in a JavaScript bundle, and "everything except
-- India" is a polygon difference, which is PostGIS's job rather than the
-- browser's.
--
-- It is cached, because ST_Union over 641 polygons takes seconds. But the
-- cache rebuilds itself whenever the boundaries underneath it change, so
-- this file can be run before or after the boundary loaders and is right
-- either way. Ordering assumptions are what broke every previous migration
-- on this project.
--
-- ADDITIVE. Creates one small table and three functions. Touches no
-- existing table, drops nothing, and needs no boundary reload.
-- Depends on: ward-density.sql (wards).
-- ════════════════════════════════════════════════════════════════

-- ── 1. Somewhere to keep a derived shape ────────────────────────────

create table if not exists map_shapes (
  key        text primary key,
  geojson    json not null,
  -- The high-water mark of wards.loaded_at at the moment this was built.
  -- Comparing against it is what makes the cache self-healing.
  source_at  timestamptz not null,
  built_at   timestamptz not null default now()
);

alter table map_shapes enable row level security;
drop policy if exists map_shapes_read on map_shapes;
create policy map_shapes_read on map_shapes for select using (true);
grant select on map_shapes to anon, authenticated, service_role;

-- ── 2. Everything that is not India ─────────────────────────────────

drop function if exists india_mask();
drop function if exists rebuild_india_mask();

-- A rectangle a little larger than the camera can ever reach, minus the
-- country. Filling this dims the neighbours without hiding them, which is
-- the honest treatment: they are still there, they are just not ours to
-- report on.
-- security definer, because the read path below writes the cache and the
-- people reading the map are anon. They get select on map_shapes and
-- nothing else; the insert happens as the owner, inside this function, and
-- writes one derived row that is computed entirely from data the caller can
-- already read. search_path is pinned so a definer function cannot be
-- pointed at somebody else's tables.
create function rebuild_india_mask() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_geom  geometry;
  v_json  json;
  v_at    timestamptz;
begin
  select max(loaded_at) into v_at from wards where level = 'district';
  if v_at is null then
    -- No districts loaded, so there is no outline to cut out. An empty
    -- collection dims nothing, which is the right answer for "we do not
    -- know where India is yet" — better than dimming the whole map.
    return json_build_object('type', 'FeatureCollection', 'features', '[]'::json);
  end if;

  select st_union(geom) into v_geom from wards where level = 'district';

  -- Two things happen here, and the order matters.
  --
  -- Rings under a square kilometre are artefacts: slivers left where two
  -- district boundaries in the source data do not quite meet. Keeping them
  -- would punch pinholes of undimmed map into the sea. Real islands are far
  -- larger — the smallest inhabited Lakshadweep island is about 4 km².
  --
  -- And only the OUTER ring of each polygon is kept. The union of 641
  -- districts contains some four thousand interior gaps, again where
  -- neighbouring boundaries disagree by metres. Subtracting a shape full of
  -- holes from the envelope turns every one of those holes into its own
  -- dimmed patch, so the first working version of this scattered four
  -- thousand grey specks across the middle of the country. Dropping inner
  -- rings also fills lakes, which a dimming layer should do anyway.
  select st_makevalid(st_union(st_makepolygon(st_exteriorring(p)))) into v_geom
    from (select (st_dump(v_geom)).geom p) d
   where st_area(p::geography) / 1e6 >= 1.0;

  -- No simplification. Once the slivers and inner rings are gone the outline
  -- is under six thousand points, and simplifying at any useful tolerance
  -- deletes whole islands — ST_SimplifyPreserveTopology drops a polygon
  -- smaller than its tolerance rather than keeping a coarse version of it,
  -- which quietly removed most of the Andamans.
  v_geom := st_makevalid(
    st_difference(st_makeenvelope(58, -2, 108, 44, 4326), v_geom)
  );

  -- makevalid can hand back a collection containing stray lines where the
  -- coastline touched itself. Only the polygons are the mask.
  v_geom := st_collectionextract(v_geom, 3);

  select json_build_object(
    'type', 'FeatureCollection',
    'features', json_build_array(json_build_object(
      'type', 'Feature',
      'properties', json_build_object(),
      -- Five decimals. Three would be plenty for a dimming layer and
      -- twenty per cent smaller, but rounding that hard pulls
      -- near-coincident coastline vertices onto each other and the
      -- polygon stops being valid — MapLibre then tears holes in it while
      -- triangulating. 115 KB, well under 40 KB over the wire once
      -- compressed, is the cheaper mistake.
      'geometry', st_asgeojson(v_geom, 5)::json
    ))
  ) into v_json;

  insert into map_shapes (key, geojson, source_at, built_at)
       values ('india_mask', v_json, v_at, now())
  on conflict (key) do update
     set geojson = excluded.geojson,
         source_at = excluded.source_at,
         built_at = now();

  return v_json;
end $$;

-- The read path. Rebuilds only when the boundaries have moved under it, so
-- this file may be run before or after the loaders without anybody having
-- to remember which.
create function india_mask() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_cached json;
  v_cached_at timestamptz;
  v_now timestamptz;
begin
  select max(loaded_at) into v_now from wards where level = 'district';
  select geojson, source_at into v_cached, v_cached_at
    from map_shapes where key = 'india_mask';

  if v_cached is not null and v_cached_at is not distinct from v_now then
    return v_cached;
  end if;
  return rebuild_india_mask();
end $$;

-- Rebuilding is a multi-second union over 641 polygons. Supabase grants
-- EXECUTE on new functions to anon by default, so revoking from public is
-- not enough on its own — an unauthenticated caller could otherwise run
-- that union as often as it liked. The read path calls it internally as the
-- owner, which is the only way it should ever be reached.
revoke all on function rebuild_india_mask() from public, anon, authenticated;
grant execute on function india_mask() to anon, authenticated, service_role;

-- ── 3. Finding a place by name ──────────────────────────────────────

drop function if exists place_search(text, integer);

-- Wards, then districts. A ward is the more specific answer and the one
-- somebody typing a locality name usually means; a district is the right
-- answer when they type a district name.
--
-- Returns a point guaranteed to be inside the shape (a centroid can fall
-- outside a crescent-shaped ward) plus the bounding box, so the caller can
-- frame the whole area rather than dropping a pin in the middle of it.
create function place_search(p_q text, p_limit integer default 8)
returns table (
  level     text,
  city      text,
  state     text,
  ward_no   text,
  ward_name text,
  zone_name text,
  lat       double precision,
  lng       double precision,
  min_lng   double precision,
  min_lat   double precision,
  max_lng   double precision,
  max_lat   double precision,
  animals   bigint
)
language sql stable as $$
  with q as (select btrim(coalesce(p_q, '')) as t),
  hit as (
    select w.*,
           st_pointonsurface(w.geom) as pt,
           st_envelope(w.geom)       as env,
           /* Prefix beats contained, and a name beats a number: typing
              "12" should not put ward 120 above ward 12. */
           case
             when lower(coalesce(w.ward_name, '')) = lower((select t from q)) then 0
             when lower(coalesce(w.ward_name, '')) like lower((select t from q)) || '%' then 1
             when w.ward_no = (select t from q) then 2
             when lower(coalesce(w.ward_name, '')) like '%' || lower((select t from q)) || '%' then 3
             when lower(w.city) like lower((select t from q)) || '%' then 4
             else 5
           end as rank
      from wards w, q
     where length(q.t) >= 2
       and (
            coalesce(w.ward_name, '') ilike '%' || q.t || '%'
         or w.ward_no = q.t
         or w.city    ilike q.t || '%'
         or coalesce(w.state, '') ilike q.t || '%'
         or coalesce(w.zone_name, '') ilike '%' || q.t || '%'
       )
  ),
  counted as (
    select h.id,
           count(d.id) as animals
      from hit h
      left join dogs d
        on d.lat is not null and d.lng is not null
       and st_contains(h.geom, st_setsrid(st_point(d.lng, d.lat), 4326))
     group by h.id
  )
  select h.level, h.city, h.state, h.ward_no, h.ward_name, h.zone_name,
         st_y(h.pt), st_x(h.pt),
         st_xmin(h.env), st_ymin(h.env), st_xmax(h.env), st_ymax(h.env),
         c.animals
    from hit h
    join counted c on c.id = h.id
   order by h.rank,
            -- wards before districts at equal rank: the finer answer first
            case when h.level = 'ward' then 0 else 1 end,
            length(coalesce(h.ward_name, h.ward_no))
   limit greatest(1, least(coalesce(p_limit, 8), 25));
$$;

grant execute on function place_search(text, integer) to anon, authenticated, service_role;

-- ── 4. Say what happened ────────────────────────────────────────────

select
  'map-search installed' as step,
  (select count(*) from wards where level = 'district') as districts,
  (select count(*) from wards where level = 'ward')     as city_wards,
  case
    when (select count(*) from wards where level = 'district') = 0
      then 'no districts loaded yet — the mask will build itself once they are'
    else 'mask ready'
  end as mask;
