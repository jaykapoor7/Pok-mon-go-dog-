-- ILLUSTRATIVE DEMONSTRATION DATA for the Bengaluru One Health programme.
--
-- Every row here is invented for the demo and the programme is flagged
-- illustrative = true, which the app shows on every screen. No figure here is
-- a real programme figure; no facility name, phone number or person is real.
-- Institutions are described by their role in the BeST proposal (coordination,
-- reference laboratory, municipal division, teaching hospital, NGO partners),
-- never by a partner's real name.
--
-- Requires the One Health migration and the demo accounts
-- e0000000-0000-4000-8000-00000000000{1..9} (see docs/one-health/DEMO.md).
-- Re-runnable: it removes the illustrative programme first (cascade), then
-- inserts it again. It touches nothing else.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.oh_programmes WHERE slug = 'bengaluru-demo' AND NOT illustrative) THEN
    RAISE EXCEPTION 'Refusing: bengaluru-demo exists and is not illustrative';
  END IF;
END $$;
DELETE FROM health.exposures WHERE programme_id IN (SELECT id FROM public.oh_programmes WHERE slug = 'bengaluru-demo');
DELETE FROM health.citizen_notices WHERE programme_id IN (SELECT id FROM public.oh_programmes WHERE slug = 'bengaluru-demo');
DELETE FROM public.oh_programmes WHERE slug = 'bengaluru-demo';

INSERT INTO public.oh_programmes (id, slug, name, city, summary, status, vaccination_target, wards, illustrative) VALUES
 ('f0000000-0000-4000-8000-000000000001', 'bengaluru-demo', 'Bengaluru Rabies Elimination Programme', 'Bengaluru',
  'A city-wide One Health programme linking human bite care, dog vaccination, laboratory surveillance and municipal operations, piloted in one demonstration zone. Toward zero human deaths from dog-mediated rabies by 2030.',
  'pilot', 0.70, ARRAY['Jayanagar','BTM Layout','HSR Layout','Koramangala','Banashankari','Indiranagar','Whitefield','Malleshwaram','Rajajinagar','Yelahanka'], true);

