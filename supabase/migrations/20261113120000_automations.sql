-- Automations: rules an organisation turns on, run by the server, each run recorded.
--
-- An automation watches one of Kaju's explainable checks (kaju_refresh_checks) and,
-- when the check finds enough, tells the right people inside StrayPaw. It never sends
-- anything outside StrayPaw, never changes a record and never reads the health schema.
-- A lead or coordinator turns each one on; nothing is on by default.
-- Every run is kept (found, delivered, skipped or failed) and a run is not repeated
-- for the same day or week.

CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  template text NOT NULL CHECK (char_length(template) BETWEEN 1 AND 60),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  rule text NOT NULL CHECK (rule IN ('overdue_followup','missing_evidence','awaiting_vet','open_clarification','reporting_deadline','programme_activity','digest')),
  every text NOT NULL DEFAULT 'day' CHECK (every IN ('day','week')),
  weekday smallint NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 1 AND 7),
  min_count integer NOT NULL DEFAULT 1 CHECK (min_count BETWEEN 1 AND 1000),
  notify text NOT NULL DEFAULT 'leads' CHECK (notify IN ('leads','everyone')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  UNIQUE (ngo_id, rule, every, notify)
);
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded','skipped','failed')),
  attempt integer NOT NULL DEFAULT 1,
  found integer,
  delivered integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  error text,
  items jsonb NOT NULL DEFAULT '[]',
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (automation_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS automation_runs_org_time ON public.automation_runs (ngo_id, started_at DESC);
CREATE TABLE IF NOT EXISTS public.automation_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL CHECK (href LIKE '/%' AND href NOT LIKE '//%'),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS automation_notices_mine ON public.automation_notices (user_id, created_at DESC);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automations, public.automation_runs, public.automation_notices FROM anon, authenticated;
GRANT SELECT ON public.automations, public.automation_runs, public.automation_notices TO authenticated;
GRANT ALL ON public.automations, public.automation_runs, public.automation_notices TO service_role;
DROP POLICY IF EXISTS automations_read ON public.automations;
CREATE POLICY automations_read ON public.automations FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));
DROP POLICY IF EXISTS automation_runs_read ON public.automation_runs;
CREATE POLICY automation_runs_read ON public.automation_runs FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));
DROP POLICY IF EXISTS automation_notices_read ON public.automation_notices;
CREATE POLICY automation_notices_read ON public.automation_notices FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Who may manage automations: a lead or coordinator of the organisation.
CREATE OR REPLACE FUNCTION public.automation_manager(p_ngo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT auth.uid() IS NOT NULL AND p_ngo = public.my_ngo() AND EXISTS (
    SELECT 1 FROM public.ngo_members m WHERE m.user_id = auth.uid() AND m.ngo_id = p_ngo AND m.role IN ('admin','coordinator'));
$$;
REVOKE ALL ON FUNCTION public.automation_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_manager(uuid) TO authenticated, service_role;

-- Turn an automation on (or change it). One per rule, rhythm and audience, so the same thing is never told twice.
CREATE OR REPLACE FUNCTION public.automation_save(p_template text, p_name text, p_rule text, p_every text, p_weekday integer, p_min_count integer, p_notify text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo(); out_id uuid;
BEGIN
  IF NOT public.automation_manager(org) THEN RAISE EXCEPTION 'Only a lead or coordinator can turn on automations' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.automations (ngo_id, template, name, rule, every, weekday, min_count, notify, created_by)
  VALUES (org, left(p_template, 60), left(btrim(p_name), 120), p_rule, coalesce(p_every, 'day'), coalesce(p_weekday, 1), coalesce(p_min_count, 1), coalesce(p_notify, 'leads'), auth.uid())
  ON CONFLICT (ngo_id, rule, every, notify) DO UPDATE SET name = excluded.name, template = excluded.template, weekday = excluded.weekday, min_count = excluded.min_count, status = 'active', updated_at = now()
  RETURNING id INTO out_id;
  RETURN out_id;
END $$;
REVOKE ALL ON FUNCTION public.automation_save(text, text, text, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_save(text, text, text, text, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.automation_set_status(p_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid;
BEGIN
  SELECT ngo_id INTO org FROM public.automations WHERE id = p_id;
  IF org IS NULL OR NOT public.automation_manager(org) THEN RAISE EXCEPTION 'Only a lead or coordinator can change automations' USING ERRCODE = '42501'; END IF;
  IF p_status = 'removed' THEN DELETE FROM public.automations WHERE id = p_id;
  ELSIF p_status IN ('active','paused') THEN UPDATE public.automations SET status = p_status, updated_at = now() WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Unknown status'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.automation_set_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_set_status(uuid, text) TO authenticated;

-- Run one automation. The server's schedule calls it for every due automation; a manager can run one now.
-- The same day (or week) is never delivered twice; a failed run is recorded and may be tried again.
CREATE OR REPLACE FUNCTION public.automation_run(p_id uuid, p_now boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE a public.automations; svc boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  key text; f jsonb; item jsonb; n integer := 0; sample jsonb := '[]'; said text; link text; run_id uuid; sent integer := 0; tries integer := 1;
BEGIN
  SELECT * INTO a FROM public.automations WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Automation not found'; END IF;
  IF NOT svc AND NOT public.automation_manager(a.ngo_id) THEN RAISE EXCEPTION 'Only a lead or coordinator can run automations' USING ERRCODE = '42501'; END IF;
  IF a.status <> 'active' AND NOT p_now THEN RETURN jsonb_build_object('status', 'skipped', 'summary', 'Paused'); END IF;
  key := CASE WHEN a.every = 'week' THEN to_char(current_date, 'IYYY"-W"IW') ELSE current_date::text END
      || CASE WHEN p_now THEN ':now:' || floor(extract(epoch FROM clock_timestamp()))::text ELSE '' END;
  SELECT r.attempt + 1 INTO tries FROM public.automation_runs r WHERE r.automation_id = a.id AND r.dedupe_key = key AND r.status = 'failed';
  tries := coalesce(tries, 1);
  IF EXISTS (SELECT 1 FROM public.automation_runs r WHERE r.automation_id = a.id AND r.dedupe_key = key AND r.status <> 'failed') THEN
    RETURN jsonb_build_object('status', 'skipped', 'summary', 'Already ran for this period');
  END IF;
  BEGIN
    SELECT c.findings INTO f FROM public.kaju_check_runs c WHERE c.ngo_id = a.ngo_id AND c.checked_at > now() - interval '23 hours' ORDER BY c.checked_at DESC LIMIT 1;
    IF f IS NULL THEN
      PERFORM public.kaju_refresh_checks(a.ngo_id);
      SELECT c.findings INTO f FROM public.kaju_check_runs c WHERE c.ngo_id = a.ngo_id ORDER BY c.checked_at DESC LIMIT 1;
    END IF;
    IF f IS NULL THEN RAISE EXCEPTION 'The checks could not be read'; END IF;
    IF a.rule = 'digest' THEN
      SELECT coalesce(sum((x ->> 'count')::integer), 0),
             coalesce(string_agg((x ->> 'count') || ' ' || replace(x ->> 'rule', '_', ' '), ', ') FILTER (WHERE (x ->> 'count')::integer > 0), 'Nothing is waiting')
        INTO n, said FROM jsonb_array_elements(f) x WHERE x ->> 'count' ~ '^[0-9]+$';
      link := '/ngo';
    ELSE
      SELECT x INTO item FROM jsonb_array_elements(f) x WHERE x ->> 'rule' = a.rule LIMIT 1;
      n := CASE WHEN item ->> 'count' ~ '^[0-9]+$' THEN (item ->> 'count')::integer ELSE 0 END;
      SELECT coalesce(jsonb_agg(jsonb_build_object('label', r ->> 'label', 'href', r ->> 'href')), '[]') INTO sample
        FROM (SELECT r FROM jsonb_array_elements(coalesce(item -> 'records', '[]')) r WHERE r ->> 'href' LIKE '/%' LIMIT 10) s;
      said := n || CASE a.rule
        WHEN 'overdue_followup' THEN ' follow-up' || CASE WHEN n = 1 THEN ' is' ELSE 's are' END || ' past the due date'
        WHEN 'missing_evidence' THEN ' ABC record' || CASE WHEN n = 1 THEN ' is' ELSE 's are' END || ' missing required evidence'
        WHEN 'awaiting_vet' THEN ' procedure' || CASE WHEN n = 1 THEN ' is' ELSE 's are' END || ' waiting for a veterinarian''s sign-off'
        WHEN 'open_clarification' THEN ' question' || CASE WHEN n = 1 THEN '' ELSE 's' END || ' from the reviewing office waiting for an answer'
        WHEN 'reporting_deadline' THEN ' reporting deadline' || CASE WHEN n = 1 THEN ' is' ELSE 's are' END || ' close'
        ELSE ' programme' || CASE WHEN n = 1 THEN ' has' ELSE 's have' END || ' a change in recorded activity' END;
      link := CASE a.rule WHEN 'overdue_followup' THEN '/ngo/work' WHEN 'missing_evidence' THEN '/ngo/verification' WHEN 'awaiting_vet' THEN '/ngo/verification'
        WHEN 'open_clarification' THEN '/ngo/packages' WHEN 'reporting_deadline' THEN '/ngo/packages' ELSE '/ngo/programmes' END;
    END IF;
    IF n < a.min_count THEN
      INSERT INTO public.automation_runs (automation_id, ngo_id, dedupe_key, status, attempt, found, summary, started_by, finished_at)
      VALUES (a.id, a.ngo_id, key, 'skipped', tries, n, CASE WHEN n = 0 THEN 'Nothing found' ELSE n || ' found, fewer than ' || a.min_count END, auth.uid(), now())
      ON CONFLICT (automation_id, dedupe_key) DO UPDATE SET status = 'skipped', attempt = excluded.attempt, found = excluded.found, summary = excluded.summary, error = NULL, finished_at = now()
      RETURNING id INTO run_id;
    ELSE
      INSERT INTO public.automation_runs (automation_id, ngo_id, dedupe_key, status, attempt, found, summary, items, started_by, finished_at)
      VALUES (a.id, a.ngo_id, key, 'succeeded', tries, n, said, sample, auth.uid(), now())
      ON CONFLICT (automation_id, dedupe_key) DO UPDATE SET status = 'succeeded', attempt = excluded.attempt, found = excluded.found, summary = excluded.summary, items = excluded.items, error = NULL, finished_at = now()
      RETURNING id INTO run_id;
      INSERT INTO public.automation_notices (run_id, automation_id, ngo_id, user_id, title, body, href)
      SELECT run_id, a.id, a.ngo_id, m.user_id, a.name, said, link FROM public.ngo_members m
      WHERE m.ngo_id = a.ngo_id AND (a.notify = 'everyone' OR m.role IN ('admin','coordinator'));
      GET DIAGNOSTICS sent = ROW_COUNT;
      UPDATE public.automation_runs SET delivered = sent WHERE id = run_id;
    END IF;
    UPDATE public.automations SET last_run_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('status', CASE WHEN n < a.min_count THEN 'skipped' ELSE 'succeeded' END, 'found', n, 'delivered', sent, 'summary', coalesce(said, ''));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.automation_runs (automation_id, ngo_id, dedupe_key, status, attempt, summary, error, started_by, finished_at)
    VALUES (a.id, a.ngo_id, key, 'failed', tries, 'Could not finish', left(SQLERRM, 300), auth.uid(), now())
    ON CONFLICT (automation_id, dedupe_key) DO UPDATE SET status = 'failed', attempt = excluded.attempt, error = excluded.error, summary = excluded.summary, finished_at = now();
    RETURN jsonb_build_object('status', 'failed', 'summary', 'Could not finish', 'attempt', tries);
  END;
END $$;
REVOKE ALL ON FUNCTION public.automation_run(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_run(uuid, boolean) TO authenticated, service_role;

-- What the server's schedule should run now: active automations not yet run for today (or, weekly, for this week on or after their day).
-- A failed run stays due, up to three attempts in its period.
CREATE OR REPLACE FUNCTION public.automation_due(p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT a.id FROM public.automations a
  WHERE a.status = 'active'
    AND (a.every = 'day' OR extract(isodow FROM current_date) >= a.weekday)
    AND NOT EXISTS (
      SELECT 1 FROM public.automation_runs r WHERE r.automation_id = a.id
        AND r.dedupe_key = CASE WHEN a.every = 'week' THEN to_char(current_date, 'IYYY"-W"IW') ELSE current_date::text END
        AND (r.status <> 'failed' OR r.attempt >= 3))
  ORDER BY a.last_run_at NULLS FIRST LIMIT greatest(1, least(p_limit, 200));
$$;
REVOKE ALL ON FUNCTION public.automation_due(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_due(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.automation_notice_read(p_id uuid DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  UPDATE public.automation_notices SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL AND (p_id IS NULL OR id = p_id);
$$;
REVOKE ALL ON FUNCTION public.automation_notice_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automation_notice_read(uuid) TO authenticated;
