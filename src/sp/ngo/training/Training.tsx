"use client";

/* Training. Everyone sees the courses assigned to them and works through the
   lessons; quizzes are scored by the database against a key learners never
   receive. Coordinators and admins build courses, assign them with a due
   date and follow each person's progress. Reads go through row-level
   security; every write is a database function that checks the role. */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, Empty, Head, Lanes, Note, Page, Panel, Section, Split, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../../shell/Shell";
import { Ack, day } from "../../ui";
import { NgoGate } from "../Gate";
import "../org.k.css";
import "./training.css";

type Course = { id: string; ngo_id: string | null; title: string; summary: string | null; audience: string | null; status: "draft" | "published" | "archived"; updated_at: string };
type Question = { q: string; options: string[] };
type Lesson = { id: string; course_id: string; position: number; title: string; kind: "reading" | "video" | "document" | "quiz"; body: string | null; media_url: string | null; questions: Question[] | null; pass_mark: number | null };
type Assignment = { id: string; course_id: string; due_on: string | null; created_at: string };
type Progress = { lesson_id: string; course_id: string; score: number | null; passed: boolean; completed_at: string };
type Member = { user_id: string; role: string; name: string };
type TeamRow = { assignment_id: string; user_id: string; name: string; role: string; due_on: string | null; lessons_done: number; lessons_total: number; quizzes_passed: number; quizzes_total: number; last_activity: string | null };
type Result = { ok: boolean; text: string } | null;

