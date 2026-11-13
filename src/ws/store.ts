"use client";

/* ════════════════════════════════════════════════════════════════════
   The workspace's own memory: the pages a person has open as tabs, the
   pages they starred, where they were recently, and how they like the
   frame (sidebar width, which sections are folded, how records open).

   Kept on the device, per person, so signing in as someone else on the
   same phone never shows another person's tabs. Nothing here is a
   record: losing it loses convenience, never work.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Tab = { key: string; href: string; title: string; icon?: string; tone?: string; scroll?: number };
export type Fav = { href: string; title: string; icon?: string; tone?: string };
export type PeekMode = "side" | "center" | "page";
export type Prefs = { side: number; tucked: boolean; folded: string[]; open: string[]; peek: PeekMode };

type State = { tabs: Tab[]; favs: Fav[]; recent: Fav[]; prefs: Prefs };
const EMPTY: State = { tabs: [], favs: [], recent: [], prefs: { side: 240, tucked: false, folded: [], open: [], peek: "side" } };
export const MAX_TABS = 12;

let owner = "public";
let state: State = EMPTY;
const subs = new Set<() => void>();
const keyOf = (o: string) => `sp.ws.v1:${o}`;

function load(o: string): State {
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(o)) ?? "null") as Partial<State> | null;
    if (!raw || typeof raw !== "object") return EMPTY;
    const list = <T,>(v: unknown, ok: (x: T) => boolean) => (Array.isArray(v) ? (v as T[]).filter((x) => x && typeof x === "object" && ok(x)) : []);
    return {
      tabs: list<Tab>(raw.tabs, (t) => typeof t.key === "string" && typeof t.href === "string" && typeof t.title === "string").slice(0, MAX_TABS),
      favs: list<Fav>(raw.favs, (f) => typeof f.href === "string" && typeof f.title === "string").slice(0, 40),
      recent: list<Fav>(raw.recent, (f) => typeof f.href === "string" && typeof f.title === "string").slice(0, 12),
      prefs: { ...EMPTY.prefs, ...(raw.prefs && typeof raw.prefs === "object" ? raw.prefs : {}) },
    };
  } catch { return EMPTY; }
}
function save() { try { localStorage.setItem(keyOf(owner), JSON.stringify(state)); } catch { /* storage blocked: the frame still works, it just forgets */ } }
function set(next: State) { state = next; save(); subs.forEach((f) => f()); }

/** Point the store at this person. Called by the frame when sign-in settles. */
export function useOwner(id: string | null) {
  useEffect(() => {
    const o = id ?? "public";
    if (o === owner && state !== EMPTY) return;
    owner = o; state = load(o); subs.forEach((f) => f());
  }, [id]);
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useWs<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => pick(state), () => pick(EMPTY));
}
export const wsState = () => state;

/* ── tabs ─────────────────────────────────────────────────────────── */
/** Open (or return to) a page. A new page opens beside the one you were on. */
export function visit(tab: Tab, from: string | null) {
  const i = state.tabs.findIndex((t) => t.key === tab.key);
  let tabs: Tab[];
  if (i >= 0) tabs = state.tabs.map((t, k) => (k === i ? { ...t, href: tab.href, title: tab.title || t.title, icon: tab.icon ?? t.icon, tone: tab.tone ?? t.tone } : t));
  else {
    const at = from ? state.tabs.findIndex((t) => t.key === from) : -1;
    tabs = [...state.tabs];
    tabs.splice(at >= 0 ? at + 1 : tabs.length, 0, tab);
    /* Past the limit, the page opened longest ago goes (never the one being opened or the one you came from). */
    while (tabs.length > MAX_TABS) { const drop = tabs.findIndex((t) => t.key !== tab.key && t.key !== from); if (drop < 0) break; tabs.splice(drop, 1); }
  }
  set({ ...state, tabs });
}
export function retitle(key: string, title: string) {
  const t = state.tabs.find((x) => x.key === key);
  if (!t || t.title === title || !title) return;
  set({ ...state, tabs: state.tabs.map((x) => (x.key === key ? { ...x, title } : x)), recent: state.recent.map((r) => (r.href === t.href ? { ...r, title } : r)) });
}
export function keepScroll(key: string, scroll: number) {
  const t = state.tabs.find((x) => x.key === key);
  if (!t || t.scroll === scroll) return;
  state = { ...state, tabs: state.tabs.map((x) => (x.key === key ? { ...x, scroll } : x)) }; save();
}
export function closeTabs(keys: string[]) { set({ ...state, tabs: state.tabs.filter((t) => !keys.includes(t.key)) }); }
export function moveTab(key: string, before: string | null) {
  const from = state.tabs.findIndex((t) => t.key === key);
  if (from < 0 || key === before) return;
  const tabs = [...state.tabs]; const [t] = tabs.splice(from, 1);
  const to = before ? tabs.findIndex((x) => x.key === before) : -1;
  tabs.splice(to < 0 ? tabs.length : to, 0, t);
  set({ ...state, tabs });
}

/* ── favourites and recents ──────────────────────────────────────── */
export function toggleFav(f: Fav) {
  const on = state.favs.some((x) => x.href === f.href);
  set({ ...state, favs: on ? state.favs.filter((x) => x.href !== f.href) : [...state.favs, f].slice(-40) });
  return !on;
}
export function remember(f: Fav) {
  if (state.recent[0]?.href === f.href && state.recent[0].title === f.title) return;
  set({ ...state, recent: [f, ...state.recent.filter((x) => x.href !== f.href)].slice(0, 12) });
}

/* ── preferences ─────────────────────────────────────────────────── */
export function setPrefs(p: Partial<Prefs>) { set({ ...state, prefs: { ...state.prefs, ...p } }); }
export function toggleIn(list: "folded" | "open", id: string) {
  const cur = state.prefs[list];
  setPrefs({ [list]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } as Partial<Prefs>);
}

/* ── what a page remembers while its tab is open ─────────────────── */
/** A page's own state (a filter, a lane, a search) that should still be there when you come back to its tab.
    Kept for the browser session, by page address and name. */
const pageMem = new Map<string, string>();
const readPage = (k: string): string | null => {
  const m = pageMem.get(k);
  if (m !== undefined) return m;
  try { const r = sessionStorage.getItem(k); if (r !== null) { pageMem.set(k, r); return r; } } catch { /* storage blocked: memory only */ }
  return null;
};
export function usePageState<T>(name: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const k = `sp.ws.page:${owner}:${path}:${name}`;
  const subscribeK = useCallback((f: () => void) => { const on = (e: Event) => { if ((e as CustomEvent<string>).detail === k) f(); }; window.addEventListener("sp:page-state", on); return () => window.removeEventListener("sp:page-state", on); }, [k]);
  const raw = useSyncExternalStore(subscribeK, () => readPage(k), () => null);
  let value = initial;
  if (raw !== null) { try { value = JSON.parse(raw) as T; } catch { /* unreadable: start again */ } }
  const setValue = useCallback((v: T | ((p: T) => T)) => {
    let cur = initial;
    const r = readPage(k);
    if (r !== null) { try { cur = JSON.parse(r) as T; } catch { /* start from the initial value */ } }
    const next = JSON.stringify(typeof v === "function" ? (v as (p: T) => T)(cur) : v);
    pageMem.set(k, next);
    try { sessionStorage.setItem(k, next); } catch { /* kept in memory for this visit */ }
    window.dispatchEvent(new CustomEvent("sp:page-state", { detail: k }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return [value, setValue];
}
