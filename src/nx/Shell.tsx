"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, Building2, FlaskConical, Microscope, Syringe, BarChart3, Bell, CalendarClock, Handshake, History, Radar, ShieldCheck, Zap, ChevronsUpDown, ClipboardList, FileCheck2, FolderKanban, Hash, Home, Inbox, LayoutGrid, ListChecks, MessageSquare, Moon, MoreHorizontal, PawPrint, Plus, Route, Search, Settings, Sparkles, Sun } from "lucide-react";
import { CHANNELS, CLINIC, DMS, GOV_ORG, ME, ORG } from "./fixtures";
import { createChannel, useChannels, useLive } from "./live";
import "./nx.css";

/* The new frame: a slim rail for the things that follow you everywhere, one sidebar for the workspace,
   and a top bar that says where you are. On a phone the rail and sidebar give way to five tabs. */

type NavItem = { href: string; label: string; icon: typeof Home; n?: number; office?: boolean };
const NGO: NavItem[] = [
  { href: "/next/ngo/today", label: "Today", icon: Home },
  { href: "/next/ngo/inbox", label: "Inbox", icon: Inbox, n: 4 },
  { href: "/next/ngo/cases", label: "Cases", icon: ClipboardList },
  { href: "/next/ngo/animals", label: "Animals", icon: PawPrint },
  { href: "/next/ngo/operations", label: "Operations", icon: Route },
  { href: "/next/ngo/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/next/ngo/submissions", label: "Submissions & Reports", icon: FileCheck2 },
];
const GOV: NavItem[] = [
  { href: "/next/gov/overview", label: "Overview", icon: BarChart3 },
  { href: "/next/gov/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/next/gov/partners", label: "Partners", icon: Handshake },
  { href: "/next/gov/verification", label: "Verification", icon: ShieldCheck, n: 22, office: true },
  { href: "/next/gov/surveillance", label: "Surveillance", icon: Radar },
  { href: "/next/gov/reports", label: "Reports", icon: FileCheck2 },
];
const HEALTH: NavItem[] = [
  { href: "/next/health/today", label: "Today", icon: Home },
  { href: "/next/health/bites", label: "Bite cases", icon: ClipboardList },
  { href: "/next/health/pep", label: "PEP", icon: Syringe },
  { href: "/next/health/referrals", label: "Referrals", icon: Route },
  { href: "/next/health/facilities", label: "Facilities", icon: Building2 },
  { href: "/next/health/surveillance", label: "Surveillance", icon: Activity },
];
const LAB: NavItem[] = [
  { href: "/next/health/today", label: "Work queue", icon: Home },
  { href: "/next/health/samples", label: "Samples", icon: FlaskConical },
  { href: "/next/health/testing", label: "Testing", icon: Microscope },
  { href: "/next/health/results", label: "Results", icon: FileCheck2 },
  { href: "/next/health/quality", label: "Quality", icon: ShieldCheck },
];
const KAJU: NavItem[] = [
  { href: "/next/kaju", label: "Ask Kaju", icon: Sparkles },
  { href: "/next/kaju/missions", label: "Missions", icon: ListChecks, n: 2 },
  { href: "/next/kaju/automations", label: "Automations", icon: Zap },
  { href: "/next/kaju/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/next/kaju/insights", label: "Insights", icon: BarChart3 },
  { href: "/next/kaju/history", label: "History", icon: History },
];
const BUILT = new Set(["/next/ngo/today", "/next/ngo/inbox", "/next/ngo/submissions", "/next/ngo/cases", "/next/ngo/animals", "/next/gov/overview", "/next/gov/verification", "/next/health/today", "/next/health/bites", "/next/health/pep", "/next/health/samples", "/next/kaju"]);
/** Where an organisation's workspace opens. Healthcare and research open in the current app until they are rebuilt. */
const homeOf = (w: string, id: string) => (w === "ngo" ? "/next/ngo/today" : w === "government" ? "/next/gov/overview" : w === "healthcare" ? "/next/health/today" : `/workspace/${id}`);
const WS_LABEL: Record<string, string> = { ngo: "NGO workspace", government: "Government & Programmes", healthcare: "Healthcare", research: "Research" };
export type Ws = "ngo" | "gov" | "health" | "kaju";

