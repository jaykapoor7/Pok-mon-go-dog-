"use client";

/* Training. Everyone sees the courses assigned to them and works through the
   lessons; quizzes are scored by the database against a key learners never
   receive. Coordinators and admins build courses, assign them with a due
   date and follow each person's progress. Reads go through row-level
   security; every write is a database function that checks the role. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMembership } from "../../shell/Shell";
import { Ack, day } from "../../ui";
import { NgoGate } from "../Gate";
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
  const [tab, setTab] = useState<"mine" | "manage">("mine");
  const [picked, setPicked] = useState(false);
  useEffect(() => { if (!picked && supervisor) setTab("manage"); }, [supervisor, picked]);
  return (
    <NgoGate title="Training" lede="Courses, assignments and completion records for your team.">
      <div className="ngo-page tr">
        <header className="ngo-head tr-top">
          <div><h1>Training</h1><p className="ngo-sum">Courses for field work, veterinary care and reporting.</p></div>
          {supervisor && <div className="tr-tabs" role="tablist" aria-label="Training views">
            <button role="tab" aria-selected={tab === "mine"} onClick={() => { setPicked(true); setTab("mine"); }}>My training</button>
            <button role="tab" aria-selected={tab === "manage"} onClick={() => { setPicked(true); setTab("manage"); }}>Courses and team</button>
          </div>}
        </header>
        {tab === "mine" || !supervisor ? <Mine /> : <Manage />}
      </div>
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

function Mine() {
  const { state, error, load } = useCourseData();
  const [open, setOpen] = useState<string | null>(null);
  if (error) return <p role="alert">{error} <button className="btn is-s" onClick={() => void load()}>Try again</button></p>;
  if (!state) return <div className="tr-skel"><div className="skel" /><div className="skel" /></div>;
  const assigned = new Map(state.assignments.map((a) => [a.course_id, a]));
  const mine = state.courses.filter((c) => assigned.has(c.id));
  const other = state.courses.filter((c) => !assigned.has(c.id));
  const course = state.courses.find((c) => c.id === open);
  if (course) return <Player course={course} lessons={state.lessons.filter((l) => l.course_id === course.id)} progress={state.progress} onBack={() => setOpen(null)} onChange={load} />;
  const card = (c: Course) => {
    const ls = state.lessons.filter((l) => l.course_id === c.id), done = state.progress.filter((p) => p.course_id === c.id).length, a = assigned.get(c.id);
    const late = a?.due_on && done < ls.length && a.due_on < new Date().toISOString().slice(0, 10);
    return (
      <li key={c.id}><button className="tr-card" onClick={() => setOpen(c.id)}>
        <span className="tr-card-k">{c.ngo_id ? "Your organisation" : "StrayPaw"}{c.audience ? ` · ${c.audience}` : ""}</span>
        <b>{c.title}</b>
        {c.summary && <span className="tr-card-s">{c.summary}</span>}
        <span className="tr-bar" aria-label={`${done} of ${ls.length} lessons done`}><i style={{ width: `${ls.length ? (100 * done) / ls.length : 0}%` }} /></span>
        <span className="tr-card-f"><span>{done}/{ls.length} lessons</span>{a?.due_on && <span className={late ? "is-late" : ""}>{late ? "Overdue · " : "Due "}{day(a.due_on)}</span>}{done === ls.length && ls.length > 0 && <span className="is-done">Complete</span>}</span>
      </button></li>
    );
  };
  return (
    <div className="tr-mine">
      <section aria-labelledby="tr-assigned"><h2 id="tr-assigned" className="tr-h2">Assigned to you</h2>
        {mine.length ? <ul className="tr-cards">{mine.map(card)}</ul> : <p className="tr-empty">Nothing is assigned to you yet. Your coordinator assigns courses here.</p>}
      </section>
      {other.length > 0 && <section aria-labelledby="tr-more"><h2 id="tr-more" className="tr-h2">Also available</h2><ul className="tr-cards">{other.map(card)}</ul></section>}
    </div>
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
    <div className="tr-player">
      <button className="btn is-s is-ghost tr-back" onClick={onBack}>← All courses</button>
      <div className="tr-player-grid">
        <nav className="tr-lessons" aria-label="Lessons">
          <p className="tr-card-k">{course.title}</p>
          <ol>{lessons.map((l, i) => <li key={l.id}><button aria-current={l.id === at ? "step" : undefined} onClick={() => setAt(l.id)}><span className={`tr-dot${doneIds.has(l.id) ? " is-done" : ""}`} aria-hidden>{doneIds.has(l.id) ? "✓" : i + 1}</span><span><b>{l.title}</b><small>{KIND[l.kind]}</small></span></button></li>)}</ol>
        </nav>
        {lesson ? <article className="tr-lesson">
          <p className="tr-card-k">Lesson {idx + 1} of {lessons.length} · {KIND[lesson.kind]}</p>
          <h2>{lesson.title}</h2>
          {lesson.body && <div className="tr-body">{lesson.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
          {lesson.kind === "video" && lesson.media_url && (youtubeId(lesson.media_url)
            ? <div className="tr-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(lesson.media_url)}`} title={lesson.title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
            : /\.(mp4|webm)(\?|$)/i.test(lesson.media_url) ? <video className="tr-video-el" controls preload="metadata" src={lesson.media_url} /> : <p><a className="btn" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the video</a></p>)}
          {lesson.kind === "document" && lesson.media_url && <p><a className="btn" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the document</a></p>}
          {lesson.kind === "quiz" && <ol className="tr-quiz">{(lesson.questions ?? []).map((q, qi) => (
            <li key={qi}><fieldset><legend>{q.q}</legend>{q.options.map((o, oi) => (
              <label key={oi} className={answers[qi] === oi ? "is-on" : ""}><input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))} />{o}</label>))}</fieldset></li>))}</ol>}
          <div className="tr-lesson-act">
            <button className="btn is-flame" disabled={busy} onClick={() => void complete()}>{busy ? "Saving…" : lesson.kind === "quiz" ? "Submit answers" : doneIds.has(lesson.id) ? "Mark complete again" : "Mark complete"}</button>
            {idx < lessons.length - 1 && <button className="btn" onClick={() => setAt(lessons[idx + 1].id)}>Next lesson</button>}
          </div>
          <div aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</div>
        </article> : <p className="tr-empty">This course has no lessons yet.</p>}
      </div>
    </div>
  );
}

/* ── Supervisor ──────────────────────────────────────────────────────── */
function Manage() {
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
  return (
    <div className="tr-manage">
      <div className="tr-row"><h2 className="tr-h2">Courses</h2><button className="btn is-flame" onClick={() => setEdit("new")}>New course</button></div>
      {error ? <p role="alert">{error}</p> : courses === null ? <div className="tr-skel"><div className="skel" /></div> : courses.length ? (
        <ul className="tr-list">{courses.map((c) => (
          <li key={c.id}><button onClick={() => setEdit(c.id)}>
            <b>{c.title}</b>
            <span className={`tr-status is-${c.status}`}>{c.status === "published" ? "Published" : c.status === "draft" ? "Draft" : "Archived"}</span>
            <small>{c.ngo_id ? "Your organisation" : "StrayPaw"} · updated {day(c.updated_at)}</small>
          </button></li>))}</ul>
      ) : <p className="tr-empty">No courses yet. Start one for a task your team repeats: safe capture, recording a release, or the monthly report.</p>}
    </div>
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
    <div className="tr-editor">
      <button className="btn is-s is-ghost tr-back" onClick={() => void onClose()}>← Courses</button>
      {!own ? <p className="tr-empty">This is a StrayPaw course. You can assign it to your team below; only StrayPaw edits it.</p> : (
        <section className="tr-panel" aria-labelledby="tr-course-h">
          <h2 id="tr-course-h" className="tr-h2">{courseId ? "Course" : "New course"}</h2>
          <div className="tr-form">
            <label><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Recording a release with evidence" /></label>
            <label><span>Who it is for</span><input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={80} placeholder="Field staff" /></label>
            <label className="is-wide"><span>Summary</span><textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} rows={2} placeholder="What someone can do after this course." /></label>
          </div>
          <div className="tr-row">
            <button className="btn" disabled={busy} onClick={() => void saveCourse(status === "published" ? "published" : "draft")}>{courseId ? "Save" : "Create course"}</button>
            {courseId && status !== "published" && <button className="btn is-flame" disabled={busy || !lessons.length} onClick={() => void saveCourse("published")}>Publish</button>}
            {courseId && status === "published" && <button className="btn is-ghost" disabled={busy} onClick={() => void saveCourse("archived")}>Archive</button>}
          </div>
        </section>
      )}
      {courseId && own && (
        <section className="tr-panel" aria-labelledby="tr-lessons-h">
          <div className="tr-row"><h2 id="tr-lessons-h" className="tr-h2">Lessons</h2>{!draft && <button className="btn" onClick={() => { setDraft(blankLesson()); setKeys([]); }}>Add lesson</button>}</div>
          {lessons.length ? <ol className="tr-lesson-list">{lessons.map((l) => <li key={l.id}><span><b>{l.title}</b><small>{KIND[l.kind]}{l.kind === "quiz" ? ` · ${l.questions?.length ?? 0} ${(l.questions?.length ?? 0) === 1 ? "question" : "questions"} · pass ${l.pass_mark}%` : ""}</small></span>
            <span className="tr-row"><button className="btn is-s" onClick={() => { setDraft({ ...l, body: l.body ?? "", media_url: l.media_url ?? "" }); setKeys([]); }}>Edit</button><button className="btn is-s is-ghost" onClick={() => void removeLesson(l)}>Remove</button></span></li>)}</ol>
            : <p className="tr-empty">Add the first lesson: a short reading, a video link, a document or a quiz.</p>}
          {draft && <LessonForm lesson={draft} keys={keys} onChange={setDraft} onKeys={setKeys} onSave={() => void saveLesson()} onCancel={() => setDraft(null)} busy={busy} editingQuiz={!!draft.id && draft.kind === "quiz"} />}
        </section>
      )}
      {courseId && status === "published" && <Assign courseId={courseId} />}
      <div aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</div>
    </div>
  );
}

