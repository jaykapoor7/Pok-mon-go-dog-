-- Training: courses, lessons, quizzes, assignments and completion records.
-- Organisations build their own courses; StrayPaw publishes shared ones
-- (ngo_id IS NULL). Quiz answer keys live apart from lessons and are never
-- readable by learners; scores are computed in the database. Supervisors
-- (admin, coordinator) build, assign and see team progress. Additive only.

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid REFERENCES public.ngos(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 120),
  summary text CHECK (summary IS NULL OR length(summary) <= 600),
  audience text CHECK (audience IS NULL OR length(audience) <= 80),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_courses_ngo ON public.training_courses (ngo_id, status);

CREATE TABLE IF NOT EXISTS public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 500),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 120),
  kind text NOT NULL CHECK (kind IN ('reading','video','document','quiz')),
  body text CHECK (body IS NULL OR length(body) <= 20000),
  media_url text CHECK (media_url IS NULL OR (media_url ~ '^https://' AND length(media_url) <= 600)),
  questions jsonb CHECK (questions IS NULL OR jsonb_typeof(questions) = 'array'),
  pass_mark integer CHECK (pass_mark IS NULL OR pass_mark BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'quiz' OR (questions IS NOT NULL AND jsonb_array_length(questions) BETWEEN 1 AND 30)),
  CHECK (kind NOT IN ('video','document') OR media_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS training_lessons_course ON public.training_lessons (course_id, position);

-- Answer keys: one correct option index per question. Never granted to learners.
CREATE TABLE IF NOT EXISTS public.training_quiz_keys (
  lesson_id uuid PRIMARY KEY REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  answers integer[] NOT NULL
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  due_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS training_assignments_user ON public.training_assignments (user_id);
CREATE INDEX IF NOT EXISTS training_assignments_ngo ON public.training_assignments (ngo_id, course_id);

CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  ngo_id uuid REFERENCES public.ngos(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  score integer CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  passed boolean NOT NULL DEFAULT true,
  attempts integer NOT NULL DEFAULT 1,
  UNIQUE (lesson_id, user_id)
);
CREATE INDEX IF NOT EXISTS training_progress_user ON public.training_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS training_progress_ngo ON public.training_progress (ngo_id, course_id);

-- Helpers
CREATE OR REPLACE FUNCTION public.training_is_supervisor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ngo_members m WHERE m.user_id = auth.uid() AND m.ngo_id = public.my_ngo() AND m.role IN ('admin','coordinator'));
$$;
REVOKE ALL ON FUNCTION public.training_is_supervisor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.training_is_supervisor() TO authenticated;

CREATE OR REPLACE FUNCTION public.training_course_visible(p_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.training_courses c WHERE c.id = p_course AND (
    (c.ngo_id IS NULL AND c.status = 'published')
    OR (c.ngo_id = public.my_ngo() AND (c.status = 'published' OR public.training_is_supervisor()))));
$$;
REVOKE ALL ON FUNCTION public.training_course_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.training_course_visible(uuid) TO authenticated;

-- Row-level security: reads only; every write goes through the functions below.
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_courses, public.training_lessons, public.training_quiz_keys, public.training_assignments, public.training_progress FROM anon, authenticated;
GRANT SELECT ON public.training_courses, public.training_lessons, public.training_assignments, public.training_progress TO authenticated;
CREATE POLICY training_courses_read ON public.training_courses FOR SELECT TO authenticated USING (public.training_course_visible(id));
CREATE POLICY training_lessons_read ON public.training_lessons FOR SELECT TO authenticated USING (public.training_course_visible(course_id));
CREATE POLICY training_assignments_read ON public.training_assignments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (ngo_id = (SELECT public.my_ngo()) AND (SELECT public.training_is_supervisor())));
CREATE POLICY training_progress_read ON public.training_progress FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (ngo_id = (SELECT public.my_ngo()) AND (SELECT public.training_is_supervisor())));

-- Create or update a course (supervisors, own organisation only).
CREATE OR REPLACE FUNCTION public.training_save_course(p_id uuid, p_title text, p_summary text, p_audience text, p_status text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); rid uuid;
BEGIN
  IF uid IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin builds courses' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('draft','published','archived') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.training_courses (ngo_id, title, summary, audience, status, created_by)
    VALUES (org, btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''), nullif(btrim(coalesce(p_audience, '')), ''), p_status, uid) RETURNING id INTO rid;
  ELSE
    UPDATE public.training_courses SET title = btrim(p_title), summary = nullif(btrim(coalesce(p_summary, '')), ''), audience = nullif(btrim(coalesce(p_audience, '')), ''), status = p_status, updated_at = now()
    WHERE id = p_id AND ngo_id = org RETURNING id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Course not found in your organisation' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF p_status = 'published' AND NOT EXISTS (SELECT 1 FROM public.training_lessons WHERE course_id = rid) THEN
    RAISE EXCEPTION 'Add at least one lesson before publishing';
  END IF;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, uid, 'training_course', rid, CASE WHEN p_id IS NULL THEN 'course_created' ELSE 'course_updated' END, jsonb_build_object('title', btrim(p_title), 'status', p_status));
  RETURN rid;
