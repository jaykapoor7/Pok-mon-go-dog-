-- StrayPaw AnimalID: photo-based identity SUGGESTIONS for an organisation's own animals.
--
-- Additive only: new tables, functions and one private storage bucket. No
-- existing table, row or policy is changed. Apply to STAGING first; production
-- needs the owner's approval. Feature-flagged in the app (animal_id).
--
-- How it works
--   1. An authorised member (admin, coordinator, veterinarian) uploads a photo to
--      the private bucket animalid-photos under <ngo>/<file> and calls
--      animalid_request_search(). That only queues a job (with a daily cap):
--      uploads alone never trigger processing.
--   2. The separately deployed AnimalID worker (services/animalid) claims queued
--      jobs with the service role, checks image quality, computes the embedding
--      and calls animalid_complete_job(), which stores the embedding and the top
--      candidates from the SAME organisation and species only (pgvector cosine).
--   3. People decide: confirmed match, not a match, or a new animal. Decisions are
--      audited and can be reversed with a reason. Nothing merges animals or edits
--      a clinical history.
--
-- Similarity is raw cosine similarity of image embeddings. It is shown as such,
-- never as a probability of identity, until a model version is calibrated on
-- an evaluation set (animalid_model_versions.calibrated).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ── model versions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.animalid_model_versions (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_.@-]{3,64}$'),
  backbone text NOT NULL,
  dim int NOT NULL CHECK (dim BETWEEN 64 AND 4096),
  weights_licence text NOT NULL,
  -- Raw-similarity bands used for display until calibrated. Not probabilities.
  strong_at real NOT NULL DEFAULT 0.80,
  possible_at real NOT NULL DEFAULT 0.65,
  calibrated boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS animalid_one_active ON public.animalid_model_versions (active) WHERE active;
INSERT INTO public.animalid_model_versions (id, backbone, dim, weights_licence, active, notes)
VALUES ('dinov2_vitb14@1', 'facebook/dinov2-base (ViT-B/14), CLS embedding, L2-normalised', 768, 'Apache-2.0', true,
        'Pretrained DINOv2 without identity fine-tuning. Not validated for dog identity; thresholds are uncalibrated display bands.')
ON CONFLICT (id) DO NOTHING;

-- ── evaluation runs (filled by the research pipeline, real runs only) ───────
CREATE TABLE IF NOT EXISTS public.animalid_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version text NOT NULL REFERENCES public.animalid_model_versions(id),
  dataset_version text NOT NULL,
  protocol text NOT NULL,
  metrics jsonb NOT NULL,
  report_uri text,
  run_at timestamptz NOT NULL DEFAULT now()
);

-- ── embeddings: one per photo and model version ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.animalid_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE,   -- null for a search photo not yet decided
  species text NOT NULL DEFAULT 'dog',
  photo_uri text NOT NULL CHECK (photo_uri ~ '^(storage://[a-z0-9-]+/|https://)'),
  source text NOT NULL CHECK (source IN ('search', 'profile', 'evidence')),
  model_version text NOT NULL REFERENCES public.animalid_model_versions(id),
  embedding extensions.vector(768) NOT NULL,
  quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_uri, model_version)
);
CREATE INDEX IF NOT EXISTS animalid_embeddings_scope ON public.animalid_embeddings (ngo_id, species, model_version) WHERE dog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS animalid_embeddings_hnsw ON public.animalid_embeddings USING hnsw (embedding extensions.vector_cosine_ops);