const KIND = { reading: "Reading", video: "Video", document: "Document", quiz: "Quiz" } as const;
const db = () => getSupabase();
const msg = (e: unknown, fallback: string) => (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string" ? (e as { message: string }).message : fallback);

export function Training() {
  const mem = useMembership();
  const supervisor = ["admin", "coordinator"].includes(mem.role ?? "");
  /* Leads and coordinators manage courses; everyone else sees what is assigned to them. */
  const [picked, setTab] = usePageState<"mine" | "manage" | null>("tab", null);
  const tab = supervisor ? picked ?? "manage" : "mine";
  const lanes = supervisor ? <Lanes label="Training views" value={tab} onChange={setTab} lanes={[{ id: "mine", label: "My training" }, { id: "manage", label: "Courses and team" }]} /> : null;
  return (
    <NgoGate title="Training" lede="Courses, assignments and completion records for your team.">
      <Page>
        <Head title="Team" sum="Courses for field work, veterinary care and reporting. Quizzes are scored when you submit them." />
        {tab === "mine" ? <Mine lanes={lanes} /> : <Manage lanes={lanes} />}
      </Page>
    </NgoGate>
  );
}

/* ── Learner ─────────────────────────────────────────────────────────── */
function useCourseData() {
  const { user } = useAuth();
  const [state, setState] = useState<{ courses: Course[]; lessons: Lesson[]; assignments: Assignment[]; progress: Progress[] } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const c = db(); if (!c || !user) return;
    const [courses, lessons, assignments, progress] = await Promise.all([
      c.from("training_courses").select("id,ngo_id,title,summary,audience,status,updated_at").eq("status", "published").order("title"),
      c.from("training_lessons").select("id,course_id,position,title,kind,body,media_url,questions,pass_mark").order("position"),
      c.from("training_assignments").select("id,course_id,due_on,created_at").eq("user_id", user.id),
      c.from("training_progress").select("lesson_id,course_id,score,passed,completed_at").eq("user_id", user.id),
    ]);
    const err = courses.error || lessons.error || assignments.error || progress.error;
    if (err) { setError("Training could not be read. If this workspace is new, training may not be switched on yet."); return; }
    setError("");
    setState({ courses: (courses.data ?? []) as Course[], lessons: (lessons.data ?? []) as Lesson[], assignments: (assignments.data ?? []) as Assignment[], progress: (progress.data ?? []) as Progress[] });
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  return { state, error, load };
}

function Mine({ lanes }: { lanes: ReactNode }) {
  const { state, error, load } = useCourseData();
  const [open, setOpen] = useState<string | null>(null);
  const tools = lanes ? <Tools>{lanes}</Tools> : null;
  if (error) return <>{tools}<Note tone="flame" action={<Btn small onClick={() => void load()}>Try again</Btn>}>{error}</Note></>;
  if (!state) return <>{tools}<div className="og-skel" aria-busy="true"><i /><i /><i /></div></>;
  const assigned = new Map(state.assignments.map((a) => [a.course_id, a]));
  const mine = state.courses.filter((c) => assigned.has(c.id));
  const other = state.courses.filter((c) => !assigned.has(c.id));
  const course = state.courses.find((c) => c.id === open);
  if (course) return <Player course={course} lessons={state.lessons.filter((l) => l.course_id === course.id)} progress={state.progress} onBack={() => setOpen(null)} onChange={load} />;
  const today = new Date().toISOString().slice(0, 10);
  const facts = (c: Course) => { const ls = state.lessons.filter((l) => l.course_id === c.id), done = state.progress.filter((p) => p.course_id === c.id).length, a = assigned.get(c.id); return { total: ls.length, done, due: a?.due_on ?? null, late: !!a?.due_on && done < ls.length && a.due_on < today }; };
  const cols: Col<Course>[] = [
    { key: "title", label: "Course", width: "minmax(0, 2fr)", render: (c) => <>{c.title}{c.summary ? <span className="og-tail">{c.summary}</span> : null}</> },
    { key: "from", label: "From", width: "minmax(0, 1fr)", render: (c) => `${c.ngo_id ? "Your organisation" : "StrayPaw"}${c.audience ? ` · ${c.audience}` : ""}` },
    { key: "done", label: "Lessons", width: "144px", keep: true, render: (c) => { const f = facts(c); return <span className="og-cell"><span className="og-bar" role="img" aria-label={`${f.done} of ${f.total} lessons done`}><i style={{ width: `${f.total ? (100 * f.done) / f.total : 0}%` }} /></span><span>{f.done}/{f.total}</span></span>; } },
    { key: "due", label: "Due", width: "144px", render: (c) => { const f = facts(c); return f.done === f.total && f.total > 0 ? <Tag tone="green">Complete</Tag> : f.due ? (f.late ? <Tag tone="flame">Overdue · {day(f.due)}</Tag> : `Due ${day(f.due)}`) : ""; } },
  ];
  return (
    <>
      {tools}
      <Section title="Assigned to you">
        <Panel><Table label="Assigned to you" cols={cols} rows={mine} rowKey={(c) => c.id} onRow={(c) => setOpen(c.id)} empty={<Empty title="Nothing is assigned to you yet">Your coordinator assigns courses here.</Empty>} /></Panel>
      </Section>
      {other.length > 0 && <Section title="Also available"><Panel><Table label="Also available" cols={cols} rows={other} rowKey={(c) => c.id} onRow={(c) => setOpen(c.id)} /></Panel></Section>}
    </>
  );
}

function youtubeId(url: string) {
  const m = url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function Player({ course, lessons, progress, onBack, onChange }: { course: Course; lessons: Lesson[]; progress: Progress[]; onBack: () => void; onChange: () => Promise<void> }) {
  const doneIds = new Set(progress.filter((p) => p.course_id === course.id).map((p) => p.lesson_id));
  const first = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];
  const [at, setAt] = useState(first?.id ?? null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const lesson = lessons.find((l) => l.id === at) ?? null;
  const idx = lessons.findIndex((l) => l.id === at);
  useEffect(() => { setAnswers({}); setResult(null); }, [at]);
  async function complete() {
    if (!lesson) return;
    const c = db(); if (!c) return;
    let payload: number[] | null = null;
    if (lesson.kind === "quiz") {
      const n = lesson.questions?.length ?? 0;
      if (Object.keys(answers).length < n) { setResult({ ok: false, text: "Answer every question first." }); return; }
      payload = Array.from({ length: n }, (_, i) => answers[i]);
    }
    setBusy(true);
    const r = await c.rpc("training_complete_lesson", { p_lesson: lesson.id, p_answers: payload });
    setBusy(false);
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Not saved. Try again.") }); return; }
    const d = r.data as { score: number | null; passed: boolean; correct: number | null; total: number | null; pass_mark: number | null };
    setResult(lesson.kind === "quiz"
      ? { ok: d.passed, text: d.passed ? `Passed: ${d.correct} of ${d.total} correct (${d.score}%).` : `${d.correct} of ${d.total} correct (${d.score}%). The pass mark is ${d.pass_mark}%. Read the lesson again and retry.` }
      : { ok: true, text: "Marked complete." });
    await onChange();
  }
  return (
    <Section title={course.title} action={<Btn small variant="quiet" onClick={onBack}>All courses</Btn>}>
      <Split side={
        <Panel>
          <ol className="k-rows" aria-label="Lessons">{lessons.map((l, i) => <li key={l.id}><button type="button" className="k-row" aria-current={l.id === at ? "step" : undefined} onClick={() => setAt(l.id)}><span className={`tr-dot${doneIds.has(l.id) ? " is-done" : ""}`} aria-hidden>{doneIds.has(l.id) ? "✓" : i + 1}</span><span className="k-row-t"><b>{l.title}</b><small>{KIND[l.kind]}</small></span></button></li>)}</ol>
        </Panel>}>
        {lesson ? <article className="tr-lesson">
          <p className="og-hint">Lesson {idx + 1} of {lessons.length} · {KIND[lesson.kind]}</p>
          <h2>{lesson.title}</h2>
          {lesson.body && <div className="tr-body">{lesson.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
          {lesson.kind === "video" && lesson.media_url && (youtubeId(lesson.media_url)
            ? <div className="tr-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(lesson.media_url)}`} title={lesson.title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
            : /\.(mp4|webm)(\?|$)/i.test(lesson.media_url) ? <video className="tr-video-el" controls preload="metadata" src={lesson.media_url} /> : <p><a className="k-btn is-plain" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the video</a></p>)}
          {lesson.kind === "document" && lesson.media_url && <p><a className="k-btn is-plain" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the document</a></p>}
          {lesson.kind === "quiz" && <ol className="tr-quiz">{(lesson.questions ?? []).map((q, qi) => (
            <li key={qi}><fieldset><legend>{q.q}</legend>{q.options.map((o, oi) => (
              <label key={oi} className={answers[qi] === oi ? "is-on" : ""}><input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))} />{o}</label>))}</fieldset></li>))}</ol>}
          <div className="og-go">
            <Btn variant="primary" disabled={busy} onClick={() => void complete()}>{busy ? "Saving…" : lesson.kind === "quiz" ? "Submit answers" : doneIds.has(lesson.id) ? "Mark complete again" : "Mark complete"}</Btn>
            {idx < lessons.length - 1 && <Btn onClick={() => setAt(lessons[idx + 1].id)}>Next lesson</Btn>}
            <span aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</span>
          </div>
        </article> : <Panel><Empty title="This course has no lessons yet" /></Panel>}
      </Split>
    </Section>
  );
}

/* ── Supervisor ──────────────────────────────────────────────────────── */
function Manage({ lanes }: { lanes: ReactNode }) {
  const mem = useMembership();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<string | "new" | null>(null);
  const load = useCallback(async () => {
    const c = db(); if (!c || !mem.org) return;
    const r = await c.from("training_courses").select("id,ngo_id,title,summary,audience,status,updated_at").or(`ngo_id.eq.${mem.org.id},ngo_id.is.null`).order("updated_at", { ascending: false });
    if (r.error) { setError("Courses could not be read."); return; }
    setError(""); setCourses((r.data ?? []) as Course[]);
  }, [mem.org]);
  useEffect(() => { void load(); }, [load]);
  if (edit) return <CourseEditor id={edit === "new" ? null : edit} course={courses?.find((c) => c.id === edit) ?? null} onClose={async () => { setEdit(null); await load(); }} />;
  const cols: Col<Course>[] = [
    { key: "title", label: "Course", width: "minmax(0, 2fr)", render: (c) => c.title },
    { key: "status", label: "Status", width: "104px", keep: true, render: (c) => <Tag tone={c.status === "published" ? "green" : c.status === "draft" ? "blue" : "plain"}>{c.status === "published" ? "Published" : c.status === "draft" ? "Draft" : "Archived"}</Tag> },
    { key: "from", label: "From", width: "minmax(0, 1fr)", render: (c) => (c.ngo_id ? "Your organisation" : "StrayPaw") },
    { key: "at", label: "Updated", width: "112px", render: (c) => day(c.updated_at) },
  ];
  return (
    <>
      <Tools end={<Btn variant="primary" onClick={() => setEdit("new")}>New course</Btn>}>{lanes}</Tools>
      {error ? <Note tone="flame">{error}</Note> : courses === null ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : (
        <Panel><Table label="Courses" cols={cols} rows={courses} rowKey={(c) => c.id} onRow={(c) => setEdit(c.id)}
          empty={<Empty title="No courses yet">Write a short course for field capture, release evidence or vet sign-off, then assign it to your team.</Empty>} /></Panel>
      )}
    </>
  );
}

const blankLesson = (): Lesson => ({ id: "", course_id: "", position: 0, title: "", kind: "reading", body: "", media_url: "", questions: null, pass_mark: 70 });

function CourseEditor({ id, course, onClose }: { id: string | null; course: Course | null; onClose: () => Promise<void> }) {
  const mem = useMembership();
  const own = !course || course.ngo_id === mem.org?.id;
  const [courseId, setCourseId] = useState<string | null>(id);
  const [title, setTitle] = useState(course?.title ?? "");
  const [summary, setSummary] = useState(course?.summary ?? "");
  const [audience, setAudience] = useState(course?.audience ?? "");
  const [status, setStatus] = useState<Course["status"]>(course?.status ?? "draft");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [draft, setDraft] = useState<Lesson | null>(null);
  const [keys, setKeys] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const loadLessons = useCallback(async () => {
    const c = db(); if (!c || !courseId) return;
    const r = await c.from("training_lessons").select("id,course_id,position,title,kind,body,media_url,questions,pass_mark").eq("course_id", courseId).order("position");
    if (!r.error) setLessons((r.data ?? []) as Lesson[]);
  }, [courseId]);
  useEffect(() => { void loadLessons(); }, [loadLessons]);

  async function saveCourse(nextStatus = status) {
    const c = db(); if (!c) return;
    if (title.trim().length < 3) { setResult({ ok: false, text: "Give the course a title." }); return; }
    setBusy(true);
    const r = await c.rpc("training_save_course", { p_id: courseId, p_title: title.trim(), p_summary: summary, p_audience: audience, p_status: nextStatus });
    setBusy(false);
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Not saved.") }); return; }
    setCourseId(r.data as string); setStatus(nextStatus);
    setResult({ ok: true, text: nextStatus === "published" ? "Published. You can assign it now." : "Saved." });
  }
  async function saveLesson() {
    const c = db(); if (!c || !courseId || !draft) return;
    if (draft.title.trim().length < 2) { setResult({ ok: false, text: "Give the lesson a title." }); return; }
    if ((draft.kind === "video" || draft.kind === "document") && !/^https:\/\//.test(draft.media_url ?? "")) { setResult({ ok: false, text: "Add a link that starts with https://" }); return; }
    const qs = draft.kind === "quiz" ? (draft.questions ?? []).map((q) => ({ q: q.q.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) })) : null;
    if (draft.kind === "quiz" && (!qs?.length || qs.some((q) => !q.q || q.options.length < 2))) { setResult({ ok: false, text: "Each question needs text and at least two options." }); return; }
    setBusy(true);
    const r = await c.rpc("training_save_lesson", { p_id: draft.id || null, p_course: courseId, p_position: draft.id ? draft.position : lessons.length, p_title: draft.title.trim(), p_kind: draft.kind, p_body: draft.body ?? "", p_media_url: draft.media_url ?? "", p_questions: qs, p_answers: draft.kind === "quiz" ? qs!.map((_, i) => keys[i] ?? 0) : null, p_pass_mark: draft.pass_mark ?? 70 });
    setBusy(false);
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Lesson not saved.") }); return; }
    setDraft(null); setResult({ ok: true, text: "Lesson saved." }); await loadLessons();
  }
  async function removeLesson(l: Lesson) {
    const c = db(); if (!c) return;
    const r = await c.rpc("training_delete_lesson", { p_id: l.id });
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Not removed.") }); return; }
    await loadLessons();
  }

  return (
    <>
      <Section title={courseId ? title || "Course" : "New course"} action={<Btn small variant="quiet" onClick={() => void onClose()}>All courses</Btn>}>
        {!own ? <Note>This is a StrayPaw course. You can assign it to your team below; only StrayPaw edits it.</Note> : (
          <Panel pad>
            <div className="og-form" aria-label="Course">
              <label className="og-f"><span className="og-l">Title</span><input className="og-in" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Recording a release with evidence" /></label>
              <label className="og-f"><span className="og-l">Who it is for</span><input className="og-in" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={80} placeholder="Field staff" /></label>
              <label className="og-f"><span className="og-l">Summary</span><textarea className="og-in" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} rows={2} placeholder="What someone can do after this course." /></label>
              <div className="og-go">
                <Btn disabled={busy} onClick={() => void saveCourse(status === "published" ? "published" : "draft")}>{courseId ? "Save" : "Create course"}</Btn>
                {courseId && status !== "published" && <Btn variant="primary" disabled={busy || !lessons.length} onClick={() => void saveCourse("published")}>Publish</Btn>}
                {courseId && status === "published" && <Btn variant="quiet" disabled={busy} onClick={() => void saveCourse("archived")}>Archive</Btn>}
                <span aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</span>
              </div>
            </div>
          </Panel>
        )}
      </Section>
      {courseId && own && (
        <Section title="Lessons" count={lessons.length} action={!draft ? <Btn small onClick={() => { setDraft(blankLesson()); setKeys([]); }}>Add lesson</Btn> : undefined}>
          <Panel>
            {lessons.length ? <ol className="k-rows">{lessons.map((l) => <li key={l.id}><div className="k-row"><span className="k-row-t"><b>{l.title}</b><small>{KIND[l.kind]}{l.kind === "quiz" ? ` · ${l.questions?.length ?? 0} ${(l.questions?.length ?? 0) === 1 ? "question" : "questions"} · pass ${l.pass_mark}%` : ""}</small></span>
              <span className="k-row-e"><Btn small onClick={() => { setDraft({ ...l, body: l.body ?? "", media_url: l.media_url ?? "" }); setKeys([]); }}>Edit</Btn><Btn small variant="quiet" onClick={() => void removeLesson(l)}>Remove</Btn></span></div></li>)}</ol>
              : <Empty title="No lessons yet">Add the first lesson: a short reading, a video link, a document or a quiz.</Empty>}
          </Panel>
          {draft && <LessonForm lesson={draft} keys={keys} onChange={setDraft} onKeys={setKeys} onSave={() => void saveLesson()} onCancel={() => setDraft(null)} busy={busy} editingQuiz={!!draft.id && draft.kind === "quiz"} />}
        </Section>
      )}
      {courseId && status === "published" && <Assign courseId={courseId} />}
    </>
  );
}

