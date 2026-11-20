-- One Health fixes found by walking every workspace as its users (November 2026).
--
-- 1. Small counts could be worked out. Surveillance shows the exposure total beside the count for each area, and an
--    area under the threshold shows as "<5". When only one area was hidden, total minus the others gave its exact
--    value (seen on staging: 80 in total, nine areas summing to 76, so Malleshwaram was 4). The same holds for weeks
--    and for child programmes. oh_suppress_cells now also hides the next-smallest cell when exactly one is hidden: it
--    shows as "5+" (true: it is five or more), and hidden cells are listed after the others in name order, so neither
--    the arithmetic nor the order gives the small one away.
-- 2. The programme report's training figures ignored the period chosen: 30 days, 90 days and 12 months all showed the
--    same sessions. They now count sessions held in the period.
-- 3. "Facilities without vaccine: 0" counted only facilities confirmed as unavailable, so a facility whose
--    confirmation had expired read as fine. arv_unconfirmed now counts facilities with no current confirmation.
-- 4. A bite notice from the public bite helper ("Shall I send it to the nearest anti-rabies centre?") went to the
--    closest listed facility even when it does not give the vaccine (seen: a wound-washing unit that refers elsewhere,
--    while the teaching hospital nearby had it available). Facilities are now ranked by the vaccine first:
--    confirmed available, limited, not confirmed recently, refers elsewhere, confirmed unavailable; then area,
--    distance and kind as before. The reply says what is known about the vaccine there.
-- 5. A dose could be recorded as missed before the day it was due. The screen now prevents it; so does the database.
-- 6. The bite helper took the area of the nearest facility as the area where the bite happened, so a bite near a ward
--    boundary was filed under the neighbouring ward. oh_public_services now returns each area's outline (the
--    boundaries the programme set up; nothing about people), and the helper uses the area the point falls in, or
--    none.
-- 7. oh_referral_history: the receiving clinic reads which doses the referring facility gave (see below).
--
-- Not applied automatically. Safe to re-run: every statement replaces a function or is idempotent.

