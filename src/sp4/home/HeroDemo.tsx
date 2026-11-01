"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp, Bell, Camera, Check, ChevronLeft, ClipboardCheck, FileText, Home, Inbox, ListChecks,
  MoreHorizontal, Pause, Play, Sparkles, Stethoscope, TriangleAlert, Users,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   The hero product demo, built on the reference's mechanism: a scripted
   story that plays inside the app window while a team chat on the phone
   moves in step with it.

     0 · Home          the coordinator's daily brief; a request is typed
     1 · Kaju   the evidence check runs: chart, ring, steps
     2 · Run result    what it found; the cursor opens the package
     3 · Package       the report package for the reviewing office

   Illustrative records, labelled as a product demo. Loops while on screen,
   pauses off screen and when the tab is hidden, has Pause/Play (WCAG
   2.2.2) and holds still for people who prefer reduced motion.
   ════════════════════════════════════════════════════════════════════ */

const SCENES = [5600, 5200, 4200, 5000];
const TOTAL = SCENES.reduce((a, b) => a + b, 0);
const START = SCENES.map((_, i) => SCENES.slice(0, i).reduce((a, b) => a + b, 0));
const PROMPT = "Find releases missing a photo and draft Friday's package";
const TABS = ["Home", "Kaju", "Run result", "Report package"];

type Msg = { at: number; who: "ravi" | "anita" | "ai"; text?: ReactNode; photos?: number; file?: string };
const THREAD: Msg[] = [
  { at: 300, who: "ravi", text: "Brown female at the market gate, limping on the back left leg. Not ear-notched." },
  { at: 1400, who: "ravi", photos: 2 },
  { at: 2600, who: "ai", text: "Draft record prepared. Waiting for review." },
  { at: 4600, who: "anita", text: <><u>@StrayPaw</u> which releases this week still need a photo?</> },
  { at: 6400, who: "ai", text: "Three of eighteen: SP-1031, SP-1044 and SP-1067." },
  { at: 8800, who: "ravi", text: "On it. Sending SP-1031 now." },
  { at: 10200, who: "ravi", photos: 1 },
  { at: 11600, who: "ai", text: "Release photo added to SP-1031. Two still missing." },
  { at: 15000, who: "anita", text: <><u>@StrayPaw</u> draft Friday&apos;s package</> },
  { at: 16400, who: "ai", text: "Package ready for your review.", file: "Ward 14 · October package" },
];
const NAME = { ravi: "Ravi", anita: "Anita", ai: "Kaju" } as const;

function useClock(run: boolean) {
  const [t, setT] = useState(0);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!run) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current != null) setT((v) => (v + (now - last.current!)) % TOTAL);
      last.current = now; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return [t, setT] as const;
}

export function HeroDemo() {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(true);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    const el = box.current;
    const io = el && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.2 }) : null;
    if (el && io) io.observe(el);
    return () => { document.removeEventListener("visibilitychange", on); io?.disconnect(); };
  }, []);
  const [t, setT] = useClock(seen && visible && !paused && !still);
  const scene = still ? 0 : START.reduce((acc, s, i) => (t >= s ? i : acc), 0);
  const local = still ? 99999 : t - START[scene];
  const chat = still ? 99999 : t;

  return (
    <div ref={box} className="s4d" role="group" aria-label="Product demo: a coordinator's day in StrayPaw, with the field team's chat">
      <div className="s4d-win">
        <aside className="s4d-side" aria-hidden>
          <div className="s4d-org"><span className="s4d-orgmark">W</span><b>Ward 14 ABC Unit</b></div>
          <span className="s4d-quick">Quick actions <kbd>⌘K</kbd></span>
          <ul className="s4d-nav">
            <li className={scene === 0 ? "is-on" : ""}><Home size={14} />Home</li>
            <li><Bell size={14} />Notifications<em>5</em></li>
            <li><ListChecks size={14} />Tasks</li>
          </ul>
          <small>Modules</small>
          <ul className="s4d-nav">
            <li><Sq c="flame"><Inbox size={11} /></Sq>Intake</li>
            <li><Sq c="blue"><ListChecks size={11} /></Sq>Animals</li>
            <li><Sq c="teal"><Stethoscope size={11} /></Sq>Treatment</li>
            <li><Sq c="amber"><Camera size={11} /></Sq>Evidence</li>
            <li className={scene === 2 ? "is-on" : ""}><Sq c="violet"><ClipboardCheck size={11} /></Sq>Review</li>
            <li className={scene === 3 ? "is-on" : ""}><Sq c="green"><FileText size={11} /></Sq>Reports</li>
          </ul>
          <small>Platform</small>
          <ul className="s4d-nav">
            <li className={scene === 1 ? "is-on" : ""}><Sq c="ink"><Sparkles size={11} /></Sq>Kaju</li>
            <li><Sq c="slate"><Users size={11} /></Sq>Team</li>
          </ul>
        </aside>
        <div className="s4d-main">
          <div className="s4d-tabs" aria-hidden><span className="is-on">{TABS[scene]}</span><span>+</span></div>
          <div className="s4d-banner">Product demo · illustrative records, not live programme data</div>
          <div className="s4d-stage" aria-live="off">
            {scene === 0 && <SceneHome t={local} />}
            {scene === 1 && <SceneRun t={local} />}
            {scene === 2 && <SceneResult t={local} />}
            {scene === 3 && <ScenePackage t={local} />}
          </div>
        </div>
      </div>
      <Phone t={chat} />
      {!still && (
        <div className="s4d-ctrl">
          {TABS.map((x, i) => <button key={x} type="button" aria-label={`Show: ${x}`} aria-pressed={scene === i} onClick={() => setT(START[i] + 1)} />)}
          <button type="button" className="s4d-pp" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play the demo" : "Pause the demo"}>{paused ? <Play size={12} /> : <Pause size={12} />}</button>
        </div>
      )}
    </div>
  );
}