function LessonForm({ lesson, keys, onChange, onKeys, onSave, onCancel, busy, editingQuiz }: { lesson: Lesson; keys: number[]; onChange: (l: Lesson) => void; onKeys: (k: number[]) => void; onSave: () => void; onCancel: () => void; busy: boolean; editingQuiz: boolean }) {
  const qs = lesson.questions ?? [];
  const setQ = (i: number, q: Question) => onChange({ ...lesson, questions: qs.map((x, j) => (j === i ? q : x)) });
  return (
    <div className="og-form tr-draft" aria-label="Lesson">
      <label className="og-f"><span className="og-l">Lesson title</span><input className="og-in" value={lesson.title} onChange={(e) => onChange({ ...lesson, title: e.target.value })} maxLength={120} /></label>
      <label className="og-f"><span className="og-l">Type</span><select className="og-in" value={lesson.kind} onChange={(e) => onChange({ ...lesson, kind: e.target.value as Lesson["kind"], questions: e.target.value === "quiz" ? (qs.length ? qs : [{ q: "", options: ["", ""] }]) : null })}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      {(lesson.kind === "video" || lesson.kind === "document") && <label className="og-f"><span className="og-l">{lesson.kind === "video" ? "Video link (YouTube or an .mp4 file)" : "Document link (PDF, Drive or Docs)"}</span><input className="og-in" value={lesson.media_url ?? ""} onChange={(e) => onChange({ ...lesson, media_url: e.target.value })} placeholder="https://" maxLength={600} /></label>}
      <label className="og-f"><span className="og-l">{lesson.kind === "quiz" ? "Instructions (optional)" : "Text"}</span><textarea className="og-in" rows={lesson.kind === "reading" ? 6 : 3} value={lesson.body ?? ""} onChange={(e) => onChange({ ...lesson, body: e.target.value })} maxLength={20000} placeholder="Leave a blank line between paragraphs." /></label>
      {lesson.kind === "quiz" && (
        <>
          {editingQuiz && <p className="og-hint">For safety, saved answers are not shown. Choose the correct option for each question again before saving.</p>}
          {qs.map((q, i) => (
            <fieldset key={i} className="og-f tr-q"><legend>Question {i + 1}</legend>
              <input className="og-in" value={q.q} onChange={(e) => setQ(i, { ...q, q: e.target.value })} placeholder="Question" aria-label={`Question ${i + 1}`} maxLength={300} />
              {q.options.map((o, oi) => (
                <div key={oi} className="tr-opt">
                  <input type="radio" name={`key${i}`} aria-label={`Option ${oi + 1} is correct`} checked={(keys[i] ?? -1) === oi} onChange={() => { const k = [...keys]; k[i] = oi; onKeys(k); }} />
                  <input className="og-in" value={o} onChange={(e) => setQ(i, { ...q, options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} aria-label={`Option ${oi + 1}`} maxLength={200} />
                </div>))}
              <div className="og-go">{q.options.length < 6 && <Btn small variant="quiet" onClick={() => setQ(i, { ...q, options: [...q.options, ""] })}>Add option</Btn>}
                {qs.length > 1 && <Btn small variant="quiet" onClick={() => { onChange({ ...lesson, questions: qs.filter((_, j) => j !== i) }); onKeys(keys.filter((_, j) => j !== i)); }}>Remove question</Btn>}</div>
            </fieldset>))}
          <div className="og-go">{qs.length < 30 && <Btn small onClick={() => onChange({ ...lesson, questions: [...qs, { q: "", options: ["", ""] }] })}>Add question</Btn>}
            <label className="og-go"><span className="og-l">Pass mark %</span><input className="og-in is-s tr-pass" type="number" min={0} max={100} value={lesson.pass_mark ?? 70} onChange={(e) => onChange({ ...lesson, pass_mark: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></label></div>
        </>
      )}
      <div className="og-go"><Btn disabled={busy || (lesson.kind === "quiz" && qs.some((_, i) => keys[i] === undefined))} onClick={onSave}>Save lesson</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function Assign({ courseId }: { courseId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [team, setTeam] = useState<TeamRow[] | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [due, setDue] = useState("");
  const [result, setResult] = useState<Result>(null);
  const load = useCallback(async () => {
    const c = db(); if (!c) return;
    const [m, t] = await Promise.all([c.rpc("my_org_members"), c.rpc("training_team_progress", { p_course: courseId })]);
    if (!m.error) setMembers((m.data ?? []) as Member[]);
    setTeam(t.error ? [] : ((t.data ?? []) as TeamRow[]));
  }, [courseId]);
  useEffect(() => { void load(); }, [load]);
  const assigned = useMemo(() => new Set((team ?? []).map((t) => t.user_id)), [team]);
  async function assign() {
    const c = db(); if (!c || !pick.size) return;
    const r = await c.rpc("training_assign", { p_course: courseId, p_users: [...pick], p_due: due || null });
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Not assigned.") }); return; }
    const n = pick.size; await load(); setPick(new Set());
    setResult({ ok: true, text: `Assigned to ${n} ${n === 1 ? "person" : "people"}.` });
  }
  async function unassign(id: string) {
    const c = db(); if (!c) return;
    const r = await c.rpc("training_unassign", { p_assignment: id });
    if (r.error) { setResult({ ok: false, text: msg(r.error, "Not removed.") }); return; }
    await load();
  }
  const today = new Date().toISOString().slice(0, 10);
  const cols: Col<TeamRow>[] = [
    { key: "who", label: "Person", width: "minmax(0, 1.4fr)", render: (t) => <>{t.name}<span className="og-tail">{t.role}</span></> },
    { key: "lessons", label: "Lessons", width: "128px", keep: true, render: (t) => <span className="og-cell"><span className="og-bar" aria-hidden><i style={{ width: `${t.lessons_total ? (100 * t.lessons_done) / t.lessons_total : 0}%` }} /></span><span>{t.lessons_done}/{t.lessons_total}</span></span> },
    { key: "quiz", label: "Quizzes passed", width: "112px", render: (t) => (t.quizzes_total ? `${t.quizzes_passed}/${t.quizzes_total}` : "No quiz") },
    { key: "due", label: "Due", width: "136px", render: (t) => { const done = t.lessons_total > 0 && t.lessons_done >= t.lessons_total, late = !done && t.due_on && t.due_on < today; return t.due_on ? (late ? <Tag tone="flame">Overdue · {day(t.due_on)}</Tag> : day(t.due_on)) : "No date"; } },
    { key: "last", label: "Last activity", width: "112px", render: (t) => (t.last_activity ? day(t.last_activity) : "Not started") },
    { key: "acts", label: "", width: "auto", align: "end", render: (t) => <Btn small variant="quiet" onClick={() => void unassign(t.assignment_id)}>Remove</Btn> },
  ];
  const free = members.filter((m) => !assigned.has(m.user_id));
  return (
    <Section title="Assign and follow progress">
      <div className="og-form tr-assign">
        <fieldset className="og-f"><legend>Team members</legend>
          <div className="tr-pick">{free.map((m) => <label key={m.user_id} className="og-check"><input type="checkbox" checked={pick.has(m.user_id)} onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(m.user_id); else n.delete(m.user_id); setPick(n); }} />{m.name} <small>{m.role}</small></label>)}</div>
          {members.length > 0 && members.every((m) => assigned.has(m.user_id)) && <p className="og-hint">Everyone on the team has this course.</p>}
        </fieldset>
        <div className="og-go"><label className="og-go"><span className="og-l">Due date (optional)</span><input className="og-in og-date" type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} /></label><Btn disabled={!pick.size} onClick={() => void assign()}>Assign</Btn><span aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</span></div>
      </div>
      {team === null ? <div className="og-skel" aria-busy="true"><i /><i /></div> : (
        <Panel><Table label="Team progress" cols={cols} rows={team} rowKey={(t) => t.assignment_id} empty={<Empty title="Nobody is assigned yet" />} /></Panel>
      )}
    </Section>
  );
}
