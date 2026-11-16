"use client";

/* The guide for the live One Health demo. It walks one fictional dog bite through six stages of real StrayPaw
   workspaces. In each stage it points at the control to use (a ring on the real element, nothing laid over the
   page), says what to click, type or say, notices when it is done and moves to the next action. Changing stage
   signs in as the next person, behind a short card so nothing flashes. Where typing would slow a recording, an
   action can fill its example in; pressing the button is always the presenter's.

   The card keeps out of the way: it moves to whichever corner does not cover what it points at, hides while a
   dialog is open, and folds to a small pill ("Exit") from which the visitor can resume, switch role or end. */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronUp, Compass, Minus, RotateCcw, UserRound, Wand2, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { CLOSING, DEMO_ROLES, DEMO_SHOWN, SHOWN_LABEL, STAGES, TOUR_DONE, actPath, onActScreen, type Act, type DemoRole, type Fill } from "./tour";
import { enterAs, leaveFor, readTour, writeTour, TOUR_EVENT, type TourState } from "./state";
import "./demo-tour.css";

const emailOf = (r: DemoRole) => `demo-${r}@straypaw.invalid`;
const TRANSIT = "sp.demo.transit";
const isPublic = (p: string) => p.split("?")[0].startsWith("/bite-help");
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function signedInAs(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try { const { data } = await sb.auth.getSession(); return data.session?.user.email ?? null; } catch { return null; }
}

const visible = (n: Element | null): n is HTMLElement => !!n && (n as HTMLElement).offsetParent !== null && !n.closest(".dt, .dt-pill");
/** The element an action points at. Besides CSS: "text:Simba" (a link or button with that text) and
    "heading:Care on record" (the section under that heading). Lists are separated by commas, first match wins. */
