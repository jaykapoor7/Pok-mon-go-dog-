"use client";

/* The guide for the live demo. It tells one story in chapters and follows
   the visitor across screens and roles: one chapter at a time, the thing
   to look at highlighted on the page, Next moving to the next screen and
   signing in as the next person when the work changes hands (a short
   chapter card covers the change, so nothing flashes). "Explore freely"
   folds it to a small pill; the visitor can resume, switch role or start
   again from there. */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, Minus, Sparkles, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DEMO_ROLES, SHOWN, TOUR, TOUR_DONE, type DemoRole } from "./tour";
import { enterAs, leaveFor, readTour, writeTour, TOUR_EVENT, type TourState } from "./state";
import "./demo-tour.css";

const pathOf = (p: string) => p.split("?")[0];
const emailOf = (r: DemoRole) => `demo-${r}@straypaw.invalid`;
const TRANSIT = "sp.demo.transit";

async function signedInAs(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try { const { data } = await sb.auth.getSession(); return data.session?.user.email ?? null; } catch { return null; }
}

function findTarget(labels: string[], anywhere: boolean, sel?: string): HTMLElement | null {
  const root = (anywhere ? document : document.querySelector("main")) ?? document;
  if (sel) { const hit = [...document.querySelectorAll<HTMLElement>(sel)].find((n) => n.offsetParent !== null && !n.closest(".dt, .dt-pill")); if (hit) return hit; }
  const nodes = [...root.querySelectorAll<HTMLElement>("a, button, summary")].filter((n) => !n.closest(".dt, .dt-pill") && n.offsetParent !== null);
  for (const l of labels) {
    const want = l.toLowerCase();
    const hit = nodes.find((n) => (n.getAttribute("aria-label") ?? n.textContent ?? "").trim().toLowerCase().startsWith(want))
      ?? nodes.find((n) => (n.textContent ?? "").toLowerCase().includes(want));
    if (hit) return hit;
  }
  return null;
}

