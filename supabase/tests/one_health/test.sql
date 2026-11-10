-- Behaviour tests for the One Health foundation. Local PostgreSQL only.
\pset tuples_only on
\pset format unaligned
SET client_min_messages = warning;

CREATE FUNCTION public.t_fails(q text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE q; RETURN 'succeeded'; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE; END $$;
CREATE FUNCTION public.t_val(q text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v jsonb; BEGIN EXECUTE q INTO v; RETURN v; END $$;
GRANT EXECUTE ON FUNCTION public.t_fails(text), public.t_val(text) TO anon, authenticated;
CREATE FUNCTION public.t_as(u uuid) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub', coalesce(u::text, ''), false) $$;
GRANT EXECUTE ON FUNCTION public.t_as(uuid) TO anon, authenticated;

-- People
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-0000000000c1'), -- clinician, hospital A
 ('00000000-0000-0000-0000-0000000000a1'), -- nurse, hospital A
 ('00000000-0000-0000-0000-0000000000e1'), -- records, hospital A
 ('00000000-0000-0000-0000-0000000000c2'), -- clinician, hospital B
 ('00000000-0000-0000-0000-0000000000f1'), -- NGO field
 ('00000000-0000-0000-0000-0000000000b1'), -- lab scientist
 ('00000000-0000-0000-0000-0000000000d1'), -- programme coordinator
 ('00000000-0000-0000-0000-0000000000ff'); -- unrelated person
INSERT INTO public.ngos VALUES ('10000000-0000-0000-0000-000000000001', 'Field NGO');
INSERT INTO public.ngo_members VALUES ('00000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000001', 'member');
INSERT INTO public.dogs (id, ngo_id, zone, vaccination_status) VALUES
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Jayanagar', 'vaccinated'),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Jayanagar', 'unknown');

INSERT INTO public.oh_programmes (id, slug, name, city, wards) VALUES ('30000000-0000-0000-0000-000000000001', 'test-city', 'Test programme', 'Bengaluru', ARRAY['Jayanagar', 'BTM Layout']);
INSERT INTO public.oh_institutions (id, programme_id, kind, name, ngo_id, ward, listed_publicly) VALUES
 ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', 'hospital', 'Hospital A', NULL, 'Jayanagar', true),
 ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001', 'hospital', 'Hospital B', NULL, 'BTM Layout', true),
 ('40000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-000000000001', 'ngo', 'Field NGO', '10000000-0000-0000-0000-000000000001', NULL, false),
 ('40000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-000000000001', 'laboratory', 'Reference lab', NULL, NULL, false),
 ('40000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-000000000001', 'coordinator', 'Programme office', NULL, NULL, false);
INSERT INTO public.oh_members (institution_id, user_id, role, display_name) VALUES
 ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', 'clinician', 'Dr A'),
 ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'nurse', 'Nurse A'),
 ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', 'records', 'Records A'),
 ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000c2', 'clinician', 'Dr B'),
 ('40000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000b1', 'lab_scientist', 'Lab B1'),
 ('40000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000d1', 'coordinator', 'Coord D1');
INSERT INTO public.oh_ward_assignments VALUES ('30000000-0000-0000-0000-000000000001', 'Jayanagar', '40000000-0000-0000-0000-00000000000c', 'animal_followup');

SET ROLE authenticated;

-- 1. Records staff register a presentation but cannot assess the category.
SELECT t_as('00000000-0000-0000-0000-0000000000e1');
SELECT CASE WHEN t_fails($$SELECT public.oh_record_exposure('40000000-0000-0000-0000-00000000000a', current_date, 'bite', 'Jayanagar', p_category => 'III')$$) = '42501' THEN 'ok 1 - records staff cannot record the exposure category' ELSE 'not ok 1' END;
CREATE TEMP TABLE ids AS SELECT public.oh_record_exposure('40000000-0000-0000-0000-00000000000a', current_date - 1, 'bite', 'Jayanagar', '15-29', 'female', 'REG-0042', 'dog', 'community', 'Brown dog, torn left ear', 'Near the 9th Block bus stop', 'not_recorded', 'walk_in', NULL, '98450 00000', true) AS r;
SELECT CASE WHEN (SELECT r->>'handoff_id' FROM ids) IS NOT NULL THEN 'ok 2 - a community-dog bite in an assigned ward creates an animal follow-up' ELSE 'not ok 2' END;

