"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, KeyRound, Loader2, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { cleanCode, signInWithCode, useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import "@/sp3/sp3.css";
import "./entry.css";
import "@/sp4/sp4.css";
import "@/sp4/home/home4.css";
import "@/sp4/entry4.css";
import { Grain } from "@/sp4/site/Grain";
import { AskUi } from "@/sp4/home/ui";

/* Real, shipped product updates only. Each line is in the repository history. */
const WHATS_NEW: [string, string, string][] = [
  ["Oct 2026", "StrayPaw AI in every workspace", "Search, summarise and prepare records with citations; you confirm every change."],
  ["Oct 2026", "A new workspace layout", "Sidebar navigation, ⌘K search and one design across the site and the app."],
  ["Oct 2026", "Recent arrivals in moderation", "Everything that came in, in one list for reviewers."],
  ["Oct 2026", "Map: open any animal from its dot", "Filters that filter, and need shown by area."],
];

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    const r = await signInWithCode(email, code, setStep);
    setBusy(false); setStep(null);
    if (!r.ok) setError(r.error);
    /* On success the session listener sets `user`, and the effect above routes on. */
  }
  const accept = () => { setAck(true); try { sessionStorage.setItem("sp3.ack", "1"); } catch { /* fine */ } };

  return (
    <div className="s3 s3e s4 s4e">
      <section className="s3e-left">
        <header className="s3e-brand"><Link href="/" className="s3-brand"><StrayPawMark size={30} /><span>StrayPaw</span></Link><Link href="/" className="s3e-back">Back to site</Link></header>
        <div className="s3e-form">
          {!ack ? (
            <div className="s3e-notice" role="region" aria-labelledby="ack-title">
              <span className="s3e-notice-ico"><ShieldCheck size={20} /></span>
              <h1 id="ack-title">Authorised users only</h1>
              <p>Workspaces hold private case, reporter, veterinary and organisation records. Before you sign in:</p>
              <ul>
                <li><b>Confidentiality.</b> Use records only for your organisation&apos;s animal-care work. Do not share reporter details or exact locations outside the workspace.</li>
                <li><b>Recorded activity.</b> Changes you make, including those prepared with StrayPaw AI, are kept in each record&apos;s history with your name.</li>
                <li><b>Access by permission.</b> What you can see and change is decided by your organisation and role, and checked by the database.</li>
              </ul>
              <div className="s3-actions"><button type="button" className="s3-btn is-primary" onClick={accept}><Check size={16} />I understand</button><Link href="/" className="s3-btn is-line">Not now</Link></div>
              <p className="s3e-small">See <Link href="/privacy">Privacy</Link> and <Link href="/terms">Terms</Link>.</p>
            </div>
          ) : (
            <>
              <h1>Sign in</h1>
              <p className="s3e-sub">Use the email address and six-character code your organisation gave you. No password.</p>
              <form onSubmit={submit} className="s3e-fields" noValidate>
                <div className="s3-field"><label htmlFor="si-email">Work email</label><input id="si-email" className="s3-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.org" autoFocus disabled={busy} required /></div>
                <div className="s3-field"><label htmlFor="si-code">Access code</label><input id="si-code" className="s3-input is-code" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="XXXXXX" autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} maxLength={8} disabled={busy} required /></div>
                {error && <p className="s3-err" role="alert">{error}</p>}
                <button type="submit" className="s3-btn is-primary" disabled={busy}>{busy ? <><Loader2 size={16} className="animate-spin" />{step ?? "Working"}</> : <><LogIn size={16} />Sign in</>}</button>
              </form>
              <div className="s3e-alt">
                <Link href="/join" className="s3e-altrow"><KeyRound size={16} /><span><b>I have an invitation code</b><small>Join your organisation for the first time</small></span><ArrowRight size={15} /></Link>
                <Link href="/access" className="s3e-altrow"><LogIn size={16} /><span><b>Email me my code</b><small>For people who already have access</small></span><ArrowRight size={15} /></Link>
                <Link href="/partner-apply" className="s3e-altrow"><ShieldCheck size={16} /><span><b>Request organisation access</b><small>NGOs and municipal teams, after verification</small></span><ArrowRight size={15} /></Link>
              </div>
              <p className="s3e-small">Need help? <Link href="/contact">Contact support</Link>. Reporting an animal never needs a sign-in: <Link href="/community/report">report here</Link>.</p>
            </>
          )}
        </div>
        <footer className="s3e-foot">© {new Date().getFullYear()} StrayPaw · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></footer>
      </section>

      <aside aria-label="What's new at StrayPaw" style={{ display: "flex" }}>
        <Grain v={2} id="si-art" className="s4e-art" style={{ flex: 1 }}>
          <div className="s4-ui s4-ui-pad s4e-news">
            <span className="s4-tag is-blue"><Sparkles size={11} />What&apos;s new</span>
            <ol>{WHATS_NEW.map(([d, t, x]) => <li key={t}><small>{d}</small><b>{t}</b><span>{x}</span></li>)}</ol>
          </div>
          <AskUi />
          <p className="s4e-cap">The Pawsome People Project keeps its Coimbatore rescue, ABC and vaccination registers on one record. <Link href="/customers/the-pawsome-people-project">Read the case study</Link></p>
        </Grain>
      </aside>
    </div>
  );
}
