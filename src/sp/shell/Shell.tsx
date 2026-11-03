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
import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity, BookOpen, Building2, ChevronDown, ChevronsUpDown, Compass, FileText, GraduationCap, HeartHandshake, Home, Inbox, Landmark, Layers,
  LifeBuoy, LogOut, Map as MapIcon, Menu, PanelLeftClose, PanelLeftOpen, PawPrint, Plus, Radio, Search, ShieldCheck, Smartphone, Sparkles, Users, X,
  ListChecks, MoreHorizontal, Settings, ClipboardCheck, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import { ORDER, PROFESSIONAL, WORKSPACES, workspaceView, type Destination, currentDestination, currentDest, lastWorkspace, navOn, rememberWorkspace, tabsFor, workspaceFor, type NavItem, type Role, type WorkspaceId } from "./workspaces";
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
};


const Nested = createContext(false);

export function Shell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  /* A page that mounts a shell inside a route Chrome already shelled renders once. */
  if (useContext(Nested)) return <>{children}</>;
  return <Nested.Provider value={true}><AiProvider><ShellInner flush={flush}>{children}</ShellInner></AiProvider></Nested.Provider>;
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
  const def = workspaceView(aiWorkspace, mem.role, mem.reviewer);
  const nav = visibleNav(def.nav, mem.role, mem.reviewer);

  const [find, setFind] = useState(false);
  const [sheet, setSheet] = useState(false);
  /* Server-verified memberships only: both an organisation and a reviewing office. */
  const dual = mem.ready && mem.member && mem.reviewer;
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
  const here = currentDestination(ws,path,mem.role,mem.reviewer);
  const section=def.index.find(g=>g.label===here?.group)?.links.find(l=>l.primary);
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
      <div className={`sp sp-app s3-root sx3 ${spFonts}${isFlush ? " is-flush" : ""}${isMap ? " is-map" : ""}${collapsed ? " is-collapsed" : ""}${ai.open && !onAssistant ? " has-ai" : ""}`} data-ws={ws} style={{ ["--ws" as string]: def.ink }}>
        <a href="#sp-main" className="sp-skip">Skip to content</a>

        {/* ── Desktop sidebar ─────────────────────────────────────── */}
        <aside className="sx3-side" aria-label="Workspace">
          <div className="sx3-side-top">
            {/* Only a verified dual-role member gets a chooser; everyone else sees their one workspace. */}
            {dual ? (
            <div className="sx3-ws">
              <button type="button" className="sx3-ws-btn" aria-expanded={switcher} aria-haspopup="menu" onClick={() => setSwitcher((v) => !v)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/straypaw-mark.png" alt="" width={26} height={26} />
                <span><b>{ws === "ngo" && mem.org ? mem.org.name : `StrayPaw ${def.label}`}</b></span>
                <ChevronsUpDown size={15} aria-hidden />
              </button>
              {switcher && (
                <Popover onClose={() => setSwitcher(false)} className="sp-ws-menu sx3-ws-menu" label="Your workspaces">
                  {PROFESSIONAL.map((id) => { const w = WORKSPACES[id]; return (
                    <Link key={id} href={w.home} role="menuitemradio" aria-checked={id === ws} onClick={() => setSwitcher(false)} className={id === ws ? "is-on" : undefined}>
                      <i aria-hidden style={{ background: w.ink }} /><span><b>{id === "ngo" && mem.org ? mem.org.name : w.label}</b><small>{w.purpose}</small></span>
                    </Link>); })}
                </Popover>
              )}
            </div>
            ) : (
            <Link href={def.home} className="sx3-ws sx3-ws-static">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/straypaw-mark.png" alt="" width={26} height={26} />
              <span><b>{ws === "ngo" && mem.org ? mem.org.name : `StrayPaw ${def.label}`}</b></span>
            </Link>
            )}
            <button type="button" className="sx3-icon" onClick={toggleSide} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
          </div>

          <Suspense fallback={<SideNav nav={nav} path={path} search="" collapsed={collapsed} onAssistant={onAssistant} label={def.label} />}>
            <SideNavLive nav={nav} path={path} collapsed={collapsed} onAssistant={onAssistant} label={def.label} />
          </Suspense>

          {(() => {
            /* Pages whose section has no place of its own in the sidebar (team, outreach…), folded once under "More". */
            const own = new Set(nav.map((n) => (n.item as Destination).group));
            const groups = def.index.filter((g) => !own.has(g.label)).map((g) => ({ ...g, links: g.links.filter((l) => l.href !== def.settings && l.href !== "/assistant") })).filter((g) => g.links.length);
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
            {dual ? (
            <div className="sp-ws sx3-ws-m">
              <button type="button" className="sp-ws-btn" aria-expanded={switcherM} aria-haspopup="menu" onClick={() => setSwitcherM((v) => !v)}>
                <i aria-hidden style={{ background: def.ink }} /><span>{def.label}</span><ChevronDown size={14} aria-hidden />
              </button>
              {switcherM && (
                <Popover onClose={() => setSwitcherM(false)} className="sp-ws-menu" label="Your workspaces">
                  {PROFESSIONAL.map((id) => { const w = WORKSPACES[id]; return (
                    <Link key={id} href={w.home} role="menuitemradio" aria-checked={id === ws} onClick={() => setSwitcherM(false)} className={id === ws ? "is-on" : undefined}><i aria-hidden style={{ background: w.ink }} /><span><b>{w.label}</b><small>{w.purpose}</small></span></Link>
                  ); })}
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
              <span className="sx3-acct-m"><Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} /></span>
            </div>
          </header>

          <AmbientLight />
          <main id="sp-main" className="sp-main" tabIndex={-1}><SectionTabs path={path} role={mem.role} reviewer={mem.reviewer} listed={sideHrefs} /><Fragment key={`${user?.id??"public"}:${mem.org?.id??"none"}:${mem.role??"none"}:${mem.reviewer}`}>{children}</Fragment></main>
        </div>

        {/* ── Phone thumb bar ─────────────────────────────────────── */}
        <nav className="sp-tabs" aria-label={`${def.label} navigation`}>
          {phoneTabs(ws, mem.role, def.dests).filter((d) => d.href !== def.action?.href).map((d, i, arr) => {
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
        <IndexSheet open={sheet} onClose={() => setSheet(false)} ws={ws} path={path} dual={!!dual} />
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

/** The sidebar: the workspace's places in order, the five steps numbered. Kaju has
    his own button and corner, so he is not repeated here. Views of one page
    (Treat and Release are two stages of verification) light up by their query. */
function SideNav({ nav, path, search, collapsed, onAssistant, label }: SideNavProps & { search: string }) {
  const rows = nav.filter(({ item }) => item.icon !== "kaju");
  const stage = new URLSearchParams(search).get("stage");
  const isOn = (n: NavItem) => {
    if (n.href === "/assistant") return onAssistant;
    if (!navOn(n, path)) return false;
    const twins = rows.filter((r) => r.item.href === n.href);
    if (twins.length < 2) return true;
    const exact = twins.find((r) => r.item.query && new URLSearchParams(r.item.query).get("stage") === stage);
    return (exact ?? twins[0]).item === n;
  };
  return (
    <nav className="sx3-nav" aria-label={`${label} navigation`}>
      {rows.map(({ item: n, label: sec }) => {
        const Icon = ICON[n.icon] ?? Home;
        const href = n.query ? `${n.href}?${n.query}` : n.href;
        const key = href;
        const lead = n.step ? <span className="sx5-step" aria-hidden>{n.step}</span> : n.tone ? <span className={`sx4-sq t-${n.tone}`} aria-hidden><Icon size={11} strokeWidth={2.2} /></span> : <Icon size={16} aria-hidden />;
        const link = <Link key={key} href={href} aria-current={isOn(n) ? "page" : undefined} title={collapsed ? n.label : (n as Destination).note}>{lead}<span>{n.label}</span></Link>;
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
    .filter(({ item }) => (!item.roles || !!role && item.roles.includes(role)) && (!item.reviewer || reviewer))
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
function IndexSheet({ open, onClose, ws, path, dual }: { open: boolean; onClose: () => void; ws: WorkspaceId; path: string; dual: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  const mem=useMembership();
  const def = workspaceView(ws,mem.role,mem.reviewer);
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
        <div className="sx3-more-ws">{/* Another professional workspace only for verified dual-role members; public products for everyone. */}{ORDER.filter((id) => id !== ws && (id === "community" || id === "learn" || dual)).map((id) => <Link key={id} href={WORKSPACES[id].home} onClick={onClose}><i aria-hidden style={{ background: WORKSPACES[id].ink }} />{WORKSPACES[id].label}</Link>)}</div>
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

