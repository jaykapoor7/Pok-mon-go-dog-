CREATE TABLE IF NOT EXISTS public.oh_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.oh_areas(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('country', 'state', 'district', 'city', 'zone', 'ward', 'locality')),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  code text CHECK (code IS NULL OR length(code) <= 40),
  time_zone text,
  geometry jsonb,
  source text NOT NULL CHECK (length(source) BETWEEN 3 AND 200),
  illustrative boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (geometry IS NULL OR geometry->>'type' IN ('Polygon', 'MultiPolygon'))
);
CREATE INDEX IF NOT EXISTS oh_areas_parent ON public.oh_areas (parent_id);
CREATE TABLE IF NOT EXISTS public.oh_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('coordinator', 'municipal', 'state', 'hospital', 'clinic', 'laboratory', 'ngo', 'research', 'training')),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  short_name text CHECK (short_name IS NULL OR length(short_name) <= 40),
  ngo_id uuid UNIQUE REFERENCES public.ngos(id),
  area_id uuid REFERENCES public.oh_areas(id),
  address text CHECK (address IS NULL OR length(address) <= 300),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  hours text CHECK (hours IS NULL OR length(hours) <= 120),
  lat double precision CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng double precision CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  listed_publicly boolean NOT NULL DEFAULT false,
  time_zone text NOT NULL DEFAULT 'Asia/Kolkata',
  illustrative boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'ngo' OR ngo_id IS NOT NULL),
  CHECK (NOT listed_publicly OR (lat IS NOT NULL AND lng IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.oh_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 140),
  parent_id uuid REFERENCES public.oh_programmes(id) ON DELETE SET NULL,
  summary text CHECK (summary IS NULL OR length(summary) <= 600),
  status text NOT NULL DEFAULT 'pilot' CHECK (status IN ('planning', 'pilot', 'active', 'closed')),
  vaccination_target numeric NOT NULL DEFAULT 0.70 CHECK (vaccination_target > 0 AND vaccination_target <= 1),
  time_zone text NOT NULL DEFAULT 'Asia/Kolkata',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan text NOT NULL DEFAULT 'pilot' CHECK (plan IN ('pilot', 'programme', 'state', 'national')),
  illustrative boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE TABLE IF NOT EXISTS public.oh_programme_areas (
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.oh_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (programme_id, area_id)
);
CREATE TABLE IF NOT EXISTS public.oh_participations (
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  responsibilities text CHECK (responsibilities IS NULL OR length(responsibilities) <= 400),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (programme_id, organisation_id)
);
CREATE INDEX IF NOT EXISTS oh_participations_org ON public.oh_participations (organisation_id);
CREATE TABLE IF NOT EXISTS public.oh_assignments (
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.oh_areas(id) ON DELETE CASCADE,
  duty text NOT NULL CHECK (duty IN ('animal_followup', 'vaccination', 'sample_collection')),
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  PRIMARY KEY (programme_id, area_id, duty)
);
CREATE TABLE IF NOT EXISTS public.oh_members (
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('lead', 'coordinator', 'clinician', 'nurse', 'records', 'lab_scientist', 'analyst', 'field', 'trainer')),
  display_name text CHECK (display_name IS NULL OR length(display_name) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);
CREATE INDEX IF NOT EXISTS oh_members_user ON public.oh_members (user_id);
CREATE TABLE IF NOT EXISTS public.oh_role_capabilities (
  role text NOT NULL,
  capability text NOT NULL,
  PRIMARY KEY (role, capability)
);
CREATE TABLE IF NOT EXISTS public.oh_capability_overrides (
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  role text NOT NULL,
  capability text NOT NULL,
  allowed boolean NOT NULL,
  PRIMARY KEY (organisation_id, role, capability)
);
INSERT INTO public.oh_role_capabilities (role, capability) VALUES
  ('lead','manage'),('lead','invite'),('lead','oversee'),('lead','confirm_service'),('lead','record_exposure'),('lead','view_register'),('lead','act_handoff'),('lead','raise_handoff'),('lead','send_sample'),('lead','record_training'),('lead','record_estimate'),('lead','lab_step'),
  ('coordinator','invite'),('coordinator','oversee'),('coordinator','confirm_service'),('coordinator','act_handoff'),('coordinator','raise_handoff'),('coordinator','send_sample'),('coordinator','record_training'),('coordinator','record_estimate'),
  ('clinician','assess'),('clinician','prescribe'),('clinician','record_dose'),('clinician','record_exposure'),('clinician','view_register'),('clinician','log_reminder'),('clinician','confirm_service'),('clinician','act_handoff'),('clinician','send_sample'),
  ('nurse','record_dose'),('nurse','record_exposure'),('nurse','view_register'),('nurse','log_reminder'),('nurse','confirm_service'),('nurse','act_handoff'),
  ('records','record_exposure'),('records','view_register'),('records','log_reminder'),('records','confirm_service'),
  ('lab_scientist','lab_step'),('lab_scientist','confirm_service'),('lab_scientist','act_handoff'),('lab_scientist','record_training'),
  ('field','act_handoff'),('field','send_sample'),
  ('analyst','analyse'),
  ('trainer','record_training')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.oh_invites (
  code text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  role text NOT NULL,
  email text CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  display_name text CHECK (display_name IS NULL OR length(display_name) <= 80),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz
);
CREATE OR REPLACE FUNCTION public.oh_my_memberships()
RETURNS TABLE (organisation_id uuid, kind text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT o.id, o.kind, m.role FROM public.oh_members m JOIN public.oh_organisations o ON o.id = m.organisation_id WHERE m.user_id = auth.uid()
  UNION
  SELECT o.id, o.kind, CASE WHEN nm.role IN ('admin', 'coordinator') THEN 'coordinator' WHEN nm.role = 'veterinarian' THEN 'clinician' ELSE 'field' END
    FROM public.oh_organisations o JOIN public.ngo_members nm ON nm.ngo_id = o.ngo_id
   WHERE o.kind = 'ngo' AND nm.user_id = auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.oh_members x WHERE x.organisation_id = o.id AND x.user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.oh_role_in(p_org uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT role FROM public.oh_my_memberships() WHERE organisation_id = p_org
   ORDER BY CASE role WHEN 'lead' THEN 0 WHEN 'clinician' THEN 1 WHEN 'coordinator' THEN 2 ELSE 3 END LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.oh_can(p_org uuid, p_capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH r AS (SELECT public.oh_role_in(p_org) AS role)
  SELECT CASE
    WHEN (SELECT role FROM r) IS NULL THEN false
    WHEN p_capability IN ('assess', 'prescribe') THEN (SELECT role FROM r) = 'clinician'
    ELSE coalesce(
      (SELECT allowed FROM public.oh_capability_overrides o WHERE o.organisation_id = p_org AND o.role = (SELECT role FROM r) AND o.capability = p_capability),
      EXISTS (SELECT 1 FROM public.oh_role_capabilities c WHERE c.role = (SELECT role FROM r) AND c.capability = p_capability))
  END
$$;
CREATE OR REPLACE FUNCTION public.oh_my_capabilities(p_org uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(array_agg(c ORDER BY c), '{}') FROM (SELECT DISTINCT capability c FROM public.oh_role_capabilities) x WHERE public.oh_can(p_org, c)
$$;
CREATE OR REPLACE FUNCTION public.oh_programme_tree(p_programme uuid)
RETURNS TABLE (id uuid, depth int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE t AS (SELECT p.id, 0 AS depth FROM public.oh_programmes p WHERE p.id = p_programme
    UNION ALL SELECT c.id, t.depth + 1 FROM public.oh_programmes c JOIN t ON c.parent_id = t.id WHERE t.depth < 6)
  SELECT id, depth FROM t
$$;
CREATE OR REPLACE FUNCTION public.oh_programme_line(p_programme uuid)
RETURNS TABLE (id uuid, depth int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE t AS (SELECT p.id, p.parent_id, 0 AS depth FROM public.oh_programmes p WHERE p.id = p_programme
    UNION ALL SELECT a.id, a.parent_id, t.depth + 1 FROM public.oh_programmes a JOIN t ON a.id = t.parent_id WHERE t.depth < 6)
  SELECT id, depth FROM t
$$;
CREATE OR REPLACE FUNCTION public.oh_programme_areas_all(p_programme uuid)
RETURNS TABLE (area_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE a AS (
    SELECT pa.area_id AS id, 0 AS d FROM public.oh_programme_areas pa WHERE pa.programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme))
    UNION SELECT c.id, a.d + 1 FROM public.oh_areas c JOIN a ON c.parent_id = a.id WHERE a.d < 8)
  SELECT DISTINCT id FROM a
$$;
CREATE OR REPLACE FUNCTION public.oh_programme_orgs(p_programme uuid)
RETURNS TABLE (organisation_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT organisation_id FROM public.oh_participations WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme))
$$;
CREATE OR REPLACE FUNCTION public.oh_in_programme(p_programme uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
                  WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)))
$$;
CREATE OR REPLACE FUNCTION public.oh_can_oversee(p_programme uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
                  WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)) AND m.kind IN ('coordinator', 'municipal', 'state') AND public.oh_can(m.organisation_id, 'oversee'))
$$;
CREATE OR REPLACE FUNCTION public.oh_can_manage(p_programme uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
                  WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)) AND m.kind IN ('coordinator', 'state') AND public.oh_can(m.organisation_id, 'manage'))
