"use client";

/* Academy: one learning path at a time, with device-local progress, guided
   workshops and the Foundation’s original, credited classroom documents. */

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { KindHourLibrary } from "./KindHourLibrary";
import { COURSES, lessonCount } from "./content";
import { useProgress } from "./progress";
import "./learn.css";
import "./academy-focus.css";

export function Academy() {
  const [selected, setSelected] = useState(0);
  const { has, done, reset } = useProgress();
  const next = COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).find(({ c, l }) => !has(`${c.id}/${l.id}`));
  const n = COURSES.reduce((a, c) => a + c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length, 0);
  return (
    <div className="ac academy-focus">
      <header className="ac-cover">
        <div className="ac-title">
          <p className="k">StrayPaw Academy</p>
          <h1 className="display">Understand the street.<br />Make a useful record.</h1>
          <p className="lede">Learn through short exercises, or lead a group through a guided workshop. No account needed.</p>
          <div className="row">
            {next ? <Link className="btn is-ink" href={`/learn/courses/${next.c.id}/${next.l.id}`}>{n ? "Continue" : "Start"}: {next.l.title} <ArrowRight size={15} aria-hidden /></Link> : <span className="pill is-care">Every lesson done on this device</span>}
            <Link className="btn" href="/learn/workshops">Run a workshop</Link>
          </div>
          <p className="small ac-progress"><b>{n}</b> of {lessonCount} lessons done on this device.{done.length > 0 && <> <button type="button" className="link" onClick={reset}>Clear</button></>}</p>
        </div>
      </header>

      <section className="academy-courses" aria-labelledby="academy-courses-title"><h2 id="academy-courses-title">Choose what to explore.</h2>
        <label className="field"><span className="label">Learning path</span><select className="select" value={selected} onChange={e => setSelected(Number(e.target.value))}>{COURSES.map((c, i) => <option key={c.id} value={i}>{c.title}</option>)}</select></label>
        {COURSES.filter((_, i) => i === selected).map((c) => {
          const d = c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length;
          return (
            <article key={c.id} className="ac-course" style={{ ["--ink" as string]: c.ink }}>
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

      <KindHourLibrary />

      <section className="ac-more">
        <Link href="/learn/workshops" className="ac-door"><p className="k">Workshops</p><h2 className="serif">Run a session</h2><p>Ready session plans built from these lessons, and classroom material from The Kind Hour Foundation, credited and linked.</p></Link>
        <Link href="/learn/resources" className="ac-door"><p className="k">Practice &amp; resources</p><h2 className="serif">Make a useful report</h2><p>Practise describing an animal clearly, get feedback, and find local rescue contacts.</p></Link>
        <Link href="/learn/playground" className="ac-door"><p className="k">Playground</p><h2 className="serif">Try the models</h2><p>The model street and the precision lens, on their own. Illustrative, never a forecast.</p></Link>
      </section>
    </div>
  );
}
