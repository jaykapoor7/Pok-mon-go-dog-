"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw 2.0 shell — an adaptive hybrid (decision 014).

   DESKTOP  One ink bar continuous with the landing navigation: the mark,
            the workspace you are in (switch without losing place or
            record), its three destinations, one search field over
            animals, places, cases and organisations, the workspace's
            single primary action, its index of contextual tools, and you.
            No sidebar: the map, the queue or the record owns the screen.
   PHONE    A compact bar (mark, workspace, search, you) and a thumb bar
            with the three destinations, the action at the centre, and the
            index in a sheet.

   The switcher lists only workspaces a person can use. NGO appears for
   members; everyone else sees a way in, never someone else's records.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, BookOpen, Building2, ChevronDown, Compass, FileText, GraduationCap, Landmark, Layers, Map as MapIcon, Menu, PawPrint, Plus, Radio, Search, Users, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyNgo, isNgoMember } from "@/lib/actions";
import { ORDER, WORKSPACES, currentDest, lastWorkspace, rememberWorkspace, workspaceFor, type WorkspaceId } from "./workspaces";
import { Finder } from "./Finder";
import { spFonts } from "../fonts";
import "../sp.css";
import "./shell.css";

type Org = { id: string; name: string } | null;
const Membership = createContext<{ member: boolean; ready: boolean; org: Org }>({ member: false, ready: false, org: null });
/** Whether the signed-in person belongs to an organisation (display only: the server decides access). */
export const useMembership = () => useContext(Membership);

const DEST_ICON: Record<string, typeof MapIcon> = {
  "/community": MapIcon, "/community/report": Radio, "/community/activity": Activity,
  "/ngo": Compass, "/ngo/animals": PawPrint, "/ngo/map": MapIcon,
  "/city": Landmark, "/city/programmes": Layers, "/city/insights": FileText,
  "/learn": GraduationCap, "/learn/workshops": Users, "/learn/resources": BookOpen,
};

