CREATE OR REPLACE FUNCTION public.oh_my_today()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT coalesce(jsonb_agg(r ORDER BY (r->>'order')::int, r->>'name'), '[]'::jsonb) INTO out FROM (
    SELECT jsonb_build_object(
      'organisation_id', o.id, 'name', o.name, 'short_name', o.short_name, 'kind', o.kind, 'role', m.role, 'ngo_id', o.ngo_id, 'illustrative', o.illustrative,
      'capabilities', public.oh_my_capabilities(o.id),
      'programmes', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'illustrative', p.illustrative) ORDER BY p.parent_id NULLS LAST, p.name)
                     FROM public.oh_participations pp JOIN public.oh_programmes p ON p.id = pp.programme_id WHERE pp.organisation_id = o.id), '[]'::jsonb),
      'order', CASE o.kind WHEN 'state' THEN 0 WHEN 'coordinator' THEN 1 WHEN 'municipal' THEN 2 WHEN 'hospital' THEN 3 WHEN 'clinic' THEN 3 WHEN 'laboratory' THEN 4 ELSE 5 END,
      'handoffs_open', (SELECT count(*) FROM public.oh_handoffs h WHERE h.to_org = o.id AND h.status IN ('open', 'accepted')),
      'handoffs_overdue', (SELECT count(*) FROM public.oh_handoffs h WHERE h.to_org = o.id AND h.status IN ('open', 'accepted') AND h.due_on < public.oh_org_today(o.id)),
      'doses_due', CASE WHEN o.kind IN ('hospital', 'clinic') THEN (SELECT count(*) FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id WHERE e.facility_id = o.id AND d.status = 'due' AND d.due_on <= public.oh_org_today(o.id) AND c.status = 'active') END,
      'notices_new', CASE WHEN o.kind IN ('hospital', 'clinic') THEN (SELECT count(*) FROM health.citizen_notices n WHERE n.facility_id = o.id AND n.status = 'new') END,
      'samples_waiting', CASE WHEN o.kind = 'laboratory' THEN (SELECT count(*) FROM public.oh_samples s WHERE s.laboratory_id = o.id AND s.status IN ('dispatched', 'received', 'testing')) END,
      'services_stale', CASE WHEN o.kind IN ('hospital', 'clinic', 'laboratory') THEN (SELECT count(*) FROM (SELECT DISTINCT ON (service) valid_until FROM public.oh_service_status s WHERE s.organisation_id = o.id ORDER BY service, verified_at DESC) x WHERE x.valid_until < now()) END
    ) AS r
    FROM public.oh_my_memberships() m JOIN public.oh_organisations o ON o.id = m.organisation_id
  ) s;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION public.oh_org_areas(p_org uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_role_in(p_org) IS NOT NULL, 'Only members can read this');
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'level', a.level) ORDER BY a.name) FROM public.oh_areas a
     WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (
       SELECT x.area_id FROM public.oh_participations pp, LATERAL public.oh_programme_areas_all(pp.programme_id) x WHERE pp.organisation_id = p_org
       UNION SELECT area_id FROM public.oh_organisations WHERE id = p_org AND area_id IS NOT NULL)), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.oh_directory()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH mine AS (SELECT DISTINCT pp.programme_id FROM public.oh_participations pp JOIN public.oh_my_memberships() m ON m.organisation_id = pp.organisation_id),
       progs AS (SELECT DISTINCT t.id FROM mine, LATERAL public.oh_programme_tree(mine.programme_id) t
                 UNION SELECT DISTINCT l.id FROM mine, LATERAL public.oh_programme_line(mine.programme_id) l),
       orgs AS (SELECT o.id, o.name, o.short_name, o.kind, array_agg(DISTINCT pp.programme_id) AS programmes
                FROM public.oh_organisations o JOIN public.oh_participations pp ON pp.organisation_id = o.id WHERE pp.programme_id IN (SELECT id FROM progs) GROUP BY o.id),
       areas AS (SELECT DISTINCT a.id, a.name, a.level, a.parent_id FROM mine, LATERAL public.oh_programme_areas_all(mine.programme_id) x JOIN public.oh_areas a ON a.id = x.area_id)
  SELECT jsonb_build_object(
    'organisations', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'short_name', short_name, 'kind', kind, 'programmes', to_jsonb(programmes)) ORDER BY name) FROM orgs), '[]'::jsonb),
    'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'level', level, 'parent_id', parent_id) ORDER BY name) FROM areas), '[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.oh_record_exposure(
  p_facility uuid, p_exposure_on date, p_kind text, p_area uuid, p_age_band text DEFAULT 'not_recorded', p_sex text DEFAULT 'not_recorded',
  p_patient_ref text DEFAULT NULL, p_species text DEFAULT 'dog', p_ownership text DEFAULT 'unknown', p_animal_description text DEFAULT NULL,
  p_animal_place text DEFAULT NULL, p_category text DEFAULT 'not_recorded', p_source text DEFAULT 'walk_in', p_notice uuid DEFAULT NULL,
  p_contact_phone text DEFAULT NULL, p_reminder_consent boolean DEFAULT false, p_request_followup boolean DEFAULT true,
  p_wound_washed text DEFAULT 'not_recorded')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_org_today(p_facility); eid uuid; c text; hid uuid; target uuid; prog uuid; due_days int;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'record_exposure'), 'Only staff of this facility can record a bite');
  PERFORM public.oh_need(p_category = 'not_recorded' OR public.oh_can(p_facility, 'assess'), 'Only a clinician can record the exposure category');
  PERFORM public.oh_need(p_exposure_on <= td, 'The date it happened cannot be in the future');
  PERFORM public.oh_need(p_exposure_on >= td - 365, 'The date it happened is more than a year ago');
  c := public.oh_code('BX', p_facility);
  INSERT INTO health.exposures (facility_id, code, patient_ref, age_band, sex, area_id, exposure_on, presented_on, exposure_kind, category, category_by, category_by_name, wound_washed,
    animal_species, animal_ownership, animal_description, animal_place, source, notice_id, contact_phone, reminder_consent, created_by)
  VALUES (p_facility, c, nullif(btrim(p_patient_ref), ''), p_age_band, p_sex, p_area, p_exposure_on, td, p_kind, p_category,
    CASE WHEN p_category <> 'not_recorded' THEN auth.uid() END, CASE WHEN p_category <> 'not_recorded' THEN public.oh_actor_name() END, p_wound_washed,
    p_species, p_ownership, nullif(btrim(p_animal_description), ''), nullif(btrim(p_animal_place), ''), p_source, p_notice,
    CASE WHEN p_reminder_consent THEN nullif(btrim(p_contact_phone), '') END, p_reminder_consent AND nullif(btrim(p_contact_phone), '') IS NOT NULL, auth.uid())
  RETURNING id INTO eid;
  IF p_notice IS NOT NULL THEN UPDATE health.citizen_notices SET status = 'presented' WHERE id = p_notice AND facility_id = p_facility; END IF;
  IF p_request_followup AND p_ownership <> 'owned' AND p_area IS NOT NULL THEN
    SELECT a.organisation_id, a.programme_id INTO target, prog
      FROM public.oh_assignments a JOIN public.oh_participations pp ON pp.programme_id = a.programme_id AND pp.organisation_id = p_facility
     WHERE a.duty = 'animal_followup' AND a.area_id = p_area
     ORDER BY (SELECT max(depth) FROM public.oh_programme_line(a.programme_id)) DESC LIMIT 1;
    IF target IS NOT NULL THEN
      due_days := public.oh_cfg_int(prog, 'followup_due_days', 3, 1, 30);
      INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, status, due_on, created_by)
      VALUES (prog, 'animal_followup', p_facility, target,
        'Find and observe the ' || CASE p_species WHEN 'unknown' THEN 'animal' ELSE p_species END || ' involved in '
          || CASE p_kind WHEN 'bite' THEN 'a bite' WHEN 'scratch' THEN 'a scratch' WHEN 'lick_broken_skin' THEN 'a lick on broken skin' ELSE 'contact' END || ' on ' || to_char(p_exposure_on, 'DD Mon'),
        concat_ws(E'\n', CASE WHEN nullif(btrim(p_animal_description), '') IS NOT NULL THEN 'Animal: ' || btrim(p_animal_description) END,
          'The facility asked for the animal to be located and its health recorded. Record what you find; if it is sick or dies, arrange a sample for the laboratory.',
          'No patient details are shared with this request.'),
        p_area, nullif(btrim(p_animal_place), ''), 'open', p_exposure_on + due_days, auth.uid())
      RETURNING id INTO hid;
      UPDATE health.exposures SET handoff_id = hid WHERE id = eid;
    END IF;
  END IF;
  PERFORM health.log(p_facility, 'record_exposure', 'exposure', eid);
  RETURN jsonb_build_object('id', eid, 'code', c, 'handoff_id', hid);
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_category(p_exposure uuid, p_category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid;
BEGIN
  SELECT facility_id INTO f FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'assess'), 'Only a clinician of this facility can record the category');
  PERFORM public.oh_need(p_category IN ('I', 'II', 'III'), 'Choose category I, II or III');
  UPDATE health.exposures SET category = p_category, category_by = auth.uid(), category_by_name = public.oh_actor_name(), updated_at = now() WHERE id = p_exposure;
  PERFORM health.log(f, 'set_category', 'exposure', p_exposure);
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_wound_washed(p_exposure uuid, p_value text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid;
BEGIN
  SELECT facility_id INTO f FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'record_exposure'), 'Only staff of this facility can change this');
  UPDATE health.exposures SET wound_washed = p_value, updated_at = now() WHERE id = p_exposure;
  PERFORM health.log(f, 'set_wound_washed', 'exposure', p_exposure);
