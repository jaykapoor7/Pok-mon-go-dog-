-- One Health v2.4: the care network, referral pathways and programme alerts.
--
-- Additive and re-runnable. Nothing here generates a clinical decision:
-- alerts are facts read from records people entered (a dose past its date,
-- a service someone confirmed as unavailable, a laboratory result), and each
-- one names the record it came from. Human counts stay suppressed below the
-- programme's threshold outside the treating facility.
--
-- Adds
--   oh_referrals            configured referral pathways between facilities
--   oh_alert_acks           who acknowledged an alert, when, with what note
--   oh_set_referral         lead/coordinator configures a pathway
--   oh_programme_network    facilities, services, readiness and pathways (members)
--   oh_alerts               derived alerts for a programme (members; scoped)
--   oh_ack_alert            acknowledge an alert
--   oh_set_programme        accepts two more settings: dog_revaccination_days, alert_window_days
--   oh_public_services      also lists wound-washing units and referral targets

CREATE TABLE IF NOT EXISTS public.oh_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  from_org uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  to_org uuid NOT NULL REFERENCES public.oh_organisations(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('arv', 'rig', 'wound_care', 'rabies_testing', 'dog_vaccination')),
  note text CHECK (note IS NULL OR length(note) <= 200),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_org <> to_org),
  UNIQUE (programme_id, from_org, to_org, service)
);
ALTER TABLE public.oh_referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oh_referrals FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.oh_alert_acks (
  programme_id uuid NOT NULL REFERENCES public.oh_programmes(id) ON DELETE CASCADE,
  alert_key text NOT NULL CHECK (length(alert_key) BETWEEN 3 AND 200),
  acked_by uuid REFERENCES auth.users(id),
  acked_by_name text,
  note text CHECK (note IS NULL OR length(note) <= 300),
  acked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (programme_id, alert_key)
);
ALTER TABLE public.oh_alert_acks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oh_alert_acks FROM anon, authenticated;

INSERT INTO public.oh_role_capabilities (role, capability) VALUES
  ('lead', 'configure_network'), ('coordinator', 'configure_network'),
  ('lead', 'ack_alert'), ('coordinator', 'ack_alert'), ('clinician', 'ack_alert'), ('lab_scientist', 'ack_alert')
ON CONFLICT DO NOTHING;

-- Latest confirmation of each service at an organisation, with expiry applied.
CREATE OR REPLACE FUNCTION public.oh_service_now(p_org uuid)
RETURNS TABLE (service text, status text, note text, verified_at timestamptz, valid_until timestamptz, verified_by_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT s.service, CASE WHEN s.valid_until >= now() THEN s.status ELSE 'not_verified' END, CASE WHEN s.valid_until >= now() THEN s.note END,
         s.verified_at, s.valid_until, s.verified_by_name
    FROM (SELECT DISTINCT ON (service) * FROM public.oh_service_status WHERE organisation_id = p_org ORDER BY service, verified_at DESC) s
$$;

CREATE OR REPLACE FUNCTION public.oh_set_referral(p_programme uuid, p_from uuid, p_to uuid, p_service text, p_note text DEFAULT NULL, p_remove boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can_manage(p_programme) OR EXISTS (
    SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
     WHERE pp.programme_id = p_programme AND m.kind IN ('coordinator', 'municipal', 'state') AND public.oh_can(m.organisation_id, 'configure_network')),
    'Only programme coordination can change referral pathways');
  PERFORM public.oh_need(p_from IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND p_to IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)),
    'Both places must take part in the programme');
  IF p_remove THEN
    DELETE FROM public.oh_referrals WHERE programme_id = p_programme AND from_org = p_from AND to_org = p_to AND service = p_service;
  ELSE
    INSERT INTO public.oh_referrals (programme_id, from_org, to_org, service, note, created_by)
    VALUES (p_programme, p_from, p_to, p_service, nullif(btrim(p_note), ''), auth.uid())
    ON CONFLICT (programme_id, from_org, to_org, service) DO UPDATE SET note = excluded.note;
  END IF;
