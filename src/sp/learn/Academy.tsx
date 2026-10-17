"use client";

/* ════════════════════════════════════════════════════════════════════
   Education · Learn: the Academy home (decision 032).

   A syllabus spread, not a course-card grid: four courses side by side,
   each a numbered column of lessons in its own ink, with what this device
   has completed ticked and one "continue" action. Progress is kept on the
   device only. Partner material is credited where it is used (Workshops,
   Resources), never folded into StrayPaw's own lessons.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ArtSlot } from "../ui";
import { COURSES, lessonCount } from "./content";
import { useProgress } from "./progress";
import "./learn.css";

export function Academy() {
  const { has, done, reset } = useProgress();
  const next = COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).find(({ c, l }) => !has(`${c.id}/${l.id}`));
  const n = COURSES.reduce((a, c) => a + c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length, 0);
  return (
    <div className="ac">
      <header className="ac-cover sheet">
        <div className="ac-title">
          <p className="k">Education · StrayPaw Learning Academy</p>
          <h1 className="display">Learn to read the street, and the record</h1>
          <p className="lede">Short lessons with something to do in each: what a map of animals can honestly say, how to stay safe, how populations change, and how to report well. Free, no account, nothing you do here is sent anywhere.</p>
          <div className="row">
            {next ? <Link className="btn is-ink" href={`/learn/courses/${next.c.id}/${next.l.id}`}>{n ? "Continue" : "Start"}: {next.l.title} <ArrowRight size={15} aria-hidden /></Link> : <span className="pill is-care">Every lesson done on this device</span>}
            <Link className="btn" href="/learn/workshops">Plan a workshop</Link>
          </div>
          <p className="small ac-progress"><b>{n}</b> of {lessonCount} lessons done on this device.{done.length > 0 && <> <button type="button" className="link" onClick={reset}>Clear</button></>}</p>
        </div>
        <ArtSlot id="academy-cover" />
      </header>

      <div className="selvedge" aria-hidden />
      <section className="ac-spread" aria-label="Courses">
        {COURSES.map((c, ci) => {
          const d = c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length;
          return (
            <article key={c.id} className="ac-course" style={{ ["--ink" as string]: c.ink }}>
              <ArtSlot id="academy-cover" variant={ci + 1} className="ac-art" />
              <p className="ac-num serif" aria-hidden>{ci + 1}</p>
              <h2 className="serif">{c.title}</h2>
              <p className="ac-dek">{c.dek}</p>
              <p className="small">{c.audience} · {c.lessons.reduce((a, l) => a + l.minutes, 0)} min · {d}/{c.lessons.length} done</p>
              <ol className="ac-lessons">
                {c.lessons.map((l, li) => {
                  const ok = has(`${c.id}/${l.id}`);
                  return <li key={l.id}><Link href={`/learn/courses/${c.id}/${l.id}`} className={ok ? "is-done" : ""}><span className="ac-tick" aria-hidden>{ok ? <Check size={13} /> : li + 1}</span><span><b>{l.title}</b><small>{l.minutes} min{ok ? " · done" : ""}</small></span></Link></li>;
                })}
              </ol>
            </article>
          );
        })}
      </section>

      <section className="ac-more">
        <Link href="/learn/workshops" className="ac-door"><p className="k">Workshops</p><h2 className="serif">Run a session</h2><p>Ready session plans built from these lessons, and classroom material from The Kind Hour Foundation, credited and linked.</p></Link>
        <Link href="/learn/resources" className="ac-door"><p className="k">Resources</p><h2 className="serif">Know where to turn</h2><p>Rescue helplines, what to do after a bite, education partners and printable cards.</p></Link>
        <Link href="/learn/playground" className="ac-door"><p className="k">Playground</p><h2 className="serif">Try the models</h2><p>The model street and the precision lens, on their own. Illustrative, never a forecast.</p></Link>
      </section>
    </div>
  );
}