END $$;

CREATE OR REPLACE FUNCTION public.oh_prescribe(p_exposure uuid, p_regimen text, p_rig_given boolean, p_due_dates date[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid; cid uuid; i int; exp_on date;
BEGIN
  SELECT facility_id, exposure_on INTO f, exp_on FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'prescribe'), 'Only a clinician of this facility can prescribe');
  PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM health.pep_courses WHERE exposure_id = p_exposure), 'A course is already recorded for this presentation');
  PERFORM public.oh_need(coalesce(array_length(p_due_dates, 1), 0) BETWEEN 1 AND 12, 'Give the date of each dose the clinician prescribed');
  PERFORM public.oh_need(length(btrim(coalesce(p_regimen, ''))) >= 2, 'Write the regimen as prescribed');
  FOR i IN 1 .. array_length(p_due_dates, 1) LOOP
    PERFORM public.oh_need(p_due_dates[i] IS NOT NULL AND p_due_dates[i] >= exp_on AND (i = 1 OR p_due_dates[i] >= p_due_dates[i - 1]), 'Dose dates must be on or after the exposure and in order');
  END LOOP;
  INSERT INTO health.pep_courses (exposure_id, regimen, rig_given, prescribed_by, prescribed_by_name)
  VALUES (p_exposure, btrim(p_regimen), coalesce(p_rig_given, false), auth.uid(), public.oh_actor_name()) RETURNING id INTO cid;
  FOR i IN 1 .. array_length(p_due_dates, 1) LOOP INSERT INTO health.pep_doses (course_id, dose_no, due_on) VALUES (cid, i, p_due_dates[i]); END LOOP;
  PERFORM health.log(f, 'prescribe', 'pep_course', cid);
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.oh_add_dose(p_course uuid, p_due_on date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid; did uuid; n int; st text;
BEGIN
  SELECT e.facility_id, c.status INTO f, st FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id WHERE c.id = p_course;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'prescribe'), 'Only a clinician of this facility can change the course');
  PERFORM public.oh_need(st = 'active', 'Only an active course can take another dose');
  PERFORM public.oh_need(p_due_on >= public.oh_org_today(f), 'A new dose date must be today or later');
  SELECT coalesce(max(dose_no), 0) + 1 INTO n FROM health.pep_doses WHERE course_id = p_course;
  PERFORM public.oh_need(n <= 12, 'A course has at most twelve doses');
  INSERT INTO health.pep_doses (course_id, dose_no, due_on) VALUES (p_course, n, p_due_on) RETURNING id INTO did;
  PERFORM health.log(f, 'add_dose', 'pep_course', p_course);
  RETURN did;
