-- STAGING ONLY. Brings staging's public map functions in line with
-- production so the map and the government Overview can read a city.
-- Production has these functions (applied there directly); staging did not,
-- so every city read on staging failed with PGRST202.
--
-- public_map_cells_v2, public_map_case_confidence and public_map_followups_live
-- are identical to production. public_contributor_organisations is a reduced
-- stand-in: production builds it from atlas_area_metrics and data_sources,
-- which staging does not have, so here it lists operational partners only
-- and reports zero area and source records. Never apply this file to
-- production. Additive; safe to re-run.

CREATE OR REPLACE VIEW public.public_contributor_organisations
WITH (security_invoker = true, security_barrier = true) AS
SELECT n.id, n.name, n.slug, n.area, n.logo_url, n.verified, n.mission, n.about, n.website, n.city, n.state,
       n.areas_of_work, n.cover_photo, n.founded_year, n.partner_status,
       CASE WHEN n.partner_status = 'operational_partner' THEN 'partner' ELSE 'data_source' END AS directory_kind,
       (SELECT count(*)::integer FROM public.dogs d WHERE d.ngo_id = n.id) AS animal_count,
       0 AS area_record_count,
       0 AS source_count
FROM public.ngos n
WHERE n.partner_status = 'operational_partner';
GRANT SELECT ON public.public_contributor_organisations TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_map_case_confidence(p_cities text[])
 RETURNS TABLE(h3 text, open_unconfirmed integer, open_30_unconfirmed integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(p.h3_r8, a.h3_r8) h3,
    count(*) filter (where p.status_class in ('open','in_progress'))::int,
    count(*) filter (where p.status_class in ('open','in_progress') and p.occurred_at < now() - interval '30 days')::int
  from public_case_facts p
  join cases c on c.id = p.id
  left join public_spatial_animals a on a.id = p.dog_id
  where p.city = any(p_cities)
    and c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
    and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day')
  group by 1 having coalesce(p.h3_r8, a.h3_r8) is not null;
$function$;

CREATE OR REPLACE FUNCTION public.public_map_followups_live(p_cities text[])
 RETURNS TABLE(h3 text, fu_missed_live integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select coalesce(p.h3_r8, a.h3_r8) h3, sum(p.followups_missed)::int
  from public_case_facts p join cases c on c.id = p.id left join public_spatial_animals a on a.id = p.dog_id
  where p.city = any(p_cities) and p.followups_missed > 0 and p.status_class in ('open','in_progress')
    and not (c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
      and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day'))
  group by 1 having coalesce(p.h3_r8, a.h3_r8) is not null;
$function$;

CREATE OR REPLACE FUNCTION public.public_map_cells_v2(p_cities text[])
 RETURNS TABLE(h3 text, zone text, animals integer, exact_loc integer, photos integer, needs_help integer, injured integer, residents integer, ster_yes integer, ster_no integer, ster_unknown integer, vacc_yes integer, vacc_unknown integer, first_seen timestamp with time zone, last_seen timestamp with time zone, cases integer, open_cases integer, open_30 integer, open_oldest timestamp with time zone, closed_field integer, handed_on integer, no_action integer, in_progress integer, status_unknown integer, first_action_median numeric, fu_done integer, fu_missed integer, fu_upcoming integer, last_case timestamp with time zone, care integer, care_12m integer, care_last date, care_kinds jsonb, orgs jsonb)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.public_map_cells_v2(text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_map_case_confidence(text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_map_followups_live(text[]) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
