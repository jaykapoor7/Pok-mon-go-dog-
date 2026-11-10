-- Survey sessions: effort, method and zero-sighting records for street surveys.
--
-- Additive and backward compatible: one new table, nullable columns on
-- survey_responses (existing rows stay as they are: kind 'animal'), new
-- functions and a view. Applied to staging and production on 2026-11-11 (owner approved).
--
-- Why: a count from a survey walk can only be compared with another walk if we
-- know how it was done (method, protocol), how much effort it took (time,
-- distance, observers) and where nothing was seen. Without zero-sighting
-- records an empty area cannot be told apart from an unvisited one.
-- Nothing here estimates a population.

CREATE TABLE IF NOT EXISTS public.survey_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.survey_areas(id) ON DELETE SET NULL,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  method text NOT NULL CHECK (method IN ('area_search', 'route', 'transect', 'point_count', 'opportunistic')),
  protocol_version text NOT NULL DEFAULT 'straypaw-street-v1' CHECK (length(protocol_version) <= 40),
  observers int NOT NULL DEFAULT 1 CHECK (observers BETWEEN 1 AND 20),
  team text CHECK (team IS NULL OR length(team) <= 120),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  distance_m numeric CHECK (distance_m IS NULL OR distance_m BETWEEN 0 AND 100000),
  coverage text NOT NULL DEFAULT 'not_recorded' CHECK (coverage IN ('complete', 'partial', 'not_recorded')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,   -- weather, time of day; structured keys only, set by the app
  notes text CHECK (notes IS NULL OR length(notes) <= 1000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS survey_sessions_survey ON public.survey_sessions (survey_id, started_at DESC);

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.survey_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS observation_kind text NOT NULL DEFAULT 'animal',
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_source text NOT NULL DEFAULT 'not_recorded',
  ADD COLUMN IF NOT EXISTS observed_at timestamptz;
DO $$ BEGIN
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_kind CHECK (observation_kind IN ('animal', 'zero_sighting', 'environment'));
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_zero_is_zero CHECK (observation_kind <> 'zero_sighting' OR count = 0);
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_location_source CHECK (location_source IN ('gps', 'map_pick', 'not_recorded'));
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_accuracy CHECK (location_accuracy_m IS NULL OR location_accuracy_m BETWEEN 0 AND 10000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS survey_responses_session ON public.survey_responses (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.survey_sessions FROM anon, authenticated;
GRANT SELECT ON public.survey_sessions TO authenticated;
DROP POLICY IF EXISTS survey_sessions_org_read ON public.survey_sessions;
CREATE POLICY survey_sessions_org_read ON public.survey_sessions FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));

-- Start a session on one of the organisation's surveys.
CREATE OR REPLACE FUNCTION public.start_survey_session(p_survey uuid, p_area uuid, p_method text, p_observers int DEFAULT 1, p_team text DEFAULT NULL, p_protocol text DEFAULT 'straypaw-street-v1')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo(); sid uuid;
BEGIN
  IF auth.uid() IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = p_survey AND ngo_id = org) THEN RAISE EXCEPTION 'Not your survey' USING ERRCODE = '42501'; END IF;
  IF p_area IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.survey_areas WHERE id = p_area AND survey_id = p_survey) THEN RAISE EXCEPTION 'That area is not in this survey'; END IF;
  INSERT INTO public.survey_sessions (survey_id, area_id, ngo_id, method, observers, team, protocol_version, created_by)
  VALUES (p_survey, p_area, org, p_method, coalesce(p_observers, 1), nullif(btrim(coalesce(p_team, '')), ''), coalesce(p_protocol, 'straypaw-street-v1'), auth.uid())
  RETURNING id INTO sid;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, auth.uid(), 'survey_session', sid, 'survey_session_started', jsonb_build_object('survey_id', p_survey, 'area_id', p_area, 'method', p_method));
  RETURN sid;
END $$;