function resolve(sel: string | undefined): HTMLElement | null {
  if (!sel) return null;
  for (const part of sel.split(/,(?![^[]*\])/).map((x) => x.trim()).filter(Boolean)) {
    if (part.startsWith("label:")) {
      /* "label:Simba": the choice (a radio or checkbox label) with that text. */
      const want = part.slice(6).trim().toLowerCase();
      const hit = [...document.querySelectorAll<HTMLElement>("label")].find((n) => visible(n) && (n.textContent ?? "").toLowerCase().includes(want));
      if (hit) return hit;
    } else if (part.startsWith("newest:")) {
      /* "newest:<css>": of the matches, the one in the most recently created row (rehearsals leave older ones). */
      const when = (n: Element) => n.closest("[data-created]")?.getAttribute("data-created") ?? "";
      const hit = [...document.querySelectorAll<HTMLElement>(part.slice(7))].filter(visible).sort((a, b) => when(b).localeCompare(when(a)))[0];
      if (hit) return hit;
    } else if (part.startsWith("dialog:")) {
      /* "dialog:Save": the button with exactly that text in the open dialog. */
      const want = part.slice(7).trim().toLowerCase();
      const hit = [...document.querySelectorAll<HTMLElement>('[role="dialog"] button')].find((n) => visible(n) && (n.textContent ?? "").trim().toLowerCase() === want);
      if (hit) return hit;
    } else if (part.startsWith("text:")) {
      const want = part.slice(5).toLowerCase();
      const nodes = [...document.querySelectorAll<HTMLElement>("a, button, summary")].filter((n) => visible(n) && !n.closest("nav, header, .nx-side, .nx-sidebar"));
      const hit = nodes.find((n) => (n.textContent ?? "").trim().toLowerCase().startsWith(want)) ?? nodes.find((n) => (n.textContent ?? "").toLowerCase().includes(want));
      if (hit) return hit;
    } else if (part.startsWith("heading:")) {
      const want = part.slice(8).toLowerCase();
      const h = [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3")].find((n) => visible(n) && (n.textContent ?? "").trim().toLowerCase().startsWith(want));
      const box = h?.closest<HTMLElement>("section, .nx-sec, .gh-block") ?? h ?? null;
      if (box) return box;
    } else {
      try { const hit = [...document.querySelectorAll(part)].find(visible); if (hit) return hit as HTMLElement; } catch { /* a selector this browser does not support */ }
    }
  }
  return null;
}
function isDone(a: Act): boolean {
  if (!a.done) return false;
  if ("path" in a.done) return a.done.path.test(window.location.pathname);
  const d = a.done;
  const els = [...document.querySelectorAll(d.sel)].filter((n) => !d.text || (n.textContent ?? "").toLowerCase().includes(d.text.toLowerCase()));
  return els.length >= Math.max(d.count ?? 1, d.allOf ? document.querySelectorAll(d.allOf).length : 0);
}

/* Fill a field the way a person would, so the page's own handlers see it. */
function setNative(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  if (!(el instanceof HTMLSelectElement)) el.dispatchEvent(new Event("change", { bubbles: true }));
}
const field = (sel: string): HTMLElement | null => {
  /* "field:Age|select": the control inside the form field labelled Age. */
  if (sel.startsWith("field:")) {
    const [label, inner] = sel.slice(6).split("|");
    const f = [...document.querySelectorAll<HTMLElement>("label.nx-field, .nx-field")].find((x) => (x.querySelector("span")?.textContent ?? "").trim().toLowerCase().startsWith(label.toLowerCase()));
    return (f?.querySelector<HTMLElement>(inner || "input, select, textarea")) ?? null;
  }
  return resolve(sel);
};
async function runFills(fills: Fill[]) {
  for (const f of fills) {
    if (f.when && !document.querySelector(f.when)) continue;
    if (f.op === "wait") { await new Promise((r) => setTimeout(r, f.ms)); continue; }
    /* A field the page adds a moment later ("Add a dose date") is waited for, not skipped. */
    let el = field(f.sel);
    for (let i = 0; !el && i < 60; i++) { await new Promise((r) => setTimeout(r, 80)); el = field(f.sel); }
    if (!el) continue;
    /* A button the page has not enabled yet (the chat waits for its area list) is waited for, not pressed in vain. */
    if (f.op === "press") for (let i = 0; i < 60 && (el as HTMLButtonElement).disabled; i++) await new Promise((r) => setTimeout(r, 100));
    if (f.op === "type" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) { setNative(el, typeof f.value === "function" ? f.value(indiaToday()) : f.value); el.focus({ preventScroll: true }); }
    else if (f.op === "select" && el instanceof HTMLSelectElement) setNative(el, f.value);
    else if ((f.op === "pick" || f.op === "check") && el instanceof HTMLInputElement) { if (!el.checked) el.click(); }
    else if ((f.op === "pick" || f.op === "check") && el instanceof HTMLLabelElement) el.click();
    else if (f.op === "press") el.click();
    await new Promise((r) => setTimeout(r, f.op === "press" ? 160 : 60));
  }
}

/* The card that covers a change of person: which stage, and who is working now. */
function Transit({ i, leaving }: { i: number; leaving: boolean }) {
  const t = STAGES[i];
  if (!t) return null;
  return (
    <div className={`dt-transit${leaving ? " is-leaving" : ""}`} role="status" aria-live="polite">
      <div className="dt-transit-in">
        <p className="dt-transit-k">Stage {i + 1} of {TOUR_DONE}</p>
        <h2>{t.label}</h2>
        <p className="dt-transit-who"><i aria-hidden />{t.who}</p>
        <ol className="dt-transit-dots" aria-hidden>{STAGES.map((x, k) => <li key={x.id} className={k < i ? "is-done" : k === i ? "is-on" : undefined} />)}</ol>
      </div>
    </div>
  );
}

type Corner = "br" | "bl" | "tr";

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [s, setS] = useState<TourState | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [switching, setSwitching] = useState<DemoRole | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tabs, setTabs] = useState(false);
  const [found, setFound] = useState(false);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [corner, setCorner] = useState<Corner>("br");
  const [filling, setFilling] = useState(false);
  const [transit, setTransit] = useState<{ i: number; leaving: boolean } | null>(null);
  const card = useRef<HTMLElement | null>(null);
  /* Answers "Next action" gives for the presenter, done one after another in the background. */
  const chain = useRef<Promise<void>>(Promise.resolve());
  const scrolled = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setS(readTour());
    const on = () => setS(readTour());
    window.addEventListener(TOUR_EVENT, on);
    window.addEventListener("storage", on);
    try {
      const v = sessionStorage.getItem(TRANSIT);
      if (v !== null) { sessionStorage.removeItem(TRANSIT); setTransit({ i: Number(v), leaving: false }); }
    } catch { /* storage blocked: no stage card, the screen simply loads */ }
    return () => { window.removeEventListener(TOUR_EVENT, on); window.removeEventListener("storage", on); };
  }, []);

  /* The stage card stays while the next person is signed in, then fades after a moment on the new screen. */
  useEffect(() => {
    if (!transit || busy) return;
    const t = window.setTimeout(() => setTransit(transit.leaving ? null : { ...transit, leaving: true }), transit.leaving ? (calm() ? 0 : 450) : (calm() ? 250 : 900));
    return () => window.clearTimeout(t);
  }, [transit, busy]);

  useEffect(() => { const t = setTimeout(() => setTabs(!!document.querySelector(".ws-dock")), 300); return () => clearTimeout(t); }, [pathname]);

  const stage = s && s.step < TOUR_DONE ? STAGES[s.step] : null;
  const act = stage ? stage.acts[Math.min(s!.act, stage.acts.length - 1)] : null;
  const memo = s?.memo ?? {};
  const [here, setHere] = useState(0);
  const onScreen = !!act && typeof window !== "undefined" && onActScreen(act, pathname, memo, window.location.search) && here >= 0;
  useEffect(() => { setDoneAt(null); scrolled.current = null; }, [s?.step, s?.act]);

  /* Point at the control, notice when the action is done, and keep the card off what it points at. */
  useEffect(() => {
    if (!s || s.mode !== "guided" || !act) return;
    let el: HTMLElement | null = null;
    const tick = () => {
      /* A tab changed in place (the programme's tabs) changes the screen without a navigation: look again. */
      const now = onActScreen(act, window.location.pathname, readTour().memo, window.location.search);
      if (now !== onScreen) { setHere((h) => h + 1); return; }
      const hit = onScreen ? resolve(act.sel) : null;
      if (hit !== el) { el?.classList.remove("sp-tour-hl"); el = hit; el?.classList.add("sp-tour-hl"); }
      setFound(!!hit);
      if (hit && scrolled.current !== hit) {
        const r = hit.getBoundingClientRect();
        const sheet = window.innerWidth <= 760 ? card.current?.getBoundingClientRect().top ?? window.innerHeight : window.innerHeight;
        const floor = Math.min(window.innerHeight, sheet) - 12;
        /* scroll-margin (demo-tour.css) keeps the control clear of the header and of the card on a phone. */
        if (r.top < 64 || r.bottom > floor) { scrolled.current = hit; hit.scrollIntoView({ block: r.height > floor - 80 ? "start" : "nearest", behavior: calm() ? "auto" : "smooth" }); }
        else scrolled.current = hit;
      }
      const c = card.current?.getBoundingClientRect();
      if (hit && c && window.innerWidth > 760) {
        const r = hit.getBoundingClientRect();
        const covers = (x: { left: number; right: number; top: number; bottom: number }) => !(r.right < x.left || r.left > x.right || r.bottom < x.top || r.top > x.bottom);
        const w = c.width, h = c.height, W = window.innerWidth, H = window.innerHeight;
        const spots: Record<Corner, { left: number; right: number; top: number; bottom: number }> = {
          br: { left: W - 20 - w, right: W - 20, top: H - 20 - h, bottom: H - 20 },
          bl: { left: 20, right: 20 + w, top: H - 20 - h, bottom: H - 20 },
          tr: { left: W - 20 - w, right: W - 20, top: 72, bottom: 72 + h },
        };
        setCorner((now) => (!covers(spots[now]) ? now : (["br", "bl", "tr"] as Corner[]).find((k) => !covers(spots[k])) ?? now));
      }
      /* An action that ends on another screen ("open the record") is done wherever the presenter now is. */
      if ((onScreen || (act.done && "path" in act.done)) && isDone(act)) setDoneAt((d) => d ?? Date.now());
    };
    tick();
    const id = window.setInterval(tick, 450);
    return () => { window.clearInterval(id); el?.classList.remove("sp-tour-hl"); };
  }, [s, act, onScreen, pathname]);

  /* Leave room under the page so the last rows can scroll above the card. */
  useEffect(() => {
    const root = document.documentElement;
    if (!s || s.mode !== "guided") { root.style.removeProperty("--dt-h"); root.classList.remove("dt-on"); return; }
    const el = card.current;
    if (!el) return;
    const set = () => root.style.setProperty("--dt-h", `${el.offsetHeight}px`);
    set(); root.classList.add("dt-on");
    const ro = new ResizeObserver(set); ro.observe(el);
    return () => { ro.disconnect(); root.classList.remove("dt-on"); };
  }, [s, pathname]);

  /* Go to one action: sign in as its person if needed (a new stage), otherwise open its screen if not already there. */
  const go = useCallback(async (step: number, actIdx = 0, opts: { fresh?: boolean; mode?: TourState["mode"] } = {}) => {
    setErr(null);
    if (step >= TOUR_DONE) { writeTour({ mode: "guided", step: TOUR_DONE, act: 0 }); return; }
    const st = STAGES[step], a = st.acts[actIdx];
    const role = a.role ?? st.role;
    const cur = readTour();
    const m = opts.fresh ? {} : cur.memo;
    const path = actPath(a, m) || st.acts.map((x) => actPath(x, m)).find(Boolean) || DEMO_ROLES[role].home;
    const base = { mode: opts.mode ?? "guided" as const, step, act: actIdx, role, memo: m, ...(opts.fresh ? { started: Date.now() } : {}) };
    setBusy(true);
    const who = await signedInAs();
    if (who !== emailOf(role) || opts.fresh) {
      setTransit({ i: step, leaving: false });
      const e = await enterAs(role);
      if (e) { setErr(e); setBusy(false); setTransit(null); return; }
      writeTour(base);
      try { sessionStorage.setItem(TRANSIT, String(step)); } catch { /* fine */ }
      leaveFor(path);
      return;
    }
    writeTour(base);
    if (!onActScreen(a, window.location.pathname, m) || (opts.fresh && path)) {
      /* Pages that keep their tab in the address (the programme) can rewrite it as they load; a full load is sure. */
      if (isPublic(path) !== isPublic(window.location.pathname) || path.includes("?") || window.location.search) window.location.assign(path);
      else router.push(path);
    }
    setBusy(false);
  }, [router]);

  /* Done: remember the screen if a later action needs it, then move to the next action of the stage. */
  useEffect(() => {
    if (!doneAt || !s || !stage || !act) return;
    if (act.keep && memo[act.keep] !== window.location.pathname) writeTour({ mode: "guided", step: s.step, memo: { ...memo, [act.keep]: window.location.pathname } });
    if (s.act >= stage.acts.length - 1) return;
    const t = window.setTimeout(() => writeTour({ mode: "guided", step: s.step, act: s.act + 1 }), calm() ? 600 : 1300);
    return () => window.clearTimeout(t);
  }, [doneAt]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Next moves on at once. An action that is not done yet and can be answered (the citizen's questions) is answered
     in the background, in order, the way a person would; only a change of person waits for those answers, so the
     next person's screen has what they need (the hospital, the notice). */
  const next = () => {
    if (!s || !stage || !act) return;
    const answer = !!act.auto && onScreen && !doneAt && !isDone(act);
    if (answer) { const fills = act.auto!; chain.current = chain.current.then(() => runFills(fills)).catch(() => undefined); }
    /* An answer that opens another screen ("Patient came in", "Save") is waited for, so the two never race. */
    if (answer && act.done && "path" in act.done) {
      setBusy(true);
      const here = act;
      void chain.current.then(async () => {
        for (let i = 0; i < 60 && !isDone(here); i++) await new Promise((r) => setTimeout(r, 150));
        setBusy(false);
        if (s.act < stage.acts.length - 1) void go(s.step, s.act + 1); else void go(s.step + 1, 0);
      });
      return;
    }
    /* The next step is on another screen: finish this one's answer here first (a page can rewrite its own address
       after an action, which would cancel a move made at the same moment). */
    const following = s.act < stage.acts.length - 1 ? stage.acts[s.act + 1] : null;
    if (answer && following && !onActScreen(following, window.location.pathname, memo, window.location.search)) {
      setBusy(true);
      void chain.current.then(async () => {
        for (let i = 0; i < 40 && act.done && !isDone(act); i++) await new Promise((r) => setTimeout(r, 150));
        setBusy(false); void go(s.step, s.act + 1);
      });
      return;
    }
    if (following) { void go(s.step, s.act + 1); return; }
    setBusy(true);
    const last = act;
    void chain.current.then(async () => {
      for (let i = 0; i < 40 && last.done && !isDone(last); i++) await new Promise((r) => setTimeout(r, 150));
      setBusy(false);
      void go(s.step + 1, 0);
    });
  };
  const back = () => { if (!s) return; if (s.act > 0) void go(s.step, s.act - 1); else if (s.step > 0) void go(s.step - 1, STAGES[s.step - 1].acts.length - 1); };
  const replay = () => { if (s) void go(s.step, 0); };
  const restart = () => void go(0, 0, { fresh: true });
  const fill = async () => { if (!act?.example) return; setFilling(true); await runFills(act.example.fills); setFilling(false); };

  const switchRole = useCallback(async (r: DemoRole) => {
    setRolesOpen(false);
    if (s?.role === r) return;
    setErr(null); setBusy(true); setSwitching(r);
    const e = await enterAs(r);
    if (e) { setErr(e); setBusy(false); setSwitching(null); return; }
    writeTour({ mode: "roam", step: s?.step ?? 0, role: r });
    leaveFor(DEMO_ROLES[r].home);
  }, [s?.step, s?.role]);

  const cover = transit ? <Transit i={transit.i} leaving={transit.leaving} /> : null;
  if (!s || s.mode === "off" || pathname === "/try") return cover;
  const place = `${tabs ? " has-tabs" : ""} is-${corner}`;
  const roles = (
    <details className="dt-roles" open={rolesOpen} onToggle={(e) => setRolesOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary aria-busy={switching ? true : undefined}>
        <UserRound size={14} aria-hidden />
        {switching ? <span role="status">Opening as {SHOWN_LABEL[switching]?.label ?? DEMO_ROLES[switching].label}…</span> : <span>{s.role ? SHOWN_LABEL[s.role]?.label ?? DEMO_ROLES[s.role].label : "Switch role"}</span>}
        <ChevronUp size={14} aria-hidden className="dt-roles-chev" />
      </summary>
      <ul aria-label="Choose a role">{DEMO_SHOWN.map((r) => (
        <li key={r}><button type="button" disabled={busy} aria-current={s.role === r ? "true" : undefined} onClick={() => switchRole(r)}><b>{SHOWN_LABEL[r]?.label ?? DEMO_ROLES[r].label}</b><small>{s.role === r ? "You are here" : SHOWN_LABEL[r]?.who ?? DEMO_ROLES[r].who}</small></button></li>
      ))}</ul>
    </details>
  );

  if (s.mode === "roam") {
    return (
      <>
        {cover}
        <div className={`dt-pill${tabs ? " has-tabs" : ""}`} role="region" aria-label="Guided demo">
          <button type="button" className="dt-resume" disabled={busy} onClick={() => void go(Math.min(s.step, TOUR_DONE - 1), s.step >= TOUR_DONE ? 0 : s.act)}>
            <Compass size={15} aria-hidden /> <span>The demo</span> <small>{s.step >= TOUR_DONE ? "Watch again" : `Resume · ${STAGES[s.step].label}`}</small>
          </button>
          {roles}
          <button type="button" className="dt-end" aria-label="End the guided demo" title="End the guided demo" onClick={() => { writeTour({ mode: "off", step: 0, act: 0 }); window.location.assign("/try"); }}><X size={14} aria-hidden /></button>
          {err && <p className="dt-err" role="alert">{err}</p>}
        </div>
      </>
    );
  }

  const bar = (at: number) => (
    <ol className="dt-stages" aria-label={`Stage ${Math.min(at, TOUR_DONE - 1) + 1} of ${TOUR_DONE}`}>
      {STAGES.map((t, k) => <li key={t.id} className={k < at ? "is-done" : k === at ? "is-on" : undefined}><button type="button" disabled={busy} onClick={() => void go(k, 0)} title={`${k + 1}. ${t.label}`} aria-label={`Stage ${k + 1}: ${t.label}`}><span /></button><small>{t.label}</small></li>)}
    </ol>
  );

  if (!stage || !act) {
    return (
      <>
        {cover}
        <aside ref={card} className={`dt is-end${place}`} aria-label="Guided demo">
          <div className="dt-top"><span className="dt-k">Complete</span></div>
          {bar(TOUR_DONE)}
          <h2>{CLOSING}</h2>
          <p>A resident reported a bite, the hospital responded, the animal team investigated, Kaju organised the next steps, the municipality followed it, and the programme learned from the record.</p>
          <div className="dt-act">
            <button type="button" className="dt-btn" disabled={busy} onClick={restart}><RotateCcw size={14} aria-hidden /> Restart</button>
            <button type="button" className="dt-btn is-go" onClick={() => writeTour({ mode: "roam", step: TOUR_DONE })}>Explore freely <ArrowRight size={15} aria-hidden /></button>
          </div>
          <div className="dt-foot">{roles}<a href="https://www.straypaw.org/demo" className="dt-link">Talk to us</a></div>
          {err && <p className="dt-err" role="alert">{err}</p>}
        </aside>
      </>
    );
  }

  const n = stage.acts.length;
  const last = s.act >= n - 1;
  const done = !!doneAt;
  const nextStage = STAGES[s.step + 1];
  const goLabel = !last ? "Next action" : nextStage ? `Next role: ${nextStage.label}` : "Finish";
  const there = actPath(act, memo);
  /* The action's screen is not open: the way on is to open it (or skip the action). */
  const needsGo = !onScreen && !!there;
  return (
    <>
      {cover}
      <aside ref={card} key={`${s.step}:${s.act}`} className={`dt is-guide${place}${done ? " is-done" : ""}`} aria-label="Guided demo" aria-live="polite">
        <div className="dt-top">
          <span className="dt-k">{s.step + 1} · {stage.label}<span className="dt-k-l"> · {s.act + 1}/{n}</span></span>
          <button type="button" className="dt-min" aria-label="Exit the guide and explore freely" title="Exit: explore freely; resume any time" onClick={() => writeTour({ mode: "roam", step: s.step })}><Minus size={14} aria-hidden /> Exit</button>
        </div>
        {bar(s.step)}
        <h2>{done ? <span className="dt-tick" aria-label="Done"><Check size={14} strokeWidth={3} aria-hidden /></span> : null}{act.title}</h2>
        <p className="dt-say">{act.say}</p>
        {act.example && onScreen ? (
          <div className="dt-do"><button type="button" className="dt-kaju" disabled={filling} onClick={() => void fill()}><Wand2 size={14} aria-hidden />{filling ? "Filling…" : act.example.label}</button></div>
        ) : null}
        {onScreen && act.sel && !found && !done ? <p className="dt-note" role="status">Waiting for the screen to show it…</p> : null}
        {last && done && stage.handoff ? <p className="dt-handoff">{stage.handoff}</p> : null}
        <div className="dt-act">
          <button type="button" className="dt-btn is-back" aria-label="Back" disabled={busy || (s.step === 0 && s.act === 0)} onClick={back}><ArrowLeft size={15} aria-hidden /></button>
          {act.example && onScreen ? <button type="button" className="dt-btn is-ex" aria-label={act.example.label} title={act.example.label} disabled={filling} onClick={() => void fill()}><Wand2 size={15} aria-hidden /><span>Example</span></button> : null}
          {needsGo ? <button type="button" className="dt-btn is-go" disabled={busy} onClick={() => void go(s.step, s.act)}>{busy ? "Opening…" : "Take me there"} {!busy && <ArrowRight size={15} aria-hidden />}</button>
            : <button type="button" className={`dt-btn is-go${done ? " is-ready" : ""}`} disabled={busy} onClick={next}>{busy ? "Opening…" : goLabel} {!busy && <ArrowRight size={15} aria-hidden />}</button>}
        </div>
        <div className="dt-foot">
          {needsGo ? <button type="button" className="dt-text" disabled={busy} onClick={next}>{last && nextStage ? `Skip to ${nextStage.label}` : "Skip"}</button> : null}
          <button type="button" className="dt-text" disabled={busy} onClick={restart}>Restart</button>
          {roles}
        </div>
        {err && <p className="dt-err" role="alert">{err}</p>}
      </aside>
    </>
  );
}
