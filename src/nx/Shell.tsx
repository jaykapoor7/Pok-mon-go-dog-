"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarClock, ChevronsUpDown, ClipboardList, FileCheck2, FolderKanban, Hash, Home, Inbox, LayoutGrid, ListChecks, MessageSquare, Moon, MoreHorizontal, PawPrint, Plus, Route, Search, Settings, Sparkles, Sun } from "lucide-react";
import { CHANNELS, DMS, ME, ORG } from "./fixtures";
import "./nx.css";

/* The new frame: a slim rail for the things that follow you everywhere, one sidebar for the workspace,
   and a top bar that says where you are. On a phone the rail and sidebar give way to five tabs. */

const NGO = [
  { href: "/next/ngo/today", label: "Today", icon: Home },
  { href: "/next/ngo/inbox", label: "Inbox", icon: Inbox, n: 4 },
  { href: "/next/ngo/cases", label: "Cases", icon: ClipboardList },
  { href: "/next/ngo/animals", label: "Animals", icon: PawPrint },
  { href: "/next/ngo/operations", label: "Operations", icon: Route },
  { href: "/next/ngo/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/next/ngo/submissions", label: "Submissions & Reports", icon: FileCheck2 },
];
const BUILT = new Set(["/next/ngo/today", "/next/ngo/animals"]);

export function Shell({ crumb, children }: { crumb: [string, string?]; children: ReactNode }) {
  const path = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { try { const t = localStorage.getItem("nx.theme"); if (t === "dark" || t === "light") setTheme(t); else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark"); } catch {} }, []);
  const flip = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; try { localStorage.setItem("nx.theme", n); } catch {} return n; });
  const on = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="nx" data-theme={theme}>
      <nav className="nx-rail" aria-label="StrayPaw">
        <Link href="/next/ngo/today" className="nx-mark" aria-label="StrayPaw home">sp</Link>
        <Link href="/next/ngo/today" className="nx-rail-b is-on" aria-label="Workspace" title="Workspace"><LayoutGrid size={17} /></Link>
        <button type="button" className="nx-rail-b" aria-label="Channels" title="Channels" data-n="2"><MessageSquare size={17} /></button>
        <button type="button" className="nx-rail-b" aria-label="Kaju" title="Kaju"><Sparkles size={17} /></button>
        <button type="button" className="nx-rail-b" aria-label="Search" title="Search"><Search size={17} /></button>
        <span className="nx-rail-sp" />
        <button type="button" className="nx-rail-b" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} title="Theme" onClick={flip}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button type="button" className="nx-rail-b" aria-label="Settings" title="Settings"><Settings size={16} /></button>
        <span className="nx-face" aria-label={ME.name}>{ME.initials}</span>
      </nav>

      <aside className="nx-side" aria-label={`${ORG.name} navigation`}>
        <button type="button" className="nx-org"><span className="nx-org-l">{ORG.short}</span><span><b>{ORG.name}</b><small>{ORG.kind}</small></span><ChevronsUpDown size={14} /></button>
        <div className="nx-nav">
          {NGO.map((i) => (
            BUILT.has(i.href)
              ? <Link key={i.href} href={i.href} className={`nx-item ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined}><i.icon size={15} /><span>{i.label}</span>{i.n ? <i>{i.n}</i> : null}</Link>
              : <span key={i.href} className="nx-item is-soon" aria-disabled="true" title="Not built yet"><i.icon size={15} /><span>{i.label}</span><i>Soon</i></span>
          ))}
          <div className="nx-nav-h">Channels<button type="button" aria-label="New channel"><Plus size={13} /></button></div>
          {CHANNELS.map((c) => <button key={c.name} type="button" className={`nx-item ${c.unread ? "is-unread" : ""}`} style={{ width: "100%" }}><Hash size={14} /><span>{c.name}</span>{c.unread ? <i>{c.unread}</i> : null}</button>)}
          <div className="nx-nav-h">Direct messages<button type="button" aria-label="New message"><Plus size={13} /></button></div>
          {DMS.map((d) => <button key={d.name} type="button" className="nx-item" style={{ width: "100%" }}><span className={`nx-dot ${d.here ? "" : "is-away"}`} /><span>{d.name}</span></button>)}
        </div>
        <div className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> has 2 things for you to approve</span></div>
      </aside>

      <div className="nx-main">
        <header className="nx-top">
          <div className="nx-crumb">{crumb[1] ? <><Link href="/next/ngo/today" className="nx-hide-s">{crumb[0]}</Link><span className="nx-hide-s">/</span><b>{crumb[1]}</b></> : <b>{crumb[0]}</b>}</div>
          <div className="nx-top-r">
            <button type="button" className="nx-search"><Search size={14} /><span>Search anything</span><kbd>⌘K</kbd></button>
            <button type="button" className="nx-ib nx-only-s" aria-label="Search"><Search size={18} /></button>
            <button type="button" className="nx-ib nx-hide-s" aria-label="Schedule"><CalendarClock size={16} /></button>
            <button type="button" className="nx-ib" aria-label="Notifications"><Bell size={16} /></button>
            <button type="button" className="nx-ib nx-only-s" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={flip}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button type="button" className="nx-kaju nx-hide-s"><Sparkles size={14} /><span>Kaju</span></button>
          </div>
        </header>
        <main className="nx-body" id="nx-main">{children}</main>
      </div>

      <nav className="nx-dock" aria-label="Sections">
        <Link href="/next/ngo/today" className={on("/next/ngo/today") ? "is-on" : ""}><Home size={20} />Today</Link>
        <Link href="/next/ngo/animals" className={on("/next/ngo/animals") ? "is-on" : ""}><ListChecks size={20} />Work</Link>
        <Link href="/next/ngo/today" data-n="2"><MessageSquare size={20} />Messages</Link>
        <Link href="/next/ngo/today"><Sparkles size={20} />Kaju</Link>
        <Link href="/next/ngo/today"><MoreHorizontal size={20} />More</Link>
      </nav>
    </div>
  );
}
