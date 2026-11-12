-- StrayPaw One Health: illustrative demonstration deployment.
--
-- EVERYTHING HERE IS INVENTED for demonstration. Programmes, organisations and
-- areas carry illustrative = true and the app shows an "Illustrative" strip on
-- every screen that reads them. Institutions are named by their ROLE in a
-- programme, never by a real partner's name. Locality names are real place
-- names; facility coordinates are approximate locality centres, not addresses.
-- No record describes a real person.
--
-- It shows one product configured three ways, with no special code:
--   * a state programme (Karnataka · illustrative) containing
--   * a city programme (Bengaluru rabies elimination · illustrative), and
--   * an unrelated city programme (Coimbatore ABC & anti-rabies · illustrative)
--     whose people cannot read Bengaluru's records.
--
-- Re-runnable: it deletes only rows with the fixed demo ids below.
-- Requires: the One Health v2.1–v2.6 migrations; the sample NGOs
--   d0000000-0000-4000-8000-0000000000a0 (Bengaluru) and
--   20000000-0000-4000-8000-000000000001 (Coimbatore); and the demo accounts
--   created by staging/one-health-accounts.sql.

BEGIN;

-- ── Clean previous demo rows ────────────────────────────────────────────
DELETE FROM health.reminder_log WHERE course_id IN (SELECT c.id FROM health.pep_courses c JOIN health.exposures e ON e.id = c.exposure_id WHERE e.facility_id::text LIKE 'f1000000-%');
DELETE FROM health.exposures WHERE facility_id::text LIKE 'f1000000-%';
DELETE FROM health.citizen_notices WHERE facility_id::text LIKE 'f1000000-%';
DELETE FROM public.oh_sample_events WHERE sample_id IN (SELECT id FROM public.oh_samples WHERE laboratory_id::text LIKE 'f1000000-%');
DELETE FROM public.oh_handoffs WHERE to_org::text LIKE 'f1000000-%' OR from_org::text LIKE 'f1000000-%';
DELETE FROM public.oh_samples WHERE laboratory_id::text LIKE 'f1000000-%';
DELETE FROM public.oh_service_status WHERE organisation_id::text LIKE 'f1000000-%';
DELETE FROM public.oh_programmes WHERE id::text LIKE 'f0000000-%';
DELETE FROM public.oh_members WHERE organisation_id::text LIKE 'f1000000-%';
DELETE FROM public.oh_organisations WHERE id::text LIKE 'f1000000-%';
DELETE FROM public.oh_estimates WHERE area_id::text LIKE 'f2000000-%';
DELETE FROM public.oh_areas WHERE id::text LIKE 'f2000000-%';
-- health.transfers go with their exposures (ON DELETE CASCADE).

-- ── Geography ───────────────────────────────────────────────────────────
INSERT INTO public.oh_areas (id, parent_id, level, name, time_zone, source, illustrative) VALUES
  ('f2000000-0000-4000-8000-000000000001', NULL, 'state', 'Karnataka', 'Asia/Kolkata', 'Demonstration geography', true),
  ('f2000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000001', 'city', 'Bengaluru', 'Asia/Kolkata', 'Demonstration geography', true),
  ('f2000000-0000-4000-8000-000000000003', NULL, 'state', 'Tamil Nadu', 'Asia/Kolkata', 'Demonstration geography', true),
  ('f2000000-0000-4000-8000-000000000004', 'f2000000-0000-4000-8000-000000000003', 'city', 'Coimbatore', 'Asia/Kolkata', 'Demonstration geography', true);
