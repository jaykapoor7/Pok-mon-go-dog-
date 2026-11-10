"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, KeyRound, Loader2, Mail } from "lucide-react";
import { cleanCode, signInWithCode, useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { EntryAside } from "@/sp5/entry/EntryAside";
import "@/sp3/sp3.css";
import "@/sp4/sp4.css";
import "@/sp4/entry4.css";

/* ════════════════════════════════════════════════════════════════════
   Sign in, built to the reference's two steps.

   The authorised-use notice sits under the Sign in button (one screen, no
   separate acceptance step).
   The split sign-in: grouped panels on the left (email + access code;
      other ways in), and a StrayPaw-blue "What's new" panel on the right.

   The sign-in itself is the existing email + code flow (signInWithCode);
   nothing about authentication changes here.
   ════════════════════════════════════════════════════════════════════ */

/** Only same-site paths are accepted as a destination after sign-in. */
function safeNext(v: string | null) { return v && v.startsWith("/") && !v.startsWith("//") ? v : "/app"; }

export function SignIn() {
  const q = useSearchParams();
  const next = safeNext(q?.get("next") ?? null);
  const router = useRouter();
  const { user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const r = await signInWithCode(email, code, setStep);
    setBusy(false); setStep(null);
    if (!r.ok) setError(r.error);
    /* On success the session listener sets `user`, and the effect above routes on. */
  }

  return (
    <div className="s4 s4l s9">
      <section className="s4l-left">
        <Link href="/" className="s4l-logo" aria-label="StrayPaw home"><StrayPawMark size={32} /><span>StrayPaw</span></Link>
        <div className="s9-col">
          <h1 className="s9-h">Welcome back.</h1>
          <p className="s9-sub">Sign in with the email and six-character code your organisation gave you. There is no password to remember.</p>
          <form onSubmit={submit} className="s9-form" noValidate>
            <label htmlFor="si-email">Work email</label>
            <input id="si-email" className="s4l-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.org" />
            <label htmlFor="si-code">Access code</label>
            {/* One real input; the six cells behind it show how much is left to type. */}
            <div className="s9-code">
              <div className="s9-cells" aria-hidden>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i < code.length ? "is-full" : i === code.length ? "is-next" : undefined} />)}</div>
              <input id="si-code" className="s4l-input is-code" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} maxLength={6} aria-describedby="si-code-hint" />
            </div>
            <p id="si-code-hint" className="s4l-hint">Six letters and numbers. Capitals do not matter.</p>
            {error && <p className="s4l-err s3-err" role="alert">{error}</p>}
            <button type="submit" className="s4l-go" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" />{step ?? "Working"}</> : <>Sign in<ArrowRight size={16} aria-hidden /></>}</button>
          </form>
          <nav className="s9-doors" aria-label="Other ways in">
            <Link href="/join"><KeyRound size={16} aria-hidden /><span><b>First time here?</b><small>Join with the invitation code your admin sent</small></span><ArrowRight size={15} aria-hidden /></Link>
            <Link href="/access"><Mail size={16} aria-hidden /><span><b>Lost your code?</b><small>We email it to your work address</small></span><ArrowRight size={15} aria-hidden /></Link>
            <Link href="/partner-apply"><Building2 size={16} aria-hidden /><span><b>New organisation?</b><small>Request access for your NGO or office</small></span><ArrowRight size={15} aria-hidden /></Link>
          </nav>
          <p className="s9-legal">Authorised users only; activity is recorded. By signing in you accept the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>. Need help? <Link href="/contact">Contact support</Link>.</p>
        </div>
      </section>
      <EntryAside />
    </div>
  );
}