END $$;

-- The care network as programme members see it: where each service is, how
-- recently someone confirmed it, how many people are in an active course there
-- (suppressed), and where each place refers people for what it lacks.
CREATE OR REPLACE FUNCTION public.oh_programme_network(p_programme uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE sup int := public.oh_cfg_int(p_programme, 'suppress_below', 5, 5, 50);
BEGIN
  PERFORM public.oh_need(public.oh_in_programme(p_programme), 'Only programme partners can read the care network');
  RETURN jsonb_build_object(
    'facilities', coalesce((SELECT jsonb_agg(f ORDER BY f->>'kind', f->>'name') FROM (
      SELECT jsonb_build_object('id', o.id, 'name', o.name, 'short_name', o.short_name, 'kind', o.kind, 'area', public.oh_area_name(o.area_id), 'area_id', o.area_id,
        'address', o.address, 'phone', o.phone, 'hours', o.hours, 'lat', o.lat, 'lng', o.lng, 'listed_publicly', o.listed_publicly, 'illustrative', o.illustrative,
        'services', coalesce((SELECT jsonb_agg(jsonb_build_object('service', s.service, 'status', s.status, 'note', s.note, 'verified_at', s.verified_at, 'valid_until', s.valid_until, 'by', s.verified_by_name) ORDER BY s.service) FROM public.oh_service_now(o.id) s), '[]'::jsonb),
        'active_courses', CASE WHEN o.kind IN ('hospital', 'clinic') THEN public.oh_suppress((SELECT count(*) FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id WHERE e.facility_id = o.id AND c.status = 'active'), sup) END,
        'samples_waiting', CASE WHEN o.kind = 'laboratory' THEN (SELECT count(*) FROM public.oh_samples s WHERE s.laboratory_id = o.id AND s.status IN ('dispatched', 'received', 'testing')) END) AS f
      FROM public.oh_organisations o WHERE o.kind IN ('hospital', 'clinic', 'laboratory') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))) x), '[]'::jsonb),
    'referrals', coalesce((SELECT jsonb_agg(jsonb_build_object('from', r.from_org, 'to', r.to_org, 'service', r.service, 'note', r.note) ORDER BY r.service)
       FROM public.oh_referrals r WHERE r.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme))), '[]'::jsonb),
    'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'level', a.level, 'geometry', a.geometry, 'illustrative', a.illustrative) ORDER BY a.name)
       FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme))), '[]'::jsonb),
    'can_configure', public.oh_can_manage(p_programme) OR EXISTS (SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
       WHERE pp.programme_id = p_programme AND m.kind IN ('coordinator', 'municipal', 'state') AND public.oh_can(m.organisation_id, 'configure_network'))
  );
END $$;