-- ── jobs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.animalid_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  kind text NOT NULL CHECK (kind IN ('search', 'index')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'rejected_quality')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  photo_uri text,
  dog_id uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  species text NOT NULL DEFAULT 'dog',
  model_version text REFERENCES public.animalid_model_versions(id),
  attempts int NOT NULL DEFAULT 0,
  error text,
  quality jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  CHECK (kind <> 'search' OR photo_uri IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS animalid_jobs_queue ON public.animalid_jobs (status, created_at) WHERE status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS animalid_jobs_org ON public.animalid_jobs (ngo_id, created_at DESC);

-- ── candidates: what the model suggested for a search job ───────────────────
CREATE TABLE IF NOT EXISTS public.animalid_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.animalid_jobs(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  rank int NOT NULL,
  similarity real NOT NULL,
  band text NOT NULL CHECK (band IN ('strong', 'possible', 'below')),
  matched_photo_uri text NOT NULL,
  model_version text NOT NULL REFERENCES public.animalid_model_versions(id),
  UNIQUE (job_id, dog_id)
);

-- ── human decisions (the label of record) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.animalid_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  job_id uuid NOT NULL REFERENCES public.animalid_jobs(id),
  decision text NOT NULL CHECK (decision IN ('same_animal', 'not_this_animal', 'new_animal')),
  dog_id uuid REFERENCES public.dogs(id),      -- the animal decided on (candidate, or the new record)
  reason text CHECK (reason IS NULL OR length(reason) <= 400),
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES auth.users(id),
  reversal_reason text,
  -- Eligible for future training only when the organisation has granted training
  -- use (animalid_training_consent) at the time of the decision. Never automatic training.
  training_eligible boolean NOT NULL DEFAULT false,
  CHECK (decision = 'not_this_animal' OR dog_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS animalid_decisions_job ON public.animalid_decisions (job_id);

-- ── per-organisation permission for training use (off by default) ────────────
CREATE TABLE IF NOT EXISTS public.animalid_training_consent (
  ngo_id uuid PRIMARY KEY REFERENCES public.ngos(id),
  allowed boolean NOT NULL DEFAULT false,
  terms_version text,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz
);

-- ── access: organisation members read their own rows; writes only via functions ─
ALTER TABLE public.animalid_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animalid_training_consent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.animalid_model_versions, public.animalid_evaluations, public.animalid_embeddings, public.animalid_jobs,
  public.animalid_candidates, public.animalid_decisions, public.animalid_training_consent FROM anon, authenticated;
GRANT SELECT ON public.animalid_model_versions, public.animalid_evaluations TO authenticated;
GRANT SELECT ON public.animalid_jobs, public.animalid_candidates, public.animalid_decisions, public.animalid_training_consent TO authenticated;
-- Embedding vectors are never readable by the browser.
DROP POLICY IF EXISTS animalid_models_read ON public.animalid_model_versions;
CREATE POLICY animalid_models_read ON public.animalid_model_versions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS animalid_evals_read ON public.animalid_evaluations;
CREATE POLICY animalid_evals_read ON public.animalid_evaluations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS animalid_jobs_read ON public.animalid_jobs;
CREATE POLICY animalid_jobs_read ON public.animalid_jobs FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));
DROP POLICY IF EXISTS animalid_candidates_read ON public.animalid_candidates;
CREATE POLICY animalid_candidates_read ON public.animalid_candidates FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));
DROP POLICY IF EXISTS animalid_decisions_read ON public.animalid_decisions;
CREATE POLICY animalid_decisions_read ON public.animalid_decisions FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));
DROP POLICY IF EXISTS animalid_consent_read ON public.animalid_training_consent;
CREATE POLICY animalid_consent_read ON public.animalid_training_consent FOR SELECT TO authenticated USING (ngo_id = (SELECT public.my_ngo()));

-- ── private bucket for search photos: <ngo>/<file>, own organisation only ────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('animalid-photos', 'animalid-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS animalid_photos_insert ON storage.objects;
DROP POLICY IF EXISTS animalid_photos_read ON storage.objects;
CREATE POLICY animalid_photos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'animalid-photos' AND (storage.foldername(name))[1] = (SELECT public.my_ngo())::text
              AND EXISTS (SELECT 1 FROM public.ngo_members m WHERE m.user_id = auth.uid() AND m.ngo_id = (SELECT public.my_ngo()) AND m.role IN ('admin', 'coordinator', 'veterinarian')));
CREATE POLICY animalid_photos_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'animalid-photos' AND (storage.foldername(name))[1] = (SELECT public.my_ngo())::text);

-- ── who may use AnimalID ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.animalid_reviewer() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo();
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ngo_members m WHERE m.user_id = auth.uid() AND m.ngo_id = org AND m.role IN ('admin', 'coordinator', 'veterinarian')) THEN
    RAISE EXCEPTION 'A coordinator, veterinarian or admin uses identity search' USING ERRCODE = '42501';
  END IF;
  RETURN org;
END $$;
REVOKE ALL ON FUNCTION public.animalid_reviewer() FROM PUBLIC, anon;