END $$;

CREATE OR REPLACE FUNCTION public.oh_record_dose(p_dose uuid, p_status text, p_given_on date DEFAULT NULL, p_batch text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid; cid uuid; remaining int; st text; completed boolean := false;
BEGIN
  SELECT e.facility_id, c.id, d.status INTO f, cid, st FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id WHERE d.id = p_dose;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'record_dose'), 'Only a nurse or clinician of this facility can record a dose');
  PERFORM public.oh_need(st = 'due', 'This dose has already been recorded');
  PERFORM public.oh_need(p_status IN ('given', 'missed'), 'Record the dose as given or missed');
  p_given_on := coalesce(p_given_on, public.oh_org_today(f));
  PERFORM public.oh_need(p_status <> 'given' OR p_given_on <= public.oh_org_today(f), 'A dose cannot be given in the future');
  UPDATE health.pep_doses SET status = p_status, given_on = CASE WHEN p_status = 'given' THEN p_given_on END,
    given_by_name = CASE WHEN p_status = 'given' THEN public.oh_actor_name() END, batch = CASE WHEN p_status = 'given' THEN nullif(btrim(p_batch), '') END
   WHERE id = p_dose;
  SELECT count(*) INTO remaining FROM health.pep_doses WHERE course_id = cid AND status = 'due';
  IF remaining = 0 AND NOT EXISTS (SELECT 1 FROM health.pep_doses WHERE course_id = cid AND status = 'missed') THEN
    UPDATE health.pep_courses SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = cid AND status = 'active';
    completed := FOUND;
  END IF;
  PERFORM health.log(f, 'record_dose_' || p_status, 'pep_dose', p_dose);
  RETURN jsonb_build_object('remaining', remaining, 'completed', completed);
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_course_status(p_course uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid;
BEGIN
  SELECT e.facility_id INTO f FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id WHERE c.id = p_course;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'prescribe'), 'Only a clinician can change the course');
  PERFORM public.oh_need(p_status IN ('active', 'completed', 'discontinued', 'lost_to_follow_up'), 'Unknown course status');
  UPDATE health.pep_courses SET status = p_status, status_note = nullif(btrim(p_note), ''), updated_at = now(), completed_at = CASE WHEN p_status = 'completed' THEN now() END WHERE id = p_course;
  IF p_status IN ('discontinued', 'lost_to_follow_up') THEN UPDATE health.pep_doses SET status = 'cancelled' WHERE course_id = p_course AND status = 'due'; END IF;
  PERFORM health.log(f, 'course_' || p_status, 'pep_course', p_course);
