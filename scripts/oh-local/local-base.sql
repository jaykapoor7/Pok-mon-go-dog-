-- Local-only base for the One Health demo: Supabase stand-ins, the sample
-- organisations and a small illustrative dog register, and local demo
-- accounts. Never applied to staging or production.
\i supabase/tests/one_health/stubs.sql
ALTER TABLE public.ngos ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS sterilisation_status text, ADD COLUMN IF NOT EXISTS code text, ADD COLUMN IF NOT EXISTS species text DEFAULT 'dog';
GRANT SELECT ON public.ngos, public.dogs TO authenticated;
CREATE SCHEMA local_demo;
CREATE TABLE local_demo.accounts (id uuid PRIMARY KEY, email text UNIQUE, name text);
INSERT INTO public.ngos (id, name, city) VALUES
 ('d0000000-0000-4000-8000-0000000000a0', 'Sample · Bengaluru Animal Care Trust', 'Bengaluru'),
 ('d0000000-0000-4000-8000-0000000000a1', 'Sample · Mass Vaccination Partner', 'Bengaluru');
-- Illustrative register: 3–9 dogs per locality, about 60% vaccinated.
INSERT INTO public.dogs (ngo_id, name, zone, code, vaccination_status, sterilisation_status)
SELECT CASE WHEN w.n <= 5 THEN 'd0000000-0000-4000-8000-0000000000a0'::uuid ELSE 'd0000000-0000-4000-8000-0000000000a1'::uuid END,
       'Dog ' || w.n || '-' || g, w.ward, 'BLR-' || lpad((w.n * 100 + g)::text, 4, '0'),
       CASE WHEN (w.n * 7 + g * 3) % 10 < 6 THEN 'vaccinated' WHEN (w.n + g) % 5 = 0 THEN NULL ELSE 'not_vaccinated' END,
       CASE WHEN (w.n + g) % 3 = 0 THEN 'sterilised' ELSE 'not_sterilised' END
  FROM (VALUES (1,'Jayanagar'),(2,'BTM Layout'),(3,'HSR Layout'),(4,'Koramangala'),(5,'Banashankari'),(6,'Indiranagar'),(7,'Whitefield'),(8,'Malleshwaram'),(9,'Rajajinagar'),(10,'Yelahanka')) AS w(n, ward),
       generate_series(1, 9) g
 WHERE g <= 3 + (w.n * 5) % 7;
-- Local demo accounts (password set in scripts/oh-local/server.mjs).
INSERT INTO local_demo.accounts (id, email, name) VALUES
 ('e0000000-0000-4000-8000-000000000001', 'demo-oh-programme@straypaw.invalid', 'Dr. Meera Iyer'),
 ('e0000000-0000-4000-8000-000000000002', 'demo-oh-municipal@straypaw.invalid', 'Dr. Prakash Gowda'),
 ('e0000000-0000-4000-8000-000000000003', 'demo-oh-clinician@straypaw.invalid', 'Dr. Arjun Rao'),
 ('e0000000-0000-4000-8000-000000000004', 'demo-oh-nurse@straypaw.invalid', 'Sister Kavya N.'),
 ('e0000000-0000-4000-8000-000000000005', 'demo-oh-phc@straypaw.invalid', 'Dr. Farah Khan'),
 ('e0000000-0000-4000-8000-000000000006', 'demo-oh-lab@straypaw.invalid', 'Dr. Suma Hegde'),
 ('e0000000-0000-4000-8000-000000000007', 'demo-oh-field@straypaw.invalid', 'Ravi Kumar'),
 ('e0000000-0000-4000-8000-000000000008', 'demo-oh-ngo@straypaw.invalid', 'Anita D''Souza'),
 ('e0000000-0000-4000-8000-000000000009', 'demo-oh-analyst@straypaw.invalid', 'Dr. Nikhil Bhat');
INSERT INTO auth.users (id) SELECT id FROM local_demo.accounts;
INSERT INTO public.ngo_members (user_id, ngo_id, role) VALUES
 ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-0000000000a0', 'member'),
 ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-0000000000a0', 'coordinator');