CREATE OR REPLACE FUNCTION public.oh_suppress_cells(p_cells jsonb, p_below int, p_key text, p_field text DEFAULT 'n', p_by_size boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE sup int := greatest(coalesce(p_below, 5), 5); small int; extra bigint;
BEGIN
  IF p_cells IS NULL OR jsonb_typeof(p_cells) <> 'array' THEN RETURN '[]'::jsonb; END IF;
  SELECT count(*) INTO small FROM jsonb_array_elements(p_cells) c WHERE (c->>p_field)::bigint BETWEEN 1 AND sup - 1;
  IF small = 1 THEN
    SELECT o INTO extra FROM jsonb_array_elements(p_cells) WITH ORDINALITY AS t(c, o)
     WHERE (c->>p_field)::bigint >= sup ORDER BY (c->>p_field)::bigint, c->>p_key, o LIMIT 1;
  END IF;
  RETURN coalesce((SELECT jsonb_agg(c || jsonb_build_object(p_field,
      CASE WHEN o IS NOT DISTINCT FROM extra THEN '"5+"'::jsonb ELSE public.oh_suppress((c->>p_field)::bigint, sup) END)
      ORDER BY CASE WHEN p_by_size THEN (o IS NOT DISTINCT FROM extra OR (c->>p_field)::bigint BETWEEN 1 AND sup - 1) END,
               CASE WHEN p_by_size AND NOT (o IS NOT DISTINCT FROM extra OR (c->>p_field)::bigint BETWEEN 1 AND sup - 1) THEN (c->>p_field)::bigint END DESC,
               CASE WHEN p_by_size THEN c->>p_key END, o)
    FROM jsonb_array_elements(p_cells) WITH ORDINALITY AS t(c, o)), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.oh_suppress_cells(jsonb, int, text, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.oh_programme_overview(p_programme uuid, p_days int DEFAULT 90)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_today(p_programme); since date; p public.oh_programmes; sup int; ids uuid[];
BEGIN
  PERFORM public.oh_need(public.oh_in_programme(p_programme), 'Only programme partners can see the overview');
  SELECT * INTO p FROM public.oh_programmes WHERE id = p_programme;
  since := td - least(greatest(p_days, 7), 730);
  sup := public.oh_cfg_int(p_programme, 'suppress_below', 5, 5, 50);
  SELECT coalesce(array_agg(id), '{}') INTO ids FROM public.oh_scope_exposures(p_programme, since);
  RETURN jsonb_build_object(
    'programme', jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'status', p.status, 'illustrative', p.illustrative, 'target', p.vaccination_target, 'summary', p.summary,
       'modules', coalesce(p.config->'modules', '["bite_care","laboratory","followups","vaccination","services","training"]'::jsonb), 'suppress_below', sup,
       'parent', (SELECT jsonb_build_object('slug', a.slug, 'name', a.name) FROM public.oh_programmes a WHERE a.id = p.parent_id)),
    'since', since, 'today', td,
    'can_oversee', public.oh_can_oversee(p_programme), 'can_manage', public.oh_can_manage(p_programme),
    'children', public.oh_suppress_cells((SELECT coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'status', c.status,
        'exposures', (SELECT count(*) FROM public.oh_scope_exposures(c.id, since)),
        'positives', (SELECT count(*) FROM public.oh_samples s WHERE s.result = 'positive' AND s.collected_on >= since AND s.area_id IN (SELECT area_id FROM public.oh_programme_areas_all(c.id))),
        'overdue', (SELECT count(*) FROM public.oh_handoffs h WHERE h.programme_id IN (SELECT id FROM public.oh_programme_tree(c.id)) AND h.status IN ('open', 'accepted') AND h.due_on < td)) ORDER BY c.name), '[]')
       FROM public.oh_programmes c WHERE c.parent_id = p_programme), sup, 'slug', 'exposures', false),
    'partners', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'short_name', o.short_name, 'kind', o.kind, 'responsibilities', pp.responsibilities,
        'members', (SELECT count(*) FROM public.oh_members m WHERE m.organisation_id = o.id) + (SELECT count(*) FROM public.ngo_members nm WHERE nm.ngo_id = o.ngo_id AND NOT EXISTS (SELECT 1 FROM public.oh_members mm WHERE mm.organisation_id = o.id AND mm.user_id = nm.user_id)),
        'open', (SELECT count(*) FROM public.oh_handoffs h WHERE h.to_org = o.id AND h.status IN ('open', 'accepted')),
        'overdue', (SELECT count(*) FROM public.oh_handoffs h WHERE h.to_org = o.id AND h.status IN ('open', 'accepted') AND h.due_on < td)) ORDER BY o.kind, o.name), '[]')
       FROM public.oh_participations pp JOIN public.oh_organisations o ON o.id = pp.organisation_id WHERE pp.programme_id = p_programme),
    'exposures', jsonb_build_object(
      'total', public.oh_suppress(coalesce(array_length(ids, 1), 0), sup),
      'category_iii', public.oh_suppress((SELECT count(*) FROM health.exposures WHERE id = ANY (ids) AND category = 'III'), sup),
      'washed', public.oh_suppress((SELECT count(*) FROM health.exposures WHERE id = ANY (ids) AND wound_washed IN ('before_arrival', 'at_facility')), sup),
      'washed_known', public.oh_suppress((SELECT count(*) FROM health.exposures WHERE id = ANY (ids) AND wound_washed <> 'not_recorded'), sup),
      'by_week', public.oh_suppress_cells((SELECT coalesce(jsonb_agg(jsonb_build_object('week', w, 'n', n) ORDER BY w), '[]') FROM (
         SELECT date_trunc('week', exposure_on)::date w, count(*) n FROM health.exposures WHERE id = ANY (ids) GROUP BY 1) x), sup, 'week', 'n', false),
      'by_area', public.oh_suppress_cells((SELECT coalesce(jsonb_agg(jsonb_build_object('area', name, 'n', n)), '[]') FROM (
         SELECT coalesce(public.oh_area_name(area_id), 'Not recorded') name, count(*) n FROM health.exposures WHERE id = ANY (ids) GROUP BY 1) x), sup, 'area', 'n', true)),
    'pep', (SELECT jsonb_build_object('courses', public.oh_suppress(count(*), sup),
        'completed', public.oh_suppress(count(*) FILTER (WHERE c.status = 'completed'), sup),
        'lost', public.oh_suppress(count(*) FILTER (WHERE c.status = 'lost_to_follow_up'), sup),
        'active', public.oh_suppress(count(*) FILTER (WHERE c.status = 'active'), sup),
        'completion_rate', CASE WHEN count(*) FILTER (WHERE c.status <> 'active') >= sup THEN round(count(*) FILTER (WHERE c.status = 'completed')::numeric / count(*) FILTER (WHERE c.status <> 'active'), 2) END,
        'doses_overdue', public.oh_suppress((SELECT count(*) FROM health.pep_doses d JOIN health.pep_courses cc ON cc.id = d.course_id WHERE cc.exposure_id = ANY (ids) AND cc.status = 'active' AND d.status = 'due' AND d.due_on < td), sup))
      FROM health.pep_courses c WHERE c.exposure_id = ANY (ids)),
    'samples', (SELECT jsonb_build_object('total', count(*), 'waiting', count(*) FILTER (WHERE status IN ('dispatched', 'received', 'testing')),
        'positive', count(*) FILTER (WHERE result = 'positive'), 'negative', count(*) FILTER (WHERE result = 'negative'),
        'median_days_to_result', percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM resulted_at - created_at) / 86400) FILTER (WHERE resulted_at IS NOT NULL),
        'positive_areas', coalesce(jsonb_agg(DISTINCT coalesce(public.oh_area_name(area_id), 'Not recorded')) FILTER (WHERE result = 'positive'), '[]'))
      FROM public.oh_samples WHERE collected_on >= since AND laboratory_id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))
        AND (area_id IS NULL OR area_id IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme)))),
    'handoffs', (SELECT jsonb_build_object('open', count(*) FILTER (WHERE status IN ('open', 'accepted')), 'overdue', count(*) FILTER (WHERE status IN ('open', 'accepted') AND due_on < td),
        'done', count(*) FILTER (WHERE status = 'done'),
        'median_days_to_close', percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM closed_at - created_at) / 86400) FILTER (WHERE closed_at IS NOT NULL),
        'service_gaps', count(*) FILTER (WHERE kind = 'service_gap' AND status IN ('open', 'accepted')))
      FROM public.oh_handoffs WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)) AND created_at >= since),
    'services', (SELECT jsonb_build_object('facilities', count(DISTINCT o.id), 'confirmed', count(s.id) FILTER (WHERE s.valid_until >= now()), 'stale', count(s.id) FILTER (WHERE s.valid_until < now()),
        'arv_unavailable', count(*) FILTER (WHERE s.service = 'arv' AND s.status = 'unavailable' AND s.valid_until >= now()),
        'arv_limited', count(*) FILTER (WHERE s.service = 'arv' AND s.status = 'limited' AND s.valid_until >= now()),
        'never_confirmed', count(DISTINCT o.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.oh_service_status z WHERE z.organisation_id = o.id)),
        'arv_unconfirmed', (SELECT count(*) FROM public.oh_organisations o2 WHERE o2.kind IN ('hospital', 'clinic') AND o2.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))
           AND NOT EXISTS (SELECT 1 FROM public.oh_service_status z WHERE z.organisation_id = o2.id AND z.service = 'arv' AND z.valid_until >= now())))
      FROM public.oh_organisations o LEFT JOIN LATERAL (SELECT DISTINCT ON (service) * FROM public.oh_service_status x WHERE x.organisation_id = o.id ORDER BY service, verified_at DESC) s ON true
      WHERE o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))),
    'vaccination', (SELECT coalesce(jsonb_agg(v ORDER BY v->>'area'), '[]') FROM (
      SELECT jsonb_build_object('area', a.name, 'area_id', a.id,
        'registered', (SELECT count(*) FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND d.zone = a.name),
        'vaccinated', (SELECT count(*) FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND d.zone = a.name AND d.vaccination_status = 'vaccinated'),
        'estimate', (SELECT jsonb_build_object('dogs', e.dogs_estimated, 'method', e.method, 'source', e.source, 'on', e.estimated_on) FROM public.oh_estimates e WHERE e.area_id = a.id ORDER BY e.estimated_on DESC LIMIT 1)) v
      FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme))) x),
    'training', (SELECT jsonb_build_object('sessions', count(*), 'participants', coalesce(sum(participants), 0),
        'by_audience', (SELECT coalesce(jsonb_object_agg(audience, n), '{}') FROM (SELECT audience, sum(participants) n FROM public.oh_trainings WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)) AND held_on BETWEEN since AND td GROUP BY 1) a))
      FROM public.oh_trainings WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)) AND held_on BETWEEN since AND td)
  );