export function Shell({ crumb, children, ws = "ngo", flush }: { crumb: [string, string?]; children: ReactNode; ws?: Ws; flush?: boolean }) {
  const path = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { try { const t = localStorage.getItem("nx.theme"); if (t === "dark" || t === "light") setTheme(t); else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark"); } catch {} }, []);
  const flip = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; try { localStorage.setItem("nx.theme", n); } catch {} return n; });
  const on = (href: string) => path === href || (href !== "/next/kaju" && path.startsWith(href + "/"));
  const live = useLive();
  const router = useRouter();
  const inChannel = path.startsWith("/next/channels"), inKaju = path.startsWith("/next/kaju");
  /* A workspace's pages act for one of the person's organisations of that kind; the picked one follows the workspace they are in. */
  const want = ws === "gov" ? live.orgFor("government") : ws === "health" ? live.orgFor("healthcare") : ws === "ngo" && !inChannel ? live.orgFor("ngo") : null;
  const { pick } = live;
  useEffect(() => { if (want && want.org_id !== live.org?.org_id) pick(want.org_id); }, [want, live.org, pick]);
  const chans = useChannels(live.org?.org_id ?? null);
  const [adding, setAdding] = useState(false);
  const office = live.org?.source === "review_office";
  /* Verification is a reviewing office's work. A programme coordinator in the same workspace does not see it; the database refuses it either way. */
  const lab = live.org ? live.org.kind === "laboratory" : path.startsWith("/next/health/samples");
  const nav = (ws === "gov" ? GOV : ws === "health" ? (lab ? LAB : HEALTH) : ws === "kaju" ? KAJU : NGO).filter((i) => !i.office || !live.org || office);
  const switchOrg = () => { if (live.orgs.length < 2 || !live.org) return; const next = live.orgs[(live.orgs.findIndex((o) => o.org_id === live.org!.org_id) + 1) % live.orgs.length]; pick(next.org_id); router.push(homeOf(next.workspace, next.org_id)); };
  const sampleOrg = ws === "gov" ? GOV_ORG : ws === "health" ? (lab ? { name: "Reference Rabies Diagnostic Laboratory", short: "RL", kind: "Healthcare · Laboratory" } : CLINIC) : ORG;
  const org = live.org ? { name: live.org.name, short: (live.org.short_name ?? live.org.name).split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase(), kind: WS_LABEL[live.org.workspace] ?? live.org.kind } : sampleOrg;
  const me = live.org && live.userName ? live.userName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : ME.initials;
  const CHANNEL = live.org ? `/next/channels/${chans.rows?.[0]?.name ?? "general"}` : "/next/channels/abc-ward-12";
  const unread = live.org ? undefined : "2";
  const addChannel = async (raw: string) => { const name = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); setAdding(false); if (!live.org || name.length < 2) return; const r = await createChannel(live.org.org_id, name, ""); if (!r.error) { chans.reload(); window.location.assign(`/next/channels/${name}`); } };
  const home = live.org ? homeOf(live.org.workspace, live.org.org_id) : ws === "gov" ? "/next/gov/overview" : ws === "health" ? "/next/health/today" : "/next/ngo/today";

  return (
    <div className="nx" data-theme={theme}>
      <nav className="nx-rail" aria-label="StrayPaw">
        <Link href="/next/ngo/today" className="nx-mark" aria-label="StrayPaw home">sp</Link>
        <Link href={home} className={`nx-rail-b ${!inChannel && !inKaju ? "is-on" : ""}`} aria-label="Workspace" title="Workspace"><LayoutGrid size={17} /></Link>
        <Link href={CHANNEL} className={`nx-rail-b ${inChannel ? "is-on" : ""}`} aria-label="Channels" title="Channels" data-n={unread}><MessageSquare size={17} /></Link>
        <Link href="/next/kaju" className={`nx-rail-b ${inKaju ? "is-on" : ""}`} aria-label="Kaju" title="Kaju"><Sparkles size={17} /></Link>
        <button type="button" className="nx-rail-b" aria-label="Search" title="Search"><Search size={17} /></button>
        <span className="nx-rail-sp" />
        <button type="button" className="nx-rail-b" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} title="Theme" onClick={flip}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button type="button" className="nx-rail-b" aria-label="Settings" title="Settings"><Settings size={16} /></button>
        <span className="nx-face" aria-label={live.userName ?? ME.name}>{me}</span>
      </nav>

      <aside className="nx-side" aria-label={`${org.name} navigation`}>
        {live.org
          ? <button type="button" className="nx-org" title={live.orgs.length > 1 ? "Switch organisation" : undefined} onClick={switchOrg}><span className="nx-org-l">{org.short}</span><span><b>{org.name}</b><small>{ws === "kaju" ? "Kaju" : org.kind}</small></span>{live.orgs.length > 1 ? <ChevronsUpDown size={14} /> : null}</button>
          : <Link href={ws === "gov" ? "/next/ngo/today" : "/next/gov/overview"} className="nx-org" title="Switch workspace"><span className="nx-org-l">{org.short}</span><span><b>{org.name}</b><small>{ws === "kaju" ? "Kaju" : org.kind}</small></span><ChevronsUpDown size={14} /></Link>}
        <div className="nx-nav">
          {nav.map((i) => (
            BUILT.has(i.href)
              ? <Link key={i.href} href={i.href} className={`nx-item ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined}><i.icon size={15} /><span>{i.label}</span>{i.n && !live.org ? <i>{i.n}</i> : null}</Link>
              : <span key={i.href} className="nx-item is-soon" aria-disabled="true" title="Not built yet"><i.icon size={15} /><span>{i.label}</span><i>Soon</i></span>
          ))}
          <div className="nx-nav-h">Channels<button type="button" aria-label="New channel" onClick={() => live.org && setAdding(true)}><Plus size={13} /></button></div>
          {live.org ? <>
            {(chans.rows ?? []).map((c) => { const href = `/next/channels/${c.name}`; return <Link key={c.id} href={href} className={`nx-item ${path === href ? "is-on" : ""}`} aria-current={path === href ? "page" : undefined}><Hash size={14} /><span>{c.name}</span></Link>; })}
            {chans.rows && !chans.rows.length && !adding ? <Link href="/next/channels/general" className="nx-item"><Plus size={14} /><span>Create #general</span></Link> : null}
            {adding ? <form className="nx-item" onSubmit={(e) => { e.preventDefault(); void addChannel(new FormData(e.currentTarget).get("n") as string); }}><Hash size={14} /><input name="n" autoFocus aria-label="Channel name" placeholder="channel-name" maxLength={40} onBlur={() => setAdding(false)} onKeyDown={(e) => { if (e.key === "Escape") setAdding(false); }} style={{ border: 0, outline: 0, background: "none", font: "inherit", color: "inherit", width: "100%", padding: 0 }} /></form> : null}
          </> : <>
            {CHANNELS.map((c) => c.name === "abc-ward-12"
              ? <Link key={c.name} href={CHANNEL} className={`nx-item ${inChannel ? "is-on" : c.unread ? "is-unread" : ""}`}><Hash size={14} /><span>{c.name}</span>{c.unread && !inChannel ? <i>{c.unread}</i> : null}</Link>
              : <span key={c.name} className="nx-item is-soon" aria-disabled="true" title="Not built yet"><Hash size={14} /><span>{c.name}</span></span>)}
            <div className="nx-nav-h">Direct messages<button type="button" aria-label="New message"><Plus size={13} /></button></div>
            {DMS.map((d) => <span key={d.name} className="nx-item is-soon" aria-disabled="true" title="Not built yet"><span className={`nx-dot ${d.here ? "" : "is-away"}`} /><span>{d.name}</span></span>)}
          </>}
        </div>
        {live.org ? <Link href="/next/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> works inside {org.name}</span></Link> : live.ready && !live.signedIn ? <Link href="/sign-in?next=/next/ngo/today" className="nx-side-f"><Sparkles size={13} /><span>Sample data. <b>Sign in</b> to open your workspace</span></Link> : <Link href="/next/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> has 2 things for you to approve</span></Link>}
      </aside>

      <div className="nx-main">
        <header className="nx-top">
          <div className="nx-crumb">{crumb[1] ? <><Link href={home} className="nx-hide-s">{crumb[0]}</Link><span className="nx-hide-s">/</span><b>{crumb[1]}</b></> : <b>{crumb[0]}</b>}</div>
          <div className="nx-top-r">
            <button type="button" className="nx-search"><Search size={14} /><span>Search anything</span><kbd>⌘K</kbd></button>
            <button type="button" className="nx-ib nx-only-s" aria-label="Search"><Search size={18} /></button>
            <button type="button" className="nx-ib nx-hide-s" aria-label="Schedule"><CalendarClock size={16} /></button>
            <button type="button" className="nx-ib" aria-label="Notifications"><Bell size={16} /></button>
            <button type="button" className="nx-ib nx-only-s" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={flip}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
            <Link href="/next/kaju" className="nx-kaju nx-hide-s"><Sparkles size={14} /><span>Kaju</span></Link>
          </div>
        </header>
        <main className={`nx-body ${flush ? "is-flush" : ""}`} id="nx-main">{children}</main>
      </div>

      <nav className="nx-dock" aria-label="Sections">
        <Link href={home} className={on(home) ? "is-on" : ""}><Home size={20} />Today</Link>
        <Link href="/next/ngo/animals" className={on("/next/ngo/animals") ? "is-on" : ""}><ListChecks size={20} />Work</Link>
        <Link href={CHANNEL} className={inChannel ? "is-on" : ""} data-n={inChannel ? undefined : unread}><MessageSquare size={20} />Messages</Link>
        <Link href="/next/kaju" className={inKaju ? "is-on" : ""}><Sparkles size={20} />Kaju</Link>
        <Link href={ws === "gov" ? "/next/ngo/today" : "/next/gov/overview"}><MoreHorizontal size={20} />More</Link>
      </nav>
    </div>
  );
}