-- 3. The follow-up the NGO receives carries no patient details.
SELECT t_as('00000000-0000-0000-0000-0000000000f1');
SELECT CASE WHEN (SELECT count(*) FROM public.oh_handoffs WHERE to_institution = '40000000-0000-0000-0000-00000000000c') = 1
  AND NOT EXISTS (SELECT 1 FROM public.oh_handoffs WHERE concat(title, detail, place) ~ '(REG-0042|98450|female|15-29)') THEN 'ok 3 - the NGO sees the follow-up and nothing about the patient' ELSE 'not ok 3' END;
-- 4. Nobody outside the facility can touch human-health data.
SELECT CASE WHEN t_fails('SELECT count(*) FROM health.exposures') = '42501' THEN 'ok 4 - health schema is not readable by an NGO member' ELSE 'not ok 4' END;
SELECT CASE WHEN t_fails($$SELECT public.oh_clinic_register('40000000-0000-0000-0000-00000000000a')$$) = '42501' THEN 'ok 5 - an NGO member cannot read a facility register' ELSE 'not ok 5' END;
SELECT CASE WHEN t_fails(format('SELECT public.oh_clinic_exposure(%L)', (SELECT r->>'id' FROM ids))) = '42501' THEN 'ok 6 - an NGO member cannot open an exposure' ELSE 'not ok 6' END;
SELECT t_as('00000000-0000-0000-0000-0000000000c2');
SELECT CASE WHEN t_fails(format('SELECT public.oh_clinic_exposure(%L)', (SELECT r->>'id' FROM ids))) = '42501' THEN 'ok 7 - a clinician at another hospital cannot open it' ELSE 'not ok 7' END;

-- 8. Nurse cannot prescribe; clinician records the category and prescribes the dates.
SELECT t_as('00000000-0000-0000-0000-0000000000a1');
SELECT CASE WHEN t_fails(format($$SELECT public.oh_prescribe(%L, 'As per facility protocol', false, ARRAY[current_date]::date[])$$, (SELECT r->>'id' FROM ids))) = '42501' THEN 'ok 8 - a nurse cannot prescribe' ELSE 'not ok 8' END;
SELECT t_as('00000000-0000-0000-0000-0000000000c1');
SELECT public.oh_set_category((SELECT (r->>'id')::uuid FROM ids), 'III');
SELECT CASE WHEN t_fails(format($$SELECT public.oh_prescribe(%L, 'x', false, ARRAY[current_date, current_date - 5]::date[])$$, (SELECT r->>'id' FROM ids))) = '42501' THEN 'ok 9 - dose dates out of order are refused' ELSE 'not ok 9' END;
CREATE TEMP TABLE course AS SELECT public.oh_prescribe((SELECT (r->>'id')::uuid FROM ids), 'Facility protocol (intradermal), as prescribed', true, ARRAY[current_date - 1, current_date + 2, current_date + 6]::date[]) AS id;
SELECT CASE WHEN jsonb_array_length(public.oh_clinic_exposure((SELECT (r->>'id')::uuid FROM ids))->'doses') = 3 THEN 'ok 10 - the course holds exactly the prescribed doses' ELSE 'not ok 10' END;

-- 11. Due list shows the phone only with consent.
SELECT CASE WHEN (SELECT x->>'phone' FROM jsonb_array_elements(public.oh_clinic_due('40000000-0000-0000-0000-00000000000a')) x LIMIT 1) = '98450 00000' THEN 'ok 11 - due list carries the consented phone' ELSE 'not ok 11' END;
SELECT t_as('00000000-0000-0000-0000-0000000000a1');
SELECT public.oh_record_dose((SELECT d.id FROM jsonb_array_elements(public.oh_clinic_exposure((SELECT (r->>'id')::uuid FROM ids))->'doses') x, LATERAL (SELECT (x->>'id')::uuid AS id) d WHERE (x->>'dose_no')::int = 1), 'given', current_date, 'B123');
SELECT CASE WHEN t_fails($$SELECT public.oh_record_dose((SELECT (x->>'id')::uuid FROM jsonb_array_elements(public.oh_clinic_exposure((SELECT (r->>'id')::uuid FROM ids))->'doses') x WHERE (x->>'dose_no')::int = 2), 'given', current_date + 3)$$) = '42501' THEN 'ok 12 - a dose cannot be recorded as given in the future' ELSE 'not ok 12' END;
SELECT CASE WHEN (public.oh_clinic_exposure((SELECT (r->>'id')::uuid FROM ids))->'doses'->0->>'status') = 'given' THEN 'ok 13 - the nurse recorded dose 1' ELSE 'not ok 13' END;