function Sq({ c, children }: { c: string; children: ReactNode }) { return <span className={`s4u-sq c-${c}`}>{children}</span>; }

/* ── 0 · the daily brief, with the request being typed ───────────── */
function SceneHome({ t }: { t: number }) {
  const typed = PROMPT.slice(0, Math.max(0, Math.min(PROMPT.length, Math.floor((t - 2200) / 38))));
  const sent = t > 2200 + PROMPT.length * 38 + 500;
  const rows: [string, ReactNode, string][] = [
    ["flame", <><b>Pickup request from the field</b> · brown female, market gate</>, "Draft · review"],
    ["teal", <><b>Dr. Rao</b> authorised 12 sterilisations from the 30 Oct list</>, "Vet-authorised"],
    ["amber", <><b>3 releases</b> are missing a release photo</>, "Evidence"],
    ["violet", <><b>SP-1042 and SP-1067</b> may be the same animal</>, "Check"],
  ];
  return (
    <div className="s4d-brief">
      <p className="s4d-hello s4d-fade">Good morning, Anita.<span>Here is your daily brief.</span></p>
      <p className="s4d-since s4d-fade" style={{ animationDelay: "120ms" }}>Since yesterday: <b>18 animals</b> were released in Ward 14, <b>3 records</b> are missing a release photo, and <b>Friday&apos;s package</b> for the reviewing office is due in two days.</p>
      <p className="s4d-h">Recent activity</p>
      <ul className="s4d-list">{rows.map(([c, x, tag], i) => (
        <li key={i} className="s4d-pop" style={{ animationDelay: `${300 + i * 140}ms` }}><span className={`s4u-sq c-${c}`} /><span>{x}</span><em className={`s4-tag ${c === "teal" ? "is-green" : c === "amber" ? "" : c === "violet" ? "is-violet" : "is-amber"}`}>{tag}</em></li>
      ))}</ul>
      <div className={`s4d-ask${typed ? " is-typing" : ""}`}>
        <Sparkles size={14} />
        <span>{typed || <i>Ask Kaju anything about your programme…</i>}{typed && !sent && <b className="s4d-caret" />}</span>
        <span className={`s4d-go${sent ? " is-sent" : ""}`}><ArrowUp size={13} /></span>
      </div>
    </div>
  );
}

/* ── 1 · the run: chart draws, ring counts, steps stream in ─────── */
function SceneRun({ t }: { t: number }) {
  const pct = Math.min(86, Math.round((Math.min(t, 2200) / 2200) * 86));
  const steps = ["Read 164 Ward 14 records", "Matched releases to capture wards", "Found 3 releases missing a photo", "Flagged 1 possible duplicate", "Drafted Friday's report package"];
  const shown = Math.min(steps.length, Math.floor((t - 600) / 650) + 1);
  const pts = [12, 18, 15, 22, 19, 26, 24, 31, 28, 35, 33, 38];
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"} ${i * (300 / (pts.length - 1))} ${60 - y}`).join(" ");
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="s4d-run">
      <div className="s4d-run-head s4d-fade"><div><b>Weekly evidence check</b><small>Kaju · Ward 14 · started by Anita</small></div><span className="s4-tag is-blue">Running</span></div>
      <div className="s4d-run-grid">
        <div className="s4d-card s4d-pop">
          <p className="s4d-card-h">Records checked per day</p>
          <svg viewBox="0 0 300 64" className="s4d-chart" aria-hidden><path d={d} pathLength={1} style={{ strokeDashoffset: Math.max(0, 1 - t / 1800) }} /></svg>
          <div className="s4d-legend"><span><i className="is-green" />Complete</span><span><i className="is-amber" />Needs attention</span></div>
        </div>
        <div className="s4d-card s4d-pop s4d-ring" style={{ animationDelay: "120ms" }}>
          <svg viewBox="0 0 80 80" width="88" height="88" aria-hidden><circle cx="40" cy="40" r={r} fill="none" stroke="#e7e9ef" strokeWidth="8" /><circle cx="40" cy="40" r={r} fill="none" stroke="var(--s4-blue)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 40 40)" /></svg>
          <b>{pct}%</b><small>evidence complete</small>
        </div>
      </div>
      <ul className="s4d-steps">{steps.slice(0, Math.max(0, shown)).map((s, i) => (
        <li key={s} className="s4d-pop">{i < shown - 1 || t > 4200 ? <span className="s4-check"><Check size={10} strokeWidth={3} /></span> : <span className="s4d-spin" />}{s}<time>09:0{2 + Math.floor(i / 2)}</time></li>
      ))}</ul>
    </div>
  );
}