END $$;

CREATE OR REPLACE FUNCTION public.oh_log_reminder(p_dose uuid, p_outcome text, p_course uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid;
BEGIN
  IF p_dose IS NOT NULL THEN
    SELECT e.facility_id INTO f FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id WHERE d.id = p_dose;
  ELSE
    SELECT e.facility_id INTO f FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id WHERE c.id = p_course;
  END IF;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'log_reminder'), 'Only facility staff can log a reminder');
  INSERT INTO health.reminder_log (dose_id, course_id, kind, actor, outcome) VALUES (p_dose, p_course, CASE WHEN p_dose IS NULL THEN 'completion' ELSE 'due' END, auth.uid(), p_outcome);
  PERFORM health.log(f, 'reminder', CASE WHEN p_dose IS NULL THEN 'pep_course' ELSE 'pep_dose' END, coalesce(p_dose, p_course));
END $$;

CREATE OR REPLACE FUNCTION public.oh_clinic_register(p_facility uuid, p_filter text DEFAULT 'all', p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE out jsonb;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'view_register'), 'Only staff of this facility can read its register');
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'presented_on' DESC, x->>'code' DESC), '[]'::jsonb) INTO out FROM (
    SELECT jsonb_build_object('id', e.id, 'code', e.code, 'patient_ref', e.patient_ref, 'age_band', e.age_band, 'sex', e.sex, 'area', public.oh_area_name(e.area_id),
      'exposure_on', e.exposure_on, 'presented_on', e.presented_on, 'kind', e.exposure_kind, 'category', e.category, 'species', e.animal_species,
      'course_status', c.status, 'regimen', c.regimen,
      'doses_given', (SELECT count(*) FROM health.pep_doses d WHERE d.course_id = c.id AND d.status = 'given'),
      'doses_total', (SELECT count(*) FROM health.pep_doses d WHERE d.course_id = c.id AND d.status <> 'cancelled'),
      'next_due', (SELECT min(due_on) FROM health.pep_doses d WHERE d.course_id = c.id AND d.status = 'due'),
      'handoff_status', (SELECT status FROM public.oh_handoffs h WHERE h.id = e.handoff_id)) AS x
    FROM health.exposures e LEFT JOIN health.pep_courses c ON c.exposure_id = e.id
    WHERE e.facility_id = p_facility
      AND (p_filter = 'all'
        OR (p_filter = 'needs_assessment' AND (e.category = 'not_recorded' OR (c.id IS NULL AND e.category IN ('II', 'III'))))
        OR (p_filter = 'active' AND c.status = 'active')
        OR (p_filter = 'closed' AND c.status IN ('completed', 'discontinued', 'lost_to_follow_up')))
    ORDER BY e.presented_on DESC LIMIT least(greatest(p_limit, 1), 200)
  ) s;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION public.oh_clinic_due(p_facility uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_org_today(p_facility); out jsonb;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'view_register'), 'Only staff of this facility can read its schedule');
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'due_on', x->>'code'), '[]'::jsonb) INTO out FROM (
    SELECT jsonb_build_object('dose_id', d.id, 'dose_no', d.dose_no, 'doses_total', (SELECT count(*) FROM health.pep_doses z WHERE z.course_id = c.id AND z.status <> 'cancelled'),
      'due_on', d.due_on, 'exposure_id', e.id, 'code', e.code, 'patient_ref', e.patient_ref, 'age_band', e.age_band, 'regimen', c.regimen,
      'phone', CASE WHEN e.reminder_consent THEN e.contact_phone END,
      'last_reminder', (SELECT jsonb_build_object('at', r.at, 'outcome', r.outcome) FROM health.reminder_log r WHERE r.dose_id = d.id ORDER BY r.at DESC LIMIT 1)) AS x
    FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id
    WHERE e.facility_id = p_facility AND c.status = 'active' AND d.status = 'due' AND d.due_on <= td + 1
  ) s;
  RETURN jsonb_build_object('today', td, 'due', out,
    'completed', coalesce((SELECT jsonb_agg(jsonb_build_object('course_id', c.id, 'exposure_id', e.id, 'code', e.code, 'patient_ref', e.patient_ref, 'completed_at', c.completed_at,
        'phone', CASE WHEN e.reminder_consent THEN e.contact_phone END,
        'told', EXISTS (SELECT 1 FROM health.reminder_log r WHERE r.course_id = c.id AND r.kind = 'completion')) ORDER BY c.completed_at DESC)
      FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id
      WHERE e.facility_id = p_facility AND c.status = 'completed' AND c.completed_at >= now() - interval '7 days'), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.oh_clinic_exposure(p_exposure uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e health.exposures; c health.pep_courses;
BEGIN
  SELECT * INTO e FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(e.id IS NOT NULL AND public.oh_can(e.facility_id, 'view_register'), 'Only staff of this facility can open this record');
  SELECT * INTO c FROM health.pep_courses WHERE exposure_id = e.id;
  PERFORM health.log(e.facility_id, 'read', 'exposure', e.id);
  RETURN to_jsonb(e) - 'created_by' - 'category_by' || jsonb_build_object(
    'area', public.oh_area_name(e.area_id),
    'today', public.oh_org_today(e.facility_id),
    'my_role', public.oh_role_in(e.facility_id),
    'can', jsonb_build_object('assess', public.oh_can(e.facility_id, 'assess'), 'prescribe', public.oh_can(e.facility_id, 'prescribe'), 'record_dose', public.oh_can(e.facility_id, 'record_dose')),
    'course', CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) - 'prescribed_by' END,
    'doses', coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.dose_no) FROM health.pep_doses d WHERE d.course_id = c.id), '[]'::jsonb),
    'handoff', (SELECT jsonb_build_object('id', h.id, 'status', h.status, 'to', o.name, 'outcome', h.outcome) FROM public.oh_handoffs h JOIN public.oh_organisations o ON o.id = h.to_org WHERE h.id = e.handoff_id),
    'history', coalesce((SELECT jsonb_agg(jsonb_build_object('at', a.at, 'action', a.action) ORDER BY a.at) FROM health.audit a
                          WHERE a.action <> 'read' AND (a.entity_id IN (e.id, c.id) OR a.entity_id IN (SELECT id FROM health.pep_doses WHERE course_id = c.id))), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.oh_public_services(p_programme_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH p AS (SELECT * FROM public.oh_programmes WHERE slug = p_programme_slug AND status IN ('pilot', 'active'))
  SELECT jsonb_build_object(
    'programme', (SELECT jsonb_build_object('name', p.name, 'illustrative', p.illustrative,
        'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name) ORDER BY a.name) FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p.id))), '[]'::jsonb)) FROM p),
    'facilities', coalesce((SELECT jsonb_agg(f ORDER BY f->>'name') FROM (
      SELECT jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'area', public.oh_area_name(o.area_id), 'address', o.address, 'phone', o.phone, 'hours', o.hours, 'lat', o.lat, 'lng', o.lng,
        'services', coalesce((SELECT jsonb_agg(jsonb_build_object('service', s.service, 'status', CASE WHEN s.valid_until >= now() THEN s.status ELSE 'not_verified' END,
            'note', CASE WHEN s.valid_until >= now() THEN s.note END, 'verified_at', s.verified_at, 'valid_until', s.valid_until))
          FROM (SELECT DISTINCT ON (service) * FROM public.oh_service_status WHERE organisation_id = o.id ORDER BY service, verified_at DESC) s), '[]'::jsonb)) AS f
      FROM public.oh_organisations o WHERE o.listed_publicly AND o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs((SELECT id FROM p)))) x), '[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.oh_submit_bite_notice(p_programme_slug text, p_happened_on date, p_area uuid, p_place text, p_species text, p_animal_description text, p_phone text, p_consent boolean, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE prog uuid; fac uuid; nid uuid; td date;
BEGIN
  SELECT id INTO prog FROM public.oh_programmes WHERE slug = p_programme_slug AND status IN ('pilot', 'active');
  PERFORM public.oh_need(prog IS NOT NULL, 'This programme is not accepting notices');
  td := public.oh_today(prog);
  PERFORM public.oh_need(p_happened_on BETWEEN td - 30 AND td, 'Give a date in the last 30 days');
  PERFORM public.oh_need(p_area IS NULL OR p_area IN (SELECT area_id FROM public.oh_programme_areas_all(prog)), 'That area is not part of this programme');
  SELECT id INTO fac FROM public.oh_organisations
   WHERE listed_publicly AND kind IN ('hospital', 'clinic') AND id IN (SELECT organisation_id FROM public.oh_programme_orgs(prog))
   ORDER BY (p_area IS NOT NULL AND area_id IS NOT DISTINCT FROM p_area) DESC,
            CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (lat - p_lat) ^ 2 + ((lng - p_lng) * cos(radians(p_lat))) ^ 2 END,
            kind = 'hospital' DESC, name LIMIT 1;
  INSERT INTO health.citizen_notices (programme_id, facility_id, happened_on, area_id, place, animal_species, animal_description, callback_phone, callback_consent)
  VALUES (prog, fac, p_happened_on, p_area, left(nullif(btrim(p_place), ''), 200), coalesce(nullif(p_species, ''), 'unknown'), left(nullif(btrim(p_animal_description), ''), 300),
    CASE WHEN p_consent THEN nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+ ]', '', 'g'), '') END, coalesce(p_consent, false))
  RETURNING id INTO nid;
  INSERT INTO health.audit (actor, organisation_id, action, entity, entity_id) VALUES (auth.uid(), fac, 'citizen_notice', 'citizen_notice', nid);
  RETURN jsonb_build_object('received', true, 'facility', (SELECT jsonb_build_object('name', name, 'address', address, 'phone', phone, 'hours', hours) FROM public.oh_organisations WHERE id = fac));
END $$;

CREATE OR REPLACE FUNCTION public.oh_clinic_notices(p_facility uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'view_register'), 'Only staff of this facility can read its notices');
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(n) - 'programme_id' || jsonb_build_object('area', public.oh_area_name(n.area_id)) ORDER BY n.created_at DESC)
    FROM health.citizen_notices n WHERE n.facility_id = p_facility AND n.status IN ('new', 'contacted')), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.oh_update_notice(p_notice uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid;
BEGIN
  SELECT facility_id INTO f FROM health.citizen_notices WHERE id = p_notice;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'view_register'), 'Only staff of this facility can update this notice');
  PERFORM public.oh_need(p_status IN ('contacted', 'closed'), 'Mark the notice contacted or closed');
  UPDATE health.citizen_notices SET status = p_status WHERE id = p_notice;
  PERFORM health.log(f, 'notice_' || p_status, 'citizen_notice', p_notice);