-- 14. NGO completes the follow-up and links the animal; another NGO's animal is refused.
SELECT t_as('00000000-0000-0000-0000-0000000000f1');
SELECT public.oh_handoff_act((SELECT (r->>'handoff_id')::uuid FROM ids), 'done', 'Found the dog alive and healthy on day 3; will check again.', '20000000-0000-0000-0000-000000000001');
SELECT CASE WHEN (SELECT status FROM public.oh_handoffs WHERE id = (SELECT (r->>'handoff_id')::uuid FROM ids)) = 'done' THEN 'ok 14 - the NGO closes the follow-up with what it found' ELSE 'not ok 14' END;
SELECT t_as('00000000-0000-0000-0000-0000000000c1');
SELECT CASE WHEN public.oh_clinic_exposure((SELECT (r->>'id')::uuid FROM ids))->'handoff'->>'status' = 'done' THEN 'ok 15 - the clinician sees the animal follow-up outcome' ELSE 'not ok 15' END;

-- 16. Laboratory: only the lab can result; a positive notifies submitter and coordinators.
SELECT t_as('00000000-0000-0000-0000-0000000000f1');
CREATE TEMP TABLE smp AS SELECT public.oh_submit_sample('40000000-0000-0000-0000-00000000000c', '40000000-0000-0000-0000-00000000000d', 'dog', 'brain_tissue', current_date, 'Jayanagar', '9th Block', 'Dog died after showing signs') AS r;
SELECT CASE WHEN t_fails(format($$SELECT public.oh_sample_step(%L, 'received')$$, (SELECT r->>'id' FROM smp))) = '42501' THEN 'ok 16 - the submitter cannot mark its own sample received' ELSE 'not ok 16' END;
SELECT t_as('00000000-0000-0000-0000-0000000000b1');
SELECT public.oh_sample_step((SELECT (r->>'id')::uuid FROM smp), 'received');
SELECT CASE WHEN t_fails(format($$SELECT public.oh_sample_step(%L, 'resulted', NULL, 'positive', 'DFA')$$, (SELECT r->>'id' FROM smp))) = '42501' THEN 'ok 17 - a result cannot skip testing' ELSE 'not ok 17' END;
SELECT public.oh_sample_step((SELECT (r->>'id')::uuid FROM smp), 'testing');
SELECT public.oh_sample_step((SELECT (r->>'id')::uuid FROM smp), 'resulted', NULL, 'positive', 'Direct fluorescent antibody test');
SELECT t_as('00000000-0000-0000-0000-0000000000d1');
SELECT CASE WHEN (SELECT count(*) FROM public.oh_handoffs WHERE kind = 'result_notice' AND to_institution = '40000000-0000-0000-0000-00000000000e') = 1 THEN 'ok 18 - a positive result alerts the coordinators' ELSE 'not ok 18' END;
SELECT CASE WHEN (SELECT count(*) FROM public.oh_sample_events WHERE sample_id = (SELECT (r->>'id')::uuid FROM smp)) = 5 THEN 'ok 19 - chain of custody has every step' ELSE 'not ok 19' END;

-- 20. Overview: counts below five are suppressed; registered vaccination is shown per ward.
SELECT CASE WHEN public.oh_programme_overview('30000000-0000-0000-0000-000000000001')->'exposures'->>'total' = '<5' THEN 'ok 20 - small exposure counts are suppressed in the overview' ELSE 'not ok 20' END;
SELECT CASE WHEN (SELECT (v->>'vaccinated')::int FROM jsonb_array_elements(public.oh_programme_overview('30000000-0000-0000-0000-000000000001')->'vaccination') v WHERE v->>'ward' = 'Jayanagar') = 1 THEN 'ok 21 - registered vaccination is read per ward' ELSE 'not ok 21' END;
SELECT t_as('00000000-0000-0000-0000-0000000000ff');
SELECT CASE WHEN t_fails($$SELECT public.oh_programme_overview('30000000-0000-0000-0000-000000000001')$$) = '42501' THEN 'ok 22 - an outsider cannot see the overview' ELSE 'not ok 22' END;
SELECT CASE WHEN (SELECT count(*) FROM public.oh_handoffs) = 0 AND (SELECT count(*) FROM public.oh_samples) = 0 THEN 'ok 23 - an outsider reads no handoffs or samples' ELSE 'not ok 23' END;

