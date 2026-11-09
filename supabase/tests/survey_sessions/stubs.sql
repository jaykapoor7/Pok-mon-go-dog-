-- Survey tables as they exist (supabase/surveys.sql), on top of the AnimalID test stubs.
CREATE TABLE public.surveys (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ngo_id uuid, title text NOT NULL, species text NOT NULL DEFAULT 'dog', status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.survey_areas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE, name text NOT NULL, status text NOT NULL DEFAULT 'pending');
CREATE TABLE public.survey_responses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE, area_id uuid REFERENCES public.survey_areas(id) ON DELETE SET NULL,
  lat double precision, lng double precision, photo_url text, species text, count int NOT NULL DEFAULT 1, attributes jsonb NOT NULL DEFAULT '{}', notes text, recorded_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.survey_responses, public.surveys TO authenticated;
CREATE POLICY r ON public.survey_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.ngo_id = public.my_ngo()));
INSERT INTO public.survey_responses (survey_id, count) SELECT gen_random_uuid(), 1 WHERE false;