INSERT INTO public.oh_areas (id, parent_id, level, name, source, illustrative)
SELECT ('f2000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'f2000000-0000-4000-8000-000000000002', 'locality', n, 'Locality name; boundary not loaded', true
  FROM unnest(ARRAY['HSR Layout', 'Koramangala', 'BTM Layout', 'Jayanagar', 'Banashankari', 'Indiranagar', 'Whitefield', 'Malleshwaram', 'Rajajinagar', 'Yelahanka']) WITH ORDINALITY AS t(n, i);
INSERT INTO public.oh_areas (id, parent_id, level, name, source, illustrative)
SELECT ('f2000000-0000-4000-8000-0000000002' || lpad(i::text, 2, '0'))::uuid, 'f2000000-0000-4000-8000-000000000004', 'locality', n, 'Locality name; boundary not loaded', true
  FROM unnest(ARRAY['Ganapathy', 'Peelamedu', 'Gandhipuram']) WITH ORDINALITY AS t(n, i);

-- Approximate outlines for the illustrative localities, so the programme map can
-- place bites, confirmed cases and coverage. A small hexagon around each
-- locality's approximate centre: NOT an official boundary (ward boundaries are a
-- dependency on the municipal GIS team). Re-runnable.
UPDATE public.oh_areas a SET geometry = v.g::jsonb, source = 'Approximate locality outline (illustrative); official boundary not loaded'
  FROM (VALUES
  ('HSR Layout', '{"type": "Polygon", "coordinates": [[[77.64951, 12.9116], [77.64411, 12.92069], [77.63329, 12.92069], [77.62789, 12.9116], [77.63329, 12.90251], [77.64411, 12.90251], [77.64951, 12.9116]]]}'),
  ('Koramangala', '{"type": "Polygon", "coordinates": [[[77.63531, 12.9352], [77.62991, 12.94429], [77.61909, 12.94429], [77.61369, 12.9352], [77.61909, 12.92611], [77.62991, 12.92611], [77.63531, 12.9352]]]}'),
  ('BTM Layout', '{"type": "Polygon", "coordinates": [[[77.62091, 12.9166], [77.61551, 12.92569], [77.60469, 12.92569], [77.59929, 12.9166], [77.60469, 12.90751], [77.61551, 12.90751], [77.62091, 12.9166]]]}'),
  ('Jayanagar', '{"type": "Polygon", "coordinates": [[[77.59461, 12.9299], [77.58921, 12.93899], [77.57839, 12.93899], [77.57299, 12.9299], [77.57839, 12.92081], [77.58921, 12.92081], [77.59461, 12.9299]]]}'),
  ('Banashankari', '{"type": "Polygon", "coordinates": [[[77.55761, 12.9255], [77.55221, 12.93459], [77.54139, 12.93459], [77.53599, 12.9255], [77.54139, 12.91641], [77.55221, 12.91641], [77.55761, 12.9255]]]}'),
  ('Indiranagar', '{"type": "Polygon", "coordinates": [[[77.65161, 12.9784], [77.64621, 12.98749], [77.63539, 12.98749], [77.62999, 12.9784], [77.63539, 12.96931], [77.64621, 12.96931], [77.65161, 12.9784]]]}'),
  ('Whitefield', '{"type": "Polygon", "coordinates": [[[77.76081, 12.9698], [77.75541, 12.97889], [77.74459, 12.97889], [77.73919, 12.9698], [77.74459, 12.96071], [77.75541, 12.96071], [77.76081, 12.9698]]]}'),
  ('Malleshwaram', '{"type": "Polygon", "coordinates": [[[77.58211, 13.0031], [77.57671, 13.01219], [77.56589, 13.01219], [77.56048, 13.0031], [77.56589, 12.99401], [77.57671, 12.99401], [77.58211, 13.0031]]]}'),
  ('Rajajinagar', '{"type": "Polygon", "coordinates": [[[77.56441, 12.9915], [77.55901, 13.00059], [77.54819, 13.00059], [77.54279, 12.9915], [77.54819, 12.98241], [77.55901, 12.98241], [77.56441, 12.9915]]]}'),
  ('Yelahanka', '{"type": "Polygon", "coordinates": [[[77.60711, 13.1007], [77.60171, 13.10979], [77.59089, 13.10979], [77.58549, 13.1007], [77.59089, 13.09161], [77.60171, 13.09161], [77.60711, 13.1007]]]}')
  ) v(name, g)
 WHERE a.name = v.name AND a.level = 'locality' AND a.illustrative AND a.parent_id = 'f2000000-0000-4000-8000-000000000002';

