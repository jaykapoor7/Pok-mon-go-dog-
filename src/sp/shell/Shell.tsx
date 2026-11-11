"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw 3.0 application shell.

   DESKTOP  A calm sidebar: the organisation / workspace switcher, Quick
            actions (⌘K) and Ask Kaju (⌘J), the workspace's own
            navigation, its other pages in collapsible groups, and the
            account at the foot. A thin top bar carries the breadcrumb,
            search, the AI toggle and the workspace's one primary action.
   PHONE    A compact top bar and the thumb bar (destinations, the action
            and grouped workspace utilities).
   AI       The assistant docks on the right on any page and shares one
            conversation with the full-screen /assistant.

   The switcher lists workspaces as places to go, never grants: what a
   person may read or change is decided on the server for every record.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity, BookOpen, Building2, ChevronDown, ChevronsUpDown, Compass, FileText, GraduationCap, HeartHandshake, Home, Inbox, Landmark, Layers,
  LifeBuoy, LogOut, Map as MapIcon, Menu, PanelLeftClose, PanelLeftOpen, PawPrint, Plus, Radio, Search, ShieldCheck, Smartphone, Sparkles, Users, X,
  ListChecks, MoreHorizontal, Settings, ClipboardCheck, ArrowLeft, Stethoscope, FlaskConical, Gauge, ArrowRightLeft, Syringe, PlusCircle,
} from "lucide-react";
import { PlacesProvider, usePlaces, placeFor, placeNav, placeAction, placeHome, lastPlace, rememberPlace, type PlaceLink } from "@/oh/places";
import { KIND_LABEL, ROLE_LABEL } from "@/oh/data";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import { designedNav, ORDER, PROFESSIONAL, WORKSPACES, canDiscover, workspaceView, type Destination, currentDestination, currentDest, lastWorkspace, navOn, rememberWorkspace, tabsFor, workspaceFor, type NavItem, type Role, type WorkspaceId } from "./workspaces";
import { Finder } from "./Finder";
import { Notices } from "../ui/Notice";
import { AiPanel, AiProvider, useAi } from "@/sp3/ai/AiPanel";
import { KajuFace } from "@/kaju/Kaju";
import { KajuPresence } from "@/kaju/Presence";
import { AmbientLight, KAJU_VERIFIED } from "./Ambient";
import { spFonts } from "../fonts";
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

import {fieldCache} from "@/lib/field/outbox";

type Org = { id: string; name: string } | null;
type Mem = { member: boolean; ready: boolean; org: Org; role: Role | null; reviewer: boolean; owner?:string };
const Membership = createContext<Mem>({ member: false, ready: false, org: null, role: null, reviewer: false });

/** Whether the signed-in person belongs to an organisation (display only: the server decides access). */

export const useMembership = () => useContext(Membership);

const ICON: Record<string, typeof MapIcon> = {
  map: MapIcon, radio: Radio, activity: Activity, book: BookOpen, building: Building2, heart: HeartHandshake, sparkles: Sparkles,
  home: Home, inbox: Inbox, paw: PawPrint, layers: Layers, phone: Smartphone, shield: ShieldCheck, file: FileText, grad: GraduationCap,
  users: Users, compass: Compass, landmark: Landmark, list: ListChecks, check: ClipboardCheck,
  stethoscope: Stethoscope, flask: FlaskConical, gauge: Gauge, arrows: ArrowRightLeft, syringe: Syringe, plus: PlusCircle, settings: Settings,
};

type SwitchEntry = { key: string; href: string; title: string; sub: string; on: boolean };

/** Links from a place, as sidebar rows; a section label is shown where a section starts. */
function placeRows(links: PlaceLink[], fallbackSection?: string): NavRow[] {
  let last: string | undefined;
  return links.map((l) => {
    const sec = l.section ?? fallbackSection;
    const row: NavRow = { item: { href: l.href, label: l.label, icon: l.icon, exact: l.exact, count: l.count, countTone: l.tone, short: l.short }, label: sec && sec !== last ? sec : undefined };
    last = sec;
    return row;
  });
}


const Nested = createContext(false);

export function Shell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  /* A page that mounts a shell inside a route Chrome already shelled renders once. */
  if (useContext(Nested)) return <>{children}</>;
  return <Nested.Provider value={true}><AiProvider><PlacesProvider><ShellInner flush={flush}>{children}</ShellInner></PlacesProvider></AiProvider></Nested.Provider>;
}

