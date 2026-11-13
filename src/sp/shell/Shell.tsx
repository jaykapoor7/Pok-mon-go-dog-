"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw workspace: one frame for every person and every place.

   Mounted once and kept while pages change (Chrome mounts it for every
   app address), so the sidebar, the open tabs and Kaju never reload when
   you move between your organisation, your programme and a record.

   How it behaves is taken from Notion; how it looks, from the product
   demo on the landing page:

   · The sidebar is a tree. A workspace has Home, Inbox and a few pages;
     a page that holds records keeps its views nested under it. Sections
     fold, pages can be starred, the panel resizes and tucks away.
   · Every page you open is a tab. Tabs are kept between visits, can be
     reordered and closed, and remember where you were on the page.
   · A record opens in a peek over the page you are on (side or centre),
     or as a page of its own. See ws/Peek.tsx.
   · One command search (⌘K) reaches every page, record and action.

   What a person may see is decided by the server and by the role rules
   in workspaces.ts; this file arranges it. See ws/nav.ts for the tree.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import {
  Activity, ArrowLeft, ArrowRight, ArrowRightLeft, BookOpen, Building2, ChevronDown, ChevronRight, ChevronsLeft, ChevronsUpDown, CircleHelp, ClipboardCheck,
  Compass, Copy, ExternalLink, FileText, FlaskConical, Gauge, GraduationCap, HeartHandshake, Home, Inbox, Landmark, Layers, ListChecks, LogOut, Map as MapIcon, Menu as MenuIcon,
  MoreHorizontal, PanelLeft, PawPrint, Plus, PlusCircle, Radio, Search, Settings, ShieldCheck, Smartphone, Sparkles, Star, Stethoscope, Syringe, Users, WifiOff, X,
} from "lucide-react";
import { PlacesProvider, usePlaces, placeFor, placeNav, placeAction, placeHome, placeLines, lastPlace, rememberPlace, type PlaceLink } from "@/oh/places";
import { KIND_LABEL, ROLE_LABEL, clearReads } from "@/oh/data";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import { ORDER, workspaceView, lastWorkspace, rememberWorkspace, workspaceFor, type Role, type WorkspaceId } from "./workspaces";
import { Finder } from "./Finder";
import { NotificationsButton } from "@/oh/Notifications";
import { FirstDay, FIRSTDAY_EVENT, type FirstAction } from "./FirstDay";
import { Notices } from "../ui/Notice";
import { AiPanel, AiProvider, useAi } from "@/sp3/ai/AiPanel";
import { KajuFace } from "@/kaju/Kaju";
import { spFonts } from "../fonts";
import { fieldCache } from "@/lib/field/outbox";
import { flatten, locate, workspaceTree, type Node, type Section } from "@/ws/nav";
import { recordAt } from "@/ws/records";
import { Peek } from "@/ws/Peek";
import { ToastHost } from "@/oh/ui";
import { Menu, Tips, useKeys, type MenuAt, type MenuItem } from "@/ws/ui";
import { closeTabs, keepScroll, moveTab, remember, retitle, setPrefs, toggleFav, toggleIn, useOwner, useWs, visit, wsState, type Tab } from "@/ws/store";
import "../sp.css";
import "./shell.css";
import "../folk.css";
import "../mobile.css";
import "@/sp3/sp3.css";
import "./shell3.css";
import "./app3.css";
import "./app4.css";
import "./system5.css";
import "./os.css";
import "./console.css";
import "../ui/skin.css";
import "../ui/calm.css";
import "@/ws/theme.css";
import "@/ws/ws.css";

type Org = { id: string; name: string } | null;
type Mem = { member: boolean; ready: boolean; org: Org; role: Role | null; reviewer: boolean; owner?: string };
const NOBODY: Mem = { member: false, ready: false, org: null, role: null, reviewer: false };
const Membership = createContext<Mem>(NOBODY);

/** Whether the signed-in person belongs to an organisation (display only: the server decides access). */
export const useMembership = () => useContext(Membership);

