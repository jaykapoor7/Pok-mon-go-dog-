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
    'children', (SELECT coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'status', c.status,
        'exposures', public.oh_suppress((SELECT count(*) FROM public.oh_scope_exposures(c.id, since)), sup),
        'positives', (SELECT count(*) FROM public.oh_samples s WHERE s.result = 'positive' AND s.collected_on >= since AND s.area_id IN (SELECT area_id FROM public.oh_programme_areas_all(c.id))),
        'overdue', (SELECT count(*) FROM public.oh_handoffs h WHERE h.programme_id IN (SELECT id FROM public.oh_programme_tree(c.id)) AND h.status IN ('open', 'accepted') AND h.due_on < td)) ORDER BY c.name), '[]')
       FROM public.oh_programmes c WHERE c.parent_id = p_programme),
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
      'by_week', (SELECT coalesce(jsonb_agg(jsonb_build_object('week', w, 'n', public.oh_suppress(n, sup)) ORDER BY w), '[]') FROM (
         SELECT date_trunc('week', exposure_on)::date w, count(*) n FROM health.exposures WHERE id = ANY (ids) GROUP BY 1) x),
      'by_area', (SELECT coalesce(jsonb_agg(jsonb_build_object('area', name, 'n', public.oh_suppress(n, sup)) ORDER BY n DESC), '[]') FROM (
         SELECT coalesce(public.oh_area_name(area_id), 'Not recorded') name, count(*) n FROM health.exposures WHERE id = ANY (ids) GROUP BY 1) x)),
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
        'never_confirmed', count(DISTINCT o.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.oh_service_status z WHERE z.organisation_id = o.id)))
      FROM public.oh_organisations o LEFT JOIN LATERAL (SELECT DISTINCT ON (service) * FROM public.oh_service_status x WHERE x.organisation_id = o.id ORDER BY service, verified_at DESC) s ON true
      WHERE o.kind IN ('hospital', 'clinic') AND o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme))),
    'vaccination', (SELECT coalesce(jsonb_agg(v ORDER BY v->>'area'), '[]') FROM (
      SELECT jsonb_build_object('area', a.name, 'area_id', a.id,
        'registered', (SELECT count(*) FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND d.zone = a.name),
        'vaccinated', (SELECT count(*) FROM public.dogs d JOIN public.oh_organisations o ON o.ngo_id = d.ngo_id WHERE o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND d.zone = a.name AND d.vaccination_status = 'vaccinated'),
        'estimate', (SELECT jsonb_build_object('dogs', e.dogs_estimated, 'method', e.method, 'source', e.source, 'on', e.estimated_on) FROM public.oh_estimates e WHERE e.area_id = a.id ORDER BY e.estimated_on DESC LIMIT 1)) v
      FROM public.oh_areas a WHERE a.level IN ('ward', 'locality', 'zone') AND a.id IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme))) x),
    'training', (SELECT jsonb_build_object('sessions', count(*), 'participants', coalesce(sum(participants), 0),
        'by_audience', (SELECT coalesce(jsonb_object_agg(audience, n), '{}') FROM (SELECT audience, sum(participants) n FROM public.oh_trainings WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)) GROUP BY 1) a))
      FROM public.oh_trainings WHERE programme_id IN (SELECT id FROM public.oh_programme_tree(p_programme)))
  );
END $$;

CREATE OR REPLACE FUNCTION public.oh_record_training(p_programme uuid, p_title text, p_audience text, p_held_on date, p_participants int, p_institutions int DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE tid uuid; prov uuid;
BEGIN
  SELECT m.organisation_id INTO prov FROM public.oh_my_memberships() m JOIN public.oh_participations pp ON pp.organisation_id = m.organisation_id
   WHERE pp.programme_id = p_programme AND public.oh_can(m.organisation_id, 'record_training') LIMIT 1;
  PERFORM public.oh_need(prov IS NOT NULL, 'Only programme coordinators, laboratories or trainers can record training');
  INSERT INTO public.oh_trainings (programme_id, provider_id, title, audience, held_on, participants, institutions_reached, notes, recorded_by)
  VALUES (p_programme, prov, btrim(p_title), p_audience, p_held_on, p_participants, p_institutions, nullif(btrim(p_notes), ''), auth.uid()) RETURNING id INTO tid;
  RETURN tid;
END $$;

CREATE OR REPLACE FUNCTION public.oh_record_estimate(p_programme uuid, p_area uuid, p_dogs int, p_method text, p_source text, p_on date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE eid uuid;
BEGIN
  PERFORM public.oh_need(public.oh_can_oversee(p_programme), 'Only programme coordinators can record a population estimate');
  PERFORM public.oh_need(p_area IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme)), 'That area is not part of this programme');
  INSERT INTO public.oh_estimates (area_id, dogs_estimated, method, source, estimated_on, recorded_by)
  VALUES (p_area, p_dogs, btrim(p_method), btrim(p_source), p_on, auth.uid()) RETURNING id INTO eid;
  RETURN eid;
