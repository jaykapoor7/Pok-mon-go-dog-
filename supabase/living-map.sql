-- ════════════════════════════════════════════════════════════════════
-- Living Map aggregates (applied 2026-10-11; see docs/LIVING-MAP.md).
--
-- Complete, uncapped per-city and per-area figures for the public map,
-- read from the public views only (security invoker), never finer than
-- an H3 r8 area. One set of definitions serves the national view and
-- every city view, so they always agree.
-- ════════════════════════════════════════════════════════════════════
--
-- v2 (2026-10-12): adds status_unknown (requests with no status class are
-- never counted as closed) and open requests per organisation; the v1
-- functions public_map_cells / public_map_cities remain for the build that
-- preceded them and can be dropped once it is retired.

create or replace function public.public_map_cells_v2(p_cities text[])
returns table (
  h3 text, zone text,
  animals int, exact_loc int, photos int, needs_help int, injured int, residents int,
  ster_yes int, ster_no int, ster_unknown int, vacc_yes int, vacc_unknown int,
  first_seen timestamptz, last_seen timestamptz,
  cases int, open_cases int, open_30 int, open_oldest timestamptz,
  closed_field int, handed_on int, no_action int, in_progress int, status_unknown int,
  first_action_median numeric, fu_done int, fu_missed int, fu_upcoming int, last_case timestamptz,
  care int, care_12m int, care_last date, care_kinds jsonb, orgs jsonb
)
language sql stable security invoker set search_path = public as $$
  with a as (
    select * from public_spatial_animals where city = any(p_cities) and h3_r8 is not null
  ),
  ac as (
    select h3_r8 as h3,
      mode() within group (order by zone) filter (where zone is not null and zone <> '') as zone,
      count(*)::int animals,
      count(*) filter (where location_precision = 'exact')::int exact_loc,
      count(*) filter (where cover_photo is not null)::int photos,
      count(*) filter (where needs_help)::int needs_help,
      count(*) filter (where status = 'injured')::int injured,
      count(*) filter (where source = 'resident')::int residents,
      count(*) filter (where sterilisation_status = 'sterilised')::int ster_yes,
      count(*) filter (where sterilisation_status = 'not_sterilised')::int ster_no,
      count(*) filter (where sterilisation_status is null or sterilisation_status not in ('sterilised','not_sterilised'))::int ster_unknown,
      count(*) filter (where vaccination_status = 'vaccinated')::int vacc_yes,
      count(*) filter (where vaccination_status is distinct from 'vaccinated')::int vacc_unknown,
      min(first_seen) first_seen, max(last_seen) last_seen
    from a group by 1
  ),
  k as (
    select coalesce(c.h3_r8, an.h3_r8) h3, c.*
    from public_case_facts c left join public_spatial_animals an on an.id = c.dog_id
    where c.city = any(p_cities)
  ),
  kc as (
    select h3,
      count(*)::int cases,
      count(*) filter (where status_class in ('open','in_progress'))::int open_cases,
      count(*) filter (where status_class in ('open','in_progress') and occurred_at < now() - interval '30 days')::int open_30,
      min(occurred_at) filter (where status_class in ('open','in_progress')) open_oldest,
      count(*) filter (where status_class = 'closed')::int closed_field,
      count(*) filter (where status_class = 'other_ngo')::int handed_on,
      count(*) filter (where status_class in ('no_action','not_attended'))::int no_action,
      count(*) filter (where status_class = 'in_progress')::int in_progress,
      count(*) filter (where status_class is null)::int status_unknown,
      (percentile_cont(0.5) within group (order by first_action_days) filter (where first_action_days >= 0))::numeric first_action_median,
      coalesce(sum(followups_done),0)::int fu_done, coalesce(sum(followups_missed),0)::int fu_missed, coalesce(sum(followups_upcoming),0)::int fu_upcoming,
      max(occurred_at) last_case
    from k where h3 is not null group by 1
  ),
  cr as (
    select a.h3_r8 h3, f.kind, f.event_date
    from public_care_facts f join a on a.id = f.dog_id
  ),
  crc as (
    select h3, sum(n)::int care, sum(n12)::int care_12m, max(last) care_last, jsonb_object_agg(kind, n) care_kinds
    from (select h3, kind, count(*) n, count(*) filter (where event_date >= (now() - interval '12 months')::date) n12, max(event_date) last from cr group by 1, 2) x
    group by 1
  ),
  og as (
    select h3, jsonb_agg(jsonb_build_object('id', ngo_id, 'name', o.name, 'a', na, 'c', nc, 'o', no) order by na + nc desc) orgs
    from (
      select h3, ngo_id, sum(na)::int na, sum(nc)::int nc, sum(no)::int no from (
        select h3_r8 h3, ngo_id, 1 na, 0 nc, 0 no from a where ngo_id is not null
        union all select h3, ngo_id, 0, 1, (status_class in ('open','in_progress'))::int from k where ngo_id is not null and h3 is not null
      ) u group by 1, 2
    ) g left join public_contributor_organisations o on o.id = g.ngo_id
    group by 1
  ),
  cells as (select h3 from ac union select h3 from kc)
  select cells.h3, ac.zone,
    coalesce(ac.animals,0), coalesce(ac.exact_loc,0), coalesce(ac.photos,0), coalesce(ac.needs_help,0), coalesce(ac.injured,0), coalesce(ac.residents,0),
    coalesce(ac.ster_yes,0), coalesce(ac.ster_no,0), coalesce(ac.ster_unknown,0), coalesce(ac.vacc_yes,0), coalesce(ac.vacc_unknown,0),
    ac.first_seen, ac.last_seen,
    coalesce(kc.cases,0), coalesce(kc.open_cases,0), coalesce(kc.open_30,0), kc.open_oldest,
    coalesce(kc.closed_field,0), coalesce(kc.handed_on,0), coalesce(kc.no_action,0), coalesce(kc.in_progress,0), coalesce(kc.status_unknown,0),
    kc.first_action_median, coalesce(kc.fu_done,0), coalesce(kc.fu_missed,0), coalesce(kc.fu_upcoming,0), kc.last_case,
    coalesce(crc.care,0), coalesce(crc.care_12m,0), crc.care_last, coalesce(crc.care_kinds,'{}'::jsonb), coalesce(og.orgs,'[]'::jsonb)
  from cells
  left join ac on ac.h3 = cells.h3
  left join kc on kc.h3 = cells.h3
  left join crc on crc.h3 = cells.h3
  left join og on og.h3 = cells.h3;