/* ── 2 · the result; the cursor opens the package ───────────────── */
function SceneResult({ t }: { t: number }) {
  const click = t > 2600;
  return (
    <div className="s4d-res">
      <div className="s4d-run-head s4d-fade"><div><b>Run result · Ward 14 · week 44</b><small>Finished 09:04 · 164 records read</small></div><span className="s4-tag is-green">Complete</span></div>
      <ul className="s4d-ex">
        {[["SP-1031", "Release photo added by Ravi", "Resolved", "is-green"], ["SP-1044", "Release photo missing", "Request sent", "is-amber"], ["SP-1067", "Release photo missing; possible duplicate of SP-1042", "Decide", "is-violet"]].map(([a, b, c, k], i) => (
          <li key={a} className="s4d-pop" style={{ animationDelay: `${i * 140}ms` }}><span className="s4d-id">{a}</span><span>{b}</span><span className={`s4-tag ${k}`}>{c}</span></li>
        ))}
      </ul>
      <div className={`s4d-file s4d-pop${click ? " is-click" : ""}`} style={{ animationDelay: "500ms" }}>
        <span className="s4u-sq c-green"><FileText size={11} /></span>
        <span><b>Report package · Ward 14 · October</b><small>Summary, evidence index, vet authorisations, exceptions log</small></span>
        <span className="s4-tag">Draft</span>
      </div>
      <span className={`s4d-cursor${t > 900 ? " is-moving" : ""}${click ? " is-click" : ""}`} aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 2l15 9-7 1.5L8.5 20z" fill="#0b1e3d" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </span>
    </div>
  );
}

/* ── 3 · the package for the reviewing office ───────────────────── */
function ScenePackage({ t }: { t: number }) {
  const n = (v: number) => Math.round(v * Math.min(1, t / 1400));
  return (
    <div className="s4d-pkg s4d-fade">
      <div className="s4d-pkg-side" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={i === 0 ? "is-on" : ""}><i /><i /><i /></span>)}</div>
      <div className="s4d-pkg-page">
        <p className="s4d-kicker">ABC programme report</p>
        <p className="s4d-pkg-title">Ward 14 ABC drive · October 2026</p>
        <p className="s4d-pkg-sub">Prepared for the reviewing office · every figure links to its records</p>
        <div className="s4d-kpis">
          <div><small>Sterilised</small><b>{n(142)}</b></div>
          <div><small>Vaccinated</small><b>{n(139)}</b></div>
          <div><small>Released</small><b>{n(131)}</b></div>
          <div><small>Exceptions</small><b>{n(4)}</b><em>each explained</em></div>
        </div>
        <p className="s4d-pkg-foot"><Sparkles size={11} /> Prepared by Kaju · confirmed by Anita, coordinator · not yet submitted</p>
      </div>
    </div>
  );
}

/* ── the phone: the field team's thread, in step with the window ── */
function Phone({ t }: { t: number }) {
  const list = useRef<HTMLDivElement>(null);
  const shown = THREAD.filter((m) => m.at <= t);
  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [shown.length]);
  return (
    <div className="s4d-phone" aria-hidden>
      <div className="s4d-ph-status"><span>9:41</span><span className="s4d-notch" /><span>●●●</span></div>
      <div className="s4d-ph-top"><ChevronLeft size={14} /><span className="s4d-av">W</span><span><b>Ward 14 field team</b><small>5 members · StrayPaw field mode</small></span><MoreHorizontal size={14} /></div>
      <div className="s4d-ph-tabs"><span className="is-on">Chat</span><span>Cases</span><span>Map</span></div>
      <div ref={list} className="s4d-thread">
        {shown.map((m, i) => (
          <div key={i} className={`s4d-msg is-${m.who}`}>
            {(i === 0 || shown[i - 1].who !== m.who) && <span className="s4d-who">{m.who === "ai" && <Sparkles size={10} />}{NAME[m.who]}</span>}
            {m.text && <p>{m.text}</p>}
            {m.photos && <span className="s4d-photos">{Array.from({ length: m.photos }).map((_, k) => <i key={k} className={`p${k}`} />)}</span>}
            {m.file && <span className="s4d-chip"><FileText size={11} />{m.file}</span>}
          </div>
        ))}
        {THREAD.some((m) => m.at > t && m.at - t < 900) && <div className="s4d-typing"><i /><i /><i /></div>}
      </div>
      <div className="s4d-ph-bar"><span>Message the team…</span><span className="s4d-go"><ArrowUp size={12} /></span></div>
      <p className="s4d-ph-note"><TriangleAlert size={10} /> Demo · WhatsApp not connected</p>
    </div>
  );
}
