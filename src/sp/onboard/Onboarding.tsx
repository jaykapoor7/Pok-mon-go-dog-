"use client";

/* ════════════════════════════════════════════════════════════════════
   Open StrayPaw: meet Kaju and the crew.

   One continuous scene. Kaju greets you, shrinks into the corner and talks
   you through each step; the folk-art dogs wake as you choose what takes
   your time, line up as your crew, and gather at the end around your
   first real action.

   Every screen does something true: sign-in and sign-up are the existing
   calls, the crew are Kaju's real automations (or real public tools), the
   first task is a real read-only Kaju answer from your own records, and
   the device step asks the browser for real permissions. Nothing advances
   on a timer; every move follows something the person did.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, BookOpen, Check, ChevronLeft, Download, Landmark, Loader2, MapPin, PawPrint, Soup, X } from "lucide-react";
import { cleanCode, signInWithCode, useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Kaju, KajuFace } from "@/kaju/Kaju";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import { getSupabase } from "@/lib/supabase";
import { readStoredRole, storeRole } from "@/lib/roles";
import { DOG_ART, ROLES, ROLE_LABEL, START, clearFlow, firstName, firstTask, holdWelcome, maskEmail, needsCode, orderFor, jobsFor, readFlow, saveFlow, type Dog, type Flow, type Job, type Outcome, type Path, type Step } from "./flow";
import "./onboarding.css";

const SPRING = { type: "spring" as const, stiffness: 360, damping: 32, mass: 0.9 };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const OUT = { duration: 0.16, ease: [0.4, 0, 1, 1] as const };
const IN = { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as const };
const TILE = ["#f6a37f", "#f3c75b", "#ec8fb0", "#7fc8b8", "#8fb0f0", "#b9a3ec"];
const SCATTER: { dog: Dog; x: string; y: string; w: number; r: number }[] = [
  { dog: "bijli", x: "0%", y: "4%", w: 118, r: -8 }, { dog: "laddoo", x: "70%", y: "0%", w: 112, r: 7 },
  { dog: "rani", x: "2%", y: "40%", w: 78, r: -3 }, { dog: "moti", x: "72%", y: "44%", w: 120, r: -6 },
  { dog: "chhotu", x: "8%", y: "80%", w: 108, r: 5 }, { dog: "gudiya", x: "62%", y: "82%", w: 110, r: -5 },
];

type Loc = "unknown" | "prompt" | "granted" | "denied" | "unsupported";
type Install = "unknown" | "ready" | "ios" | "installed" | "none";
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferredInstall: BIP | null = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { deferredInstall = e as BIP; });

export function Onboarding({ signedIn, startAt }: { signedIn: boolean; startAt?: "intro" }) {
  const router = useRouter();
  const { user } = useAuth();
  const reduce = !!useReducedMotion();
  const [f, setF] = useState<Flow>(START);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(0);
  const [wheel, setWheel] = useState(0);
  const [loc, setLoc] = useState<Loc>("unknown");
  const [install, setInstall] = useState<Install>("unknown");
  const [sheet, setSheet] = useState<null | "location" | "install">(null);
  const [task, setTask] = useState<{ state: "idle" | "asking" | "done" | "failed"; text: string }>({ state: "idle", text: "" });
  const booted = useRef(false);

  /* Resume this tab's progress; a signed-in personal account with a known space opens on its welcome. */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const saved = startAt === "intro" ? null : readFlow();
    if (saved) { setF(saved); const i = ROLES.findIndex((r) => r.id === saved.path); if (i >= 0) setWheel(i); }
    else {
      const r = readStoredRole();
      const i = ROLES.findIndex((x) => x.role === r);
      if (i >= 0) setWheel(i);
      if (signedIn && startAt !== "intro" && (r === "feeder" || r === "individual"))
        setF({ ...START, path: r === "feeder" ? "feeder" : "community", step: "done", trail: ["intro"], name: firstName(user?.name), outcome: { kind: "personal" } });
    }
    setReady(true);
    if ("permissions" in navigator) navigator.permissions.query({ name: "geolocation" as PermissionName }).then((p) => setLoc(p.state as Loc)).catch(() => setLoc("prompt"));
    else setLoc("geolocation" in navigator ? "prompt" : "unsupported");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    setInstall(standalone ? "installed" : deferredInstall ? "ready" : ios ? "ios" : "none");
    const onBip = (e: Event) => { deferredInstall = e as BIP; setInstall("ready"); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [signedIn, startAt, user?.name]);

  useEffect(() => { if (ready) saveFlow(f); }, [f, ready]);
  /* Page-level offers (the install banner) stay away: the device step makes the same offer in place. */
  useEffect(() => {
    const say = () => window.dispatchEvent(new Event("sp:onboarding"));
    document.documentElement.dataset.onboarding = "busy"; say();
    return () => { delete document.documentElement.dataset.onboarding; say(); };
  }, []);

  /* Focus arrives with each new question. */
  const first = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (first.current) { first.current = false; return; }
    const t = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-ob-focus="${f.step}"]`) ?? document.getElementById(`ob-h-${f.step}`);
      target?.focus({ preventScroll: true });
    }, reduce ? 0 : 260);
    return () => window.clearTimeout(t);
  }, [f.step, ready, reduce]);

  /* Browser Back walks the steps. */
  useEffect(() => {
    const pop = (e: PopStateEvent) => {
      const s = (e.state as { ob?: Step } | null)?.ob;
      setSheet(null); setError(null);
      setF((cur) => {
        if (!s || !cur.trail.includes(s)) return cur.trail.length ? { ...cur, step: cur.trail[cur.trail.length - 1], trail: cur.trail.slice(0, -1) } : cur;
        return { ...cur, step: s, trail: cur.trail.slice(0, cur.trail.lastIndexOf(s)) };
      });
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  const go = useCallback((step: Step, patch: Partial<Flow> = {}) => {
    setError(null);
    try { window.history.pushState({ ob: step }, ""); } catch { /* fine */ }
    setF((cur) => ({ ...cur, ...patch, step, trail: [...cur.trail, cur.step] }));
  }, []);
  const back = () => { if (f.trail.length) window.history.back(); };

  const readOutcome = async (): Promise<Outcome> => {
    const [member, org, role] = await Promise.all([isNgoMember(), getMyNgo().catch(() => null), getMyRole()]);
    return member ? { kind: "member", role: role.role, org: org?.name ?? null, reviewer: role.reviewer } : role.reviewer ? { kind: "reviewer" } : { kind: "personal" };
  };
  const isPublic = f.path === "feeder" || f.path === "community" || f.path === "educator";
  const deviceWorth = loc === "prompt" || loc === "unknown" || install === "ready" || install === "ios";
  /* Guests who could keep their work get the free sign-up offer; signed-in people and educators finish. */
  const wantsKeep = (f.path === "feeder" || f.path === "community") && !signedIn && f.outcome?.kind !== "personal";
  const afterDevice = (): Step => (wantsKeep ? "keep" : "done");
  const afterTask = (): Step => (deviceWorth ? "device" : afterDevice());
  const afterCrew = (): Step => (firstTask(f.outcome) ? "task" : afterTask());

  /* ── actions ──────────────────────────────────────────────────────── */
  const pickRole = async () => {
    if (busy) return;
    const r = ROLES[wheel];
    storeRole(r.role);
    const picks = f.path === r.id ? f.picks : [];
    if (!needsCode(r.id)) return go("week", { path: r.id, outcome: signedIn ? { kind: "personal" } : { kind: "guest" }, picks });
    if (!signedIn) return go("email", { path: r.id, picks });
    setBusy("Checking your access"); holdWelcome(true);
    try {
      const o = await readOutcome();
      if (o.kind === "personal") { holdWelcome(false); go("email", { path: r.id, email: f.email || user?.email || "", picks }); }
      else go("week", { path: r.id, outcome: o, picks });
    } catch { holdWelcome(false); setError("Your access could not be read just now. Try again."); }
    finally { setBusy(null); }
  };

  const signIn = async () => {
    if (busy) return;
    setError(null); setBusy("Checking your code"); holdWelcome(true);
    const r = await signInWithCode(f.email, code, (s) => setBusy(s));
    if (!r.ok) { holdWelcome(false); setBusy(null); setError(r.error); setShake((n) => n + 1); return; }
    setBusy("Opening your space");
    try {
      const o = await readOutcome();
      setCode("");
      /* A personal code (feeder or community) finishes; an organisation code meets the crew. */
      if (isPublic) go("done", { outcome: o });
      else go("week", { outcome: o });
    } catch { holdWelcome(false); setError("You are signed in, but your access could not be read just now. Open StrayPaw again in a moment."); }
    finally { setBusy(null); }
  };

  const requestCode = async () => {
    if (busy) return;
    setError(null); setBusy("Sending your code");
    try {
      const res = await fetch("/api/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name.trim(), email: f.email.trim(), role: f.path === "feeder" ? "feeder" : "individual" }) });
      const data = (await res.json().catch(() => ({}))) as { emailed?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Could not send a code."); return; }
      if (data.emailed === false) { setError(`Your code is ready, but the email to ${maskEmail(f.email)} did not go just now. Ask again in a moment: it resends the same code.`); return; }
      if (f.step !== "sent") go("sent");
    } catch { setError("Could not reach StrayPaw. Check your connection and try again."); }
    finally { setBusy(null); }
  };

  /* The first task: a real read-only question to Kaju, answered from this person's records. */
  const ask = useCallback(async (q: string) => {
    setTask({ state: "asking", text: "" });
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) throw new Error("no session");
      const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: [{ role: "user", text: q }], context: { path: "/assistant" } }) });
      const data = (await r.json().catch(() => ({}))) as { text?: string };
      if (!r.ok || !data.text) throw new Error("no answer");
      setTask({ state: "done", text: data.text });
    } catch { setTask({ state: "failed", text: "" }); }
  }, []);
  const q = firstTask(f.outcome);
  useEffect(() => { if (f.step === "task" && q && task.state === "idle") void ask(q); }, [f.step, q, task.state, ask]);

  const locate = () => {
    if (!("geolocation" in navigator)) { setLoc("unsupported"); return; }
    setBusy("Connecting");
    navigator.geolocation.getCurrentPosition(
      () => { setBusy(null); setLoc("granted"); setF((c) => ({ ...c, located: "on" })); },
      (err) => { setBusy(null); setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "prompt"); setF((c) => ({ ...c, located: "off" })); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  };
  const installApp = async () => {
    if (!deferredInstall) return;
    setBusy("Installing");
    try { await deferredInstall.prompt(); const c = await deferredInstall.userChoice; setInstall(c.outcome === "accepted" ? "installed" : "ready"); } catch { /* the browser declined */ }
    finally { deferredInstall = null; setBusy(null); }
  };

  const finish = (href: string) => { clearFlow(); try { localStorage.setItem("sp.onboard.done", "1"); } catch { /* fine */ } router.push(href); };
  const restart = () => { clearFlow(); setCode(""); setError(null); setTask({ state: "idle", text: "" }); setF(START); try { window.history.pushState({ ob: "intro" }, ""); } catch { /* fine */ } };

  /* ── derived ──────────────────────────────────────────────────────── */
  const name = firstName(f.name) || (f.outcome && f.outcome.kind !== "guest" ? firstName(user?.name) : "");
  const jobs = jobsFor(f.path);
  const crew = useMemo(() => orderFor(f.path, f.outcome, f.picks), [f.path, f.outcome, f.picks]);
  const staff = f.outcome?.kind === "member" || f.outcome?.kind === "reviewer";
  const primaryHref = (): string => {
    const o = f.outcome;
    if (o?.kind === "member") return o.role === "veterinarian" ? "/ngo/verification?stage=vet" : o.role === "member" ? "/ngo/field" : "/ngo";
    if (o?.kind === "reviewer") return "/city/review";
    if (f.path === "org" || f.path === "office") return "/join";
    return crew[0]?.href ?? "/app";
  };
  const bubble = bubbleFor(f, name, crew, task.state, jobs);
  const skip = (): (() => void) | null => {
    switch (f.step) {
      case "name": return () => go("role", { name: "" });
      case "week": return () => go("crew");
      case "crew": return () => go(afterCrew());
      case "task": return () => go(afterTask());
      case "device": return () => go(afterDevice());
      case "keep": return () => go("done");
      default: return null;
    }
  };
  const onSkip = skip();
  const mode = f.step === "intro" ? "intro" : f.step === "done" ? "done" : "step";

  /* The one persistent button: its label follows the step. */
  const cta = (): { label: string; onClick?: () => void; disabled?: boolean } => {
    switch (f.step) {
      case "intro": return { label: "Meet Kaju", onClick: () => go("name", { name: f.name || firstName(user?.name) }) };
      case "name": return f.name.trim() ? { label: "Continue", onClick: () => go("role") } : { label: "Type your name", disabled: true };
      case "role": return { label: busy ?? "Continue", onClick: () => void pickRole(), disabled: !!busy };
      case "email": return { label: "Continue", disabled: !EMAIL.test(f.email.trim()), onClick: () => go("code") };
      case "code": return { label: busy ?? "Sign in", disabled: cleanCode(code).length < 6 || !!busy, onClick: () => void signIn() };
      case "week": return f.picks.length ? { label: `Wake ${f.picks.length === 1 ? "my helper" : `all ${f.picks.length}`}`, onClick: () => go("crew") } : { label: "Pick at least one", disabled: true };
      case "crew": return { label: firstTask(f.outcome) ? "See Kaju in action" : "Continue", onClick: () => go(afterCrew()) };
      case "task": return task.state === "asking" || task.state === "idle" ? { label: "Kaju is reading", disabled: true } : { label: "Continue", onClick: () => go(afterTask()) };
      case "device": return { label: "Continue", onClick: () => go(afterDevice()) };
      case "keep": return { label: "Email me a free code", onClick: () => go("signup") };
      case "signup": return { label: busy ?? "Send my code", disabled: !EMAIL.test(f.email.trim()) || f.name.trim().length < 1 || !!busy, onClick: () => void requestCode() };
      case "sent": return { label: "I have my code", onClick: () => go("code") };
      case "done": return { label: "Start working", onClick: () => finish(primaryHref()) };
    }
  };
  const c = cta();

  if (!ready) return <div className="ob" aria-busy />;

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className={`ob is-${mode} at-${f.step}`}>
        <div className="ob-glow" aria-hidden><i /><i /><i /></div>
        <LayoutGroup>
          <div className="ob-app">
            <header className="ob-top">
              {mode === "intro" ? (
                <>
                  <Link href="/" className="ob-brand" aria-label="StrayPaw home"><StrayPawMark size={24} /><span>StrayPaw</span></Link>
                  {!signedIn ? <Link className="ob-login" href="/sign-in?next=/app" aria-label="Sign in to your workspace">Log in</Link> : <span />}
                </>
              ) : (
                <>
                  {f.trail.length && mode !== "done" ? <button type="button" className="ob-back" onClick={back} aria-label="Back"><ChevronLeft size={20} aria-hidden /></button> : <span className="ob-back is-empty" />}
                  <motion.span className="ob-word" aria-hidden initial={{ opacity: 0, letterSpacing: "0.1em" }} animate={{ opacity: 1, letterSpacing: "0.32em" }}>STRAYPAW</motion.span>
                  {onSkip ? <button type="button" className="ob-skip" onClick={onSkip}>Skip</button> : <span className="ob-skip is-empty" />}
                </>
              )}
            </header>

            {mode === "step" && (
              <div className="ob-chat">
                <motion.span layoutId="ob-kaju" className="ob-kaju-chip"><KajuFace size={30} /></motion.span>
                <Bubble text={bubble} k={`${f.step}|${bubble}`} reduce={reduce} />
              </div>
            )}

            <main className="ob-body">
              <AnimatePresence mode="popLayout" initial={false}>
                <Frame key={f.step} step={f.step} reduce={reduce}>{renderStep()}</Frame>
              </AnimatePresence>
            </main>

            <footer className="ob-foot">
              {f.step === "name" && <p className="ob-fine">{signedIn ? "Only used to greet you here." : "Only used to greet you. Nothing is saved until you sign in."}</p>}
              {f.step === "device" && <p className="ob-fine"><Check size={12} aria-hidden /> Used only when you act. Nothing is shared publicly.</p>}
              <Cta label={c.label} disabled={c.disabled} busy={!!busy && ["code", "signup", "role", "sent"].includes(f.step)} onClick={c.onClick} />
              {f.step === "keep" && <div className="ob-alts"><button type="button" className="ob-later" onClick={() => go("email")}>I already have a code</button><button type="button" className="ob-later" onClick={() => go("done")}>Not now</button></div>}
              {f.step === "intro" && (
                <p className="ob-fine is-links"><Link href="/community/report">Report an animal</Link> without an account{!signedIn && <> · <Link href="/join">Join with an invitation code</Link></>}</p>
              )}
              {f.step === "done" && <button type="button" className="ob-later" onClick={restart}>Choose a different space</button>}
            </footer>
          </div>
        </LayoutGroup>

        <AnimatePresence>{sheet && renderSheet()}</AnimatePresence>
      </div>
    </MotionConfig>
  );

  /* ── screens ──────────────────────────────────────────────────────── */
  function H(children: ReactNode, sub?: ReactNode) {
    return <><h1 id={`ob-h-${f.step}`} tabIndex={-1} className="ob-h">{children}</h1>{sub && <p className="ob-sub">{sub}</p>}</>;
  }
  function Err() { return error ? <motion.p className="ob-err" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p> : null; }

  function renderStep() {
    switch (f.step) {
      case "intro":
        return (
          <div className="ob-hero">
            <div className="ob-scene">
              {SCATTER.map((s, i) => (
                <motion.span key={s.dog} className="ob-float" style={{ left: s.x, top: s.y, width: s.w, rotate: s.r }}
                  initial={{ opacity: 0, scale: 0.5, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 18, delay: reduce ? 0 : 0.18 + i * 0.07 } }}>
                  <img src={DOG_ART[s.dog].src} alt="" draggable={false} style={{ animationDelay: `${i * -0.9}s` }} />
                </motion.span>
              ))}
              <motion.div layoutId="ob-kaju" className="ob-kaju-hero"><Kaju state="greeting" size={176} label="Kaju, StrayPaw's assistant, waving hello" /></motion.div>
              <IntroBubble reduce={reduce} />
            </div>
            {H(<>Every street dog,<br />with a tiny crew.</>, "Kaju and the crew keep reports, care and claims on one record, so nothing slips. You stay in charge.")}
          </div>
        );
      case "name": {
        const letters = (f.name.trim().split(/\s+/)[0] ?? "").slice(0, 10).split("").filter(Boolean);
        return (
          <form onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) go("role"); }}>
            {H("What's your name?")}
            <label className="sr-only" htmlFor="ob-name">Your first name</label>
            <input id="ob-name" data-ob-focus="name" className="ob-input" autoComplete="given-name" placeholder="Your name" value={f.name} maxLength={40}
              onChange={(e) => setF((cur) => ({ ...cur, name: e.target.value }))} />
            <div className="ob-tiles" aria-hidden>
              <AnimatePresence initial={false} mode="popLayout">
                {letters.map((ch, i) => (
                  <motion.span layout key={`${i}-${ch}`} className="ob-tile" style={{ background: TILE[i % TILE.length] }}
                    initial={{ scale: 0.2, y: 18, rotate: -18, opacity: 0 }} animate={{ scale: 1, y: 0, rotate: i % 2 ? 5 : -4, opacity: 1 }} exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ type: "spring", stiffness: 640, damping: 18 }}>
                    <i className="ob-eyes"><b /><b /></i><span>{ch.toUpperCase()}</span>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <button type="submit" hidden />
          </form>
        );
      }
      case "role":
        return (
          <>
            {H(<>What brings you<br />to StrayPaw?</>)}
            <Wheel index={wheel} onChange={setWheel} onPick={() => void pickRole()} />
            <Err />
          </>
        );
      case "email":
        return (
          <form onSubmit={(e) => { e.preventDefault(); if (EMAIL.test(f.email.trim())) go("code"); else { setError("Enter the email address that received your code."); setShake((n) => n + 1); } }}>
            {H(f.path === "office" ? "Your office email" : f.path === "org" ? "Your work email" : "Your email", f.path === "org" || f.path === "office" ? "The address your invitation was sent to." : "The address your code was sent to.")}
            <label className="sr-only" htmlFor="ob-email">Email</label>
            <motion.input key={`e${shake}`} animate={shake && error ? { x: [0, -6, 6, -3, 0] } : undefined} transition={{ duration: 0.28 }}
              id="ob-email" data-ob-focus="email" className="ob-input" type="email" inputMode="email" autoComplete="email" placeholder="you@organisation.org"
              value={f.email} onChange={(e) => setF((cur) => ({ ...cur, email: e.target.value }))} />
            <Err />
            {(f.path === "org" || f.path === "office") && <p className="ob-note">No code yet? <Link href="/partner-apply">Request organisation access</Link></p>}
            <button type="submit" hidden />
          </form>
        );
      case "code":
        return (
          <form onSubmit={(e) => { e.preventDefault(); if (cleanCode(code).length >= 6) void signIn(); }}>
            {H("Enter your code", <>Six characters, sent to <b>{maskEmail(f.email)}</b>. <button type="button" className="ob-link" onClick={back}>Change</button></>)}
            <CodeBoxes value={code} onChange={setCode} shake={shake} invalid={!!error} disabled={!!busy} />
            <Err />
            <p className="ob-note">The same email and code work every time.</p>
            <button type="submit" hidden />
          </form>
        );
      case "week": {
        const awake = f.picks.length;
        return (
          <>
            {H("What takes up your week?")}
            <motion.span className={`ob-awake${awake ? " is-on" : ""}`} layout><span className="ob-awake-dot" /><Roll n={awake} />&nbsp;{awake === 1 ? "helper" : "helpers"} awake</motion.span>
            <ul className="ob-week" aria-label="What takes up your week">
              {jobs.map((j, i) => {
                const on = f.picks.includes(j.id);
                return (
                  <motion.li key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { ...IN, delay: reduce ? 0 : 0.06 + i * 0.045 } }}>
                    <button type="button" role="checkbox" aria-checked={on} data-ob-focus={i === 0 ? "week" : undefined} className={`ob-row${on ? " is-on" : ""}`}
                      onClick={() => setF((cur) => ({ ...cur, picks: on ? cur.picks.filter((x) => x !== j.id) : [...cur.picks, j.id] }))}>
                      <span className="ob-check" aria-hidden>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 700, damping: 22 }}><Check size={13} strokeWidth={3.2} /></motion.span>}</span>
                      <span className="ob-row-t">{j.label}</span>
                      <motion.span className="ob-row-dog" animate={on ? { y: [0, -9, 0], rotate: [0, -8, 0], scale: [1, 1.12, 1] } : { y: 0, rotate: 0, scale: 1 }} transition={{ duration: 0.45 }}>
                        <img src={DOG_ART[j.dog].src} alt="" draggable={false} />
                        {on && !reduce && <motion.i className="ob-zz" initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -18, scale: 1.1 }} transition={{ duration: 0.6 }}>!</motion.i>}
                      </motion.span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </>
        );
      }
      case "crew":
        return (
          <>
            {H("Say hi to your crew")}
            <Carousel jobs={crew} staff={staff} reduce={reduce} />
          </>
        );
      case "task":
        return (
          <>
            {H("Your first task")}
            <TaskChat q={q ?? ""} state={task.state} text={task.text} onRetry={() => q && void ask(q)} reduce={reduce} />
          </>
        );
      case "device":
        return (
          <>
            {H("Set up this device")}
            <ul className="ob-tools">
              {loc !== "unsupported" && (
                <li className="ob-tool">
                  <span className="ob-tool-ico is-loc"><MapPin size={17} aria-hidden /></span>
                  <span className="ob-tool-t"><b>Location</b><small>Reports and field records start on your street</small></span>
                  {loc === "granted" ? <Done /> : loc === "denied" ? <button type="button" className="ob-tool-off" onClick={() => setSheet("location")}>Off</button>
                    : <button type="button" className="ob-connect" data-ob-focus="device" onClick={() => setSheet("location")}>+ Connect</button>}
                </li>
              )}
              {install !== "none" && install !== "unknown" && (
                <li className="ob-tool">
                  <span className="ob-tool-ico is-app"><Download size={17} aria-hidden /></span>
                  <span className="ob-tool-t"><b>StrayPaw app</b><small>Opens from your home screen, field mode works offline</small></span>
                  {install === "installed" ? <Done label="Installed" /> : <button type="button" className="ob-connect" onClick={() => setSheet("install")}>+ Add</button>}
                </li>
              )}
            </ul>
            <p className="ob-note is-box"><Check size={13} aria-hidden /> Both are optional. StrayPaw asks the browser first, and you can change either later.</p>
          </>
        );
      case "keep":
        return (
          <>
            <div className="ob-keep-dogs" aria-hidden>{crew.slice(0, 3).map((j, i) => <motion.img key={j.id} src={DOG_ART[j.dog].src} alt="" initial={{ y: 20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 18, delay: reduce ? 0 : 0.08 + i * 0.08 } }} />)}</div>
            {H("Keep your crew on every phone", "Free. A six-character code by email is your sign-in. There is no password.")}
            <ol className="ob-plan">
              <li><span className="ob-plan-dot is-on"><Check size={12} aria-hidden /></span><span><b>Today</b><small>Report and look around without an account</small></span></li>
              <li><span className="ob-plan-dot">2</span><span><b>With your code</b><small>{f.path === "feeder" ? "Your route and reports on any phone" : "Your reports follow you to any phone"}</small></span></li>
              <li><span className="ob-plan-dot">3</span><span><b>Any time</b><small>Ask for the same code again from Sign in</small></span></li>
            </ol>
          </>
        );
      case "signup":
        return (
          <form onSubmit={(e) => { e.preventDefault(); void requestCode(); }}>
            {H(name ? `Where should we send it, ${name}?` : "Where should we send your code?", "One email with six characters. Keep the email and code together.")}
            {!f.name.trim() && <><label className="ob-label" htmlFor="ob-sname">Your name</label><input id="ob-sname" className="ob-input" autoComplete="name" value={f.name} onChange={(e) => setF((cur) => ({ ...cur, name: e.target.value }))} /></>}
            <label className="sr-only" htmlFor="ob-semail">Email</label>
            <input id="ob-semail" data-ob-focus="signup" className="ob-input" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={f.email} onChange={(e) => setF((cur) => ({ ...cur, email: e.target.value }))} />
            <Err />
            <button type="submit" hidden />
          </form>
        );
      case "sent":
        return (
          <>
            <motion.div className="ob-letter" initial={{ y: 40, rotate: -10, opacity: 0 }} animate={{ y: 0, rotate: -3, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} aria-hidden>
              <span className="ob-letter-stamp"><PawPrint size={18} /></span><b>To {name || "you"}</b><small>{maskEmail(f.email)}</small>
            </motion.div>
            {H("Check your email", <>Your code is on its way to <b>{maskEmail(f.email)}</b>. It can take a minute.</>)}
            <p className="ob-note">Nothing yet? <button type="button" className="ob-link" onClick={() => void requestCode()} disabled={!!busy}>Send it again</button></p>
            <Err />
          </>
        );
      case "done": {
        const o = f.outcome;
        const noOrg = (f.path === "org" || f.path === "office") && !staff;
        const lede = o?.kind === "member" ? <>You&apos;re in <b>{o.org ?? "your organisation"}</b>{o.role && ROLE_LABEL[o.role] ? <> as {ROLE_LABEL[o.role]}</> : null}. Kaju prepares, you confirm.</>
          : o?.kind === "reviewer" ? <>Your reviewing office is ready. Kaju prepares, you decide.</>
          : noOrg ? <>Your account isn&apos;t part of an organisation yet. Ask your admin for an invitation code.</>
          : o?.kind === "personal" ? <>Your crew is awake, and your work follows you to any phone.</>
          : <>Your crew is awake. No account needed to start.</>;
        const lineup = crew.slice(0, 4);
        const starts = noOrg
          ? [{ id: "join", dog: "rani" as Dog, action: "Join with an invitation code", href: "/join" }, { id: "apply", dog: "sikari" as Dog, action: "Request organisation access", href: "/partner-apply" }]
          : crew.slice(0, 3).map((j) => ({ id: j.id, dog: j.dog, action: j.action, href: j.href }));
        return (
          <>
            <div className="ob-lineup">
              {!reduce && <Confetti />}
              {lineup.slice(0, 2).map((j, i) => <LineDog key={j.id} dog={j.dog} i={i} reduce={reduce} />)}
              <motion.div layoutId="ob-kaju" className="ob-kaju-done"><Kaju state="success" size={156} label="Kaju, celebrating" /></motion.div>
              {lineup.slice(2).map((j, i) => <LineDog key={j.id} dog={j.dog} i={i + 2} reduce={reduce} />)}
            </div>
            {H(<>You&apos;re all set{name ? `, ${name}` : ""}!</>, lede)}
            <p className="ob-kicker">Start with one of these</p>
            <ul className="ob-starts">
              {starts.map((s, i) => <Start key={s.id} dog={s.dog} label={s.action} i={i} onClick={() => finish(s.href)} reduce={reduce} />)}
            </ul>
          </>
        );
      }
    }
  }

  function renderSheet() {
    const isLoc = sheet === "location";
    const doneLoc = isLoc && (loc === "granted" || loc === "denied");
    return (
      <motion.div className="ob-sheet-wrap" key="sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget && !busy) setSheet(null); }}
        onKeyDown={(e) => { if (e.key === "Escape" && !busy) setSheet(null); }}>
        <motion.div className="ob-sheet" role="dialog" aria-modal="true" aria-labelledby="ob-sheet-h" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 420, damping: 40 }}>
          <span className="ob-grab" aria-hidden />
          <div className="ob-sheet-top"><h2 id="ob-sheet-h">{isLoc ? (doneLoc ? (loc === "granted" ? "Location connected" : "Location is off") : "Connect location") : install === "ios" ? "Add to Home Screen" : "Install StrayPaw"}</h2>
            <button type="button" className="ob-x" aria-label="Close" onClick={() => setSheet(null)} disabled={!!busy}><X size={16} aria-hidden /></button></div>
          <AnimatePresence mode="wait" initial={false}>
            {doneLoc ? (
              <motion.div key="done" className="ob-sheet-done" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                <span className={`ob-big-check${loc === "granted" ? "" : " is-off"}`}>{loc === "granted" ? <Check size={26} strokeWidth={3} aria-hidden /> : <MapPin size={24} aria-hidden />}</span>
                <p>{loc === "granted" ? "Sikari can start your reports where you're standing now." : "That's fine. Place reports by moving the map. You can turn location on later in your browser's site settings."}</p>
                <Cta label="Done" onClick={() => setSheet(null)} autoFocus />
              </motion.div>
            ) : (
              <motion.div key="ask" exit={{ opacity: 0 }}>
                <div className="ob-link-art" aria-hidden>
                  <span className="ob-tool-ico is-big">{isLoc ? <MapPin size={22} /> : <Download size={22} />}</span>
                  <span className="ob-link-dots"><i /><i /><i /></span>
                  <span className="ob-link-dog"><img src={DOG_ART.sikari.src} alt="" /></span>
                </div>
                {isLoc ? (
                  <div className="ob-will">
                    <p className="ob-will-h">StrayPaw will</p>
                    <ul><li><Check size={14} aria-hidden /> Start a report where you are standing</li><li><Check size={14} aria-hidden /> Fill in the place on a field record</li></ul>
                    <p className="ob-will-h">StrayPaw won&apos;t</p>
                    <ul className="is-no"><li><X size={14} aria-hidden /> Follow you in the background</li><li><X size={14} aria-hidden /> Show your exact point publicly</li></ul>
                  </div>
                ) : install === "ios" ? (
                  <ol className="ob-ios"><li>Tap <b>Share</b> in Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Open StrayPaw from your home screen</li></ol>
                ) : <p className="ob-sheet-p">StrayPaw opens from your home screen like an app, and field mode keeps working without signal.</p>}
                {isLoc ? <Cta label={busy ?? "Allow access"} busy={!!busy} onClick={locate} autoFocus /> : install === "ready" ? <Cta label={busy ?? "Install"} busy={!!busy} onClick={() => void installApp().then(() => setSheet(null))} autoFocus /> : <Cta label="Got it" onClick={() => setSheet(null)} autoFocus />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }
}

/* ── pieces ───────────────────────────────────────────────────────── */

function bubbleFor(f: Flow, name: string, crew: Job[], taskState: string, jobs: Job[]) {
  switch (f.step) {
    case "name": return "Hi! First things first, what should I call you?";
    case "role": return name ? `Lovely to meet you, ${name}! What brings you here?` : "Tell me what brings you here.";
    case "email": return f.path === "office" ? "Let's find your reviewing office." : "Let's find your organisation.";
    case "code": return "Six characters, from your email.";
    case "week": { const last = [...f.picks].reverse().map((id) => jobs.find((j) => j.id === id)).find(Boolean); return last ? `${DOG_ART[last.dog].name} is up!` : "Tick what takes your time. I'll wake the right helpers."; }
    case "crew": return crew.length > 1 ? "Here's your crew. Swipe to meet everyone." : "Here's your crew.";
    case "task": return taskState === "done" ? "Done! Every line came from your own records." : taskState === "failed" ? "Your records didn't load just now." : "Watch this. I only read, I never change anything.";
    case "device": return "Two optional things that help in the field.";
    case "keep": return crew[0] ? `Want ${DOG_ART[crew[0].dog].name} on every phone?` : "Want this on every phone?";
    case "signup": return "Nearly there.";
    case "sent": return "It's on its way!";
    default: return "";
  }
}

/* Kaju's speech: three dots, then the words, and the bubble grows to fit them. */
function Bubble({ text, k, reduce }: { text: string; k: string; reduce: boolean }) {
  const [typing, setTyping] = useState(!reduce);
  useEffect(() => { if (reduce) { setTyping(false); return; } setTyping(true); const t = window.setTimeout(() => setTyping(false), 480); return () => window.clearTimeout(t); }, [k, reduce]);
  if (!text) return null;
  return (
    <motion.p layout className="ob-bubble" initial={{ opacity: 0, scale: 0.85, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 500, damping: 34 }} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {typing ? <motion.span key="dots" className="ob-dots" exit={{ opacity: 0, transition: { duration: 0.08 } }}><i /><i /><i /></motion.span>
          : <motion.span key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>{text}</motion.span>}
      </AnimatePresence>
    </motion.p>
  );
}

function IntroBubble({ reduce }: { reduce: boolean }) {
  const [line, setLine] = useState(0);
  useEffect(() => { if (reduce) return; const t = window.setTimeout(() => setLine(1), 2000); return () => window.clearTimeout(t); }, [reduce]);
  return (
    <motion.span className="ob-intro-bubble" initial={{ opacity: 0, scale: 0.5, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 520, damping: 22, delay: reduce ? 0 : 0.55 }} aria-hidden>
      <AnimatePresence mode="wait" initial={false}><motion.span key={line} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>{line ? "Need a hand?" : "Hi! I'm Kaju"}</motion.span></AnimatePresence>
    </motion.span>
  );
}

/* The one button. It stays put; its label changes, and a press ripples from the finger. */
function Cta({ label, disabled, busy, onClick, autoFocus }: { label: string; disabled?: boolean; busy?: boolean; onClick?: () => void; autoFocus?: boolean }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const press = (e: RPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const b = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - b.left, y: e.clientY - b.top }]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 650);
  };
  return (
    <motion.button type="button" className="ob-cta" disabled={disabled} aria-disabled={disabled} onPointerDown={press} onClick={onClick} whileTap={disabled ? undefined : { scale: 0.97 }} autoFocus={autoFocus}>
      {ripples.map((r) => <motion.span key={r.id} className="ob-ripple" style={{ left: r.x, top: r.y }} initial={{ scale: 0, opacity: 0.3 }} animate={{ scale: 10, opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} />)}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={label} className="ob-cta-l" initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12, filter: "blur(4px)" }} transition={{ duration: 0.2 }}>
          {busy && <Loader2 size={16} className="ob-spin" aria-hidden />}{label}{!busy && !disabled && <ArrowRight size={17} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* A step on screen. Leaving, it is hidden from assistive technology and takes no input. */
const Frame = forwardRef<HTMLElement, { step: Step; reduce: boolean; children: ReactNode }>(function Frame({ step, reduce, children }, ref) {
  const present = useIsPresent();
  return (
    <motion.section ref={ref} className={`ob-step is-${step}`} aria-labelledby={`ob-h-${step}`} aria-hidden={!present || undefined} inert={!present || undefined}
      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { ...IN, delay: reduce ? 0 : 0.1 } }}
      exit={{ opacity: 0, y: -8, filter: "blur(8px)", transition: OUT }}>
      {children}
    </motion.section>
  );
});

const ROLE_ICON: Record<Path, ReactNode> = { org: <PawPrint size={18} />, office: <Landmark size={18} />, feeder: <Soup size={18} />, community: <MapPin size={18} />, educator: <BookOpen size={18} /> };
const ROW = 58;

/* The role wheel: drag, scroll, arrow keys or tap. The centred line is the choice. */
function Wheel({ index, onChange, onPick }: { index: number; onChange: (i: number) => void; onPick: () => void }) {
  const y = useMotionValue(-index * ROW);
  const lock = useRef(0);
  const dragged = useRef(false);
  useEffect(() => { const c = animate(y, -index * ROW, { type: "spring", stiffness: 420, damping: 38 }); return () => c.stop(); }, [index, y]);
  const clamp = (i: number) => Math.max(0, Math.min(ROLES.length - 1, i));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(index + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); onChange(clamp(index - 1)); }
    else if (e.key === "Home") { e.preventDefault(); onChange(0); }
    else if (e.key === "End") { e.preventDefault(); onChange(ROLES.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); }
  };
  return (
    <div className="ob-wheel" role="listbox" tabIndex={0} data-ob-focus="role" aria-label="What brings you to StrayPaw" aria-activedescendant={`ob-role-${ROLES[index].id}`} onKeyDown={onKey}
      onWheel={(e) => { const now = Date.now(); if (now - lock.current < 160 || Math.abs(e.deltaY) < 4) return; lock.current = now; onChange(clamp(index + (e.deltaY > 0 ? 1 : -1))); }}>
      <svg className="ob-wheel-arc" viewBox="0 0 60 300" preserveAspectRatio="none" aria-hidden><path d="M54 2 Q 6 150 54 298" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 5" strokeLinecap="round" /></svg>
      <span className="ob-wheel-mark" aria-hidden />
      <motion.ul style={{ y }} drag="y" dragConstraints={{ top: -(ROLES.length - 1) * ROW, bottom: 0 }} dragElastic={0.14}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={(_, info) => { onChange(clamp(Math.round((-y.get() - info.velocity.y * 0.12) / ROW))); window.setTimeout(() => { dragged.current = false; }, 50); }}>
        {ROLES.map((r, i) => <WheelItem key={r.id} i={i} y={y} on={i === index} label={r.label} icon={ROLE_ICON[r.id]} id={`ob-role-${r.id}`} onClick={() => { if (dragged.current) return; if (i === index) onPick(); else onChange(i); }} />)}
      </motion.ul>
    </div>
  );
}
function WheelItem({ i, y, on, label, icon, id, onClick }: { i: number; y: MotionValue<number>; on: boolean; label: string; icon: ReactNode; id: string; onClick: () => void }) {
  const d = useTransform(y, (v) => Math.abs(i * ROW + v) / ROW);
  const opacity = useTransform(d, [0, 1, 2, 3], [1, 0.38, 0.14, 0.04]);
  const scale = useTransform(d, [0, 1, 2], [1, 0.8, 0.66]);
  const x = useTransform(d, [0, 1, 2], [0, 18, 52]);
  return (
    <motion.li id={id} role="option" aria-selected={on} style={{ opacity, scale, x }} className={`ob-wheel-i${on ? " is-on" : ""}`} onClick={onClick}>
      <span>{label}</span><i aria-hidden>{icon}</i>
    </motion.li>
  );
}

/* Six boxes over one real input: paste works, and screen readers hear one field. */
function CodeBoxes({ value, onChange, shake, invalid, disabled }: { value: string; onChange: (v: string) => void; shake: number; invalid: boolean; disabled: boolean }) {
  const chars = cleanCode(value).slice(0, 6).split("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <motion.div className={`ob-code${invalid ? " is-bad" : ""}`} key={`c${shake}`} animate={shake && invalid ? { x: [0, -7, 7, -4, 0] } : undefined} transition={{ duration: 0.3 }} onClick={() => input.current?.focus()}>
      <label className="sr-only" htmlFor="ob-code">Six-character code</label>
      <input ref={input} id="ob-code" data-ob-focus="code" className="ob-code-in" value={value} onChange={(e) => onChange(cleanCode(e.target.value).slice(0, 6))}
        autoCapitalize="characters" autoComplete="one-time-code" inputMode="text" spellCheck={false} maxLength={8} disabled={disabled} aria-invalid={invalid} />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`ob-box${i === chars.length ? " is-caret" : ""}${chars[i] ? " is-full" : ""}`} aria-hidden>
          <AnimatePresence>{chars[i] && <motion.span key={chars[i] + i} initial={{ scale: 0.4, y: 6, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }} transition={{ type: "spring", stiffness: 700, damping: 26 }}>{chars[i]}</motion.span>}</AnimatePresence>
        </span>
      ))}
    </motion.div>
  );
}

/* A number that rolls when it changes. */
function Roll({ n }: { n: number }) {
  return <span className="ob-roll"><AnimatePresence mode="popLayout" initial={false}><motion.span key={n} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ type: "spring", stiffness: 600, damping: 32 }}>{n}</motion.span></AnimatePresence></span>;
}

/* Swipe to meet the crew. Native scrolling, snapped; the dots follow. */
function Carousel({ jobs, staff, reduce }: { jobs: Job[]; staff: boolean; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, dist = Infinity;
    kids.forEach((k, i) => { const d = Math.abs(k.offsetLeft - el.offsetLeft + k.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
    setAt(best);
  };
  const to = (i: number) => { const el = ref.current; const c = el?.children[i] as HTMLElement | undefined; if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" }); };
  return (
    <div className="ob-crew">
      <div className="ob-cards" ref={ref} onScroll={onScroll} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Your crew. Use the arrow keys to move between cards." data-ob-focus="crew"
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); to(Math.min(jobs.length - 1, at + 1)); } if (e.key === "ArrowLeft") { e.preventDefault(); to(Math.max(0, at - 1)); } }}>
        {jobs.map((j, i) => (
          <motion.article key={j.id} className={`ob-card${i === at ? " is-at" : ""}`} initial={{ opacity: 0, x: 60, rotate: 3 }} animate={{ opacity: 1, x: 0, rotate: 0, transition: { ...SPRING, delay: reduce ? 0 : 0.1 + i * 0.07 } }} aria-label={`${DOG_ART[j.dog].name}: ${j.tag}, ${i + 1} of ${jobs.length}`}>
            <header><b>{DOG_ART[j.dog].name}</b><span className="ob-card-awake">Awake</span><span className="ob-card-tag">{j.tag}</span></header>
            <div className="ob-card-art" style={{ background: j.tint }}><motion.img src={DOG_ART[j.dog].src} alt="" draggable={false} animate={i === at && !reduce ? { y: [0, -6, 0], rotate: [0, -2, 0] } : { y: 0 }} transition={{ duration: 0.7 }} /></div>
            <p>{j.card}</p>
            <dl><div><dt>Best at</dt><dd>{j.best}</dd></div><div><dt>Works in</dt><dd>{j.where}</dd></div></dl>
            <span className="ob-card-on"><Check size={13} strokeWidth={3} aria-hidden /> {staff ? "On your Kaju home" : "In your crew"}</span>
            <span className="ob-card-status" style={{ background: j.tint }}>{j.status}</span>
          </motion.article>
        ))}
      </div>
      {jobs.length > 1 && <div className="ob-dotsbar" aria-hidden>{jobs.map((j, i) => <motion.i key={j.id} onClick={() => to(i)} animate={{ width: i === at ? 20 : 6, opacity: i === at ? 1 : 0.3 }} />)}</div>}
    </div>
  );
}

/* Kaju's first real answer, as a chat. Only the formatting is ours; every word is the tool's. */
function TaskChat({ q, state, text, onRetry, reduce }: { q: string; state: string; text: string; onRetry: () => void; reduce: boolean }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10);
  return (
    <div className="ob-task">
      <header><span className="ob-kaju-chip is-sm"><KajuFace size={22} /></span><span className="ob-task-who"><b>Kaju</b><small>Reads your records, changes nothing</small></span><span className="ob-ready"><i />Live</span></header>
      <p className="ob-today">Today</p>
      <motion.p className="ob-msg is-me" initial={{ opacity: 0, x: 24, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ ...SPRING, delay: reduce ? 0 : 0.15 }}>{q}</motion.p>
      <AnimatePresence mode="wait">
        {state === "asking" || state === "idle" ? <motion.span key="t" className="ob-dots is-chat" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduce ? 0 : 0.45 } }} exit={{ opacity: 0 }} role="status" aria-label="Kaju is reading your records"><i /><i /><i /></motion.span>
          : state === "failed" ? <motion.div key="f" className="ob-msg is-kaju" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status">Your records could not be read just now, so there is nothing to show. <button type="button" className="ob-link" onClick={onRetry}>Try again</button></motion.div>
          : <motion.div key="a" className="ob-msg is-kaju" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status">
              {lines.map((l, i) => <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { delay: reduce ? 0 : 0.05 + i * 0.07 } }} className={/^[-•*]\s/.test(l) ? "is-li" : /^#+\s/.test(l) ? "is-h" : undefined}>{renderMd(l.replace(/^[-•*]\s+/, "").replace(/^#+\s+/, ""))}</motion.p>)}
            </motion.div>}
      </AnimatePresence>
      <AnimatePresence>{state === "done" && <motion.p className="ob-toast" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { ...SPRING, delay: reduce ? 0 : 0.35 + lines.length * 0.07 } }}><span className="ob-toast-ico"><Check size={14} strokeWidth={3} aria-hidden /></span><span><b>Your first task, done!</b><small>Read-only. Nothing was changed.</small></span></motion.p>}</AnimatePresence>
    </div>
  );
}
function renderMd(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>));
}

function Done({ label = "Connected" }: { label?: string }) {
  return <motion.span className="ob-connected" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 24 }}><Check size={13} strokeWidth={3} aria-hidden /> {label}</motion.span>;
}

function LineDog({ dog, i, reduce }: { dog: Dog; i: number; reduce: boolean }) {
  return <motion.img className={`ob-line-dog is-${dog}`} src={DOG_ART[dog].src} alt="" draggable={false} initial={{ y: -50, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 15, delay: reduce ? 0 : 0.2 + i * 0.09 }} />;
}

function Start({ dog, label, i, onClick, reduce }: { dog: Dog; label: string; i: number; onClick: () => void; reduce: boolean }) {
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { ...IN, delay: reduce ? 0 : 0.4 + i * 0.07 } }}>
      <motion.button type="button" className="ob-start" onClick={onClick} whileTap={{ scale: 0.98 }}><span className="ob-start-dog"><img src={DOG_ART[dog].src} alt="" /></span><span className="ob-start-t"><b>{DOG_ART[dog].name}</b> {label.charAt(0).toLowerCase() + label.slice(1)}</span><ArrowRight size={15} aria-hidden /></motion.button>
    </motion.li>
  );
}

/* One burst of paper scraps in StrayPaw's colours, then still. Not shown under reduced motion. */
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ i, x: (Math.random() - 0.5) * 560, y: -80 - Math.random() * 220, r: Math.random() * 720 - 360, c: ["#e0553b", "#2457ce", "#f3c75b", "#7fc8b8", "#ec8fb0", "#0b1e3d"][i % 6], w: 5 + Math.random() * 5, d: Math.random() * 0.15 })), []);
  return (
    <span className="ob-confetti" aria-hidden>
      {bits.map((b) => <motion.i key={b.i} style={{ background: b.c, width: b.w, height: b.w * 1.6 }} initial={{ x: 0, y: 40, opacity: 1, rotate: 0 }} animate={{ x: b.x, y: [40, b.y, b.y + 460], opacity: [1, 1, 0], rotate: b.r }} transition={{ duration: 2, delay: 0.25 + b.d, ease: [0.15, 0.6, 0.4, 1], times: [0, 0.35, 1] }} />)}
    </span>
  );
}
