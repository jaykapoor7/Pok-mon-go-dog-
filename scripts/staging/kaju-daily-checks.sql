-- Run only against isolated staging. All fixtures and function substitutions roll back.
begin;
CREATE OR REPLACE FUNCTION public.kaju_due_checks(p_limit integer DEFAULT 10)
RETURNS TABLE(ngo_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $
 SELECT n.id FROM public.ngos n
 LEFT JOIN LATERAL(SELECT max(r.checked_at) AS checked FROM public.kaju_check_runs r WHERE r.ngo_id=n.id) last ON true
 WHERE NOT n.demo_mode AND EXISTS(SELECT 1 FROM public.ngo_members m WHERE m.ngo_id=n.id)
  AND (last.checked IS NULL OR last.checked<now()-interval '23 hours')
 ORDER BY last.checked NULLS FIRST,n.id LIMIT greatest(1,least(p_limit,20));
$;
REVOKE ALL ON FUNCTION public.kaju_due_checks(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kaju_due_checks(integer) TO service_role;


create temp table support_cadence_test as select gen_random_uuid() as id;
insert into public.ngos(id,name,demo_mode) select id,'STAGING TEST daily cadence rollback',false from support_cadence_test;
update public.ngo_members set ngo_id=(select id from support_cadence_test) where user_id=(select m.user_id from public.ngo_members m join public.ngos n on n.id=m.ngo_id where n.name ilike 'STAGING TEST%' limit 1);
insert into public.kaju_check_runs(ngo_id,checked_at,findings) select id,(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')-interval '9 hours','[]'::jsonb from support_cadence_test;
do $$ begin assert not exists(select 1 from public.kaju_due_checks(20) d where d.ngo_id=(select id from support_cadence_test)),'Baseline cooldown should reproduce the missed next-day check'; end $$;
-- A check yesterday must not suppress today's scheduled run merely because
-- it was less than 23 hours ago. Keep the existing batch cap and service grant.
CREATE OR REPLACE FUNCTION public.kaju_due_checks(p_limit integer DEFAULT 10)
RETURNS TABLE(ngo_id uuid) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
 SELECT n.id FROM public.ngos n
 LEFT JOIN LATERAL (
   SELECT max(r.checked_at) AS checked FROM public.kaju_check_runs r WHERE r.ngo_id=n.id
 ) last ON true
 WHERE NOT n.demo_mode
   AND EXISTS(SELECT 1 FROM public.ngo_members m WHERE m.ngo_id=n.id)
   AND (last.checked IS NULL OR last.checked <
     (date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))
 ORDER BY last.checked NULLS FIRST,n.id LIMIT greatest(1,least(p_limit,20));
$$;
REVOKE ALL ON FUNCTION public.kaju_due_checks(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kaju_due_checks(integer) TO service_role;

do $$ begin
 assert exists(select 1 from public.kaju_due_checks(20) d where d.ngo_id=(select id from support_cadence_test)),'Yesterday afternoon must be due today';
 insert into public.kaju_check_runs(ngo_id,findings) select id,'[]'::jsonb from support_cadence_test;
 assert not exists(select 1 from public.kaju_due_checks(20) d where d.ngo_id=(select id from support_cadence_test)),'Already checked today must not repeat';
 assert not has_function_privilege('anon','public.kaju_due_checks(integer)','execute'),'Anonymous scheduler access';
 assert not has_function_privilege('authenticated','public.kaju_due_checks(integer)','execute'),'Client scheduler access';
 assert has_function_privilege('service_role','public.kaju_due_checks(integer)','execute'),'Service scheduler access';
end $$;
select 'PASS baseline reproduced, next-day eligibility, same-day suppression, anonymous/client denial and service access; all fixtures rolled back' as verification;
rollback;
