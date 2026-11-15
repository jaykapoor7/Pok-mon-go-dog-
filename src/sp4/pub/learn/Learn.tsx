"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw Academy (/learn), one lesson (/learn/courses/[c]/[l]) and
   the Playground. Content and exercises are the Academy's own modules
   (src/sp/learn/content, Interactives); progress stays on this device
   (localStorage "sp2.learn.done"). Nothing here reads or writes the
   record, and no exercise can send a report.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { COURSES, findLesson, lessonCount, type Interactive } from "@/sp/learn/content";
import { Exercise } from "@/sp/learn/Interactives";
import { useProgress } from "@/sp/learn/progress";
import { Body, Btn, Fold, Head, LinkBtn, List, Row, Sec, Tag } from "../kit";
import { KindHourLibrary } from "./KindHour";
import "./learn.css";

/** What the reader actually does in each lesson's exercise. */
const ACTIVITY: Record<Interactive, string> = {
  "unknown-ledger": "Sort a street", precision: "Compare four placements", units: "Name the unit", encounter: "Choose your move",
  "bite-order": "Put steps in order", observe: "Seen or assumed?", simulation: "Run a model street", denominator: "Test the claims", "practice-report": "Write a practice report",
};

function Meter({ n, of, label }: { n: number; of: number; label: string }) {
  return <span className="lx-meter" role="img" aria-label={label}><i style={{ width: `${(n / Math.max(1, of)) * 100}%` }} /></span>;
}

export function Academy() {
  const { has, done, reset } = useProgress();
  const next = COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).find(({ c, l }) => !has(`${c.id}/${l.id}`));
  const n = COURSES.reduce((a, c) => a + c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length, 0);
  return (
    <>
      <Head title="StrayPaw Academy"
        sum={<><b>{n}</b> of {lessonCount} lessons done on this device. {next ? <>Next: {next.l.title}.</> : "Every lesson is done."} Each lesson is short and has one hands-on exercise. No account needed.</>}
        actions={<>
          {next ? <LinkBtn variant="primary" href={`/learn/courses/${next.c.id}/${next.l.id}`} icon={<ArrowRight size={16} aria-hidden />}>{n ? "Continue" : "Start here"}</LinkBtn> : null}
          <LinkBtn href="/learn/workshops">Run a workshop</LinkBtn>
        </>}>
        <div className="lx-progress"><Meter n={n} of={lessonCount} label={`${n} of ${lessonCount} lessons done`} />{done.length > 0 && <Btn small variant="quiet" onClick={reset}>Start over</Btn>}</div>
      </Head>
      <Body>
        <div className="lx-paths">
          {COURSES.map((c) => {
            const d = c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length;
            return (
              <Sec key={c.id} title={c.title} note={`${c.dek} ${c.audience} · ${c.lessons.reduce((a, l) => a + l.minutes, 0)} minutes`}
                action={<span className="lx-prog"><Meter n={d} of={c.lessons.length} label={`${d} of ${c.lessons.length} lessons done in ${c.title}`} />{d} of {c.lessons.length}</span>}>
                <List label={c.title}>
                  {c.lessons.map((l, i) => {
                    const ok = has(`${c.id}/${l.id}`);
                    const ex = l.blocks.find((b) => b.kind === "do");
                    return <Row key={l.id} href={`/learn/courses/${c.id}/${l.id}`} tone={ok ? "green" : undefined} icon={ok ? <Check size={16} /> : <span>{i + 1}</span>} title={l.title}
                      meta={`${l.minutes} min${ex && ex.kind === "do" ? ` · ${ACTIVITY[ex.id]}` : ""}`} end={ok ? <Tag tone="green">Done</Tag> : undefined} />;
                  })}
                </List>
              </Sec>
            );
          })}
        </div>
        <Sec title="More ways to learn">
          <List label="More ways to learn">
            <Row href="/learn/workshops" title="Run a workshop" meta="Three ready sessions for a class or a volunteer evening, one activity at a time." />
            <Row href="/learn/resources" title="Practise a report" meta="Describe what you saw, get feedback, and find rescue helplines." />
            <Row href="/learn/playground" title="Try the models" meta="The model street and the precision lens on their own. Illustrative, never a forecast." />
          </List>
        </Sec>
        <KindHourLibrary />
      </Body>
    </>
  );
}

