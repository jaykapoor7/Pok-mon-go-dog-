"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import { useRead } from "@/oh/data";
import { assignCourse, completeLesson, deleteLesson, leadOrCoord, read, readCourses, readLearner, readLessons, readMembers, readTeamProgress, saveCourse, saveLesson, unassignCourse, type Course, type Lesson, type Member, type Question, type TeamRow } from "../../data/ngo-setup";
import { Shell } from "../../Shell";
import { Chip } from "../../ui";
import { Confirm, Empty, Failed, Field, Modal, Skeleton, day, errText, useAct } from "../../kit";
import { Grid, Holding, TabbedPage, Tools, TryLink, plural, useTab, useWho, type GCol, type Who } from "./frame";
import { S_COURSES, S_LESSONS } from "./sample";

/* Training: everyone works through the courses assigned to them; quizzes are scored by the database against a key
   learners never receive (training_complete_lesson). Leads and coordinators build courses, assign them with a due
   date and follow each person's progress. Shown only where training is switched on (flag training_lms). */

const KIND = { reading: "Reading", video: "Video", document: "Document", quiz: "Quiz" } as const;
const TABS = [{ slug: "mine", label: "My training" }, { slug: "manage", label: "Courses and team" }] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Training"];
const youtubeId = (url: string) => url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;

export function Training({ on, tab: initial }: { on: boolean; tab?: string | null }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  if (!on) return <Shell crumb={CRUMB}><div className="nx-page"><h1 className="nx-h1">Training</h1><div className="nx-empty" style={{ marginTop: 20 }}><GraduationCap size={20} /><b>Training is not switched on for this organisation</b><p>Courses, assignments and completion records are switched on per deployment once they have been checked end to end. Nothing is recorded until then.</p></div></div></Shell>;
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Training" text="Training here is for NGO teams. Your account is not part of an NGO." />;
  const supervisor = who.sample || leadOrCoord(who.role);
  if (!supervisor) return <Shell crumb={CRUMB}><div className="nx-page ns-page" style={{ maxWidth: "none" }}><p className="nx-eyebrow">{who.ngo?.name}</p><h1 className="nx-h1">Training</h1><p className="nx-sub">Courses for field work, veterinary care and reporting. Quizzes are scored when you submit them.</p><Mine who={who} /></div></Shell>;
  return (
    <TabbedPage id="tr" crumb={CRUMB} title="Training" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample} sub="Courses for field work, veterinary care and reporting. Quizzes are scored by the database when they are submitted."
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "My training" ? <Mine who={who} /> : <Manage who={who} />}
    </TabbedPage>
  );
}

/* ── Learner ── */
function Mine({ who }: { who: Who }) {
  const r = useRead(() => read(() => readLearner(who.userId!)), `ns:learn:${who.userId}`, !who.sample && !!who.userId);
  const [open, setOpen] = useState<string | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading your courses" />;
  if (!who.sample && r.error && !r.data) return <Failed error={r.error} retry={r.reload} />;
  const s = who.sample ? { courses: S_COURSES, lessons: S_LESSONS, assignments: [{ id: "a1", course_id: "sample-co1", due_on: "2026-11-30", created_at: "2026-11-01T10:00:00Z" }], progress: [{ lesson_id: "sample-l1", course_id: "sample-co1", score: null, passed: true, completed_at: "2026-11-10T10:00:00Z" }] } : r.data!;
  const assigned = new Map(s.assignments.map((a) => [a.course_id, a]));
  const course = s.courses.find((c) => c.id === open);
  if (course) return <Player sample={who.sample} course={course} lessons={s.lessons.filter((l) => l.course_id === course.id)} done={new Set(s.progress.filter((p) => p.course_id === course.id).map((p) => p.lesson_id))} onBack={() => setOpen(null)} onChange={r.reload} />;
  const today = new Date().toISOString().slice(0, 10);
  const facts = (c: Course) => { const total = s.lessons.filter((l) => l.course_id === c.id).length, done = s.progress.filter((p) => p.course_id === c.id).length, a = assigned.get(c.id); return { total, done, due: a?.due_on ?? null, late: !!a?.due_on && done < total && a.due_on < today }; };
  const cols: GCol<Course>[] = [
    { label: "Course", width: "minmax(0, 2fr)", render: (c) => <span className="nx-cell-main"><span><b>{c.title}</b><small>{c.summary ?? (c.ngo_id ? "Your organisation" : "StrayPaw")}</small></span></span> },
    { label: "From", width: "minmax(0, 1fr)", render: (c) => <span className="nx-t2">{c.ngo_id ? "Your organisation" : "StrayPaw"}{c.audience ? ` · ${c.audience}` : ""}</span> },
    { label: "Lessons", width: "140px", render: (c) => { const f = facts(c); return <span className="ns-mini"><span className="ns-meter" style={{ width: 64 }}><i style={{ width: `${f.total ? (100 * f.done) / f.total : 0}%` }} /></span><span className="num nx-t2">{f.done}/{f.total}</span></span>; } },
    { label: "Due", width: "150px", keep: true, render: (c) => { const f = facts(c); return f.done === f.total && f.total > 0 ? <Chip tone="ok">Complete</Chip> : f.due ? (f.late ? <Chip tone="bad">Overdue · {day(f.due)}</Chip> : <span className="nx-t2">Due {day(f.due)}</span>) : null; } },
  ];
  const mine = s.courses.filter((c) => assigned.has(c.id)), other = s.courses.filter((c) => !assigned.has(c.id));
  return (
    <>
      <section className="ns-sec"><div className="nx-sec-h"><h2>Assigned to you</h2><span className="nx-count">{mine.length}</span></div>
        <Grid label="Assigned to you" cols={cols} rows={mine} rowKey={(c) => c.id} rowLabel={(c) => c.title} onOpen={(c) => setOpen(c.id)} empty={<><b>Nothing is assigned to you yet</b><p>Your coordinator assigns courses here.</p></>} />
      </section>
      {other.length ? <section className="ns-sec"><div className="nx-sec-h"><h2>Also available</h2><span className="nx-count">{other.length}</span></div><Grid label="Also available" cols={cols} rows={other} rowKey={(c) => c.id} rowLabel={(c) => c.title} onOpen={(c) => setOpen(c.id)} /></section> : null}
    </>
  );
}

