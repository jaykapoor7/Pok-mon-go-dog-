"use client";

import { getSupabase } from "./supabase";

/* ════════════════════════════════════════════════════════════════════
   Product analytics, first-party, fire-and-forget.

   Rules this follows, because analytics is the easiest thing to let break
   a product it was added to measure:

   - Never throws and never blocks. A failed track() must not cost someone
     their sighting.
   - Storage access is wrapped. Reading localStorage *throws* in private
     mode, with site data blocked, and under some enterprise policies, an
     unguarded read here would take down every page this is called from.
     Without storage the person is simply uncounted, which is the right
     trade against breaking their report.
   - No IP, no user-agent, no fingerprinting. The anon id is a random value
     this browser made up about itself.
   ════════════════════════════════════════════════════════════════════ */

export type EventName =
  | "landing_view"
  | "app_opened"
  | "signup"
  | "login"
  | "report_started"
  | "report_photo_added"
  | "report_location_set"
  | "report_details_filled"
  | "report_submitted"
  | "report_failed"
  | "existing_animal_selected"
  | "animal_viewed"
  | "timeline_viewed"
  | "organisation_invited";

const ANON_KEY = "straypaw.anon.v1";
const SESSION_KEY = "straypaw.session.v1";

function randomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `r${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

/** A stable id for this browser, or null when storage is unavailable. */
function anonId(): string | null {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = randomId();
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

/** One visit. Resets when the tab closes, which is what makes a funnel a funnel. */
function sessionId(): string | null {
  try {
    let v = sessionStorage.getItem(SESSION_KEY);
    if (!v) {
      v = randomId();
      sessionStorage.setItem(SESSION_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

/* Some events fire on mount, and React 18 mounts twice in development. A
   per-name guard keeps a page-view from being counted as two. */
const oncePerSession = new Set<string>();

export function track(
  name: EventName,
  props: Record<string, unknown> = {},
  opts: { once?: boolean } = {}
): void {
  try {
    if (typeof window === "undefined") return;

    if (opts.once) {
      if (oncePerSession.has(name)) return;
      oncePerSession.add(name);
    }

    const supa = getSupabase();
    if (!supa) return;

    void supa
      .rpc("track_event", {
        p_name: name,
        p_anon_id: anonId(),
        p_session_id: sessionId(),
        p_path: window.location.pathname,
        p_props: props,
      })
      .then(
        () => undefined,
        () => undefined
      );
  } catch {
    /* Measurement must never be the reason something failed. */
  }
}
