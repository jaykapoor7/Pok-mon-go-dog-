-- Minimal stand-ins for the Supabase objects the AnimalID migration uses.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA public, auth, extensions, storage TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE public.ngos (id uuid PRIMARY KEY, name text);
CREATE TABLE public.dogs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ngo_id uuid REFERENCES public.ngos(id), name text, straypaw_id text, code text, zone text, cover_photo text, created_at timestamptz DEFAULT now());
CREATE TABLE public.ngo_members (user_id uuid, ngo_id uuid, role text);
CREATE FUNCTION public.my_ngo() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT ngo_id FROM public.ngo_members WHERE user_id = auth.uid() LIMIT 1 $$;
CREATE TABLE public.operational_audit_log (id bigserial PRIMARY KEY, ngo_id uuid, actor_id uuid, entity_type text, entity_id uuid, action text, before_data jsonb, after_data jsonb);
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
GRANT SELECT ON public.dogs, public.ngos TO authenticated;
