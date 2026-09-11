"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X, Loader2, LogIn } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { exchangeToken } from "@/lib/auth-exchange";
import { track } from "@/lib/analytics";
import { claimOrgMembership } from "@/lib/programme";
import { storeRole, type Role } from "@/lib/roles";

// ─────────────────────────────────────────────────────────────
// Accounts.
//
// Viewing the map needs no identity. Reporting works anonymously too. But
// Signing in with the email address and standing code assigned to a person
// gives them a real account, so their work is available on every device.
//
// A development build without the account service simply stays signed out;
// public reporting and map viewing continue to work without an identity.
// ─────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email: string | null;
}

interface AuthCtx {
  user: AppUser | null;
  isAuthed: boolean;
  ready: boolean;
  signOut: () => void;
  /** Ensures the user is signed in; opens the sign-in sheet if not. */
  requireAuth: (onReady?: () => void) => boolean;
  openSignIn: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAuthed: false,
  ready: false,
  signOut: () => {},
  requireAuth: () => false,
  openSignIn: () => {},
});

function nameFromEmail(email: string | undefined | null): string {
  if (!email) return "Friend";
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supa = getSupabase();
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<null | (() => void)>(null);

  // ── Session bootstrap ───────────────────────────────────────
  useEffect(() => {
    if (!supa) {
      setReady(true);
      return;
    }

    let alive = true;
    supa.auth.getSession().then(({ data }) => {
      if (!alive) return;
      applySession(data.session?.user ?? null);
      setReady(true);
    });

    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      applySession(session?.user ?? null);
      /* Access can be granted to an email address before that address has an
         account, so the invitation and the account can happen in either
         order. This picks up anything waiting for whoever just signed in.
         It moved out of the old password form when that form was removed,
         and was not put anywhere else — so an NGO member invited by email
         before their first sign-in silently never joined their organisation. */
      if (event === "SIGNED_IN" && session?.user) void claimOrgMembership();
      // A fresh sign-in fulfils any action that was waiting on auth.
      if (session?.user && pendingRef.current) {
        const action = pendingRef.current;
        pendingRef.current = null;
        setOpen(false);
        action();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // getSupabase() caches one client, so `supa` is stable for the life of the
    // page; listing it is accurate and does not re-run the subscription.
  }, [supa]);

  function applySession(
    u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null
  ) {
    if (!u) {
      setUser(null);
      return;
    }
    const display =
      (u.user_metadata?.display_name as string | undefined)?.trim() ||
      nameFromEmail(u.email);
    setUser({ id: u.id, name: display, email: u.email ?? null });
  }

  const signOut = useCallback(() => {
    if (supa) {
      supa.auth.signOut();
      setUser(null);
    } else {
      setUser(null);
    }
  }, [supa]);

  const openSignIn = useCallback(() => setOpen(true), []);

  const requireAuth = useCallback(
    (onReady?: () => void) => {
      if (user) {
        onReady?.();
        return true;
      }
      pendingRef.current = onReady ?? null;
      setOpen(true);
      return false;
    },
    [user]
  );

  return (
    <Ctx.Provider
      value={{ user, isAuthed: !!user, ready, signOut, requireAuth, openSignIn }}
    >
      {children}

      <AnimatePresence>
        {open && (
          <SignInSheet
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
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
  const supa = getSupabase();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanCode = (v: string) =>
    v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const entered = cleanCode(code);
    if (!emailOk) return setError("Enter the email address that received your code.");
    if (entered.length < 4) return setError("A StrayPaw code is six characters.");
    if (!supa) return setError("StrayPaw could not reach its account service. Try again shortly.");

    setBusy(true);
    setStep("Checking your code");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entered, email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as {
        kind?: "staff" | "volunteer" | "personal";
        tokenHash?: string;
        role?: string;
        error?: string;
      };
      if (!res.ok) return setError(data.error ?? "That email and code did not match.");

      /* A volunteer code grants reporting for a named team and deliberately
         mints no account, so there is no session to wait for. Sending them
         to /join is right here: it stores the team and opens reporting. */
      if (data.kind === "volunteer" || !data.tokenHash) {
        window.location.href = `/join?code=${encodeURIComponent(entered)}`;
        return;
      }

      setStep("Signing you in");
      const exchange = await exchangeToken(supa, data.tokenHash);
      if (exchange.error || !exchange.session) {
        /* Carry the real reason rather than "try once more", which sent
           people round the same loop with nothing to report. */
        return setError(`Your code is right, but the sign-in did not complete: ${exchange.error}`);
      }

      /* Record the use against a session the server can verify for itself,
         and join them to their organisation if the code carried one. */
      await fetch("/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${exchange.session.access_token}`,
        },
        body: JSON.stringify({ code: entered, action: "claim" }),
      }).catch(() => {
        /* The session exists either way; a failed claim is not a failed
           sign-in, and onAuthStateChange has already run the pending action. */
      });
      if (data.kind === "personal" && (data.role === "feeder" || data.role === "individual")) {
        storeRole(data.role as Role);
      }
      track("login");
      /* onAuthStateChange closes the sheet and runs whatever was waiting. */
    } catch {
      setError("Could not reach StrayPaw. Check your connection and try again.");
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  const field =
    "w-full rounded border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm rounded-b-none rounded-t-3xl p-6 sm:rounded"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded bg-paw-100 text-paw-600">
            <KeyRound className="h-5 w-5" />
          </span>
          <button onClick={onClose} className="rounded-full p-1 text-bark-400 hover:bg-bark-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="signin-title" className="font-display text-xl">Sign in with your code</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-bark-500">
          The email address that received your StrayPaw code, and the six
          characters. No password. The same pair works every time, on any
          device.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            autoFocus
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={field}
            disabled={busy}
            aria-label="Email address"
          />
          <input
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="XXXXXX"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={8}
            className={`${field} font-mono tracking-[0.3em]`}
            disabled={busy}
            aria-label="Your six-character code"
          />
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? (step ?? "Working") : "Sign in"}
          </button>
        </form>

        {error && <p role="alert" className="mt-3 text-sm font-medium text-status-injured">{error}</p>}

        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-bark-500">
          No code? <a href="/access" className="font-semibold text-paw-600 hover:underline" onClick={onClose}>Have one emailed to you</a>.
        </p>
        <p className="mt-2 text-center text-[11.5px] leading-relaxed text-bark-400">
          Reporting a street animal never needs a sign-in.
        </p>
      </motion.div>
    </motion.div>
  );
}

export const useAuth = () => useContext(Ctx);
