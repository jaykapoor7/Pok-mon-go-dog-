"use client";

/* Where a visitor is in the guided demo, kept on this device only. */
import { getSupabase } from "@/lib/supabase";
import type { DemoRole } from "./tour";

export type TourMode = "guided" | "roam" | "off";
export type TourState = { mode: TourMode; step: number; role: DemoRole | null };

const KEY = "sp.demo.tour.v1";
export const TOUR_EVENT = "sp:demo-tour";
const OFF: TourState = { mode: "off", step: 0, role: null };

export function readTour(): TourState {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as TourState | null; return v && typeof v.step === "number" ? v : OFF; } catch { return OFF; }
}

export function writeTour(next: TourState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked: the guide lasts for this page only */ }
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: next }));
}

/* First-run notices that would sit on top of the guide. */
const QUIET = ["straypaw.notice.storage.v1", "straypaw.tour.v2", "sp.welcome.first-workflow", "straypaw-install-dismissed", "sp.videocard.dismissed"];

/** Signs this browser in as a sample account. Returns an error message, or null on success. */
export async function enterAs(role: DemoRole): Promise<string | null> {
  let r: Response;
  try {
    r = await fetch("/api/demo/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
  } catch { return "The demo could not be reached. Check your connection and try again."; }
  if (r.status === 404) return "The guided demo runs on demo.straypaw.org.";
  if (!r.ok) return "The sample account could not be signed in just now. Try again in a moment.";
  const tokens = (await r.json()) as { access_token: string; refresh_token: string };
  const sb = getSupabase();
  if (!sb) return "The demo is not configured on this site.";
  const { error } = await sb.auth.setSession(tokens);
  if (error) return "The sample account could not be signed in just now. Try again in a moment.";
  for (const k of QUIET) { try { localStorage.setItem(k, "1"); } catch { /* fine */ } }
  return null;
}

/** A change of sample account is a fresh visit: leave for the next screen without the last person's open tabs. */
export function leaveFor(path: string, replace = false) {
  const clear = () => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("sp.ws.v1:")) { const v = JSON.parse(localStorage.getItem(k) ?? "null"); if (v && typeof v === "object") localStorage.setItem(k, JSON.stringify({ ...v, tabs: [] })); } } catch { /* tabs simply stay */ } };
  clear(); window.addEventListener("pagehide", clear);
  if (replace) window.location.replace(path); else window.location.assign(path);
}
