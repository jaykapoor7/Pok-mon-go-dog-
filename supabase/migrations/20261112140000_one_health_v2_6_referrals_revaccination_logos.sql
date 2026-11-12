-- One Health v2.6: a person's referral between facilities, the dogs due for
-- revaccination, and partner logos. Closes three "partial" items in
-- docs/BEST-AUDIT.md.
--
--  1 health.transfers
--      A clinician refers one person to another facility in the same programme
--      for a named service (anti-rabies vaccine, immunoglobulin, wound washing).
--      The receiving facility sees the bite record's code, its category, the
--      exposure date, the animal's species and the service needed: never the
--      patient's reference, phone, age or sex. It marks the person arrived or
--      not arrived; the referring facility sees which. Every step is written to
--      health.audit. Kaju has no function here and cannot read it.
--  2 org_revaccination_setting / org_revaccination_due
--      The NGO's own animals whose last recorded vaccination is past, or within
--      14 days of, the programme's revaccination interval: the same rule as the
--      programme's "revaccination due" alert. Animals marked vaccinated with no
--      dated vaccination are counted, never guessed.
--  3 Partner logos
--      oh_organisations.logo_url and a public 'oh-logos' bucket that only a lead
--      of the organisation, or of a programme it belongs to, can write to.
--
-- Additive and safe to run again. No existing row or policy is changed.

-- ── 1 · Referral of one person ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exposure_id uuid NOT NULL REFERENCES health.exposures(id) ON DELETE CASCADE,
  from_org uuid NOT NULL REFERENCES public.oh_organisations(id),
  to_org uuid NOT NULL REFERENCES public.oh_organisations(id),
  service text NOT NULL CHECK (service IN ('arv', 'rig', 'wound_care')),
  note text CHECK (note IS NULL OR length(note) <= 300),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'arrived', 'not_arrived', 'withdrawn')),
  sent_by uuid REFERENCES auth.users(id),
  sent_by_name text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  closed_by_name text,
  closed_at timestamptz,
  CHECK (from_org <> to_org)
);
CREATE INDEX IF NOT EXISTS health_transfers_to ON health.transfers (to_org, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS health_transfers_from ON health.transfers (from_org, sent_at DESC);
CREATE INDEX IF NOT EXISTS health_transfers_exposure ON health.transfers (exposure_id);
CREATE UNIQUE INDEX IF NOT EXISTS health_transfers_one_open ON health.transfers (exposure_id, service) WHERE status = 'sent';
ALTER TABLE health.transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON health.transfers FROM PUBLIC;
DO $$ BEGIN EXECUTE 'REVOKE ALL ON health.transfers FROM anon, authenticated'; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.oh_share_programme(p_a uuid, p_b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.oh_participations a JOIN public.oh_participations b ON b.programme_id = a.programme_id
                  WHERE a.organisation_id = p_a AND b.organisation_id = p_b)
$$;

-- Facilities this person can be referred to: every hospital or clinic in a
-- programme the referring facility belongs to, with the pathways the
-- programme set from this facility and each one's confirmed services.
CREATE OR REPLACE FUNCTION public.oh_referral_options(p_exposure uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e health.exposures;
BEGIN
  SELECT * INTO e FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(e.id IS NOT NULL AND public.oh_can(e.facility_id, 'assess'), 'Only a clinician at this facility can refer this person');
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'short_name', o.short_name, 'kind', o.kind, 'area', public.oh_area_name(o.area_id),
      'pathways', coalesce((SELECT jsonb_agg(DISTINCT r.service) FROM public.oh_referrals r WHERE r.from_org = e.facility_id AND r.to_org = o.id), '[]'::jsonb),
      'services', coalesce((SELECT jsonb_agg(jsonb_build_object('service', s.service, 'status', s.status, 'verified_at', s.verified_at)) FROM public.oh_service_now(o.id) s), '[]'::jsonb))
      ORDER BY o.name)
    FROM public.oh_organisations o
   WHERE o.kind IN ('hospital', 'clinic') AND o.id <> e.facility_id AND public.oh_share_programme(o.id, e.facility_id)), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.oh_refer_exposure(p_exposure uuid, p_to uuid, p_service text, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e health.exposures; tid uuid;
BEGIN
  SELECT * INTO e FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(e.id IS NOT NULL AND public.oh_can(e.facility_id, 'assess'), 'Only a clinician at this facility can refer this person');
  PERFORM public.oh_need(p_service IN ('arv', 'rig', 'wound_care'), 'Choose what the person is referred for');
  PERFORM public.oh_need(p_to <> e.facility_id AND EXISTS (SELECT 1 FROM public.oh_organisations o WHERE o.id = p_to AND o.kind IN ('hospital', 'clinic'))
                         AND public.oh_share_programme(p_to, e.facility_id), 'Refer only to another facility in the same programme');
  PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM health.transfers t WHERE t.exposure_id = e.id AND t.service = p_service AND t.status = 'sent'),
                         'This person already has an open referral for this. Close it first.');
  PERFORM public.oh_need(p_note IS NULL OR length(btrim(p_note)) <= 300, 'Keep the note under 300 characters');
  INSERT INTO health.transfers (exposure_id, from_org, to_org, service, note, sent_by, sent_by_name)
  VALUES (e.id, e.facility_id, p_to, p_service, nullif(btrim(p_note), ''), auth.uid(), public.oh_actor_name()) RETURNING id INTO tid;
  UPDATE health.exposures SET referred_to = p_to, updated_at = now() WHERE id = e.id;
  PERFORM health.log(e.facility_id, 'refer', 'transfer', tid);
  RETURN tid;