END $$;

-- Create or update a lesson. Quiz questions: [{"q": "...", "options": ["a","b",...]}]; answers: correct option index per question.
CREATE OR REPLACE FUNCTION public.training_save_lesson(p_id uuid, p_course uuid, p_position integer, p_title text, p_kind text, p_body text, p_media_url text, p_questions jsonb, p_answers integer[], p_pass_mark integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); rid uuid; n integer; i integer; opts integer;
BEGIN
  IF uid IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin builds courses' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.training_courses WHERE id = p_course AND ngo_id = org) THEN RAISE EXCEPTION 'Course not found in your organisation' USING ERRCODE = 'P0002'; END IF;
  IF p_kind = 'quiz' THEN
    n := coalesce(jsonb_array_length(p_questions), 0);
    IF n = 0 OR p_answers IS NULL OR cardinality(p_answers) <> n THEN RAISE EXCEPTION 'Each question needs one correct answer'; END IF;
    FOR i IN 0 .. n - 1 LOOP
      IF nullif(btrim(p_questions -> i ->> 'q'), '') IS NULL OR jsonb_typeof(p_questions -> i -> 'options') <> 'array' THEN RAISE EXCEPTION 'Question % needs text and options', i + 1; END IF;
      opts := jsonb_array_length(p_questions -> i -> 'options');
      IF opts NOT BETWEEN 2 AND 6 THEN RAISE EXCEPTION 'Question % needs 2 to 6 options', i + 1; END IF;
      IF p_answers[i + 1] IS NULL OR p_answers[i + 1] NOT BETWEEN 0 AND opts - 1 THEN RAISE EXCEPTION 'Question % has no valid correct answer', i + 1; END IF;
    END LOOP;
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.training_lessons (course_id, position, title, kind, body, media_url, questions, pass_mark)
    VALUES (p_course, coalesce(p_position, 0), btrim(p_title), p_kind, nullif(p_body, ''), nullif(btrim(coalesce(p_media_url, '')), ''), CASE WHEN p_kind = 'quiz' THEN p_questions END, CASE WHEN p_kind = 'quiz' THEN coalesce(p_pass_mark, 70) END)
    RETURNING id INTO rid;
  ELSE
    UPDATE public.training_lessons SET position = coalesce(p_position, position), title = btrim(p_title), kind = p_kind, body = nullif(p_body, ''), media_url = nullif(btrim(coalesce(p_media_url, '')), ''),
      questions = CASE WHEN p_kind = 'quiz' THEN p_questions END, pass_mark = CASE WHEN p_kind = 'quiz' THEN coalesce(p_pass_mark, 70) END
    WHERE id = p_id AND course_id = p_course RETURNING id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF p_kind = 'quiz' THEN
    INSERT INTO public.training_quiz_keys (lesson_id, answers) VALUES (rid, p_answers) ON CONFLICT (lesson_id) DO UPDATE SET answers = excluded.answers;
  ELSE
    DELETE FROM public.training_quiz_keys WHERE lesson_id = rid;
  END IF;
  UPDATE public.training_courses SET updated_at = now() WHERE id = p_course;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.training_delete_lesson(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo(); c uuid;
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin builds courses' USING ERRCODE = '42501'; END IF;
  SELECT l.course_id INTO c FROM public.training_lessons l JOIN public.training_courses k ON k.id = l.course_id WHERE l.id = p_id AND k.ngo_id = org;
  IF c IS NULL THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.training_progress WHERE lesson_id = p_id) THEN RAISE EXCEPTION 'People have completed this lesson; archive the course instead of deleting it'; END IF;
  DELETE FROM public.training_lessons WHERE id = p_id;
END $$;

