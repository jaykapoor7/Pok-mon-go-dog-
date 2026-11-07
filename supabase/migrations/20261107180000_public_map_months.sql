-- public_map_months: monthly opened/closed/care counts per H3 cell for the
-- public map, read only from the public views (no private columns).
-- It already exists in production (applied there directly, not from git);
-- this file records it so the schema can be rebuilt from the repository and
-- so staging matches production. Identical to production's definition and
-- grants. Additive; safe to re-run.

CREATE OR REPLACE FUNCTION public.public_map_months(p_cities text[])
 RETURNS TABLE(h3 text, m date, opened integer, closed integer, care integer, ster integer, vacc integer, other_care integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.public_map_months(text[]) TO anon, authenticated, service_role;
