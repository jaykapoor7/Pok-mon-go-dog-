"use client";

/* The sign-in sheet, loaded the first time it is opened (AuthProvider's
   openSignIn / requireAuth). It carries the sheet's animation library, which
   no public page needs until somebody actually asks to sign in. */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X, Loader2, LogIn } from "lucide-react";
import { cleanCode, signInWithCode } from "./AuthProvider";

/** The sheet with its enter and exit animation: stays mounted after the first open so closing animates out. */
export function SignInLayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <SignInSheet
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

// ── Sign-in sheet (email + code) ──────────────────────────────
//
// This used to be two links: "I have a code" and "Email me a code", both of
// which navigated away. That is not a sign-in sheet. requireAuth() exists so
// an action can pause, collect an identity, and then RUN — a link throws the
// pending action away and drops the person on another page, where whatever
// they were trying to do is gone. So the code is entered here, and the
// action it was blocking happens straight afterwards.
//
// Nothing is checked in the browser. The pair is posted to /api/join, which
// resolves it against the three code spaces and, when it matches, hands back
// a one-time token bound to that address. Exchanging that token is what makes
// the session, so Supabase issues it and owns the security of it. Identical
// to how an organisation's staff code signs somebody in — one path, not two.
function SignInSheet({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await signInWithCode(email, code, setStep);
    setBusy(false);
    setStep(null);
    if (!r.ok) setError(r.error);
    /* onAuthStateChange closes the sheet and runs whatever was waiting. */
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="s3-root s3-signin-scrim"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="s3-signin-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
      >
        <div className="s3-signin-top">
          <span className="s3-signin-key"><KeyRound size={18} /></span>
          <button type="button" onClick={onClose} className="s3-signin-x" aria-label="Close"><X size={18} /></button>
        </div>
        <h2 id="signin-title">Sign in to StrayPaw</h2>
        <p className="s3-signin-sub">The email that received your StrayPaw code, and the six characters. No password; the same pair works on any device.</p>
        <form onSubmit={submit} className="s3-signin-form">
          <div className="s3-field"><label htmlFor="sheet-email">Work email</label>
            <input id="sheet-email" autoFocus type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organisation.org" className="s3-input" disabled={busy} /></div>
          <div className="s3-field"><label htmlFor="sheet-code">Access code</label>
            <input id="sheet-code" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="XXXXXX" inputMode="text" autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} maxLength={8} className="s3-input is-code" disabled={busy} /></div>
          <button type="submit" disabled={busy} className="s3-btn is-primary" style={{ width: "100%" }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy ? (step ?? "Working") : "Sign in"}
          </button>
        </form>
        {error && <p role="alert" className="s3-err" style={{ marginTop: 12 }}>{error}</p>}
        <p className="s3-signin-foot">No code, or new here? <a href="/sign-in" onClick={onClose}>Have it emailed, or get started</a></p>
        <p className="s3-signin-foot is-quiet">Reporting a street animal never needs a sign-in.</p>
      </motion.div>
    </motion.div>
  );
}
