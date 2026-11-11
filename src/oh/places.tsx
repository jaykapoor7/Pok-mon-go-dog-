"use client";

/* Places: the organisations a person works in.

   StrayPaw is one product. A person may coordinate an NGO, prescribe at a
   hospital and sit on a programme board, all with one sign-in. Each of those
   is a PLACE; the shell shows the place they are in, its few pages, and the
   others one tap away. Which pages a place has follows from its kind (a
   hospital records bites, a laboratory tests samples, a coordination cell
   oversees a programme) and from the modules its programme switched on.
   Nothing here grants access: every page reads through database functions
   that check the person's role at that place. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { call, type Kind, type Place, type ProgrammeRef } from "./data";

type PlacesState = { ready: boolean; places: Place[]; error: string | null; reload: () => void };
const Ctx = createContext<PlacesState>({ ready: false, places: [], error: null, reload: () => {} });
export const usePlaces = () => useContext(Ctx);

const cacheKey = (id: string) => `sp.places.${id}`;

export function PlacesProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [state, setState] = useState<{ owner: string | null; ready: boolean; places: Place[]; error: string | null }>({ owner: null, ready: false, places: [], error: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    if (!authReady) return;
    if (!user) { setState({ owner: null, ready: true, places: [], error: null }); return; }
    let live = true;
    /* Show the last known places at once (same person only), then refresh. */
    try { const c = sessionStorage.getItem(cacheKey(user.id)); if (c) setState({ owner: user.id, ready: true, places: JSON.parse(c) as Place[], error: null }); } catch { /* storage blocked */ }
    void call<Place[]>("oh_my_today").then((r) => {
      if (!live) return;
      /* A database without programmes answers with an error: treat as no places. */
      const places = Array.isArray(r.data) ? r.data : [];
      setState({ owner: user.id, ready: true, places, error: r.error && !/not set up/.test(r.error) ? r.error : null });
      try { sessionStorage.setItem(cacheKey(user.id), JSON.stringify(places)); } catch { /* fine */ }
    });
    return () => { live = false; };
  }, [user, authReady, tick]);
  const value = useMemo<PlacesState>(() => {
    const mine = user && state.owner === user.id;
    return { ready: authReady && (!user || (mine ? state.ready : false)), places: mine ? state.places : [], error: mine ? state.error : null, reload };
  }, [user, authReady, state, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ── What each kind of place does ─────────────────────────────────── */
export const isFacility = (k?: Kind) => k === "hospital" || k === "clinic";
/** Places whose work is the programme itself rather than records of their own. */
export const oversees = (k?: Kind) => k === "coordinator" || k === "municipal" || k === "state" || k === "research";
export const primaryProgramme = (p: Place): ProgrammeRef | null => p.programmes[0] ?? null;

export function placeHome(p: Place): string {
  const prog = primaryProgramme(p);
  if (oversees(p.kind) && prog) return `/programme/${prog.slug}`;
  return `/workspace/${p.organisation_id}`;
}

export type PlaceLink = { href: string; label: string; icon: string; exact?: boolean; count?: number | null; tone?: "flame" | "amber" | "blue"; section?: string; short?: string; mobile?: boolean; more?: boolean };

/** Every place follows the same pattern, so nobody has to learn a new sidebar:
      Today      the place's home: what needs you here, now
      Work       at most four things this place does every day
      Programme  the same three links for anyone taking part in a programme
      More       everything else, folded away
    The top bar carries the one primary action, so it is never repeated here. */
export function placeNav(p: Place, programmeSlug?: string): PlaceLink[] {
  const w = `/workspace/${p.organisation_id}`;
  const prog = p.programmes.find((x) => x.slug === programmeSlug) ?? primaryProgramme(p);
  const pr = prog ? `/programme/${prog.slug}` : null;
  const can = (c: string) => p.capabilities.includes(c);
  const W = "Work", P = "Programme";
  const links: PlaceLink[] = [];
  if (isFacility(p.kind)) {
    const due = (p.doses_due ?? 0) + (p.notices_new ?? 0);
    links.push({ href: w, label: "Today", short: "Today", icon: "home", exact: true, count: due || null, tone: "flame", mobile: true });
    links.push({ href: `${w}/register`, label: "Bite register", short: "Register", icon: "list", section: W, mobile: true });
    links.push({ href: `${w}/services`, label: "Services we offer", short: "Services", icon: "shield", section: W, count: p.services_stale || null, tone: "amber" });
  } else if (p.kind === "laboratory") {
    links.push({ href: w, label: "Today", short: "Today", icon: "home", exact: true, count: p.samples_waiting || null, tone: "blue", mobile: true });
    links.push({ href: `${w}/services`, label: "Services we offer", short: "Services", icon: "shield", section: W, count: p.services_stale || null, tone: "amber" });
  } else if (p.kind === "ngo") {
    links.push({ href: "/ngo", label: "Today", short: "Today", icon: "home", exact: true, mobile: true });
  }
  if (pr) {
    if (oversees(p.kind)) {
      links.push({ href: pr, label: "Today", short: "Today", icon: "home", exact: true, mobile: true });
      links.push({ href: `${pr}/coverage`, label: "Vaccination coverage", short: "Coverage", icon: "syringe", section: W, mobile: true });
      links.push({ href: `${pr}/report`, label: "Report", short: "Report", icon: "file", section: W, mobile: true });
    } else {
      links.push({ href: pr, label: "Programme", short: "Programme", icon: "gauge", exact: true, section: P });
    }
    links.push({ href: `${pr}/network`, label: "Care network", short: "Network", icon: "map", section: P, mobile: oversees(p.kind) });
    if (oversees(p.kind)) links.push({ href: `${pr}/work`, label: "Requests", short: "Requests", icon: "arrows", section: P, count: p.handoffs_open || null, tone: p.handoffs_overdue ? "flame" : "blue", mobile: true });
    else if (p.kind === "ngo") links.push({ href: w, label: "Requests", short: "Requests", icon: "arrows", exact: true, section: P, count: p.handoffs_open || null, tone: p.handoffs_overdue ? "flame" : "blue", mobile: true });
    if (oversees(p.kind)) {
      if (p.kind === "research" || can("oversee")) links.push({ href: `${pr}/data`, label: "Research data", icon: "activity", section: "Manage" });
      if (can("manage") || can("invite")) links.push({ href: `${pr}/setup`, label: "Programme setup", icon: "settings", section: "Manage" });
    }
  }
  return links;
}

/** The one primary action a place offers in the top bar. */
export function placeAction(p: Place): { href: string; label: string; short: string } | null {
  if (isFacility(p.kind) && p.capabilities.includes("record_exposure")) return { href: `/workspace/${p.organisation_id}/new`, label: "Record a bite", short: "Record" };
  if (p.kind === "ngo" && p.capabilities.includes("send_sample")) return { href: `/workspace/${p.organisation_id}/sample`, label: "Send a sample", short: "Sample" };
  return null;
}

/** Which place a path belongs to; programme pages prefer an overseeing place. */
export function placeFor(path: string, places: Place[], last?: string | null): Place | null {
  const w = path.match(/^\/workspace\/([0-9a-f-]{36})/);
  if (w) return places.find((p) => p.organisation_id === w[1]) ?? null;
  const pr = path.match(/^\/programme\/([a-z0-9-]+)/);
  if (pr) {
    const inProg = places.filter((p) => p.programmes.some((x) => x.slug === pr[1]));
    return inProg.find((p) => p.organisation_id === last) ?? inProg.find((p) => oversees(p.kind)) ?? inProg[0] ?? null;
  }
  return null;
}

/** Sentences for what needs a person at a place. */
export function placeLines(p: Place): { n: number; text: string; tone: "flame" | "amber" | "blue" }[] {
  const out: { n: number; text: string; tone: "flame" | "amber" | "blue" }[] = [];
  if (p.doses_due) out.push({ n: p.doses_due, text: p.doses_due === 1 ? "dose due today or overdue" : "doses due today or overdue", tone: "flame" });
  if (p.notices_new) out.push({ n: p.notices_new, text: p.notices_new === 1 ? "notice from the public" : "notices from the public", tone: "flame" });
  if (p.samples_waiting) out.push({ n: p.samples_waiting, text: p.samples_waiting === 1 ? "sample in the laboratory" : "samples in the laboratory", tone: "blue" });
  if (p.handoffs_overdue) out.push({ n: p.handoffs_overdue, text: p.handoffs_overdue === 1 ? "request overdue" : "requests overdue", tone: "flame" });
  const fresh = p.handoffs_open - p.handoffs_overdue;
  if (fresh > 0) out.push({ n: fresh, text: fresh === 1 ? "open request from a partner" : "open requests from partners", tone: "blue" });
  if (p.services_stale) out.push({ n: p.services_stale, text: p.services_stale === 1 ? "service confirmation has expired" : "service confirmations have expired", tone: "amber" });
  return out;
}

const LAST = "sp.place";
export function rememberPlace(id: string) { try { sessionStorage.setItem(LAST, id); } catch { /* fine */ } }
export function lastPlace(): string | null { try { return sessionStorage.getItem(LAST); } catch { return null; } }
