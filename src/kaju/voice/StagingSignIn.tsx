"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

/** Uses the existing staging Supabase client/session, without admin keys or a
 * shared test password. The voice backend separately verifies the tester. */
export function StagingSignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    const db = getSupabase(); if (!db || busy) return;
    setBusy(true); setError("");
    try {
      if (!sent) {
        const { error } = await db.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/kaju/voice` } });
        if (error) throw Error(error.message);
        setSent(true);
      } else {
        // Default Supabase templates sometimes contain a verification link
        // instead of digits. Verify its token locally without following a
        // possibly unconfigured redirect back to another preview origin.
        const value = code.trim();
        let result;
        if (value.startsWith("https://")) {
          const link = new URL(value);
          if (link.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin || link.pathname !== "/auth/v1/verify") throw Error("Use the verification link from your staging sign-in email.");
          const type = link.searchParams.get("type");
          const hash = link.searchParams.get("token");
          if (!hash || !["signup", "magiclink", "email"].includes(type ?? "")) throw Error("That verification link is incomplete.");
          result = await db.auth.verifyOtp({ token_hash: hash, type: type as "signup" | "magiclink" | "email" });
        } else {
          result = await db.auth.verifyOtp({ email: email.trim(), token: value, type: "email" });
        }
        if (result.error) throw Error(result.error.message);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Sign-in could not finish."); }
    finally { setBusy(false); }
  };
  return <form className="kv-access" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
    <p>Sign in with your approved tester email. This uses StrayPaw’s staging account.</p>
    <label htmlFor="kv-email">Email</label>
    <input id="kv-email" type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={(e) => setEmail(e.target.value)} />
    {sent ? <>
      <p role="status">Check your email. Enter its code, or copy and paste the verification link here.</p>
      <label htmlFor="kv-email-code">Email code or verification link</label>
      <input id="kv-email-code" type="password" autoComplete="one-time-code" required value={code} disabled={busy} onChange={(e) => setCode(e.target.value)} />
    </> : null}
    <button disabled={busy}>{busy ? "Signing in…" : sent ? "Verify and sign in" : "Email me a sign-in link"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </form>;
}