function ShellInner({ children, flush }: { children: ReactNode; flush: boolean }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  // Pages visited inside the app this session, so Back can return to the
  // previous screen instead of leaving StrayPaw.
  const visits = useRef(0);
  useEffect(() => { visits.current += 1; }, [path]);
  const [ws, setWs] = useState<WorkspaceId>(() => workspaceFor(path, null));
  useEffect(() => { const w = workspaceFor(path, lastWorkspace()); setWs(w); if (ORDER.some((x) => path === `/${x}` || path.startsWith(`/${x}/`))) rememberWorkspace(w); }, [path]);
  const aiWorkspace = ws;
  const ai = useAi();

  const { user, ready, signOut, openSignIn } = useAuth();
  const [memState, setMem] = useState<Mem>({ member: false, ready: false, org: null, role: null, reviewer: false });
  const mem:Mem=!user?{member:false,ready,org:null,role:null,reviewer:false}:memState.owner===user.id?memState:{member:false,ready:false,org:null,role:null,reviewer:false};
  const [connectionEpoch,setConnectionEpoch]=useState(0);
  useEffect(()=>{const online=()=>setConnectionEpoch(n=>n+1);window.addEventListener('online',online);return()=>window.removeEventListener('online',online)},[]);
  useEffect(() => {
    if (!ready) return;
    if (!user) { setMem({ member: false, ready: true, org: null, role: null, reviewer: false }); return; }
    let live = true;
    setMem({owner:user.id,member:false,ready:false,org:null,role:null,reviewer:false});
    if(!navigator.onLine){void fieldCache<Mem>(`membership:${user.id}`).then(c=>{if(live)setMem(c?.value.owner===user.id?c.value:{owner:user.id,member:false,ready:true,org:null,role:null,reviewer:false})}).catch(()=>{if(live)setMem({owner:user.id,member:false,ready:true,org:null,role:null,reviewer:false})});return()=>{live=false}}
    Promise.all([isNgoMember().catch(() => false), getMyNgo().catch(() => null), getMyRole().catch(() => ({ role: null, reviewer: false }))]).then(([m, o, r]) => {
      const role = (["admin", "coordinator", "veterinarian", "member"] as const).find((x) => x === r.role) ?? null;
      if (live) {const checked={ owner:user.id,member: m, ready: true, org: o ? { id: o.id, name: o.name } : null, role, reviewer: r.reviewer };setMem(checked);if(m&&o)void fieldCache(`membership:${user.id}`,checked).catch(()=>{})}
    });
    return () => { live = false; };
  }, [user, ready, connectionEpoch]);
  /* The sidebar for this person: their role's tools only, each group
     labelled once. Restricted links fail closed while the role loads. */
  /* A shared page such as /assistant opened directly (a bookmark, a new
     tab) belongs to the person's professional workspace, not Community. */
  useEffect(() => {
    if (!mem.ready || lastWorkspace() || ORDER.some((w) => path === `/${w}` || path.startsWith(`/${w}/`))) return;
    const home: WorkspaceId | null = mem.member ? "ngo" : mem.reviewer ? "city" : null;
    if (home) { setWs(home); rememberWorkspace(home); }
  }, [mem.ready, mem.member, mem.reviewer, path]);
  /* Places: every organisation this person works in (One Health programmes,
     hospitals, laboratories, offices). An NGO or municipal workspace gains its
     programme pages; /today, /workspace and /programme pages take their
     navigation from the place they belong to. */
  const pl = usePlaces();
  const place = ws === "health" ? placeFor(path, pl.places, lastPlace()) : null;
  const placeId = place?.organisation_id;
  useEffect(() => { if (placeId) rememberPlace(placeId); }, [placeId]);
  const progSlug = path.match(/^\/programme\/([a-z0-9-]+)/)?.[1];
  const base = workspaceView(aiWorkspace, mem.role, mem.reviewer);
  const ngoPlace = mem.org ? pl.places.find((p) => p.kind === "ngo" && p.ngo_id === mem.org!.id) : undefined;
  const cityPlace = mem.reviewer ? pl.places.find((p) => p.kind === "municipal") : undefined;
  let def = base;
  const designed = designedNav(ws, mem.role, mem.reviewer);
  let nav: NavRow[] = visibleNav(designed ?? base.nav, mem.role, mem.reviewer);
  if (ws === "health") {
    const links: PlaceLink[] = place ? placeNav(place, progSlug) : [{ href: "/today", label: "Today", short: "Today", icon: "home", exact: true, mobile: true }];
    const items = placeRows(links).map((r) => r.item);
    def = { ...base, label: place ? (place.short_name ?? place.name) : "Today", home: place ? placeHome(place) : "/today", action: place ? placeAction(place) : null,
      nav: items, dests: links.filter((l) => l.mobile).slice(0, 4).map((l) => ({ href: l.href, label: l.label, short: l.short, icon: l.icon, exact: l.exact })) };
    nav = placeRows(links);
  } else if (ws === "ngo" && ngoPlace) {
    nav = [...nav, ...placeRows(placeNav(ngoPlace), "Programme")];
  } else if (ws === "city" && cityPlace) {
    nav = [...nav, ...placeRows(placeNav(cityPlace).filter((l) => l.href.startsWith("/programme/")), "Programme")];
  }
  /* The switcher lists places, not products: Today across all of them, the NGO
     workspace, the municipal review office and each One Health organisation. */
  const entries: SwitchEntry[] = [];
  if (pl.places.length) entries.push({ key: "today", href: "/today", title: "Today", sub: "Everything waiting for you, in every place", on: path === "/today" });
  if (mem.member && mem.org) entries.push({ key: "ngo", href: "/ngo", title: mem.org.name, sub: "NGO workspace", on: ws === "ngo" });
  if (mem.reviewer) entries.push({ key: "city", href: "/city/insights", title: "Municipal review", sub: "Submissions, contracts and wards", on: ws === "city" });
  for (const p of pl.places) {
    if (p.kind === "ngo" && mem.org && p.ngo_id === mem.org.id) continue;
    entries.push({ key: p.organisation_id, href: placeHome(p), title: p.name, sub: `${ROLE_LABEL[p.role]} · ${KIND_LABEL[p.kind]}`, on: placeId === p.organisation_id });
  }
  const switchable = entries.length > 1;
  const wsTitle = ws === "ngo" && mem.org ? mem.org.name : ws === "health" ? (place?.name ?? "Today") : ws === "city" ? "Municipal review" : `StrayPaw ${def.label}`;
  const NGO_ROLE: Record<string, string> = { admin: "Lead", coordinator: "Coordinator", veterinarian: "Veterinarian", member: "Field team" };
  const wsSub = ws === "ngo" ? `${mem.role ? NGO_ROLE[mem.role] : "Member"} · NGO` : ws === "health" ? (place ? `${ROLE_LABEL[place.role]} · ${KIND_LABEL[place.kind]}` : `${pl.places.length} place${pl.places.length === 1 ? "" : "s"}`) : ws === "city" ? "Reviewer · Municipal" : def.purpose.split(":")[0];
  const wsKind = ws === "ngo" ? "ngo" : ws === "city" ? "municipal" : ws === "health" ? (place?.kind ?? "today") : "today";
  const initials = wsTitle.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(of|the|and|for|sample|demo)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "SP";

  const [find, setFind] = useState(false);
  const [sheet, setSheet] = useState(false);
  /* Server-verified memberships only: both an organisation and a reviewing office. */
  const [switcher, setSwitcher] = useState(false);
  const [switcherM, setSwitcherM] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  /* Kaju looks pleased for a moment when prepared work is saved and verified. */
  const [cheer, setCheer] = useState(false);
  useEffect(() => { let t = 0; const on = () => { setCheer(true); window.clearTimeout(t); t = window.setTimeout(() => setCheer(false), 2600); }; window.addEventListener(KAJU_VERIFIED, on); return () => { window.removeEventListener(KAJU_VERIFIED, on); window.clearTimeout(t); }; }, []);
  useEffect(() => { try { setCollapsed(localStorage.getItem("sp3.side") === "0"); } catch { /* storage blocked */ } }, []);
  const toggleSide = () => setCollapsed((v) => { try { localStorage.setItem("sp3.side", v ? "1" : "0"); } catch { /* fine */ } return !v; });
  useEffect(() => { setSheet(false); setSwitcher(false); setSwitcherM(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setFind(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); ai.toggle(); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setFind(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ai]);
  const closeFind = useCallback(() => setFind(false), []);

  const reporting = path.startsWith("/community/report");
  const isMap = path === "/community" || path === "/community/report" || path === "/ngo/map" || path === "/city";
  const isFlush = flush || isMap || path === "/ngo/work" || path === "/assistant";
  const here = ws === "health"
    ? (nav.map((r) => r.item).filter((n) => navOn(n, path)).sort((a, b) => b.href.length - a.href.length)[0] as Destination | undefined) ?? null
    : currentDestination(ws,path,mem.role,mem.reviewer);
  const section=def.index.find(g=>g.label===here?.group)?.links.filter(l=>l.primary).sort((a,b)=>(a.order??50)-(b.order??50))[0];
  const atHome = path === def.home;
  // Every link the sidebar shows (its places, and the short "Also" list), so page tabs never repeat them.
  const sideHrefs = (() => {
    const own = new Set(nav.map((n) => (n.item as Destination).group));
    const extra = def.index.filter((g) => !own.has(g.label)).flatMap((g) => g.links).filter((l) => l.href !== def.settings && l.href !== "/assistant");
    return new Set([...nav.map((r) => r.item.href), ...(extra.length <= 4 ? extra.map((l) => l.href) : [])]);
  })();
  const goBack = () => { if (visits.current > 1) router.back(); else router.push(here && here.href !== path ? here.href : section && section.href !== path ? section.href : def.home); };
  const onAssistant = path === "/assistant";

  return (
    <Membership.Provider value={mem}>
      <div className={`sp sp-app s3-root sx3 os ${spFonts}${isFlush ? " is-flush" : ""}${isMap ? " is-map" : ""}${collapsed ? " is-collapsed" : ""}${ai.open && !onAssistant ? " has-ai" : ""}`} data-ws={ws} style={{ ["--ws" as string]: def.ink }}>
        <a href="#sp-main" className="sp-skip">Skip to content</a>

        {/* ── Desktop sidebar ─────────────────────────────────────── */}
        <aside className="sx3-side" aria-label="Workspace">
          <div className="sx3-side-top">
            {/* A person with more than one place gets a chooser; everyone else sees their one place. */}
            {switchable ? (
            <div className="sx3-ws">
              <button type="button" className="sx3-ws-btn" aria-expanded={switcher} aria-haspopup="menu" onClick={() => setSwitcher((v) => !v)}>
                <span className="os-avatar" data-kind={wsKind} aria-hidden>{initials}</span>
                <span><b>{wsTitle}</b><small>{wsSub}</small></span>
                <ChevronsUpDown size={15} aria-hidden />
              </button>
              {switcher && (
                <Popover onClose={() => setSwitcher(false)} className="sp-ws-menu sx3-ws-menu" label="Your places">
                  {entries.map((e) => (
                    <Link key={e.key} href={e.href} role="menuitemradio" aria-checked={e.on} onClick={() => setSwitcher(false)} className={e.on ? "is-on" : undefined}>
                      <i aria-hidden style={{ background: e.on ? "var(--s3-blue, #2457ce)" : "#c7cfdc" }} /><span><b>{e.title}</b><small>{e.sub}</small></span>
                    </Link>))}
                </Popover>
              )}
            </div>
            ) : (
            <Link href={def.home} className="sx3-ws sx3-ws-static">
              <span className="os-avatar" data-kind={wsKind} aria-hidden>{initials}</span>
              <span><b>{wsTitle}</b><small>{wsSub}</small></span>
            </Link>
            )}
            <button type="button" className="sx3-icon" onClick={toggleSide} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
          </div>

          <Suspense fallback={<SideNav nav={nav} path={path} search="" collapsed={collapsed} onAssistant={onAssistant} label={def.label} />}>
            <SideNavLive nav={nav} path={path} collapsed={collapsed} onAssistant={onAssistant} label={def.label} />
          </Suspense>

          {(() => {
            /* Pages whose section has no place of its own in the sidebar (team, outreach…), folded once under "More". */
            const own = new Set(nav.map((n) => (n.item as Destination).group).filter(Boolean));
            const inNav = (h: string) => nav.some((n) => n.item.href === h || (n.item.href !== "/ngo" && n.item.href !== "/city" && h.startsWith(n.item.href + "/")) || (n.item.match ?? []).some((m) => h === m || h.startsWith(m + "/")));
            const groups = ws === "health" ? [] : def.index.filter((g) => !own.has(g.label)).map((g) => ({ ...g, links: g.links.filter((l) => l.href !== def.settings && l.href !== "/assistant" && !inNav(l.href)) })).filter((g) => g.links.length);
            if (!groups.length) return null;
            const inside = groups.some((g) => g.links.some((l) => path === l.href || path.startsWith(l.href + "/")));
            /* A short list is shown as is; only a long one folds under "More". */
            const all = groups.flatMap((g) => g.links);
            if (all.length <= 4) return <nav className="sx3-nav sx5-flat" aria-label="Other pages"><p className="sx4-sec">Also</p>{all.map((l) => <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}><FileText size={16} aria-hidden /><span>{l.label}</span></Link>)}</nav>;
            return <details className="sx3-more sx5-more" open={inside || undefined}>
              <summary><span>More</span><ChevronDown size={13} aria-hidden /></summary>
              {groups.map((g) => <div key={g.label}><p className="sx5-more-h">{g.label}</p><ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link></li>)}</ul></div>)}
            </details>;
          })()}

          {/* Kaju rests here while the agent is closed; he moves into the panel when it opens. */}
          <div className={`sx3-kaju-nook${cheer ? " is-cheer" : ""}`}>
            {!ai.open && !onAssistant && <button type="button" onClick={() => ai.setOpen(true)} aria-label="Open Kaju" title="Ask Kaju">{cheer ? <KajuPresence state="success" size={92} /> : <KajuPresence sequence="arrive" enter size={92} className="sx5-kaju-walk" />}</button>}
          </div>

          <div className="sx3-side-foot">
            {def.settings && mem.role === "admin" && <Link href={def.settings} className="sx3-foot-link" aria-current={path === def.settings ? "page" : undefined}><Settings size={15} aria-hidden /><span>Settings</span></Link>}
            <Link href="/docs" className="sx3-foot-link"><LifeBuoy size={15} aria-hidden /><span>Help</span></Link>
            <Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} side />
          </div>
        </aside>

        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="sx3-col">
          <header className="sp-bar sx3-top">
            <Link href={def.home} className="sp-mark sx3-mark-m" aria-label={`StrayPaw, ${def.label} home`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/straypaw-mark.png" alt="" width={28} height={28} />
            </Link>
            {switchable ? (
            <div className="sp-ws sx3-ws-m">
              <button type="button" className="sp-ws-btn" aria-expanded={switcherM} aria-haspopup="menu" onClick={() => setSwitcherM((v) => !v)}>
                <i aria-hidden style={{ background: def.ink }} /><span>{def.label}</span><ChevronDown size={14} aria-hidden />
              </button>
              {switcherM && (
                <Popover onClose={() => setSwitcherM(false)} className="sp-ws-menu" label="Your places">
                  {entries.map((e) => <Link key={e.key} href={e.href} role="menuitemradio" aria-checked={e.on} onClick={() => setSwitcherM(false)} className={e.on ? "is-on" : undefined}><i aria-hidden style={{ background: e.on ? "#2457ce" : "#c7cfdc" }} /><span><b>{e.title}</b><small>{e.sub}</small></span></Link>)}
                </Popover>
              )}
            </div>
            ) : <span className="sp-ws sx3-ws-m sx3-ws-static"><i aria-hidden style={{ background: def.ink }} /><span>{def.label}</span></span>}
            {!atHome && <button type="button" className="sx5-back" onClick={goBack} aria-label="Back to the previous page"><ArrowLeft size={16} aria-hidden /><span>Back</span></button>}
            <nav className="sx3-crumb" aria-label="Breadcrumb">
              <Link href={def.home}>{def.label}</Link>
              {section&&section.href!==here?.href&&section.href!==def.home&&<><span aria-hidden>/</span><Link href={section.href}>{section.label}</Link></>}
              {here && here.href !== def.home && <><span aria-hidden>/</span>{here.href===path?<span aria-current="page">{here.query ? (here as Destination).group : here.label}</span>:<><Link href={here.href}>{here.label}</Link><span aria-hidden>/</span><span aria-current="page">Record</span></>}</>}
              {onAssistant && here?.href !== "/assistant" && <><span aria-hidden>/</span><span aria-current="page">Kaju</span></>}
            </nav>
            <button type="button" className="sp-find sx3-find" onClick={() => setFind(true)} aria-label="Search animals, places, cases and organisations" aria-keyshortcuts="Control+K Meta+K /">
              <Search size={15} aria-hidden /><span>Search records</span><kbd>⌘K</kbd>
            </button>
            <div className="sp-bar-end">
              <button type="button" className="icon-btn sx5-menu-m" aria-label="Workspace sections" onClick={()=>setSheet(true)}><Menu size={18} aria-hidden /></button>
              {!onAssistant && <button type="button" className={`sx3-ai-btn${ai.open ? " is-on" : ""}`} onClick={() => ai.toggle()} aria-pressed={ai.open} aria-label="Kaju"><span className="sx3-ai-kaju" aria-hidden><KajuFace size={24} /></span><span>Ask Kaju</span></button>}
              {def.action && !reporting && (ws !== "ngo" || mem.member) && <Link href={def.action.href} className="sp-action sx3-action">{def.action.href.includes("report") ? <Radio size={15} aria-hidden /> : <Plus size={15} aria-hidden />}<span>{def.action.label}</span></Link>}
              <span className={`sx3-acct-m${user ? "" : " is-out"}`}><Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} /></span>
            </div>
          </header>

          <AmbientLight />
          <main id="sp-main" className="sp-main" tabIndex={-1}><SectionTabs path={path} role={mem.role} reviewer={mem.reviewer} listed={sideHrefs} /><Fragment key={`${user?.id??"public"}:${mem.org?.id??"none"}:${mem.role??"none"}:${mem.reviewer}`}>{isFlush ? children : <div className="os-page" key={path}>{children}</div>}</Fragment></main>
        </div>

        {/* ── Phone thumb bar ─────────────────────────────────────── */}
        <nav className="sp-tabs" aria-label={`${def.label} navigation`}>
          {phoneTabs(ws, mem.role, def.dests as NavItem[]).filter((d) => d.href !== def.action?.href).map((d, i, arr) => {
            const Icon = ICON[d.icon] ?? MapIcon;
            const node = <Link key={d.href + (d.query ?? "")} href={d.query ? `${d.href}?${d.query}` : d.href} aria-current={navOn(d,path) ? "page" : undefined}><Icon size={21} strokeWidth={1.8} aria-hidden /><span>{d.short ?? d.label}</span></Link>;
            if (ws !== "ngo" && def.action && i === Math.ceil(arr.length / 2) - 1) return [node, reporting
              ? <Link key="act" href={def.action.href} aria-current="page"><Radio size={21} strokeWidth={1.8} aria-hidden /><span>{def.action.short}</span></Link>
              : <Link key="act" href={def.action.href} className="sp-tabs-act" aria-label={def.action.label}><b>{def.action.href.includes("report") ? <Radio size={21} aria-hidden /> : <Plus size={21} aria-hidden />}</b><span>{def.action.short}</span></Link>];
            return node;
          })}
          <button type="button" onClick={() => ai.toggle()} aria-pressed={ai.open} className={ai.open ? "is-on" : undefined}><span className="sx3-tab-kaju" aria-hidden><KajuFace size={24} /></span><span>Kaju</span></button>

        </nav>

        <Notices />
        <IndexSheet open={sheet} onClose={() => setSheet(false)} ws={ws} path={path} entries={entries} nav={ws === "health" ? def.nav : undefined} label={def.label} />
        <Finder open={find} onClose={closeFind} ws={ws} role={mem.role} reviewer={mem.reviewer} member={mem.member} onAsk={(q) => { setFind(false); ai.ask(q); }} />
        {!onAssistant && <AiPanel />}
      </div>
    </Membership.Provider>
  );
}