function Player({ sample, course, lessons, done, onBack, onChange }: { sample: boolean; course: Course; lessons: Lesson[]; done: Set<string>; onBack: () => void; onChange: () => void }) {
  const first = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const [at, setAt] = useState(first?.id ?? null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const { busy, run } = useAct();
  const lesson = lessons.find((l) => l.id === at) ?? null;
  const idx = lessons.findIndex((l) => l.id === at);
  useEffect(() => { setAnswers({}); setResult(null); }, [at]);
  const complete = () => {
    if (!lesson) return;
    let payload: number[] | null = null;
    if (lesson.kind === "quiz") { const n = lesson.questions?.length ?? 0; if (Object.keys(answers).length < n) { setResult({ ok: false, text: "Answer every question first." }); return; } payload = Array.from({ length: n }, (_, i) => answers[i]); }
    void run("complete", () => completeLesson(lesson.id, payload), { quiet: true }).then((x) => {
      if (!x.ok || !x.result) return;
      const d = x.result;
      setResult(lesson.kind === "quiz" ? { ok: d.passed, text: d.passed ? `Passed: ${d.correct} of ${d.total} correct (${d.score}%).` : `${d.correct} of ${d.total} correct (${d.score}%). The pass mark is ${d.pass_mark}%. Read the lesson again and retry.` } : { ok: true, text: "Marked complete." });
      onChange();
    });
  };
  return (
    <section className="ns-sec">
      <div className="nx-sec-h"><h2>{course.title}</h2><span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" onClick={onBack}>All courses</button></span></div>
      <div className="ns-cols" style={{ gridTemplateColumns: "240px minmax(0, 1fr)", marginTop: 8 }}>
        <ol className="ns-lessons" aria-label="Lessons">{lessons.map((l, i) => <li key={l.id}><button type="button" aria-current={l.id === at ? "step" : undefined} onClick={() => setAt(l.id)}><span className={`ns-dot ${done.has(l.id) ? "is-done" : ""}`} aria-hidden>{done.has(l.id) ? "✓" : i + 1}</span><span><b style={{ fontWeight: 500, display: "block" }}>{l.title}</b><small className="nx-t3">{KIND[l.kind]}</small></span></button></li>)}</ol>
        {lesson ? <article className="ns-lesson">
          <p className="ns-small">Lesson {idx + 1} of {lessons.length} · {KIND[lesson.kind]}</p>
          <h2>{lesson.title}</h2>
          {lesson.body ? <div className="ns-stack">{lesson.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div> : null}
          {lesson.kind === "video" && lesson.media_url ? (youtubeId(lesson.media_url) ? <div className="ns-video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(lesson.media_url)}`} title={lesson.title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div> : /\.(mp4|webm)(\?|$)/i.test(lesson.media_url) ? <video controls preload="metadata" src={lesson.media_url} style={{ width: "100%", borderRadius: 10 }} /> : <p><a className="nx-btn is-quiet" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the video</a></p>) : null}
          {lesson.kind === "document" && lesson.media_url ? <p><a className="nx-btn is-quiet" href={lesson.media_url} target="_blank" rel="noopener noreferrer">Open the document</a></p> : null}
          {lesson.kind === "quiz" ? <ol className="ns-quiz">{(lesson.questions ?? []).map((q, qi) => <li key={qi}><fieldset><legend>{q.q}</legend>{q.options.map((o, oi) => <label key={oi} className={answers[qi] === oi ? "is-on" : ""}><input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))} />{o}</label>)}</fieldset></li>)}</ol> : null}
          <div className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
            {sample ? <TryLink>{lesson.kind === "quiz" ? "Submit answers" : "Mark complete"}</TryLink> : <button type="button" className="nx-btn" disabled={!!busy} onClick={complete}>{busy ? "Saving…" : lesson.kind === "quiz" ? "Submit answers" : done.has(lesson.id) ? "Mark complete again" : "Mark complete"}</button>}
            {idx < lessons.length - 1 ? <button type="button" className="nx-btn is-quiet" onClick={() => setAt(lessons[idx + 1].id)}>Next lesson</button> : null}
          </div>
          {result ? <p className={result.ok ? "nx-note" : "nx-note ns-note-bad"} role="status"><span>{result.text}</span></p> : null}
        </article> : <Empty title="This course has no lessons yet" />}
      </div>
    </section>
  );
}

/* ── Supervisor ── */
function Manage({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead<Course[]>(() => read(() => readCourses(ngoId!)), `ns:courses:${ngoId}`, !who.sample && !!ngoId);
  const [edit, setEdit] = useState<string | "new" | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading courses" />;
  if (!who.sample && r.error && !r.data) return <Failed error={r.error} retry={r.reload} />;
  const courses = who.sample ? S_COURSES : r.data!;
  if (edit && !who.sample) return <Editor ngoId={ngoId!} course={edit === "new" ? null : courses.find((c) => c.id === edit) ?? null} onClose={() => { setEdit(null); r.reload(); }} />;
  const cols: GCol<Course>[] = [
    { label: "Course", width: "minmax(0, 2fr)", render: (c) => <span className="nx-cell-main"><span><b>{c.title}</b><small>{c.ngo_id ? "Your organisation" : "StrayPaw"}{c.audience ? ` · ${c.audience}` : ""}</small></span></span> },
    { label: "Updated", width: "120px", render: (c) => <span className="nx-t3">{day(c.updated_at)}</span> },
    { label: "Status", width: "110px", keep: true, render: (c) => <Chip tone={c.status === "published" ? "ok" : c.status === "draft" ? "accent" : "plain"}>{c.status === "published" ? "Published" : c.status === "draft" ? "Draft" : "Archived"}</Chip> },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />New course</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setEdit("new")}><Plus size={13} />New course</button>}><span className="ns-sum"><b>{courses.length}</b> {courses.length === 1 ? "course" : "courses"}. Open one to edit its lessons, assign it and follow progress.</span></Tools>
      <Grid label="Courses" cols={cols} rows={courses} rowKey={(c) => c.id} rowLabel={(c) => c.title} onOpen={(c) => (who.sample ? undefined : setEdit(c.id))} empty={<><b>No courses yet</b><p>Write a short course for field capture, release evidence or vet sign-off, then assign it to your team.</p></>} />
    </>
  );
}