-- ── Programmes ──────────────────────────────────────────────────────────
INSERT INTO public.oh_programmes (id, slug, name, parent_id, summary, status, vaccination_target, config, plan, illustrative) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'karnataka-demo', 'Karnataka One Health · Illustrative', NULL,
   'An illustrative state programme that oversees city programmes. Every record is invented.', 'pilot', 0.70,
   '{"modules":["bite_care","laboratory","followups","vaccination","services","training"]}', 'state', true),
  ('f0000000-0000-4000-8000-000000000002', 'bengaluru-demo', 'Bengaluru Rabies Elimination · Illustrative', 'f0000000-0000-4000-8000-000000000001',
   'An illustrative city-wide One Health programme: human bite care and post-exposure prophylaxis, laboratory confirmation, animal follow-up, dog vaccination and training, coordinated across institutions. Every record is invented.',
   'pilot', 0.70, '{"modules":["bite_care","laboratory","followups","vaccination","services","training"],"followup_due_days":3,"dog_revaccination_days":365}', 'programme', true),
  ('f0000000-0000-4000-8000-000000000003', 'coimbatore-demo', 'Coimbatore ABC & Anti-Rabies · Illustrative', NULL,
   'An illustrative municipal programme with one NGO partner. Used to show that programmes are isolated from each other.', 'pilot', 0.70,
   '{"modules":["vaccination","followups","services"]}', 'pilot', true);
INSERT INTO public.oh_programme_areas VALUES
  ('f0000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001'),
  ('f0000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000004');