END $$;

CREATE OR REPLACE FUNCTION public.oh_verify_service(p_org uuid, p_service text, p_status text, p_note text DEFAULT NULL, p_valid_days int DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE o public.oh_organisations; coord record; n int := 0;
BEGIN
  PERFORM public.oh_need(public.oh_can(p_org, 'confirm_service'), 'Only staff of this facility can confirm its services');
  PERFORM public.oh_need(p_valid_days BETWEEN 1 AND 14, 'A confirmation lasts between 1 and 14 days');
  SELECT * INTO o FROM public.oh_organisations WHERE id = p_org;
  INSERT INTO public.oh_service_status (organisation_id, service, status, note, verified_by, verified_by_name, valid_until)
  VALUES (p_org, p_service, p_status, nullif(btrim(p_note), ''), auth.uid(), public.oh_actor_name(), now() + make_interval(days => p_valid_days));
  IF p_service IN ('arv', 'rig') AND p_status IN ('limited', 'unavailable') THEN
    FOR coord IN SELECT DISTINCT ON (pp2.organisation_id) pp2.organisation_id AS org, pp.programme_id FROM public.oh_participations pp
        JOIN LATERAL public.oh_programme_line(pp.programme_id) line ON true
        JOIN public.oh_participations pp2 ON pp2.programme_id = line.id
        JOIN public.oh_organisations c ON c.id = pp2.organisation_id AND c.kind IN ('coordinator', 'municipal', 'state')
       WHERE pp.organisation_id = p_org LOOP
      INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, due_on, dedupe_key, created_by)
      VALUES (coord.programme_id, 'service_gap', p_org, coord.org,
        (CASE p_service WHEN 'arv' THEN 'Anti-rabies vaccine' ELSE 'Rabies immunoglobulin' END) || ' ' || CASE p_status WHEN 'limited' THEN 'limited' ELSE 'not available' END || ' at ' || coalesce(o.short_name, o.name),
        concat_ws(E'\n', CASE WHEN nullif(btrim(p_note), '') IS NOT NULL THEN 'Facility note: ' || btrim(p_note) END, 'Confirmed by facility staff. Decide on supply or referral with the partners.'),
        o.area_id, public.oh_org_today(p_org) + 1, 'gap:' || p_org || ':' || p_service, auth.uid())
      ON CONFLICT DO NOTHING;
      n := n + 1;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('alerted', n);
