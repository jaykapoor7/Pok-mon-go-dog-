"use client";

/* Entry to the live demo. With ?go=1 (the landing page's button) it signs the
   visitor in and starts the guide straight away; otherwise it offers the
   guide or a role to roam as. Off the demonstration site it points there. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Compass } from "lucide-react";
import { DEMO_SITE } from "@/lib/demo-site";
import { DEMO_ROLES, TOUR, type DemoRole } from "./tour";
import { enterAs, writeTour } from "./state";
import "./demo-tour.css";

export function TryDemo() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const auto = useRef(false);

  const start = useCallback(async () => {
    setErr(null); setBusy("guide");
    /* Start with the connected programme; where its sample accounts are not
       set up, start at the first step whose account signs in. */
    let i = 0, e = await enterAs(TOUR[0].role);
    if (e) { const alt = TOUR.findIndex((t) => !t.role.startsWith("oh-")); if (alt > 0) { const e2 = await enterAs(TOUR[alt].role); if (!e2) { i = alt; e = null; } } }
    if (e) { setErr(e); setBusy(null); return; }
    writeTour({ mode: "guided", step: i, role: TOUR[i].role });
    window.location.replace(TOUR[i].path);
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
        <h1 className="s4-h1">The live demo runs on its own site</h1>
        <p className="s4-lede">It uses a separate sample workspace, so nothing you do there touches real programme records.</p>
        <div className="s4-actions"><a className="s4-btn is-primary" href="https://demo.straypaw.org/try?go=1">Open the live demo</a><Link className="s4-btn is-line" href="/demo">Book a walkthrough</Link></div>
      </div>
    );
  }

  return (
    <div className="try">
      <p className="try-k">Live demo</p>
      <h1 className="s4-h1">See StrayPaw, one role at a time</h1>
      <p className="s4-lede">A guided walkthrough of an illustrative Bengaluru programme: the coordination cell, a hospital, the field team and the laboratory on one record, then the ABC work the municipal office reviews.</p>
      <div className="try-go">
        {/* A link, so it still starts the guide if pressed before the page is interactive (/try?go=1 starts on load). */}
        <a href="/try?go=1" role="button" className="s4-btn is-primary" aria-disabled={!!busy} onClick={(e) => { e.preventDefault(); if (!busy) void start(); }}>{busy === "guide" ? "Signing you in…" : <>Start the guided demo <ArrowRight size={16} aria-hidden /></>}</a>
        <span><Compass size={15} aria-hidden /> {TOUR.length} steps, about five minutes. Every record is illustrative.</span>
      </div>
      {err && <p className="try-err" role="alert">{err}</p>}
      <h2 className="try-h">Or explore as</h2>
      <ul className="try-roles">
        {(Object.keys(DEMO_ROLES) as DemoRole[]).map((r) => (
          <li key={r}><button type="button" disabled={!!busy} onClick={() => roam(r)}><b>{DEMO_ROLES[r].label}</b><small>{busy === r ? "Signing you in…" : DEMO_ROLES[r].who}</small><ArrowRight size={15} aria-hidden /></button></li>
        ))}
      </ul>
    </div>
  );
}