type NavRow = { item: NavItem; label?: string };
type SideNavProps = { nav: NavRow[]; path: string; collapsed: boolean; onAssistant: boolean; label: string };

function SideNavLive(p: SideNavProps) {
  const sp = useSearchParams();
  return <SideNav {...p} search={sp?.toString() ?? ""} />;
}

/** The sidebar: the workspace's places in order, grouped into hubs
    (Overview, Operations, Intelligence, Kaju, Training, Reports). Views of one page
    (Treat and Release are two stages of verification) light up by their query. */
function SideNav({ nav, path, search, collapsed, onAssistant, label }: SideNavProps & { search: string }) {
  const rows = nav;
  const stage = new URLSearchParams(search).get("stage");
  const isOn = (n: NavItem) => {
    if (n.href === "/assistant") return onAssistant;
    if (!navOn(n, path)) return false;
    const twins = rows.filter((r) => r.item.href === n.href);
    if (twins.length < 2) return true;
    const exact = twins.find((r) => r.item.query && new URLSearchParams(r.item.query).get("stage") === stage);
    return (exact ?? twins[0]).item === n;
  };
  /* The selection glides between pages: one highlight, measured to the current link. */
  const ref = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    setInd(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [path, search, rows.length, collapsed]);
  return (
    <nav ref={ref} className={`sx3-nav${ind ? " has-ind" : ""}`} aria-label={`${label} navigation`}>
      {ind ? <span className="os-ind" aria-hidden style={{ transform: `translateY(${ind.y}px)`, height: ind.h }} /> : null}
      {rows.map(({ item: n, label: sec }) => {
        const Icon = ICON[n.icon] ?? Home;
        const href = n.query ? `${n.href}?${n.query}` : n.href;
        const key = href;
        const lead = n.icon === "kaju" ? <span className="sx-kaju-ic" aria-hidden><KajuFace size={16} /></span> : n.step ? <span className="sx5-step" aria-hidden>{n.step}</span> : n.tone ? <span className={`sx4-sq t-${n.tone}`} aria-hidden><Icon size={11} strokeWidth={2.2} /></span> : <Icon size={16} aria-hidden />;
        const link = <Link key={key} href={href} aria-current={isOn(n) ? "page" : undefined} title={collapsed ? n.label : (n as Destination).note}>{lead}<span>{n.label}</span>{n.count ? <b className="sx-count" data-tone={n.countTone} aria-label={`${n.count} waiting`}>{n.count > 99 ? "99+" : n.count}</b> : null}</Link>;
        return sec ? <Fragment key={key}><p className="sx4-sec">{sec}</p>{link}</Fragment> : link;
      })}
    </nav>
  );
}