END $$;

CREATE OR REPLACE FUNCTION public.oh_handoff_act(p_handoff uuid, p_action text, p_outcome text DEFAULT NULL, p_animal uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE h public.oh_handoffs;
BEGIN
  SELECT * INTO h FROM public.oh_handoffs WHERE id = p_handoff;
  PERFORM public.oh_need(h.id IS NOT NULL AND public.oh_can(h.to_org, 'act_handoff'), 'Only the receiving team can act on this');
  PERFORM public.oh_need(p_action IN ('accept', 'done', 'decline'), 'Accept, complete or decline');
  PERFORM public.oh_need(p_action = 'accept' OR length(btrim(coalesce(p_outcome, ''))) >= 3, 'Say what was found or why it was declined');
  PERFORM public.oh_need(h.status NOT IN ('done', 'declined'), 'This has already been closed');
  PERFORM public.oh_need(p_animal IS NULL OR EXISTS (SELECT 1 FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE d.id = p_animal AND o.id = h.to_org), 'That animal is not on your register');
  UPDATE public.oh_handoffs SET status = CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'done' THEN 'done' ELSE 'declined' END,
    outcome = coalesce(nullif(btrim(p_outcome), ''), outcome), animal_id = coalesce(p_animal, animal_id), updated_at = now(),
    closed_at = CASE WHEN p_action <> 'accept' THEN now() END, closed_by_name = CASE WHEN p_action <> 'accept' THEN public.oh_actor_name() END
  WHERE id = p_handoff;
END $$;

CREATE OR REPLACE FUNCTION public.oh_raise_handoff(p_programme uuid, p_kind text, p_to uuid, p_title text, p_detail text, p_area uuid, p_due date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE hid uuid; me uuid;
BEGIN
  PERFORM public.oh_need(public.oh_can_oversee(p_programme), 'Only programme coordinators can raise this');
  PERFORM public.oh_need(p_to IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)), 'Choose a programme partner');
  SELECT m.organisation_id INTO me FROM public.oh_my_memberships() m JOIN public.oh_participations pp ON pp.organisation_id = m.organisation_id
   WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)) AND m.kind IN ('coordinator', 'municipal', 'state') AND public.oh_can(m.organisation_id, 'raise_handoff') LIMIT 1;
  PERFORM public.oh_need(me IS NOT NULL, 'Your role cannot raise requests');
  INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, due_on, created_by)
  VALUES (p_programme, p_kind, me, p_to, btrim(p_title), nullif(btrim(p_detail), ''), p_area, p_due, auth.uid()) RETURNING id INTO hid;
  RETURN hid;
