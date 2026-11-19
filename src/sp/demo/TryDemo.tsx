"use client";

/* The front door of the live demo (demo.straypaw.org opens here). A page of its own, not the marketing site: it says
   plainly that this is StrayPaw's demo, what one sentence of it shows, one button to start, the six stops as a route,
   and one row of workspaces to open directly. With ?go=1 it signs the visitor in and starts straight away. Off the
   demonstration site it points there. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, Landmark, MessageCircle, PawPrint, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";
import { DEMO_SITE } from "@/lib/demo-site";
import { DEMO_ROLES, DEMO_SHOWN, SHOWN_LABEL, STAGES, type DemoRole } from "./tour";
import { enterAs, leaveFor, writeTour } from "./state";
import "./demo-tour.css";
import "./demo-landing.css";

const STOP: Record<string, LucideIcon> = { citizen: MessageCircle, hospital: Stethoscope, animal: PawPrint, kaju: Sparkles, municipality: Landmark, consortium: Activity };
const ROLE_ICON: Record<string, LucideIcon> = { "oh-clinician": Stethoscope, "oh-ngo": PawPrint, "oh-municipal": Landmark, "oh-programme": Activity };

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
    <div className="dl">
      <header className="dl-bar">
        <span className="dl-brand"><img src="/demo-mark.svg" alt="" width={28} height={28} /><span>StrayPaw</span></span>
        <span className="dl-tag">Demo</span>
      </header>
      <main id="main" className="dl-main">
        <section className="dl-hero">
          <p className="dl-k">The StrayPaw demo · a fictional city, the real product</p>
          <h1>Follow one dog bite through StrayPaw.</h1>
          <p className="dl-lede">A resident reports it by chat or call. The clinic treats her, the NGO finds the dog, and the city sees what is missing.</p>
          <div className="dl-go">
            {/* A link, so it still starts if pressed before the page is interactive (/try?go=1 starts on load). */}
            <a href="/try?go=1" role="button" className="dl-start" aria-disabled={!!busy} onClick={(e) => { e.preventDefault(); if (!busy) void start(); }}>{busy === "guide" ? "Opening…" : <>Start the demo <ArrowRight size={18} aria-hidden /></>}</a>
            <small>About five minutes. Press Next, or click anything.</small>
          </div>
          {err && <p className="dl-err" role="alert">{err}</p>}
        </section>
        <ol className="dl-route" aria-label="The six stops">
          {STAGES.map((t) => { const I = STOP[t.id] ?? Sparkles; return <li key={t.id}><span className="dl-stop" aria-hidden><I size={18} /></span><b>{t.label}</b><small>{t.title}</small></li>; })}
        </ol>
        <section className="dl-roam" aria-labelledby="dl-roam-h">
          <h2 id="dl-roam-h">Or open a workspace</h2>
          <ul>
            <li><a href="/bite-help"><MessageCircle size={16} aria-hidden /><b>Resident</b><small>Bite help</small></a></li>
            {DEMO_SHOWN.map((r) => { const I = ROLE_ICON[r] ?? Sparkles; return (
              <li key={r}><button type="button" disabled={!!busy} onClick={() => roam(r)}><I size={16} aria-hidden /><b>{SHOWN_LABEL[r]?.label ?? DEMO_ROLES[r].label}</b><small>{busy === r ? "Signing you in…" : "Open"}</small></button></li>
            ); })}
          </ul>
        </section>
      </main>
      <footer className="dl-foot">Every person, patient and record here is fictional. Nothing you do touches real data.</footer>
    </div>
  );
}
