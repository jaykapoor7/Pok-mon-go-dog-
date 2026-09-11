"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";

/** A code is a durable login, not an onboarding hurdle. This page is only
 * for the person who wants to keep their community or feeder work across
 * devices; reporting itself remains public. */
export function AccessCodeRequest({ role }: { role: "individual" | "feeder" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/access/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      if (res.ok) setSent(true);
      else setError((await res.json()).error ?? "Could not send a code.");
    } catch {
      setError("Could not reach StrayPaw. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="join-wrap">
      <div className="join-card">
        <Link className="join-back" href="/app?choose=1">Back to StrayPaw</Link>
        {sent ? (
          <>
            <span className="join-sent-mark" aria-hidden><MailCheck size={20} /></span>
            <h1>Check your email</h1>
            <p className="join-lede">Your StrayPaw code is on its way. Keep the email address and six characters together: they are how you return on any device.</p>
            <Link href="/join" className="join-go">Enter my code <ArrowRight size={16} /></Link>
          </>
        ) : (
          <>
            <span className="join-kicker">{role === "feeder" ? "Feeder workspace" : "Community workspace"}</span>
            <h1>Get your StrayPaw code</h1>
            <p className="join-lede">No password to create or remember. We’ll email your personal code; use the same email and code whenever you sign in.</p>
            <form onSubmit={submit}>
              <label className="join-label" htmlFor="access-name">Your name</label>
              <input id="access-name" className="join-input" autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} />
              <label className="join-label join-label-spaced" htmlFor="access-email">Email address</label>
              <input id="access-email" className="join-input" placeholder="you@email.com" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
              <button className="join-go" disabled={busy}>{busy ? "Sending…" : <>Email my code <ArrowRight size={16} /></>}</button>
            </form>
          </>
        )}
        {error && <p className="join-error" role="alert">{error}</p>}
        <p className="join-foot">Already have a code? <Link href="/join">Sign in here</Link>. You can still report a street animal without an account.</p>
      </div>
    </main>
  );
}