INSERT INTO public.oh_institutions (id, programme_id, kind, name, short_name, ngo_id, responsibilities, ward, address, phone, hours, lat, lng, listed_publicly) VALUES
 ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'coordinator', 'Programme Coordination Cell', 'Coordination', NULL, 'Programme coordination, data integration, monitoring and evaluation', NULL, NULL, NULL, NULL, NULL, NULL, false),
 ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'municipal', 'Municipal Animal Husbandry & Health Division', 'Municipal AH&H', NULL, 'On-ground vaccination, field surveillance and operational management', NULL, NULL, NULL, NULL, NULL, NULL, false),
 ('f1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'hospital', 'Teaching Hospital Anti-Rabies Clinic', 'Teaching hospital ARC', NULL, 'Human bite care, post-exposure prophylaxis and human health surveillance', 'Jayanagar', 'Illustrative address · Jayanagar', 'Illustrative', '8 am – 8 pm, every day', 12.9279, 77.5937, true),
 ('f1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'clinic', 'Urban Primary Health Centre, HSR Layout', 'UPHC HSR Layout', NULL, 'Wound care and vaccination for bite patients', 'HSR Layout', 'Illustrative address · HSR Layout', 'Illustrative', '9 am – 4 pm, Monday to Saturday', 12.9116, 77.6474, true),
 ('f1000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000001', 'clinic', 'Urban Primary Health Centre, Malleshwaram', 'UPHC Malleshwaram', NULL, 'Wound care and vaccination for bite patients', 'Malleshwaram', 'Illustrative address · Malleshwaram', 'Illustrative', '9 am – 4 pm, Monday to Saturday', 13.0035, 77.5710, true),
 ('f1000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000001', 'laboratory', 'Reference Rabies Diagnostic Laboratory', 'Reference lab', NULL, 'Technical leadership, laboratory confirmation, capacity building and training', NULL, NULL, NULL, NULL, NULL, NULL, false),
 ('f1000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000001', 'ngo', 'Sample · Bengaluru Animal Care Trust', 'Animal Care Trust', 'd0000000-0000-4000-8000-0000000000a0', 'Dog catching, vaccination, bite-animal follow-up and public engagement', NULL, NULL, NULL, NULL, NULL, NULL, false),
 ('f1000000-0000-4000-8000-000000000008', 'f0000000-0000-4000-8000-000000000001', 'ngo', 'Sample · Mass Vaccination Partner', 'Vaccination Partner', 'd0000000-0000-4000-8000-0000000000a1', 'Mass dog vaccination and community engagement', NULL, NULL, NULL, NULL, NULL, NULL, false),
 ('f1000000-0000-4000-8000-000000000009', 'f0000000-0000-4000-8000-000000000001', 'research', 'Programme Epidemiology Unit', 'Epidemiology', NULL, 'Analysis, evaluation and evidence for scale-up (aggregate data only)', NULL, NULL, NULL, NULL, NULL, NULL, false);

INSERT INTO public.oh_members (institution_id, user_id, role, display_name) VALUES
 ('f1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'lead', 'Dr. Meera Iyer'),
 ('f1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'coordinator', 'Dr. Prakash Gowda'),
 ('f1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'clinician', 'Dr. Arjun Rao'),
 ('f1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004', 'nurse', 'Sister Kavya N.'),
 -- The hospital clinician also runs a weekly session at a health centre: two places on one Today.
 ('f1000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003', 'clinician', 'Dr. Arjun Rao'),
 ('f1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000005', 'clinician', 'Dr. Farah Khan'),
 ('f1000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 'lab_scientist', 'Dr. Suma Hegde'),
 ('f1000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000009', 'analyst', 'Dr. Nikhil Bhat');
-- NGO people come from their organisation's own membership (no duplicate rows); names for the trail:
INSERT INTO public.oh_members (institution_id, user_id, role, display_name) VALUES
 ('f1000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', 'field', 'Ravi Kumar'),
 ('f1000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000008', 'coordinator', 'Anita D''Souza');

INSERT INTO public.oh_ward_assignments (programme_id, ward, institution_id, duty)
SELECT 'f0000000-0000-4000-8000-000000000001', w, CASE WHEN w IN ('Jayanagar','BTM Layout','HSR Layout','Koramangala','Banashankari') THEN 'f1000000-0000-4000-8000-000000000007'::uuid ELSE 'f1000000-0000-4000-8000-000000000008'::uuid END, d
  FROM unnest(ARRAY['Jayanagar','BTM Layout','HSR Layout','Koramangala','Banashankari','Indiranagar','Whitefield','Malleshwaram','Rajajinagar','Yelahanka']) w, unnest(ARRAY['animal_followup','vaccination']) d;

-- Verified services: fresh, limited, unavailable and one stale confirmation.
INSERT INTO public.oh_service_status (institution_id, service, status, note, verified_by, verified_by_name, verified_at, valid_until) VALUES
 ('f1000000-0000-4000-8000-000000000003', 'arv', 'available', NULL, 'e0000000-0000-4000-8000-000000000003', 'Dr. Arjun Rao', now() - interval '1 day', now() + interval '6 days'),
 ('f1000000-0000-4000-8000-000000000003', 'rig', 'available', NULL, 'e0000000-0000-4000-8000-000000000003', 'Dr. Arjun Rao', now() - interval '1 day', now() + interval '6 days'),
 ('f1000000-0000-4000-8000-000000000003', 'wound_care', 'available', NULL, 'e0000000-0000-4000-8000-000000000004', 'Sister Kavya N.', now() - interval '1 day', now() + interval '6 days'),
 ('f1000000-0000-4000-8000-000000000004', 'arv', 'limited', 'Mornings only this week', 'e0000000-0000-4000-8000-000000000005', 'Dr. Farah Khan', now() - interval '2 days', now() + interval '5 days'),
 ('f1000000-0000-4000-8000-000000000004', 'rig', 'unavailable', 'Refer category III to the teaching hospital', 'e0000000-0000-4000-8000-000000000005', 'Dr. Farah Khan', now() - interval '2 days', now() + interval '5 days'),
 ('f1000000-0000-4000-8000-000000000004', 'wound_care', 'available', NULL, 'e0000000-0000-4000-8000-000000000005', 'Dr. Farah Khan', now() - interval '2 days', now() + interval '5 days'),
 ('f1000000-0000-4000-8000-000000000005', 'arv', 'available', NULL, NULL, 'Clinic staff', now() - interval '12 days', now() - interval '5 days'),
 ('f1000000-0000-4000-8000-000000000006', 'rabies_testing', 'available', NULL, 'e0000000-0000-4000-8000-000000000006', 'Dr. Suma Hegde', now() - interval '3 days', now() + interval '4 days');

-- Bite exposures: 176 presentations over twelve weeks (deterministic, illustrative).
INSERT INTO health.exposures (id, programme_id, facility_id, code, patient_ref, age_band, sex, ward, exposure_on, presented_on, exposure_kind, category, category_by_name,
  animal_species, animal_ownership, animal_description, animal_place, source, contact_phone, reminder_consent, created_at)
SELECT ('f2000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'f0000000-0000-4000-8000-000000000001',
  CASE WHEN n % 5 = 0 THEN 'f1000000-0000-4000-8000-000000000004'::uuid WHEN n % 7 = 0 THEN 'f1000000-0000-4000-8000-000000000005'::uuid ELSE 'f1000000-0000-4000-8000-000000000003'::uuid END,
  'BX-DEMO-' || lpad(n::text, 3, '0'), 'OPD-' || (24000 + n * 37), (ARRAY['0-4','5-14','5-14','15-29','15-29','30-49','30-49','50+'])[1 + n % 8], (ARRAY['female','male','male','female','not_recorded'])[1 + n % 5],
  (ARRAY['Jayanagar','BTM Layout','HSR Layout','Koramangala','Banashankari','Indiranagar','Whitefield','Malleshwaram','Rajajinagar','Yelahanka','HSR Layout','BTM Layout'])[1 + (n * 7) % 12],
  current_date - (84 - n * 84 / 176) - (n % 2), current_date - (84 - n * 84 / 176) - (n % 2) + (n % 3 = 0)::int,
  (ARRAY['bite','bite','bite','scratch','bite','lick_broken_skin'])[1 + n % 6],
  CASE WHEN n >= 174 THEN 'not_recorded' WHEN n % 7 = 3 THEN 'I' WHEN n % 3 = 0 THEN 'III' ELSE 'II' END,
  CASE WHEN n >= 174 THEN NULL ELSE 'Clinician (illustrative)' END,
  CASE WHEN n % 11 = 0 THEN 'cat' WHEN n % 17 = 0 THEN 'monkey' ELSE 'dog' END, CASE WHEN n % 4 = 0 THEN 'owned' WHEN n % 9 = 0 THEN 'unknown' ELSE 'community' END,
  (ARRAY['Brown dog, white chest, limping','Black dog with red collar','Tan female with pups near the market','Grey dog, notched left ear','White dog, black patch on the eye','Two dogs, one brown and one black'])[1 + n % 6],
  (ARRAY['Near the bus stop on the main road','Outside the vegetable market','Lane behind the temple','Park entrance, north gate','Near the school gate','Apartment complex parking'])[1 + (n * 5) % 6],
  CASE WHEN n % 13 = 0 THEN 'referral' ELSE 'walk_in' END,
  CASE WHEN n % 2 = 0 THEN '90000 ' || lpad((10000 + n)::text, 5, '0') END, n % 2 = 0,
  now() - make_interval(days => 84 - n * 84 / 176)
FROM generate_series(1, 176) n;

-- PEP courses for category II/III (regimen text as a clinician would enter it; illustrative).
INSERT INTO health.pep_courses (id, exposure_id, regimen, rig_given, prescribed_by, prescribed_by_name, prescribed_at, status, status_note)
SELECT ('f3000000-0000-4000-8000-' || substr(e.id::text, 25))::uuid, e.id, 'Illustrative regimen, as entered by the clinician', e.category = 'III',
  CASE WHEN e.facility_id = 'f1000000-0000-4000-8000-000000000004' THEN 'e0000000-0000-4000-8000-000000000005'::uuid ELSE 'e0000000-0000-4000-8000-000000000003'::uuid END,
  'Clinician (illustrative)', e.presented_on::timestamptz + interval '10 hours',
  CASE WHEN current_date - e.exposure_on > 30 AND right(e.code, 1) IN ('4', '9') THEN 'lost_to_follow_up' WHEN current_date - e.exposure_on > 30 THEN 'completed' ELSE 'active' END,
  CASE WHEN current_date - e.exposure_on > 30 AND right(e.code, 1) IN ('4', '9') THEN 'Did not return after dose 2; two calls unanswered' END
FROM health.exposures e WHERE e.programme_id = 'f0000000-0000-4000-8000-000000000001' AND e.category IN ('II', 'III');

-- Doses on day 0, 3, 7 and 28 of presentation, as entered for this illustration.
INSERT INTO health.pep_doses (course_id, dose_no, due_on, given_on, given_by_name, batch, status)
SELECT c.id, d.no, e.presented_on + d.offs,
  CASE WHEN c.status = 'lost_to_follow_up' AND d.no > 2 THEN NULL WHEN e.presented_on + d.offs < current_date OR (d.no = 1) THEN e.presented_on + d.offs END,
  CASE WHEN c.status = 'lost_to_follow_up' AND d.no > 2 THEN NULL WHEN e.presented_on + d.offs < current_date OR d.no = 1 THEN 'Nurse (illustrative)' END,
  CASE WHEN c.status = 'lost_to_follow_up' AND d.no > 2 THEN NULL WHEN e.presented_on + d.offs < current_date OR d.no = 1 THEN 'DEMO-' || (100 + d.no) END,
  CASE WHEN c.status = 'lost_to_follow_up' AND d.no > 2 THEN 'cancelled' WHEN e.presented_on + d.offs < current_date OR d.no = 1 THEN 'given' ELSE 'due' END
FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id, (VALUES (1, 0), (2, 3), (3, 7), (4, 28)) AS d(no, offs)
WHERE e.programme_id = 'f0000000-0000-4000-8000-000000000001';
-- A few patients have not come back for a recent dose: overdue on the clinic's call list.
UPDATE health.pep_doses SET status = 'due', given_on = NULL, given_by_name = NULL, batch = NULL
 WHERE id IN (SELECT d.id FROM health.pep_doses d JOIN health.pep_courses c ON c.id = d.course_id JOIN health.exposures e ON e.id = c.exposure_id
               WHERE c.status = 'active' AND d.dose_no IN (2, 3) AND d.due_on BETWEEN current_date - 4 AND current_date - 1 AND right(e.code, 1) IN ('1', '3', '6', '8'));

-- Citizen notices waiting at the hospital and the HSR clinic.
INSERT INTO health.citizen_notices (programme_id, facility_id, happened_on, ward, place, animal_species, animal_description, callback_phone, callback_consent, status, created_at) VALUES
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003', current_date, 'Jayanagar', '4th Block shopping complex', 'dog', 'Small brown dog, nipped a child''s leg', '90000 20001', true, 'new', now() - interval '2 hours'),
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003', current_date - 1, 'Banashankari', 'Near the temple tank', 'dog', 'Black dog, seemed aggressive', NULL, false, 'new', now() - interval '20 hours'),
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000004', current_date, 'HSR Layout', 'Sector 2 park', 'cat', 'Grey cat, scratched hand', '90000 20003', true, 'new', now() - interval '1 hour');

-- Animal follow-ups to the NGOs for community or unknown-owner animals.
INSERT INTO public.oh_handoffs (id, programme_id, kind, from_institution, to_institution, title, detail, ward, place, status, due_on, outcome, created_at, updated_at, closed_at, closed_by_name)
SELECT ('f4000000-0000-4000-8000-' || substr(e.id::text, 25))::uuid, e.programme_id, 'animal_followup', e.facility_id, a.institution_id,
  'Find and observe the ' || e.animal_species || ' involved in ' || CASE e.exposure_kind WHEN 'bite' THEN 'a bite' WHEN 'scratch' THEN 'a scratch' WHEN 'lick_broken_skin' THEN 'a lick on broken skin' ELSE 'contact' END || ' on ' || to_char(e.exposure_on, 'DD Mon'),
  'Animal: ' || e.animal_description || E'\nThe facility asked for the animal to be located and its health recorded. Record what you find; if it is sick or dies, arrange a sample for the laboratory.' || E'\nNo patient details are shared with this request.',
  e.ward, e.animal_place,
  CASE WHEN current_date - e.exposure_on > 9 OR (current_date - e.exposure_on > 4 AND right(e.code, 1) IN ('0','2','4','6','8')) THEN (CASE WHEN right(e.code, 1) = '7' THEN 'declined' ELSE 'done' END) WHEN current_date - e.exposure_on > 2 THEN 'accepted' ELSE 'open' END,
  e.exposure_on + 3,
  CASE WHEN (current_date - e.exposure_on > 9 OR (current_date - e.exposure_on > 4 AND right(e.code, 1) IN ('0','2','4','6','8'))) THEN (CASE WHEN right(e.code, 1) = '7' THEN 'Could not find a dog matching the description after two visits.' WHEN right(e.code, 1) = '2' THEN 'Dog found, vaccinated on the spot and observed for ten days. Healthy at the last check.' ELSE 'Dog found and observed for ten days. Alive and healthy.' END) END,
  e.created_at, e.created_at + interval '1 day',
  CASE WHEN (current_date - e.exposure_on > 9 OR (current_date - e.exposure_on > 4 AND right(e.code, 1) IN ('0','2','4','6','8'))) THEN e.created_at + interval '4 days' END,
  CASE WHEN (current_date - e.exposure_on > 9 OR (current_date - e.exposure_on > 4 AND right(e.code, 1) IN ('0','2','4','6','8'))) THEN 'Ravi Kumar' END
FROM health.exposures e JOIN public.oh_ward_assignments a ON a.programme_id = e.programme_id AND a.ward = e.ward AND a.duty = 'animal_followup'
WHERE e.programme_id = 'f0000000-0000-4000-8000-000000000001' AND e.animal_ownership <> 'owned' AND e.animal_species = 'dog';
UPDATE health.exposures e SET handoff_id = ('f4000000-0000-4000-8000-' || substr(e.id::text, 25))::uuid
 WHERE e.programme_id = 'f0000000-0000-4000-8000-000000000001' AND EXISTS (SELECT 1 FROM public.oh_handoffs h WHERE h.id = ('f4000000-0000-4000-8000-' || substr(e.id::text, 25))::uuid);

-- Laboratory samples: one positive, three negative, one testing, one awaiting receipt.
INSERT INTO public.oh_samples (id, programme_id, code, submitted_by, laboratory_id, species, sample_type, reason, collected_on, collected_by_name, ward, place, status, result, method, result_note, resulted_at, resulted_by_name, created_at) VALUES
 ('f5000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-001', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000006', 'dog', 'brain_tissue', 'Dog died three days after biting two people; showed aggression and drooling', current_date - 16, 'Ravi Kumar', 'HSR Layout', 'Sector 2 park', 'resulted', 'positive', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '13 days', 'Dr. Suma Hegde', now() - interval '16 days'),
 ('f5000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-002', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000006', 'dog', 'brain_tissue', 'Found dead after a reported bite', current_date - 40, 'Ravi Kumar', 'Jayanagar', 'Lane behind the temple', 'resulted', 'negative', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '37 days', 'Dr. Suma Hegde', now() - interval '40 days'),
 ('f5000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-003', 'f1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000006', 'dog', 'brain_tissue', 'Road-kill near a bite location', current_date - 30, 'Vaccination Partner field team', 'Whitefield', 'Main road junction', 'resulted', 'negative', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '27 days', 'Dr. Suma Hegde', now() - interval '30 days'),
 ('f5000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-004', 'f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000006', 'cattle', 'brain_tissue', 'Calf with neurological signs (expanded species surveillance)', current_date - 22, 'Municipal veterinary officer', 'Yelahanka', 'Dairy colony', 'resulted', 'negative', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '19 days', 'Dr. Suma Hegde', now() - interval '22 days'),
 ('f5000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-005', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000006', 'dog', 'brain_tissue', 'Dog died during observation after a category III bite', current_date - 3, 'Ravi Kumar', 'BTM Layout', 'Outside the vegetable market', 'testing', NULL, NULL, NULL, NULL, NULL, now() - interval '3 days'),
 ('f5000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000001', 'S-DEMO-006', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000006', 'cat', 'brain_tissue', 'Cat died after scratching a child', current_date, 'Ravi Kumar', 'Koramangala', 'Apartment complex parking', 'dispatched', NULL, NULL, NULL, NULL, NULL, now() - interval '3 hours');
INSERT INTO public.oh_sample_events (sample_id, at, actor_name, institution_id, action, note)
SELECT s.id, s.created_at + (st.n * interval '1 day') * CASE WHEN s.status = 'dispatched' THEN 0 ELSE 1 END, CASE WHEN st.a IN ('collected', 'dispatched') THEN s.collected_by_name ELSE 'Dr. Suma Hegde' END,
  CASE WHEN st.a IN ('collected', 'dispatched') THEN s.submitted_by ELSE s.laboratory_id END, st.a, CASE st.a WHEN 'dispatched' THEN 'Cold chain, courier' WHEN 'received' THEN 'Received intact' END
FROM public.oh_samples s, (VALUES (0, 'collected', 1), (0, 'dispatched', 2), (1, 'received', 3), (2, 'testing', 4), (3, 'resulted', 5)) AS st(n, a, ord)
WHERE s.programme_id = 'f0000000-0000-4000-8000-000000000001'
  AND st.ord <= CASE s.status WHEN 'dispatched' THEN 2 WHEN 'testing' THEN 4 ELSE 5 END;
INSERT INTO public.oh_handoffs (programme_id, kind, from_institution, to_institution, title, detail, ward, place, sample_id, status, created_at, updated_at) VALUES
 ('f0000000-0000-4000-8000-000000000001', 'result_notice', 'f1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000001', 'Laboratory-confirmed rabies: HSR Layout', 'Sample S-DEMO-001 (dog) tested positive by direct fluorescent antibody test (illustrative). Decide the response with the partners.', 'HSR Layout', 'Sector 2 park', 'f5000000-0000-4000-8000-000000000001', 'accepted', now() - interval '13 days', now() - interval '12 days'),
 ('f0000000-0000-4000-8000-000000000001', 'result_notice', 'f1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000002', 'Laboratory-confirmed rabies: HSR Layout', 'Sample S-DEMO-001 (dog) tested positive by direct fluorescent antibody test (illustrative). Decide the response with the partners.', 'HSR Layout', 'Sector 2 park', 'f5000000-0000-4000-8000-000000000001', 'done', now() - interval '13 days', now() - interval '10 days'),
 ('f0000000-0000-4000-8000-000000000001', 'vaccination_request', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000007', 'Ring vaccination around Sector 2 park, HSR Layout', 'Following the confirmed case: vaccinate dogs within the agreed radius and record each one on the register.', 'HSR Layout', 'Sector 2 park', NULL, 'accepted', now() - interval '12 days', now() - interval '11 days'),
 ('f0000000-0000-4000-8000-000000000001', 'service_gap', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000005', 'Confirm anti-rabies vaccine availability', 'Your last confirmation has expired, so the public finder shows "not verified". Please confirm this week.', 'Malleshwaram', NULL, NULL, 'open', now() - interval '4 days', now() - interval '4 days');
UPDATE public.oh_handoffs SET due_on = current_date - 2 WHERE title LIKE 'Confirm anti-rabies%' AND programme_id = 'f0000000-0000-4000-8000-000000000001';

INSERT INTO public.oh_ward_estimates (programme_id, ward, dogs_estimated, method, source, estimated_on) VALUES
 ('f0000000-0000-4000-8000-000000000001', 'HSR Layout', 9, 'Illustrative figure for the demo', 'Replace with the programme''s own survey', current_date - 60),
 ('f0000000-0000-4000-8000-000000000001', 'Jayanagar', 6, 'Illustrative figure for the demo', 'Replace with the programme''s own survey', current_date - 60),
 ('f0000000-0000-4000-8000-000000000001', 'BTM Layout', 12, 'Illustrative figure for the demo', 'Replace with the programme''s own survey', current_date - 60),
 ('f0000000-0000-4000-8000-000000000001', 'Koramangala', 10, 'Illustrative figure for the demo', 'Replace with the programme''s own survey', current_date - 60);

INSERT INTO public.oh_trainings (programme_id, provider_id, title, audience, held_on, participants, institutions_reached, notes) VALUES
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000006', 'Brain sample collection and cold chain', 'para_veterinarians', current_date - 45, 18, 3, 'Illustrative session'),
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000006', 'Laboratory diagnosis refresher', 'laboratory', current_date - 30, 7, 2, 'Illustrative session'),
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'Recording bites and follow-ups in StrayPaw', 'healthcare', current_date - 20, 24, 4, 'Illustrative session'),
 ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'Safe dog handling for vaccination drives', 'animal_handlers', current_date - 9, 31, 2, 'Illustrative session');
COMMIT;
