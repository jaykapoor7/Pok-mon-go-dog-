"use client";

/* ════════════════════════════════════════════════════════════════════
   The one way in.

   An email address, then the six-character code we email to it. The same
   screen signs people in, re-sends a forgotten code, opens a personal
   account, and lets an organisation register itself and start at once.

   Nothing here decides access: /api/access/start only re-sends a code to
   the inbox that owns it, /api/access/request and /api/register/org email
   a new one, and signInWithCode exchanges email + code for the session.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { Building2, ChevronLeft, PawPrint, Soup } from "lucide-react";
import { cleanCode, signInWithCode, useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { KajuFace } from "@/kaju/Kaju";
import { Bubble, CodeBoxes, Cta, Frame } from "./Onboarding";
import { firstName, maskEmail } from "./flow";
import "./onboarding.css";

type Step = "email" | "who" | "me" | "org" | "code";
type Kind = "individual" | "feeder";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SPRING = { type: "spring" as const, stiffness: 360, damping: 32, mass: 0.9 };
/** Only same-site paths are accepted as a destination after sign-in. */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/app");

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}

export function Enter() {
  const q = useSearchParams();
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  /* `switch=1`: a signed-in person asked to use a different address, so this one is signed out first. */
  const switching = useRef(q?.get("switch") === "1");
  const reduce = !!useReducedMotion();
  const next = safeNext(q?.get("next") ?? null);
  const as = q?.get("as");
  const [step, setStep] = useState<Step>("email");
  const [trail, setTrail] = useState<Step[]>([]);
  const [email, setEmail] = useState(q?.get("email") ?? "");
  const [name, setName] = useState(q?.get("name") ?? "");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<Kind>(as === "feeder" ? "feeder" : "individual");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<"sent" | "unsent" | "new" | "have">("sent");
  const [shake, setShake] = useState(0);
  const signing = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (user && switching.current) { switching.current = false; signOut(); return; }
    if (!user) switching.current = false;
    if (user && !signing.current) router.replace(next);
  }, [ready, user, next, router, signOut]);

  const go = (s: Step) => { setError(null); setTrail((t) => [...t, step]); setStep(s); };
  const back = () => { setError(null); setTrail((t) => { const prev = t[t.length - 1]; if (prev) setStep(prev); return t.slice(0, -1); }); };
  useEffect(() => {
    const t = window.setTimeout(() => (document.querySelector<HTMLElement>(`[data-en-focus="${step}"]`) ?? (step === "code" ? document.getElementById("ob-code") : null))?.focus({ preventScroll: true }), reduce ? 0 : 240);
    return () => window.clearTimeout(t);
  }, [step, reduce]);

  /* Step one: an address. A known one gets its code again; a new one chooses what to open. */
  const start = async () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) { setError("Enter your email address."); setShake((n) => n + 1); return; }
    setError(null); setBusy("Looking you up");
    try {
      const r = await post<{ known?: boolean; emailed?: boolean; limited?: boolean }>("/api/access/start", { email: e });
      if (!r.ok) { setError(r.data.error ?? "Could not check that address. Try again."); return; }
      if (r.data.known) { setNote(r.data.emailed ? "sent" : "unsent"); go("code"); }
      else go(as === "org" ? "org" : as === "feeder" || as === "individual" ? "me" : "who");
    } catch { setError("Could not reach StrayPaw. Check your connection and try again."); }
    finally { setBusy(null); }
  };

  const createMe = async () => {
    if (busy) return;
    if (name.trim().length < 2) { setError("Add your name."); return; }
    setError(null); setBusy("Sending your code");
    try {
      const r = await post<{ emailed?: boolean }>("/api/access/request", { name: name.trim(), email: email.trim().toLowerCase(), role: kind });
      if (!r.ok) { setError(r.data.error ?? "Could not send a code."); return; }
      setNote(r.data.emailed === false ? "unsent" : "new"); go("code");
    } catch { setError("Could not reach StrayPaw. Check your connection and try again."); }
    finally { setBusy(null); }
  };

  const createOrg = async () => {
    if (busy) return;
    if (orgName.trim().length < 3) { setError("Add your organisation's name."); return; }
    if (name.trim().length < 2) { setError("Add your own name."); return; }
    if (city.trim().length < 2) { setError("Add the city you work in."); return; }
    setError(null); setBusy("Creating your workspace");
    try {
      const r = await post<{ emailed?: boolean; code?: string }>("/api/register/org", { orgName: orgName.trim(), name: name.trim(), email: email.trim().toLowerCase(), city: city.trim() });
      if (!r.ok) { setError(r.data.error ?? "Could not create the workspace."); return; }
      setNote(r.data.emailed === false ? "unsent" : "new"); go("code");
    } catch { setError("Could not reach StrayPaw. Check your connection and try again."); }
    finally { setBusy(null); }
  };

  const signIn = useCallback(async (value?: string) => {
    if (signing.current) return;
    const entered = cleanCode(value ?? code);
    if (entered.length < 6) return;
    signing.current = true; setError(null); setBusy("Checking your code");
    const r = await signInWithCode(email, entered, (s) => setBusy(s));
    if (!r.ok) { signing.current = false; setBusy(null); setError(r.error); setShake((n) => n + 1); return; }
    setBusy("Opening StrayPaw");
    router.replace(next);
  }, [code, email, next, router]);

  const resend = async () => {
    if (busy) return;
    setBusy("Sending"); setError(null);
    try { const r = await post<{ known?: boolean; emailed?: boolean }>("/api/access/start", { email: email.trim().toLowerCase() }); setNote(r.ok && r.data.emailed ? "sent" : "unsent"); }
    catch { setNote("unsent"); }
    finally { setBusy(null); }
  };

  const bubble =
    step === "email" ? "Welcome! What's your email?"
    : step === "who" ? "You're new here. What should I set up?"
    : step === "me" ? "Lovely. What should I call you?"
    : step === "org" ? "Let's set up your organisation. It takes a minute."
    : note === "sent" ? "I've emailed your code. It's the same one every time."
    : note === "new" ? `Done${name ? `, ${firstName(name)}` : ""}! Your code is in your inbox.`
    : note === "have" ? "Enter the code from your StrayPaw email."
    : "Enter the code from your StrayPaw email.";

  const cta: { label: string; onClick: () => void; disabled?: boolean } =
    step === "email" ? { label: busy ?? "Continue", onClick: () => void start(), disabled: !!busy || !EMAIL.test(email.trim()) }
    : step === "me" ? { label: busy ?? "Email me my code", onClick: () => void createMe(), disabled: !!busy || name.trim().length < 2 }
    : step === "org" ? { label: busy ?? "Create our workspace", onClick: () => void createOrg(), disabled: !!busy || orgName.trim().length < 3 || name.trim().length < 2 || city.trim().length < 2 }
    : { label: busy ?? "Sign in", onClick: () => void signIn(), disabled: !!busy || cleanCode(code).length < 6 };

  const H = (children: ReactNode, sub?: ReactNode) => <><h1 className="ob-h" id={`ob-h-${step}`} tabIndex={-1}>{children}</h1>{sub && <p className="ob-sub">{sub}</p>}</>;
  const Err = () => (error ? <motion.p className="ob-err s3-err" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.p> : null);

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className={`ob is-step at-${step} is-enter`}>
        <div className="ob-glow" aria-hidden><i /><i /><i /></div>
        <div className="ob-app">
          <header className="ob-top">
            {trail.length ? <button type="button" className="ob-back" onClick={back} aria-label="Back"><ChevronLeft size={20} aria-hidden /></button>
              : <Link href="/" className="ob-back" aria-label="StrayPaw home"><StrayPawMark size={22} /></Link>}
            <span className="ob-word" aria-hidden>STRAYPAW</span>
            <span className="ob-skip is-empty" />
          </header>
          <div className="ob-chat">
            <span className="ob-kaju-chip"><KajuFace size={30} /></span>
            <Bubble text={bubble} k={`${step}|${bubble}`} reduce={reduce} />
          </div>
          <main className="ob-body">
            <AnimatePresence mode="popLayout" initial={false}>
              <Frame key={step} step={step} reduce={reduce}>
                {step === "email" && (
                  <form onSubmit={(e) => { e.preventDefault(); void start(); }} noValidate>
                    {H("Sign in or get started", "One email address. We send a six-character code. No password.")}
                    <label className="sr-only" htmlFor="en-email">Email</label>
                    <motion.input key={`e${shake}`} animate={shake && error ? { x: [0, -6, 6, -3, 0] } : undefined} transition={{ duration: 0.28 }}
                      id="en-email" data-en-focus="email" className="ob-input" type="email" inputMode="email" autoComplete="email" autoFocus placeholder="you@example.org"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Err />
                    <p className="ob-note">Already have your code? <button type="button" className="ob-link" onClick={() => { if (!EMAIL.test(email.trim())) { setError("Enter your email address first."); return; } setNote("have"); go("code"); }}>Enter it now</button></p>
                    <button type="submit" hidden />
                  </form>
                )}
                {step === "who" && (
                  <>
                    {H("What are you here for?", <>No account for <b>{maskEmail(email)}</b> yet. Pick one and you can start today.</>)}
                    <ul className="ob-week" style={{ marginTop: 20 }}>
                      <li><button type="button" className="ob-row is-pick" data-en-focus="who" onClick={() => go("org")}><span className="ob-pick-ico is-blue"><Building2 size={19} aria-hidden /></span><span className="ob-row-t"><b>My organisation</b><small>An NGO, rescue or ABC team. Free to start, no call needed.</small></span></button></li>
                      <li><button type="button" className="ob-row is-pick" onClick={() => { setKind("feeder"); go("me"); }}><span className="ob-pick-ico is-amber"><Soup size={19} aria-hidden /></span><span className="ob-row-t"><b>I feed animals</b><small>Keep your route and the animals on it.</small></span></button></li>
                      <li><button type="button" className="ob-row is-pick" onClick={() => { setKind("individual"); go("me"); }}><span className="ob-pick-ico is-coral"><PawPrint size={19} aria-hidden /></span><span className="ob-row-t"><b>Just me</b><small>Report animals and follow what happens.</small></span></button></li>
                    </ul>
                    <p className="ob-note">Municipal office? <Link href="/demo">Talk to us</Link> and we set up your reviewing office. Invited by a team? Use the email they invited.</p>
                  </>
                )}
                {step === "me" && (
                  <form onSubmit={(e) => { e.preventDefault(); void createMe(); }} noValidate>
                    {H("What's your name?", <>We&apos;ll email a code to <b>{maskEmail(email)}</b>.</>)}
                    <label className="sr-only" htmlFor="en-name">Your name</label>
                    <input id="en-name" data-en-focus="me" className="ob-input" autoComplete="name" placeholder="Your name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                    <div className="ob-seg" role="radiogroup" aria-label="What you do">
                      {([["individual", "I report animals"], ["feeder", "I feed animals"]] as [Kind, string][]).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "is-on" : ""} onClick={() => setKind(k)}>{l}</button>)}
                    </div>
                    <Err />
                    <button type="submit" hidden />
                  </form>
                )}
                {step === "org" && (
                  <form onSubmit={(e) => { e.preventDefault(); void createOrg(); }} noValidate>
                    {H("Register your organisation", "You become its admin and can add your team next.")}
                    <label className="ob-label" htmlFor="en-org">Organisation name</label>
                    <input id="en-org" data-en-focus="org" className="ob-input" autoComplete="organization" placeholder="e.g. Ward 14 Animal Care Trust" value={orgName} maxLength={120} onChange={(e) => setOrgName(e.target.value)} />
                    <div className="ob-two">
                      <div><label className="ob-label" htmlFor="en-oname">Your name</label><input id="en-oname" className="ob-input" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
                      <div><label className="ob-label" htmlFor="en-city">City</label><input id="en-city" className="ob-input" autoComplete="address-level2" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} /></div>
                    </div>
                    <Err />
                    <p className="ob-note">Free to start. Your workspace opens now; we verify your details before public cases and fundraising switch on. For a funded programme, <Link href="/pricing">see plans</Link>.</p>
                    <button type="submit" hidden />
                  </form>
                )}
                {step === "code" && (
                  <form onSubmit={(e) => { e.preventDefault(); void signIn(); }} noValidate>
                    {H("Enter your code", <>{note === "unsent" || note === "have" ? "Six characters, from your StrayPaw email for" : "Six characters, sent to"} <b>{maskEmail(email)}</b>.</>)}
                    <CodeBoxes value={code} onChange={(v) => { setCode(v); if (cleanCode(v).length === 6) void signIn(v); }} shake={shake} invalid={!!error} disabled={!!busy} />
                    <Err />
                    {note === "unsent" && !error && <p className="ob-note is-box">The email did not go just now. If you have an earlier StrayPaw email, that code still works.</p>}
                    <p className="ob-note">Nothing yet? Check spam, or <button type="button" className="ob-link" onClick={() => void resend()} disabled={!!busy}>send it again</button>.</p>
                    <button type="submit" hidden />
                  </form>
                )}
              </Frame>
            </AnimatePresence>
          </main>
          {step !== "who" && (
            <footer className="ob-foot">
              <Cta label={cta.label} disabled={cta.disabled} busy={!!busy} onClick={cta.onClick} />
              <p className="ob-fine is-links">Authorised users only; activity is recorded. By continuing you accept the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
              <p className="ob-fine is-links"><Link href="/community/report">Report an animal</Link> without an account · <Link href="/contact">Help</Link></p>
            </footer>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
