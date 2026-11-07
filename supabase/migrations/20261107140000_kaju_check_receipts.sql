-- Delivery receipts for Kaju's scheduled record checks.
-- A receipt is written when a member opens a check's findings in StrayPaw.
-- Members see their own receipts; admins and coordinators see who in their
-- organisation has and has not seen the latest check. Additive only.

CREATE TABLE IF NOT EXISTS public.kaju_check_receipts (
  run_id uuid NOT NULL REFERENCES public.kaju_check_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, user_id)
);
CREATE INDEX IF NOT EXISTS kaju_check_receipts_ngo ON public.kaju_check_receipts (ngo_id, run_id);
ALTER TABLE public.kaju_check_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kaju_check_receipts FROM anon, authenticated;
GRANT SELECT ON public.kaju_check_receipts TO authenticated;
CREATE POLICY kaju_check_receipts_read ON public.kaju_check_receipts FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (ngo_id = (SELECT public.my_ngo()) AND EXISTS (
  SELECT 1 FROM public.ngo_members m WHERE m.user_id = (SELECT auth.uid()) AND m.ngo_id = (SELECT public.my_ngo()) AND m.role IN ('admin','coordinator'))));

-- Record that the caller has seen a check of their own organisation. Idempotent.
CREATE OR REPLACE FUNCTION public.kaju_mark_check_seen(p_run uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); t timestamptz;
BEGIN
  IF uid IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kaju_check_runs r WHERE r.id = p_run AND r.ngo_id = org) THEN RAISE EXCEPTION 'Check not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.kaju_check_receipts (run_id, user_id, ngo_id) VALUES (p_run, uid, org)
  ON CONFLICT (run_id, user_id) DO NOTHING;
  SELECT seen_at INTO t FROM public.kaju_check_receipts WHERE run_id = p_run AND user_id = uid;
  RETURN t;
END $$;

-- Who in the organisation has seen a check (admins and coordinators only).
CREATE OR REPLACE FUNCTION public.kaju_check_delivery(p_run uuid)
RETURNS TABLE(user_id uuid, name text, role text, seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo();
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT EXISTS (SELECT 1 FROM public.ngo_members m WHERE m.user_id = auth.uid() AND m.ngo_id = org AND m.role IN ('admin','coordinator')) THEN
    RAISE EXCEPTION 'An admin or coordinator sees delivery' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kaju_check_runs r WHERE r.id = p_run AND r.ngo_id = org) THEN RAISE EXCEPTION 'Check not found' USING ERRCODE = 'P0002'; END IF;
  RETURN QUERY
  SELECT m.user_id, coalesce(v.name, 'Member'), coalesce(m.role, 'member'), k.seen_at
  FROM public.ngo_members m
  LEFT JOIN public.volunteers v ON v.id = m.user_id
  LEFT JOIN public.kaju_check_receipts k ON k.run_id = p_run AND k.user_id = m.user_id
  WHERE m.ngo_id = org
  ORDER BY k.seen_at NULLS LAST, coalesce(v.name, 'Member');
END $$;

REVOKE ALL ON FUNCTION public.kaju_mark_check_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kaju_mark_check_seen(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.kaju_check_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kaju_check_delivery(uuid) TO authenticated;
