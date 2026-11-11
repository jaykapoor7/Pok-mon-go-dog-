-- One Health v2.5: two fixes found by the end-to-end journey on staging.
--
-- 1. oh_clinic_exposure writes an audit row ("record opened") but was declared
--    STABLE, so Postgres ran it read-only and every record open failed with
--    "cannot execute INSERT in a read-only transaction". It is VOLATILE now.
-- 2. oh_alerts said "fewer than 5 dose" when one facility's count was
--    suppressed. The plural now follows what is shown, not the hidden number.
-- Additive and re-runnable.

ALTER FUNCTION public.oh_clinic_exposure(uuid) VOLATILE;

DO $$
DECLARE def text; fixed text;
BEGIN
  def := pg_get_functiondef('public.oh_alerts(uuid)'::regprocedure);
  fixed := replace(def,
    $old$|| ' dose' || CASE WHEN n = 1 THEN '' ELSE 's' END || ' past the date set'$old$,
    $new$|| ' dose' || CASE WHEN n = 1 AND f.id = ANY (mine) THEN '' WHEN n = 1 AND sup <= 1 THEN '' ELSE 's' END || ' past the date set'$new$);
  IF fixed <> def THEN EXECUTE fixed; END IF;
END $$;

-- 3. People who reach a programme through their NGO membership have no
--    display name in oh_members, so their actions read "A team member".
--    Fall back to the name on their account before that.
CREATE OR REPLACE FUNCTION public.oh_actor_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(
    (SELECT display_name FROM public.oh_members WHERE user_id = auth.uid() AND display_name IS NOT NULL LIMIT 1),
    (SELECT nullif(btrim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name')), '') FROM auth.users u WHERE u.id = auth.uid()),
    'A team member')
$$;