-- 24. Services: stale confirmations read as not verified, and the public can read the finder.
SELECT t_as('00000000-0000-0000-0000-0000000000c1');
SELECT public.oh_verify_service('40000000-0000-0000-0000-00000000000a', 'arv', 'available', NULL, 7);
RESET ROLE;
INSERT INTO public.oh_service_status (institution_id, service, status, verified_at, valid_until) VALUES ('40000000-0000-0000-0000-00000000000b', 'arv', 'available', now() - interval '10 days', now() - interval '3 days');
SET ROLE anon;
SELECT t_as(NULL);
SELECT CASE WHEN (SELECT s->>'status' FROM jsonb_array_elements(public.oh_public_services('test-city')->'facilities') f, jsonb_array_elements(f->'services') s WHERE f->>'name' = 'Hospital B') = 'not_verified'
  AND (SELECT s->>'status' FROM jsonb_array_elements(public.oh_public_services('test-city')->'facilities') f, jsonb_array_elements(f->'services') s WHERE f->>'name' = 'Hospital A') = 'available' THEN 'ok 24 - public finder shows verified services and marks stale ones not verified' ELSE 'not ok 24' END;
SELECT CASE WHEN t_fails($$SELECT public.oh_clinic_register('40000000-0000-0000-0000-00000000000a')$$) = '42501' THEN 'ok 25 - the public cannot call clinic functions' ELSE 'not ok 25' END;
SELECT CASE WHEN public.oh_submit_bite_notice('test-city', current_date, 'BTM Layout', 'Market road', 'dog', 'Black dog', '9845011111', true)->'facility'->>'name' = 'Hospital B' THEN 'ok 26 - a citizen notice goes to the facility in that ward' ELSE 'not ok 26' END;
SELECT CASE WHEN t_fails($$SELECT public.oh_submit_bite_notice('test-city', current_date, 'BTM Layout', NULL, 'dog', NULL, '9845011111', false)$$) = 'succeeded' THEN 'ok 27 - a notice without consent is accepted and drops the phone' ELSE 'not ok 27' END;
RESET ROLE;
SELECT CASE WHEN (SELECT count(*) FROM health.citizen_notices WHERE callback_phone IS NOT NULL AND NOT callback_consent) = 0 THEN 'ok 28 - no phone is stored without consent' ELSE 'not ok 28' END;
SELECT CASE WHEN t_fails('DELETE FROM health.audit') <> 'succeeded' AND (SELECT count(*) FROM health.audit) > 5 THEN 'ok 29 - the health audit trail is append-only and populated' ELSE 'not ok 29' END;
SET ROLE authenticated;
SELECT t_as('00000000-0000-0000-0000-0000000000c2');
SELECT CASE WHEN jsonb_array_length(public.oh_clinic_notices('40000000-0000-0000-0000-00000000000b')) = 2 THEN 'ok 30 - the ward facility receives both notices' ELSE 'not ok 30' END;
SELECT CASE WHEN (SELECT count(*) FROM jsonb_array_elements(public.oh_my_today())) = 1 THEN 'ok 31 - Today lists only the person''s own institution' ELSE 'not ok 31' END;
-- 32. "Today" is the programme's local date: a bite recorded on the local date always saves, whatever the server's date.
RESET ROLE;
UPDATE public.oh_programmes SET time_zone = 'Pacific/Kiritimati' WHERE id = '30000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT t_as('00000000-0000-0000-0000-0000000000c1');
SELECT CASE WHEN t_fails($$SELECT public.oh_record_exposure('40000000-0000-0000-0000-00000000000a', (now() AT TIME ZONE 'Pacific/Kiritimati')::date, 'bite', NULL)$$) = 'succeeded'
  AND t_fails($$SELECT public.oh_record_exposure('40000000-0000-0000-0000-00000000000a', (now() AT TIME ZONE 'Pacific/Kiritimati')::date + 1, 'bite', NULL)$$) = '42501' THEN 'ok 32 - dates follow the programme''s time zone, and future dates are refused plainly' ELSE 'not ok 32' END;
RESET ROLE;