END $$;

CREATE OR REPLACE FUNCTION public.oh_submit_bite_notice(p_programme_slug text, p_happened_on date, p_area uuid, p_place text, p_species text, p_animal_description text, p_phone text, p_consent boolean, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE prog uuid; fac uuid; nid uuid; td date; arv text; arv_on timestamptz;
BEGIN
  SELECT id INTO prog FROM public.oh_programmes WHERE slug = p_programme_slug AND status IN ('pilot', 'active');
  PERFORM public.oh_need(prog IS NOT NULL, 'This programme is not accepting notices');
  td := public.oh_today(prog);
  PERFORM public.oh_need(p_happened_on BETWEEN td - 30 AND td, 'Give a date in the last 30 days');
  PERFORM public.oh_need(p_area IS NULL OR p_area IN (SELECT area_id FROM public.oh_programme_areas_all(prog)), 'That area is not part of this programme');
  SELECT o.id, CASE WHEN s.valid_until >= now() THEN s.status
                    WHEN EXISTS (SELECT 1 FROM public.oh_referrals r WHERE r.from_org = o.id AND r.programme_id = prog AND r.service = 'arv') THEN 'refers'
                    ELSE 'not_confirmed' END, s.verified_at
    INTO fac, arv, arv_on
    FROM public.oh_organisations o
    LEFT JOIN LATERAL (SELECT z.status, z.verified_at, z.valid_until FROM public.oh_service_status z
                        WHERE z.organisation_id = o.id AND z.service = 'arv' ORDER BY z.verified_at DESC LIMIT 1) s ON true
   WHERE o.listed_publicly AND o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(prog))
   ORDER BY CASE WHEN s.valid_until >= now() AND s.status = 'available' THEN 0
                 WHEN s.valid_until >= now() AND s.status = 'limited' THEN 1
                 WHEN s.valid_until >= now() AND s.status = 'unavailable' THEN 4
                 WHEN EXISTS (SELECT 1 FROM public.oh_referrals r WHERE r.from_org = o.id AND r.programme_id = prog AND r.service = 'arv') THEN 3
                 ELSE 2 END,
            (p_area IS NOT NULL AND o.area_id IS NOT DISTINCT FROM p_area) DESC,
            CASE WHEN p_lat IS NULL OR p_lng IS NULL THEN 0 ELSE (o.lat - p_lat) ^ 2 + ((o.lng - p_lng) * cos(radians(p_lat))) ^ 2 END,
            o.kind = 'hospital' DESC, o.name LIMIT 1;
  INSERT INTO health.citizen_notices (programme_id, facility_id, happened_on, area_id, place, animal_species, animal_description, callback_phone, callback_consent)
  VALUES (prog, fac, p_happened_on, p_area, left(nullif(btrim(p_place), ''), 200), coalesce(nullif(p_species, ''), 'unknown'), left(nullif(btrim(p_animal_description), ''), 300),
    CASE WHEN p_consent THEN nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+ ]', '', 'g'), '') END, coalesce(p_consent, false))
  RETURNING id INTO nid;
  INSERT INTO health.audit (actor, organisation_id, action, entity, entity_id) VALUES (auth.uid(), fac, 'citizen_notice', 'citizen_notice', nid);
  RETURN jsonb_build_object('received', true, 'facility', (SELECT jsonb_build_object('name', name, 'address', address, 'phone', phone, 'hours', hours,
    'vaccine', arv, 'vaccine_confirmed_at', CASE WHEN arv IN ('available', 'limited', 'unavailable') THEN arv_on END) FROM public.oh_organisations WHERE id = fac));
