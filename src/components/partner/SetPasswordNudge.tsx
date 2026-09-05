"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════════
   Choosing a password, after a code has already got you in.

   A staff code works once and is spent, which is what makes it safe to
   send in an email. The cost of that is a person who signs out with no
   way back in, so this asks for a password the first time they land on
   the dashboard.

   It asks; it does not insist. Dismissing it is a real choice, and the
   text says plainly what dismissing it costs. Anyone who does can be sent
   a fresh code by their team lead.
   ════════════════════════════════════════════════════════════════════ */

const KEY = "straypaw.setpassword.v1";

export function SetPasswordNudge() {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) === "ask");
    } catch {
      /* No storage, no nudge. Not worth failing a dashboard over. */
    }
  }, []);

  function close() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* Already effectively closed. */
    }
    setShow(false);
  }

  async function save() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const supa = getSupabase();
    if (!supa) {
      setError("Could not reach the account service. Try again shortly.");
      setBusy(false);
      return;
    }
    const { error: err } = await supa.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(close, 2200);
  }

  if (!show) return null;

  return (
    <div className="pw-nudge">
      <button
        type="button"
        className="pw-close"
        onClick={close}
        aria-label="Not now"
      >
        <X size={15} />
      </button>

      <h2>
        <Lock size={15} /> Choose a password
      </h2>

      {done ? (
        <p>Saved. You can sign in with your email and that password from now on.</p>
      ) : (
        <>
          <p>
            Your code has been used and will not work again. Set a password now
            and you can sign back in whenever you like. Skip this and you will
            need a new code from your team lead.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              aria-label="New password"
              autoComplete="new-password"
              disabled={busy}
            />
            <button type="submit" disabled={busy || password.length < 8}>
              {busy ? <Loader2 size={14} className="imp-spin" /> : null}
              Save password
            </button>
          </form>
          {error && <p className="pw-error">{error}</p>}
        </>
      )}
    </div>
  );
}