-- Derived alerts. Each has a stable key so an acknowledgement sticks to it,
-- a severity (urgent / attention / info), a sentence, and the place or area
-- it concerns. Facility staff see alerts for their own facility; programme
-- overseers see all of them. Human counts are suppressed for overseers.
CREATE OR REPLACE FUNCTION public.oh_alerts(p_programme uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  sup int := public.oh_cfg_int(p_programme, 'suppress_below', 5, 5, 50);
  win int := public.oh_cfg_int(p_programme, 'alert_window_days', 30, 7, 180);
  revac int := (SELECT nullif(config->>'dog_revaccination_days', '')::int FROM public.oh_programmes WHERE id = p_programme);
  t date := public.oh_today(p_programme);
  oversee boolean := public.oh_can_oversee(p_programme);
  mine uuid[] := ARRAY(SELECT organisation_id FROM public.oh_my_memberships());
  orgs uuid[] := ARRAY(SELECT organisation_id FROM public.oh_programme_orgs(p_programme));
  areas uuid[] := ARRAY(SELECT area_id FROM public.oh_programme_areas_all(p_programme));
  target numeric := (SELECT vaccination_target FROM public.oh_programmes WHERE id = p_programme);
  out jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.oh_need(public.oh_in_programme(p_programme), 'Only programme partners can read alerts');

  -- 1. Laboratory-confirmed positives, with recent bites in the same area.
  out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'key', 'positive:' || s.id, 'kind', 'positive_result', 'severity', 'urgent',
      'title', 'Rabies confirmed in ' || coalesce(public.oh_area_name(s.area_id), 'an unrecorded area'),
      'detail', initcap(s.species) || ' sample ' || s.code || ', ' || coalesce(s.method, 'method not recorded') || '. ' ||
        CASE WHEN oversee THEN 'Bites recorded in this area in the last ' || win || ' days: ' ||
          (SELECT CASE WHEN n = 0 THEN 'none' WHEN n < sup THEN 'fewer than ' || sup ELSE n::text END FROM (SELECT count(*) n FROM health.exposures e WHERE e.area_id = s.area_id AND e.exposure_on >= t - win AND e.facility_id = ANY (orgs)) c) || '.'
        ELSE 'Check people bitten in this area and the animal''s contacts.' END,
      'area', public.oh_area_name(s.area_id), 'organisation_id', s.laboratory_id, 'ref', jsonb_build_object('sample', s.id), 'at', s.resulted_at) ORDER BY s.resulted_at DESC)
    FROM public.oh_samples s WHERE s.result = 'positive' AND s.resulted_at >= now() - make_interval(days => win)
      AND (s.area_id IS NULL OR s.area_id = ANY (areas)) AND (s.laboratory_id = ANY (orgs))), '[]'::jsonb);

  -- 2. Post-exposure readiness: a facility with people in a course whose vaccine
  --    or immunoglobulin is unavailable, limited, expired or never confirmed.
  out := out || coalesce((SELECT jsonb_agg(a) FROM (
    SELECT jsonb_build_object(
      'key', 'readiness:' || o.id || ':' || sv.service || ':' || coalesce(sn.status, 'never'), 'kind', 'pep_readiness',
      'severity', CASE WHEN sn.status = 'unavailable' THEN 'urgent' ELSE 'attention' END,
      'title', o.name || ': ' || CASE sv.service WHEN 'arv' THEN 'anti-rabies vaccine' ELSE 'rabies immunoglobulin' END || ' ' ||
        CASE coalesce(sn.status, 'never') WHEN 'unavailable' THEN 'not available' WHEN 'limited' THEN 'limited' WHEN 'not_verified' THEN 'confirmation expired' ELSE 'never confirmed' END,
      'detail', CASE WHEN sn.status IN ('unavailable', 'limited') THEN 'Confirmed by ' || coalesce(sn.verified_by_name, 'a team member') || ' on ' || to_char(sn.verified_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon') || coalesce('. ' || sn.note, '') || '.'
                     ELSE 'Ask the facility to confirm what it has today.' END ||
        coalesce((SELECT ' Referral for this: ' || string_agg(t2.name, ', ') || '.' FROM public.oh_referrals r JOIN public.oh_organisations t2 ON t2.id = r.to_org WHERE r.from_org = o.id AND r.service = sv.service AND r.programme_id = p_programme), ''),
      'area', public.oh_area_name(o.area_id), 'organisation_id', o.id, 'ref', jsonb_build_object('organisation', o.id, 'service', sv.service), 'at', coalesce(sn.verified_at, now())) a
    FROM public.oh_organisations o
    CROSS JOIN (VALUES ('arv'), ('rig')) sv(service)
    LEFT JOIN LATERAL (SELECT * FROM public.oh_service_now(o.id) x WHERE x.service = sv.service) sn ON true
    WHERE o.kind IN ('hospital', 'clinic') AND o.id = ANY (orgs) AND (oversee OR o.id = ANY (mine))
      AND coalesce(sn.status, 'never') <> 'available'
      AND (sv.service = 'arv' OR EXISTS (SELECT 1 FROM public.oh_service_status x WHERE x.organisation_id = o.id AND x.service = 'rig'))
      AND (sn.status IS NOT NULL OR EXISTS (SELECT 1 FROM health.exposures e JOIN health.pep_courses c ON c.exposure_id = e.id WHERE e.facility_id = o.id AND c.status = 'active'))) z), '[]'::jsonb);

  -- 3. Doses past their date, per facility.
  out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'key', 'overdue:' || f.id || ':' || t, 'kind', 'doses_overdue', 'severity', 'attention',
      'title', f.name || ': ' || CASE WHEN f.id = ANY (mine) THEN n::text ELSE CASE WHEN n < sup THEN 'fewer than ' || sup ELSE n::text END END || ' dose' || CASE WHEN n = 1 THEN '' ELSE 's' END || ' past the date set',
      'detail', 'People who have not yet returned for a scheduled dose. The facility''s call list has them.',
      'area', public.oh_area_name(f.area_id), 'organisation_id', f.id, 'ref', jsonb_build_object('organisation', f.id), 'at', now()))
    FROM (SELECT o.id, o.name, o.area_id, count(*) n FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id
            JOIN public.oh_organisations o ON o.id = e.facility_id
           WHERE d.status = 'due' AND d.due_on < t AND c.status = 'active' AND o.id = ANY (orgs) AND (oversee OR o.id = ANY (mine)) GROUP BY o.id, o.name, o.area_id) f), '[]'::jsonb);

  -- 4. Courses completed in the last 7 days (completion notices), own facility only.
  out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'key', 'completed:' || f.id || ':' || t, 'kind', 'courses_completed', 'severity', 'info',
      'title', f.name || ': ' || f.n || ' course' || CASE WHEN f.n = 1 THEN '' ELSE 's' END || ' completed this week',
      'detail', 'Every scheduled dose recorded as given.', 'area', public.oh_area_name(f.area_id), 'organisation_id', f.id, 'ref', jsonb_build_object('organisation', f.id), 'at', now()))
    FROM (SELECT o.id, o.name, o.area_id, count(*) n FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id JOIN public.oh_organisations o ON o.id = e.facility_id
           WHERE c.status = 'completed' AND c.completed_at >= now() - interval '7 days' AND o.id = ANY (mine) AND o.id = ANY (orgs) GROUP BY o.id, o.name, o.area_id) f), '[]'::jsonb);

  -- 5. Follow-ups past their due date, per receiving partner.
  out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'key', 'followups:' || f.id || ':' || t, 'kind', 'followups_overdue', 'severity', 'attention',
      'title', f.name || ': ' || f.n || ' follow-up' || CASE WHEN f.n = 1 THEN '' ELSE 's' END || ' overdue',
      'detail', 'Work sent by another partner that has passed its due date.', 'area', NULL, 'organisation_id', f.id, 'ref', jsonb_build_object('organisation', f.id), 'at', now()))
    FROM (SELECT o.id, o.name, count(*) n FROM public.oh_handoffs h JOIN public.oh_organisations o ON o.id = h.to_org
           WHERE h.programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)) AND h.status IN ('open', 'accepted') AND h.due_on < t
             AND (oversee OR o.id = ANY (mine)) GROUP BY o.id, o.name) f), '[]'::jsonb);

  -- 6. Samples waiting at the laboratory for more than 3 days.
  out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
      'key', 'lab_wait:' || s.id, 'kind', 'sample_waiting', 'severity', 'attention',
      'title', 'Sample ' || s.code || ' waiting ' || (t - s.collected_on) || ' days',
      'detail', initcap(s.species) || ', ' || replace(s.status, '_', ' ') || ' at the laboratory.', 'area', public.oh_area_name(s.area_id),
      'organisation_id', s.laboratory_id, 'ref', jsonb_build_object('sample', s.id), 'at', s.created_at))
    FROM public.oh_samples s WHERE s.status IN ('dispatched', 'received', 'testing') AND s.collected_on < t - 3 AND s.laboratory_id = ANY (orgs)
      AND (oversee OR s.laboratory_id = ANY (mine) OR s.submitted_by = ANY (mine))), '[]'::jsonb);

  -- 7. Vaccination below target where a population estimate exists (overseers).
  IF oversee THEN
    out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
        'key', 'coverage:' || v.id || ':' || to_char(t, 'YYYY-MM'), 'kind', 'coverage_below_target', 'severity', 'attention',
        'title', v.name || ': ' || round(100.0 * v.vaccinated / v.dogs) || '% of the estimated dogs recorded vaccinated',
        'detail', 'Target ' || round(100 * target) || '%. Estimate ' || v.dogs || ' dogs (' || v.method || ', ' || to_char(v.est_on, 'Mon YYYY') || ').',
        'area', v.name, 'organisation_id', NULL, 'ref', jsonb_build_object('area', v.id), 'at', now()))
      FROM (SELECT a.id, a.name, e.dogs_estimated dogs, e.method, e.estimated_on est_on,
              (SELECT count(*) FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE o.id = ANY (orgs) AND d.zone = a.name AND d.vaccination_status = 'vaccinated') vaccinated
              FROM public.oh_areas a JOIN LATERAL (SELECT * FROM public.oh_estimates x WHERE x.area_id = a.id ORDER BY x.estimated_on DESC LIMIT 1) e ON true
             WHERE a.id = ANY (areas) AND e.dogs_estimated > 0) v
      WHERE v.vaccinated::numeric / v.dogs < target), '[]'::jsonb);
  END IF;

  -- 8. Dogs due for revaccination, only when the programme has set an interval.
  IF revac IS NOT NULL THEN
    out := out || coalesce((SELECT jsonb_agg(jsonb_build_object(
        'key', 'revaccination:' || f.id || ':' || to_char(t, 'IYYY-IW'), 'kind', 'revaccination_due', 'severity', 'info',
        'title', f.name || ': ' || f.n || ' dog' || CASE WHEN f.n = 1 THEN '' ELSE 's' END || ' due for revaccination',
        'detail', 'Last recorded vaccination more than ' || revac || ' days ago (the programme''s setting).',
        'area', NULL, 'organisation_id', f.id, 'ref', jsonb_build_object('organisation', f.id), 'at', now()))
      FROM (SELECT o.id, o.name, count(*) n FROM public.oh_organisations o JOIN public.dogs d ON d.ngo_id = o.ngo_id
              JOIN LATERAL (SELECT max(m.event_date) last FROM public.medical_events m WHERE m.dog_id = d.id AND m.kind = 'vaccination') lv ON true
             WHERE o.kind = 'ngo' AND o.id = ANY (orgs) AND (oversee OR o.id = ANY (mine)) AND lv.last IS NOT NULL AND lv.last < t - revac
             GROUP BY o.id, o.name) f), '[]'::jsonb);
  END IF;

  -- Attach acknowledgements.
  RETURN coalesce((SELECT jsonb_agg(a || jsonb_build_object('ack', (SELECT jsonb_build_object('by', k.acked_by_name, 'at', k.acked_at, 'note', k.note)
        FROM public.oh_alert_acks k WHERE k.programme_id = p_programme AND k.alert_key = a->>'key'))
      ORDER BY CASE a->>'severity' WHEN 'urgent' THEN 0 WHEN 'attention' THEN 1 ELSE 2 END, a->>'at' DESC)
    FROM jsonb_array_elements(out) a), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.oh_ack_alert(p_programme uuid, p_key text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(EXISTS (SELECT 1 FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id
     WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)) AND public.oh_can(m.organisation_id, 'ack_alert')), 'You cannot acknowledge alerts in this programme');
  INSERT INTO public.oh_alert_acks (programme_id, alert_key, acked_by, acked_by_name, note)
  VALUES (p_programme, p_key, auth.uid(), public.oh_actor_name(), nullif(btrim(p_note), ''))
  ON CONFLICT (programme_id, alert_key) DO UPDATE SET acked_by = excluded.acked_by, acked_by_name = excluded.acked_by_name, note = excluded.note, acked_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_programme(p_programme uuid, p_summary text, p_status text, p_target numeric, p_config jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE allowed text[] := ARRAY['modules', 'suppress_below', 'followup_due_days', 'dog_revaccination_days', 'alert_window_days'];
BEGIN
  PERFORM public.oh_need(public.oh_can_manage(p_programme), 'Only a programme lead can change the programme');
  PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(p_config, '{}')) k WHERE k <> ALL (allowed)), 'Unknown setting');
  PERFORM public.oh_need(coalesce((p_config->>'suppress_below')::int, 5) >= 5, 'Counts below 5 are always hidden');
  PERFORM public.oh_need(coalesce((p_config->>'dog_revaccination_days')::int, 30) BETWEEN 30 AND 1095, 'Revaccination interval must be between 30 and 1095 days');
  PERFORM public.oh_need(p_status IN ('planning', 'pilot', 'active', 'closed'), 'Unknown status');
  PERFORM public.oh_need(p_target > 0 AND p_target <= 1, 'Target must be between 1% and 100%');
  UPDATE public.oh_programmes SET summary = nullif(btrim(p_summary), ''), status = p_status, vaccination_target = p_target, config = coalesce(p_config, '{}') WHERE id = p_programme;