/** The phone's thumb bar, by role: each person gets only the four places they use on the move. */
function phoneTabs(ws: WorkspaceId, role: Role | null, dests: NavItem[]): NavItem[] {
  if (ws !== "ngo" || !role) return dests;
  if (role === "veterinarian") return [
    { href: "/ngo", label: "Today", short: "Today", icon: "home", exact: true },
    { href: "/ngo/verification", query: "stage=vet", label: "Sign off", short: "Sign off", icon: "shield" },
    { href: "/ngo/animals", label: "Animals", short: "Animals", icon: "paw" },
    { href: "/ngo/care", label: "Care records", short: "Care", icon: "file" },
  ];
  if (role === "member") return [
    { href: "/ngo", label: "Today", short: "Today", icon: "home", exact: true },
    { href: "/ngo/field", label: "Field mode", short: "Field", icon: "phone" },
    { href: "/ngo/cases/new", label: "New case", short: "New case", icon: "radio" },
    { href: "/ngo/inbox", label: "Receive reports", short: "Receive", icon: "inbox" },
  ];
  return dests;
}

/** Items this person sees, in order, with a group label where a group starts. */
function visibleNav(items: NavItem[], role: Role | null, reviewer: boolean) {
  let group: string | undefined;
  const tagged = items.map((n) => { if (n.section) group = n.section; return { item: n, group }; })
    .filter(({ item }) => canDiscover(item, role, reviewer))
    .map(({ item, group: g }) => ({ item: role && item.hrefFor?.[role] ? { ...item, href: item.hrefFor[role]! } : item, group: g }));
  let last: string | undefined;
  return tagged.map(({ item, group: g }) => { const label = g && g !== last ? g : undefined; last = g; return { item, label }; });
}