export function Shell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const path = usePathname();
  const [ws, setWs] = useState<WorkspaceId>(() => workspaceFor(path, null));
  useEffect(() => { const w = workspaceFor(path, lastWorkspace()); setWs(w); rememberWorkspace(w); }, [path]);
  const def = WORKSPACES[ws];
  const cur = currentDest(def, path);

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
  useEffect(() => { setSheet(false); setSwitcher(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setFind(true); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setFind(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const closeFind = useCallback(() => setFind(false), []);

  const visible = ORDER.filter((id) => !WORKSPACES[id].members || mem.member || ws === id);
  const reporting = path.startsWith("/community/report");
  /* Map destinations own the whole screen beneath the bar. */
  const isFlush = flush || path === "/community" || path === "/ngo/map" || path === "/city";

  return (
    <Membership.Provider value={mem}>
      <div className={`sp ${spFonts}${isFlush ? " is-flush" : ""}`} data-ws={ws} style={{ ["--ws" as string]: def.ink }}>
        <a href="#sp-main" className="sp-skip">Skip to content</a>
        <header className="sp-bar">
          <Link href={def.home} className="sp-mark" aria-label={`StrayPaw, ${def.label} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/straypaw-mark.png" alt="" width={30} height={30} />
            <span>StrayPaw</span>
          </Link>

          <div className="sp-ws">
            <button type="button" className="sp-ws-btn" aria-expanded={switcher} aria-haspopup="menu" onClick={() => setSwitcher((v) => !v)}>
              <i aria-hidden style={{ background: def.ink }} /><span>{def.label}</span><ChevronDown size={14} aria-hidden />
            </button>
            {switcher && (
              <Popover onClose={() => setSwitcher(false)} className="sp-ws-menu" label="Workspaces">
                {visible.map((id) => {
                  const w = WORKSPACES[id];
                  return (
                    <Link key={id} href={w.home} role="menuitemradio" aria-checked={id === ws} onClick={() => setSwitcher(false)} className={id === ws ? "is-on" : undefined}>
                      <i aria-hidden style={{ background: w.ink }} />
                      <span><b>{w.label}</b><small>{w.purpose}</small></span>
                    </Link>
                  );
                })}
                {!mem.member && (
                  <div className="sp-ws-foot">
                    <Building2 size={16} aria-hidden />
                    <span>Work at an organisation? <Link href="/ngo" onClick={() => setSwitcher(false)}>Open the NGO workspace</Link> and sign in with your organisation.</span>
                  </div>
                )}
              </Popover>
            )}
          </div>

          <nav className="sp-dests" aria-label={`${def.label} destinations`}>
            {def.dests.map((d) => (
              <Link key={d.href} href={d.href} aria-current={cur === d.href ? "page" : undefined}>{d.label}</Link>
            ))}
          </nav>

          <button type="button" className="sp-find" onClick={() => setFind(true)} aria-label="Search animals, places, cases and organisations" aria-keyshortcuts="Control+K Meta+K /">
            <Search size={16} aria-hidden /><span>Search animals, places, cases</span><kbd>⌘K</kbd>
          </button>

          <div className="sp-bar-end">
            {def.index.length > 0 && <button type="button" className="sp-index-btn" aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}><Menu size={16} aria-hidden /><span>Index</span></button>}
            {def.action && !reporting && <Link href={def.action.href} className="sp-action">{def.action.href.includes("report") ? <Radio size={16} aria-hidden /> : <Plus size={16} aria-hidden />}<span>{def.action.label}</span></Link>}
            <Account user={user} org={mem.org} onSignIn={openSignIn} onSignOut={signOut} />
          </div>
        </header>

        <main id="sp-main" className="sp-main" tabIndex={-1}>{children}</main>

        <nav className="sp-tabs" aria-label={`${def.label} navigation`}>
          {def.dests.filter((d) => d.href !== def.action?.href).map((d, i, arr) => {
            const Icon = DEST_ICON[d.href] ?? MapIcon;
            const node = <Link key={d.href} href={d.href} aria-current={cur === d.href ? "page" : undefined}><Icon size={21} strokeWidth={1.8} aria-hidden /><span>{d.short ?? d.label}</span></Link>;
            if (def.action && i === Math.ceil(arr.length / 2) - 1) return [node, reporting
              ? <span key="gap" className="sp-tabs-gap" aria-hidden />
              : <Link key="act" href={def.action.href} className="sp-tabs-act" aria-label={def.action.label}><b>{def.action.href.includes("report") ? <Radio size={21} aria-hidden /> : <Plus size={21} aria-hidden />}</b><span>{def.action.short}</span></Link>];
            return node;
          })}
          <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}><Menu size={21} strokeWidth={1.8} aria-hidden /><span>More</span></button>
        </nav>

        <IndexSheet open={sheet} onClose={() => setSheet(false)} ws={ws} visible={visible} path={path} />
        <Finder open={find} onClose={closeFind} ws={ws} member={mem.member} />
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

function Account({ user, org, onSignIn, onSignOut }: { user: { name: string; email: string | null } | null; org: Org; onSignIn: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  if (!user) return <button type="button" className="sp-acct is-out" onClick={onSignIn}>Sign in</button>;
  return (
    <div className="sp-acct-wrap">
      <button type="button" className="sp-acct" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} aria-label={`Account: ${user.name}`}>
        <span aria-hidden>{user.name.slice(0, 1).toUpperCase()}</span>
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)} className="sp-acct-menu" label="Account">
          <div className="sp-acct-who"><b>{user.name}</b><small>{org ? org.name : user.email ?? "Not in an organisation"}</small></div>
          {org ? <Link href="/ngo/team" onClick={() => setOpen(false)}>Team &amp; access</Link> : <Link href="/join" onClick={() => setOpen(false)}>Join an organisation with a code</Link>}
          <Link href="/community/activity" onClick={() => setOpen(false)}>My Activity</Link>
          <Link href="/faq" onClick={() => setOpen(false)}>Help</Link>
          <button type="button" onClick={() => { setOpen(false); onSignOut(); }}>Sign out</button>
        </Popover>
      )}
    </div>
  );
}

function IndexSheet({ open, onClose, ws, visible, path }: { open: boolean; onClose: () => void; ws: WorkspaceId; visible: WorkspaceId[]; path: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  const def = WORKSPACES[ws];
  return (
    <dialog ref={ref} className="sp-index" aria-label={`${def.label} index`} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sp-index-in">
        <header><span className="sp-grip" aria-hidden /><p className="k">{def.label} · index</p><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <nav className="sp-index-dests" aria-label="Destinations">
          {def.dests.map((d, i) => <Link key={d.href} href={d.href} onClick={onClose} aria-current={currentDest(def, path) === d.href ? "page" : undefined}><span className="mono">0{i + 1}</span><b className="serif">{d.label}</b></Link>)}
        </nav>
        {def.index.map((g) => (
          <section key={g.label}>
            <h2 className="k">{g.label}</h2>
            <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} onClick={onClose} aria-current={path === l.href ? "page" : undefined}><b>{l.label}</b>{l.note && <small>{l.note}</small>}</Link></li>)}</ul>
          </section>
        ))}
        <section>
          <h2 className="k">Workspaces</h2>
          <ul className="sp-index-ws">{visible.map((id) => <li key={id}><Link href={WORKSPACES[id].home} onClick={onClose} aria-current={id === ws ? "true" : undefined}><i style={{ background: WORKSPACES[id].ink }} aria-hidden /><b>{WORKSPACES[id].label}</b></Link></li>)}</ul>
        </section>
        <footer className="sp-index-foot"><Link href="/" onClick={onClose}>StrayPaw.org</Link><Link href="/art-credits" onClick={onClose}>Art &amp; credits</Link><Link href="/privacy" onClick={onClose}>Privacy</Link></footer>
      </div>
    </dialog>
  );
}
