"use client";

/* The front door of the live demo (demo.straypaw.org opens here): one line of what it shows, one button to start,
   the six stages it walks through, what each status mark means, and every role to explore freely. With ?go=1 it
   signs the visitor in and starts straight away. Off the demonstration site it points there. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { DEMO_SITE } from "@/lib/demo-site";
import { AVAIL, DEMO_ROLES, STAGES, type Avail, type DemoRole } from "./tour";
import { enterAs, leaveFor, writeTour } from "./state";
import "./demo-tour.css";

const GROUP_LABEL = { programme: "Programme", health: "Health", animal: "Animal care", government: "Government" } as const;

export function TryDemo() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const auto = useRef(false);

  const start = useCallback(async () => {
    setErr(null); setBusy("guide");
    const first = STAGES[0];
    const e = await enterAs(first.role);
    if (e) { setErr(e); setBusy(null); return; }
    writeTour({ mode: "guided", step: 0, act: 0, role: first.role, memo: {}, started: Date.now() });
    leaveFor(first.acts[0].path, true);
  }, []);

  const roam = useCallback(async (r: DemoRole) => {
    setErr(null); setBusy(r);
    const e = await enterAs(r);
    if (e) { setErr(e); setBusy(null); return; }
    writeTour({ mode: "roam", step: 0, act: 0, role: r });
    leaveFor(DEMO_ROLES[r].home);
  }, []);

  useEffect(() => {
    if (auto.current || !DEMO_SITE) return;
    auto.current = true;
    if (new URLSearchParams(window.location.search).get("go") === "1") void start();
  }, [start]);

  if (!DEMO_SITE) {
    return (
      <div className="try">
        <p className="try-k">One Health demo</p>
        <h1>The live demo runs on its own site</h1>
        <p className="try-lede">It uses a separate, fictional programme, so nothing you do there touches real records.</p>
        <div className="try-go"><a className="try-start" href="https://demo.straypaw.org/try?go=1">Open the live demo <ArrowRight size={17} aria-hidden /></a><Link className="s4-btn is-line" href="/demo">Book a walkthrough</Link></div>
      </div>
    );
  }

  return (
    <div className="try">
      <p className="try-k">One Health demo · fictional records</p>
      <h1>One Health. One Connected Response.</h1>
      <p className="try-lede">Follow a single dog-bite incident across citizens, healthcare, animal-health teams, municipalities and researchers — coordinated through StrayPaw and Kaju.</p>
      <div className="try-go">
        {/* A link, so it still starts if pressed before the page is interactive (/try?go=1 starts on load). */}
        <a href="/try?go=1" role="button" className="try-start" aria-disabled={!!busy} onClick={(e) => { e.preventDefault(); if (!busy) void start(); }}>{busy === "guide" ? "Opening…" : <>Start Demo <ArrowRight size={17} aria-hidden /></>}</a>
        <small><Clock size={15} aria-hidden /> About five minutes · you work in the real workspaces; a small guide shows where</small>
      </div>
      {err && <p className="try-err" role="alert">{err}</p>}
      <ol className="try-story is-six" aria-label="The six stages">
        {STAGES.map((t, i) => <li key={t.id} style={{ ["--i" as string]: i }}><b>{t.label}</b><small>{t.title}</small></li>)}
      </ol>
      <ul className="try-legend" aria-label="What the marks in the guide mean">
        {(Object.keys(AVAIL) as Avail[]).map((k) => <li key={k} className={`is-${k}`}><b>{AVAIL[k].label}</b><span>{AVAIL[k].note}</span></li>)}
      </ul>
      <h2 className="try-h">Or explore as anyone in the programme</h2>
      <ul className="try-roles">
        {(Object.keys(DEMO_ROLES) as DemoRole[]).map((r) => (
          <li key={r}><button type="button" disabled={!!busy} onClick={() => roam(r)}><em>{GROUP_LABEL[DEMO_ROLES[r].group]}</em><b>{DEMO_ROLES[r].label}</b><small>{busy === r ? "Signing you in…" : DEMO_ROLES[r].who}</small><ArrowRight size={15} aria-hidden /></button></li>
        ))}
      </ul>
      <p className="try-note">Sample accounts on a separate demonstration database. Institutions are named by their role; every person, patient and record is fictional.</p>
    </div>
  );
}