$$;
CREATE OR REPLACE FUNCTION public.oh_org_today(p_org uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (now() AT TIME ZONE coalesce((SELECT time_zone FROM public.oh_organisations WHERE id = p_org), 'Asia/Kolkata'))::date
$$;
CREATE OR REPLACE FUNCTION public.oh_today(p_programme uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (now() AT TIME ZONE coalesce((SELECT time_zone FROM public.oh_programmes WHERE id = p_programme), 'Asia/Kolkata'))::date
$$;
CREATE OR REPLACE FUNCTION public.oh_cfg_int(p_programme uuid, p_key text, p_default int, p_min int, p_max int)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT least(p_max, greatest(p_min, coalesce((SELECT (config->>p_key)::int FROM public.oh_programmes WHERE id = p_programme), p_default)))
$$;
CREATE OR REPLACE FUNCTION public.oh_area_name(p_area uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$ SELECT name FROM public.oh_areas WHERE id = p_area $$;
CREATE OR REPLACE FUNCTION public.oh_need(p_ok boolean, p_message text DEFAULT 'You do not have access to this')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION '%', p_message USING ERRCODE = '42501'; END IF; END $$;
CREATE OR REPLACE FUNCTION public.oh_actor_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce((SELECT display_name FROM public.oh_members WHERE user_id = auth.uid() AND display_name IS NOT NULL LIMIT 1), 'A team member')
$$;
CREATE OR REPLACE FUNCTION public.oh_suppress(n bigint, p_below int DEFAULT 5)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN n IS NULL THEN 'null'::jsonb WHEN n = 0 THEN '0'::jsonb WHEN n < greatest(p_below, 5) THEN '"<5"'::jsonb ELSE to_jsonb(n) END $$;
CREATE OR REPLACE FUNCTION public.oh_is_facility(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.oh_organisations WHERE id = p_org AND kind IN ('hospital', 'clinic'))
$$;
CREATE OR REPLACE FUNCTION public.oh_code(p_prefix text, p_org uuid)
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT p_prefix || '-' || to_char(public.oh_org_today(p_org), 'YYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
$$;
CREATE TABLE IF NOT EXISTS public.oh_service_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('arv', 'rig', 'wound_care', 'dog_vaccination', 'rabies_testing')),
  status text NOT NULL CHECK (status IN ('available', 'limited', 'unavailable')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  verified_by uuid REFERENCES auth.users(id),
  verified_by_name text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  CHECK (valid_until > verified_at AND valid_until <= verified_at + interval '14 days')
);
CREATE INDEX IF NOT EXISTS oh_service_latest ON public.oh_service_status (organisation_id, service, verified_at DESC);
CREATE TABLE IF NOT EXISTS public.oh_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.oh_programmes(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('animal_followup', 'sample_request', 'result_notice', 'service_gap', 'vaccination_request')),
  from_org uuid REFERENCES public.oh_organisations(id),
  to_org uuid NOT NULL REFERENCES public.oh_organisations(id),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 160),
  detail text CHECK (detail IS NULL OR length(detail) <= 1200),
  area_id uuid REFERENCES public.oh_areas(id),
  place text CHECK (place IS NULL OR length(place) <= 200),
  animal_id uuid REFERENCES public.dogs(id) ON DELETE SET NULL,
  sample_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'done', 'declined')),
  due_on date,
  outcome text CHECK (outcome IS NULL OR length(outcome) <= 600),
  dedupe_key text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by_name text
);
CREATE INDEX IF NOT EXISTS oh_handoffs_to ON public.oh_handoffs (to_org, status, created_at DESC);
CREATE INDEX IF NOT EXISTS oh_handoffs_programme ON public.oh_handoffs (programme_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS oh_handoffs_open_dedupe ON public.oh_handoffs (to_org, dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('open', 'accepted');
CREATE TABLE IF NOT EXISTS public.oh_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  submitted_by uuid NOT NULL REFERENCES public.oh_organisations(id),
  laboratory_id uuid NOT NULL REFERENCES public.oh_organisations(id),
  animal_id uuid REFERENCES public.dogs(id) ON DELETE SET NULL,
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'cattle', 'monkey', 'wildlife', 'other')),
  sample_type text NOT NULL CHECK (sample_type IN ('brain_tissue', 'saliva', 'csf', 'serum', 'other')),
  reason text CHECK (reason IS NULL OR length(reason) <= 400),
  collected_on date NOT NULL,
  collected_by_name text,
  area_id uuid REFERENCES public.oh_areas(id),
  place text CHECK (place IS NULL OR length(place) <= 200),
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'dispatched', 'received', 'testing', 'resulted', 'rejected')),
  result text CHECK (result IS NULL OR result IN ('positive', 'negative', 'inconclusive')),
  method text CHECK (method IS NULL OR length(method) <= 120),
  result_note text CHECK (result_note IS NULL OR length(result_note) <= 600),
  resulted_at timestamptz,
  resulted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'resulted') = (result IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS oh_samples_lab ON public.oh_samples (laboratory_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS oh_samples_submitter ON public.oh_samples (submitted_by, created_at DESC);
CREATE TABLE IF NOT EXISTS public.oh_sample_events (
  id bigserial PRIMARY KEY,
  sample_id uuid NOT NULL REFERENCES public.oh_samples(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  actor uuid REFERENCES auth.users(id),
  actor_name text,
  organisation_id uuid REFERENCES public.oh_organisations(id),
  action text NOT NULL CHECK (action IN ('collected', 'dispatched', 'received', 'testing', 'resulted', 'rejected', 'note')),
  note text CHECK (note IS NULL OR length(note) <= 400)
);
CREATE INDEX IF NOT EXISTS oh_sample_events_sample ON public.oh_sample_events (sample_id, at);
CREATE TABLE IF NOT EXISTS public.oh_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.oh_areas(id) ON DELETE CASCADE,
  dogs_estimated int NOT NULL CHECK (dogs_estimated > 0),
  method text NOT NULL CHECK (length(method) BETWEEN 3 AND 200),
  source text NOT NULL CHECK (length(source) BETWEEN 3 AND 200),
  estimated_on date NOT NULL,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oh_estimates_latest ON public.oh_estimates (area_id, estimated_on DESC);
CREATE TABLE IF NOT EXISTS public.oh_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.oh_organisations(id),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 160),
  audience text NOT NULL CHECK (audience IN ('veterinarians', 'para_veterinarians', 'animal_handlers', 'laboratory', 'healthcare', 'community', 'mixed')),
  held_on date NOT NULL,
  participants int NOT NULL DEFAULT 0 CHECK (participants BETWEEN 0 AND 5000),
  institutions_reached int CHECK (institutions_reached IS NULL OR institutions_reached BETWEEN 0 AND 500),
  notes text CHECK (notes IS NULL OR length(notes) <= 600),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['oh_areas','oh_organisations','oh_programmes','oh_programme_areas','oh_participations','oh_assignments','oh_members','oh_role_capabilities','oh_capability_overrides','oh_invites','oh_service_status','oh_handoffs','oh_samples','oh_sample_events','oh_estimates','oh_trainings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
GRANT SELECT ON public.oh_areas, public.oh_organisations, public.oh_programmes, public.oh_programme_areas, public.oh_participations, public.oh_assignments, public.oh_members,
  public.oh_role_capabilities, public.oh_service_status, public.oh_handoffs, public.oh_samples, public.oh_sample_events, public.oh_estimates, public.oh_trainings TO authenticated;
DROP POLICY IF EXISTS oh_areas_read ON public.oh_areas;
CREATE POLICY oh_areas_read ON public.oh_areas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS oh_caps_read ON public.oh_role_capabilities;
CREATE POLICY oh_caps_read ON public.oh_role_capabilities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS oh_orgs_read ON public.oh_organisations;
CREATE POLICY oh_orgs_read ON public.oh_organisations FOR SELECT TO authenticated USING (
  public.oh_role_in(id) IS NOT NULL OR EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = oh_organisations.id AND public.oh_in_programme(pp.programme_id)));
DROP POLICY IF EXISTS oh_programmes_read ON public.oh_programmes;
CREATE POLICY oh_programmes_read ON public.oh_programmes FOR SELECT TO authenticated USING (public.oh_in_programme(id));
DROP POLICY IF EXISTS oh_parea_read ON public.oh_programme_areas;
CREATE POLICY oh_parea_read ON public.oh_programme_areas FOR SELECT TO authenticated USING (public.oh_in_programme(programme_id));
DROP POLICY IF EXISTS oh_part_read ON public.oh_participations;
CREATE POLICY oh_part_read ON public.oh_participations FOR SELECT TO authenticated USING (public.oh_in_programme(programme_id));
DROP POLICY IF EXISTS oh_assign_read ON public.oh_assignments;
CREATE POLICY oh_assign_read ON public.oh_assignments FOR SELECT TO authenticated USING (public.oh_in_programme(programme_id));
DROP POLICY IF EXISTS oh_members_read ON public.oh_members;
CREATE POLICY oh_members_read ON public.oh_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.oh_can(organisation_id, 'invite'));
DROP POLICY IF EXISTS oh_service_read ON public.oh_service_status;
CREATE POLICY oh_service_read ON public.oh_service_status FOR SELECT TO authenticated USING (
  public.oh_role_in(organisation_id) IS NOT NULL OR EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = oh_service_status.organisation_id AND public.oh_in_programme(pp.programme_id)));
