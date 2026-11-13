"use client";

/* Education · one lesson: the syllabus beside a short read with one
   exercise, then what to remember and the next lesson. Completing the
   exercise marks the lesson done on this device. */

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Btn, Head, Page, Panel, Row, Rows, Section, Tag } from "@/ws/kit";
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
  const d = f.c.lessons.filter((l) => has(`${f.c.id}/${l.id}`) || (l.id === f.l.id && done)).length;
  /* A narrow reading column: the read, one exercise, what to remember, then previous and next. The path's other lessons fold underneath. */
  return (
    <Page width="narrow">
      <Head title={f.l.title} eyebrow={<>{f.c.title} · lesson {f.i + 1} of {f.c.lessons.length} · {f.l.minutes} min</>}
        actions={done ? <Tag tone="green">Done</Tag> : undefined} />
      <p className="lrn-meter is-wide" role="img" aria-label={`${d} of ${f.c.lessons.length} lessons done in this path`}><i style={{ width: `${(d / f.c.lessons.length) * 100}%` }} /></p>
      <article className="lrn-read">
        {f.l.blocks.map((b, i) => b.kind === "text" ? <p key={i}>{b.body}</p>
          : b.kind === "note" ? <p key={i} className="lrn-aside">{b.body}</p>
          : (
            <section key={i} className="lrn-do" aria-label="Exercise">
              <p className="lrn-do-k"><span>Try it</span>{done && <Tag tone="green">Done</Tag>}</p>
              <p className="lrn-do-p">{b.prompt}</p>
              <Exercise id={b.id} onDone={() => { if (!done) { mark(key); setJustDone(true); } }} />
            </section>
          ))}
        <section className={`lrn-take${done ? " is-on" : ""}`} aria-live="polite">
          <b>What to remember</b>
          <p>{f.l.takeaway}</p>
        </section>
      </article>
      <nav className="lrn-nav" aria-label="Lessons">
        {f.prev ? <Btn href={`/learn/courses/${f.c.id}/${f.prev.id}`} icon={<ArrowLeft size={14} />}>{f.prev.title}</Btn> : <span />}
        {f.next ? <Btn variant="primary" href={`/learn/courses/${f.c.id}/${f.next.id}`}>Next: {f.next.title}</Btn>
          : nextCourse ? <Btn variant="primary" href={`/learn/courses/${nextCourse.id}/${nextCourse.lessons[0].id}`}>Next course: {nextCourse.title}</Btn>
          : <Btn variant="primary" href="/learn">Back to the Academy</Btn>}
      </nav>
      <Section fold="path" open={false} title={`Other lessons in ${f.c.title}`} count={f.c.lessons.length}>
        <Panel><Rows label={f.c.title}>
          {f.c.lessons.map((l, i) => { const ok = has(`${f.c.id}/${l.id}`); return <Row key={l.id} href={`/learn/courses/${f.c.id}/${l.id}`} tone={ok ? "green" : undefined} icon={ok ? <Check size={14} /> : <span className="lrn-num">{i + 1}</span>} title={l.title} meta={`${l.minutes} min${l.id === f.l.id ? " · you are here" : ""}`} />; })}
        </Rows></Panel>
      </Section>
    </Page>
  );
}
