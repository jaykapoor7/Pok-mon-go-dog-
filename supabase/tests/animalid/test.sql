\set ON_ERROR_STOP on
-- people and records
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
INSERT INTO public.ngos VALUES ('11111111-1111-1111-1111-111111111111', 'Org one'), ('22222222-2222-2222-2222-222222222222', 'Org two');
INSERT INTO public.ngo_members VALUES ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'coordinator'),
  ('00000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'member'),
  ('00000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', 'coordinator');
INSERT INTO public.dogs (id, ngo_id, name) VALUES ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tiger'),
  ('d2000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Kalu'),
  ('d3000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'New one'),
  ('e1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Other org twin');
-- 768-d test vectors: e(i) has 1 at position i
CREATE FUNCTION pg_temp.e(i int, j int DEFAULT NULL) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || string_agg(CASE WHEN g = i THEN '1' WHEN g = j THEN '0.3' ELSE '0' END, ',' ORDER BY g) || ']' FROM generate_series(1, 768) g $$;
SELECT public.animalid_store_embedding('11111111-1111-1111-1111-111111111111', 'd1000000-0000-0000-0000-000000000001', 'dog', 'storage://animal-photos/org1/tiger.jpg', 'profile', 'dinov2_vitb14@1', pg_temp.e(1), '{}');
SELECT public.animalid_store_embedding('11111111-1111-1111-1111-111111111111', 'd2000000-0000-0000-0000-000000000002', 'dog', 'storage://animal-photos/org1/kalu.jpg', 'profile', 'dinov2_vitb14@1', pg_temp.e(2), '{}');
SELECT public.animalid_store_embedding('22222222-2222-2222-2222-222222222222', 'e1000000-0000-0000-0000-000000000001', 'dog', 'storage://animal-photos/org2/twin.jpg', 'profile', 'dinov2_vitb14@1', pg_temp.e(1), '{}');
INSERT INTO storage.objects (bucket_id, name) VALUES ('animalid-photos', '11111111-1111-1111-1111-111111111111/q.jpg');

-- 1. a plain member may not search; a coordinator may
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
DO $$ BEGIN PERFORM public.animalid_request_search('storage://animalid-photos/11111111-1111-1111-1111-111111111111/q.jpg'); RAISE EXCEPTION 'member searched'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok 1a member refused'; END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
DO $$ BEGIN PERFORM public.animalid_request_search('storage://animalid-photos/22222222-2222-2222-2222-222222222222/q.jpg'); RAISE EXCEPTION 'foreign path accepted'; EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok 1b other organisation folder refused'; END $$;
SELECT public.animalid_request_search('storage://animalid-photos/11111111-1111-1111-1111-111111111111/q.jpg') AS job \gset
DO $$ BEGIN PERFORM embedding FROM public.animalid_embeddings LIMIT 1; RAISE EXCEPTION 'embeddings readable'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok 1d embeddings unreadable by users'; END $$;
DO $$ BEGIN PERFORM public.animalid_claim_job(); RAISE EXCEPTION 'user claimed'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok 1e worker functions closed to users'; END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.operational_audit_log WHERE action = 'identity_search_requested') <> 1 THEN RAISE EXCEPTION 'no audit'; END IF; RAISE NOTICE 'ok 1c search queued and audited'; END $$;

-- 2. the worker claims, completes with a vector close to Tiger
SET ROLE service_role;
SELECT (public.animalid_claim_job()).id = :'job' AS claimed \gset
\if :claimed
\echo ok 2a worker claimed the job
\endif
SELECT public.animalid_complete_search(:'job', pg_temp.e(1, 2), '{"ok": true}', 5) AS n \gset
RESET ROLE;
DO $$ DECLARE r record; BEGIN
  SELECT array_agg(dog_id ORDER BY rank) AS ids, array_agg(band ORDER BY rank) AS bands INTO r FROM public.animalid_candidates;
  IF r.ids[1] <> 'd1000000-0000-0000-0000-000000000001' OR 'e1000000-0000-0000-0000-000000000001' = ANY (r.ids) THEN RAISE EXCEPTION 'wrong candidates %', r.ids; END IF;
  RAISE NOTICE 'ok 2b candidates: own organisation only, closest first (bands %)', r.bands; END $$;

-- 3. decisions: same animal, no second identity, reverse, then new animal
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
SELECT public.animalid_decide(:'job', 'not_this_animal', 'd2000000-0000-0000-0000-000000000002', NULL) IS NOT NULL AS ok3a \gset
SELECT public.animalid_decide(:'job', 'same_animal', 'd1000000-0000-0000-0000-000000000001', 'notch matches') AS dec \gset
DO $$ BEGIN PERFORM public.animalid_decide((SELECT job_id FROM public.animalid_decisions LIMIT 1), 'same_animal', 'd2000000-0000-0000-0000-000000000002', NULL); RAISE EXCEPTION 'two identities'; EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok 3b a second identity needs a reversal first'; END $$;
DO $$ BEGIN PERFORM public.animalid_decide((SELECT job_id FROM public.animalid_decisions LIMIT 1), 'same_animal', 'e1000000-0000-0000-0000-000000000001', NULL); RAISE EXCEPTION 'foreign dog'; EXCEPTION WHEN insufficient_privilege OR raise_exception THEN RAISE NOTICE 'ok 3c another organisation''s animal refused'; END $$;
DO $$ BEGIN PERFORM public.animalid_reverse((SELECT id FROM public.animalid_decisions WHERE decision = 'same_animal'), ''); RAISE EXCEPTION 'reversed without reason'; EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok 3d reversal needs a reason'; END $$;
SELECT public.animalid_reverse(:'dec', 'wrong ear notch');
SELECT public.animalid_decide(:'job', 'new_animal', 'd3000000-0000-0000-0000-000000000003', NULL) IS NOT NULL AS ok3e \gset
SELECT public.animalid_dataset_summary() AS summary \gset
\echo summary :summary
RESET ROLE;
DO $$ BEGIN
  IF (SELECT dog_id FROM public.animalid_embeddings WHERE source = 'search') <> 'd3000000-0000-0000-0000-000000000003' THEN RAISE EXCEPTION 'search photo not linked to decided animal'; END IF;
  IF (SELECT count(*) FROM public.operational_audit_log WHERE entity_type = 'animalid_decision') <> 4 THEN RAISE EXCEPTION 'decision audit rows %', (SELECT count(*) FROM public.operational_audit_log WHERE entity_type = 'animalid_decision'); END IF;
  IF EXISTS (SELECT 1 FROM public.animalid_decisions WHERE training_eligible) THEN RAISE EXCEPTION 'eligible without consent'; END IF;
  RAISE NOTICE 'ok 3e photo linked to the new animal; every decision audited; nothing training-eligible without consent'; END $$;

-- 4. another organisation sees nothing and cannot decide
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.animalid_jobs) + (SELECT count(*) FROM public.animalid_candidates) + (SELECT count(*) FROM public.animalid_decisions) <> 0 THEN RAISE EXCEPTION 'leak'; END IF;
  RAISE NOTICE 'ok 4a other organisation reads no jobs, candidates or decisions'; END $$;
DO $$ BEGIN PERFORM public.animalid_decide((SELECT id FROM public.animalid_jobs LIMIT 1), 'same_animal', 'e1000000-0000-0000-0000-000000000001', NULL); RAISE EXCEPTION 'decided foreign job'; EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'ok 4b cannot decide another organisation''s search'; END $$;
-- a person with no organisation (e.g. a municipal reviewer) is refused
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
DO $$ BEGIN PERFORM public.animalid_dataset_summary(); RAISE EXCEPTION 'outsider read summary'; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok 4c no organisation, no access'; END $$;
RESET ROLE;

-- 5. failed jobs: retries stop after three attempts
INSERT INTO public.animalid_jobs (ngo_id, kind, requested_by, photo_uri, status, attempts, started_at, model_version)
VALUES ('11111111-1111-1111-1111-111111111111', 'search', '00000000-0000-0000-0000-00000000000a', 'storage://animalid-photos/x', 'running', 3, now() - interval '20 minutes', 'dinov2_vitb14@1');
SET ROLE service_role; SELECT public.animalid_claim_job() IS NULL AS none_left \gset
RESET ROLE;
DO $$ BEGIN IF (SELECT status FROM public.animalid_jobs WHERE photo_uri = 'storage://animalid-photos/x') <> 'failed' THEN RAISE EXCEPTION 'stuck job not failed'; END IF; RAISE NOTICE 'ok 5 a job stuck after three attempts is marked failed'; END $$;