-- Record that an area or stretch was searched and no animal was seen.
-- A zero sighting is "no dogs seen here": species 'dog', count 0 (survey_responses requires the species).
CREATE OR REPLACE FUNCTION public.record_zero_sighting(p_session uuid, p_lat double precision, p_lng double precision, p_accuracy_m numeric DEFAULT NULL, p_source text DEFAULT 'gps', p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo(); s public.survey_sessions; rid uuid;
BEGIN
  SELECT * INTO s FROM public.survey_sessions WHERE id = p_session AND ngo_id = org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your survey session' USING ERRCODE = '42501'; END IF;
  IF s.ended_at IS NOT NULL THEN RAISE EXCEPTION 'This session is closed'; END IF;
  INSERT INTO public.survey_responses (survey_id, area_id, session_id, lat, lng, species, count, observation_kind, location_accuracy_m, location_source, observed_at, notes, recorded_by)
  VALUES (s.survey_id, s.area_id, s.id, p_lat, p_lng, 'dog', 0, 'zero_sighting', p_accuracy_m, CASE WHEN p_lat IS NULL THEN 'not_recorded' ELSE coalesce(p_source, 'gps') END, now(), nullif(btrim(left(coalesce(p_notes, ''), 500)), ''), auth.uid())
  RETURNING id INTO rid;
  RETURN rid;
END $$;

-- Close a session with its effort.
CREATE OR REPLACE FUNCTION public.close_survey_session(p_session uuid, p_distance_m numeric DEFAULT NULL, p_coverage text DEFAULT 'not_recorded', p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo();
BEGIN
  UPDATE public.survey_sessions SET ended_at = now(), distance_m = p_distance_m, coverage = coalesce(p_coverage, 'not_recorded'), notes = nullif(btrim(left(coalesce(p_notes, ''), 1000)), '')
   WHERE id = p_session AND ngo_id = org AND ended_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found, not yours or already closed' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, auth.uid(), 'survey_session', p_session, 'survey_session_closed', jsonb_build_object('distance_m', p_distance_m, 'coverage', p_coverage));
END $$;

REVOKE ALL ON FUNCTION public.start_survey_session(uuid, uuid, text, int, text, text), public.record_zero_sighting(uuid, double precision, double precision, numeric, text, text),
  public.close_survey_session(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_survey_session(uuid, uuid, text, int, text, text), public.record_zero_sighting(uuid, double precision, double precision, numeric, text, text),
  public.close_survey_session(uuid, numeric, text, text) TO authenticated;

-- Effort per closed session. The encounter rate is animals counted per observer-hour:
-- comparable between sessions of the same method and protocol, never a population size.
CREATE OR REPLACE VIEW public.survey_session_effort WITH (security_invoker = true) AS
SELECT s.id AS session_id, s.survey_id, s.area_id, s.ngo_id, s.method, s.protocol_version, s.observers, s.coverage,
       s.started_at, s.ended_at,
       round(extract(epoch FROM (s.ended_at - s.started_at)) / 60.0, 1) AS minutes,
       s.distance_m,
       coalesce(sum(r.count) FILTER (WHERE r.observation_kind = 'animal'), 0) AS animals_counted,
       count(*) FILTER (WHERE r.observation_kind = 'animal') AS animal_records,
       count(*) FILTER (WHERE r.observation_kind = 'zero_sighting') AS zero_sighting_records,
       CASE WHEN s.ended_at > s.started_at THEN round(coalesce(sum(r.count) FILTER (WHERE r.observation_kind = 'animal'), 0)
            / (extract(epoch FROM (s.ended_at - s.started_at)) / 3600.0 * s.observers)::numeric, 2) END AS animals_per_observer_hour
FROM public.survey_sessions s
LEFT JOIN public.survey_responses r ON r.session_id = s.id
WHERE s.ended_at IS NOT NULL
GROUP BY s.id;
GRANT SELECT ON public.survey_session_effort TO authenticated;