END $$;

CREATE OR REPLACE FUNCTION public.oh_research_extract(p_programme uuid, p_days int DEFAULT 365)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE sup int := public.oh_cfg_int(p_programme, 'suppress_below', 5, 5, 50); since date := public.oh_today(p_programme) - least(greatest(p_days, 30), 1095);
BEGIN
  PERFORM public.oh_need(EXISTS (SELECT 1 FROM public.oh_my_memberships() m JOIN public.oh_participations pp ON pp.organisation_id = m.organisation_id
    WHERE pp.programme_id IN (SELECT id FROM public.oh_programme_line(p_programme)) AND (public.oh_can(m.organisation_id, 'analyse') OR public.oh_can(m.organisation_id, 'oversee'))), 'Analysis needs an analyst or coordinator role in this programme');
  RETURN jsonb_build_object('since', since, 'suppress_below', sup, 'rows', coalesce((SELECT jsonb_agg(jsonb_build_object('week', w, 'area', area, 'species', sp, 'category', cat, 'exposures', public.oh_suppress(n, sup)) ORDER BY w, area, sp, cat) FROM (
    SELECT date_trunc('week', exposure_on)::date w, coalesce(public.oh_area_name(area_id), 'Not recorded') area, animal_species sp, category cat, count(*) n
      FROM public.oh_scope_exposures(p_programme, since) GROUP BY 1, 2, 3, 4) x), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.oh_create_programme(p_name text, p_slug text, p_time_zone text, p_area_names text[], p_parent uuid DEFAULT NULL, p_city text DEFAULT NULL, p_display_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE pid uuid; org uuid; city uuid; nm text;
BEGIN
  PERFORM public.oh_need(auth.uid() IS NOT NULL, 'Sign in to set up a programme');
  PERFORM public.oh_need(length(btrim(coalesce(p_name, ''))) >= 3, 'Give the programme a name');
  PERFORM public.oh_need(p_slug ~ '^[a-z0-9-]{3,60}$', 'Use 3 to 60 lowercase letters, numbers or hyphens for the address');
  PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM public.oh_programmes WHERE slug = p_slug), 'That address is taken');
  PERFORM public.oh_need(EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_time_zone), 'Choose a valid time zone');
  PERFORM public.oh_need(p_parent IS NULL OR public.oh_can_manage(p_parent), 'Only a lead of the parent programme can add a programme beneath it');
  INSERT INTO public.oh_programmes (name, slug, time_zone, parent_id, status, created_by) VALUES (btrim(p_name), p_slug, p_time_zone, p_parent, 'planning', auth.uid()) RETURNING id INTO pid;
  INSERT INTO public.oh_areas (level, name, time_zone, source) VALUES ('city', coalesce(nullif(btrim(p_city), ''), btrim(p_name)), p_time_zone, 'Entered when the programme was set up') RETURNING id INTO city;
  INSERT INTO public.oh_programme_areas VALUES (pid, city);
  FOREACH nm IN ARRAY coalesce(p_area_names, '{}') LOOP
    IF length(btrim(nm)) >= 2 THEN INSERT INTO public.oh_areas (parent_id, level, name, source) VALUES (city, 'ward', btrim(nm), 'Entered when the programme was set up'); END IF;
  END LOOP;
  INSERT INTO public.oh_organisations (kind, name, short_name, area_id, time_zone) VALUES ('coordinator', left(btrim(p_name) || ' coordination', 160), 'Coordination', city, p_time_zone) RETURNING id INTO org;
  INSERT INTO public.oh_participations (programme_id, organisation_id, responsibilities) VALUES (pid, org, 'Programme coordination, monitoring and evaluation');
  INSERT INTO public.oh_members (organisation_id, user_id, role, display_name) VALUES (org, auth.uid(), 'lead', nullif(btrim(p_display_name), ''));
  RETURN jsonb_build_object('id', pid, 'slug', p_slug, 'organisation_id', org);
END $$;