const blankLesson = (): Lesson => ({ id: "", course_id: "", position: 0, title: "", kind: "reading", body: "", media_url: "", questions: null, pass_mark: 70 });
function Editor({ ngoId, course, onClose }: { ngoId: string; course: Course | null; onClose: () => void }) {
  const own = !course || course.ngo_id === ngoId;
  const { busy, run } = useAct();
  const [courseId, setCourseId] = useState<string | null>(course?.id ?? null);
  const [f, setF] = useState({ title: course?.title ?? "", summary: course?.summary ?? "", audience: course?.audience ?? "" });
  const [status, setStatus] = useState<Course["status"]>(course?.status ?? "draft");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [draft, setDraft] = useState<Lesson | null>(null);
  const [keys, setKeys] = useState<number[]>([]);
  const [removing, setRemoving] = useState<Lesson | null>(null);
  const loadLessons = useCallback(async () => { if (courseId) setLessons(await readLessons(courseId).catch(() => [])); }, [courseId]);
  useEffect(() => { void loadLessons(); }, [loadLessons]);
  const save = (next: Course["status"] = status) => {
    if (f.title.trim().length < 3) return;
    void run("course", () => saveCourse({ id: courseId, title: f.title.trim(), summary: f.summary, audience: f.audience, status: next }), { ok: next === "published" ? "Published. You can assign it now." : next === "archived" ? "Archived." : "Saved." }).then((x) => { if (x.ok && x.result) { setCourseId(x.result); setStatus(next); } });
  };
  const saveL = () => {
    if (!draft || !courseId) return;
    const qs = draft.kind === "quiz" ? (draft.questions ?? []).map((q) => ({ q: q.q.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) })) : null;
    void run("lesson", async () => {
      if (draft.title.trim().length < 2) throw new Error("Give the lesson a title.");
      if ((draft.kind === "video" || draft.kind === "document") && !/^https:\/\//.test(draft.media_url ?? "")) throw new Error("Add a link that starts with https://");
      if (draft.kind === "quiz" && (!qs?.length || qs.some((q) => !q.q || q.options.length < 2))) throw new Error("Each question needs text and at least two options.");
      return saveLesson({ id: draft.id || null, course: courseId, position: draft.id ? draft.position : lessons.length, title: draft.title.trim(), kind: draft.kind, body: draft.body ?? "", media_url: draft.media_url ?? "", questions: qs, answers: draft.kind === "quiz" ? qs!.map((_, i) => keys[i] ?? 0) : null, pass_mark: draft.pass_mark ?? 70 });
    }, { ok: "Lesson saved." }).then(async (x) => { if (x.ok) { setDraft(null); await loadLessons(); } });
  };
  const remove = () => { if (!removing) return; const l = removing; void run("del", () => deleteLesson(l.id), { ok: `${l.title} removed.` }).then(async (x) => { setRemoving(null); if (x.ok) await loadLessons(); }); };
  return (
    <>
      <Tools end={<button type="button" className="nx-btn is-quiet is-sm" onClick={onClose}>All courses</button>}><span className="ns-sum"><b>{courseId ? f.title || "Course" : "New course"}</b>{courseId ? <> · <Chip tone={status === "published" ? "ok" : status === "draft" ? "accent" : "plain"}>{status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"}</Chip></> : null}</span></Tools>
      {!own ? <p className="nx-note"><span>This is a StrayPaw course. You can assign it to your team below; only StrayPaw edits it.</span></p> : <div className="nx-fields" style={{ maxWidth: 760 }}>
        <Field label="Title" wide><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} placeholder="Recording a release with evidence" autoFocus /></Field>
        <Field label="Who it is for"><input value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} maxLength={80} placeholder="Field staff" /></Field>
        <Field label="Summary" wide><textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} maxLength={600} rows={2} placeholder="What someone can do after this course." /></Field>
        <div className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap", gridColumn: "1 / -1" }}>
          <button type="button" className="nx-btn is-quiet" disabled={!!busy || f.title.trim().length < 3} onClick={() => save(status === "published" ? "published" : "draft")}>{courseId ? "Save" : "Create course"}</button>
          {courseId && status !== "published" ? <button type="button" className="nx-btn" disabled={!!busy || !lessons.length} onClick={() => save("published")}>Publish</button> : null}
          {courseId && status === "published" ? <button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => save("archived")}>Archive</button> : null}
        </div>
      </div>}
      {courseId && own ? <section className="ns-sec"><div className="nx-sec-h"><h2>Lessons</h2><span className="nx-count">{lessons.length}</span><span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setDraft(blankLesson()); setKeys([]); }}><Plus size={12} />Add lesson</button></span></div>
        <Grid label="Lessons" rows={lessons} rowKey={(l) => l.id} cols={[
          { label: "Lesson", width: "minmax(0, 1.6fr)", render: (l) => <span className="nx-cell-main"><span><b>{l.title}</b><small>{KIND[l.kind]}{l.kind === "quiz" ? ` · ${plural(l.questions?.length ?? 0, "question")} · pass ${l.pass_mark}%` : ""}</small></span></span> },
          { label: "", width: "170px", keep: true, render: (l) => <span className="ns-row-acts"><button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setDraft({ ...l, body: l.body ?? "", media_url: l.media_url ?? "" }); setKeys([]); }}>Edit</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRemoving(l)}>Remove</button></span> },
        ]} empty={<><b>No lessons yet</b><p>Add a short reading, a video link, a document or a quiz.</p></>} />
      </section> : null}
      {courseId && status === "published" ? <Assign courseId={courseId} /> : null}
      {draft ? <LessonForm lesson={draft} keys={keys} busy={busy === "lesson"} onChange={setDraft} onKeys={setKeys} onSave={saveL} onClose={() => setDraft(null)} /> : null}
      {removing ? <Confirm danger title="Remove this lesson" confirm="Remove lesson" busy={busy === "del"} onClose={() => setRemoving(null)} onConfirm={remove}><p>{removing.title} is removed from the course. Progress already recorded on it is kept by the database as it decides.</p></Confirm> : null}
    </>
  );
}

