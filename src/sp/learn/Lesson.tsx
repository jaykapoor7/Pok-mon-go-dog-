"use client";

/* Education · one lesson: the syllabus beside a short read with one
   exercise, then what to remember and the next lesson. Completing the
   exercise marks the lesson done on this device. */

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { COURSES, findLesson } from "./content";
import { Exercise } from "./Interactives";
import { useProgress } from "./progress";
import "./learn.css";

export function Lesson({ course, lesson }: { course: string; lesson: string }) {
  const f = findLesson(course, lesson)!;
  const { has, mark } = useProgress();
  const key = `${f.c.id}/${f.l.id}`;
  const [justDone, setJustDone] = useState(false);
  const done = has(key) || justDone;
  const nextCourse = !f.next ? COURSES[COURSES.findIndex((c) => c.id === f.c.id) + 1] ?? null : null;
  return (
    <div className="ls" style={{ ["--ink" as string]: f.c.ink }}>
      <aside className="ls-rail" aria-label={f.c.title}>
        <Link className="link small" href="/learn"><ArrowLeft size={13} aria-hidden /> Academy</Link>
        <p className="k">{f.c.title}</p>
        <ol>{f.c.lessons.map((l, i) => <li key={l.id}><Link href={`/learn/courses/${f.c.id}/${l.id}`} aria-current={l.id === f.l.id ? "page" : undefined} className={has(`${f.c.id}/${l.id}`) ? "is-done" : ""}><span className="ac-tick" aria-hidden>{has(`${f.c.id}/${l.id}`) ? <Check size={12} /> : i + 1}</span>{l.title}</Link></li>)}</ol>
      </aside>
      <article className="ls-main">
        <p className="k">Lesson {f.i + 1} of {f.c.lessons.length} · {f.l.minutes} min</p>
        <h1 className="display">{f.l.title}</h1>
        {f.l.blocks.map((b, i) => b.kind === "text" ? <p key={i} className="ls-p">{b.body}</p>
          : b.kind === "note" ? <p key={i} className="ls-note">{b.body}</p>
          : (
            <section key={i} className={`ls-do${done ? " is-done" : ""}`} aria-label="Exercise">
              <p className="ls-do-k"><span>Try it</span>{done && <span className="pill is-care"><Check size={12} aria-hidden /> Done</span>}</p>
              <p className="ls-do-p">{b.prompt}</p>
              <Exercise id={b.id} onDone={() => { if (!done) { mark(key); setJustDone(true); } }} />
            </section>
          ))}
        <section className={`ls-take${done ? " is-on" : ""}`} aria-live="polite">
          <p className="k">What to remember</p>
          <p className="serif">{f.l.takeaway}</p>
        </section>
        <nav className="ls-nav" aria-label="Lessons">
          {f.prev ? <Link className="btn is-ghost" href={`/learn/courses/${f.c.id}/${f.prev.id}`}><ArrowLeft size={14} aria-hidden /> {f.prev.title}</Link> : <span />}
          {f.next ? <Link className="btn is-ink" href={`/learn/courses/${f.c.id}/${f.next.id}`}>Next: {f.next.title} <ArrowRight size={14} aria-hidden /></Link>
            : nextCourse ? <Link className="btn is-ink" href={`/learn/courses/${nextCourse.id}/${nextCourse.lessons[0].id}`}>Next course: {nextCourse.title} <ArrowRight size={14} aria-hidden /></Link>
            : <Link className="btn is-ink" href="/learn">Back to the Academy</Link>}
        </nav>
      </article>
    </div>
  );
}