-- ── queue a search for one uploaded photo (no processing happens here) ──────
CREATE OR REPLACE FUNCTION public.animalid_request_search(p_photo_uri text, p_species text DEFAULT 'dog')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.animalid_reviewer(); jid uuid; mv text;
BEGIN
  IF p_photo_uri IS NULL OR p_photo_uri NOT LIKE 'storage://animalid-photos/' || org::text || '/%' THEN
    RAISE EXCEPTION 'Upload the photo to your organisation''s identity folder first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'animalid-photos' AND o.name = substr(p_photo_uri, length('storage://animalid-photos/') + 1)) THEN
    RAISE EXCEPTION 'The photo was not found';
  END IF;
  IF p_species NOT IN ('dog') THEN RAISE EXCEPTION 'Identity search is validated for dogs only'; END IF;
  IF (SELECT count(*) FROM public.animalid_jobs j WHERE j.ngo_id = org AND j.created_at > now() - interval '1 day') >= 200 THEN
    RAISE EXCEPTION 'Your organisation has reached today''s limit of 200 identity searches' USING ERRCODE = '54000';
  END IF;
  SELECT id INTO mv FROM public.animalid_model_versions WHERE active;
  IF mv IS NULL THEN RAISE EXCEPTION 'Identity search is not switched on'; END IF;
  INSERT INTO public.animalid_jobs (ngo_id, kind, requested_by, photo_uri, species, model_version)
  VALUES (org, 'search', auth.uid(), p_photo_uri, p_species, mv) RETURNING id INTO jid;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, auth.uid(), 'animalid_job', jid, 'identity_search_requested', jsonb_build_object('photo_uri', p_photo_uri, 'model_version', mv));
  RETURN jid;
END $$;
REVOKE ALL ON FUNCTION public.animalid_request_search(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.animalid_request_search(text, text) TO authenticated;

-- ── queue indexing of the organisation's profile photos (explicit, capped) ───
CREATE OR REPLACE FUNCTION public.animalid_request_index()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.animalid_reviewer(); jid uuid; mv text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.animalid_jobs WHERE ngo_id = org AND kind = 'index' AND status IN ('queued', 'running')) THEN
    RAISE EXCEPTION 'Indexing is already queued for your organisation';
  END IF;
  SELECT id INTO mv FROM public.animalid_model_versions WHERE active;
  INSERT INTO public.animalid_jobs (ngo_id, kind, requested_by, model_version) VALUES (org, 'index', auth.uid(), mv) RETURNING id INTO jid;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, auth.uid(), 'animalid_job', jid, 'identity_index_requested', jsonb_build_object('model_version', mv));
  RETURN jid;
END $$;
REVOKE ALL ON FUNCTION public.animalid_request_index() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.animalid_request_index() TO authenticated;

-- ── worker side (service role only) ─────────────────────────────────────────
-- Claim the oldest queued job. Jobs stuck in running for 10 minutes are retried, at most 3 attempts.
CREATE OR REPLACE FUNCTION public.animalid_claim_job()
RETURNS public.animalid_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE j public.animalid_jobs;
BEGIN
  UPDATE public.animalid_jobs SET status = 'failed', error = 'Gave up after 3 attempts', finished_at = now()
   WHERE status = 'running' AND started_at < now() - interval '10 minutes' AND attempts >= 3;
  SELECT * INTO j FROM public.animalid_jobs
   WHERE status = 'queued' OR (status = 'running' AND started_at < now() - interval '10 minutes')
   ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.animalid_jobs SET status = 'running', started_at = now(), attempts = attempts + 1 WHERE id = j.id RETURNING * INTO j;
  RETURN j;
END $$;

-- Store one embedding (profile/evidence photos of known animals, or the search photo).
CREATE OR REPLACE FUNCTION public.animalid_store_embedding(p_ngo uuid, p_dog uuid, p_species text, p_photo_uri text, p_source text, p_model text, p_embedding text, p_quality jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE eid uuid;
BEGIN
  IF p_dog IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.dogs WHERE id = p_dog AND ngo_id = p_ngo) THEN RAISE EXCEPTION 'Animal outside organisation'; END IF;
  INSERT INTO public.animalid_embeddings (ngo_id, dog_id, species, photo_uri, source, model_version, embedding, quality)
  VALUES (p_ngo, p_dog, p_species, p_photo_uri, p_source, p_model, p_embedding::extensions.vector, coalesce(p_quality, '{}'::jsonb))
  ON CONFLICT (photo_uri, model_version) DO UPDATE SET dog_id = excluded.dog_id, embedding = excluded.embedding, quality = excluded.quality
  RETURNING id INTO eid;
  RETURN eid;
END $$;

