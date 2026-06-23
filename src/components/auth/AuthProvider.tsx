"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PawPrint, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Lightweight, client-side identity.
//
// Viewing the map needs no identity. Uploading and deleting your own posts
// require "signing in" — here a minimal local profile (a display name) kept in
// localStorage. This enforces the product's auth *flow* on the frontend and
// can later be swapped for real Supabase Auth without changing call sites.
// ─────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
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

const KEY = "straypaw.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const pending = useState<null | (() => void)>(null);
  const [pendingAction, setPendingAction] = pending;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as AppUser);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((u: AppUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(() => persist(null), [persist]);

  const openSignIn = useCallback(() => setOpen(true), []);

  const requireAuth = useCallback(
    (onReady?: () => void) => {
      if (user) {
        onReady?.();
        return true;
      }
      setPendingAction(() => onReady ?? null);
      setOpen(true);
      return false;
    },
    [user, setPendingAction]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    const u: AppUser = { id: crypto.randomUUID(), name: trimmed };
    persist(u);
    setOpen(false);
    setName("");
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }

  return (
    <Ctx.Provider
      value={{ user, isAuthed: !!user, ready, signOut, requireAuth, openSignIn }}
    >
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-bark-400 hover:bg-bark-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="font-display text-xl font-extrabold">
                Join StrayPaw
              </h2>
              <p className="mt-1 text-sm text-bark-500">
                Browsing is open to everyone. Add a name to start reporting dogs
                and managing your sightings.
              </p>
              <form onSubmit={submit} className="mt-4 space-y-3">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or handle"
                  className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
                />
                <button
                  type="submit"
                  disabled={name.trim().length < 2}
                  className="btn-primary w-full py-3"
                >
                  Continue
                </button>
              </form>
              <p className="mt-3 text-center text-[11px] text-bark-400">
                No password needed. We only store your name on this device.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