CREATE OR REPLACE FUNCTION public.oh_add_partner(p_programme uuid, p_kind text, p_name text, p_short_name text DEFAULT NULL, p_responsibilities text DEFAULT NULL, p_area uuid DEFAULT NULL, p_existing uuid DEFAULT NULL, p_ngo uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := p_existing; tz text;
BEGIN
  PERFORM public.oh_need(public.oh_can_manage(p_programme), 'Only a programme lead can add partners');
  SELECT time_zone INTO tz FROM public.oh_programmes WHERE id = p_programme;
  IF org IS NULL AND p_ngo IS NOT NULL THEN SELECT id INTO org FROM public.oh_organisations WHERE ngo_id = p_ngo; END IF;
  IF org IS NULL THEN
    PERFORM public.oh_need(p_ngo IS NULL OR EXISTS (SELECT 1 FROM public.ngos WHERE id = p_ngo), 'That organisation is not on StrayPaw');
    INSERT INTO public.oh_organisations (kind, name, short_name, ngo_id, area_id, time_zone) VALUES (CASE WHEN p_ngo IS NOT NULL THEN 'ngo' ELSE p_kind END, btrim(p_name), nullif(btrim(p_short_name), ''), p_ngo, p_area, tz) RETURNING id INTO org;
  END IF;
  INSERT INTO public.oh_participations (programme_id, organisation_id, responsibilities) VALUES (p_programme, org, nullif(btrim(p_responsibilities), ''))
  ON CONFLICT (programme_id, organisation_id) DO UPDATE SET responsibilities = coalesce(EXCLUDED.responsibilities, oh_participations.responsibilities);
  RETURN org;
END $$;

CREATE OR REPLACE FUNCTION public.oh_add_area(p_programme uuid, p_name text, p_level text DEFAULT 'ward', p_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE parent uuid; aid uuid;
BEGIN
  PERFORM public.oh_need(public.oh_can_manage(p_programme), 'Only a programme lead can add areas');
  SELECT pa.area_id INTO parent FROM public.oh_programme_areas pa JOIN public.oh_areas a ON a.id = pa.area_id WHERE pa.programme_id = p_programme ORDER BY (a.level = 'city') DESC LIMIT 1;
  INSERT INTO public.oh_areas (parent_id, level, name, code, source) VALUES (parent, p_level, btrim(p_name), nullif(btrim(p_code), ''), 'Entered by the programme lead') RETURNING id INTO aid;
  IF parent IS NULL THEN INSERT INTO public.oh_programme_areas VALUES (p_programme, aid); END IF;
  RETURN aid;
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_assignment(p_programme uuid, p_area uuid, p_duty text, p_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can_oversee(p_programme), 'Only programme coordinators can assign areas');
  PERFORM public.oh_need(p_area IN (SELECT area_id FROM public.oh_programme_areas_all(p_programme)), 'That area is not part of this programme');
  IF p_org IS NULL THEN DELETE FROM public.oh_assignments WHERE programme_id = p_programme AND area_id = p_area AND duty = p_duty; RETURN; END IF;
  PERFORM public.oh_need(EXISTS (SELECT 1 FROM public.oh_participations WHERE programme_id = p_programme AND organisation_id = p_org), 'Choose a partner of this programme');
  INSERT INTO public.oh_assignments VALUES (p_programme, p_area, p_duty, p_org) ON CONFLICT (programme_id, area_id, duty) DO UPDATE SET organisation_id = EXCLUDED.organisation_id;
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_programme(p_programme uuid, p_summary text, p_status text, p_target numeric, p_config jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE allowed text[] := ARRAY['modules', 'suppress_below', 'followup_due_days'];
BEGIN
  PERFORM public.oh_need(public.oh_can_manage(p_programme), 'Only a programme lead can change the programme');
  PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM jsonb_object_keys(coalesce(p_config, '{}')) k WHERE k <> ALL (allowed)), 'Unknown setting');
  PERFORM public.oh_need(coalesce((p_config->>'suppress_below')::int, 5) >= 5, 'Counts below 5 are always hidden');
  PERFORM public.oh_need(p_status IN ('planning', 'pilot', 'active', 'closed'), 'Unknown status');
  UPDATE public.oh_programmes SET summary = nullif(btrim(p_summary), ''), status = p_status, vaccination_target = p_target, config = coalesce(p_config, '{}') WHERE id = p_programme;
END $$;

CREATE OR REPLACE FUNCTION public.oh_set_organisation(p_org uuid, p_address text, p_phone text, p_hours text, p_lat double precision, p_lng double precision, p_listed boolean, p_area uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can(p_org, 'manage') OR public.oh_can(p_org, 'invite') OR EXISTS (
    SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = p_org AND public.oh_can_manage(pp.programme_id)), 'Only a lead of this organisation or its programme can change it');
  PERFORM public.oh_need(NOT coalesce(p_listed, false) OR (p_lat IS NOT NULL AND p_lng IS NOT NULL), 'A listed facility needs its location');
  UPDATE public.oh_organisations SET address = nullif(btrim(p_address), ''), phone = nullif(btrim(p_phone), ''), hours = nullif(btrim(p_hours), ''),
    lat = p_lat, lng = p_lng, listed_publicly = coalesce(p_listed, false), area_id = coalesce(p_area, area_id) WHERE id = p_org;
END $$;

CREATE OR REPLACE FUNCTION public.oh_create_invite(p_org uuid, p_role text, p_email text DEFAULT NULL, p_display_name text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE c text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); k text;
BEGIN
  SELECT kind INTO k FROM public.oh_organisations WHERE id = p_org;
  PERFORM public.oh_need(k IS NOT NULL AND (public.oh_can(p_org, 'invite') OR (
    NOT EXISTS (SELECT 1 FROM public.oh_members WHERE organisation_id = p_org) AND EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = p_org AND public.oh_can_manage(pp.programme_id)))), 'Only a lead of this organisation can invite people');
  PERFORM public.oh_need(k <> 'ngo', 'NGO staff join through their organisation workspace');
  PERFORM public.oh_need(p_role IN ('lead', 'coordinator', 'clinician', 'nurse', 'records', 'lab_scientist', 'analyst', 'field', 'trainer'), 'Unknown role');
  PERFORM public.oh_need(p_role NOT IN ('clinician', 'nurse') OR k IN ('hospital', 'clinic'), 'Clinical roles belong to hospitals and health centres');
  PERFORM public.oh_need(p_role <> 'lab_scientist' OR k = 'laboratory', 'Laboratory roles belong to laboratories');
  INSERT INTO public.oh_invites (code, organisation_id, role, email, display_name, created_by) VALUES (c, p_org, p_role, nullif(lower(btrim(p_email)), ''), nullif(btrim(p_display_name), ''), auth.uid());
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.oh_accept_invite(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE i public.oh_invites; mail text;
BEGIN
  PERFORM public.oh_need(auth.uid() IS NOT NULL, 'Sign in first');
  SELECT * INTO i FROM public.oh_invites WHERE code = upper(btrim(p_code)) FOR UPDATE;
  PERFORM public.oh_need(i.code IS NOT NULL AND i.accepted_at IS NULL AND i.expires_at > now(), 'This code is not valid or has expired');
  SELECT email INTO mail FROM auth.users WHERE id = auth.uid();
  PERFORM public.oh_need(i.email IS NULL OR lower(mail) = i.email, 'This code was sent to a different email address');
  INSERT INTO public.oh_members (organisation_id, user_id, role, display_name) VALUES (i.organisation_id, auth.uid(), i.role, i.display_name)
  ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  UPDATE public.oh_invites SET accepted_by = auth.uid(), accepted_at = now() WHERE code = i.code;
  RETURN jsonb_build_object('organisation_id', i.organisation_id, 'role', i.role);
END $$;

CREATE OR REPLACE FUNCTION public.oh_org_invites(p_org uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can(p_org, 'invite') OR EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = p_org AND public.oh_can_manage(pp.programme_id)), 'Only leads can see invitations');
  RETURN jsonb_build_object(
    'members', coalesce((SELECT jsonb_agg(jsonb_build_object('name', coalesce(m.display_name, 'Member'), 'role', m.role, 'since', m.created_at) ORDER BY m.created_at) FROM public.oh_members m WHERE m.organisation_id = p_org), '[]'::jsonb),
    'invites', coalesce((SELECT jsonb_agg(jsonb_build_object('code', i.code, 'role', i.role, 'email', i.email, 'name', i.display_name, 'expires_at', i.expires_at) ORDER BY i.created_at DESC) FROM public.oh_invites i WHERE i.organisation_id = p_org AND i.accepted_at IS NULL AND i.expires_at > now()), '[]'::jsonb));
END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname LIKE 'oh\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    BEGIN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', f.sig); EXCEPTION WHEN undefined_object THEN NULL; END;
    IF f.proname <> 'oh_scope_exposures' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig); END IF;
    IF f.proname IN ('oh_public_services', 'oh_submit_bite_notice', 'oh_suppress', 'oh_need', 'oh_today', 'oh_programme_areas_all', 'oh_programme_orgs', 'oh_programme_tree', 'oh_area_name') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig); END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION health.log(uuid, text, text, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION health.no_rewrite() FROM PUBLIC, anon, authenticated;