-- ════════════════════════════════════════════════════════════════
-- StrayPaw local staging: synthetic seed (LOCAL ONLY, all TEST-).
-- Two unrelated organisations, their people, animals, cases, care,
-- follow-ups, imports, stories, feeding spots and volunteer sign-ups.
-- Fixed ids so tests can name them. Nothing here is real data.
-- ════════════════════════════════════════════════════════════════
begin;

-- People (auth.users): ids are fixed and readable.
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('a0000000-0000-4000-8000-00000000a001', 'lead.a@test.invalid',      'authenticated', 'authenticated', '{"display_name":"TEST Lead A"}', now()),
  ('a0000000-0000-4000-8000-00000000a002', 'member.a@test.invalid',    'authenticated', 'authenticated', '{"display_name":"TEST Member A"}', now()),
  ('a0000000-0000-4000-8000-00000000a003', 'volunteer.a@test.invalid', 'authenticated', 'authenticated', '{"display_name":"TEST Volunteer A"}', now()),
  ('b0000000-0000-4000-8000-00000000b001', 'lead.b@test.invalid',      'authenticated', 'authenticated', '{"display_name":"TEST Lead B"}', now()),
  ('b0000000-0000-4000-8000-00000000b002', 'member.b@test.invalid',    'authenticated', 'authenticated', '{"display_name":"TEST Member B"}', now()),
  ('c0000000-0000-4000-8000-00000000c001', 'resident@test.invalid',    'authenticated', 'authenticated', '{"display_name":"TEST Resident"}', now()),
  ('c0000000-0000-4000-8000-00000000c002', 'newcomer@test.invalid',    'authenticated', 'authenticated', '{"display_name":"TEST Newcomer"}', now());

insert into public.ngos (id, name, slug, city, verified, partner_status) values
  ('a1000000-0000-4000-8000-0000000000a1', 'TEST Organisation A', 'test-org-a', 'Coimbatore', true, 'active'),
  ('b1000000-0000-4000-8000-0000000000b1', 'TEST Organisation B', 'test-org-b', 'Ranchi', true, 'active');

insert into public.ngo_members (user_id, ngo_id, role) values
  ('a0000000-0000-4000-8000-00000000a001', 'a1000000-0000-4000-8000-0000000000a1', 'lead'),
  ('a0000000-0000-4000-8000-00000000a002', 'a1000000-0000-4000-8000-0000000000a1', 'member'),
  ('a0000000-0000-4000-8000-00000000a003', 'a1000000-0000-4000-8000-0000000000a1', 'volunteer'),
  ('b0000000-0000-4000-8000-00000000b001', 'b1000000-0000-4000-8000-0000000000b1', 'lead'),
  ('b0000000-0000-4000-8000-00000000b002', 'b1000000-0000-4000-8000-0000000000b1', 'member');

-- Animals: one per organisation, one with no organisation.
insert into public.dogs (id, name, zone, city, lat, lng, ngo_id, straypaw_id, species, is_demo) values
  ('d0000000-0000-4000-8000-0000000000a1', 'TEST Dog A', 'RS Puram', 'Coimbatore', 11.0089, 76.9515, 'a1000000-0000-4000-8000-0000000000a1', 'SP-D-TESTA1', 'dog', false),
  ('d0000000-0000-4000-8000-0000000000b1', 'TEST Dog B', 'Doranda', 'Ranchi', 23.3441, 85.3096, 'b1000000-0000-4000-8000-0000000000b1', 'SP-D-TESTB1', 'dog', false),
  ('d0000000-0000-4000-8000-0000000000c1', 'TEST Dog Public', 'Ganapathy', 'Coimbatore', 11.0386, 76.9787, null, 'SP-D-TESTC1', 'dog', false);

-- Cases: one open per organisation.
insert into public.cases (id, dog_id, title, zone, city, lat, lng, ngo_id, status, case_code, is_demo, provenance) values
  ('e0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000a1', 'TEST wound, Org A', 'RS Puram', 'Coimbatore', 11.0089, 76.9515, 'a1000000-0000-4000-8000-0000000000a1', 'unverified', 'TEST-A-001', false, 'field_record'),
  ('e0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-0000000000b1', 'TEST wound, Org B', 'Doranda', 'Ranchi', 23.3441, 85.3096, 'b1000000-0000-4000-8000-0000000000b1', 'unverified', 'TEST-B-001', false, 'field_record');

-- Care already on record.
insert into public.medical_events (id, dog_id, case_id, kind, event_date, notes, performed_by) values
  ('f0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-0000000000a1', null, 'vaccination', current_date - 30, 'TEST private clinical note A', 'TEST clinic A'),
  ('f0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-0000000000b1', null, 'vaccination', current_date - 30, 'TEST private clinical note B', 'TEST clinic B');

-- An import batch per organisation.
insert into public.import_batches (id, ngo_id, source_filename, source_kind, status) values
  ('10000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-0000000000a1', 'TEST-register-A.xlsx', 'xlsx', 'staged'),
  ('10000000-0000-4000-8000-0000000000b1', 'b1000000-0000-4000-8000-0000000000b1', 'TEST-register-B.xlsx', 'xlsx', 'staged');

-- Volunteer sign-ups (helpers):
--   hA   offered to help Org A's animal         → Org A only
--   hB   offered to help Org B's animal         → Org B only
--   hG   general, never routed                  → operators only
--   hR   general, routed by an operator to Org B → Org B only
--   hN   an NGO registering interest            → operators only
insert into public.helpers (id, name, contact, message, is_ngo, ngo_name, dog_id, zone) values
  ('20000000-0000-4000-8000-0000000000a1', 'TEST Volunteer for A', 'vol.a@test.invalid', 'Can foster', false, null, 'd0000000-0000-4000-8000-0000000000a1', 'RS Puram'),
  ('20000000-0000-4000-8000-0000000000b1', 'TEST Volunteer for B', '+91 90000 00001', 'Can drive', false, null, 'd0000000-0000-4000-8000-0000000000b1', 'Doranda'),
  ('20000000-0000-4000-8000-0000000000c1', 'TEST General volunteer', '+91 90000 00002', 'Weekends', false, null, null, 'Coimbatore'),
  ('20000000-0000-4000-8000-0000000000c2', 'TEST Routed volunteer', '+91 90000 00003', 'Evenings', false, null, null, 'Ranchi'),
  ('20000000-0000-4000-8000-0000000000c3', 'TEST NGO contact', 'ngo@test.invalid', 'We rescue', true, 'TEST Applying NGO', 'd0000000-0000-4000-8000-0000000000a1', 'Coimbatore');

commit;

-- Route hR to Org B the designed way: as the service role.
set role service_role;
select public.route_helper('20000000-0000-4000-8000-0000000000c2', 'b1000000-0000-4000-8000-0000000000b1');
reset role;
