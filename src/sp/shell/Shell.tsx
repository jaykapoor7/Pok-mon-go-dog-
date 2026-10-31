"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw 3.0 application shell.

   DESKTOP  A calm sidebar: the organisation / workspace switcher, Quick
            actions (⌘K) and Ask StrayPaw AI (⌘J), the workspace's own
            navigation, its other pages in collapsible groups, and the
            account at the foot. A thin top bar carries the breadcrumb,
            search, the AI toggle and the workspace's one primary action.
   PHONE    A compact top bar and the thumb bar (destinations, the action
            at the centre, More in a sheet), unchanged in behaviour.
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
import { getMyNgo, isNgoMember } from "@/lib/actions";
import { ORDER, WORKSPACES, currentDest, lastWorkspace, navOn, rememberWorkspace, workspaceFor, type WorkspaceId } from "./workspaces";
import { Finder } from "./Finder";
import { AiPanel, AiProvider, useAi } from "@/sp3/ai/AiPanel";
import { spFonts } from "../fonts";
import "../sp.css";
import "./shell.css";
import "../folk.css";
import "../mobile.css";
import "@/sp3/sp3.css";
import "./shell3.css";
import "./app3.css";
import "./app4.css";

type Org = { id: string; name: string } | null;
const Membership = createContext<{ member: boolean; ready: boolean; org: Org }>({ member: false, ready: false, org: null });
/** Whether the signed-in person belongs to an organisation (display only: the server decides access). */
export const useMembership = () => useContext(Membership);

