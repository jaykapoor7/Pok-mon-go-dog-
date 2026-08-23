"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, KeyRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-static";

// Landing page for the password-reset email link. The recovery token in the URL
// establishes a temporary session (detectSessionInUrl), letting the user set a
// new password via updateUser.
export default function ResetPasswordPage() {
  const supa = getSupabase();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supa) { setReady(true); return; }
    supa.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => setHasSession(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, [supa]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!supa) return;
    setBusy(true);
    const { error: err } = await supa.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message || "Could not update password."); return; }
    setDone(true);
  }

  const field = "w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-24 sm:px-6">
      <div className="card p-6 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600">
          <KeyRound className="h-7 w-7" />
        </span>
        {!ready ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-paw-500" />
        ) : done ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-vaccinated" />
            <h1 className="font-display text-2xl font-extrabold">Password updated</h1>
            <p className="mt-1.5 text-sm text-bark-500">You&apos;re all set, you can use your new password to sign in.</p>
            <Link href="/app" className="btn-primary mt-5 w-full py-3">Go to the app</Link>
          </>
        ) : hasSession ? (
          <>
            <h1 className="font-display text-2xl font-extrabold">Set a new password</h1>
            <p className="mt-1.5 text-sm text-bark-500">Choose a new password for your StrayPaw account.</p>
            <form onSubmit={submit} className="mt-4 space-y-3 text-left">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6)" className={field} autoFocus />
              {error && <p className="text-sm font-medium text-status-injured">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-extrabold">Link expired</h1>
            <p className="mt-1.5 text-sm text-bark-500">This reset link is invalid or has expired. Request a new one from the sign-in screen.</p>
            <Link href="/app" className="btn-ghost mt-5 w-full py-3">Back to the app</Link>
          </>
        )}
      </div>
    </div>
  );
}
