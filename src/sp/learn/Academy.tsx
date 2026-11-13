"use client";

/* ════════════════════════════════════════════════════════════════════
   StrayPaw Academy.

   One clear next lesson and how far you have come, then the four paths
   as tabs: one path open at a time, its lessons in order with what you
   will do in each. Then The Kind Hour Foundation's originals, all on
   show, and the three other ways in: run a workshop, practise a report,
   try the models. Progress stays on this device.
   ════════════════════════════════════════════════════════════════════ */

import { ArrowRight, Check } from "lucide-react";
import { Btn, Head, Page, Panel, Row, Rows, Section, Tag } from "@/ws/kit";
import { KindHourLibrary } from "./KindHourLibrary";
import { COURSES, lessonCount, type Interactive } from "./content";
import { useProgress } from "./progress";
import "./learn.css";

/** What the reader actually does in each lesson's exercise. */
const ACTIVITY: Record<Interactive, string> = {
  "unknown-ledger": "Sort a street",
  precision: "Compare four placements",
  units: "Name the unit",
  encounter: "Choose your move",
  "bite-order": "Put steps in order",
  observe: "Seen or assumed?",
  simulation: "Run a model street",
  denominator: "Test the claims",
  "practice-report": "Write a practice report",
};

export function Academy() {
  const { has, done, reset } = useProgress();
  const next = COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).find(({ c, l }) => !has(`${c.id}/${l.id}`));
  const n = COURSES.reduce((a, c) => a + c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length, 0);

  /* The sentence says how far you are and what is next; each path is a short list of lessons with its own small meter. */
  return (
    <Page>
      <Head title="Academy"
        sum={<><b>{n}</b> of {lessonCount} lessons done on this device. {next ? <>Next: {next.l.title}.</> : "Every lesson is done."} Each lesson is short and has one hands-on exercise. No account needed.</>}
        actions={<>
          <Btn href="/learn/workshops">Run a workshop</Btn>
          {next ? <Btn variant="primary" href={`/learn/courses/${next.c.id}/${next.l.id}`} icon={<ArrowRight size={14} />}>{n ? "Continue" : "Start here"}</Btn> : null}
        </>} />
      <p className="lrn-meter is-wide" role="img" aria-label={`${n} of ${lessonCount} lessons done`}><i style={{ width: `${(n / lessonCount) * 100}%` }} />{done.length > 0 && <button type="button" onClick={reset}>Start over</button>}</p>

      <div className="lrn-paths">
        {COURSES.map((c) => {
          const d = c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length;
          return (
            <Section key={c.id} title={c.title} note={`${c.audience} · ${c.lessons.reduce((a, l) => a + l.minutes, 0)} minutes`}
              action={<span className="lrn-prog"><span className="lrn-meter" aria-hidden><i style={{ width: `${(d / c.lessons.length) * 100}%` }} /></span>{d} of {c.lessons.length}</span>}>
              <Panel><Rows label={c.title}>
                {c.lessons.map((l, i) => {
                  const ok = has(`${c.id}/${l.id}`);
                  const ex = l.blocks.find((b) => b.kind === "do");
                  return <Row key={l.id} href={`/learn/courses/${c.id}/${l.id}`} tone={ok ? "green" : undefined} icon={ok ? <Check size={14} /> : <span className="lrn-num">{i + 1}</span>} title={l.title}
                    meta={`${l.minutes} min${ex && ex.kind === "do" ? ` · ${ACTIVITY[ex.id]}` : ""}`} end={ok ? <Tag tone="green">Done</Tag> : undefined} />;
                })}
              </Rows></Panel>
            </Section>
          );
        })}
      </div>

      <Section title="More ways to learn">
        <Panel><Rows>
          <Row href="/learn/workshops" title="Run a workshop" meta="Three ready sessions for a class or a volunteer evening, one activity at a time." />
          <Row href="/learn/resources" title="Practise a report" meta="Describe what you saw, get feedback, and find rescue helplines." />
          <Row href="/learn/playground" title="Try the models" meta="The model street and the precision lens on their own. Illustrative, never a forecast." />
        </Rows></Panel>
      </Section>

      <KindHourLibrary />
    </Page>
  );
}
