"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronsUpDown, Hash, Home, LayoutGrid, ListChecks, MessageSquare, Moon, MoreHorizontal, Plus, Search, Settings, Sparkles, Sun } from "lucide-react";
import { CHANNELS, CH_PEOPLE, CLINIC, DMS, GOV_ORG, ME, ORG, dmSlug } from "./fixtures";
import { GOV, HEALTH, KAJU, LAB, NGO, RESEARCH, VET, VET_PATHS, WS_LABEL, classicOf, homeOf } from "./nav";
import { Command } from "./Command";
import { NeedsYou } from "./NeedsYou";
import { createChannel, openDm, useChannels, useDms, useLive, useOrgPeople, useUnread } from "./live";
import "./nx.css";

/* The new frame: a slim rail for the things that follow you everywhere, one sidebar for the workspace,
   and a top bar that says where you are. On a phone the rail and sidebar give way to five tabs. */

export type Ws = "ngo" | "gov" | "health" | "research" | "kaju";

export function Shell({ crumb, children, ws = "ngo", flush }: { crumb: [string, string?]; children: ReactNode; ws?: Ws; flush?: boolean }) {
  const path = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { try { const t = localStorage.getItem("nx.theme"); if (t === "dark" || t === "light") setTheme(t); else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark"); } catch {} }, []);
  const flip = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; try { localStorage.setItem("nx.theme", n); } catch {} return n; });
  const on = (href: string) => path === href || (href !== "/next/kaju" && path.startsWith(href + "/"));
  const live = useLive();
  const router = useRouter();
  const [cmd, setCmd] = useState(false);
  /* ⌘K or Ctrl K anywhere; "/" when not typing in a field. */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmd((o) => !o); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const inChannel = path.startsWith("/next/channels"), inKaju = path.startsWith("/next/kaju");
  /* A workspace's pages act for one of the person's organisations of that kind; the picked one follows the workspace they are in. */
  const want = ws === "gov" ? live.orgFor("government") : ws === "health" ? live.orgFor("healthcare") : ws === "research" ? live.orgFor("research") : ws === "ngo" && !inChannel ? live.orgFor("ngo") : null;
  const { pick } = live;
  useEffect(() => { if (want && want.org_id !== live.org?.org_id) pick(want.org_id); }, [want, live.org, pick]);
  const chans = useChannels(live.org?.org_id ?? null);
  const [adding, setAdding] = useState(false);
  const unreadMap = useUnread(live.org?.org_id ?? null, path);
  const dms = useDms(live.org?.org_id ?? null);
  const [picking, setPicking] = useState(false);
  const chanName = (id: string) => chans.rows?.find((c) => c.id === id)?.name ?? null;
  const office = live.org?.source === "review_office";
  /* Verification is a reviewing office's work. A programme coordinator in the same workspace does not see it; the database refuses it either way. */
  const cur = (ws !== "ngo" && ws !== "kaju" ? want : null) ?? live.org;
  const lab = live.org ? cur?.kind === "laboratory" : path.startsWith("/next/health/samples") || ["/next/health/testing", "/next/health/results", "/next/health/quality"].some((p) => path.startsWith(p));
  const vet = live.org ? cur?.kind === "veterinary" : VET_PATHS.some((p) => path.startsWith(p));
  const nav = (ws === "gov" ? GOV : ws === "health" ? (vet ? VET : lab ? LAB : HEALTH) : ws === "research" ? RESEARCH : ws === "kaju" ? KAJU : NGO).filter((i) => !i.office || !live.org || office);
  const switchOrg = () => { if (live.orgs.length < 2 || !live.org) return; const next = live.orgs[(live.orgs.findIndex((o) => o.org_id === live.org!.org_id) + 1) % live.orgs.length]; pick(next.org_id); router.push(homeOf(next.workspace, next.org_id)); };
  const sampleOrg = ws === "gov" ? GOV_ORG : ws === "health" ? (vet ? { name: "Kind Hour", short: "KH", kind: "Healthcare · Veterinary" } : lab ? { name: "Reference Rabies Diagnostic Laboratory", short: "RL", kind: "Healthcare · Laboratory" } : CLINIC) : ws === "research" ? { name: "Programme Epidemiology Unit", short: "PE", kind: "Research" } : ORG;
  const org = cur ? { name: cur.name, short: ((ws) => (ws.length > 1 ? ws.map((w) => w[0]).join("") : (ws[0] ?? "").slice(0, 2)).slice(0, 2).toUpperCase())((cur.short_name ?? cur.name).split(/[^A-Za-z0-9]+/).filter(Boolean)), kind: vet ? "Healthcare · Veterinary" : WS_LABEL[cur.workspace] ?? cur.kind } : sampleOrg;
  const me = live.org && live.userName ? live.userName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : ME.initials;
  const CHANNEL = live.org ? `/next/channels/${chans.rows?.[0]?.name ?? "general"}` : "/next/channels/abc-ward-12";
  const unreadTotal = Object.entries(unreadMap).reduce((a, [id, n]) => a + (path === `/next/channels/${chanName(id)}` ? 0 : n), 0);
  const unread = live.org ? (unreadTotal ? String(unreadTotal) : undefined) : "2";
  const addChannel = async (raw: string) => { const name = raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); setAdding(false); if (!live.org || name.length < 2) return; const r = await createChannel(live.org.org_id, name, ""); if (!r.error) { chans.reload(); window.location.assign(`/next/channels/${name}`); } };
  const home = live.org ? homeOf(live.org.workspace, live.org.org_id) : ws === "gov" ? "/next/gov/overview" : ws === "health" ? "/next/health/today" : ws === "research" ? "/next/research/datasets" : "/next/ngo/today";

  return (
    <div className="nx" data-theme={theme}>
      <nav className="nx-rail" aria-label="StrayPaw">
        <Link href="/next/ngo/today" className="nx-mark" aria-label="StrayPaw home">sp</Link>
        <Link href={home} className={`nx-rail-b ${!inChannel && !inKaju ? "is-on" : ""}`} aria-label="Workspace" title="Workspace"><LayoutGrid size={17} /></Link>
        <Link href={CHANNEL} className={`nx-rail-b ${inChannel ? "is-on" : ""}`} aria-label="Channels" title="Channels" data-n={unread}><MessageSquare size={17} /></Link>
        <Link href="/next/kaju" className={`nx-rail-b ${inKaju ? "is-on" : ""}`} aria-label="Kaju" title="Kaju"><Sparkles size={17} /></Link>
        <button type="button" className="nx-rail-b" aria-label="Search" title="Search (⌘K)" onClick={() => setCmd(true)}><Search size={17} /></button>
        <span className="nx-rail-sp" />
        <button type="button" className="nx-rail-b" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} title="Theme" onClick={flip}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        {live.orgFor("ngo") ? <Link href="/ngo/settings" className="nx-rail-b" aria-label="Organisation settings" title="Organisation settings"><Settings size={16} /></Link> : null}
        <span className="nx-face" aria-label={live.userName ?? ME.name}>{me}</span>
      </nav>

      <aside className="nx-side" aria-label={`${org.name} navigation`}>
        {live.org
          ? <button type="button" className="nx-org" title={live.orgs.length > 1 ? "Switch organisation" : undefined} onClick={switchOrg}><span className="nx-org-l">{org.short}</span><span><b>{org.name}</b><small>{ws === "kaju" ? "Kaju" : org.kind}</small></span>{live.orgs.length > 1 ? <ChevronsUpDown size={14} /> : null}</button>
          : <Link href={ws === "gov" ? "/next/ngo/today" : "/next/gov/overview"} className="nx-org" title="Switch workspace"><span className="nx-org-l">{org.short}</span><span><b>{org.name}</b><small>{ws === "kaju" ? "Kaju" : org.kind}</small></span><ChevronsUpDown size={14} /></Link>}
        <div className="nx-nav">
          {nav.map((i) => <Link key={i.href} href={i.href} className={`nx-item ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined}><i.icon size={15} /><span>{i.label}</span>{i.n && !live.org ? <i>{i.n}</i> : null}</Link>)}
          <div className="nx-nav-h">Channels<button type="button" aria-label="New channel" onClick={() => live.org && setAdding(true)}><Plus size={13} /></button></div>
          {live.org ? <>
            {(chans.rows ?? []).filter((c) => c.kind !== "dm").map((c) => { const href = `/next/channels/${c.name}`; const n = path === href ? 0 : unreadMap[c.id] ?? 0; return <Link key={c.id} href={href} className={`nx-item ${path === href ? "is-on" : n ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined} aria-label={n ? `#${c.name}, ${n} unread` : undefined}><Hash size={14} /><span>{c.name}</span>{n ? <i>{n}</i> : null}</Link>; })}
            {chans.rows && !chans.rows.some((c) => c.kind !== "dm") && !adding ? <Link href="/next/channels/general" className="nx-item"><Plus size={14} /><span>Create #general</span></Link> : null}
            {adding ? <form className="nx-item" onSubmit={(e) => { e.preventDefault(); void addChannel(new FormData(e.currentTarget).get("n") as string); }}><Hash size={14} /><input name="n" autoFocus aria-label="Channel name" placeholder="channel-name" maxLength={40} onBlur={() => setAdding(false)} onKeyDown={(e) => { if (e.key === "Escape") setAdding(false); }} style={{ border: 0, outline: 0, background: "none", font: "inherit", color: "inherit", width: "100%", padding: 0 }} /></form> : null}
            <div className="nx-nav-h">Direct messages<button type="button" aria-label="New direct message" aria-expanded={picking} onClick={() => setPicking((x) => !x)}><Plus size={13} /></button></div>
            {picking ? <People orgId={live.org.org_id} me={live.userId} onClose={() => setPicking(false)} onPick={async (id) => { const r = await openDm(live.org!.org_id, id); setPicking(false); if (r.name) { chans.reload(); dms.reload(); router.push(`/next/channels/${r.name}`); } }} /> : null}
            {[...(dms.rows ?? [])].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")).map((d) => { const name = chanName(d.channel_id); if (!name) return null; const href = `/next/channels/${name}`; const n = path === href ? 0 : unreadMap[d.channel_id] ?? 0; return <Link key={d.channel_id} href={href} className={`nx-item ${path === href ? "is-on" : n ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined}><span className="nx-dot is-away" /><span>{d.other_name}</span>{n ? <i>{n}</i> : null}</Link>; })}
            {dms.rows && !dms.rows.length && !picking ? <button type="button" className="nx-item" onClick={() => setPicking(true)}><Plus size={14} /><span>Message someone</span></button> : null}
          </> : <>
            {CHANNELS.map((c) => { const href = `/next/channels/${c.name}`; return <Link key={c.name} href={href} className={`nx-item ${path === href ? "is-on" : c.unread ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined}><Hash size={14} /><span>{c.name}</span>{c.unread && path !== href ? <i>{c.unread}</i> : null}</Link>; })}
            <div className="nx-nav-h">Direct messages<button type="button" aria-label="New direct message" aria-expanded={picking} onClick={() => setPicking((x) => !x)}><Plus size={13} /></button></div>
            {picking ? <People sample onClose={() => setPicking(false)} onPick={(name) => { setPicking(false); router.push(`/next/channels/${dmSlug(name)}`); }} /> : null}
            {DMS.map((d) => { const href = `/next/channels/${dmSlug(d.name)}`; return <Link key={d.name} href={href} className={`nx-item ${path === href ? "is-on" : ""}`} aria-current={path === href ? "page" : undefined}><span className={`nx-dot ${d.here ? "" : "is-away"}`} /><span>{d.name}</span></Link>; })}
          </>}
        </div>
        {cur ? <Link href={classicOf(cur.workspace, cur.org_id, cur.kind, cur.source)} className="nx-item nx-classic" title="The previous version of StrayPaw, kept while the new one settles in"><span>Classic view</span></Link> : null}
        {live.org ? <Link href="/next/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> works inside {org.name}</span></Link> : live.ready && !live.signedIn ? <Link href="/sign-in?next=/next" className="nx-side-f"><Sparkles size={13} /><span>Sample data. <b>Sign in</b> to open your workspace</span></Link> : live.ready && live.signedIn ? <Link href="/next/start" className="nx-side-f"><Sparkles size={13} /><span>Sample data. <b>Join or start</b> an organisation to see your own</span></Link> : <Link href="/next/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> has 2 things for you to approve</span></Link>}
      </aside>

      <div className="nx-main">
        <header className="nx-top">
          <div className="nx-crumb">{crumb[1] ? <><Link href={home} className="nx-hide-s">{crumb[0]}</Link><span className="nx-hide-s">/</span><b>{crumb[1]}</b></> : <b>{crumb[0]}</b>}</div>
          <div className="nx-top-r">
            <button type="button" className="nx-search" onClick={() => setCmd(true)} aria-keyshortcuts="Meta+K Control+K"><Search size={14} /><span>Search anything</span><kbd>⌘K</kbd></button>
            <button type="button" className="nx-ib nx-only-s" aria-label="Search" onClick={() => setCmd(true)}><Search size={18} /></button>
            <NeedsYou />
            <button type="button" className="nx-ib nx-only-s" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={flip}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
            <Link href="/next/kaju" className="nx-kaju nx-hide-s"><Sparkles size={14} /><span>Kaju</span></Link>
          </div>
        </header>
        <main className={`nx-body ${flush ? "is-flush" : ""}`} id="nx-main">{children}</main>
      </div>

      <Command open={cmd} onClose={() => setCmd(false)} />
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


const ROLE_WORD: Record<string, string> = { admin: "lead", coordinator: "coordinator", veterinarian: "veterinarian", member: "member", lead: "lead", clinician: "clinician", nurse: "nurse", lab_scientist: "laboratory scientist", analyst: "analyst", field: "field team", reviewer: "reviewer" };
/** Choose someone to message: names only, from the same organisation. */
function People({ orgId = null, me = null, sample, onPick, onClose }: { orgId?: string | null; me?: string | null; sample?: boolean; onPick: (id: string) => void; onClose: () => void }) {
  const people = useOrgPeople(sample ? null : orgId);
  const [q, setQ] = useState("");
  const list = sample ? CH_PEOPLE.filter((p) => !DMS.some((d) => d.name === p)).concat(DMS.map((d) => d.name)).map((n) => ({ id: n, name: n, role: "" }))
    : (people.rows ?? []).filter((p) => p.user_id !== me).map((p) => ({ id: p.user_id, name: p.name, role: ROLE_WORD[p.role] ?? p.role.replace(/_/g, " ") }));
  const shown = list.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="nx-people-pick" role="dialog" aria-label="New direct message" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" aria-label="Find a person" />
      <ul>{shown.slice(0, 8).map((p) => <li key={p.id}><button type="button" onClick={() => onPick(p.id)}>{p.name}{p.role ? <small> · {p.role}</small> : null}</button></li>)}
        {!sample && people.rows === null ? <li className="nx-t3">Reading…</li> : !shown.length ? <li className="nx-t3">No one else here yet.</li> : null}</ul>
    </div>
  );
}
