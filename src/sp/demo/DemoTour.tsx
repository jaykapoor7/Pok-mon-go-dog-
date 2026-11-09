"use client";

/* The guide card for the live demo. It follows the visitor across screens and
   roles: one step at a time, the control to look at highlighted on the page,
   Next moving to the next screen (signing in as the next role when the work
   changes hands). "Roam freely" folds it to a small pill; the visitor can
   resume, switch role or start again from there. */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, Minus, Sparkles, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DEMO_ROLES, NOT_YET, SHOWN, TOUR, TOUR_DONE, type DemoRole } from "./tour";
import { enterAs, readTour, writeTour, TOUR_EVENT, type TourState } from "./state";
import "./demo-tour.css";

const pathOf = (p: string) => p.split("?")[0];
const emailOf = (r: DemoRole) => `demo-${r}@straypaw.invalid`;

async function signedInAs(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try { const { data } = await sb.auth.getSession(); return data.session?.user.email ?? null; } catch { return null; }
}

function findTarget(labels: string[], anywhere: boolean, sel?: string): HTMLElement | null {
  const root = (anywhere ? document : document.querySelector("main")) ?? document;
  if (sel) { const hit = [...root.querySelectorAll<HTMLElement>(sel)].find((n) => n.offsetParent !== null); if (hit) return hit; }
  const nodes = [...root.querySelectorAll<HTMLElement>("a, button, summary")].filter((n) => !n.closest(".dt, .dt-pill") && n.offsetParent !== null);
  for (const l of labels) {
    const want = l.toLowerCase();
    const hit = nodes.find((n) => (n.getAttribute("aria-label") ?? n.textContent ?? "").trim().toLowerCase().startsWith(want))
      ?? nodes.find((n) => (n.textContent ?? "").toLowerCase().includes(want));
    if (hit) return hit;
  }
  return null;
}

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [s, setS] = useState<TourState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tabs, setTabs] = useState(false);
  const [found, setFound] = useState(false);
  const scrolled = useRef<string>("");

  useEffect(() => {
    setS(readTour());
    const on = () => setS(readTour());
    window.addEventListener(TOUR_EVENT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(TOUR_EVENT, on); window.removeEventListener("storage", on); };
  }, []);

  useEffect(() => { const t = setTimeout(() => setTabs(!!document.querySelector(".sp-tabs")), 300); return () => clearTimeout(t); }, [pathname]);

  const step = s && s.step < TOUR_DONE ? TOUR[s.step] : null;
  /* A step's screen includes the records opened from it (/ngo/verification/…), but /ngo itself does not swallow the whole workspace. */
  const base = step ? pathOf(step.path) : "";
  const onScreen = !!step && (pathname === base || (base.split("/").length > 2 && pathname.startsWith(`${base}/`)));

  /* Point at the control this step is about, once the screen has its data. */
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
        /* Keep the control clear of the top bar and of this card. */
        const cardTop = document.querySelector(".dt")?.getBoundingClientRect().top ?? window.innerHeight;
        if (scrolled.current !== id && (r.top < 72 || r.bottom > cardTop - 16)) {
          scrolled.current = id;
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const room = cardTop - 72;
          const by = r.height < room ? r.top - 72 - Math.max(0, (room - r.height) / 3) : r.top - 72;
          window.scrollBy({ top: by, behavior: calm ? "auto" : "smooth" });
        }
      }
      if (tries > 24) clearInterval(tick);
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
      const e = await enterAs(t.role);
      if (e) { setErr(e); setBusy(false); return; }
      writeTour({ mode, step: i, role: t.role });
      window.location.assign(t.path); /* a fresh load so every screen reads the new role */
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
    window.location.assign(DEMO_ROLES[r].home);
  }, [s?.step]);

  if (!s || s.mode === "off" || pathname === "/try") return null;
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
      <div className={`dt-pill${place}`} role="region" aria-label="Guided demo">
        <button type="button" className="dt-resume" disabled={busy} onClick={() => go(Math.min(s.step, TOUR_DONE - 1))}>
          <Compass size={15} aria-hidden /> <span>Guided demo</span> <small>{s.step >= TOUR_DONE ? "Start again" : `Resume ${s.step + 1} of ${TOUR_DONE}`}</small>
        </button>
        {roles}
        {err && <p className="dt-err" role="alert">{err}</p>}
      </div>
    );
  }

  const n = TOUR_DONE;
  if (!step) {
    return (
      <aside className={`dt${place}`} aria-label="Guided demo">
        <div className="dt-top"><span className="dt-k">Guided demo · complete</span><button type="button" className="dt-min" onClick={() => writeTour({ ...s, mode: "roam" })}>Roam freely <Minus size={14} aria-hidden /></button></div>
        <div className="dt-bar"><i style={{ width: "100%" }} /></div>
        <h2>That is the full platform</h2>
        <p className="dt-list"><b>Shown</b> {SHOWN.join(" · ")}</p>
        <p className="dt-list"><b>Not yet switched on</b> {NOT_YET.join(" · ")}</p>
        <div className="dt-act">
          <button type="button" className="dt-btn" disabled={busy} onClick={() => go(0)}>Start again</button>
          <button type="button" className="dt-btn is-go" onClick={() => writeTour({ ...s, mode: "roam" })}>Roam freely</button>
        </div>
        <div className="dt-foot">{roles}<a href="/demo" className="dt-link">Talk to us about a pilot</a></div>
        {err && <p className="dt-err" role="alert">{err}</p>}
      </aside>
    );
  }

  const next = s.step + 1 < n ? TOUR[s.step + 1] : null;
  const label = !onScreen ? "Take me there" : !next ? "Finish" : next.role !== step.role ? `Next: sign in as ${DEMO_ROLES[next.role].label.toLowerCase()}` : `Next: ${next.title.charAt(0).toLowerCase()}${next.title.slice(1)}`;
  return (
    <aside className={`dt${place}`} aria-label="Guided demo" aria-live="polite">
      <div className="dt-top">
        <span className="dt-k"><span className="dt-k-l">Guided demo · </span>{s.step + 1} of {n}</span>
        <span className="dt-role">{DEMO_ROLES[step.role].label}</span>
        <button type="button" className="dt-min" onClick={() => writeTour({ ...s, mode: "roam" })}>Roam freely <Minus size={14} aria-hidden /></button>
      </div>
      <div className="dt-bar" aria-hidden><i style={{ width: `${((s.step + 1) / n) * 100}%` }} /></div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      {step.hint && onScreen && <p className="dt-hint"><Sparkles size={14} aria-hidden /> {found ? `${step.hint} It is highlighted on the page.` : step.hint}</p>}
      <div className="dt-act">
        <button type="button" className="dt-btn" disabled={busy || s.step === 0} onClick={() => go(s.step - 1)}><ArrowLeft size={15} aria-hidden /> Back</button>
        <button type="button" className="dt-btn is-go" disabled={busy} onClick={() => go(onScreen ? s.step + 1 : s.step)}>{busy ? "Opening…" : label} {!busy && <ArrowRight size={15} aria-hidden />}</button>
      </div>
      <div className="dt-foot">
        <span className="dt-note">Your place is kept if you roam.</span>
        {roles}
      </div>
      {err && <p className="dt-err" role="alert">{err}</p>}
    </aside>
  );
}