END $$;

CREATE OR REPLACE FUNCTION public.oh_submit_sample(p_from uuid, p_lab uuid, p_species text, p_type text, p_collected_on date, p_area uuid, p_place text, p_reason text, p_animal uuid DEFAULT NULL, p_handoff uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE sid uuid; c text;
BEGIN
  PERFORM public.oh_need(public.oh_can(p_from, 'send_sample'), 'Only members of the submitting team can send a sample');
  PERFORM public.oh_need(EXISTS (SELECT 1 FROM public.oh_organisations l WHERE l.id = p_lab AND l.kind = 'laboratory'
    AND EXISTS (SELECT 1 FROM public.oh_participations a JOIN public.oh_participations b ON b.programme_id = a.programme_id WHERE a.organisation_id = p_from AND b.organisation_id = l.id)), 'Choose a laboratory you work with in a programme');
  PERFORM public.oh_need(p_collected_on <= public.oh_org_today(p_from), 'Collection date cannot be in the future');
  c := public.oh_code('S', p_from);
  INSERT INTO public.oh_samples (code, submitted_by, laboratory_id, animal_id, species, sample_type, reason, collected_on, collected_by_name, area_id, place, status)
  VALUES (c, p_from, p_lab, p_animal, p_species, p_type, nullif(btrim(p_reason), ''), p_collected_on, public.oh_actor_name(), p_area, nullif(btrim(p_place), ''), 'dispatched')
  RETURNING id INTO sid;
  INSERT INTO public.oh_sample_events (sample_id, actor, actor_name, organisation_id, action, note) VALUES
    (sid, auth.uid(), public.oh_actor_name(), p_from, 'collected', NULL), (sid, auth.uid(), public.oh_actor_name(), p_from, 'dispatched', NULL);
  IF p_handoff IS NOT NULL THEN UPDATE public.oh_handoffs SET sample_id = sid, updated_at = now() WHERE id = p_handoff AND to_org = p_from; END IF;
  RETURN jsonb_build_object('id', sid, 'code', c);
END $$;

CREATE OR REPLACE FUNCTION public.oh_sample_step(p_sample uuid, p_action text, p_note text DEFAULT NULL, p_result text DEFAULT NULL, p_method text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s public.oh_samples; nxt text; coord record;
BEGIN
  SELECT * INTO s FROM public.oh_samples WHERE id = p_sample;
  PERFORM public.oh_need(s.id IS NOT NULL AND public.oh_can(s.laboratory_id, 'lab_step'), 'Only the receiving laboratory can update this sample');
  nxt := CASE
    WHEN p_action = 'received' AND s.status IN ('collected', 'dispatched') THEN 'received'
    WHEN p_action = 'testing' AND s.status = 'received' THEN 'testing'
    WHEN p_action = 'resulted' AND s.status = 'testing' THEN 'resulted'
    WHEN p_action = 'rejected' AND s.status IN ('dispatched', 'received') THEN 'rejected'
    WHEN p_action = 'note' THEN s.status END;
  PERFORM public.oh_need(nxt IS NOT NULL, 'That step is not possible from ' || s.status);
  PERFORM public.oh_need(p_action <> 'resulted' OR (p_result IN ('positive', 'negative', 'inconclusive') AND length(btrim(coalesce(p_method, ''))) >= 2), 'Record the result and the test method');
  PERFORM public.oh_need(p_action <> 'rejected' OR length(btrim(coalesce(p_note, ''))) >= 3, 'Say why the sample was rejected');
  UPDATE public.oh_samples SET status = nxt,
    result = CASE WHEN p_action = 'resulted' THEN p_result ELSE result END, method = CASE WHEN p_action = 'resulted' THEN btrim(p_method) ELSE method END,
    result_note = CASE WHEN p_action IN ('resulted', 'rejected') THEN nullif(btrim(p_note), '') ELSE result_note END,
    resulted_at = CASE WHEN p_action = 'resulted' THEN now() ELSE resulted_at END, resulted_by_name = CASE WHEN p_action = 'resulted' THEN public.oh_actor_name() ELSE resulted_by_name END
  WHERE id = p_sample;
  INSERT INTO public.oh_sample_events (sample_id, actor, actor_name, organisation_id, action, note) VALUES (p_sample, auth.uid(), public.oh_actor_name(), s.laboratory_id, p_action, nullif(btrim(p_note), ''));
  IF p_action IN ('resulted', 'rejected') THEN
    INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, animal_id, sample_id, created_by)
    VALUES ((SELECT a.programme_id FROM public.oh_participations a JOIN public.oh_participations b ON b.programme_id = a.programme_id WHERE a.organisation_id = s.submitted_by AND b.organisation_id = s.laboratory_id LIMIT 1),
      'result_notice', s.laboratory_id, s.submitted_by,
      CASE WHEN p_action = 'rejected' THEN 'Sample ' || s.code || ' could not be tested' ELSE 'Result for sample ' || s.code || ': ' || p_result END,
      CASE WHEN p_action = 'rejected' THEN 'Reason: ' || btrim(p_note) ELSE 'Method: ' || btrim(p_method) || CASE WHEN p_result = 'positive' THEN E'\nA positive result has been shared with the programme coordinators.' ELSE '' END END,
      s.area_id, s.place, s.animal_id, s.id, auth.uid());
  END IF;
  IF p_action = 'resulted' AND p_result = 'positive' THEN
    FOR coord IN SELECT DISTINCT ON (pp.organisation_id) pp.organisation_id AS org, pp.programme_id
        FROM public.oh_participations lab JOIN LATERAL public.oh_programme_line(lab.programme_id) line ON true
        JOIN public.oh_participations pp ON pp.programme_id = line.id
        JOIN public.oh_organisations c ON c.id = pp.organisation_id AND c.kind IN ('coordinator', 'municipal', 'state')
       WHERE lab.organisation_id = s.laboratory_id
         AND (s.area_id IS NULL OR s.area_id IN (SELECT area_id FROM public.oh_programme_areas_all(line.id))) LOOP
      INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, sample_id, created_by)
      VALUES (coord.programme_id, 'result_notice', s.laboratory_id, coord.org, 'Laboratory-confirmed rabies: ' || coalesce(public.oh_area_name(s.area_id), 'area not recorded'),
        'Sample ' || s.code || ' (' || s.species || ') tested positive by ' || btrim(p_method) || '. Decide the response with the partners.', s.area_id, s.place, s.id, auth.uid());
    END LOOP;
  END IF;
END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname LIKE 'oh\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
  END LOOP;
END $$;