-- ── Organisations, named by role ───────────────────────────────────────
INSERT INTO public.oh_organisations (id, kind, name, short_name, ngo_id, area_id, address, phone, hours, lat, lng, listed_publicly, illustrative) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'state',      'State One Health Cell · Illustrative', 'State cell', NULL, 'f2000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000002', 'coordinator','Programme Coordination Cell', 'Coordination', NULL, 'f2000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000003', 'municipal',  'Municipal Animal Husbandry & Health Division', 'Municipal division', NULL, 'f2000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000004', 'hospital',   'Teaching Hospital Anti-Rabies Clinic', 'Teaching hospital', NULL, 'f2000000-0000-4000-8000-000000000104', 'Illustrative address, Jayanagar', 'Illustrative', 'Every day, 8 am to 8 pm', 12.9299, 77.5826, true, true),
  ('f1000000-0000-4000-8000-000000000005', 'clinic',     'Urban Primary Health Centre · HSR Layout', 'UPHC HSR Layout', NULL, 'f2000000-0000-4000-8000-000000000101', 'Illustrative address, HSR Layout', 'Illustrative', 'Mon to Sat, 9 am to 4 pm', 12.9116, 77.6474, true, true),
  ('f1000000-0000-4000-8000-000000000006', 'clinic',     'Urban Primary Health Centre · Malleshwaram', 'UPHC Malleshwaram', NULL, 'f2000000-0000-4000-8000-000000000108', 'Illustrative address, Malleshwaram', 'Illustrative', 'Mon to Sat, 9 am to 4 pm', 13.0035, 77.5710, true, true),
  ('f1000000-0000-4000-8000-000000000007', 'clinic',     'Urban Primary Health Centre · Whitefield', 'UPHC Whitefield', NULL, 'f2000000-0000-4000-8000-000000000107', 'Illustrative address, Whitefield', 'Illustrative', 'Mon to Sat, 9 am to 4 pm', 12.9698, 77.7500, true, true),
  ('f1000000-0000-4000-8000-000000000008', 'clinic',     'Wound-Washing Unit · Koramangala', 'Wound unit Koramangala', NULL, 'f2000000-0000-4000-8000-000000000102', 'Illustrative address, Koramangala', 'Illustrative', 'Every day, 7 am to 9 pm', 12.9352, 77.6245, true, true),
  ('f1000000-0000-4000-8000-000000000009', 'laboratory', 'Reference Rabies Diagnostic Laboratory', 'Reference laboratory', NULL, 'f2000000-0000-4000-8000-000000000109', NULL, NULL, NULL, 13.0130, 77.5530, false, true),
  ('f1000000-0000-4000-8000-000000000010', 'ngo',        'Sample · Bengaluru Animal Care Trust', 'Animal Care Trust', 'd0000000-0000-4000-8000-0000000000a0', 'f2000000-0000-4000-8000-000000000102', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000011', 'research',   'Programme Epidemiology Unit', 'Epidemiology', NULL, 'f2000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000012', 'municipal',  'Coimbatore Municipal Veterinary Section · Illustrative', 'Coimbatore municipal', NULL, 'f2000000-0000-4000-8000-000000000004', NULL, NULL, NULL, NULL, NULL, false, true),
  ('f1000000-0000-4000-8000-000000000013', 'ngo',        'DEMO · Coimbatore Street Animal Care', 'Coimbatore NGO', '20000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000004', NULL, NULL, NULL, NULL, NULL, false, true);

INSERT INTO public.oh_participations (programme_id, organisation_id, responsibilities) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'State oversight of city programmes'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'Programme coordination, data integration, monitoring and evaluation'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000003', 'Dog vaccination, field surveillance and operations'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', 'Human bite care, post-exposure prophylaxis and immunoglobulin; referral centre'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000005', 'Bite care and vaccine doses'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000006', 'Bite care and vaccine doses'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000007', 'Bite care and vaccine doses'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000008', 'Wound washing and first aid; refers for vaccination'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000009', 'Laboratory confirmation, sample management and training'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000010', 'Animal follow-ups, catching, vaccination and community engagement'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000011', 'Analysis of suppressed, aggregate data'),
  ('f0000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000012', 'Programme oversight'),
  ('f0000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000013', 'Vaccination and follow-ups');

INSERT INTO public.oh_assignments (programme_id, area_id, duty, organisation_id)
SELECT 'f0000000-0000-4000-8000-000000000002', a.id, d, 'f1000000-0000-4000-8000-000000000010'
  FROM public.oh_areas a CROSS JOIN unnest(ARRAY['animal_followup', 'sample_collection']) d WHERE a.parent_id = 'f2000000-0000-4000-8000-000000000002';

-- ── People (accounts from staging/one-health-accounts.sql) ─────────────
INSERT INTO public.oh_members (organisation_id, user_id, role, display_name) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000010', 'lead', 'Dr. Kavitha Rao'),
  ('f1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'lead', 'Dr. Meera Iyer'),
  ('f1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'coordinator', 'Dr. Prakash Gowda'),
  ('f1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003', 'clinician', 'Dr. Arjun Rao'),
  ('f1000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003', 'clinician', 'Dr. Arjun Rao'),
  ('f1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'nurse', 'Sister Lakshmi N.'),
  ('f1000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000005', 'clinician', 'Dr. Nandini S.'),
  ('f1000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000006', 'lab_scientist', 'Dr. Suma Hegde'),
  ('f1000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000009', 'analyst', 'Ananya Bhat'),
  ('f1000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000011', 'lead', 'Dr. Senthil K.');
-- NGO staff (…0007 field, …0008 coordinator) reach their programme through their
-- existing NGO membership; oh_my_memberships maps NGO roles automatically.

-- ── Verified services and referral pathways ────────────────────────────
INSERT INTO public.oh_service_status (organisation_id, service, status, note, verified_by_name, verified_at, valid_until) VALUES
  ('f1000000-0000-4000-8000-000000000004', 'arv', 'available', NULL, 'Sister Lakshmi N.', now() - interval '1 day', now() + interval '6 days'),
  ('f1000000-0000-4000-8000-000000000004', 'rig', 'available', NULL, 'Sister Lakshmi N.', now() - interval '1 day', now() + interval '6 days'),
  ('f1000000-0000-4000-8000-000000000004', 'wound_care', 'available', NULL, 'Sister Lakshmi N.', now() - interval '1 day', now() + interval '6 days'),
  ('f1000000-0000-4000-8000-000000000005', 'arv', 'available', NULL, 'Dr. Arjun Rao', now() - interval '2 days', now() + interval '5 days'),
  ('f1000000-0000-4000-8000-000000000005', 'wound_care', 'available', NULL, 'Dr. Arjun Rao', now() - interval '2 days', now() + interval '5 days'),
  ('f1000000-0000-4000-8000-000000000006', 'arv', 'available', NULL, 'Dr. Nandini S.', now() - interval '12 days', now() - interval '5 days'),
  ('f1000000-0000-4000-8000-000000000006', 'wound_care', 'available', NULL, 'Dr. Nandini S.', now() - interval '12 days', now() - interval '5 days'),
  ('f1000000-0000-4000-8000-000000000007', 'arv', 'unavailable', 'Illustrative: awaiting supply', 'Duty medical officer', now() - interval '3 hours', now() + interval '2 days'),
  ('f1000000-0000-4000-8000-000000000007', 'wound_care', 'available', NULL, 'Duty medical officer', now() - interval '3 hours', now() + interval '7 days'),
  ('f1000000-0000-4000-8000-000000000008', 'wound_care', 'available', NULL, 'Unit attendant', now() - interval '6 hours', now() + interval '7 days'),
  ('f1000000-0000-4000-8000-000000000009', 'rabies_testing', 'available', NULL, 'Dr. Suma Hegde', now() - interval '1 day', now() + interval '13 days');
INSERT INTO public.oh_referrals (programme_id, from_org, to_org, service, note) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000004', 'rig', 'Category III exposures needing immunoglobulin'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000004', 'rig', NULL),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000004', 'arv', 'While vaccine is unavailable'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000004', 'rig', NULL),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000005', 'arv', 'After wound washing'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000004', 'rig', NULL)
ON CONFLICT DO NOTHING;

-- ── Population estimates (illustrative) and training ───────────────────
INSERT INTO public.oh_estimates (area_id, dogs_estimated, method, source, estimated_on) VALUES
  ('f2000000-0000-4000-8000-000000000101', 40, 'Mark–resight street survey (illustrative)', 'Illustrative survey, municipal division', current_date - 60),
  ('f2000000-0000-4000-8000-000000000102', 30, 'Mark–resight street survey (illustrative)', 'Illustrative survey, municipal division', current_date - 60),
  ('f2000000-0000-4000-8000-000000000104', 12, 'Line-transect count (illustrative)', 'Illustrative survey, NGO partner', current_date - 45),
  ('f2000000-0000-4000-8000-000000000108', 25, 'Line-transect count (illustrative)', 'Illustrative survey, NGO partner', current_date - 45);
INSERT INTO public.oh_trainings (programme_id, provider_id, title, audience, held_on, participants, institutions_reached, notes) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000009', 'Sample collection and safe transport', 'para_veterinarians', current_date - 40, 24, 3, 'Illustrative session'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000009', 'Laboratory diagnosis refresher', 'laboratory', current_date - 25, 11, 2, 'Illustrative session'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', 'Bite assessment and wound care', 'healthcare', current_date - 12, 38, 5, 'Illustrative session'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000003', 'Bite prevention for resident associations', 'community', current_date - 6, 120, 9, 'Illustrative session');

