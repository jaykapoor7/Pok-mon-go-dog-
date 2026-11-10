\set ON_ERROR_STOP on
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000c');
INSERT INTO public.ngos VALUES ('11111111-1111-1111-1111-111111111111', 'Org one'), ('22222222-2222-2222-2222-222222222222', 'Org two');
INSERT INTO public.ngo_members VALUES ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'member'), ('00000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', 'member');
INSERT INTO public.surveys (id, ngo_id, title) VALUES ('5a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ward 12 count');
INSERT INTO public.survey_areas (id, survey_id, name) VALUES ('a1000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'Block A');
-- an old response, from before sessions existed, stays valid
INSERT INTO public.survey_responses (survey_id, count) VALUES ('5a000000-0000-0000-0000-000000000001', 2);
DO $$ BEGIN IF (SELECT observation_kind FROM public.survey_responses LIMIT 1) <> 'animal' THEN RAISE EXCEPTION 'old row changed'; END IF; RAISE NOTICE 'ok 1 existing responses read as animal observations, unchanged'; END $$;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
SELECT public.start_survey_session('5a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'route', 2, 'Team A') AS sid \gset
SELECT public.record_zero_sighting(:'sid', 12.97, 77.59, 8, 'gps', 'Lane 4 empty') IS NOT NULL AS z \gset
RESET ROLE;
-- two animals seen during the session (as the field app would insert), and the session lasted an hour
INSERT INTO public.survey_responses (survey_id, session_id, count, observation_kind, location_source, location_accuracy_m) VALUES ('5a000000-0000-0000-0000-000000000001', :'sid', 3, 'animal', 'gps', 12), ('5a000000-0000-0000-0000-000000000001', :'sid', 1, 'animal', 'map_pick', NULL);
UPDATE public.survey_sessions SET started_at = now() - interval '1 hour' WHERE id = :'sid';
DO $$ BEGIN BEGIN INSERT INTO public.survey_responses (survey_id, count, observation_kind) VALUES ('5a000000-0000-0000-0000-000000000001', 2, 'zero_sighting'); RAISE EXCEPTION 'zero with count'; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok 2 a zero sighting cannot carry a count'; END; END $$;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
SELECT public.close_survey_session(:'sid', 1800, 'complete', NULL);
DO $$ DECLARE e record; BEGIN
  SELECT * INTO e FROM public.survey_session_effort;
  IF e.animals_counted <> 4 OR e.zero_sighting_records <> 1 OR e.animals_per_observer_hour <> 2.00 OR e.coverage <> 'complete' THEN RAISE EXCEPTION 'effort wrong: %', row_to_json(e); END IF;
  RAISE NOTICE 'ok 3 effort: % animals, % zero records, % per observer-hour over % minutes', e.animals_counted, e.zero_sighting_records, e.animals_per_observer_hour, e.minutes; END $$;
DO $$ BEGIN PERFORM public.record_zero_sighting((SELECT id FROM public.survey_sessions LIMIT 1), NULL, NULL); RAISE EXCEPTION 'closed session accepted'; EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok 4 a closed session takes no more records'; END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.survey_sessions) + (SELECT count(*) FROM public.survey_session_effort) <> 0 THEN RAISE EXCEPTION 'leak'; END IF;
  BEGIN PERFORM public.start_survey_session('5a000000-0000-0000-0000-000000000001', NULL, 'route'); RAISE EXCEPTION 'foreign survey'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'ok 5 another organisation sees no sessions or effort and cannot start one'; END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.operational_audit_log WHERE entity_type = 'survey_session') <> 2 THEN RAISE EXCEPTION 'audit'; END IF; RAISE NOTICE 'ok 6 start and close are audited'; END $$;
