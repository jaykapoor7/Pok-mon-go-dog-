-- Staging only: demonstration sign-ins for the One Health demo.
-- Run with psql:  psql "$STAGING_URL" -v pw="$DEMO_ONEHEALTH_PASSWORD" -f staging/one-health-accounts.sql
-- The password is never stored in the repository. Emails use the reserved
-- .invalid domain, so no message can ever be delivered to them.
-- NGO staff (…07 field, …08 coordinator) join the sample Bengaluru NGO so that
-- their One Health work arrives through their existing NGO membership.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
SELECT '00000000-0000-0000-0000-000000000000', id::uuid, 'authenticated', 'authenticated', email, extensions.crypt(:'pw', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', name, 'demo', true), now(), now(), '', '', '', ''
  FROM (VALUES
    ('e0000000-0000-4000-8000-000000000001', 'demo-oh-programme@straypaw.invalid', 'Dr. Meera Iyer'),
    ('e0000000-0000-4000-8000-000000000002', 'demo-oh-municipal@straypaw.invalid', 'Dr. Prakash Gowda'),
    ('e0000000-0000-4000-8000-000000000003', 'demo-oh-clinician@straypaw.invalid', 'Dr. Arjun Rao'),
    ('e0000000-0000-4000-8000-000000000004', 'demo-oh-nurse@straypaw.invalid', 'Sister Lakshmi N.'),
    ('e0000000-0000-4000-8000-000000000005', 'demo-oh-phc@straypaw.invalid', 'Dr. Nandini S.'),
    ('e0000000-0000-4000-8000-000000000006', 'demo-oh-lab@straypaw.invalid', 'Dr. Suma Hegde'),
    ('e0000000-0000-4000-8000-000000000007', 'demo-oh-field@straypaw.invalid', 'Ravi Kumar'),
    ('e0000000-0000-4000-8000-000000000008', 'demo-oh-ngo@straypaw.invalid', 'Farah Sheikh'),
    ('e0000000-0000-4000-8000-000000000009', 'demo-oh-analyst@straypaw.invalid', 'Ananya Bhat'),
    ('e0000000-0000-4000-8000-000000000010', 'demo-oh-state@straypaw.invalid', 'Dr. Kavitha Rao'),
    ('e0000000-0000-4000-8000-000000000011', 'demo-oh-coimbatore@straypaw.invalid', 'Dr. Senthil K.')
  ) v(id, email, name)
ON CONFLICT (id) DO UPDATE SET encrypted_password = excluded.encrypted_password, raw_user_meta_data = excluded.raw_user_meta_data;
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
SELECT gen_random_uuid(), u.id, u.id::text, 'email', jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
  FROM auth.users u WHERE u.id::text LIKE 'e0000000-0000-4000-8000-0000000000%'
ON CONFLICT (provider_id, provider) DO NOTHING;
INSERT INTO public.ngo_members (ngo_id, user_id, role) VALUES
  ('d0000000-0000-4000-8000-0000000000a0', 'e0000000-0000-4000-8000-000000000007', 'member'),
  ('d0000000-0000-4000-8000-0000000000a0', 'e0000000-0000-4000-8000-000000000008', 'coordinator')
ON CONFLICT DO NOTHING;
