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
