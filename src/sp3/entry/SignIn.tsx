"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, KeyRound, Loader2, Mail } from "lucide-react";
import { cleanCode, signInWithCode, useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { WhatsNew } from "@/sp3/entry/WhatsNew";
import "@/sp3/sp3.css";
import "@/sp4/sp4.css";
import "@/sp4/entry4.css";

/* ════════════════════════════════════════════════════════════════════
   Sign in, built to the reference's two steps.

   1. "Authorised users only": a centred notice on a plain grey page, with
      I do not accept / I accept. Accepting is remembered for the tab.
   2. The split sign-in: grouped panels on the left (email + access code;
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
  const [ack, setAck] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { try { if (sessionStorage.getItem("sp3.ack") === "1") setAck(true); } catch { /* storage blocked */ } }, []);
  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const r = await signInWithCode(email, code, setStep);
    setBusy(false); setStep(null);
    if (!r.ok) setError(r.error);
    /* On success the session listener sets `user`, and the effect above routes on. */
  }
  const accept = () => { setAck(true); try { sessionStorage.setItem("sp3.ack", "1"); } catch { /* fine */ } };

  if (!ack) return (
    <div className="s4 s4l-ack">
      <Link href="/" className="s4l-logo" aria-label="StrayPaw home"><StrayPawMark size={34} /><span>StrayPaw</span></Link>
      <section className="s4l-card" role="region" aria-labelledby="ack-title">
        <h1 id="ack-title"><span>Attention</span><span>Authorised users only</span></h1>
        <p>Before you sign in, please read and acknowledge the following:</p>
        <ul>
          <li><b>Confidentiality:</b> StrayPaw workspaces hold private case, reporter, veterinary and organisation records. Use them only for your organisation&apos;s animal-care work, and do not share reporter details or exact locations outside the workspace.</li>
          <li><b>Recorded activity:</b> Changes you make, including those prepared with Kaju, are kept in each record&apos;s history with your name and the time.</li>
          <li><b>Access by permission:</b> What you can see and change is decided by your organisation and role, and checked by the database on every request.</li>
          <li><b>No unauthorised use:</b> Use only the access your organisation gave you. Access can be withdrawn by your organisation at any time.</li>
        </ul>
        <p>Select &ldquo;I accept&rdquo; to confirm you have read and understood these conditions.</p>
        <p className="s4l-legal"><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link></p>
      </section>
      <div className="s4l-choice">
        <Link href="/" className="s4l-no">I do not accept</Link>
        <button type="button" className="s4l-yes" onClick={accept}>I accept</button>
      </div>
    </div>
  );

  return (
    <div className="s4 s4l">
      <section className="s4l-left">
        <Link href="/" className="s4l-logo is-big" aria-label="StrayPaw home"><StrayPawMark size={44} /><span>StrayPaw</span></Link>
        <h1 className="s4l-sr">Sign in to StrayPaw</h1>
        <form onSubmit={submit} className="s4l-panel" noValidate>
          <p className="s4l-panel-h">Sign in with email and access code</p>
          <label htmlFor="si-email">Work email</label>
          <input id="si-email" className="s4l-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.org" />
          <label htmlFor="si-code">Access code</label>
          <input id="si-code" className="s4l-input is-code" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="XXXXXX" autoCapitalize="characters" autoComplete="one-time-code" maxLength={6} />
          {error && <p className="s4l-err s3-err" role="alert">{error}</p>}
          <button type="submit" className="s4l-go" disabled={busy}>{busy ? <><Loader2 size={15} className="animate-spin" />{step ?? "Working"}</> : "Sign in"}</button>
          <p className="s4l-hint">No password. Your organisation gives you the email and six-character code.</p>
        </form>
        <div className="s4l-panel">
          <p className="s4l-panel-h">Other ways in</p>
          <Link href="/join" className="s4l-alt"><KeyRound size={15} aria-hidden />Join with an invitation code</Link>
          <Link href="/access" className="s4l-alt"><Mail size={15} aria-hidden />Email me my access code</Link>
          <Link href="/partner-apply" className="s4l-alt"><Building2 size={15} aria-hidden />Request organisation access</Link>
        </div>
        <p className="s4l-help">Need help? <Link href="/contact">Contact support</Link></p>
        <p className="s4l-legal is-faint"><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link></p>
      </section>
      <WhatsNew />
    </div>
  );
}
