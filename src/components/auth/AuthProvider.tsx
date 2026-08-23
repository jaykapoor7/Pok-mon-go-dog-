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
import { PawPrint, X, Loader2, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
// Accounts.
//
// Viewing the map needs no identity. Reporting works anonymously too. But
// *signing in* (email + password, via Supabase Auth) gives you a real account
// so you can edit / delete your sightings and update a dog's status from ANY
// device, and it's how partner NGOs log into their dashboard.
//
// When Supabase isn't configured (local dev with no backend) we fall back to a
// minimal name-only identity kept in localStorage, so the flow still works.
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

const LOCAL_KEY = "straypaw.user";

function nameFromEmail(email: string | undefined | null): string {
  if (!email) return "Friend";
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supa = getSupabase();
  const live = Boolean(supa);

  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<null | (() => void)>(null);

  // ── Session bootstrap ───────────────────────────────────────
  useEffect(() => {
    if (!supa) {
      // Local fallback: restore a name-only identity.
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) setUser(JSON.parse(raw) as AppUser);
      } catch {
        /* ignore */
      }
      setReady(true);
      return;
    }

    let alive = true;
    supa.auth.getSession().then(({ data }) => {
      if (!alive) return;
      applySession(data.session?.user ?? null);
      setReady(true);
    });

    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
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
  }, []);

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
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* ignore */
      }
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

  // Local fallback sign-in (no Supabase): just a name.
  const localSignIn = useCallback((name: string) => {
    const u: AppUser = { id: crypto.randomUUID(), name, email: null };
    setUser(u);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    setOpen(false);
    const action = pendingRef.current;
    pendingRef.current = null;
    action?.();
  }, []);

  return (
    <Ctx.Provider
      value={{ user, isAuthed: !!user, ready, signOut, requireAuth, openSignIn }}
    >
      {children}

      <AnimatePresence>
        {open && (
          <SignInSheet
            live={live}
            onClose={() => setOpen(false)}
            onLocalSignIn={localSignIn}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

// ── Sign-in sheet (email + password) ──────────────────────────
type Mode = "signin" | "signup" | "reset";

function SignInSheet({
  live,
  onClose,
  onLocalSignIn,
}: {
  live: boolean;
  onClose: () => void;
  onLocalSignIn: (name: string) => void;
}) {
  const supa = getSupabase();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"confirm" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Local fallback (no backend): name-only identity.
    if (!live || !supa) {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;
      onLocalSignIn(trimmed);
      return;
    }

    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "reset") {
        const { error: err } = await supa.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
        });
        if (err) throw err;
        setNotice("reset");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup") {
        const { data, error: err } = await supa.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: name.trim() ? { display_name: name.trim() } : undefined,
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/app` : undefined,
          },
        });
        if (err) throw err;
        // If email confirmation is required, no session is returned yet.
        if (!data.session) {
          setNotice("confirm");
          return;
        }
        // Otherwise onAuthStateChange signs us straight in.
        return;
      }

      // signin
      const { error: err } = await supa.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      // onAuthStateChange closes the sheet + resolves pending actions.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(
        /invalid login/i.test(msg) ? "Wrong email or password." :
        /already registered/i.test(msg) ? "That email already has an account, sign in instead." :
        msg
      );
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10";

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
        className="card w-full max-w-sm rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paw-100 text-paw-600">
            <PawPrint className="h-5 w-5" />
          </span>
          <button onClick={onClose} className="rounded-full p-1 text-bark-400 hover:bg-bark-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {notice ? (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-vaccinated" />
            <h2 className="font-display text-xl font-extrabold">
              {notice === "confirm" ? "Confirm your email" : "Check your email"}
            </h2>
            <p className="mt-1.5 text-sm text-bark-500">
              {notice === "confirm" ? (
                <>We sent a confirmation link to <span className="font-semibold text-bark-700 dark:text-bark-200">{email.trim()}</span>. Open it, then come back and sign in. Check spam if it doesn&apos;t arrive in a minute.</>
              ) : (
                <>We sent a password-reset link to <span className="font-semibold text-bark-700 dark:text-bark-200">{email.trim()}</span>.</>
              )}
            </p>
            {notice === "confirm" && (
              <button
                onClick={async () => { if (!supa) return; setBusy(true); try { await supa.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/app` : undefined } }); } finally { setBusy(false); } }}
                disabled={busy}
                className="btn-ghost mt-4 w-full py-3"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Resend confirmation email
              </button>
            )}
            <button onClick={onClose} className="btn-ghost mt-2 w-full py-3">Done</button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-extrabold">
              {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Sign in to StrayPaw"}
            </h2>
            <p className="mt-1 text-sm text-bark-500">
              {mode === "reset"
                ? "Enter your email and we'll send a link to set a new password."
                : "Sign in to edit your sightings, follow dogs, and, for partner NGOs, open your dashboard."}
            </p>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {live && mode === "signup" && (
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
              )}
              {!live && (
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
              )}
              {live && (
                <input autoFocus={mode !== "signup"} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} />
              )}
              {live && mode !== "reset" && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Choose a password (min 6)" : "Password"} className={field} />
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full py-3">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : mode === "signin" ? <LogIn className="h-4 w-4" /> : null}
                {!live ? "Continue" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
              </button>
            </form>

            {error && <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>}

            {live && (
              <div className="mt-4 flex items-center justify-between text-[13px]">
                {mode === "signin" ? (
                  <>
                    <button onClick={() => { setMode("signup"); setError(null); }} className="font-semibold text-paw-600 hover:underline">Create an account</button>
                    <button onClick={() => { setMode("reset"); setError(null); }} className="text-bark-500 hover:text-paw-600">Forgot password?</button>
                  </>
                ) : (
                  <button onClick={() => { setMode("signin"); setError(null); }} className="font-semibold text-paw-600 hover:underline">← Back to sign in</button>
                )}
              </div>
            )}

            {!live && (
              <p className="mt-3 text-center text-[11px] text-bark-400">We only store your name on this device.</p>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export const useAuth = () => useContext(Ctx);