END $$;

-- The receiving facility marks arrived or not arrived; the referring
-- clinician can withdraw a referral that was made in error.
CREATE OR REPLACE FUNCTION public.oh_transfer_act(p_transfer uuid, p_action text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE t health.transfers;
BEGIN
  SELECT * INTO t FROM health.transfers WHERE id = p_transfer;
  PERFORM public.oh_need(t.id IS NOT NULL, 'This referral was not found');
  IF p_action IN ('arrived', 'not_arrived') THEN
    PERFORM public.oh_need(public.oh_can(t.to_org, 'view_register'), 'Only staff of the receiving facility can mark this');
  ELSIF p_action = 'withdrawn' THEN
    PERFORM public.oh_need(public.oh_can(t.from_org, 'assess'), 'Only a clinician at the referring facility can withdraw this');
  ELSE
    PERFORM public.oh_need(false, 'Unknown action');
  END IF;
  PERFORM public.oh_need(t.status = 'sent', 'This referral is already closed');
  UPDATE health.transfers SET status = p_action, closed_by_name = public.oh_actor_name(), closed_at = now() WHERE id = t.id;
  PERFORM health.log(CASE WHEN p_action = 'withdrawn' THEN t.from_org ELSE t.to_org END, 'transfer_' || p_action, 'transfer', t.id);
END $$;

-- A facility's referrals: people sent to it (bite code, category and service
-- only) and people it sent, open ones and those closed in the last 14 days.
CREATE OR REPLACE FUNCTION public.oh_clinic_transfers(p_facility uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can(p_facility, 'view_register'), 'Only staff of this facility can see its referrals');
  RETURN jsonb_build_object(
    'incoming', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'code', e.code, 'category', e.category, 'exposure_on', e.exposure_on, 'animal_species', e.animal_species,
        'service', t.service, 'note', t.note, 'status', t.status, 'from', f.name, 'from_short', f.short_name,
        'sent_at', t.sent_at, 'sent_by', t.sent_by_name, 'closed_at', t.closed_at, 'closed_by', t.closed_by_name)
        ORDER BY (t.status = 'sent') DESC, t.sent_at DESC)
      FROM health.transfers t JOIN health.exposures e ON e.id = t.exposure_id JOIN public.oh_organisations f ON f.id = t.from_org
     WHERE t.to_org = p_facility AND (t.status = 'sent' OR t.closed_at > now() - interval '14 days')), '[]'::jsonb),
    'outgoing', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'exposure_id', e.id, 'code', e.code, 'service', t.service, 'status', t.status, 'to', o.name, 'to_short', o.short_name,
        'sent_at', t.sent_at, 'sent_by', t.sent_by_name, 'closed_at', t.closed_at, 'closed_by', t.closed_by_name)
        ORDER BY (t.status = 'sent') DESC, t.sent_at DESC)
      FROM health.transfers t JOIN health.exposures e ON e.id = t.exposure_id JOIN public.oh_organisations o ON o.id = t.to_org
     WHERE t.from_org = p_facility AND (t.status = 'sent' OR t.closed_at > now() - interval '14 days')), '[]'::jsonb));
