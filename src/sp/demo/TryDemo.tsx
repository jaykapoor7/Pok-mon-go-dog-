"use client";

/* Entry to the live demo: the story in one line of chapters, one button to
   start it, and every role to explore freely. With ?go=1 (the website's
   "Explore live demo") it signs the visitor in and starts the story
   straight away. Off the demonstration site it points there. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { DEMO_SITE } from "@/lib/demo-site";
import { DEMO_ROLES, TOUR, type DemoRole } from "./tour";
import { enterAs, writeTour } from "./state";
import "./demo-tour.css";

const GROUP_LABEL = { programme: "Programme", health: "Health", animal: "Animal care", government: "Government" } as const;

export function TryDemo() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const auto = useRef(false);

  const start = useCallback(async () => {
    setErr(null); setBusy("guide");
    const e = await enterAs(TOUR[0].role);
    if (e) { setErr(e); setBusy(null); return; }
    writeTour({ mode: "guided", step: 0, role: TOUR[0].role });
    window.location.replace(TOUR[0].path);
  }, []);

  const roam = useCallback(async (r: DemoRole) => {
    setErr(null); setBusy(r);
    const e = await enterAs(r);
    if (e) { setErr(e); setBusy(null); return; }
    writeTour({ mode: "roam", step: 0, role: r });
    window.location.assign(DEMO_ROLES[r].home);
  }, []);

  useEffect(() => {
    if (auto.current || !DEMO_SITE) return;
    auto.current = true;
    if (new URLSearchParams(window.location.search).get("go") === "1") void start();
  }, [start]);

  if (!DEMO_SITE) {
    return (
      <div className="try">
        <p className="try-k">Live demo</p>
        <h1>The live demo runs on its own site</h1>
        <p className="try-lede">It uses a separate sample programme, so nothing you do there touches real programme records.</p>
        <div className="try-go"><a className="try-start" href="https://demo.straypaw.org/try?go=1">Open the live demo <ArrowRight size={17} aria-hidden /></a><Link className="s4-btn is-line" href="/demo">Book a walkthrough</Link></div>
      </div>
    );
  }

  return (
    <div className="try">
      <p className="try-k">Live demo · illustrative data</p>
      <h1>See StrayPaw at work.</h1>
      <p className="try-lede">Eight real screens, one after another: the NGO, the hospital, the laboratory, the programme and the municipal office. Look around each as long as you like.</p>
      <div className="try-go">
        {/* A link, so it still starts the story if pressed before the page is interactive (/try?go=1 starts on load). */}
        <a href="/try?go=1" role="button" className="try-start" aria-disabled={!!busy} onClick={(e) => { e.preventDefault(); if (!busy) void start(); }}>{busy === "guide" ? "Opening…" : <>Start the tour <ArrowRight size={17} aria-hidden /></>}</a>
        <small><Clock size={15} aria-hidden /> About two minutes · every record is illustrative</small>
      </div>
      {err && <p className="try-err" role="alert">{err}</p>}
      <ol className="try-story" aria-label="The stops">
        {TOUR.map((t, i) => <li key={t.chapter} style={{ ["--i" as string]: i }}><b>{t.chapter}</b><small>{t.title}</small></li>)}
      </ol>
      <h2 className="try-h">Or explore as anyone in the programme</h2>
      <ul className="try-roles">
        {(Object.keys(DEMO_ROLES) as DemoRole[]).map((r) => (
          <li key={r}><button type="button" disabled={!!busy} onClick={() => roam(r)}><em>{GROUP_LABEL[DEMO_ROLES[r].group]}</em><b>{DEMO_ROLES[r].label}</b><small>{busy === r ? "Signing you in…" : DEMO_ROLES[r].who}</small><ArrowRight size={15} aria-hidden /></button></li>
        ))}
      </ul>
      <p className="try-note">Sample accounts on a separate demonstration database. Institutions are named by their role; no record describes a real person.</p>
    </div>
  );
}