const ICON: Record<string, typeof MapIcon> = {
  map: MapIcon, radio: Radio, activity: Activity, book: BookOpen, building: Building2, heart: HeartHandshake, sparkles: Sparkles,
  home: Home, inbox: Inbox, paw: PawPrint, layers: Layers, phone: Smartphone, shield: ShieldCheck, file: FileText, grad: GraduationCap,
  users: Users, compass: Compass, landmark: Landmark, list: ListChecks, check: ClipboardCheck,
  stethoscope: Stethoscope, flask: FlaskConical, gauge: Gauge, arrows: ArrowRightLeft, syringe: Syringe, plus: PlusCircle, settings: Settings,
};
const KIND_ICON: Record<string, string> = { hospital: "stethoscope", clinic: "stethoscope", laboratory: "flask", ngo: "paw", municipal: "landmark", state: "landmark", coordinator: "gauge", research: "activity" };
const NGO_ROLE: Record<string, string> = { admin: "Lead", coordinator: "Coordinator", veterinarian: "Veterinarian", member: "Field team" };
const PHONE = "(max-width: 860px)";
const strip = (h: string) => h.split(/[?#]/)[0];

const Nested = createContext(false);

export function Shell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  /* A page that mounts the frame inside a route Chrome already framed renders once. */
  if (useContext(Nested)) return <>{children}</>;
  return <Nested.Provider value={true}><AiProvider><PlacesProvider><Frame flush={flush}>{children}</Frame></PlacesProvider></AiProvider></Nested.Provider>;
}

/** The query string, read where it cannot hold the frame back from rendering on the server. */
function SearchWatch({ on }: { on: (s: string) => void }) {
  const s = useSearchParams()?.toString() ?? "";
  useEffect(() => { on(s); }, [s, on]);
  return null;
}

function Frame({ children, flush }: { children: ReactNode; flush: boolean }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const ai = useAi();
  const [search, setSearch] = useState("");
  const k = useKeys();
  const { user, ready, signOut, openSignIn } = useAuth();
  useOwner(ready ? user?.id ?? null : null);

  /* ── who this is ─────────────────────────────────────────────────── */
  const [memState, setMem] = useState<Mem>(NOBODY);
  const mem: Mem = !user ? { ...NOBODY, ready } : memState.owner === user.id ? memState : NOBODY;
  const [net, setNet] = useState(0);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => { setOnline(navigator.onLine); if (navigator.onLine) setNet((n) => n + 1); };
    setOnline(navigator.onLine);
    window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!user) { setMem({ ...NOBODY, ready: true }); clearReads(); return; }
    let live = true;
    const blank: Mem = { owner: user.id, member: false, ready: true, org: null, role: null, reviewer: false };
    setMem({ ...blank, ready: false });
    if (!navigator.onLine) { void fieldCache<Mem>(`membership:${user.id}`).then((c) => { if (live) setMem(c?.value.owner === user.id ? c.value : blank); }).catch(() => { if (live) setMem(blank); }); return () => { live = false; }; }
    Promise.all([isNgoMember().catch(() => false), getMyNgo().catch(() => null), getMyRole().catch(() => ({ role: null, reviewer: false }))]).then(([m, o, r]) => {
      const role = (["admin", "coordinator", "veterinarian", "member"] as const).find((x) => x === r.role) ?? null;
      if (!live) return;
      const checked: Mem = { owner: user.id, member: m, ready: true, org: o ? { id: o.id, name: o.name } : null, role, reviewer: r.reviewer };
      setMem(checked); if (m && o) void fieldCache(`membership:${user.id}`, checked).catch(() => {});
    });
    return () => { live = false; };
  }, [user, ready, net]);

  /* ── where this is ───────────────────────────────────────────────── */
  const [ws, setWs] = useState<WorkspaceId>(() => workspaceFor(path, null));
  useEffect(() => { const w = workspaceFor(path, lastWorkspace()); setWs(w); if (ORDER.some((x) => path === `/${x}` || path.startsWith(`/${x}/`))) rememberWorkspace(w); }, [path]);
  /* A shared page such as /assistant opened directly belongs to the person's own workspace, not Community. */
  useEffect(() => {
    if (!mem.ready || lastWorkspace() || ORDER.some((w) => path === `/${w}` || path.startsWith(`/${w}/`))) return;
    const home: WorkspaceId | null = mem.member ? "ngo" : mem.reviewer ? "city" : null;
    if (home) { setWs(home); rememberWorkspace(home); }
  }, [mem.ready, mem.member, mem.reviewer, path]);

  const pl = usePlaces();
  const place = ws === "health" ? placeFor(path, pl.places, lastPlace()) : null;
  const placeId = place?.organisation_id;
  useEffect(() => { if (placeId) rememberPlace(placeId); }, [placeId]);
  const progSlug = path.match(/^\/programme\/([a-z0-9-]+)/)?.[1];
  const ngoPlace = mem.org ? pl.places.find((p) => p.kind === "ngo" && p.ngo_id === mem.org!.id) : undefined;
  const cityPlace = mem.reviewer ? pl.places.find((p) => p.kind === "municipal") : undefined;
  /* The member's own NGO, seen through its programme pages, is still the NGO workspace: same tree, same home. */
  const ownNgo = ws === "health" && place?.kind === "ngo" && !!mem.org && place.ngo_id === mem.org.id;
  const view: WorkspaceId = ownNgo ? "ngo" : ws;
  const base = workspaceView(view, mem.role, mem.reviewer);

  const tree: Section[] = useMemo(() => {
    const P = (links: PlaceLink[]) => links.filter((l) => l.section === "Programme");
    if (view === "health") {
      const links: PlaceLink[] = place ? placeNav(place, progSlug) : pl.places.map((p): PlaceLink => { const lines = placeLines(p), waiting = lines.reduce((n, l) => n + l.n, 0); return { href: placeHome(p), label: p.short_name ?? p.name, icon: KIND_ICON[p.kind] ?? "building", section: "Your places", count: waiting || null, tone: lines.some((l) => l.tone === "flame") ? "flame" : "blue" }; });
      return workspaceTree({ ws: "health", role: mem.role, reviewer: mem.reviewer, member: mem.member, placeLinks: links });
    }
    const mine = view === "ngo" ? ngoPlace : view === "city" ? cityPlace : undefined;
    const pr = cityPlace?.programmes[0]?.slug;
    const programmeLinks = !mine ? undefined : view === "city" && pr ? [{ href: `/programme/${pr}`, label: "Overview", icon: "gauge", exact: true, section: "Programme" } as PlaceLink, ...P(placeNav(mine))] : P(placeNav(mine));
    return workspaceTree({ ws: view, role: mem.role, reviewer: mem.reviewer, member: mem.member, programmeLinks, programmeName: mine?.programmes[0]?.name ?? null });
  }, [view, place, progSlug, pl.places, mem.role, mem.reviewer, mem.member, ngoPlace, cityPlace]);

  const home = view === "health" ? (place ? placeHome(place) : "/today") : base.home;
  const action = view === "health" ? (place ? placeAction(place) : null) : (view !== "ngo" || mem.member ? base.action : null);
  const title = view === "ngo" && mem.org ? mem.org.name : view === "health" ? (place?.name ?? "Your places") : view === "city" ? (cityPlace?.name ?? "Municipal review") : `StrayPaw ${base.label}`;
  const sub = view === "ngo" ? `${mem.role ? NGO_ROLE[mem.role] : "Member"} · NGO` : view === "health" ? (place ? `${ROLE_LABEL[place.role]} · ${KIND_LABEL[place.kind]}` : `${pl.places.length} place${pl.places.length === 1 ? "" : "s"}`) : view === "city" ? "Reviewer · Municipal" : base.purpose.split(":")[0];
  const kind = view === "ngo" ? "ngo" : view === "city" ? "municipal" : view === "health" ? (place?.kind ?? "today") : "public";
  const initials = title.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(of|the|and|for|sample|demo|straypaw)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "SP";
  const sample = !!(view === "health" ? place : view === "ngo" ? ngoPlace : cityPlace)?.illustrative;

  /* The places this person can switch between. */
  const places = useMemo(() => {
    const out: { key: string; href: string; title: string; sub: string; on: boolean }[] = [];
    if (pl.places.length > 1 || (pl.places.length === 1 && (mem.member || mem.reviewer) && !ngoPlace && !cityPlace)) out.push({ key: "today", href: "/today", title: "All my places", sub: "What is waiting in each", on: path === "/today" });
    if (mem.member && mem.org) out.push({ key: "ngo", href: "/ngo", title: mem.org.name, sub: "NGO", on: view === "ngo" });
    if (mem.reviewer) out.push({ key: "city", href: "/city/insights", title: cityPlace?.name ?? "Municipal review", sub: "Reviewing office", on: view === "city" });
    for (const p of pl.places) {
      if ((p.kind === "ngo" && mem.org && p.ngo_id === mem.org.id) || (p.kind === "municipal" && mem.reviewer)) continue;
      out.push({ key: p.organisation_id, href: placeHome(p), title: p.name, sub: `${ROLE_LABEL[p.role]} · ${KIND_LABEL[p.kind]}`, on: placeId === p.organisation_id });
    }
    return out;
  }, [pl.places, mem.member, mem.org, mem.reviewer, ngoPlace, cityPlace, path, view, placeId]);

  /* ── the page this address is ────────────────────────────────────── */
  const rec = recordAt(path);
  const at = useMemo(() => locate(tree, rec ? rec.rec.parent(rec.m) : path), [tree, rec, path]);
  const atHome = path === home;
  const onAssistant = path === "/assistant";
  const isMap = path === "/community" || path === "/community/report" || path === "/ngo/map" || path === "/city";
  const isFlush = flush || isMap || path === "/ngo/work" || onAssistant;
  /* A page kept under another without being one of its views (a form such as "New case") is a page of its own. */
  const inner = !!at && !rec && !at.view && path !== strip(at.node.href);
  const pageKey = rec || inner ? path : at ? strip(at.node.href) : path;
  const pageIcon = rec ? rec.rec.icon : at ? at.node.icon : atHome ? "home" : undefined;
  const pageTone = rec ? rec.rec.tone : at ? at.node.tone : undefined;
  const fixedTitle = atHome ? (view === "health" && !place ? "My places" : "Home") : rec || inner ? null : at ? at.node.label : onAssistant ? "Kaju" : null;

  /* ── tabs: every page you open ───────────────────────────────────── */
  const tabs = useWs((s) => s.tabs);
  const favs = useWs((s) => s.favs);
  const prefs = useWs((s) => s.prefs);
  const prevKey = useRef<string | null>(null);
  const restore = useRef<string | null>(null);
  const visits = useRef(0);
  const [canBack, setCanBack] = useState(false);
  useEffect(() => { visits.current += 1; setCanBack(visits.current > 1); }, [path]);
  const [phone, setPhone] = useState(false);
  useEffect(() => { const m = window.matchMedia(PHONE); const on = () => setPhone(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  const here = `${path}${search ? `?${search}` : ""}`;
  /* Back and Forward move between pages already open; a redirect (the address replaced, nothing added to history)
     is not a page anyone opened, so its tab goes. */
  const popped = useRef(false); const histLen = useRef(0);
  useEffect(() => { const on = () => { popped.current = true; }; window.addEventListener("popstate", on); return () => window.removeEventListener("popstate", on); }, []);
  useEffect(() => {
    if (!ready) return;
    const from = prevKey.current;
    const replaced = !!from && from !== pageKey && !popped.current && restore.current !== pageKey && window.history.length === histLen.current;
    popped.current = false; histLen.current = window.history.length;
    if (replaced) closeTabs([from!]);
    visit({ key: pageKey, href: here, title: fixedTitle ?? (rec ? rec.rec.label : ""), icon: pageIcon, tone: pageTone }, from === pageKey || replaced ? null : from);
    prevKey.current = pageKey;
    /* A record, or a page outside the tree, takes its name from what it shows once it has loaded. */
    if (fixedTitle) return;
    const tries = [350, 1200, 2600].map((ms) => window.setTimeout(() => {
      const h1 = rec ? document.querySelector("#sp-main .os-page h1")?.textContent?.trim() : null;
      const name = (h1 && h1.length < 80 ? h1 : (document.title.split(/,| · | \| /)[0] ?? "").trim()) || base.label;
      retitle(pageKey, name);
      if (rec) remember({ href: path, title: name, icon: pageIcon, tone: pageTone });
    }, ms));
    return () => tries.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, here, fixedTitle, ready, user?.id]);
  /* Where you were on the page is kept with its tab, and returned to when you come back to it. */
  useEffect(() => {
    let t = 0;
    const onScroll = () => { window.clearTimeout(t); t = window.setTimeout(() => keepScroll(pageKey, Math.round(window.scrollY)), 160); };
    window.addEventListener("scroll", onScroll, { passive: true });
    if (restore.current === pageKey) {
      const y = wsState().tabs.find((x) => x.key === pageKey)?.scroll ?? 0; restore.current = null;
      if (y > 0) { let n = 0; const go = () => { if (document.documentElement.scrollHeight - window.innerHeight >= y - 4 || n++ > 40) window.scrollTo(0, y); else requestAnimationFrame(go); }; requestAnimationFrame(go); }
    }
    return () => { window.clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [pageKey]);
  const openTab = useCallback((t: Tab) => { if (t.key === pageKey) return; keepScroll(pageKey, Math.round(window.scrollY)); restore.current = t.key; router.push(t.href, { scroll: false }); }, [pageKey, router]);
  const shut = useCallback((keys: string[]) => {
    const left = wsState().tabs.filter((t) => !keys.includes(t.key));
    if (keys.includes(pageKey)) {
      const i = wsState().tabs.findIndex((t) => t.key === pageKey);
      const next = left[Math.min(i, left.length - 1)] ?? null;
      closeTabs(keys); prevKey.current = null;
      if (next) { restore.current = next.key; router.push(next.href, { scroll: false }); } else if (!atHome) router.push(home);
    } else closeTabs(keys);
  }, [pageKey, router, home, atHome]);
  const tabList = tabs.some((t) => t.key === pageKey) ? tabs : [...tabs, { key: pageKey, href: here, title: fixedTitle ?? "" }];
  const [drag, setDrag] = useState<{ key: string; over: string | null } | null>(null);

  /* ── peek: a record over the page ────────────────────────────────── */
  const peekPath = useMemo(() => { const p = new URLSearchParams(search).get("peek"); return p && recordAt(p) ? p : null; }, [search]);
  const pushed = useRef(0);
  const openPeek = useCallback((p: string) => {
    const u = new URL(window.location.href); const had = u.searchParams.has("peek"); u.searchParams.set("peek", p);
    if (had) window.history.replaceState(null, "", u); else { pushed.current += 1; window.history.pushState(null, "", u); }
  }, []);
  const closePeek = useCallback(() => {
    if (pushed.current > 0) { pushed.current -= 1; window.history.back(); return; }
    const u = new URL(window.location.href); u.searchParams.delete("peek"); window.history.replaceState(null, "", u);
  }, []);
  const peekAsPage = useCallback(() => { if (!peekPath) return; pushed.current = 0; router.push(peekPath); }, [peekPath, router]);
  /* A plain click on a record opens it over the page; ⌘ or Ctrl opens it as a tab behind this one. */
  const onContentClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.open === "page") return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const hit = recordAt(url.pathname);
    if (!hit || url.pathname === path) return;
    if (e.metaKey || e.ctrlKey) { e.preventDefault(); visit({ key: url.pathname, href: url.pathname + url.search, title: a.dataset.title ?? a.textContent?.trim().slice(0, 40) ?? hit.rec.label, icon: hit.rec.icon, tone: hit.rec.tone }, pageKey); router.prefetch(url.pathname); return; }
    if (prefs.peek === "page" || window.matchMedia(PHONE).matches) return;
    if (url.pathname === peekPath) { e.preventDefault(); return; }
    e.preventDefault(); openPeek(url.pathname);
  };

  /* Light or dark, as chosen; "system" follows the device. Only while the app is on screen. */
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const set = () => { document.documentElement.dataset.wsTheme = prefs.theme === "dark" || (prefs.theme === "system" && m.matches) ? "dark" : "light"; };
    set(); m.addEventListener("change", set);
    return () => { m.removeEventListener("change", set); delete document.documentElement.dataset.wsTheme; };
  }, [prefs.theme]);

  /* ── sidebar: width, tucking away, the phone drawer ──────────────── */
  const [float, setFloat] = useState(false);
  const floatT = useRef(0);
  const floatIn = () => { window.clearTimeout(floatT.current); setFloat(true); };
  const floatOut = () => { window.clearTimeout(floatT.current); floatT.current = window.setTimeout(() => setFloat(false), 260); };
  const [drawer, setDrawer] = useState(false);
  const toggleSide = useCallback(() => { setPrefs({ tucked: !wsState().prefs.tucked }); setFloat(false); }, []);
  const resize = (e: React.PointerEvent) => {
    e.preventDefault(); const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId); el.dataset.on = "1";
    const move = (m: PointerEvent) => { document.documentElement.style.setProperty("--ws-side-live", `${Math.max(208, Math.min(400, m.clientX))}px`); };
    const up = (m: PointerEvent) => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); delete el.dataset.on; document.documentElement.style.removeProperty("--ws-side-live"); setPrefs({ side: Math.max(208, Math.min(400, Math.round(m.clientX / 8) * 8)) }); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  };
  useEffect(() => { setDrawer(false); setFloat(false); }, [path]);
  /* The phone's sheet closes when it is pulled down from its top. */
  const pull = useRef<{ y: number; top: boolean } | null>(null);
  const sheetStart = (e: ReactTouchEvent) => { const sc = (e.currentTarget as HTMLElement).querySelector(".ws-side-in"); pull.current = { y: e.touches[0].clientY, top: !sc || sc.scrollTop <= 0 }; };
  const sheetEnd = (e: ReactTouchEvent) => { const p = pull.current; pull.current = null; if (p?.top && e.changedTouches[0].clientY - p.y > 72) setDrawer(false); };
  /* How the next page arrives on a phone: pushed in from the right, back in from the left, or swapped when it is a sibling. The page reads it from the document, so no render waits on it. */
  useEffect(() => {
    const root = document.documentElement;
    const pop = () => { root.dataset.wsNav = "pop"; };
    const click = (e: MouseEvent) => { const a = (e.target as Element).closest?.("a[href]"); if (!a) return; root.dataset.wsNav = a.closest(".ws-dock, .ws-views, .ws-side") ? "tab" : "push"; };
    /* Installed as an app there is no browser edge to swipe: a swipe in from the left edge goes back. */
    let from: { x: number; y: number } | null = null;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ts = (e: TouchEvent) => { const t = e.touches[0]; from = standalone && t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null; };
    const te = (e: TouchEvent) => { const t = e.changedTouches[0]; if (from && t.clientX - from.x > 72 && Math.abs(t.clientY - from.y) < 48) window.history.back(); from = null; };
    window.addEventListener("popstate", pop); document.addEventListener("click", click, true);
    window.addEventListener("touchstart", ts, { passive: true }); window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("popstate", pop); document.removeEventListener("click", click, true); window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, []);
  useEffect(() => { if (!drawer) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [drawer]);

  /* ── command search, menus, keys ─────────────────────────────────── */
  const [find, setFind] = useState(false);
  const closeFind = useCallback(() => setFind(false), []);
  const [menu, setMenu] = useState<{ at: MenuAt; items: MenuItem[]; label: string } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const menuAt = (e: React.MouseEvent | React.KeyboardEvent, items: MenuItem[], label: string, anchor = false) => {
    e.preventDefault(); e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const m = "clientX" in e && !anchor ? { x: e.clientX, y: e.clientY } : { x: r.left, y: r.bottom + 4 };
    setMenu({ at: m, items, label });
  };
  const copy = (href: string) => { void navigator.clipboard?.writeText(new URL(href, window.location.origin).toString()).catch(() => {}); };
  const star = (f: { href: string; title: string; icon?: string; tone?: string }) => { toggleFav(f); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") { e.preventDefault(); setFind(true); }
      else if (cmd && e.key.toLowerCase() === "j") { e.preventDefault(); ai.toggle(); }
      else if (cmd && e.key === "\\") { e.preventDefault(); toggleSide(); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setFind(true); }
      else if (e.altKey && !cmd && e.code === "KeyW") { e.preventDefault(); shut([pageKey]); }
      else if (e.altKey && !cmd && /^Digit[1-9]$/.test(e.code)) { const tab = wsState().tabs[Number(e.code.slice(5)) - 1]; if (tab) { e.preventDefault(); openTab(tab); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ai, toggleSide, shut, openTab, pageKey]);

  /* ── the first day, and what the search offers first ─────────────── */
  const guided = !!user && ((view === "ngo" && mem.member) || (view === "city" && mem.reviewer) || (view === "health" && pl.places.length > 0));
  const firstActions: FirstAction[] = view === "ngo" ? (
    mem.role === "admin" ? [{ href: "/ngo/import", label: "Bring your register", note: "Excel or CSV, as it is" }, { href: "/ngo/team", label: "Add your team", note: "Each person gets their own code" }, { href: "/ngo/rescues", label: "Open Rescues", note: "Animals in your care" }, { href: "/ngo/sterilisation", label: "Open Sterilisation", note: "Procedures on the way to the report" }]
    : mem.role === "veterinarian" ? [{ href: "/ngo/verification?stage=vet", label: "Open what waits for your sign-off", note: "Procedures only a vet can authorise" }, { href: "/ngo/pipeline?stage=vet", label: "See your stage on the board", note: "With the vet" }]
    : mem.role === "member" ? [{ href: "/ngo/field", label: "Start your round", note: "Works with or without signal" }, { href: "/ngo/pipeline", label: "Open Cases", note: "What your team is working on" }]
    : [{ href: "/ngo/rescues", label: "Open Rescues", note: "Animals in your care" }, { href: "/ngo/sterilisation", label: "Open Sterilisation", note: "Procedures on the way to the report" }, { href: "/ngo/packages", label: "See this month's report", note: "What can be claimed, and what blocks the rest" }, ...(ngoPlace ? [{ href: `/workspace/${ngoPlace.organisation_id}`, label: "Answer programme partners", note: "Requests from hospitals and the laboratory" }] : [])]
  ) : view === "city" ? [{ href: "/city/review", label: "Open the submissions waiting", note: "Packages waiting for your office" }, { href: "/city/contracts", label: "Check contracts and rates", note: "What each operator is paid for" }]
    : place ? [{ href: placeHome(place), label: `Open ${place.short_name ?? place.name}`, note: "What needs you here today" }, ...(placeAction(place) ? [{ href: placeAction(place)!.href, label: placeAction(place)!.label, note: "The action this place starts with" }] : [])]
    : pl.places.slice(0, 3).map((p) => ({ href: placeHome(p), label: `Open ${p.short_name ?? p.name}`, note: "What needs you there today" }));
  const findPages = useMemo(() => [
    ...flatten(tree),
    ...pl.places.filter((p) => p.organisation_id !== placeId).flatMap((p) => placeNav(p).map((l) => ({ href: l.href, label: l.label === "Today" ? `Home at ${p.short_name ?? p.name}` : l.label, detail: p.short_name ?? p.name }))),
    ...pl.places.filter((p) => p.capabilities.includes("record_exposure")).map((p) => ({ href: `/workspace/${p.organisation_id}/new`, label: "Record a bite", detail: p.short_name ?? p.name })),
  ], [tree, pl.places, placeId]);

  /* ── parts ───────────────────────────────────────────────────────── */
  const ic = (icon?: string, tone?: string, sq = false) => { const I = ICON[icon ?? ""] ?? FileText; return sq ? <span className="ws-sq" data-c={tone ?? "slate"} aria-hidden><I size={12} strokeWidth={2.2} /></span> : <span className="ws-ic" aria-hidden><I size={16} strokeWidth={1.8} /></span>; };
  const nodeMenu = (n: Node): MenuItem[] => [
    { label: "Open in a new tab", icon: <ExternalLink size={14} />, onSelect: () => { visit({ key: strip(n.href), href: n.href, title: n.label, icon: n.icon, tone: n.tone }, pageKey); router.prefetch(n.href); } },
    { label: favs.some((f) => f.href === n.href) ? "Remove from favourites" : "Add to favourites", icon: <Star size={14} />, onSelect: () => star({ href: n.href, title: n.label, icon: n.icon, tone: n.tone }) },
    { label: "Copy link", icon: <Copy size={14} />, onSelect: () => copy(n.href) },
    ...(n.create ? ["divider" as const, { label: n.create.label, icon: <Plus size={14} />, onSelect: () => router.push(n.create!.href) }] : []),
  ];
  const row = (n: Node, depth = 0) => {
    const kids = n.children ?? [];
    const within = !!at && at.node === n;
    /* Views stay folded until asked for: the page's own view tabs already show them. */
    const open = kids.length > 0 && prefs.open.includes(n.href);
    const toggle = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); toggleIn("open", n.href); };
    return (
      <li key={n.href + n.label}>
        <div className={`ws-item${within && (!at?.view || !open) ? " is-on" : ""}${within ? " is-within" : ""}`} data-depth={depth} onContextMenu={(e) => menuAt(e, nodeMenu(n), n.label)}>
          {kids.length ? <button type="button" className="ws-tw" aria-label={open ? `Fold ${n.label}` : `Unfold ${n.label}`} aria-expanded={open} onClick={toggle}><ChevronRight size={14} aria-hidden /></button> : null}
          <Link href={n.href} aria-current={within ? (at?.view ? "true" : "page") : undefined} onMouseEnter={() => router.prefetch(n.href)}>
            {ic(n.icon, n.tone, true)}
            <span className="ws-lb">{n.label}</span>
          </Link>
          {n.count ? <b className="ws-count" data-tone={n.countTone} aria-label={`${n.count} waiting`}>{n.count > 99 ? "99+" : n.count}</b> : null}
          <span className="ws-acts">
            <button type="button" className="ws-ib is-s" aria-label={`More for ${n.label}`} data-tip="Open in a tab, favourite, copy link" onClick={(e) => menuAt(e, nodeMenu(n), n.label, true)}><MoreHorizontal size={14} aria-hidden /></button>
            {n.create ? <Link href={n.create.href} className="ws-ib is-s" aria-label={n.create.label} data-tip={n.create.label}><Plus size={14} aria-hidden /></Link> : null}
          </span>
        </div>
        {open ? <ul className="ws-kids">{kids.map((c) => { const on = within && at?.view === c; return (
          <li key={c.href}><div className={`ws-item is-view${on ? " is-on" : ""}`} data-depth={depth + 1}><Link href={c.href} aria-current={on ? "page" : undefined} onMouseEnter={() => router.prefetch(c.href)}><span className="ws-dot" aria-hidden /><span className="ws-lb">{c.label}</span></Link></div></li>); })}</ul> : null}
      </li>
    );
  };
  const placeMenu = (): MenuItem[] => [
    ...(places.length > 1 ? [{ heading: "Your places" } as MenuItem, ...places.map((p): MenuItem => ({ label: p.title, note: p.sub, on: p.on, onSelect: () => router.push(p.href) })), "divider" as const] : []),
    ...(user ? [
      ...(view === "ngo" && mem.role === "admin" ? [{ label: "Members and codes", icon: <Users size={14} />, onSelect: () => router.push("/ngo/team") } as MenuItem, { label: "Settings", icon: <Settings size={14} />, onSelect: () => router.push("/ngo/settings") } as MenuItem] : []),
      { label: "Join a place with a code", icon: <Plus size={14} />, onSelect: () => router.push("/join") } as MenuItem,
      "divider" as const,
      { heading: user.email ?? user.name } as MenuItem,
      { label: "My activity", icon: <Activity size={14} />, onSelect: () => router.push("/community/activity") } as MenuItem,
      { label: "Sign out", icon: <LogOut size={14} />, onSelect: () => { void signOut(); } } as MenuItem,
    ] : [{ label: "Sign in", icon: <ArrowRight size={14} />, onSelect: () => openSignIn() } as MenuItem]),
  ];
  const helpMenu = (): MenuItem[] => [
    ...(guided ? [{ label: "Take the tour", icon: <Compass size={14} />, onSelect: () => window.dispatchEvent(new Event(FIRSTDAY_EVENT)) } as MenuItem] : []),
    { label: "Help centre", icon: <BookOpen size={14} />, onSelect: () => router.push("/docs") },
    { label: "What is new", icon: <Sparkles size={14} />, onSelect: () => router.push("/product-updates") },
    "divider", { heading: "Appearance" },
    { label: "Light", on: prefs.theme === "light", onSelect: () => setPrefs({ theme: "light" }) },
    { label: "Dark", on: prefs.theme === "dark", onSelect: () => setPrefs({ theme: "dark" }) },
    { label: "Same as this device", on: prefs.theme === "system", onSelect: () => setPrefs({ theme: "system" }) },
    "divider", { heading: "Keys" },
    { label: "Search and actions", kbd: `${k.mod} K`, onSelect: () => setFind(true) },
    { label: "Kaju", kbd: `${k.mod} J`, onSelect: () => ai.toggle() },
    { label: "Tuck the sidebar", kbd: `${k.mod} \\`, onSelect: toggleSide },
    { label: "Close this tab", kbd: `${k.alt} W`, onSelect: () => shut([pageKey]) },
  ];
  const tabMenu = (t: Tab): MenuItem[] => {
    const i = tabList.findIndex((x) => x.key === t.key);
    return [
      { label: "Close", kbd: t.key === pageKey ? `${k.alt} W` : undefined, icon: <X size={14} />, onSelect: () => shut([t.key]) },
      { label: "Close the others", onSelect: () => shut(tabList.filter((x) => x.key !== t.key).map((x) => x.key)) },
      { label: "Close tabs to the right", onSelect: () => shut(tabList.slice(i + 1).map((x) => x.key)) },
      "divider",
      { label: favs.some((f) => f.href === t.href) ? "Remove from favourites" : "Add to favourites", icon: <Star size={14} />, onSelect: () => star({ href: t.href, title: t.title, icon: t.icon, tone: t.tone }) },
      { label: "Copy link", icon: <Copy size={14} />, onSelect: () => copy(t.href) },
    ];
  };
  const pageTitle = tabList.find((t) => t.key === pageKey)?.title || fixedTitle || (rec ? rec.rec.label : "");
  const starred = favs.some((f) => strip(f.href) === (rec ? path : strip(here)) || f.href === here);
  const pageMenu = (): MenuItem[] => [
    { label: starred ? "Remove from favourites" : "Add to favourites", icon: <Star size={14} />, onSelect: () => star({ href: rec ? path : here, title: pageTitle, icon: pageIcon, tone: pageTone }) },
    { label: "Copy link", icon: <Copy size={14} />, onSelect: () => copy(here) },
    "divider", { heading: "Appearance" },
    { label: "Light", on: prefs.theme === "light", onSelect: () => setPrefs({ theme: "light" }) },
    { label: "Dark", on: prefs.theme === "dark", onSelect: () => setPrefs({ theme: "dark" }) },
    { label: "Same as this device", on: prefs.theme === "system", onSelect: () => setPrefs({ theme: "system" }) },
    "divider", { heading: "Records open in" },
    { label: "Side peek", on: prefs.peek === "side", onSelect: () => setPrefs({ peek: "side" }) },
    { label: "Centre peek", on: prefs.peek === "center", onSelect: () => setPrefs({ peek: "center" }) },
    { label: "A full page", on: prefs.peek === "page", onSelect: () => setPrefs({ peek: "page" }) },
  ];
  const side = (
    <div className="ws-side-in">
      <div className="ws-place">
        <button type="button" className="ws-place-btn" aria-haspopup="menu" aria-label={`${title}, ${sub}. Places and account`} onClick={(e) => menuAt(e, placeMenu(), "Places and account", true)}>
          <span className="ws-mark" data-kind={kind} aria-hidden>{initials}</span>
          <span className="ws-place-t"><b>{title}</b><small>{sub}</small></span>
          <ChevronsUpDown size={14} aria-hidden />
        </button>
        <button type="button" className="ws-ib ws-tuck" onClick={toggleSide} aria-label="Tuck the sidebar away" data-tip="Tuck away" data-kbd={`${k.mod} \\`} data-tip-at="below"><ChevronsLeft size={16} aria-hidden /></button>
      </div>
      <button type="button" className="ws-quick" onClick={() => setFind(true)} aria-keyshortcuts="Control+K Meta+K"><span>Quick actions</span><kbd aria-hidden>{k.mod}K</kbd></button>
      <nav className="ws-tree" aria-label={`${title} pages`}>
        <ul className="ws-top">
          <li><div className={`ws-item${atHome ? " is-on" : ""}`}><Link href={home} aria-current={atHome ? "page" : undefined}>{ic("home")}<span className="ws-lb">Home</span></Link></div></li>
          {user ? <li><NotificationsButton variant="row" /></li> : null}
          {!onAssistant ? <li><button type="button" className={`ws-item${ai.open ? " is-open" : ""}`} onClick={() => ai.toggle()} aria-pressed={ai.open} aria-keyshortcuts="Control+J Meta+J"><span className="ws-ic" aria-hidden><Sparkles size={16} strokeWidth={1.8} /></span><span className="ws-lb">Kaju</span><kbd aria-hidden>{k.mod}J</kbd></button></li> : null}
        </ul>
        {favs.length ? (
          <section className="ws-sec" aria-label="Favourites">
            <button type="button" className="ws-sec-h" aria-expanded={!prefs.folded.includes("favs")} onClick={() => toggleIn("folded", "favs")}><span>Favourites</span><ChevronDown size={12} aria-hidden /></button>
            {!prefs.folded.includes("favs") ? <ul>{favs.map((f) => (
              <li key={f.href}><div className={`ws-item${strip(f.href) === path ? " is-on" : ""}`} onContextMenu={(e) => menuAt(e, [{ label: "Remove from favourites", icon: <Star size={14} />, onSelect: () => star(f) }, { label: "Copy link", icon: <Copy size={14} />, onSelect: () => copy(f.href) }], f.title)}>
                <Link href={f.href}>{ic(f.icon, f.tone, true)}<span className="ws-lb">{f.title}</span></Link>
                <span className="ws-acts"><button type="button" className="ws-ib is-s" aria-label={`Remove ${f.title} from favourites`} data-tip="Remove" onClick={() => star(f)}><X size={14} aria-hidden /></button></span>
              </div></li>))}</ul> : null}
          </section>
        ) : null}
        {tree.map((s) => (
          <section key={s.id} className="ws-sec" aria-label={s.label}>
            {s.label ? <button type="button" className="ws-sec-h" aria-expanded={!prefs.folded.includes(s.id)} onClick={() => toggleIn("folded", s.id)}><span>{s.label}</span><ChevronDown size={12} aria-hidden /></button> : null}
            {!prefs.folded.includes(s.id) ? <ul>{s.nodes.map((n) => row(n))}</ul> : null}
          </section>
        ))}
      </nav>
      <div className="ws-side-foot">
        {!online ? <p className="ws-off" role="status"><WifiOff size={14} aria-hidden />Offline. Records wait on this device.</p> : null}
        {user ? <button type="button" className="ws-item" aria-haspopup="menu" onClick={(e) => menuAt(e, helpMenu(), "Help and keys", true)}><span className="ws-ic" aria-hidden><CircleHelp size={16} strokeWidth={1.8} /></span><span className="ws-lb">Help and keys</span></button>
          : <button type="button" className="ws-signin" onClick={() => openSignIn()}>Sign in</button>}
      </div>
    </div>
  );
  const crumb = (
    <nav className="ws-crumb" aria-label="Breadcrumb">
      {atHome ? <span aria-current="page">Home</span> : <>
        {at?.section.label ? <><span className="ws-crumb-s">{at.section.label}</span><i aria-hidden>/</i></> : null}
        {at ? (rec || inner ? <Link href={at.node.href}>{at.node.label}</Link> : <span aria-current="page">{at.node.label}</span>) : null}
        {rec || inner ? <><i aria-hidden>/</i><span aria-current="page">{pageTitle || rec?.rec.label || ""}</span></> : null}
        {!at && !rec ? <span aria-current="page">{pageTitle}</span> : null}
      </>}
    </nav>
  );
  const views = !rec && !inner && at?.node.children ? at.node.children : null;
  /* The phone: a page reached from another page is pushed on top and gets a back arrow; a top-level page gets the place button. */
  const deep = !!rec || !!inner || (!at && !atHome);
  const work = tree[0]?.nodes[0] ?? null;
  const atWork = !!work && at?.node === work && !deep;

  return (
    <Membership.Provider value={mem}>
      <div className={`sp sp-app s3-root sx3 os cn ws ${spFonts}${isFlush ? " is-flush" : ""}${isMap ? " is-map" : ""}${prefs.tucked ? " is-tucked" : ""}${ai.open && !onAssistant ? " has-ai" : ""}${peekPath ? ` has-peek is-peek-${prefs.peek === "center" ? "center" : "side"}` : ""}${drawer ? " has-drawer" : ""}`} data-ws={ws} style={{ ["--ws-side" as string]: `${prefs.side}px`, ["--ws" as string]: base.ink }}>
        <a href="#sp-main" className="sp-skip">Skip to content</a>
        <Suspense fallback={null}><SearchWatch on={setSearch} /></Suspense>

        {/* ── sidebar ───────────────────────────────────────────────── */}
        {prefs.tucked ? <div className="ws-edge" onPointerEnter={floatIn} aria-hidden /> : null}
        <aside className="ws-side" aria-label="Workspace" onTouchStart={phone ? sheetStart : undefined} onTouchEnd={phone ? sheetEnd : undefined} data-float={prefs.tucked && float ? "true" : undefined} inert={(phone ? !drawer : prefs.tucked && !float) ? true : undefined} onPointerEnter={prefs.tucked ? floatIn : undefined} onPointerLeave={prefs.tucked ? floatOut : undefined}>{side}</aside>
        {!prefs.tucked ? <div className="ws-resize" role="separator" aria-orientation="vertical" aria-label="Resize the sidebar" onPointerDown={resize} onDoubleClick={() => setPrefs({ side: 240 })} /> : null}
        {drawer ? <div className="ws-scrim" onClick={() => setDrawer(false)} aria-hidden /> : null}

        {/* ── the page column ───────────────────────────────────────── */}
        <div className="ws-col">
          <header className="ws-bar">
            {prefs.tucked ? <button type="button" className="ws-ib ws-open" onClick={toggleSide} onPointerEnter={floatIn} aria-label="Keep the sidebar open" data-tip="Open the sidebar" data-kbd={`${k.mod} \\`}><PanelLeft size={16} aria-hidden /></button> : null}
            {deep ? <button type="button" className="ws-ib ws-phone-back" onClick={() => (canBack ? router.back() : router.push(at?.node.href ?? home))} aria-label="Back"><ArrowLeft size={20} aria-hidden /></button>
              : <button type="button" className="ws-ib ws-drawer-btn" onClick={() => setDrawer(true)} aria-label="Open the menu" aria-haspopup="dialog" aria-expanded={drawer}><MenuIcon size={18} aria-hidden /></button>}
            <span className="ws-hist">
              <button type="button" className="ws-ib" onClick={() => router.back()} disabled={!canBack} aria-label="Back" data-tip="Back" data-kbd={`${k.alt} ←`}><ArrowLeft size={16} aria-hidden /></button>
              <button type="button" className="ws-ib" onClick={() => router.forward()} aria-label="Forward" data-tip="Forward" data-kbd={`${k.alt} →`}><ArrowRight size={16} aria-hidden /></button>
            </span>
            <nav className="ws-tabs" aria-label="Open pages">
              {tabList.map((t) => {
                const on = t.key === pageKey; const I = ICON[t.icon ?? ""] ?? FileText;
                return (
                  <div key={t.key} className={`ws-tab${on ? " is-on" : ""}${drag?.over === t.key && drag.key !== t.key ? " is-drop" : ""}`} draggable
                    onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }} onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); shut([t.key]); } }} onContextMenu={(e) => menuAt(e, tabMenu(t), `Tab ${t.title}`)}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.key); setDrag({ key: t.key, over: null }); }}
                    onDragOver={(e) => { if (drag) { e.preventDefault(); if (drag.over !== t.key) setDrag({ ...drag, over: t.key }); } }}
                    onDrop={(e) => { e.preventDefault(); if (drag) moveTab(drag.key, t.key); setDrag(null); }} onDragEnd={() => setDrag(null)}>
                    <Link href={t.href} className="ws-tab-a" aria-current={on ? "page" : undefined} draggable={false} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); openTab(t); }} onKeyDown={(e) => { if (e.key === "Delete") { e.preventDefault(); shut([t.key]); } }} onMouseEnter={() => { if (!on) router.prefetch(t.href); }}>
                      <span className="ws-tab-i" data-c={t.tone} aria-hidden><I size={14} strokeWidth={1.9} /></span>
                      <span className="ws-tab-t">{t.title || "Loading…"}</span>
                    </Link>
                    <button type="button" className="ws-tab-x" aria-label={`Close ${t.title || "this tab"}`} onClick={() => shut([t.key])}><X size={12} aria-hidden /></button>
                  </div>
                );
              })}
              <button type="button" className="ws-ib ws-tab-new" aria-label="Open something: search and quick actions" data-tip="Open a page" data-kbd={`${k.mod} K`} onClick={() => setFind(true)}><Plus size={14} aria-hidden /></button>
            </nav>
            <span className="ws-phone-title">{deep ? (pageTitle || title) : title}</span>
            <span className="ws-bar-end">
              <button type="button" className="ws-ib ws-search-btn" onClick={() => setFind(true)} aria-label="Search"><Search size={18} aria-hidden /></button>
              {!onAssistant ? <button type="button" className={`ws-kaju${ai.open ? " is-on" : ""}`} onClick={() => ai.toggle()} aria-pressed={ai.open} aria-label="Ask Kaju" data-tip="Ask Kaju" data-kbd={`${k.mod} J`}><KajuFace size={22} /><span>Ask Kaju</span></button> : null}
              {action ? <Link href={action.href} className="ws-action">{action.href.includes("report") ? <Radio size={14} aria-hidden /> : <Plus size={14} aria-hidden />}<span>{action.label}</span></Link> : null}
              {!user && ready ? <button type="button" className="ws-action is-quiet" onClick={() => openSignIn()}>Sign in</button> : null}
            </span>
          </header>

          <main id="sp-main" className="sp-main" tabIndex={-1} onClickCapture={onContentClick}>
            {sample ? <p className="cn-sample"><b>Sample programme</b> · illustrative records, not live programme data</p> : null}
            {!atHome || views ? (
              <div className="ws-pagebar">
                {crumb}
                <span className="ws-fill" />
                {user ? <>
                  <button type="button" className={`ws-ib${starred ? " is-starred" : ""}`} aria-pressed={starred} aria-label={starred ? "Remove from favourites" : "Add to favourites"} data-tip={starred ? "In your favourites" : "Add to favourites"} onClick={() => star({ href: rec ? path : here, title: pageTitle, icon: pageIcon, tone: pageTone })}><Star size={15} aria-hidden /></button>
                  <button type="button" className="ws-ib" aria-haspopup="menu" aria-label="More for this page" data-tip="Copy link, how records open" onClick={(e) => menuAt(e, pageMenu(), "This page", true)}><MoreHorizontal size={16} aria-hidden /></button>
                </> : null}
              </div>
            ) : null}
            {views ? <nav className="ws-views" aria-label={`Views of ${at!.node.label}`}>{views.map((v) => <Link key={v.href} href={v.href} aria-current={at!.view === v ? "page" : undefined} onMouseEnter={() => router.prefetch(v.href)}>{v.label}</Link>)}</nav> : null}
            <Fragment key={`${user?.id ?? "public"}:${mem.org?.id ?? "none"}:${mem.role ?? "none"}:${mem.reviewer}`}>
              {isFlush ? <div className="ws-flush">{children}</div> : <div className="os-page" key={path}>{children}</div>}
            </Fragment>
          </main>
        </div>

        {peekPath ? <div onClickCapture={(e) => { const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null; if (!a || e.metaKey || e.ctrlKey || e.button !== 0) return; const u = new URL(a.href, window.location.href); if (u.origin === window.location.origin && recordAt(u.pathname) && u.pathname !== peekPath) { e.preventDefault(); openPeek(u.pathname); } }}>
          <ToastHost><Peek path={peekPath} mode={prefs.peek === "center" ? "center" : "side"} onClose={closePeek} onMode={(m) => setPrefs({ peek: m })} onPage={peekAsPage} onGo={openPeek} /></ToastHost>
        </div> : null}

        {/* ── phone: the dock ───────────────────────────────────────── */}
        <nav className="ws-dock" aria-label="Main">
          <Link href={home} aria-current={atHome ? "page" : undefined}><Home size={21} strokeWidth={1.8} aria-hidden /><span>Home</span></Link>
          {work ? <Link href={work.href} aria-current={atWork ? "page" : undefined}>{(() => { const I = ICON[work.icon ?? ""] ?? FileText; return <I size={21} strokeWidth={1.8} aria-hidden />; })()}<span>{work.label}</span></Link>
            : <button type="button" onClick={() => setFind(true)}><Search size={21} strokeWidth={1.8} aria-hidden /><span>Search</span></button>}
          {action ? <Link href={action.href} className="ws-dock-act" aria-label={action.label}><b>{action.href.includes("report") ? <Radio size={21} aria-hidden /> : <Plus size={21} aria-hidden />}</b><span>{action.short}</span></Link> : null}
          {user ? <NotificationsButton variant="dock" /> : <button type="button" onClick={() => openSignIn()}><ArrowRight size={21} strokeWidth={1.8} aria-hidden /><span>Sign in</span></button>}
          <button type="button" onClick={() => ai.toggle()} aria-pressed={ai.open} className={ai.open ? "is-on" : undefined}><span className="ws-dock-kaju" aria-hidden><KajuFace size={24} /></span><span>Kaju</span></button>
        </nav>

        {guided && user ? <FirstDay userId={user.id} name={user.name ?? ""} place={title} home={home} path={path} actions={firstActions} quiet={/@straypaw\.invalid$/.test(user.email ?? "")} /> : null}
        <Notices />
        <Finder pages={findPages} actions={[...(action ? [{ href: action.href, label: action.label, note: "The everyday action here" }] : []), ...firstActions.filter((a) => a.href !== action?.href)].slice(0, 4)} menu={[{ href: home, label: "Home" }, ...tree.flatMap((s) => s.nodes.map((n) => ({ href: n.href, label: n.label })))]} open={find} onClose={closeFind} ws={view} role={mem.role} reviewer={mem.reviewer} member={mem.member} onAsk={(q) => { setFind(false); ai.ask(q); }} />
        {!onAssistant && <AiPanel />}
        {menu ? <Menu at={menu.at} items={menu.items} label={menu.label} onClose={closeMenu} /> : null}
        <Tips />
      </div>
    </Membership.Provider>
  );
}