function LessonForm({ lesson, keys, onChange, onKeys, onSave, onCancel, busy, editingQuiz }: { lesson: Lesson; keys: number[]; onChange: (l: Lesson) => void; onKeys: (k: number[]) => void; onSave: () => void; onCancel: () => void; busy: boolean; editingQuiz: boolean }) {
  const qs = lesson.questions ?? [];
  const setQ = (i: number, q: Question) => onChange({ ...lesson, questions: qs.map((x, j) => (j === i ? q : x)) });
  return (
    <div className="tr-lesson-form">
      <div className="tr-form">
        <label><span>Lesson title</span><input value={lesson.title} onChange={(e) => onChange({ ...lesson, title: e.target.value })} maxLength={120} /></label>
        <label><span>Type</span><select value={lesson.kind} onChange={(e) => onChange({ ...lesson, kind: e.target.value as Lesson["kind"], questions: e.target.value === "quiz" ? (qs.length ? qs : [{ q: "", options: ["", ""] }]) : null })}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {(lesson.kind === "video" || lesson.kind === "document") && <label className="is-wide"><span>{lesson.kind === "video" ? "Video link (YouTube or an .mp4 file)" : "Document link (PDF, Drive or Docs)"}</span><input value={lesson.media_url ?? ""} onChange={(e) => onChange({ ...lesson, media_url: e.target.value })} placeholder="https://" maxLength={600} /></label>}
        <label className="is-wide"><span>{lesson.kind === "quiz" ? "Instructions (optional)" : "Text"}</span><textarea rows={lesson.kind === "reading" ? 8 : 3} value={lesson.body ?? ""} onChange={(e) => onChange({ ...lesson, body: e.target.value })} maxLength={20000} placeholder="Leave a blank line between paragraphs." /></label>
      </div>
      {lesson.kind === "quiz" && (
        <div className="tr-qb">
          {editingQuiz && <p className="small">For safety, saved answers are not shown. Choose the correct option for each question again before saving.</p>}
          {qs.map((q, i) => (
            <fieldset key={i} className="tr-qb-q"><legend>Question {i + 1}</legend>
              <input value={q.q} onChange={(e) => setQ(i, { ...q, q: e.target.value })} placeholder="Question" maxLength={300} />
              {q.options.map((o, oi) => (
                <div key={oi} className="tr-qb-o">
                  <input type="radio" name={`key${i}`} aria-label={`Option ${oi + 1} is correct`} checked={(keys[i] ?? -1) === oi} onChange={() => { const k = [...keys]; k[i] = oi; onKeys(k); }} />
                  <input value={o} onChange={(e) => setQ(i, { ...q, options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} maxLength={200} />
                </div>))}
              <div className="tr-row">{q.options.length < 6 && <button type="button" className="btn is-s is-ghost" onClick={() => setQ(i, { ...q, options: [...q.options, ""] })}>Add option</button>}
                {qs.length > 1 && <button type="button" className="btn is-s is-ghost" onClick={() => { onChange({ ...lesson, questions: qs.filter((_, j) => j !== i) }); onKeys(keys.filter((_, j) => j !== i)); }}>Remove question</button>}</div>
            </fieldset>))}
          <div className="tr-row">{qs.length < 30 && <button type="button" className="btn is-s" onClick={() => onChange({ ...lesson, questions: [...qs, { q: "", options: ["", ""] }] })}>Add question</button>}
            <label className="tr-pass"><span>Pass mark %</span><input type="number" min={0} max={100} value={lesson.pass_mark ?? 70} onChange={(e) => onChange({ ...lesson, pass_mark: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></label></div>
        </div>
      )}
      <div className="tr-row"><button className="btn is-flame" disabled={busy || (lesson.kind === "quiz" && qs.some((_, i) => keys[i] === undefined))} onClick={onSave}>Save lesson</button><button className="btn is-ghost" onClick={onCancel}>Cancel</button></div>
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
  return (
    <section className="tr-panel" aria-labelledby="tr-assign-h">
      <h2 id="tr-assign-h" className="tr-h2">Assign and follow progress</h2>
      <div className="tr-assign">
        <fieldset><legend>Team members</legend>
          {members.filter((m) => !assigned.has(m.user_id)).map((m) => <label key={m.user_id}><input type="checkbox" checked={pick.has(m.user_id)} onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(m.user_id); else n.delete(m.user_id); setPick(n); }} />{m.name} <small>{m.role}</small></label>)}
          {members.length > 0 && members.every((m) => assigned.has(m.user_id)) && <p className="small">Everyone on the team has this course.</p>}
        </fieldset>
        <div className="tr-assign-act"><label><span>Due date (optional)</span><input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} /></label><button className="btn is-flame" disabled={!pick.size} onClick={() => void assign()}>Assign</button></div>
      </div>
      {team === null ? <div className="skel" style={{ height: 60 }} /> : team.length ? (
        <div className="tr-table-wrap"><table className="tr-table"><thead><tr><th>Person</th><th>Lessons</th><th>Quizzes passed</th><th>Due</th><th>Last activity</th><th /></tr></thead>
          <tbody>{team.map((t) => {
            const done = t.lessons_total > 0 && t.lessons_done >= t.lessons_total, late = !done && t.due_on && t.due_on < today;
            return <tr key={t.assignment_id}><td><b>{t.name}</b><small>{t.role}</small></td><td><span className="tr-bar is-s"><i style={{ width: `${t.lessons_total ? (100 * t.lessons_done) / t.lessons_total : 0}%` }} /></span>{t.lessons_done}/{t.lessons_total}</td><td>{t.quizzes_total ? `${t.quizzes_passed}/${t.quizzes_total}` : "—"}</td><td className={late ? "is-late" : ""}>{t.due_on ? day(t.due_on) : "—"}</td><td>{t.last_activity ? day(t.last_activity) : "Not started"}</td><td><button className="btn is-s is-ghost" onClick={() => void unassign(t.assignment_id)}>Remove</button></td></tr>;
          })}</tbody></table></div>
      ) : <p className="tr-empty">Nobody is assigned yet.</p>}
      <div aria-live="polite">{result && <Ack state={result.ok ? "saved" : "failed"}>{result.text}</Ack>}</div>
    </section>
  );
}