$$;

-- Monthly activity per area: requests opened, requests closed (only where the
-- closing date was recorded, never an assumed one) and dated care by kind.
create or replace function public.public_map_months(p_cities text[])
returns table (h3 text, m date, opened int, closed int, care int, ster int, vacc int, other_care int)
language sql stable security invoker set search_path = public as $$
  with a as (select id, h3_r8 from public_spatial_animals where city = any(p_cities) and h3_r8 is not null),
  k as (
    select coalesce(c.h3_r8, a.h3_r8) h3, c.occurred_at, c.resolved_at, c.resolved_at_source
    from public_case_facts c left join a on a.id = c.dog_id where c.city = any(p_cities)
  ),
  ev as (
    select h3, date_trunc('month', occurred_at)::date m, 1 opened, 0 closed, 0 care, 0 ster, 0 vacc, 0 oc from k where h3 is not null and occurred_at is not null
    union all
    select h3, date_trunc('month', resolved_at)::date, 0, 1, 0, 0, 0, 0 from k where h3 is not null and resolved_at is not null and coalesce(resolved_at_source,'') <> 'assumed'
    union all
    select a.h3_r8, date_trunc('month', f.event_date)::date, 0, 0, 1,
      (f.kind = 'sterilisation')::int, (f.kind = 'vaccination')::int, (f.kind not in ('sterilisation','vaccination'))::int
    from public_care_facts f join a on a.id = f.dog_id where f.event_date is not null
  )
  select h3, m, sum(opened)::int, sum(closed)::int, sum(care)::int, sum(ster)::int, sum(vacc)::int, sum(oc)::int
  from ev where m <= now() group by 1, 2 order by 1, 2;
$$;

-- National totals per city, with exactly the definitions above.
create or replace function public.public_map_cities_v2()
returns table (city text, animals int, needs_help int, ster_yes int, ster_no int, ster_unknown int, vacc_yes int,
  cases int, open_cases int, open_30 int, status_unknown int, care int, treatments int, areas int, last_activity timestamptz)
language sql stable security invoker set search_path = public as $$
  with a as (
    select city, count(*)::int animals, count(*) filter (where needs_help)::int needs_help,
      count(*) filter (where sterilisation_status = 'sterilised')::int ster_yes,
      count(*) filter (where sterilisation_status = 'not_sterilised')::int ster_no,
      count(*) filter (where sterilisation_status is null or sterilisation_status not in ('sterilised','not_sterilised'))::int ster_unknown,
      count(*) filter (where vaccination_status = 'vaccinated')::int vacc_yes,
      count(distinct h3_r8)::int areas, max(last_seen) last_seen
    from public_spatial_animals where h3_r8 is not null and city is not null group by 1
  ),
  k as (
    select city, count(*)::int cases,
      count(*) filter (where status_class in ('open','in_progress'))::int open_cases,
      count(*) filter (where status_class in ('open','in_progress') and occurred_at < now() - interval '30 days')::int open_30,
      count(*) filter (where status_class is null)::int status_unknown,
      max(occurred_at) last_case
    from public_case_facts where city is not null group by 1
  ),
  c as (
    select an.city, count(*)::int care, count(*) filter (where f.kind not in ('sterilisation','vaccination'))::int treatments, max(f.event_date)::timestamptz last_care
    from public_care_facts f join public_spatial_animals an on an.id = f.dog_id where an.city is not null group by 1
  )
  select a.city, a.animals, a.needs_help, a.ster_yes, a.ster_no, a.ster_unknown, a.vacc_yes,
    coalesce(k.cases,0), coalesce(k.open_cases,0), coalesce(k.open_30,0), coalesce(k.status_unknown,0), coalesce(c.care,0), coalesce(c.treatments,0), a.areas,
    greatest(a.last_seen, k.last_case, c.last_care)
  from a left join k on k.city = a.city left join c on c.city = a.city;
$$;

grant execute on function public.public_map_cells_v2(text[]) to anon, authenticated;
grant execute on function public.public_map_months(text[]) to anon, authenticated;
grant execute on function public.public_map_cities_v2() to anon, authenticated;

-- Requests whose place has no city: listed, never silently off the map.
create or replace function public.public_map_unplaced()
returns table (zone text, district text, open_cases int, cases int, latest timestamptz)
language sql stable security invoker set search_path = public as $$
  select coalesce(nullif(btrim(zone),''), 'Place not recorded'), district,
    count(*) filter (where status_class in ('open','in_progress'))::int, count(*)::int, max(occurred_at)
  from public_case_facts where city is null group by 1, 2 order by 3 desc, 4 desc;
$$;
grant execute on function public.public_map_unplaced() to anon, authenticated;