-- Finish a search job: candidates from the same organisation and species only.
CREATE OR REPLACE FUNCTION public.animalid_complete_search(p_job uuid, p_embedding text, p_quality jsonb, p_k int DEFAULT 5)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE j public.animalid_jobs; m public.animalid_model_versions; n int;
BEGIN
  SELECT * INTO j FROM public.animalid_jobs WHERE id = p_job AND kind = 'search' AND status = 'running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job is not running'; END IF;
  SELECT * INTO m FROM public.animalid_model_versions WHERE id = j.model_version;
  PERFORM public.animalid_store_embedding(j.ngo_id, NULL, j.species, j.photo_uri, 'search', j.model_version, p_embedding, p_quality);
  INSERT INTO public.animalid_candidates (job_id, ngo_id, dog_id, rank, similarity, band, matched_photo_uri, model_version)
  SELECT p_job, j.ngo_id, best.dog_id, row_number() OVER (ORDER BY best.sim DESC), best.sim,
         CASE WHEN best.sim >= m.strong_at THEN 'strong' WHEN best.sim >= m.possible_at THEN 'possible' ELSE 'below' END,
         best.photo_uri, j.model_version
  FROM (
    SELECT DISTINCT ON (e.dog_id) e.dog_id, e.photo_uri, (1 - (e.embedding <=> p_embedding::extensions.vector))::real AS sim
    FROM public.animalid_embeddings e
    WHERE e.ngo_id = j.ngo_id AND e.species = j.species AND e.model_version = j.model_version AND e.dog_id IS NOT NULL
    ORDER BY e.dog_id, e.embedding <=> p_embedding::extensions.vector
  ) best
  ORDER BY best.sim DESC LIMIT greatest(1, least(p_k, 10));
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.animalid_jobs SET status = 'done', quality = p_quality, finished_at = now(), error = NULL WHERE id = p_job;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.animalid_fail_job(p_job uuid, p_status text, p_error text, p_quality jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_status NOT IN ('failed', 'rejected_quality', 'queued') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  UPDATE public.animalid_jobs SET status = p_status, error = left(p_error, 300), quality = coalesce(p_quality, quality),
    finished_at = CASE WHEN p_status = 'queued' THEN NULL ELSE now() END WHERE id = p_job;
END $$;

CREATE OR REPLACE FUNCTION public.animalid_finish_index(p_job uuid, p_indexed int, p_skipped int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.animalid_jobs SET status = 'done', finished_at = now(), quality = jsonb_build_object('indexed', p_indexed, 'skipped', p_skipped) WHERE id = p_job AND kind = 'index';
END $$;

REVOKE ALL ON FUNCTION public.animalid_claim_job() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.animalid_store_embedding(uuid, uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.animalid_complete_search(uuid, text, jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.animalid_fail_job(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.animalid_finish_index(uuid, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.animalid_claim_job(), public.animalid_store_embedding(uuid, uuid, text, text, text, text, text, jsonb),
  public.animalid_complete_search(uuid, text, jsonb, int), public.animalid_fail_job(uuid, text, text, jsonb), public.animalid_finish_index(uuid, int, int) TO service_role;

-- ── human decisions ─────────────────────────────────────────────────────────
-- same_animal: the search photo shows this existing animal. not_this_animal: a
-- candidate is rejected. new_animal: the person registered a new animal (p_dog
-- is that new record). The search photo's embedding is linked to the decided
-- animal so it can be found next time; no animal record is merged or edited.
CREATE OR REPLACE FUNCTION public.animalid_decide(p_job uuid, p_decision text, p_dog uuid, p_reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.animalid_reviewer(); j public.animalid_jobs; did uuid; consent boolean;
BEGIN
  SELECT * INTO j FROM public.animalid_jobs WHERE id = p_job AND ngo_id = org AND kind = 'search' AND status = 'done';
  IF NOT FOUND THEN RAISE EXCEPTION 'That search is not finished or not yours'; END IF;
  IF p_decision NOT IN ('same_animal', 'not_this_animal', 'new_animal') THEN RAISE EXCEPTION 'Unknown decision'; END IF;
  IF p_dog IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.dogs WHERE id = p_dog AND ngo_id = org) THEN
    RAISE EXCEPTION 'That animal is not in your register' USING ERRCODE = '42501';
  END IF;
  IF p_decision = 'not_this_animal' AND NOT EXISTS (SELECT 1 FROM public.animalid_candidates WHERE job_id = p_job AND dog_id = p_dog) THEN
    RAISE EXCEPTION 'Reject one of the suggested animals';
  END IF;
  IF p_decision <> 'not_this_animal' AND EXISTS (SELECT 1 FROM public.animalid_decisions WHERE job_id = p_job AND decision <> 'not_this_animal' AND reversed_at IS NULL) THEN
    RAISE EXCEPTION 'This search already has an identity decision; reverse it first';
  END IF;
  SELECT coalesce(allowed, false) INTO consent FROM public.animalid_training_consent WHERE ngo_id = org;
  INSERT INTO public.animalid_decisions (ngo_id, job_id, decision, dog_id, reason, decided_by, training_eligible)
  VALUES (org, p_job, p_decision, p_dog, nullif(btrim(left(coalesce(p_reason, ''), 400)), ''), auth.uid(), coalesce(consent, false) AND p_decision <> 'not_this_animal')
  RETURNING id INTO did;
  IF p_decision <> 'not_this_animal' THEN
    UPDATE public.animalid_embeddings SET dog_id = p_dog WHERE photo_uri = j.photo_uri AND ngo_id = org AND dog_id IS NULL;
  END IF;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, auth.uid(), 'animalid_decision', did, 'identity_' || p_decision, jsonb_build_object('job_id', p_job, 'dog_id', p_dog, 'model_version', j.model_version));
  RETURN did;
END $$;
REVOKE ALL ON FUNCTION public.animalid_decide(uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.animalid_decide(uuid, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.animalid_reverse(p_decision uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.animalid_reviewer(); d public.animalid_decisions; j public.animalid_jobs;
BEGIN
  IF nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'Say why the decision is reversed'; END IF;
  SELECT * INTO d FROM public.animalid_decisions WHERE id = p_decision AND ngo_id = org AND reversed_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Decision not found or already reversed'; END IF;
  UPDATE public.animalid_decisions SET reversed_at = now(), reversed_by = auth.uid(), reversal_reason = left(p_reason, 400), training_eligible = false WHERE id = d.id;
  IF d.decision <> 'not_this_animal' THEN
    SELECT * INTO j FROM public.animalid_jobs WHERE id = d.job_id;
    UPDATE public.animalid_embeddings SET dog_id = NULL WHERE photo_uri = j.photo_uri AND ngo_id = org AND dog_id = d.dog_id AND source = 'search';
  END IF;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  VALUES (org, auth.uid(), 'animalid_decision', d.id, 'identity_decision_reversed', jsonb_build_object('decision', d.decision, 'dog_id', d.dog_id), jsonb_build_object('reason', left(p_reason, 400)));
END $$;
REVOKE ALL ON FUNCTION public.animalid_reverse(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.animalid_reverse(uuid, text) TO authenticated;

-- ── dataset composition for admins (counts only, own organisation) ───────────
CREATE OR REPLACE FUNCTION public.animalid_dataset_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH org AS (SELECT public.animalid_reviewer() AS id),
  live AS (SELECT d.* FROM public.animalid_decisions d, org WHERE d.ngo_id = org.id AND d.reversed_at IS NULL)
  SELECT jsonb_build_object(
    'indexed_photos', (SELECT count(*) FROM public.animalid_embeddings e, org WHERE e.ngo_id = org.id AND e.dog_id IS NOT NULL),
    'indexed_animals', (SELECT count(DISTINCT e.dog_id) FROM public.animalid_embeddings e, org WHERE e.ngo_id = org.id AND e.dog_id IS NOT NULL),
    'searches', (SELECT count(*) FROM public.animalid_jobs j, org WHERE j.ngo_id = org.id AND j.kind = 'search'),
    'confirmed_identities', (SELECT count(*) FROM live WHERE decision IN ('same_animal', 'new_animal')),
    'labelled_animals', (SELECT count(DISTINCT dog_id) FROM live WHERE decision IN ('same_animal', 'new_animal')),
    'repeat_encounter_animals', (SELECT count(*) FROM (SELECT dog_id FROM live WHERE decision = 'same_animal' GROUP BY dog_id HAVING count(*) >= 2) x),
    'rejections', (SELECT count(*) FROM live WHERE decision = 'not_this_animal'),
    'reversals', (SELECT count(*) FROM public.animalid_decisions d, org WHERE d.ngo_id = org.id AND d.reversed_at IS NOT NULL),
    'conflicts', (SELECT count(*) FROM (SELECT job_id FROM live WHERE decision <> 'not_this_animal' GROUP BY job_id HAVING count(DISTINCT dog_id) > 1) x),
    'training_eligible', (SELECT count(*) FROM live WHERE training_eligible),
    'training_allowed', (SELECT coalesce(allowed, false) FROM public.animalid_training_consent c, org WHERE c.ngo_id = org.id)
  );
$$;
REVOKE ALL ON FUNCTION public.animalid_dataset_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.animalid_dataset_summary() TO authenticated;