-- ── Human exposures, courses and doses (invented) ──────────────────────
-- Dose dates are illustrative values entered as if by the clinician; the
-- software never generates a schedule. The regimen text says so.
DO $$
DECLARE
  fac uuid[] := ARRAY['f1000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000006','f1000000-0000-4000-8000-000000000007']::uuid[];
  clin uuid := 'e0000000-0000-4000-8000-000000000003';
  i int; e uuid; c uuid; d date; area uuid; cat text; st text; g boolean; offs int[] := ARRAY[0, 3, 7, 14, 28]; k int; due date; t date := (now() AT TIME ZONE 'Asia/Kolkata')::date; f uuid;
  descs text[] := ARRAY['Brown community dog, collar missing', 'Black and white puppy near the market', 'Tan female dog with a notched ear', 'Grey dog, limping', 'Owned dog, unknown vaccination', 'Cat near a residential block', 'Dog that bit two people the same day', 'Pale dog near the bus stand'];
BEGIN
  PERFORM setseed(0.4242);
  FOR i IN 1..64 LOOP
    f := fac[1 + floor(random() * array_length(fac, 1))::int];
    d := t - floor(random() * 84)::int;
    area := ('f2000000-0000-4000-8000-0000000001' || lpad((1 + floor(random() * 10))::int::text, 2, '0'))::uuid;
    cat := CASE WHEN random() < 0.48 THEN 'III' WHEN random() < 0.85 THEN 'II' ELSE 'I' END;
    e := gen_random_uuid();
    INSERT INTO health.exposures (id, facility_id, code, patient_ref, age_band, sex, area_id, exposure_on, presented_on, exposure_kind, category, category_by, category_by_name,
      wound_washed, animal_species, animal_ownership, animal_description, animal_place, source, contact_phone, reminder_consent, created_by, created_at)
    VALUES (e, f, 'BX-' || to_char(d, 'YYMM') || '-' || upper(substr(md5(e::text), 1, 6)), 'OPD-ILL-' || lpad(i::text, 4, '0'),
      (ARRAY['0-4','5-14','15-29','30-49','50+'])[1 + floor(random() * 5)::int], (ARRAY['female','male'])[1 + floor(random() * 2)::int], area, d, d,
      (ARRAY['bite','bite','bite','scratch','lick_broken_skin'])[1 + floor(random() * 5)::int], cat, clin, 'Dr. Arjun Rao',
      (ARRAY['before_arrival','at_facility','not_washed','not_recorded'])[1 + floor(random() * 4)::int],
      CASE WHEN random() < 0.9 THEN 'dog' WHEN random() < 0.5 THEN 'cat' ELSE 'monkey' END, (ARRAY['community','community','owned','unknown'])[1 + floor(random() * 4)::int],
      descs[1 + floor(random() * array_length(descs, 1))::int], 'Illustrative place', 'walk_in',
      CASE WHEN random() < 0.7 THEN '00000' || lpad(i::text, 5, '0') END, true, clin, d::timestamptz + interval '10 hours');
    UPDATE health.exposures SET contact_phone = NULL, reminder_consent = false WHERE id = e AND contact_phone IS NULL;
    IF cat IN ('II', 'III') THEN
      c := gen_random_uuid();
      st := CASE WHEN t - d > 35 AND random() < 0.78 THEN 'completed' WHEN t - d > 35 THEN 'lost_to_follow_up' ELSE 'active' END;
      INSERT INTO health.pep_courses (id, exposure_id, regimen, rig_given, prescribed_by, prescribed_by_name, prescribed_at, status, completed_at)
      VALUES (c, e, 'Illustrative course · dates entered by the clinician', cat = 'III' AND random() < 0.7, clin, 'Dr. Arjun Rao', d::timestamptz + interval '11 hours', st,
              CASE WHEN st = 'completed' THEN (d + 28)::timestamptz + interval '12 hours' END);
      FOR k IN 1..5 LOOP
        due := d + offs[k];
        g := st = 'completed' OR (st = 'lost_to_follow_up' AND k <= 2) OR (st = 'active' AND due < t AND random() < 0.86) OR (st = 'active' AND due = t AND random() < 0.3);
        INSERT INTO health.pep_doses (course_id, dose_no, due_on, given_on, given_by_name, batch, status)
        VALUES (c, k, due, CASE WHEN g THEN due END, CASE WHEN g THEN 'Sister Lakshmi N.' END, CASE WHEN g THEN 'ILL-' || (100 + k) END,
          CASE WHEN g THEN 'given' WHEN st = 'lost_to_follow_up' THEN 'cancelled' ELSE 'due' END);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Two notices from the public waiting at the teaching hospital.
