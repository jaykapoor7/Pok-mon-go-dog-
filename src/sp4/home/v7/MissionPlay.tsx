"use client";

/* The mission preview on the homepage (Mission.tsx gives it the real plan). It plays the way a mission runs in the
   app: the request is sent, Kaju's plan arrives step by step with who is responsible for each, Kaju does its own
   steps, and the step that changes several records waits for a person. Here that person is the visitor: nothing
   after it happens until they press Approve. Every part keeps its place from the first frame, so nothing below moves
   while it plays. Under reduced motion it rests, without timers, at the approval. */

import { useEffect, useRef, useState } from "react";
import { Check, Hand, RotateCcw, Sparkles } from "lucide-react";

export type MissionStep = { label: string; who: string; how: string; waits: boolean; body?: string };

/* 0 request · 1 plan · 2 step one working · 3 waiting for approval · 4 step two working · 5 step three working · 6 completed */
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const NEXT: Partial<Record<Phase, [Phase, number]>> = { 0: [1, 900], 1: [2, 1500], 2: [3, 1100], 4: [5, 900], 5: [6, 800] };
const CASES: [string, string, string][] = [
  ["SP-1042", "Brown female, market gate", "Second dose · Thu"],
  ["SP-1067", "Black male, bus depot", "Post-op check · Wed"],
  ["SP-1071", "Sheru, temple lane", "Wound check · Fri"],
  ["SP-1088", "Tan female, school road", "Second dose · Sat"],
];
const EVENTS: [Phase, string, string][] = [
  [2, "Kaju", "found 4 cases due a follow-up this week"],
  [3, "Kaju", "is waiting for your approval to create 4 tasks"],
  [4, "You", "approved step 2"],
  [5, "Kaju", "created 4 follow-up tasks for the field team"],
  [6, "Kaju", "posted in #field-ops"],
];

const stepState = (i: number, p: Phase) => {
  if (p < 2) return "todo";
  if (i === 0) return p === 2 ? "running" : "done";
  if (i === 1) return p < 3 ? "todo" : p === 3 ? "waiting" : p === 4 ? "running" : "done";
  return p < 5 ? "todo" : p === 5 ? "running" : "done";
};
const STEP_WORD: Record<string, string> = { todo: "Up next", running: "Working", done: "Done", waiting: "Waiting for your approval" };

export function MissionPlay({ request, title, steps }: { request: string; title: string; steps: MissionStep[] }) {
  /* The server renders the resting point (the approval), so the page reads whole without script. */
  const [p, setP] = useState<Phase>(3);
  const [calm, setCalm] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  /* How many times it has been played (0: not yet). */
  const [run, setRun] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(reduce);
    if (reduce || !("IntersectionObserver" in window) || !box.current) return;
    const el = box.current;
    /* Off screen, it waits at the request; it plays once it is mostly in view. */
    if (el.getBoundingClientRect().top > window.innerHeight) setP(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setP(0); setRun(1); io.disconnect();
    }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (calm || !run) return;
    const n = NEXT[p];
    if (!n) return;
    const t = window.setTimeout(() => setP(n[0]), n[1]);
    return () => window.clearTimeout(t);
  }, [p, calm, run]);

  /* The button folds away once pressed, so focus moves to the mission itself rather than being lost. */
  const approve = () => { setP(calm ? 6 : 4); box.current?.focus({ preventScroll: true }); };
  const replay = () => { setRun((r) => r + 1); setP(calm ? 3 : 0); };
  const word = p === 6 ? "Completed" : p === 3 ? "Waiting for you" : p === 0 ? "Draft" : "Working";
  const tone = p === 6 ? "ok" : p === 3 ? "warn" : "accent";

  return (
    <div ref={box} className="s9-room" data-phase={p} data-calm={calm || undefined} tabIndex={-1}>
      <div className="s9-room-bar">
        <span className="s9-room-k" aria-hidden><Sparkles size={14} /></span>
        <b>Kaju</b><span className="s9-room-crumb">Missions</span>
        <span className={`s9-room-state t-${tone}`} aria-live="polite"><i aria-hidden />{word}</span>
      </div>

      <div className="s9-room-ask">
        <span className="s9-av" aria-hidden>M</span>
        <p><b>Meena</b>{request}</p>
      </div>

      <div className="s9-room-body">
        <div className="s9-plan" aria-label="The plan">
          <p className="s9-h">{title}<small>Planned by fixed rules</small></p>
          <ol>
            {steps.map((s, i) => {
              const st = stepState(i, p);
              return (
                <li key={s.label} className={`s9-step is-${st}`} style={{ ["--i" as string]: i }} data-shown={p >= 1 || undefined}>
                  <span className="s9-glyph" aria-hidden>{st === "done" ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                  <span className="s9-step-t">
                    <b>{s.label}</b>
                    <span className={`s9-duty${s.waits ? " is-you" : ""}`}>{s.waits ? <Hand size={12} aria-hidden /> : <span className="s9-duty-k" aria-hidden>K</span>}{s.who}<small>{s.how}</small></span>
                  </span>
                  <span className="s9-step-w">{STEP_WORD[st]}</span>
                </li>
              );
            })}
          </ol>
          {/* Kept in place until the visitor approves (so nothing below moves while it plays), then folded away. */}
          <div className="s9-approve" data-on={p === 3 || undefined} hidden={p >= 4}>
            <p>Create 4 follow-up tasks for the field team?</p>
            <button type="button" className="s9-btn" onClick={approve} disabled={p !== 3} tabIndex={p === 3 ? 0 : -1}>Approve <Check size={14} aria-hidden /></button>
          </div>
        </div>

        <div className="s9-live" aria-label="What each step made">
          <article className="s9-tile" data-on={p >= 3 || undefined}>
            <p className="s9-tile-h"><span>1</span>Cases due this week</p>
            <ul>{CASES.map(([c, a, d], k) => <li key={c} style={{ ["--k" as string]: k }}><b>{c}</b><span>{a}</span><em>{d}</em></li>)}</ul>
          </article>
          <article className="s9-tile" data-on={p >= 5 || undefined}>
            <p className="s9-tile-h"><span>2</span>Tasks</p>
            <p className="s9-tile-big"><b>4</b> follow-up tasks<small>Assigned to the field team, due by Saturday</small></p>
          </article>
          <article className="s9-tile" data-on={p >= 6 || undefined}>
            <p className="s9-tile-h"><span>3</span>#field-ops</p>
            <p className="s9-msg"><span className="s9-av is-k" aria-hidden>K</span>{steps[2]?.body}</p>
          </article>
        </div>
      </div>

      <div className="s9-room-foot">
        <ol className="s9-log" aria-label="Activity">
          {EVENTS.map(([at, who, what]) => <li key={what} data-on={p >= at || undefined}><b>{who}</b> {what}</li>)}
        </ol>
        <div className="s9-sum" data-on={p === 6 || undefined}>
          <p><Check size={14} strokeWidth={3} aria-hidden /> <b>Done.</b> 4 tasks for the field team, 1 message in #field-ops. Every step is in the mission&rsquo;s history.</p>
          <button type="button" className="s9-replay" onClick={replay} tabIndex={p === 6 ? 0 : -1} aria-label="Play the mission again"><RotateCcw size={14} aria-hidden /> Again</button>
        </div>
      </div>
      <p className="s9-note">Illustrative records. The plan and who decides each step are what StrayPaw makes for this request today.</p>
    </div>
  );
}
