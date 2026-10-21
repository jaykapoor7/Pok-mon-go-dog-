-- Staging-only, fictional demonstration data. It is deliberately labelled
-- DEMO and carries no claim of municipal or veterinary verification.

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'community.demo@straypaw.invalid', '$2b$10$QgKsYm5iK60LMhy51Yq3gOxs6qxCvwEJOCPk9v0wNthWvFtzX39i2', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Community demo"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ngo.demo@straypaw.invalid', '$2b$10$V3MhWMITq5qQs/VrrGi1.O.zFe/6nKNln1skwYZkLM3.i/PWAewXO', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Asha · NGO demo"}', now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'municipality.demo@straypaw.invalid', '$2b$10$ahxNPk/rbvSJQwgJFz/R1OQxQHXDUcI.ojGmqjv0NsIJgWyMg.7fe', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Municipality demo"}', now(), now())
on conflict (id) do update set encrypted_password = excluded.encrypted_password, email_confirmed_at = now(), updated_at = now();

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values
  ('community.demo@straypaw.invalid', '10000000-0000-4000-8000-000000000001', '{"sub":"10000000-0000-4000-8000-000000000001","email":"community.demo@straypaw.invalid"}', 'email', now(), now()),
  ('ngo.demo@straypaw.invalid', '10000000-0000-4000-8000-000000000002', '{"sub":"10000000-0000-4000-8000-000000000002","email":"ngo.demo@straypaw.invalid"}', 'email', now(), now()),
  ('municipality.demo@straypaw.invalid', '10000000-0000-4000-8000-000000000003', '{"sub":"10000000-0000-4000-8000-000000000003","email":"municipality.demo@straypaw.invalid"}', 'email', now(), now())
on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();

insert into public.ngos (id, name, slug, area, city, state, verified, mission, about, contact_email, partner_status, partnered_at, demo_mode)
values ('20000000-0000-4000-8000-000000000001', 'DEMO · Coimbatore Street Animal Care', 'demo-coimbatore-care', 'Coimbatore', 'Coimbatore', 'Tamil Nadu', true, 'Fictional staging organisation for product demonstration only.', 'All people, programmes and records in this organisation are fictional staging data. They do not represent a real NGO, municipality, veterinary decision or outcome.', 'ngo.demo@straypaw.invalid', 'approved', now(), false)
on conflict (id) do update set name = excluded.name, city = excluded.city, state = excluded.state, about = excluded.about, demo_mode = false;

insert into public.ngo_members (user_id, ngo_id, role)
values ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'admin')
on conflict (user_id) do update set ngo_id = excluded.ngo_id, role = excluded.role;

insert into public.volunteers (id, name, ngo_id, is_demo)
values ('10000000-0000-4000-8000-000000000002', 'Asha · NGO demo', '20000000-0000-4000-8000-000000000001', false)
on conflict (id) do update set name = excluded.name, ngo_id = excluded.ngo_id, is_demo = false;

insert into public.org_email_invites (id, ngo_id, email, person_name, role, code, accepted_at, accepted_by, created_at)
values ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'ngo.demo@straypaw.invalid', 'Asha · NGO demo', 'lead', 'NGO626', now(), '10000000-0000-4000-8000-000000000002', now())
on conflict (ngo_id, lower(btrim(email))) do update set code = excluded.code, accepted_at = excluded.accepted_at, accepted_by = excluded.accepted_by, revoked_at = null;

insert into public.campaigns (id, ngo_id, name, kind, starts_on, ends_on, zone, notes, public_visibility, public_summary, published_at, archived_at, is_demo)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'DEMO · Ganapathy area ABC record', 'sterilisation', current_date - 45, current_date - 15, 'Ganapathy', 'Fictional staging record used to demonstrate programme presentation. Not a municipal programme and not independently verified.', 'public', 'Fictional staging programme record. Counts are demo records only and are not coverage or verified achievements.', now(), now(), false),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'DEMO · Peelamedu ARV follow-up', 'vaccination', current_date - 20, null, 'Peelamedu', 'Fictional staging record used to demonstrate follow-up workflow. Not municipal evidence.', 'public', 'Fictional staging programme record. No external verification is represented.', now(), now(), false)
on conflict (id) do update set name = excluded.name, public_summary = excluded.public_summary, archived_at = excluded.archived_at;

