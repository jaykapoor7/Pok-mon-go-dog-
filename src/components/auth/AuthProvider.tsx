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
import { PawPrint, X, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
// Accounts.
//
// Viewing the map needs no identity. Reporting works anonymously too. But
// *signing in* (email magic link, via Supabase Auth) gives you a real account
// so you can edit / delete your sightings and update a dog's status from ANY
// device — not just the one you posted from.
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

// ── Sign-in sheet ─────────────────────────────────────────────
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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!live || !supa) {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;
      onLocalSignIn(trimmed);
      return;
    }

    const trimmedEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error: err } = await supa.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
        data: name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Could not send the link. Try again.");
      return;
    }
    setSent(true);
  }

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
          <button
            onClick={onClose}
            className="rounded-full p-1 text-bark-400 hover:bg-bark-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="py-2 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-vaccinated" />
            <h2 className="font-display text-xl font-extrabold">Check your email</h2>
            <p className="mt-1.5 text-sm text-bark-500">
              We sent a magic link to{" "}
              <span className="font-semibold text-bark-700 dark:text-bark-200">
                {email.trim()}
              </span>
              . Open it on this device to finish signing in.
            </p>
            <button onClick={onClose} className="btn-ghost mt-5 w-full py-3">
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-extrabold">Sign in to StrayPaw</h2>
            <p className="mt-1 text-sm text-bark-500">
              Browsing and reporting are open to everyone. Sign in to edit or
              delete your sightings and update a dog&apos;s status from any device.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
              />
              {live ? (
                <input
                  autoFocus
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
                />
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full py-3"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : live ? (
                  <Mail className="h-4 w-4" />
                ) : null}
                {live ? "Email me a magic link" : "Continue"}
              </button>
            </form>
            {error && (
              <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>
            )}
            <p className="mt-3 text-center text-[11px] text-bark-400">
              {live
                ? "No password needed — we email you a one-tap sign-in link."
                : "No password needed. We only store your name on this device."}
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export const useAuth = () => useContext(Ctx);
