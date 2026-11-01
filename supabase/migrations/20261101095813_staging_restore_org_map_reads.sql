CREATE OR REPLACE FUNCTION public.org_map_cells(p_cities text[])
 RETURNS TABLE(h3 text, zone text, animals integer, exact_loc integer, photos integer, needs_help integer, injured integer, residents integer, ster_yes integer, ster_no integer, ster_unknown integer, vacc_yes integer, vacc_unknown integer, first_seen timestamp with time zone, last_seen timestamp with time zone, cases integer, open_cases integer, open_30 integer, open_oldest timestamp with time zone, closed_field integer, handed_on integer, no_action integer, in_progress integer, status_unknown integer, first_action_median numeric, fu_done integer, fu_missed integer, fu_upcoming integer, last_case timestamp with time zone, care integer, care_12m integer, care_last date, care_kinds jsonb, orgs jsonb, unassigned integer, people jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.my_ngo() ngo_id),
  a as (
    select d.* from public.dogs d, me
    where auth.uid() is not null and me.ngo_id is not null and d.ngo_id = me.ngo_id
      and d.city = any(p_cities) and d.h3_r8 is not null
  ),
  ac as (
    select h3_r8 as h3,
      mode() within group (order by zone) filter (where zone is not null and zone <> '') as zone,
      count(*)::int animals,
      count(*) filter (where location_precision = 'exact')::int exact_loc,
      count(*) filter (where cover_photo is not null)::int photos,
      count(*) filter (where needs_help)::int needs_help,
      count(*) filter (where status::text = 'injured')::int injured,
      count(*) filter (where provenance::text = 'community_report')::int residents,
      count(*) filter (where sterilisation_status = 'sterilised')::int ster_yes,
      count(*) filter (where sterilisation_status = 'not_sterilised')::int ster_no,
      count(*) filter (where sterilisation_status is null or sterilisation_status not in ('sterilised','not_sterilised'))::int ster_unknown,
      count(*) filter (where vaccination_status = 'vaccinated')::int vacc_yes,
      count(*) filter (where vaccination_status is distinct from 'vaccinated')::int vacc_unknown,
      min(first_seen) first_seen, max(last_seen) last_seen
    from a group by 1
  ),
  k as (
    select coalesce(c.h3_r8, d.h3_r8) h3, c.*
    from public.org_case_facts c left join public.dogs d on d.id = c.dog_id, me
    where auth.uid() is not null and me.ngo_id is not null and c.ngo_id = me.ngo_id
      and coalesce(nullif(btrim(c.city),''), d.city) = any(p_cities)
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
      (percentile_cont(0.5) within group (order by greatest(0, (first_action_at::date - occurred_at::date))) filter (where first_action_at is not null and occurred_at is not null))::numeric first_action_median,
      coalesce(sum(followups_done),0)::int fu_done, coalesce(sum(followups_missed),0)::int fu_missed, coalesce(sum(followups_upcoming),0)::int fu_upcoming,
      max(occurred_at) last_case,
      count(*) filter (where status_class in ('open','in_progress') and assignee_id is null and coalesce(assignee_name,'') = '')::int unassigned
    from k where h3 is not null group by 1
  ),
  pp as (
    select h3, jsonb_agg(jsonb_build_object('name', who, 'o', n) order by n desc) people
    from (select h3, coalesce(nullif(assignee_name,''), 'Unassigned') who, count(*)::int n from k
          where h3 is not null and status_class in ('open','in_progress') group by 1, 2) x group by 1
  ),
  cr as (select a.h3_r8 h3, m.kind, m.event_date from public.medical_events m join a on a.id = m.dog_id),
  crc as (
    select h3, sum(n)::int care, sum(n12)::int care_12m, max(last) care_last, jsonb_object_agg(kind, n) care_kinds
    from (select h3, kind, count(*) n, count(*) filter (where event_date >= (now() - interval '12 months')::date) n12, max(event_date) last from cr group by 1, 2) x
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
    coalesce(crc.care,0), coalesce(crc.care_12m,0), crc.care_last, coalesce(crc.care_kinds,'{}'::jsonb),
    jsonb_build_array(jsonb_build_object('id', (select ngo_id from me), 'name', (select name from public.ngos where id = (select ngo_id from me)), 'a', coalesce(ac.animals,0), 'c', coalesce(kc.cases,0), 'o', coalesce(kc.open_cases,0))),
    coalesce(kc.unassigned,0), coalesce(pp.people,'[]'::jsonb)
  from cells
  left join ac on ac.h3 = cells.h3
  left join kc on kc.h3 = cells.h3
  left join crc on crc.h3 = cells.h3
  left join pp on pp.h3 = cells.h3;
$function$;
REVOKE ALL ON FUNCTION public.org_map_cells(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_map_cells(text[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.org_map_cities()
 RETURNS TABLE(city text, animals integer, needs_help integer, ster_yes integer, ster_no integer, ster_unknown integer, vacc_yes integer, cases integer, open_cases integer, open_30 integer, status_unknown integer, care integer, treatments integer, areas integer, last_activity timestamp with time zone, unassigned integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.my_ngo() ngo_id),
  a as (
    select d.city, count(*)::int animals, count(*) filter (where d.needs_help)::int needs_help,
      count(*) filter (where d.sterilisation_status = 'sterilised')::int ster_yes,
      count(*) filter (where d.sterilisation_status = 'not_sterilised')::int ster_no,
      count(*) filter (where d.sterilisation_status is null or d.sterilisation_status not in ('sterilised','not_sterilised'))::int ster_unknown,
      count(*) filter (where d.vaccination_status = 'vaccinated')::int vacc_yes,
      count(distinct d.h3_r8)::int areas, max(d.last_seen) last_seen
    from public.dogs d, me
    where auth.uid() is not null and me.ngo_id is not null and d.ngo_id = me.ngo_id and d.h3_r8 is not null and d.city is not null
    group by 1
  ),
  k as (
    select coalesce(nullif(btrim(c.city),''), d.city) city, count(*)::int cases,
      count(*) filter (where c.status_class in ('open','in_progress'))::int open_cases,
      count(*) filter (where c.status_class in ('open','in_progress') and c.occurred_at < now() - interval '30 days')::int open_30,
      count(*) filter (where c.status_class is null)::int status_unknown,
      count(*) filter (where c.status_class in ('open','in_progress') and c.assignee_id is null and coalesce(c.assignee_name,'') = '')::int unassigned,
      max(c.occurred_at) last_case
    from public.org_case_facts c left join public.dogs d on d.id = c.dog_id, me
    where auth.uid() is not null and me.ngo_id is not null and c.ngo_id = me.ngo_id
    group by 1
  ),
  c as (
    select d.city, count(*)::int care, count(*) filter (where m.kind not in ('sterilisation','vaccination'))::int treatments, max(m.event_date)::timestamptz last_care
    from public.medical_events m join public.dogs d on d.id = m.dog_id, me
    where auth.uid() is not null and me.ngo_id is not null and d.ngo_id = me.ngo_id and d.city is not null group by 1
  )
  select a.city, a.animals, a.needs_help, a.ster_yes, a.ster_no, a.ster_unknown, a.vacc_yes,
    coalesce(k.cases,0), coalesce(k.open_cases,0), coalesce(k.open_30,0), coalesce(k.status_unknown,0), coalesce(c.care,0), coalesce(c.treatments,0), a.areas,
    greatest(a.last_seen, k.last_case, c.last_care), coalesce(k.unassigned,0)
  from a left join k on k.city = a.city left join c on c.city = a.city;
$function$;
REVOKE ALL ON FUNCTION public.org_map_cities() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_map_cities() TO authenticated;
CREATE OR REPLACE FUNCTION public.org_map_months(p_cities text[])
 RETURNS TABLE(h3 text, m date, opened integer, closed integer, care integer, ster integer, vacc integer, other_care integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.my_ngo() ngo_id),
  a as (
    select d.id, d.h3_r8 from public.dogs d, me
    where auth.uid() is not null and me.ngo_id is not null and d.ngo_id = me.ngo_id and d.city = any(p_cities) and d.h3_r8 is not null
  ),
  k as (
    select coalesce(c.h3_r8, a.h3_r8) h3, c.occurred_at, c.resolved_at, c.resolved_at_source
    from public.org_case_facts c left join a on a.id = c.dog_id, me
    where auth.uid() is not null and me.ngo_id is not null and c.ngo_id = me.ngo_id and c.city = any(p_cities)
  ),
  ev as (
    select h3, date_trunc('month', occurred_at)::date m, 1 opened, 0 closed, 0 care, 0 ster, 0 vacc, 0 oc from k where h3 is not null and occurred_at is not null
    union all
    select h3, date_trunc('month', resolved_at)::date, 0, 1, 0, 0, 0, 0 from k where h3 is not null and resolved_at is not null and coalesce(resolved_at_source,'') <> 'assumed'
    union all
    select a.h3_r8, date_trunc('month', m.event_date)::date, 0, 0, 1,
      (m.kind = 'sterilisation')::int, (m.kind = 'vaccination')::int, (m.kind not in ('sterilisation','vaccination'))::int
    from public.medical_events m join a on a.id = m.dog_id where m.event_date is not null
  )
  select h3, m, sum(opened)::int, sum(closed)::int, sum(care)::int, sum(ster)::int, sum(vacc)::int, sum(oc)::int
  from ev where m <= now() group by 1, 2 order by 1, 2;
$function$;
REVOKE ALL ON FUNCTION public.org_map_months(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_map_months(text[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.org_map_case_confidence(p_cities text[])
 RETURNS TABLE(h3 text, open_unconfirmed integer, open_30_unconfirmed integer, unassigned_native integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.my_ngo() ngo_id)
  select coalesce(c.h3_r8, d.h3_r8) h3,
    count(*) filter (where c.status_class in ('open','in_progress') and c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
      and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day'))::int,
    count(*) filter (where c.status_class in ('open','in_progress') and c.created_at < now() - interval '30 days' and c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
      and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day')
      and coalesce(c.source_event_at, c.created_at) < now() - interval '30 days')::int,
    count(*) filter (where c.status_class in ('open','in_progress') and c.provenance is distinct from 'imported_historical_record' and c.assignee_id is null and coalesce(c.assignee_name,'') = '')::int
  from cases c left join dogs d on d.id = c.dog_id, me
  where auth.uid() is not null and me.ngo_id is not null and c.ngo_id = me.ngo_id
    and coalesce(nullif(btrim(c.city),''), d.city) = any(p_cities)
  group by 1 having coalesce(c.h3_r8, d.h3_r8) is not null;
$function$;
REVOKE ALL ON FUNCTION public.org_map_case_confidence(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_map_case_confidence(text[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.org_map_followups_live(p_cities text[])
 RETURNS TABLE(h3 text, fu_missed_live integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select public.my_ngo() ngo_id)
  select coalesce(c.h3_r8, d.h3_r8) h3, count(*)::int
  from animal_followups f join cases c on c.id = f.case_id left join dogs d on d.id = c.dog_id, me
  where auth.uid() is not null and me.ngo_id is not null and c.ngo_id = me.ngo_id and f.status = 'missed'
    and c.status_class in ('open','in_progress')
    and coalesce(nullif(btrim(c.city),''), d.city) = any(p_cities)
    and not (c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
      and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day'))
  group by 1 having coalesce(c.h3_r8, d.h3_r8) is not null;
$function$;
REVOKE ALL ON FUNCTION public.org_map_followups_live(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_map_followups_live(text[]) TO authenticated;