function Popover({ children, onClose, className, label }: { children: ReactNode; onClose: () => void; className: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!ref.current?.parentElement?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    ref.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [onClose]);
  return <div ref={ref} className={`sp-pop ${className}`} role="menu" aria-label={label}>{children}</div>;
}

function Account({ user, org, onSignIn, onSignOut, side = false }: { user: { name: string; email: string | null } | null; org: Org; onSignIn: () => void; onSignOut: () => void; side?: boolean }) {
  const [open, setOpen] = useState(false);
  const here = usePathname() ?? "/app";
  const mem=useMembership();
  if (!user) return side
    ? <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="sx3-signin">Sign in</Link>
    : <button type="button" className="sp-acct is-out" onClick={onSignIn}>Sign in</button>;
  return (
    <div className={`sp-acct-wrap${side ? " sx3-acct" : ""}`}>
      <button type="button" className={side ? "sx3-acct-btn" : "sp-acct"} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} aria-label={`Account: ${user.name}`}>
        <span className="sx3-avatar" aria-hidden>{user.name.slice(0, 1).toUpperCase()}</span>
        {side && <span className="sx3-acct-txt"><b>{user.name}</b><small>{org ? org.name : user.email ?? "Not in an organisation"}</small></span>}
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)} className={`sp-acct-menu${side ? " sx3-acct-menu" : ""}`} label="Account">
          <div className="sp-acct-who"><b>{user.name}</b><small>{org ? org.name : user.email ?? "Not in an organisation"}</small></div>
          {org && mem.role === "admin" ? <Link href="/ngo/team" onClick={() => setOpen(false)}>Team &amp; access</Link> : <Link href="/join" onClick={() => setOpen(false)}>Join an organisation with a code</Link>}
          {org && mem.role === "admin" && <Link href="/ngo/settings" onClick={() => setOpen(false)}>Organisation settings</Link>}
          <Link href="/community/activity" onClick={() => setOpen(false)}>My activity</Link>
          <Link href="/docs" onClick={() => setOpen(false)}>Help</Link>
          <button type="button" onClick={() => { setOpen(false); onSignOut(); }}><LogOut size={14} aria-hidden style={{ marginRight: 8 }} />Sign out</button>
        </Popover>
      )}
    </div>
  );
}

