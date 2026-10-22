"use client";

/* ════════════════════════════════════════════════════════════════════
   StrayPaw Academy.

   One clear next lesson and how far you have come, then the four paths
   as tabs: one path open at a time, its lessons in order with what you
   will do in each. Then The Kind Hour Foundation's originals, all on
   show, and the three other ways in: run a workshop, practise a report,
   try the models. Progress stays on this device.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { KindHourLibrary } from "./KindHourLibrary";
import { COURSES, lessonCount, type Interactive } from "./content";
import { useProgress } from "./progress";
import "./learn.css";
import "./academy.css";

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
  const firstOpen = Math.max(0, COURSES.findIndex((c) => c.lessons.some((l) => !has(`${c.id}/${l.id}`))));
  const [tab, setTab] = useState<number | null>(null);
  const sel = tab ?? firstOpen;
  const next = COURSES.flatMap((c) => c.lessons.map((l) => ({ c, l }))).find(({ c, l }) => !has(`${c.id}/${l.id}`));
  const n = COURSES.reduce((a, c) => a + c.lessons.filter((l) => has(`${c.id}/${l.id}`)).length, 0);
  const c = COURSES[sel];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = (sel + d + COURSES.length) % COURSES.length;
    setTab(i);
    document.getElementById(`acx-tab-${i}`)?.focus();
  };

  return (
    <div className="acx">
      <header className="acx-cover">
        <p className="acx-k">StrayPaw Academy</p>
        <h1>Understand the street.{" "}<br />Make a useful record.</h1>
        <p className="acx-lede">Nine short lessons, each with one hands-on exercise. Learn alone, or lead a group through a guided workshop. No account needed.</p>
        <div className="acx-next">
          {next
            ? <Link className="btn is-ink acx-go" href={`/learn/courses/${next.c.id}/${next.l.id}`}><span><small>{n ? "Continue" : "Start here"}</small>{next.l.title}</span><ArrowRight size={18} aria-hidden /></Link>
            : <span className="pill is-care"><Check size={14} aria-hidden /> Every lesson done on this device</span>}
          <Link className="btn" href="/learn/workshops">Run a workshop</Link>
        </div>
        <div className="acx-progress">
          <span className="acx-bar" aria-hidden><i style={{ width: `${(n / lessonCount) * 100}%` }} /></span>
          <p><b>{n}</b> of {lessonCount} lessons done on this device{done.length > 0 && <> · <button type="button" className="link" onClick={reset}>Start over</button></>}</p>
        </div>
      </header>

      <section className="acx-paths" aria-labelledby="acx-paths-title">
        <div className="acx-paths-head">
          <h2 id="acx-paths-title">Learning paths</h2>
          <p>Four paths, nine lessons. Take them in any order.</p>
        </div>
        <div className="acx-tabs" role="tablist" aria-label="Learning paths" onKeyDown={onKey}>
          {COURSES.map((x, i) => {
            const d = x.lessons.filter((l) => has(`${x.id}/${l.id}`)).length;
            return (
              <button key={x.id} id={`acx-tab-${i}`} type="button" role="tab" aria-selected={i === sel} aria-controls="acx-panel" tabIndex={i === sel ? 0 : -1} onClick={() => setTab(i)} style={{ ["--path" as string]: x.ink }}>
                <i aria-hidden />{x.title}<small>{d}/{x.lessons.length}</small>
              </button>
            );
          })}
        </div>
        <div id="acx-panel" role="tabpanel" aria-labelledby={`acx-tab-${sel}`} className="acx-panel" style={{ ["--path" as string]: c.ink }}>
          <div className="acx-panel-intro">
            <h3>{c.title}</h3>
            <p>{c.dek}</p>
            <p className="acx-meta">{c.audience} · {c.lessons.reduce((a, l) => a + l.minutes, 0)} minutes</p>
          </div>
          <ol className="acx-lessons">
            {c.lessons.map((l, i) => {
              const ok = has(`${c.id}/${l.id}`);
              const ex = l.blocks.find((b) => b.kind === "do");
              return (
                <li key={l.id}>
                  <Link href={`/learn/courses/${c.id}/${l.id}`} className={ok ? "is-done" : undefined}>
                    <span className="acx-n" aria-hidden>{ok ? <Check size={15} /> : i + 1}</span>
                    <span className="acx-l"><b>{l.title}</b><small>{l.minutes} min{ex && ex.kind === "do" ? ` · ${ACTIVITY[ex.id]}` : ""}{ok ? " · done" : ""}</small></span>
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <KindHourLibrary />

      <section className="acx-doors" aria-label="More ways to learn">
        <Link href="/learn/workshops"><b>Run a workshop</b><span>Three ready sessions for a class or a volunteer evening, one activity at a time.</span><ArrowUpRight size={20} aria-hidden /></Link>
        <Link href="/learn/resources"><b>Practise a report</b><span>Describe what you saw, get feedback, and find rescue helplines.</span><ArrowUpRight size={20} aria-hidden /></Link>
        <Link href="/learn/playground"><b>Try the models</b><span>The model street and the precision lens on their own. Illustrative, never a forecast.</span><ArrowUpRight size={20} aria-hidden /></Link>
      </section>
    </div>
  );
}
