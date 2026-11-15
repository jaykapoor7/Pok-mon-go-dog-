-- A bite recorded at the facility a person was referred to keeps the referral it came from.
-- Before this, the clinic could say only that the bite came "from a referral" and the link was lost: oh_record_exposure had
-- no parameter for it. This adds p_transfer (default NULL, so every existing caller keeps working), checks the referral was
-- sent to this facility and is still open, stores the link once per referral, and marks the referral arrived if it was not.
--
-- Additive and reversible: one nullable column, one partial unique index, and the function replaced with one more argument.
-- Rollback: recreate oh_record_exposure from 20261110230655_one_health_v2_2_workflows.sql (18 arguments), then
--   DROP INDEX health.health_exposures_one_per_transfer; ALTER TABLE health.exposures DROP COLUMN transfer_id;
-- No existing row is changed.

ALTER TABLE health.exposures ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES health.transfers(id);
CREATE UNIQUE INDEX IF NOT EXISTS health_exposures_one_per_transfer ON health.exposures (transfer_id) WHERE transfer_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text);

CREATE OR REPLACE FUNCTION public.oh_record_exposure(
  p_facility uuid, p_exposure_on date, p_kind text, p_area uuid, p_age_band text DEFAULT 'not_recorded', p_sex text DEFAULT 'not_recorded',
  p_patient_ref text DEFAULT NULL, p_species text DEFAULT 'dog', p_ownership text DEFAULT 'unknown', p_animal_description text DEFAULT NULL,
  p_animal_place text DEFAULT NULL, p_category text DEFAULT 'not_recorded', p_source text DEFAULT 'walk_in', p_notice uuid DEFAULT NULL,
  p_contact_phone text DEFAULT NULL, p_reminder_consent boolean DEFAULT false, p_request_followup boolean DEFAULT true,
  p_wound_washed text DEFAULT 'not_recorded', p_transfer uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_org_today(p_facility); eid uuid; c text; hid uuid; target uuid; prog uuid; due_days int;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'record_exposure'), 'Only staff of this facility can record a bite');
  PERFORM public.oh_need(p_category = 'not_recorded' OR public.oh_can(p_facility, 'assess'), 'Only a clinician can record the exposure category');
  PERFORM public.oh_need(p_exposure_on <= td, 'The date it happened cannot be in the future');
  PERFORM public.oh_need(p_exposure_on >= td - 365, 'The date it happened is more than a year ago');
  IF p_transfer IS NOT NULL THEN
    PERFORM public.oh_need(EXISTS (SELECT 1 FROM health.transfers t WHERE t.id = p_transfer AND t.to_org = p_facility AND t.status IN ('sent', 'arrived')), 'That referral was not sent to this facility, or it was closed');
    PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM health.exposures x WHERE x.transfer_id = p_transfer), 'A bite is already recorded for this referral');
  END IF;
  c := public.oh_code('BX', p_facility);
  INSERT INTO health.exposures (facility_id, code, patient_ref, age_band, sex, area_id, exposure_on, presented_on, exposure_kind, category, category_by, category_by_name, wound_washed,
    animal_species, animal_ownership, animal_description, animal_place, source, notice_id, contact_phone, reminder_consent, created_by, transfer_id)
  VALUES (p_facility, c, nullif(btrim(p_patient_ref), ''), p_age_band, p_sex, p_area, p_exposure_on, td, p_kind, p_category,
    CASE WHEN p_category <> 'not_recorded' THEN auth.uid() END, CASE WHEN p_category <> 'not_recorded' THEN public.oh_actor_name() END, p_wound_washed,
    p_species, p_ownership, nullif(btrim(p_animal_description), ''), nullif(btrim(p_animal_place), ''), CASE WHEN p_transfer IS NOT NULL THEN 'referral' ELSE p_source END, p_notice,
    CASE WHEN p_reminder_consent THEN nullif(btrim(p_contact_phone), '') END, p_reminder_consent AND nullif(btrim(p_contact_phone), '') IS NOT NULL, auth.uid(), p_transfer)
  RETURNING id INTO eid;
  IF p_transfer IS NOT NULL THEN
    UPDATE health.transfers SET status = 'arrived', closed_by_name = public.oh_actor_name(), closed_at = now() WHERE id = p_transfer AND status = 'sent';
    IF FOUND THEN PERFORM health.log(p_facility, 'transfer_arrived', 'transfer', p_transfer); END IF;
  END IF;
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
  RETURN jsonb_build_object('id', eid, 'code', c, 'handoff_id', hid, 'transfer_id', p_transfer);
END $$;

REVOKE ALL ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
