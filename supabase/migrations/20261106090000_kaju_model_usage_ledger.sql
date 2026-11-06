-- Kaju model usage ledger.
-- Paid inference stays off unless usage can be measured. Each model run is
-- recorded against the caller (auth.uid()) and their organisation, with token
-- counts and its cost at the configured price. Reads and writes go through
-- security-definer functions bound to auth.uid(); no client chooses whose
-- usage is written. Additive only: no existing table or row is changed.

CREATE TABLE IF NOT EXISTS public.kaju_model_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  ngo_id uuid REFERENCES public.ngos(id),
  purpose text NOT NULL CHECK (purpose IN ('kaju_chat','photo_check')),
  model text NOT NULL CHECK (length(model) BETWEEN 1 AND 120),
  input_tokens integer NOT NULL CHECK (input_tokens >= 0 AND input_tokens <= 5000000),
  output_tokens integer NOT NULL CHECK (output_tokens >= 0 AND output_tokens <= 500000),
  cost_inr numeric(12,4) NOT NULL CHECK (cost_inr >= 0 AND cost_inr <= 100000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kaju_model_usage_user_day ON public.kaju_model_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kaju_model_usage_org_day ON public.kaju_model_usage (ngo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kaju_model_usage_month ON public.kaju_model_usage (created_at);

ALTER TABLE public.kaju_model_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kaju_model_usage FROM anon, authenticated;
GRANT SELECT ON public.kaju_model_usage TO authenticated;
-- People see their own runs; organisation admins see their organisation's.
CREATE POLICY kaju_model_usage_read ON public.kaju_model_usage FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (ngo_id IS NOT NULL AND ngo_id = public.my_ngo() AND EXISTS (
    SELECT 1 FROM public.ngo_members m WHERE m.user_id = (SELECT auth.uid()) AND m.ngo_id = public.my_ngo() AND m.role = 'admin'))
);

-- Record one run for the caller. Organisation comes from membership, not input.
CREATE OR REPLACE FUNCTION public.record_kaju_model_usage(p_purpose text, p_model text, p_input_tokens integer, p_output_tokens integer, p_cost_inr numeric)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); rid bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.kaju_model_usage (user_id, ngo_id, purpose, model, input_tokens, output_tokens, cost_inr)
  VALUES (uid, public.my_ngo(), p_purpose, p_model, p_input_tokens, p_output_tokens, p_cost_inr)
  RETURNING id INTO rid;
  RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.record_kaju_model_usage(text, text, integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_kaju_model_usage(text, text, integer, integer, numeric) TO authenticated;

-- The three numbers the gate needs before each run: the caller's runs today,
-- their organisation's runs today (India time) and this month's total spend.
CREATE OR REPLACE FUNCTION public.kaju_model_usage_now()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH day AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS d0,
                      (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS m0)
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'user_today', (SELECT count(*) FROM public.kaju_model_usage u, day WHERE u.user_id = auth.uid() AND u.created_at >= day.d0),
    'org_today', (SELECT count(*) FROM public.kaju_model_usage u, day WHERE public.my_ngo() IS NOT NULL AND u.ngo_id = public.my_ngo() AND u.created_at >= day.d0),
    'month_inr', (SELECT coalesce(sum(u.cost_inr), 0) FROM public.kaju_model_usage u, day WHERE u.created_at >= day.m0)
  ) END;
$$;
REVOKE ALL ON FUNCTION public.kaju_model_usage_now() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kaju_model_usage_now() TO authenticated;