INSERT INTO health.citizen_notices (programme_id, facility_id, happened_on, area_id, place, animal_species, animal_description, callback_phone, callback_consent, status, created_at) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', current_date, 'f2000000-0000-4000-8000-000000000104', 'Illustrative: near a park', 'dog', 'Brown dog, unprovoked bite', '0000000001', true, 'new', now() - interval '2 hours'),
  ('f0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004', current_date - 1, 'f2000000-0000-4000-8000-000000000101', 'Illustrative: outside a school', 'dog', 'Puppy, scratch on a child''s hand', NULL, false, 'new', now() - interval '20 hours');

-- ── Samples and the laboratory chain ───────────────────────────────────
INSERT INTO public.oh_samples (id, code, submitted_by, laboratory_id, species, sample_type, reason, collected_on, collected_by_name, area_id, place, status, result, method, result_note, resulted_at, resulted_by_name, created_at) VALUES
  ('f3000000-0000-4000-8000-000000000001', 'SX-ILL-001', 'f1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000009', 'dog', 'brain_tissue', 'Dog died after biting two people (illustrative)', current_date - 9, 'Ravi Kumar', 'f2000000-0000-4000-8000-000000000101', 'Illustrative place', 'resulted', 'positive', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '5 days', 'Dr. Suma Hegde', now() - interval '9 days'),
  ('f3000000-0000-4000-8000-000000000002', 'SX-ILL-002', 'f1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000009', 'dog', 'brain_tissue', 'Found dead, neurological signs reported (illustrative)', current_date - 20, 'Municipal team', 'f2000000-0000-4000-8000-000000000107', 'Illustrative place', 'resulted', 'negative', 'Direct fluorescent antibody test (illustrative)', NULL, now() - interval '16 days', 'Dr. Suma Hegde', now() - interval '20 days'),
  ('f3000000-0000-4000-8000-000000000003', 'SX-ILL-003', 'f1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000009', 'cat', 'brain_tissue', 'Aggressive behaviour before death (illustrative)', current_date - 2, 'Ravi Kumar', 'f2000000-0000-4000-8000-000000000103', 'Illustrative place', 'received', NULL, NULL, NULL, NULL, NULL, now() - interval '2 days'),
  ('f3000000-0000-4000-8000-000000000004', 'SX-ILL-004', 'f1000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000009', 'cattle', 'brain_tissue', 'Calf with hydrophobia-like signs (illustrative)', current_date - 6, 'Municipal team', 'f2000000-0000-4000-8000-000000000110', 'Illustrative place', 'testing', NULL, NULL, NULL, NULL, NULL, now() - interval '6 days'),
  ('f3000000-0000-4000-8000-000000000005', 'SX-ILL-005', 'f1000000-0000-4000-8000-000000000010', 'f1000000-0000-4000-8000-000000000009', 'dog', 'saliva', 'Observation-period dog died (illustrative)', current_date - 1, 'Ravi Kumar', 'f2000000-0000-4000-8000-000000000102', 'Illustrative place', 'dispatched', NULL, NULL, NULL, NULL, NULL, now() - interval '1 day');