/* The card that covers a change of person: which chapter, and who is speaking now. */
function Transit({ i, leaving }: { i: number; leaving: boolean }) {
  const t = TOUR[i];
  if (!t) return null;
  return (
    <div className={`dt-transit${leaving ? " is-leaving" : ""}`} role="status" aria-live="polite">
      <div className="dt-transit-in">
        <p className="dt-transit-k">{i + 1} of {TOUR_DONE}</p>
        <h2>{t.chapter}</h2>
        <p className="dt-transit-who"><i aria-hidden />Now as the {t.who.toLowerCase()}</p>
        <ol className="dt-transit-dots" aria-hidden>{TOUR.map((x, k) => <li key={x.chapter} className={k < i ? "is-done" : k === i ? "is-on" : undefined} />)}</ol>
      </div>
    </div>
  );
}

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [s, setS] = useState<TourState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tabs, setTabs] = useState(false);
  const [found, setFound] = useState(false);
  const [transit, setTransit] = useState<{ i: number; leaving: boolean } | null>(null);
  const [asked, setAsked] = useState(false);
  const scrolled = useRef<string>("");

  useEffect(() => {
    setS(readTour());
    const on = () => setS(readTour());
    window.addEventListener(TOUR_EVENT, on);
    window.addEventListener("storage", on);
    /* Arriving from a change of person: show the chapter card; the effect below lets the screen through. */
    try {
      const v = sessionStorage.getItem(TRANSIT);
      if (v !== null) { sessionStorage.removeItem(TRANSIT); setTransit({ i: Number(v), leaving: false }); }
    } catch { /* storage blocked: no chapter card, the screen simply loads */ }
    return () => { window.removeEventListener(TOUR_EVENT, on); window.removeEventListener("storage", on); };
  }, []);

  /* The chapter card stays while the next person is being signed in, then fades after a moment on the new screen. */
  useEffect(() => {
    if (!transit || busy) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setTransit(transit.leaving ? null : { ...transit, leaving: true }), transit.leaving ? (calm ? 0 : 450) : (calm ? 250 : 900));
    return () => window.clearTimeout(t);
  }, [transit, busy]);

  useEffect(() => { const t = setTimeout(() => setTabs(!!document.querySelector(".sp-tabs")), 300); return () => clearTimeout(t); }, [pathname]);

  const step = s && s.step < TOUR_DONE ? TOUR[s.step] : null;
  useEffect(() => { setAsked(false); }, [s?.step]);
  /* A step's screen includes the records opened from it, but /ngo itself does not swallow the whole workspace. */
  const base = step ? pathOf(step.path) : "";
  const onScreen = !!step && (pathname === base || (base.split("/").length > 2 && pathname.startsWith(`${base}/`)) || !!step.within?.some((w) => pathname.startsWith(w)));

  /* Point at the thing this chapter is about, once the screen has its data. */
  useEffect(() => {
    setFound(false);
    if (!s || s.mode !== "guided" || !(step?.point || step?.sel) || !onScreen) return;
    let el: HTMLElement | null = null, tries = 0;
    const labels = step.point ?? [];
    const anywhere = labels.some((p) => p.toLowerCase().includes("kaju"));
    const tick = setInterval(() => {
      tries++;
      const hit = findTarget(labels, anywhere, step.sel);
      if (hit && hit !== el) {
        el?.classList.remove("sp-tour-hl");
        el = hit; el.classList.add("sp-tour-hl"); setFound(true);
        const id = `${s.step}:${pathname}`;
        const r = hit.getBoundingClientRect();
        /* Keep it clear of the top bar and of this card. */
        const cardTop = document.querySelector(".dt")?.getBoundingClientRect().top ?? window.innerHeight;
        if (scrolled.current !== id && (r.top < 72 || r.bottom > cardTop - 16)) {
          scrolled.current = id;
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const room = cardTop - 72;
          const by = r.height < room ? r.top - 72 - Math.max(0, (room - r.height) / 3) : r.top - 72;
          window.scrollBy({ top: by, behavior: calm ? "auto" : "smooth" });
        }
      }
      if (tries > 40) clearInterval(tick); /* keep looking for 20 s: a cold staging load can take that long */
    }, 500);
    return () => { clearInterval(tick); el?.classList.remove("sp-tour-hl"); };
  }, [s, step, onScreen, pathname]);

  /* Leave room under the page so the last rows can scroll above the card. */
  useEffect(() => {
    const root = document.documentElement;
    if (!s || s.mode !== "guided") { root.style.removeProperty("--dt-h"); root.classList.remove("dt-on"); return; }
    const card = document.querySelector<HTMLElement>(".dt");
    if (!card) return;
    const set = () => root.style.setProperty("--dt-h", `${card.offsetHeight}px`);
    set(); root.classList.add("dt-on");
    const ro = new ResizeObserver(set); ro.observe(card);
    return () => { ro.disconnect(); root.classList.remove("dt-on"); };
  }, [s, pathname]);

  const go = useCallback(async (i: number, mode: TourState["mode"] = "guided") => {
    setErr(null);
    if (i >= TOUR_DONE) { writeTour({ mode: "guided", step: TOUR_DONE, role: s?.role ?? null }); return; }
    const t = TOUR[i];
    setBusy(true);
    const who = await signedInAs();
    if (who !== emailOf(t.role)) {
      setTransit({ i, leaving: false });
      const e = await enterAs(t.role);
      if (e) { setErr(e); setBusy(false); setTransit(null); return; }
      writeTour({ mode, step: i, role: t.role });
      try { sessionStorage.setItem(TRANSIT, String(i)); } catch { /* fine */ }
      leaveFor(t.path); /* a fresh load so every screen reads the new person */
      return;
    }
    writeTour({ mode, step: i, role: t.role });
    router.push(t.path);
    setBusy(false);
  }, [router, s?.role]);

  const switchRole = useCallback(async (r: DemoRole) => {
    setErr(null); setBusy(true);
    const e = await enterAs(r);
    if (e) { setErr(e); setBusy(false); return; }
    writeTour({ mode: "roam", step: s?.step ?? 0, role: r });
    leaveFor(DEMO_ROLES[r].home);
  }, [s?.step]);

  const askKaju = (q: string) => { setAsked(true); window.dispatchEvent(new CustomEvent("sp:kaju-ask", { detail: { q } })); };

  const cover = transit ? <Transit i={transit.i} leaving={transit.leaving} /> : null;
  if (!s || s.mode === "off" || pathname === "/try") return cover;
  const place = tabs ? " has-tabs" : "";
  const roles = (
    <details className="dt-roles">
      <summary><UserRound size={14} aria-hidden /> Switch role</summary>
      <ul>{(Object.keys(DEMO_ROLES) as DemoRole[]).map((r) => (
        <li key={r}><button type="button" disabled={busy} aria-current={s.role === r ? "true" : undefined} onClick={() => switchRole(r)}><b>{DEMO_ROLES[r].label}</b><small>{DEMO_ROLES[r].who}</small></button></li>
      ))}</ul>
    </details>
  );

  if (s.mode === "roam") {
    return (
      <>
        {cover}
        <div className={`dt-pill${place}`} role="region" aria-label="Guided demo">
          <button type="button" className="dt-resume" disabled={busy} onClick={() => go(Math.min(s.step, TOUR_DONE - 1))}>
            <Compass size={15} aria-hidden /> <span>The tour</span> <small>{s.step >= TOUR_DONE ? "Watch again" : `Resume · ${s.step + 1} of ${TOUR_DONE}`}</small>
          </button>
          {roles}
          {err && <p className="dt-err" role="alert">{err}</p>}
        </div>
      </>
    );
  }

  const n = TOUR_DONE;
  const bar = (at: number) => (
    <ol className="dt-steps" aria-label={`Stop ${Math.min(at, n - 1) + 1} of ${n}`}>
      {TOUR.map((t, k) => <li key={t.chapter} title={t.chapter} className={k < at ? "is-done" : k === at ? "is-on" : undefined} />)}
    </ol>
  );

  if (!step) {
    return (
      <>
        {cover}
        <aside className={`dt is-end${place}`} aria-label="Guided demo">
          <div className="dt-top"><span className="dt-k">Tour · complete</span></div>
          {bar(n)}
          <h2>That is the platform</h2>
          <p>Every screen was a real workspace on illustrative data.</p>
          <ul className="dt-shown">{SHOWN.map((x, k) => <li key={x} style={{ ["--k" as string]: k }}>{x}</li>)}</ul>
          <div className="dt-act">
            <button type="button" className="dt-btn" disabled={busy} onClick={() => go(0)}>Again</button>
            <button type="button" className="dt-btn is-go" onClick={() => writeTour({ ...s, mode: "roam" })}>Explore freely <ArrowRight size={15} aria-hidden /></button>
          </div>
          <div className="dt-foot">{roles}<a href="https://www.straypaw.org/demo" className="dt-link">Talk to us about a pilot</a></div>
          {err && <p className="dt-err" role="alert">{err}</p>}
        </aside>
      </>
    );
  }

  const next = s.step + 1 < n ? TOUR[s.step + 1] : null;
  /* A small card: who you are now, one line of context, and the way on. The visitor looks around the workspace as they like; "Next" works from wherever they are. */
  const label = !next ? "Finish" : `Next: ${next.chapter}`;
  const line = step.short ?? step.body.split(/(?<=\.)\s/)[0];
  return (
    <>
      {cover}
      <aside key={s.step} className={`dt is-small${place}`} aria-label="Guided demo" aria-live="polite">
        <div className="dt-top">
          <span className="dt-k">{s.step + 1} of {n}<span className="dt-k-l"> · {step.chapter}</span></span>
          <button type="button" className="dt-min" aria-label="Hide the guide and explore freely" onClick={() => writeTour({ ...s, mode: "roam" })}><Minus size={14} aria-hidden /></button>
        </div>
        {bar(s.step)}
        <p className="dt-who"><i aria-hidden />{step.who}</p>
        <h2>{step.title}</h2>
        <p>{line}</p>
        <div className="dt-act">
          <button type="button" className="dt-btn is-back" aria-label="Previous stop" disabled={busy || s.step === 0} onClick={() => go(s.step - 1)}><ArrowLeft size={15} aria-hidden /></button>
          <button type="button" className="dt-btn is-go" disabled={busy} onClick={() => go(s.step + 1)}>{busy ? "Opening…" : label} {!busy && <ArrowRight size={15} aria-hidden />}</button>
        </div>
        {err && <p className="dt-err" role="alert">{err}</p>}
      </aside>
    </>
  );
}