/** "More" on a phone: every page of the workspace, in named groups. */
function IndexSheet({ open, onClose, ws, path, entries, nav, label }: { open: boolean; onClose: () => void; ws: WorkspaceId; path: string; entries: SwitchEntry[]; nav?: NavItem[]; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  const mem=useMembership();
  const { user, openSignIn } = useAuth();
  const base = workspaceView(ws,mem.role,mem.reviewer);
  const def = nav ? { ...base, label, nav, dests: [] as NavItem[] } : { ...base, label: ws === "ngo" || ws === "city" ? base.label : label };
  const utilityGroups=def.index.filter(g=>!def.nav.some(n=>g.links.some(l=>l.href===n.href)));
  const here = utilityGroups.findIndex((g) => g.links.some((l) => path === l.href));
  const primary = def.nav.filter((n) => !def.dests.some((d) => d.href === n.href));
  return (
    <dialog ref={ref} className="sp-index" aria-label={`Sections in ${def.label}`} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sp-more">
        <header className="sp-more-head"><span className="sp-grip" aria-hidden /><h2><i aria-hidden style={{ background: def.ink }} />Sections in {def.label}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {primary.length > 0 && (
          <ul className="sx3-more-primary">{primary.map((n) => { const Icon = ICON[n.icon] ?? Home; return <li key={n.href + (n.query ?? "")}><Link href={n.query ? `${n.href}?${n.query}` : n.href} onClick={onClose} aria-current={navOn(n, path) ? "page" : undefined}>{n.step ? <span className="sx5-step" aria-hidden>{n.step}</span> : n.icon === "kaju" ? <KajuFace size={20} /> : <Icon size={18} aria-hidden />}<b>{n.label}</b></Link></li>; })}</ul>
        )}
        {utilityGroups.map((g, i) => (
          <details key={`${ws}-${g.label}`} className="sp-more-group" open={i === (here >= 0 ? here : 0)}>
            <summary><span><b>{g.label}</b><small>{g.links.map((l) => l.label).join(" · ")}</small></span><ChevronDown size={18} aria-hidden /></summary>
            <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} onClick={onClose} aria-current={path === l.href ? "page" : undefined}><b>{l.label}</b>{l.note && <small>{l.note}</small>}</Link></li>)}</ul>
          </details>
        ))}
        <div className="sx3-more-ws">{/* The person's other places, then the public products for everyone. */}{entries.filter((e) => !e.on).map((e) => <Link key={e.key} href={e.href} onClick={onClose}><i aria-hidden style={{ background: "#2457ce" }} />{e.title}</Link>)}{(["community", "learn"] as WorkspaceId[]).filter((id) => id !== ws).map((id) => <Link key={id} href={WORKSPACES[id].home} onClick={onClose}><i aria-hidden style={{ background: WORKSPACES[id].ink }} />{WORKSPACES[id].label}</Link>)}</div>
        {!user && <button type="button" className="sp-action sx5-sheet-signin" onClick={() => { onClose(); openSignIn(); }}>Sign in</button>}
        <footer className="sp-more-foot"><Link href="/" onClick={onClose}>Main site</Link><Link href="/docs" onClick={onClose}>Help</Link><Link href="/contact" onClick={onClose}>Contact</Link><Link href="/privacy" onClick={onClose}>Privacy</Link></footer>
      </div>
    </dialog>
  );
}

/** The screens inside the current sidebar place, as tabs above the page. */
function SectionTabs({ path, role, reviewer, listed }: { path: string; role: Role | null; reviewer:boolean; listed: Set<string> }) {
  const t = tabsFor(path, role, reviewer);
  // Tabs only for screens the sidebar does not already list; never the same links twice.
  if (!t || t.tabs.filter((x) => listed.has(x.href)).length > 1) return null;
  return (
    <nav className="sx3-tabs" aria-label="In this section">
      {t.tabs.map((x) => <Link key={x.href} href={x.href} aria-current={x.href === t.on ? "page" : undefined}>{x.label}</Link>)}
    </nav>
  );
}