END $$;

-- Public finder: hospitals, health centres and wound-washing units that the
-- programme lists publicly, with their latest confirmations and where each
-- refers people for a service it does not offer.
CREATE OR REPLACE FUNCTION public.oh_public_services(p_programme_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH p AS (SELECT * FROM public.oh_programmes WHERE slug = p_programme_slug AND status IN ('pilot', 'active'))
  SELECT jsonb_build_object(
    'programme', (SELECT jsonb_build_object('name', p.name, 'illustrative', p.illustrative,
        'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name) ORDER BY a.name) FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p.id))), '[]'::jsonb)) FROM p),
    'facilities', coalesce((SELECT jsonb_agg(f ORDER BY f->>'name') FROM (
      SELECT jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'area', public.oh_area_name(o.area_id), 'address', o.address, 'phone', o.phone, 'hours', o.hours, 'lat', o.lat, 'lng', o.lng,
        'services', coalesce((SELECT jsonb_agg(jsonb_build_object('service', s.service, 'status', s.status, 'note', s.note, 'verified_at', s.verified_at, 'valid_until', s.valid_until)) FROM public.oh_service_now(o.id) s), '[]'::jsonb),
        'refers', coalesce((SELECT jsonb_agg(jsonb_build_object('service', r.service, 'to', t.name, 'to_id', t.id)) FROM public.oh_referrals r JOIN public.oh_organisations t ON t.id = r.to_org
                     WHERE r.from_org = o.id AND r.programme_id = (SELECT id FROM p) AND t.listed_publicly), '[]'::jsonb)) AS f
      FROM public.oh_organisations o WHERE o.listed_publicly AND o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs((SELECT id FROM p)))) x), '[]'::jsonb))
$$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname IN ('oh_service_now', 'oh_set_referral', 'oh_programme_network', 'oh_alerts', 'oh_ack_alert', 'oh_set_programme', 'oh_public_services') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    BEGIN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', f.sig); EXCEPTION WHEN undefined_object THEN NULL; END;
    IF f.proname <> 'oh_service_now' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig); END IF;
    IF f.proname = 'oh_public_services' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig); END IF;
  END LOOP;
END $$;