END $$;

CREATE OR REPLACE FUNCTION public.oh_record_dose(p_dose uuid, p_status text, p_given_on date DEFAULT NULL, p_batch text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE f uuid; cid uuid; remaining int; st text; due date; completed boolean := false;
BEGIN
  SELECT e.facility_id, c.id, d.status, d.due_on INTO f, cid, st, due FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id WHERE d.id = p_dose;
  PERFORM public.oh_need(f IS NOT NULL AND public.oh_can(f, 'record_dose'), 'Only a nurse or clinician of this facility can record a dose');
  PERFORM public.oh_need(st = 'due', 'This dose has already been recorded');
  PERFORM public.oh_need(p_status IN ('given', 'missed'), 'Record the dose as given or missed');
  PERFORM public.oh_need(p_status <> 'missed' OR due <= public.oh_org_today(f), 'A dose cannot be marked missed before the day it is due');
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

CREATE OR REPLACE FUNCTION public.oh_public_services(p_programme_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH p AS (SELECT * FROM public.oh_programmes WHERE slug = p_programme_slug AND status IN ('pilot', 'active'))
  SELECT jsonb_build_object(
    'programme', (SELECT jsonb_build_object('name', p.name, 'illustrative', p.illustrative,
        'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'geometry', a.geometry) ORDER BY a.name) FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p.id))), '[]'::jsonb)) FROM p),
    'facilities', coalesce((SELECT jsonb_agg(f ORDER BY f->>'name') FROM (
      SELECT jsonb_build_object('id', o.id, 'name', o.name, 'kind', o.kind, 'area', public.oh_area_name(o.area_id), 'address', o.address, 'phone', o.phone, 'hours', o.hours, 'lat', o.lat, 'lng', o.lng,
        'services', coalesce((SELECT jsonb_agg(jsonb_build_object('service', s.service, 'status', s.status, 'note', s.note, 'verified_at', s.verified_at, 'valid_until', s.valid_until)) FROM public.oh_service_now(o.id) s), '[]'::jsonb),
        'refers', coalesce((SELECT jsonb_agg(jsonb_build_object('service', r.service, 'to', t.name, 'to_id', t.id)) FROM public.oh_referrals r JOIN public.oh_organisations t ON t.id = r.to_org
                     WHERE r.from_org = o.id AND r.programme_id = (SELECT id FROM p) AND t.listed_publicly), '[]'::jsonb)) AS f
      FROM public.oh_organisations o WHERE o.listed_publicly AND o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs((SELECT id FROM p)))) x), '[]'::jsonb))
$$;

-- 7. A person referred mid-course arrived at the receiving clinic with no dose history, and Kaju prepared a whole new
--    course from today (seen: dose 1 given at the teaching hospital, then 4 more doses "the first today"). The receiving
--    clinic can now read what the referral carries: the sending facility, its regimen, and the dates of the doses it
--    recorded as given. Nothing else about the person, and only for an exposure recorded from that referral.
CREATE OR REPLACE FUNCTION public.oh_referral_history(p_exposure uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e health.exposures; t health.transfers;
BEGIN
  SELECT * INTO e FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(e.id IS NOT NULL AND public.oh_can(e.facility_id, 'view_register'), 'Only staff of this facility can open this record');
  IF e.transfer_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO t FROM health.transfers WHERE id = e.transfer_id AND to_org = e.facility_id;
  IF t.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'from', (SELECT coalesce(o.short_name, o.name) FROM public.oh_organisations o WHERE o.id = t.from_org),
    'sent_at', t.sent_at, 'service', t.service,
    'regimen', (SELECT c.regimen FROM health.pep_courses c WHERE c.exposure_id = t.exposure_id),
    'given', coalesce((SELECT jsonb_agg(jsonb_build_object('dose', d.dose_no, 'on', d.given_on) ORDER BY d.given_on, d.dose_no)
       FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id
      WHERE c.exposure_id = t.exposure_id AND d.status = 'given'), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.oh_referral_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oh_referral_history(uuid) TO authenticated;