DROP POLICY IF EXISTS oh_estimates_read ON public.oh_estimates;
CREATE POLICY oh_estimates_read ON public.oh_estimates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS oh_trainings_read ON public.oh_trainings;
CREATE POLICY oh_trainings_read ON public.oh_trainings FOR SELECT TO authenticated USING (public.oh_in_programme(programme_id));
DROP POLICY IF EXISTS oh_handoffs_read ON public.oh_handoffs;
CREATE POLICY oh_handoffs_read ON public.oh_handoffs FOR SELECT TO authenticated USING (
  public.oh_role_in(to_org) IS NOT NULL OR (from_org IS NOT NULL AND public.oh_role_in(from_org) IS NOT NULL) OR (programme_id IS NOT NULL AND public.oh_can_oversee(programme_id)));
DROP POLICY IF EXISTS oh_samples_read ON public.oh_samples;
CREATE POLICY oh_samples_read ON public.oh_samples FOR SELECT TO authenticated USING (
  public.oh_role_in(laboratory_id) IS NOT NULL OR public.oh_role_in(submitted_by) IS NOT NULL
  OR EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = oh_samples.laboratory_id AND public.oh_can_oversee(pp.programme_id)));
DROP POLICY IF EXISTS oh_sample_events_read ON public.oh_sample_events;
CREATE POLICY oh_sample_events_read ON public.oh_sample_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.oh_samples s WHERE s.id = sample_id));
CREATE SCHEMA IF NOT EXISTS health;
REVOKE ALL ON SCHEMA health FROM PUBLIC;
DO $$ BEGIN EXECUTE 'REVOKE ALL ON SCHEMA health FROM anon, authenticated'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS health.citizen_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.oh_programmes(id) ON DELETE SET NULL,
  facility_id uuid REFERENCES public.oh_organisations(id),
  happened_on date NOT NULL,
  area_id uuid REFERENCES public.oh_areas(id),
  place text CHECK (place IS NULL OR length(place) <= 200),
  animal_species text NOT NULL DEFAULT 'dog' CHECK (animal_species IN ('dog', 'cat', 'cattle', 'monkey', 'wildlife', 'other', 'unknown')),
  animal_description text CHECK (animal_description IS NULL OR length(animal_description) <= 300),
  callback_phone text CHECK (callback_phone IS NULL OR callback_phone ~ '^[0-9+ ]{8,16}$'),
  callback_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'presented', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (callback_phone IS NULL OR callback_consent)
);
CREATE TABLE IF NOT EXISTS health.exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.oh_organisations(id),
  code text NOT NULL UNIQUE,
  patient_ref text CHECK (patient_ref IS NULL OR length(patient_ref) <= 40),
  age_band text NOT NULL DEFAULT 'not_recorded' CHECK (age_band IN ('0-4', '5-14', '15-29', '30-49', '50+', 'not_recorded')),
  sex text NOT NULL DEFAULT 'not_recorded' CHECK (sex IN ('female', 'male', 'other', 'not_recorded')),
  area_id uuid REFERENCES public.oh_areas(id),
  exposure_on date NOT NULL,
  presented_on date NOT NULL,
  exposure_kind text NOT NULL CHECK (exposure_kind IN ('bite', 'scratch', 'lick_broken_skin', 'other')),
  category text NOT NULL DEFAULT 'not_recorded' CHECK (category IN ('I', 'II', 'III', 'not_recorded')),
  category_by uuid REFERENCES auth.users(id),
  category_by_name text,
  wound_washed text NOT NULL DEFAULT 'not_recorded' CHECK (wound_washed IN ('before_arrival', 'at_facility', 'not_washed', 'not_recorded')),
  animal_species text NOT NULL DEFAULT 'dog' CHECK (animal_species IN ('dog', 'cat', 'cattle', 'monkey', 'wildlife', 'other', 'unknown')),
  animal_ownership text NOT NULL DEFAULT 'unknown' CHECK (animal_ownership IN ('community', 'owned', 'unknown')),
  animal_description text CHECK (animal_description IS NULL OR length(animal_description) <= 300),
  animal_place text CHECK (animal_place IS NULL OR length(animal_place) <= 200),
  source text NOT NULL DEFAULT 'walk_in' CHECK (source IN ('walk_in', 'referral', 'citizen_notice')),
  referred_to uuid REFERENCES public.oh_organisations(id),
  notice_id uuid REFERENCES health.citizen_notices(id),
  contact_phone text CHECK (contact_phone IS NULL OR contact_phone ~ '^[0-9+ ]{8,16}$'),
  reminder_consent boolean NOT NULL DEFAULT false,
  handoff_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (exposure_on <= presented_on),
  CHECK (contact_phone IS NULL OR reminder_consent)
);
CREATE INDEX IF NOT EXISTS health_exposures_facility ON health.exposures (facility_id, presented_on DESC);
CREATE INDEX IF NOT EXISTS health_exposures_area ON health.exposures (area_id, exposure_on);
CREATE TABLE IF NOT EXISTS health.pep_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id uuid NOT NULL UNIQUE REFERENCES health.exposures(id) ON DELETE CASCADE,
  regimen text NOT NULL CHECK (length(regimen) BETWEEN 2 AND 160),
  rig_given boolean NOT NULL DEFAULT false,
  prescribed_by uuid NOT NULL REFERENCES auth.users(id),
  prescribed_by_name text,
  prescribed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued', 'lost_to_follow_up')),
  status_note text CHECK (status_note IS NULL OR length(status_note) <= 300),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS health.pep_doses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES health.pep_courses(id) ON DELETE CASCADE,
  dose_no int NOT NULL CHECK (dose_no BETWEEN 1 AND 12),
  due_on date NOT NULL,
  given_on date,
  given_by_name text,
  batch text CHECK (batch IS NULL OR length(batch) <= 40),
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'given', 'missed', 'cancelled')),
  UNIQUE (course_id, dose_no),
  CHECK ((status = 'given') = (given_on IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS health_doses_due ON health.pep_doses (due_on) WHERE status = 'due';
CREATE TABLE IF NOT EXISTS health.reminder_log (
  id bigserial PRIMARY KEY,
  dose_id uuid REFERENCES health.pep_doses(id) ON DELETE CASCADE,
  course_id uuid REFERENCES health.pep_courses(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'due' CHECK (kind IN ('due', 'completion')),
  at timestamptz NOT NULL DEFAULT now(),
  actor uuid REFERENCES auth.users(id),
  outcome text NOT NULL CHECK (outcome IN ('called_reached', 'called_no_answer', 'message_sent_manually', 'patient_will_attend', 'wrong_number')),
  CHECK (dose_id IS NOT NULL OR course_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS health.audit (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  organisation_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['citizen_notices','exposures','pep_courses','pep_doses','reminder_log','audit'] LOOP
    EXECUTE format('ALTER TABLE health.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON health.%I FROM PUBLIC', t);
    BEGIN EXECUTE format('REVOKE ALL ON health.%I FROM anon, authenticated', t); EXCEPTION WHEN undefined_object THEN NULL; END;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION health.no_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'The health audit trail cannot be changed'; END $$;
DROP TRIGGER IF EXISTS audit_append_only ON health.audit;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON health.audit FOR EACH ROW EXECUTE FUNCTION health.no_rewrite();
CREATE OR REPLACE FUNCTION health.log(p_org uuid, p_action text, p_entity text, p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  INSERT INTO health.audit (actor, organisation_id, action, entity, entity_id) VALUES (auth.uid(), p_org, p_action, p_entity, p_id)
$$;
REVOKE ALL ON FUNCTION health.log(uuid, text, text, uuid) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.oh_scope_exposures(p_programme uuid, p_since date)
RETURNS SETOF health.exposures LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT e.* FROM health.exposures e
   WHERE e.facility_id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))
     AND (e.area_id IS NULL OR e.area_id IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme)))
     AND e.exposure_on >= p_since
$$;