END $$;

-- The referrals of one bite record, for the record's own facility.
CREATE OR REPLACE FUNCTION public.oh_exposure_transfers(p_exposure uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e health.exposures;
BEGIN
  SELECT * INTO e FROM health.exposures WHERE id = p_exposure;
  PERFORM public.oh_need(e.id IS NOT NULL AND public.oh_can(e.facility_id, 'view_register'), 'Only staff of this facility can open this record');
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'service', t.service, 'note', t.note, 'status', t.status, 'to', o.name, 'to_short', o.short_name,
      'sent_at', t.sent_at, 'sent_by', t.sent_by_name, 'closed_at', t.closed_at, 'closed_by', t.closed_by_name) ORDER BY t.sent_at DESC)
    FROM health.transfers t JOIN public.oh_organisations o ON o.id = t.to_org WHERE t.exposure_id = e.id), '[]'::jsonb);
END $$;

-- Today, per place: the same as v2.2 with one more count, people referred
-- to a facility and not yet marked.
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
      'transfers_in', CASE WHEN o.kind IN ('hospital', 'clinic') AND public.oh_can(o.id, 'view_register') THEN (SELECT count(*) FROM health.transfers t WHERE t.to_org = o.id AND t.status = 'sent') END,
      'samples_waiting', CASE WHEN o.kind = 'laboratory' THEN (SELECT count(*) FROM public.oh_samples s WHERE s.laboratory_id = o.id AND s.status IN ('dispatched', 'received', 'testing')) END,
      'services_stale', CASE WHEN o.kind IN ('hospital', 'clinic', 'laboratory') THEN (SELECT count(*) FROM (SELECT DISTINCT ON (service) valid_until FROM public.oh_service_status s WHERE s.organisation_id = o.id ORDER BY service, verified_at DESC) x WHERE x.valid_until < now()) END
    ) AS r
    FROM public.oh_my_memberships() m JOIN public.oh_organisations o ON o.id = m.organisation_id
  ) s;
  RETURN out;
END $$;

-- ── 2 · Dogs due for revaccination ────────────────────────────────────
-- The NGO's setting (the shortest interval among its programmes), with the
-- counts the screen leads with.
CREATE OR REPLACE FUNCTION public.org_revaccination_setting()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH iv AS (
    SELECT nullif(p.config->>'dog_revaccination_days', '')::int AS days, p.name
      FROM public.oh_organisations o JOIN public.oh_participations pp ON pp.organisation_id = o.id JOIN public.oh_programmes p ON p.id = pp.programme_id
     WHERE o.kind = 'ngo' AND o.ngo_id = public.my_ngo() AND nullif(p.config->>'dog_revaccination_days', '') IS NOT NULL
     ORDER BY 1 LIMIT 1
  ), last AS (
    SELECT d.id, max(m.event_date) AS last FROM public.dogs d JOIN public.medical_events m ON m.dog_id = d.id AND m.kind = 'vaccination'
     WHERE d.ngo_id = public.my_ngo() GROUP BY d.id
  )
  SELECT CASE WHEN public.my_ngo() IS NULL THEN NULL ELSE jsonb_build_object(
    'days', (SELECT days FROM iv), 'programme', (SELECT name FROM iv),
    'overdue', (SELECT count(*) FROM last, iv WHERE last.last + iv.days < current_date),
    'soon', (SELECT count(*) FROM last, iv WHERE last.last + iv.days BETWEEN current_date AND current_date + 14),
    'dated', (SELECT count(*) FROM last),
    'undated', (SELECT count(*) FROM public.dogs d WHERE d.ngo_id = public.my_ngo() AND d.vaccination_status = 'vaccinated'
                  AND NOT EXISTS (SELECT 1 FROM public.medical_events m WHERE m.dog_id = d.id AND m.kind = 'vaccination'))) END
$$;