export function Lesson({ course, lesson }: { course: string; lesson: string }) {
  const f = findLesson(course, lesson)!;
  const { has, mark } = useProgress();
  const key = `${f.c.id}/${f.l.id}`;
  const [justDone, setJustDone] = useState(false);
  const done = has(key) || justDone;
  const nextCourse = !f.next ? COURSES[COURSES.findIndex((c) => c.id === f.c.id) + 1] ?? null : null;
  const d = f.c.lessons.filter((l) => has(`${f.c.id}/${l.id}`) || (l.id === f.l.id && done)).length;
  return (
    <>
      <Head back="/learn" eyebrow={<>{f.c.title} · lesson {f.i + 1} of {f.c.lessons.length} · {f.l.minutes} min</>} title={f.l.title}
        actions={done ? <Tag tone="green">Done</Tag> : undefined}>
        <div className="lx-progress"><Meter n={d} of={f.c.lessons.length} label={`${d} of ${f.c.lessons.length} lessons done in this path`} /></div>
      </Head>
      <Body narrow>
        <article className="lx-read">
          {f.l.blocks.map((b, i) => b.kind === "text" ? <p key={i}>{b.body}</p>
            : b.kind === "note" ? <p key={i} className="lx-aside">{b.body}</p>
            : (
              <section key={i} className="lx-do" aria-label="Exercise">
                <p className="lx-do-k"><span>Try it</span>{done && <Tag tone="green">Done</Tag>}</p>
                <p className="lx-do-p">{b.prompt}</p>
                <div className="lx-ex"><Exercise id={b.id} onDone={() => { if (!done) { mark(key); setJustDone(true); } }} /></div>
              </section>
            ))}
          <section className={`lx-take${done ? " is-on" : ""}`} aria-live="polite">
            <b>What to remember</b>
            <p>{f.l.takeaway}</p>
          </section>
        </article>
        <nav className="lx-nav" aria-label="Lessons">
          {f.prev ? <LinkBtn href={`/learn/courses/${f.c.id}/${f.prev.id}`} icon={<ArrowLeft size={16} aria-hidden />}>{f.prev.title}</LinkBtn> : <span />}
          {f.next ? <LinkBtn variant="primary" href={`/learn/courses/${f.c.id}/${f.next.id}`}>Next: {f.next.title}</LinkBtn>
            : nextCourse ? <LinkBtn variant="primary" href={`/learn/courses/${nextCourse.id}/${nextCourse.lessons[0].id}`}>Next course: {nextCourse.title}</LinkBtn>
            : <LinkBtn variant="primary" href="/learn">Back to the Academy</LinkBtn>}
        </nav>
        <Fold title={`Other lessons in ${f.c.title}`} count={f.c.lessons.length}>
          <List label={f.c.title}>
            {f.c.lessons.map((l, i) => { const ok = has(`${f.c.id}/${l.id}`); return <Row key={l.id} href={`/learn/courses/${f.c.id}/${l.id}`} tone={ok ? "green" : undefined} icon={ok ? <Check size={16} /> : <span>{i + 1}</span>} title={l.title} meta={`${l.minutes} min${l.id === f.l.id ? " · you are here" : ""}`} />; })}
          </List>
        </Fold>
      </Body>
    </>
  );
}

export function Playground() {
  const [, set] = useState(0);
  return (
    <>
      <Head back="/learn" eyebrow="StrayPaw Academy" title="Playground" sum="Two teaching models to explore freely. They use invented numbers and are never a forecast for a real street, ward or city." />
      <Body>
        <div className="lx-two">
          <Sec title="A model street"><div className="lx-do"><div className="lx-ex"><Exercise id="simulation" onDone={() => set((x) => x + 1)} /></div></div></Sec>
          <Sec title="The precision lens"><div className="lx-do"><div className="lx-ex"><Exercise id="precision" onDone={() => set((x) => x + 1)} /></div></div></Sec>
        </div>
      </Body>
    </>
  );
}