INSERT INTO public.oh_sample_events (sample_id, at, actor_name, organisation_id, action, note)
SELECT s.id, s.created_at, s.collected_by_name, s.submitted_by, 'collected', NULL FROM public.oh_samples s WHERE s.id::text LIKE 'f3000000-%'
UNION ALL SELECT s.id, s.created_at + interval '4 hours', s.collected_by_name, s.submitted_by, 'dispatched', 'Cold chain, sealed container' FROM public.oh_samples s WHERE s.id::text LIKE 'f3000000-%'
UNION ALL SELECT s.id, s.created_at + interval '1 day', 'Dr. Suma Hegde', s.laboratory_id, 'received', NULL FROM public.oh_samples s WHERE s.id::text LIKE 'f3000000-%' AND s.status IN ('received', 'testing', 'resulted')
UNION ALL SELECT s.id, s.created_at + interval '2 days', 'Dr. Suma Hegde', s.laboratory_id, 'testing', NULL FROM public.oh_samples s WHERE s.id::text LIKE 'f3000000-%' AND s.status IN ('testing', 'resulted')
UNION ALL SELECT s.id, s.resulted_at, 'Dr. Suma Hegde', s.laboratory_id, 'resulted', initcap(s.result) || ' · ' || s.method FROM public.oh_samples s WHERE s.id::text LIKE 'f3000000-%' AND s.status = 'resulted';

-- ── Work between institutions ──────────────────────────────────────────
INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, sample_id, status, due_on, outcome, created_at, closed_at, closed_by_name) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'animal_followup', 'f1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000010', 'Find and observe the dog in a category III bite', 'Brown community dog, collar missing. Observe for 10 days if found.', 'f2000000-0000-4000-8000-000000000104', 'Illustrative place', NULL, 'open', current_date + 2, NULL, now() - interval '1 day', NULL, NULL),
  ('f0000000-0000-4000-8000-000000000002', 'animal_followup', 'f1000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000010', 'Find the puppy reported near the market', 'Black and white puppy. Two scratches reported the same day.', 'f2000000-0000-4000-8000-000000000101', 'Illustrative place', NULL, 'accepted', current_date - 1, NULL, now() - interval '5 days', NULL, NULL),
  ('f0000000-0000-4000-8000-000000000002', 'animal_followup', 'f1000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000010', 'Observe the tan dog with a notched ear', 'Already sterilised and vaccinated per the NGO register.', 'f2000000-0000-4000-8000-000000000102', 'Illustrative place', NULL, 'done', current_date - 10, 'Found and observed for 10 days; healthy.', now() - interval '18 days', now() - interval '6 days', 'Ravi Kumar'),
  ('f0000000-0000-4000-8000-000000000002', 'result_notice', 'f1000000-0000-4000-8000-000000000009', 'f1000000-0000-4000-8000-000000000002', 'Positive result: SX-ILL-001, HSR Layout', 'Laboratory-confirmed positive. Check bites recorded in this locality.', 'f2000000-0000-4000-8000-000000000101', NULL, 'f3000000-0000-4000-8000-000000000001', 'open', current_date, NULL, now() - interval '5 days', NULL, NULL),
  ('f0000000-0000-4000-8000-000000000002', 'vaccination_request', 'f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000003', 'Ring vaccination around HSR Layout', 'Following the confirmed case, vaccinate dogs in the surrounding localities.', 'f2000000-0000-4000-8000-000000000101', NULL, NULL, 'accepted', current_date + 5, NULL, now() - interval '4 days', NULL, NULL),
  ('f0000000-0000-4000-8000-000000000002', 'service_gap', 'f1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000002', 'Anti-rabies vaccine not available at UPHC Whitefield', 'Patients are being referred to the teaching hospital.', 'f2000000-0000-4000-8000-000000000107', NULL, NULL, 'open', current_date + 1, NULL, now() - interval '3 hours', NULL, NULL);