CREATE OR REPLACE FUNCTION public.org_revaccination_due(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE (id uuid, straypaw_id text, name text, code text, zone text, cover_photo text,
               last_vaccinated date, due_on date, days_overdue int, interval_days int, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH iv AS (SELECT (public.org_revaccination_setting()->>'days')::int AS days),
  v AS (
    SELECT d.id, d.straypaw_id, d.name, d.code, d.zone, d.cover_photo, max(m.event_date) AS last
      FROM public.dogs d JOIN public.medical_events m ON m.dog_id = d.id AND m.kind = 'vaccination'
     WHERE d.ngo_id = public.my_ngo() GROUP BY d.id
  )
  SELECT v.id, v.straypaw_id, v.name, v.code, v.zone, v.cover_photo, v.last, v.last + iv.days,
         current_date - (v.last + iv.days), iv.days, count(*) OVER ()
    FROM v, iv
   WHERE iv.days IS NOT NULL AND v.last + iv.days <= current_date + 14
   ORDER BY v.last + iv.days, v.id
   LIMIT greatest(least(p_limit, 500), 1) OFFSET greatest(p_offset, 0)
$$;

-- ── 3 · Partner logos ─────────────────────────────────────────────────
ALTER TABLE public.oh_organisations ADD COLUMN IF NOT EXISTS logo_url text CHECK (logo_url IS NULL OR length(logo_url) <= 500);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('oh-logos', 'oh-logos', true, 524288, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- May the person brand this organisation? A lead of it, or a lead of a
-- programme it belongs to. Takes the storage folder name, so a folder that is
-- not an organisation id is simply refused.
CREATE OR REPLACE FUNCTION public.oh_can_brand(p_folder text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_folder IS NULL OR p_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
  RETURN public.oh_can(p_folder::uuid, 'manage')
      OR EXISTS (SELECT 1 FROM public.oh_participations pp WHERE pp.organisation_id = p_folder::uuid AND public.oh_can_manage(pp.programme_id));
END $$;

DROP POLICY IF EXISTS oh_logos_insert ON storage.objects;
DROP POLICY IF EXISTS oh_logos_update ON storage.objects;
DROP POLICY IF EXISTS oh_logos_delete ON storage.objects;
CREATE POLICY oh_logos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'oh-logos' AND public.oh_can_brand((storage.foldername(name))[1]));
CREATE POLICY oh_logos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'oh-logos' AND public.oh_can_brand((storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'oh-logos' AND public.oh_can_brand((storage.foldername(name))[1]));
CREATE POLICY oh_logos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'oh-logos' AND public.oh_can_brand((storage.foldername(name))[1]));

CREATE OR REPLACE FUNCTION public.oh_set_logo(p_org uuid, p_url text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_can_brand(p_org::text), 'Only a lead of this organisation or its programme can change its logo');
  PERFORM public.oh_need(nullif(btrim(p_url), '') IS NULL
    OR p_url ~ ('^https://[a-z0-9.-]+/storage/v1/object/public/oh-logos/' || p_org::text || '/[A-Za-z0-9._-]{1,80}$'), 'Upload the logo first');
  UPDATE public.oh_organisations SET logo_url = nullif(btrim(p_url), '') WHERE id = p_org;
END $$;

-- Logos of a programme's partners (an NGO's own logo when the partner record
-- has none), for anyone in the programme.
CREATE OR REPLACE FUNCTION public.oh_partner_marks(p_programme uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM public.oh_need(public.oh_in_programme(p_programme) OR public.oh_can_oversee(p_programme), 'You are not part of this programme');
  RETURN coalesce((SELECT jsonb_object_agg(o.id, coalesce(o.logo_url, n.logo_url))
    FROM public.oh_organisations o LEFT JOIN public.ngos n ON n.id = o.ngo_id
   WHERE o.id IN (SELECT organisation_id FROM public.oh_programme_orgs(p_programme)) AND coalesce(o.logo_url, n.logo_url) IS NOT NULL), '{}'::jsonb);
END $$;

-- ── Grants ────────────────────────────────────────────────────────────
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname IN ('oh_share_programme', 'oh_referral_options', 'oh_refer_exposure', 'oh_transfer_act', 'oh_clinic_transfers',
                                                          'oh_exposure_transfers', 'oh_my_today', 'org_revaccination_setting', 'org_revaccination_due', 'oh_can_brand',
                                                          'oh_set_logo', 'oh_partner_marks') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    BEGIN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f.sig); EXCEPTION WHEN undefined_object THEN NULL; END;
    IF f.proname = 'oh_share_programme' THEN
      BEGIN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f.sig); EXCEPTION WHEN undefined_object THEN NULL; END;
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
  END LOOP;
END $$;