insert into public.dogs (id, ngo_id, campaign_id, name, code, straypaw_id, species, sex, zone, city, state, district, lat, lng, h3_r8, status, needs_help, size, color, sterilised, vaccinated, sterilisation_status, vaccination_status, ear_notch, provenance, source_metadata, identity_state, is_demo, created_at, updated_at, last_seen)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'DEMO · Malar', 'DEMO-CBE-001', 'SP-DEMO-CBE-001', 'dog', 'female', 'Ganapathy', 'Coimbatore', 'Tamil Nadu', 'Coimbatore', 11.0168, 76.9558, '8860338687fffff', 'injured', true, 'medium', 'Brown', false, false, 'unknown', 'unknown', null, 'staging_demo', '{"demo":true,"disclaimer":"Fictional staging record; not a real animal or outcome."}', 'confirmed', false, now() - interval '7 days', now(), now()),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'DEMO · Kaveri', 'DEMO-CBE-002', 'SP-DEMO-CBE-002', 'dog', 'female', 'Ganapathy', 'Coimbatore', 'Tamil Nadu', 'Coimbatore', 11.0250, 76.9680, '88603386a9fffff', 'sterilised', false, 'medium', 'Black and tan', true, true, 'sterilised', 'vaccinated', 'left', 'staging_demo', '{"demo":true,"disclaimer":"Fictional staging record; not a real animal or outcome."}', 'confirmed', false, now() - interval '35 days', now(), now() - interval '2 days'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'DEMO · Thendral', 'DEMO-CBE-003', 'SP-DEMO-CBE-003', 'dog', 'male', 'Peelamedu', 'Coimbatore', 'Tamil Nadu', 'Coimbatore', 11.0050, 76.9400, '8860338691fffff', 'vaccinated', false, 'large', 'White', false, true, 'unknown', 'vaccinated', null, 'staging_demo', '{"demo":true,"disclaimer":"Fictional staging record; not a real animal or outcome."}', 'confirmed', false, now() - interval '18 days', now(), now() - interval '1 day')
on conflict (id) do update set status = excluded.status, needs_help = excluded.needs_help, h3_r8 = excluded.h3_r8, city = excluded.city, source_metadata = excluded.source_metadata, is_demo = false;

insert into public.cases (id, dog_id, ngo_id, programme_id, title, description, zone, city, state, district, lat, lng, h3_r8, severity, category, status, condition_text, status_class, intake_channel, assignee_id, assignee_name, created_by_id, created_by_name, provenance, verification_state, source_metadata, is_demo, created_at, updated_at, last_activity_at, first_action_at)
values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, 'DEMO · community intake awaiting field assessment', 'Fictional staging intake used to demonstrate acceptance, assignment, treatment and follow-up. No real rescue or care outcome is claimed.', 'Ganapathy', 'Coimbatore', 'Tamil Nadu', 'Coimbatore', 11.0168, 76.9558, '8860338687fffff', 'high', 'injury', 'in_progress', 'Fictional demo: limping observed', 'in_progress', 'resident_report', '10000000-0000-4000-8000-000000000002', 'Asha · NGO demo', '10000000-0000-4000-8000-000000000002', 'Asha · NGO demo', 'staging_demo', 'demo_unverified', '{"demo":true,"disclaimer":"Fictional staging case; no veterinary or municipal verification."}', false, now() - interval '2 days', now(), now() - interval '1 day', now() - interval '1 day'),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'DEMO · programme follow-up record', 'Fictional staging record for map and history demonstration only.', 'Ganapathy', 'Coimbatore', 'Tamil Nadu', 'Coimbatore', 11.0250, 76.9680, '88603386a9fffff', 'normal', 'sterilisation', 'closed', 'Fictional demo: routine follow-up', 'closed', 'team_found', '10000000-0000-4000-8000-000000000002', 'Asha · NGO demo', '10000000-0000-4000-8000-000000000002', 'Asha · NGO demo', 'staging_demo', 'demo_unverified', '{"demo":true,"disclaimer":"Fictional staging case; no municipal verification evidence."}', false, now() - interval '20 days', now(), now() - interval '5 days', now() - interval '19 days')
on conflict (id) do update set status = excluded.status, status_class = excluded.status_class, verification_state = excluded.verification_state, source_metadata = excluded.source_metadata, is_demo = false;


insert into public.medical_events (id, dog_id, case_id, kind, event_date, notes, performed_by, created_by_id, source_metadata, is_demo, created_at)
values
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'DEMO · initial assessment', current_date - 1, 'Fictional staging treatment note. No clinical claim.', 'Asha · NGO demo', '10000000-0000-4000-8000-000000000002', '{"demo":true}', false, now() - interval '1 day'),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'DEMO · post-procedure observation', current_date - 8, 'Fictional staging note. No external verification.', 'Asha · NGO demo', '10000000-0000-4000-8000-000000000002', '{"demo":true}', false, now() - interval '8 days')
on conflict (id) do update set notes = excluded.notes, source_metadata = excluded.source_metadata, is_demo = false;

insert into public.animal_followups (id, ngo_id, dog_id, case_id, due_at, status, kind, note, created_by, source_metadata, created_at, updated_at)
values
  ('80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', now() + interval '3 days', 'upcoming', 'DEMO · field recheck', 'Fictional staging follow-up. No care outcome is represented.', '10000000-0000-4000-8000-000000000002', '{"demo":true}', now(), now()),
  ('80000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', now() - interval '6 days', 'done', 'DEMO · record review', 'Fictional staging follow-up, marked for demonstration only.', '10000000-0000-4000-8000-000000000002', '{"demo":true}', now() - interval '7 days', now())
on conflict (id) do update set status = excluded.status, note = excluded.note, source_metadata = excluded.source_metadata;
