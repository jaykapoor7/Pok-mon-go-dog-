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
import { usePathname } from "next/navigation";
import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity, BookOpen, Building2, ChevronDown, ChevronsUpDown, Compass, FileText, GraduationCap, HeartHandshake, Home, Inbox, Landmark, Layers,
  LifeBuoy, LogOut, Map as MapIcon, Menu, PanelLeftClose, PanelLeftOpen, PawPrint, Plus, Radio, Search, ShieldCheck, Smartphone, Sparkles, Users, X,
  ListChecks, MoreHorizontal, Settings, ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import { ORDER, WORKSPACES, workspaceView, currentDestination, currentDest, lastWorkspace, navOn, rememberWorkspace, tabsFor, workspaceFor, type NavItem, type Role, type WorkspaceId } from "./workspaces";
import { Finder } from "./Finder";
import { AiPanel, AiProvider, KajuMark, useAi } from "@/sp3/ai/AiPanel";
import { KajuFace } from "@/kaju/Kaju";
import { KajuCorner } from "@/kaju/Presence";
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
  const [ws, setWs] = useState<WorkspaceId>(() => workspaceFor(path, null));
  useEffect(() => { const w = workspaceFor(path, lastWorkspace()); setWs(w); rememberWorkspace(w); }, [path]);
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
  const def = workspaceView(aiWorkspace, mem.role, mem.reviewer);
  const nav = visibleNav(def.nav, mem.role, mem.reviewer);

  const [find, setFind] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [switcherM, setSwitcherM] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
  const onAssistant = path === "/assistant";

  return (
    <Membership.Provider value={mem}>
      <div className={`sp sp-app s3-root sx3 ${spFonts}${isFlush ? " is-flush" : ""}${isMap ? " is-map" : ""}${collapsed ? " is-collapsed" : ""}${ai.open && !onAssistant ? " has-ai" : ""}`} data-ws={ws} style={{ ["--ws" as string]: def.ink }}>
        <a href="#sp-main" className="sp-skip">Skip to content</a>

        {/* ── Desktop sidebar ─────────────────────────────────────── */}
        <aside className="sx3-side" aria-label="Workspace">
          <div className="sx3-side-top">
            <div className="sx3-ws">
              <button type="button" className="sx3-ws-btn" aria-expanded={switcher} aria-haspopup="menu" onClick={() => setSwitcher((v) => !v)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/straypaw-mark.png" alt="" width={26} height={26} />
                <span><b>{mem.org && ws === "ngo" ? mem.org.name : `StrayPaw ${def.label}`}</b></span>
                <ChevronsUpDown size={15} aria-hidden />
              </button>
              {switcher && (
                <Popover onClose={() => setSwitcher(false)} className="sp-ws-menu sx3-ws-menu" label="Workspaces">
                  {ORDER.map((id) => {
                    const w = WORKSPACES[id];
                    return (
                      <Link key={id} href={w.home} role="menuitemradio" aria-checked={id === ws} onClick={() => setSwitcher(false)} className={id === ws ? "is-on" : undefined}>
                        <i aria-hidden style={{ background: w.ink }} />
                        <span><b>{w.label}</b><small>{w.purpose}</small></span>
                      </Link>
                    );
                  })}
                  <div className="sx3-ws-foot"><Link href="/app?choose=1" onClick={() => setSwitcher(false)}>All ways in</Link><Link href="/" onClick={() => setSwitcher(false)}>Main site</Link></div>
                </Popover>
              )}
            </div>
            <button type="button" className="sx3-icon" onClick={toggleSide} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
          </div>

          <button type="button" className="sx3-quick" onClick={() => setFind(true)} aria-keyshortcuts="Control+K Meta+K"><span>Quick actions</span><kbd>⌘K</kbd></button>

          <nav className="sx3-nav" aria-label={`${def.label} navigation`}>
            {nav.map(({ item: n, label }) => {
              const Icon = ICON[n.icon] ?? Home;
              const on = n.href === "/assistant" ? onAssistant : navOn(n, path);
              const link = <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} title={collapsed ? n.label : undefined}>{n.icon === "kaju" ? <span className="sx4-sq is-kaju" aria-hidden><KajuFace size={20} /></span> : n.tone ? <span className={`sx4-sq t-${n.tone}`} aria-hidden><Icon size={11} strokeWidth={2.2} /></span> : <Icon size={16} aria-hidden />}<span>{n.label}</span></Link>;
              return label ? <Fragment key={n.href}><p className="sx4-sec">{label}</p>{link}</Fragment> : link;
            })}
          </nav>

          {(() => {
            /* The workspace's other pages, folded under "More" (open while one of them is the current page). */
            const groups = def.index.map((g) => ({ ...g, links: g.links.filter((l) => !nav.some((n) => n.item.href === l.href) && l.href !== def.settings) })).filter((g) => g.links.length);
            if (!groups.length) return null;
            const inside = groups.some((g) => g.links.some((l) => path === l.href || path.startsWith(l.href + "/")));
            return <div>{groups.map(g=><details key={g.label} className="sx3-more" open={g.links.some(l=>path===l.href)||undefined}>
              <summary><span>{g.label}</span><ChevronDown size={13} aria-hidden /></summary>
              <ul>{g.links.map(l=><li key={l.href}><Link href={l.href} aria-current={path===l.href?'page':undefined}>{l.label}</Link></li>)}</ul>
            </details>)}</div>;
          })()}

          <p className="sx4-hint">Press <kbd>/</kbd> for quick navigation</p>

          {/* Kaju rests here while the agent is closed; he moves into the panel when it opens. */}
          <div className="sx3-kaju-nook">
            {!ai.open && !onAssistant && <button type="button" onClick={() => ai.setOpen(true)} aria-label="Open Kaju" title="Ask Kaju"><KajuCorner sequence="chill" size={78} /></button>}
          </div>

          <div className="sx3-side-foot">
            {def.settings && mem.role === "admin" && <Link href={def.settings} className="sx3-foot-link" aria-current={path === def.settings ? "page" : undefined}><Settings size={15} aria-hidden /><span>Settings</span></Link>}
            <Link href="/docs" className="sx3-foot-link"><LifeBuoy size={15} aria-hidden /><span>Help &amp; docs</span></Link>
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
            <div className="sp-ws sx3-ws-m">
              <button type="button" className="sp-ws-btn" aria-expanded={switcherM} aria-haspopup="menu" onClick={() => setSwitcherM((v) => !v)}>
                <i aria-hidden style={{ background: def.ink }} /><span>{def.label}</span><ChevronDown size={14} aria-hidden />
              </button>
              {switcherM && (
                <Popover onClose={() => setSwitcherM(false)} className="sp-ws-menu" label="Workspaces">
                  {ORDER.map((id) => { const w = WORKSPACES[id]; return (
                    <Link key={id} href={w.home} role="menuitemradio" aria-checked={id === ws} onClick={() => setSwitcherM(false)} className={id === ws ? "is-on" : undefined}><i aria-hidden style={{ background: w.ink }} /><span><b>{w.label}</b><small>{w.purpose}</small></span></Link>
                  ); })}
                  <div className="sx3-ws-foot"><Link href="/app?choose=1" onClick={() => setSwitcherM(false)}>All ways in</Link><Link href="/" onClick={() => setSwitcherM(false)}>Main site</Link></div>
                </Popover>
              )}
            </div>
            <nav className="sx3-crumb" aria-label="Breadcrumb">
              <Link href={def.home}>{def.label}</Link>
              {section&&section.href!==here?.href&&section.href!==def.home&&<><span aria-hidden>/</span><Link href={section.href}>{section.label}</Link></>}
              {here && here.href !== def.home && <><span aria-hidden>/</span>{here.href===path?<span aria-current="page">{here.label}</span>:<><Link href={here.href}>{here.label}</Link><span aria-hidden>/</span><span aria-current="page">Record</span></>}</>}
              {onAssistant && here?.href !== "/assistant" && <><span aria-hidden>/</span><span aria-current="page">Kaju</span></>}
            </nav>
            <button type="button" className="sp-find sx3-find" onClick={() => setFind(true)} aria-label="Search animals, places, cases and organisations" aria-keyshortcuts="Control+K Meta+K /">
              <Search size={15} aria-hidden /><span>Search records</span><kbd>⌘K</kbd>
            </button>
            <div className="sp-bar-end">
              <button type="button" className="icon-btn" aria-label="Workspace sections" onClick={()=>setSheet(true)}><Menu size={18} aria-hidden /></button>
              {!onAssistant && <button type="button" className={`sx3-ai-btn${ai.open ? " is-on" : ""}`} onClick={() => ai.toggle()} aria-pressed={ai.open} aria-label="Kaju"><span className="sx3-ai-kaju" aria-hidden><KajuMark size={34} /></span><span>Ask Kaju</span></button>}
              {def.action && !reporting && <Link href={def.action.href} className="sp-action sx3-action">{def.action.href.includes("report") ? <Radio size={15} aria-hidden /> : <Plus size={15} aria-hidden />}<span>{def.action.label}</span></Link>}
              <span className="sx3-acct-m"><Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} /></span>
            </div>
          </header>

          <main id="sp-main" className="sp-main" tabIndex={-1}><SectionTabs path={path} role={mem.role} reviewer={mem.reviewer} /><Fragment key={`${user?.id??"public"}:${mem.org?.id??"none"}:${mem.role??"none"}:${mem.reviewer}`}>{children}</Fragment></main>
        </div>

        {/* ── Phone thumb bar ─────────────────────────────────────── */}
        <nav className="sp-tabs" aria-label={`${def.label} navigation`}>
          {def.dests.filter((d) => d.href !== def.action?.href).map((d, i, arr) => {
            const Icon = ICON[d.icon] ?? MapIcon;
            const node = <Link key={d.href} href={d.href} aria-current={navOn(d,path) ? "page" : undefined}><Icon size={21} strokeWidth={1.8} aria-hidden /><span>{d.short ?? d.label}</span></Link>;
            if (ws !== "ngo" && def.action && i === Math.ceil(arr.length / 2) - 1) return [node, reporting
              ? <Link key="act" href={def.action.href} aria-current="page"><Radio size={21} strokeWidth={1.8} aria-hidden /><span>{def.action.short}</span></Link>
              : <Link key="act" href={def.action.href} className="sp-tabs-act" aria-label={def.action.label}><b>{def.action.href.includes("report") ? <Radio size={21} aria-hidden /> : <Plus size={21} aria-hidden />}</b><span>{def.action.short}</span></Link>];
            return node;
          })}
          <button type="button" onClick={() => ai.toggle()} aria-pressed={ai.open} className={ai.open ? "is-on" : undefined}><span className="sx3-tab-kaju" aria-hidden><KajuFace size={24} /></span><span>Kaju</span></button>

        </nav>

        <IndexSheet open={sheet} onClose={() => setSheet(false)} ws={ws} path={path} />
        <Finder open={find} onClose={closeFind} ws={ws} role={mem.role} reviewer={mem.reviewer} member={mem.member} onAsk={(q) => { setFind(false); ai.ask(q); }} />
        {!onAssistant && <AiPanel />}
      </div>
    </Membership.Provider>
  );
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
function IndexSheet({ open, onClose, ws, path }: { open: boolean; onClose: () => void; ws: WorkspaceId; path: string }) {
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
          <ul className="sx3-more-primary">{primary.map((n) => { const Icon = ICON[n.icon] ?? Home; return <li key={n.href}><Link href={n.href} onClick={onClose} aria-current={navOn(n, path) ? "page" : undefined}>{n.icon === "kaju" ? <KajuFace size={20} /> : <Icon size={18} aria-hidden />}<b>{n.label}</b></Link></li>; })}</ul>
        )}
        {utilityGroups.map((g, i) => (
          <details key={`${ws}-${g.label}`} className="sp-more-group" open={i === (here >= 0 ? here : 0)}>
            <summary><span><b>{g.label}</b><small>{g.links.map((l) => l.label).join(" · ")}</small></span><ChevronDown size={18} aria-hidden /></summary>
            <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} onClick={onClose} aria-current={path === l.href ? "page" : undefined}><b>{l.label}</b>{l.note && <small>{l.note}</small>}</Link></li>)}</ul>
          </details>
        ))}
        <div className="sx3-more-ws">{ORDER.filter((id) => id !== ws).map((id) => <Link key={id} href={WORKSPACES[id].home} onClick={onClose}><i aria-hidden style={{ background: WORKSPACES[id].ink }} />{WORKSPACES[id].label}</Link>)}</div>
        <footer className="sp-more-foot"><Link href="/" onClick={onClose}>Main site</Link><Link href="/docs" onClick={onClose}>Help</Link><Link href="/contact" onClick={onClose}>Contact</Link><Link href="/privacy" onClick={onClose}>Privacy</Link></footer>
      </div>
    </dialog>
  );
}

/** The screens inside the current sidebar place, as tabs above the page. */
function SectionTabs({ path, role, reviewer }: { path: string; role: Role | null; reviewer:boolean }) {
  const t = tabsFor(path, role, reviewer);
  if (!t) return null;
  return (
    <nav className="sx3-tabs" aria-label="In this section">
      {t.tabs.map((x) => <Link key={x.href} href={x.href} aria-current={x.href === t.on ? "page" : undefined}>{x.label}</Link>)}
    </nav>
  );
}
