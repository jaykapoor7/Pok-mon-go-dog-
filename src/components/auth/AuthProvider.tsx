"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import dynamic from "next/dynamic";
import {lockOffline} from "@/lib/field/outbox";
import { getSupabase } from "@/lib/supabase";
import "@/sp3/sp3.css";
import { exchangeToken } from "@/lib/auth-exchange";
import { track } from "@/lib/analytics";
import { claimOrgMembership } from "@/lib/programme";
import { storeRole, type Role } from "@/lib/roles";
import { isRecordingDemo } from "@/lib/recording-demo";
import { demoUser } from "@/lib/demo/abc-demo";

/* Loaded when someone first opens the sign-in sheet (./SignInSheet). */
const SignInLayer = dynamic(() => import("./SignInSheet").then((m) => m.SignInLayer), { ssr: false });

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
  /* With no backend there is nothing to wait for, so say so from the first
     render on both sides. Flipping it in an effect raced any part of the page
     that hydrates later, which then rendered its signed-out state from a
     context the server never saw. */
  const [ready, setReady] = useState(!supa && !isRecordingDemo);
  const [open, setOpen] = useState(false);
  /* The sheet's code arrives on its first open and then stays mounted, so
     closing it still plays its exit. */
  const [sheetLoaded, setSheetLoaded] = useState(false);
  useEffect(() => { if (open) setSheetLoaded(true); }, [open]);
  const offlineOwner=useRef<string|null>(null);
  const pendingRef = useRef<null | (() => void)>(null);

  // ── Session bootstrap ───────────────────────────────────────
  useEffect(() => {
    if (isRecordingDemo) {
      { const u = demoUser(); setUser({ id: u.id, name: u.name, email: u.email }); }
      setReady(true);
      return;
    }
    if (!supa) {
      setReady(true);
      return;
    }

    let alive = true;
    supa.auth.getSession().then(({ data }) => {
      if (!alive) return;
      /* A transition, so any part of the page still hydrating finishes
         against the signed-out render the server sent before it changes. */
      startTransition(() => {
        applySession(data.session?.user ?? null);
        setReady(true);
      });
    });

    const { data: sub } = supa.auth.onAuthStateChange((event, session) => {
      applySession(session?.user ?? null);
      /* Access can be granted to an email address before that address has an
         account, so the invitation and the account can happen in either
         order. This picks up anything waiting for whoever just signed in.
         It moved out of the old password form when that form was removed,
         and was not put anywhere else — so an NGO member invited by email
         before their first sign-in silently never joined their organisation. */
      if (event === "SIGNED_IN" && session?.user) {
        const claimKey = `sp.claim-org.${session.user.id}`;
        let shouldClaim = true;
        try {
          const last = Number(sessionStorage.getItem(claimKey) ?? 0);
          shouldClaim = !last || Date.now() - last > 10 * 60_000;
          if (shouldClaim) sessionStorage.setItem(claimKey, String(Date.now()));
        } catch { /* private mode/storage blocked: the RPC itself is still bounded */ }
        if (shouldClaim) void claimOrgMembership();
      }
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
    if(offlineOwner.current!==u?.id){lockOffline();offlineOwner.current=u?.id??null}
    if (!u) {
      setUser(null);
      return;
    }
    /* display_name is what StrayPaw's own sign-up stores; name and full_name are what
       other providers (and the One Health demonstration accounts) carry. */
    const meta = u.user_metadata ?? {};
    const given = [meta.display_name, meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
    const display = given?.trim() || nameFromEmail(u.email);
    setUser({ id: u.id, name: display, email: u.email ?? null });
  }

  const signOut = useCallback(() => {
    if (isRecordingDemo) return;
    lockOffline();
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

      {(open || sheetLoaded) && <SignInLayer open={open} onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export const cleanCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

/**
 * The one sign-in path: email + standing code, verified by /api/join, which
 * returns a one-time token that Supabase exchanges for the session. Used by
 * the sign-in sheet and the /sign-in page alike, so there is no second login
 * system. Nothing is checked in the browser.
 */
export async function signInWithCode(emailIn: string, codeIn: string, onStep?: (s: string) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  const supa = getSupabase();
  const email = emailIn.trim().toLowerCase();
  const entered = cleanCode(codeIn);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter the email address that received your code." };
  if (entered.length < 4) return { ok: false, error: "A StrayPaw code is six characters." };
  if (!supa) return { ok: false, error: "StrayPaw could not reach its account service. Try again shortly." };
  onStep?.("Checking your code");
  try {
    const res = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: entered, email }) });
    const data = (await res.json()) as { kind?: "staff" | "volunteer" | "personal"; tokenHash?: string; role?: string; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "That email and code did not match." };
    /* A volunteer code grants reporting for a named team and deliberately
       mints no account; /join stores the team and opens reporting. */
    if (data.kind === "volunteer" || !data.tokenHash) { window.location.href = `/join?code=${encodeURIComponent(entered)}`; return { ok: true }; }
    onStep?.("Signing you in");
    const exchange = await exchangeToken(supa, data.tokenHash);
    if (exchange.error || !exchange.session) return { ok: false, error: `Your code is right, but the sign-in did not complete: ${exchange.error}` };
    /* Record the use against a verified session, and join the organisation the code carried. */
    await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${exchange.session.access_token}` }, body: JSON.stringify({ code: entered, action: "claim" }) }).catch(() => { /* a failed claim is not a failed sign-in */ });
    if (data.kind === "personal" && (data.role === "feeder" || data.role === "individual")) storeRole(data.role as Role);
    track("login");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach StrayPaw. Check your connection and try again." };
  }
}