-- Assign a course to members of the caller's organisation (idempotent; updates the due date).
CREATE OR REPLACE FUNCTION public.training_assign(p_course uuid, p_users uuid[], p_due date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); n integer;
BEGIN
  IF uid IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin assigns training' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.training_courses c WHERE c.id = p_course AND c.status = 'published' AND (c.ngo_id = org OR c.ngo_id IS NULL)) THEN RAISE EXCEPTION 'Publish the course before assigning it'; END IF;
  IF p_due IS NOT NULL AND p_due < current_date THEN RAISE EXCEPTION 'Choose today or a later due date'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_users) u WHERE NOT EXISTS (SELECT 1 FROM public.ngo_members m WHERE m.user_id = u AND m.ngo_id = org)) THEN RAISE EXCEPTION 'Assign only members of your organisation' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.training_assignments (course_id, ngo_id, user_id, assigned_by, due_on)
  SELECT p_course, org, u, uid, p_due FROM unnest(p_users) u
  ON CONFLICT (course_id, user_id) DO UPDATE SET due_on = excluded.due_on;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, uid, 'training_course', p_course, 'course_assigned', jsonb_build_object('people', cardinality(p_users), 'due_on', p_due));
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.training_unassign(p_assignment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo();
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin assigns training' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.training_assignments WHERE id = p_assignment AND ngo_id = org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'P0002'; END IF;
END $$;

-- Complete a lesson. Quizzes are scored here against the hidden key.
CREATE OR REPLACE FUNCTION public.training_complete_lesson(p_lesson uuid, p_answers integer[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); l public.training_lessons; k integer[]; right_n integer := 0; total integer; sc integer; ok boolean := true; i integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM public.training_lessons WHERE id = p_lesson;
  IF NOT FOUND OR NOT public.training_course_visible(l.course_id) THEN RAISE EXCEPTION 'Lesson not found' USING ERRCODE = 'P0002'; END IF;
  IF l.kind = 'quiz' THEN
    SELECT answers INTO k FROM public.training_quiz_keys WHERE lesson_id = p_lesson;
    total := cardinality(k);
    IF p_answers IS NULL OR cardinality(p_answers) <> total THEN RAISE EXCEPTION 'Answer every question'; END IF;
    FOR i IN 1 .. total LOOP IF p_answers[i] = k[i] THEN right_n := right_n + 1; END IF; END LOOP;
    sc := round(100.0 * right_n / total); ok := sc >= coalesce(l.pass_mark, 70);
  END IF;
  INSERT INTO public.training_progress (lesson_id, course_id, user_id, ngo_id, score, passed)
  VALUES (p_lesson, l.course_id, uid, public.my_ngo(), sc, ok)
  ON CONFLICT (lesson_id, user_id) DO UPDATE SET completed_at = now(), attempts = public.training_progress.attempts + 1,
    score = CASE WHEN excluded.score IS NULL THEN public.training_progress.score ELSE GREATEST(coalesce(public.training_progress.score, 0), excluded.score) END,
    passed = public.training_progress.passed OR excluded.passed;
  RETURN jsonb_build_object('lesson_id', p_lesson, 'score', sc, 'passed', ok, 'correct', CASE WHEN l.kind = 'quiz' THEN right_n END, 'total', total, 'pass_mark', l.pass_mark);
END $$;

-- Supervisor view: each assigned person's progress on one course.
CREATE OR REPLACE FUNCTION public.training_team_progress(p_course uuid)
RETURNS TABLE(assignment_id uuid, user_id uuid, name text, role text, due_on date, lessons_done integer, lessons_total integer, quizzes_passed integer, quizzes_total integer, last_activity timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo();
BEGIN
  IF auth.uid() IS NULL OR org IS NULL OR NOT public.training_is_supervisor() THEN RAISE EXCEPTION 'A coordinator or admin sees team progress' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, coalesce(v.name, 'Member'), coalesce(m.role, 'member'), a.due_on,
    (SELECT count(*)::int FROM public.training_progress p WHERE p.user_id = a.user_id AND p.course_id = p_course),
    (SELECT count(*)::int FROM public.training_lessons l WHERE l.course_id = p_course),
    (SELECT count(*)::int FROM public.training_progress p JOIN public.training_lessons l ON l.id = p.lesson_id WHERE p.user_id = a.user_id AND p.course_id = p_course AND l.kind = 'quiz' AND p.passed),
    (SELECT count(*)::int FROM public.training_lessons l WHERE l.course_id = p_course AND l.kind = 'quiz'),
    (SELECT max(p.completed_at) FROM public.training_progress p WHERE p.user_id = a.user_id AND p.course_id = p_course)
  FROM public.training_assignments a
  LEFT JOIN public.ngo_members m ON m.user_id = a.user_id AND m.ngo_id = org
  LEFT JOIN public.volunteers v ON v.id = a.user_id
  WHERE a.course_id = p_course AND a.ngo_id = org
  ORDER BY coalesce(v.name, 'Member');
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.training_save_course(uuid,text,text,text,text)',
    'public.training_save_lesson(uuid,uuid,integer,text,text,text,text,jsonb,integer[],integer)',
    'public.training_delete_lesson(uuid)',
    'public.training_assign(uuid,uuid[],date)',
    'public.training_unassign(uuid)',
    'public.training_complete_lesson(uuid,integer[])',
    'public.training_team_progress(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