-- ── Referrals between facilities (v2.6) ────────────────────────────────
-- One person referred today from the health centre without vaccine to the
-- teaching hospital, not yet marked; one referred for immunoglobulin three
-- days ago who arrived. Patient details never travel with a referral.
INSERT INTO health.transfers (exposure_id, from_org, to_org, service, note, status, sent_by_name, sent_at, closed_by_name, closed_at)
SELECT e.id, e.facility_id, 'f1000000-0000-4000-8000-000000000004', 'arv', 'Illustrative: vaccine not available here today', 'sent', 'Duty medical officer', now() - interval '2 hours', NULL, NULL
  FROM health.exposures e WHERE e.facility_id = 'f1000000-0000-4000-8000-000000000007' AND e.category IN ('II', 'III') ORDER BY e.exposure_on DESC, e.id LIMIT 1;
INSERT INTO health.transfers (exposure_id, from_org, to_org, service, note, status, sent_by_name, sent_at, closed_by_name, closed_at)
SELECT e.id, e.facility_id, 'f1000000-0000-4000-8000-000000000004', 'rig', NULL, 'arrived', 'Dr. Arjun Rao', now() - interval '3 days', 'Sister Lakshmi N.', now() - interval '3 days' + interval '3 hours'
  FROM health.exposures e WHERE e.facility_id = 'f1000000-0000-4000-8000-000000000005' AND e.category = 'III' ORDER BY e.exposure_on DESC, e.id LIMIT 1;
UPDATE health.exposures e SET referred_to = t.to_org FROM health.transfers t WHERE t.exposure_id = e.id AND e.facility_id::text LIKE 'f1000000-%';

-- ── Dog vaccination dates for revaccination (illustrative) ──────────────
-- The sample NGO's animals marked vaccinated get a dated vaccination 300 to
-- 399 days ago, so against the programme's 365-day setting some are overdue
-- and some are due within a fortnight. Inserted once and refreshed in place
-- afterwards: an insert also writes the animal's timeline, audit and
-- workflow rows, and deleting would leave those behind.
INSERT INTO public.medical_events (id, dog_id, kind, event_date, notes, performed_by, is_demo)
SELECT ('f4000000-0000-4000-8000-' || lpad(rn::text, 12, '0'))::uuid, id, 'vaccination', current_date - (300 + (rn * 17) % 100),
       'Illustrative vaccination date, for the revaccination demonstration', 'Sample field team', true
  FROM (SELECT d.id, row_number() OVER (ORDER BY d.id) rn FROM public.dogs d
         WHERE d.ngo_id = 'd0000000-0000-4000-8000-0000000000a0' AND d.vaccination_status = 'vaccinated') x
ON CONFLICT (id) DO UPDATE SET event_date = excluded.event_date;
UPDATE public.animal_timeline_events t SET occurred_at = m.event_date::timestamptz
  FROM public.medical_events m WHERE m.id::text LIKE 'f4000000-%' AND t.source_ref->>'medical_event_id' = m.id::text AND t.occurred_at <> m.event_date::timestamptz;

COMMIT;