function LessonForm({ lesson, keys, busy, onChange, onKeys, onSave, onClose }: { lesson: Lesson; keys: number[]; busy: boolean; onChange: (l: Lesson) => void; onKeys: (k: number[]) => void; onSave: () => void; onClose: () => void }) {
  const qs = lesson.questions ?? [];
  const setQ = (i: number, q: Question) => onChange({ ...lesson, questions: qs.map((x, j) => (j === i ? q : x)) });
  const missingKey = lesson.kind === "quiz" && qs.some((_, i) => keys[i] === undefined);
  return (
    <Modal wide title={lesson.id ? "Edit lesson" : "Add a lesson"} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={busy || missingKey} onClick={onSave}>{busy ? "Saving…" : "Save lesson"}</button></>}>
      <div className="nx-fields">
        <Field label="Lesson title"><input value={lesson.title} onChange={(e) => onChange({ ...lesson, title: e.target.value })} maxLength={120} autoFocus /></Field>
        <Field label="Type"><select value={lesson.kind} onChange={(e) => onChange({ ...lesson, kind: e.target.value as Lesson["kind"], questions: e.target.value === "quiz" ? (qs.length ? qs : [{ q: "", options: ["", ""] }]) : null })}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {lesson.kind === "video" || lesson.kind === "document" ? <Field label={lesson.kind === "video" ? "Video link (YouTube or an .mp4 file)" : "Document link (PDF, Drive or Docs)"} wide><input value={lesson.media_url ?? ""} onChange={(e) => onChange({ ...lesson, media_url: e.target.value })} placeholder="https://" maxLength={600} /></Field> : null}
        <Field label={lesson.kind === "quiz" ? "Instructions (optional)" : "Text"} hint="Leave a blank line between paragraphs." wide><textarea rows={lesson.kind === "reading" ? 6 : 3} value={lesson.body ?? ""} onChange={(e) => onChange({ ...lesson, body: e.target.value })} maxLength={20000} /></Field>
      </div>
      {lesson.kind === "quiz" ? <>
        {lesson.id ? <p className="nx-note"><span>For safety, saved answers are not shown. Choose the correct option for each question again before saving.</span></p> : null}
        {qs.map((q, i) => <fieldset key={i} className="ns-set"><legend>Question {i + 1}</legend>
          <Field label="Question"><input value={q.q} onChange={(e) => setQ(i, { ...q, q: e.target.value })} maxLength={300} /></Field>
          {q.options.map((o, oi) => <div key={oi} className="ns-opt"><input type="radio" name={`key${i}`} aria-label={`Option ${oi + 1} is correct`} checked={(keys[i] ?? -1) === oi} onChange={() => { const k = [...keys]; k[i] = oi; onKeys(k); }} /><input className="ns-sel" style={{ height: 34, width: "100%" }} value={o} onChange={(e) => setQ(i, { ...q, options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} aria-label={`Option ${oi + 1}`} maxLength={200} /></div>)}
          <div className="ns-row-acts" style={{ justifyContent: "flex-start" }}>{q.options.length < 6 ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setQ(i, { ...q, options: [...q.options, ""] })}>Add option</button> : null}{qs.length > 1 ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => { onChange({ ...lesson, questions: qs.filter((_, j) => j !== i) }); onKeys(keys.filter((_, j) => j !== i)); }}>Remove question</button> : null}</div>
        </fieldset>)}
        <div className="nx-fields" style={{ alignItems: "end" }}>
          <div>{qs.length < 30 ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => onChange({ ...lesson, questions: [...qs, { q: "", options: ["", ""] }] })}>Add question</button> : null}</div>
          <Field label="Pass mark %"><input type="number" min={0} max={100} value={lesson.pass_mark ?? 70} onChange={(e) => onChange({ ...lesson, pass_mark: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></Field>
        </div>
        {missingKey ? <p className="ns-small">Choose the correct option for every question.</p> : null}
      </> : null}
    </Modal>
  );
}

function Assign({ courseId }: { courseId: string }) {
  const { busy, run } = useAct();
  const [members, setMembers] = useState<Member[]>([]);
  const [team, setTeam] = useState<TeamRow[] | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [due, setDue] = useState("");
  const [removing, setRemoving] = useState<TeamRow | null>(null);
  const load = useCallback(async () => { const [m, t] = await Promise.all([readMembers().catch(() => [] as Member[]), readTeamProgress(courseId).catch(() => [] as TeamRow[])]); setMembers(m); setTeam(t); }, [courseId]);
  useEffect(() => { void load(); }, [load]);
  const assigned = useMemo(() => new Set((team ?? []).map((t) => t.user_id)), [team]);
  const free = members.filter((m) => !assigned.has(m.user_id));
  const today = new Date().toISOString().slice(0, 10);
  const assign = () => { const n = pick.size; void run("assign", () => assignCourse(courseId, [...pick], due || null), { ok: `Assigned to ${plural(n, "person", "people")}.` }).then(async (x) => { if (x.ok) { setPick(new Set()); await load(); } }); };
  const unassign = () => { if (!removing) return; const t = removing; void run("unassign", () => unassignCourse(t.assignment_id), { ok: `${t.name} no longer has this course.`, undo: async () => { await assignCourse(courseId, [t.user_id], t.due_on); await load(); } }).then(async (x) => { setRemoving(null); if (x.ok) await load(); }); };
  const cols: GCol<TeamRow>[] = [
    { label: "Person", width: "minmax(0, 1.4fr)", render: (t) => <span className="nx-cell-main"><span><b>{t.name}</b><small>{t.role.replace(/_/g, " ")}</small></span></span> },
    { label: "Lessons", width: "120px", keep: true, render: (t) => <span className="num nx-t2">{t.lessons_done}/{t.lessons_total}</span> },
    { label: "Quizzes passed", width: "110px", render: (t) => <span className="nx-t2">{t.quizzes_total ? `${t.quizzes_passed}/${t.quizzes_total}` : "No quiz"}</span> },
    { label: "Due", width: "140px", render: (t) => { const done = t.lessons_total > 0 && t.lessons_done >= t.lessons_total, late = !done && !!t.due_on && t.due_on < today; return t.due_on ? (late ? <Chip tone="bad">Overdue · {day(t.due_on)}</Chip> : <span className="nx-t2">{day(t.due_on)}</span>) : <span className="nx-t3">No date</span>; } },
    { label: "Last activity", width: "120px", render: (t) => <span className="nx-t3">{t.last_activity ? day(t.last_activity) : "Not started"}</span> },
    { label: "", width: "96px", render: (t) => <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setRemoving(t)}>Remove</button> },
  ];
  return (
    <section className="ns-sec"><div className="nx-sec-h"><h2>Assign and follow progress</h2></div>
      <div className="ns-checks" style={{ marginTop: 8 }}>{free.map((m) => <label key={m.user_id} className="ns-check"><input type="checkbox" checked={pick.has(m.user_id)} onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(m.user_id); else n.delete(m.user_id); setPick(n); }} />{m.name} <span className="nx-t3">{m.role.replace(/_/g, " ")}</span></label>)}</div>
      {members.length > 0 && !free.length ? <p className="ns-small">Everyone on the team has this course.</p> : null}
      <div className="nx-fields" style={{ gridTemplateColumns: "minmax(0, 220px) auto", alignItems: "end", marginTop: 10 }}>
        <Field label="Due date (optional)"><input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div><button type="button" className="nx-btn" disabled={!pick.size || !!busy} onClick={assign}>Assign</button></div>
      </div>
      {team === null ? <Skeleton rows={2} label="Reading progress" /> : <div style={{ marginTop: 12 }}><Grid label="Team progress" cols={cols} rows={team} rowKey={(t) => t.assignment_id} empty={<b>Nobody is assigned yet.</b>} /></div>}
      {removing ? <Confirm title="Remove this assignment" confirm="Remove" busy={busy === "unassign"} onClose={() => setRemoving(null)} onConfirm={unassign}><p>{removing.name} no longer has this course assigned. Lessons they completed stay recorded.</p></Confirm> : null}
    </section>
  );
}