const ICON: Record<string, typeof MapIcon> = {
  map: MapIcon, radio: Radio, activity: Activity, book: BookOpen, building: Building2, heart: HeartHandshake, sparkles: Sparkles,
  home: Home, inbox: Inbox, paw: PawPrint, layers: Layers, phone: Smartphone, shield: ShieldCheck, file: FileText, grad: GraduationCap,
  users: Users, compass: Compass, landmark: Landmark, list: ListChecks, check: ClipboardCheck,
};
const DEST_ICON: Record<string, typeof MapIcon> = {
  "/community": MapIcon, "/community/report": Radio, "/community/activity": Activity,
  "/ngo": Compass, "/ngo/animals": PawPrint, "/ngo/map": MapIcon,
  "/city": Landmark, "/city/programmes": Layers, "/city/review": ClipboardCheck, "/city/insights": FileText,
  "/learn": GraduationCap, "/learn/workshops": Users, "/learn/resources": BookOpen,
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
  const def = WORKSPACES[ws];
  const cur = currentDest(def, path);
  const ai = useAi();

  const { user, ready, signOut, openSignIn } = useAuth();
  const [mem, setMem] = useState<{ member: boolean; ready: boolean; org: Org }>({ member: false, ready: false, org: null });
  useEffect(() => {
    if (!ready) return;
    if (!user) { setMem({ member: false, ready: true, org: null }); return; }
    let live = true;
    Promise.all([isNgoMember().catch(() => false), getMyNgo().catch(() => null)]).then(([m, o]) => { if (live) setMem({ member: m, ready: true, org: o ? { id: o.id, name: o.name } : null }); });
    return () => { live = false; };
  }, [user, ready]);

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
  const here = def.nav.find((n) => navOn(n, path)) ?? def.index.flatMap((g) => g.links).find((l) => path === l.href || path.startsWith(l.href + "/"));
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
            {def.nav.map((n) => {
              const Icon = ICON[n.icon] ?? Home;
              const on = n.href === "/assistant" ? onAssistant : navOn(n, path);
              const link = <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} title={collapsed ? n.label : undefined}>{n.tone ? <span className={`sx4-sq t-${n.tone}`} aria-hidden><Icon size={11} strokeWidth={2.2} /></span> : <Icon size={16} aria-hidden />}<span>{n.label}</span></Link>;
              return n.section ? <Fragment key={n.href}><p className="sx4-sec">{n.section}</p>{link}</Fragment> : link;
            })}
          </nav>

          {(() => {
            /* The workspace's other pages, folded under "More" (open while one of them is the current page). */
            const groups = def.index.map((g) => ({ ...g, links: g.links.filter((l) => !def.nav.some((n) => n.href === l.href) && l.href !== def.settings) })).filter((g) => g.links.length);
            if (!groups.length) return null;
            const inside = groups.some((g) => g.links.some((l) => path === l.href || path.startsWith(l.href + "/")));
            return (
              <details key={`${ws}-more`} className="sx3-more" open={inside || undefined}>
                <summary><MoreHorizontal size={16} aria-hidden /><span>More</span><ChevronDown size={13} aria-hidden /></summary>
                <div>{groups.map((g) => (
                  <div key={g.label} className="sx3-group">
                    <p>{g.label}</p>
                    <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link></li>)}</ul>
                  </div>
                ))}</div>
              </details>
            );
          })()}

          <p className="sx4-hint">Press <kbd>/</kbd> for quick navigation</p>

          <div className="sx3-side-foot">
            {def.settings && <Link href={def.settings} className="sx3-foot-link" aria-current={path === def.settings ? "page" : undefined}><Settings size={15} aria-hidden /><span>Settings</span></Link>}
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
              {here && here.href !== def.home && <><span aria-hidden>/</span><span aria-current="page">{here.label}</span></>}
              {onAssistant && here?.href !== "/assistant" && <><span aria-hidden>/</span><span aria-current="page">StrayPaw AI</span></>}
            </nav>
            <button type="button" className="sp-find sx3-find" onClick={() => setFind(true)} aria-label="Search animals, places, cases and organisations" aria-keyshortcuts="Control+K Meta+K /">
              <Search size={15} aria-hidden /><span>Search records</span><kbd>⌘K</kbd>
            </button>
            <div className="sp-bar-end">
              {!onAssistant && <button type="button" className={`sx3-ai-btn${ai.open ? " is-on" : ""}`} onClick={() => ai.toggle()} aria-pressed={ai.open} aria-label="StrayPaw AI"><Sparkles size={16} aria-hidden /><span>Ask AI</span></button>}
              {def.action && !reporting && <Link href={def.action.href} className="sp-action sx3-action">{def.action.href.includes("report") ? <Radio size={15} aria-hidden /> : <Plus size={15} aria-hidden />}<span>{def.action.label}</span></Link>}
              <span className="sx3-acct-m"><Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} /></span>
            </div>
          </header>

          <main id="sp-main" className="sp-main" tabIndex={-1}>{children}</main>
        </div>

        {/* ── Phone thumb bar ─────────────────────────────────────── */}
        <nav className="sp-tabs" aria-label={`${def.label} navigation`}>
          {def.dests.filter((d) => d.href !== def.action?.href).map((d, i, arr) => {
            const Icon = DEST_ICON[d.href] ?? MapIcon;
            const node = <Link key={d.href} href={d.href} aria-current={cur === d.href ? "page" : undefined}><Icon size={21} strokeWidth={1.8} aria-hidden /><span>{d.short ?? d.label}</span></Link>;
            if (def.action && i === Math.ceil(arr.length / 2) - 1) return [node, reporting
              ? <Link key="act" href={def.action.href} aria-current="page"><Radio size={21} strokeWidth={1.8} aria-hidden /><span>{def.action.short}</span></Link>
              : <Link key="act" href={def.action.href} className="sp-tabs-act" aria-label={def.action.label}><b>{def.action.href.includes("report") ? <Radio size={21} aria-hidden /> : <Plus size={21} aria-hidden />}</b><span>{def.action.short}</span></Link>];
            return node;
          })}
          <button type="button" onClick={() => ai.toggle()} aria-pressed={ai.open} className={ai.open ? "is-on" : undefined}><Sparkles size={21} strokeWidth={1.8} aria-hidden /><span>AI</span></button>
          <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}><Menu size={21} strokeWidth={1.8} aria-hidden /><span>More</span></button>
        </nav>

        <IndexSheet open={sheet} onClose={() => setSheet(false)} ws={ws} path={path} />
        <Finder open={find} onClose={closeFind} ws={ws} member={mem.member} onAsk={(q) => { setFind(false); ai.ask(q); }} />
        {!onAssistant && <AiPanel />}
      </div>
    </Membership.Provider>
  );
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
          {org ? <Link href="/ngo/team" onClick={() => setOpen(false)}>Team &amp; access</Link> : <Link href="/join" onClick={() => setOpen(false)}>Join an organisation with a code</Link>}
          {org && <Link href="/ngo/settings" onClick={() => setOpen(false)}>Organisation settings</Link>}
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
  const def = WORKSPACES[ws];
  const here = def.index.findIndex((g) => g.links.some((l) => path === l.href));
  const primary = def.nav.filter((n) => !def.dests.some((d) => d.href === n.href));
  return (
    <dialog ref={ref} className="sp-index" aria-label={`More in ${def.label}`} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sp-more">
        <header className="sp-more-head"><span className="sp-grip" aria-hidden /><h2><i aria-hidden style={{ background: def.ink }} />More in {def.label}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        {primary.length > 0 && (
          <ul className="sx3-more-primary">{primary.map((n) => { const Icon = ICON[n.icon] ?? Home; return <li key={n.href}><Link href={n.href} onClick={onClose} aria-current={navOn(n, path) ? "page" : undefined}><Icon size={18} aria-hidden /><b>{n.label}</b></Link></li>; })}</ul>
        )}
        {def.index.map((g, i) => (
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
