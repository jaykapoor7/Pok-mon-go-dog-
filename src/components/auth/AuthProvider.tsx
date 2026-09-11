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
import { KeyRound, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

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

// ── Sign-in sheet (email + assigned code) ─────────────────────
function SignInSheet({ onClose }: { onClose: () => void }) {
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
      >
        <div className="mb-4 flex justify-end">
          <button onClick={onClose} className="rounded-full p-1 text-bark-400 hover:bg-bark-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded bg-paw-100 text-paw-600"><KeyRound className="h-5 w-5" /></span>
        <h2 className="mt-4 font-display text-xl">Sign in with your code</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-bark-500">Use the email address that received your StrayPaw code and the same six characters. Codes work for community members, feeders and organisation teams.</p>
        <a href="/join" className="btn-primary mt-5 w-full py-3" onClick={onClose}>I have a code</a>
        <a href="/access" className="btn-ghost mt-2 w-full py-3 text-center" onClick={onClose}>Email me a personal code</a>
        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-bark-400">Reporting a sighting never requires a sign-in.</p>
      </motion.div>
    </motion.div>
  );
}

export const useAuth = () => useContext(Ctx);
