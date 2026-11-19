"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Hash, Home, Pin, UserPlus, Users, X, LayoutGrid, ListChecks, MessageSquare, Moon, MoreHorizontal, Plus, Search, Settings, Sparkles, Sun } from "lucide-react";
import { CHANNELS, CLINIC, DMS, GOV_ORG, ME, ORG, dmSlug } from "./fixtures";
import { GOV, HEALTH, KAJU, LAB, NGO, NGO_MORE, RESEARCH, VET, CLINIC_VET, VET_PATHS, WS_LABEL, homeOf } from "./nav";
import { NeedsYou } from "./NeedsYou";
import { WorkTabs } from "./Tabs";
import { OrgMenu } from "./OrgMenu";
import { useProgrammeChannels } from "./collab";
import { getSupabase } from "@/lib/supabase";
import { Failed, OfflineBar, ToastHost } from "./kit";
import { KajuProvider, useKaju, type KajuSubject } from "./kaju/state";
import { JobWatch } from "./kaju/JobWatch";
import { useChannels, useDms, useLive, useOrgPeople, useUnread } from "./live";
import { ConversationHost, isUnnamed, newConversation, personName } from "./conversations";
import { Back, PhoneBar, PhoneMenu, PlusSheet, parentOf, phoneTabs, type PhoneKind } from "./Phone";
import "./nx.css";
/* The compact Kaju panel's styles also place the top bar's Kaju button, so they load with the shell; the panel's code
   loads the first time it is opened. */
import "./kaju/kaju.css";
import "./kaju/workspace.css";

/* The command bar and the compact Kaju panel are closed on every first paint, so their code (Kaju's composer, plans,
   work cards and voice; search) is fetched and run the first time a person opens them, not by every page as it starts.
   Their keyboard shortcuts live here in the shell, so ⌘K and ⌘J work before either has loaded. */
const Command = dynamic(() => import("./Command").then((m) => m.Command), { ssr: false });
const KajuDock = dynamic(() => import("./kaju/Dock").then((m) => m.KajuDock), { ssr: false });

/* The new frame: a slim rail for the things that follow you everywhere, one sidebar for the workspace,
   and a top bar that says where you are. On a phone the rail and sidebar give way to five tabs. */

export type Ws = "ngo" | "gov" | "health" | "research" | "kaju";

/** `subject`: the record open on the page, so Kaju knows what "this" means. Ids only; the server reads it again with the person's access. */
type Meta = { crumb: [string, string?]; ws?: Ws; flush?: boolean; subject?: KajuSubject | null };
const MetaCtx = createContext<((m: Meta) => void) | null>(null);
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** The workspace a path belongs to, so the frame is right before a page says anything. */
export const wsOf = (path: string): Ws => (/^\/gov/.test(path) ? "gov" : /^\/health/.test(path) ? "health" : /^\/research/.test(path) ? "research" : /^\/kaju/.test(path) ? "kaju" : "ngo");

/** The frame is mounted once, in the layout, and stays while pages change. A page tells it where it is with Shell. */
export function Frame({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta>({ crumb: [""] });
  return <MetaCtx.Provider value={setMeta}><KajuProvider><FrameBody meta={meta}>{children}</FrameBody></KajuProvider></MetaCtx.Provider>;
}

/** A page's place in the frame: its breadcrumb, workspace and whether it runs edge to edge. */
export function Shell({ crumb, children, ws, flush, subject }: { crumb: [string, string?]; children: ReactNode; ws?: Ws; flush?: boolean; subject?: KajuSubject | null }) {
  const set = useContext(MetaCtx);
  const key = `${crumb[0]}\u0000${crumb[1] ?? ""}\u0000${ws ?? ""}\u0000${flush ? 1 : 0}\u0000${subject ? `${subject.kind ?? ""}:${subject.caseId ?? ""}:${subject.dogId ?? ""}:${subject.packageId ?? ""}:${subject.ws ?? ""}:${subject.label ?? ""}` : ""}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useIsoLayout(() => { set?.({ crumb, ws, flush, subject: subject ?? null }); }, [key, set]);
  if (!set) return <MetaCtx.Provider value={() => {}}><KajuProvider><FrameBody meta={{ crumb, ws, flush, subject: subject ?? null }}>{children}</FrameBody></KajuProvider></MetaCtx.Provider>;
  return <>{children}</>;
}

function FrameBody({ meta, children }: { meta: Meta; children: ReactNode }) {
  const path = usePathname();
  const { crumb, flush } = meta;
  const ws = meta.ws ?? wsOf(path);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { try { const t = localStorage.getItem("nx.theme"); if (t === "dark" || t === "light") setTheme(t); else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark"); } catch {} }, []);
  const flip = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; try { localStorage.setItem("nx.theme", n); } catch {} return n; });
  const on = (href: string) => path === href || (href !== "/kaju" && path.startsWith(href + "/"));
  const live = useLive();
  const router = useRouter();
  const [cmd, setCmd] = useState(false);
  /* Once opened they stay mounted, so they close with their animation and keep what was typed. */
  const [cmdUsed, setCmdUsed] = useState(false);
  useEffect(() => { if (cmd) setCmdUsed(true); }, [cmd]);
  const kaju = useKaju();
  const { setPage, setSubject, setOpen: setKaju } = kaju;
  const [dockUsed, setDockUsed] = useState(false);
  useEffect(() => { if (kaju.open) setDockUsed(true); }, [kaju.open]);
  useEffect(() => { setPage({ path, title: crumb[1] ?? crumb[0] }); }, [path, crumb, setPage]);
  const subjectKey = meta.subject ? JSON.stringify(meta.subject) : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSubject(meta.subject ?? null); }, [path, subjectKey, setSubject]);
  /* ⌘J or Ctrl J opens compact Kaju anywhere except on Kaju's own pages. */
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === "j" || e.key === "J") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (!path.startsWith("/kaju")) setKaju(!kaju.open); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [path, setKaju, kaju.open]);
  /* ⌘K or Ctrl K anywhere; "/" when not typing in a field. */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmd((o) => !o); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const inChannel = path.startsWith("/channels"), inKaju = path.startsWith("/kaju");
  /* A workspace's pages act for one of the person's organisations of that kind; the picked one follows the workspace they are in. */
  const want = ws === "gov" ? live.orgFor("government") : ws === "health" ? live.orgFor("healthcare") : ws === "research" ? live.orgFor("research") : ws === "ngo" && !inChannel ? live.orgFor("ngo") : null;
  const { pick } = live;
  useEffect(() => { if (want && want.org_id !== live.org?.org_id) pick(want.org_id); }, [want, live.org, pick]);
  const chans = useChannels(live.org?.org_id ?? null);
  const unreadMap = useUnread(live.org?.org_id ?? null, path);
  const dms = useDms(live.org?.org_id ?? null);
  const progChans = useProgrammeChannels(!!live.org);
  /* Someone without a name is shown by their role, which is read only when a conversation needs it. */
  const dmPeople = useOrgPeople(dms.rows?.some((d) => isUnnamed(d.other_name)) ? live.org?.org_id ?? null : null);
  const [pins, setPins] = useState<{ id: string; page: string; name: string }[]>([]);
  const orgId = live.org?.org_id ?? null;
  useEffect(() => {
    const db = getSupabase(); if (!db || !orgId) { setPins([]); return; }
    const load = () => { void db.from("nx_saved_views").select("id,page,name").eq("kind", "pin").order("created_at").limit(12).then(({ data, error }) => { if (!error) setPins((data ?? []) as { id: string; page: string; name: string }[]); }); };
    load(); window.addEventListener("nx:pins", load); return () => window.removeEventListener("nx:pins", load);
  }, [orgId]);
  const unpin = async (id: string) => { setPins((p) => p.filter((x) => x.id !== id)); await getSupabase()?.from("nx_saved_views").delete().eq("id", id); };
  const chanName = (id: string) => chans.rows?.find((c) => c.id === id)?.name ?? null;
  const office = live.org?.source === "review_office";
  /* Verification is a reviewing office's work. A programme coordinator in the same workspace does not see it; the database refuses it either way. */
  const cur = (ws !== "ngo" && ws !== "kaju" ? want : null) ?? live.org;
  const lab = live.org ? cur?.kind === "laboratory" : path.startsWith("/health/samples") || ["/health/testing", "/health/results", "/health/quality"].some((p) => path.startsWith(p));
  const vet = live.org ? cur?.kind === "veterinary" : VET_PATHS.some((p) => path.startsWith(p));
  const nav = (ws === "gov" ? GOV : ws === "health" ? (vet ? (cur?.source === "vet_clinic" ? CLINIC_VET : VET) : lab ? LAB : HEALTH) : ws === "research" ? RESEARCH : ws === "kaju" ? KAJU : NGO).filter((i) => !i.office || !live.org || office);
  const sampleOrg = ws === "gov" ? GOV_ORG : ws === "health" ? (vet ? { name: "Kind Hour", short: "KH", kind: "Healthcare · Veterinary" } : lab ? { name: "Reference Rabies Diagnostic Laboratory", short: "RL", kind: "Healthcare · Laboratory" } : CLINIC) : ws === "research" ? { name: "Programme Epidemiology Unit", short: "PE", kind: "Research" } : ORG;
  const org = cur ? { name: cur.name, short: ((ws) => (ws.length > 1 ? ws.map((w) => w[0]).join("") : (ws[0] ?? "").slice(0, 2)).slice(0, 2).toUpperCase())((cur.short_name ?? cur.name).split(/[^A-Za-z0-9]+/).filter(Boolean)), kind: vet ? "Healthcare · Veterinary" : WS_LABEL[cur.workspace] ?? cur.kind } : sampleOrg;
  const me = live.org && live.userName ? live.userName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : ME.initials;
  const CHANNEL = live.org ? `/channels/${chans.rows?.[0]?.name ?? "general"}` : "/channels/abc-ward-12";
  const unreadTotal = Object.entries(unreadMap).reduce((a, [id, n]) => a + (path === `/channels/${chanName(id)}` ? 0 : n), 0);
  const unread = live.org ? (unreadTotal ? String(unreadTotal) : undefined) : "2";
  const home = live.org ? homeOf(live.org.workspace, live.org.org_id) : ws === "gov" ? "/gov/overview" : ws === "health" ? "/health/today" : ws === "research" ? "/research/datasets" : "/ngo/today";

  /* The phone: the role's own bar, "+" for the records it makes, and a Menu sheet with the rest (docs/rebuild/MOBILE.md). */
  const homeWs = ws === "kaju" ? (live.org?.workspace === "government" ? "gov" : live.org?.workspace === "healthcare" ? "health" : live.org?.workspace === "research" ? "research" : "ngo") : ws;
  const kind: PhoneKind = homeWs === "gov" ? (office ? "office" : "gov") : homeWs === "health" ? (vet ? "vet" : lab ? "lab" : "clinic") : homeWs === "research" ? "research" : "ngo";
  const [menu, setMenu] = useState(false), [plus, setPlus] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []), closePlus = useCallback(() => setPlus(false), []);
  useEffect(() => { setMenu(false); setPlus(false); }, [path]);
  /* On a record, the first crumb is its section (as the phone's back arrow is), so a page needs no "All …" link of its own. */
  const back = parentOf(path, home);
  /* The page's large title is the title; the bar shows the name once that title has scrolled away. */
  const [titleGone, setTitleGone] = useState(false);
  useEffect(() => {
    setTitleGone(false);
    const main = document.getElementById("nx-main"); if (!main || typeof IntersectionObserver === "undefined") return;
    let io: IntersectionObserver | null = null;
    const watch = () => { const h = main.querySelector("h1"); if (!h) return false; io?.disconnect(); io = new IntersectionObserver(([e]) => setTitleGone(!e.isIntersecting), { root: main, rootMargin: "-8px 0px 0px 0px" }); io.observe(h); return true; };
    const t = window.setTimeout(() => { if (!watch()) window.setTimeout(watch, 1200); }, 60);
    return () => { window.clearTimeout(t); io?.disconnect(); };
  }, [path, crumb]);
  const convs = live.org
    ? [...(chans.rows ?? []).filter((c) => c.kind === "channel" || c.kind === "announcement").map((c) => ({ href: `/channels/${c.name}`, name: `#${c.name}`, n: path === `/channels/${c.name}` ? 0 : unreadMap[c.id] ?? 0 })),
       ...[...(dms.rows ?? [])].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")).flatMap((d) => { const name = chanName(d.channel_id); return name ? [{ href: `/channels/${name}`, name: personName(d.other_name, dmPeople.rows?.find((p) => p.user_id === d.other_id)?.role), n: path === `/channels/${name}` ? 0 : unreadMap[d.channel_id] ?? 0, dm: true }] : []; })]
    : [...CHANNELS.map((c) => ({ href: `/channels/${c.name}`, name: `#${c.name}`, n: c.unread ? 1 : 0 })), ...DMS.map((d) => ({ href: `/channels/${dmSlug(d.name)}`, name: d.name, n: 0, dm: true }))];

  return (
    <div className="nx" data-theme={theme}>
      <a className="nx-skip" href="#nx-main">Skip to content</a>
      <nav className="nx-rail" aria-label="StrayPaw">
        <Link href={home} className="nx-mark" aria-label="StrayPaw home">sp</Link>
        <Link href={home} className={`nx-rail-b ${!inChannel && !inKaju ? "is-on" : ""}`} aria-label="Workspace" title="Workspace"><LayoutGrid size={17} /></Link>
        <Link href={CHANNEL} className={`nx-rail-b ${inChannel ? "is-on" : ""}`} aria-label="Channels" title="Channels" data-n={unread}><MessageSquare size={17} /></Link>
        <Link href="/kaju" className={`nx-rail-b ${inKaju ? "is-on" : ""}`} aria-label="Kaju" title="Kaju"><Sparkles size={17} /></Link>
        <button type="button" className="nx-rail-b" aria-label="Search" title="Search (⌘K)" onClick={() => setCmd(true)}><Search size={17} /></button>
        <span className="nx-rail-sp" />
        <button type="button" className="nx-rail-b" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} title="Theme" onClick={flip}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <Link href={live.orgFor("ngo") ? "/ngo/settings" : "/settings"} className="nx-rail-b" aria-label="Settings" title="Settings"><Settings size={16} /></Link>
        <span className="nx-face" aria-label={live.userName ?? ME.name}>{me}</span>
      </nav>

      <aside className="nx-side" aria-label={`${org.name} navigation`}>
        <OrgMenu shown={{ ...org, kind: ws === "kaju" ? "Kaju" : org.kind }} ws={ws} current={cur ?? null} />
        <div className="nx-nav">
          {nav.map((i) => <Link key={i.href} href={i.href} className={`nx-item ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined}><i.icon size={15} /><span>{i.label}</span>{i.n && !live.org ? <i>{i.n}</i> : null}</Link>)}
          {ws === "ngo" && !inChannel ? <><div className="nx-nav-h">Your organisation</div>{NGO_MORE.map((i) => <Link key={i.href} href={i.href} className={`nx-item ${on(i.href) ? "is-on" : ""}`} aria-current={on(i.href) ? "page" : undefined}><i.icon size={15} /><span>{i.label}</span></Link>)}{live.orgs.some((o) => ["admin", "lead"].includes(o.role)) ? <Link href="/requests" className={`nx-item ${on("/requests") ? "is-on" : ""}`}><UserPlus size={15} /><span>Requests to join</span></Link> : null}</> : null}
          {pins.length ? <><div className="nx-nav-h">Pinned</div>{pins.map((x) => <span key={x.id} className="nx-pin"><Link href={x.page} className={`nx-item ${path === x.page ? "is-on" : ""}`} aria-current={path === x.page ? "page" : undefined}><Pin size={13} /><span>{x.name}</span></Link><button type="button" aria-label={`Unpin ${x.name}`} onClick={() => void unpin(x.id)}><X size={12} /></button></span>)}</> : null}
          <div className="nx-nav-h">Channels<button type="button" aria-label="New channel" title="New channel" onClick={() => newConversation({ kind: "channel" })}><Plus size={13} /></button></div>
          {live.org ? <>
            {(chans.rows ?? []).filter((c) => c.kind === "channel" || c.kind === "announcement").map((c) => { const href = `/channels/${c.name}`; const n = path === href ? 0 : unreadMap[c.id] ?? 0; return <Link key={c.id} href={href} className={`nx-item ${path === href ? "is-on" : n ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined} aria-label={n ? `#${c.name}, ${n} unread` : undefined}><Hash size={14} /><span>{c.name}</span>{n ? <i>{n}</i> : null}</Link>; })}
            {chans.rows && !chans.rows.some((c) => c.kind === "channel" || c.kind === "announcement") ? <Link href="/channels/general" className="nx-item"><Plus size={14} /><span>Set up #general</span></Link> : null}
            {progChans?.length ? <><div className="nx-nav-h">Programme channels</div>{progChans.map((c) => { const href = `/channels/${c.name}`; return <Link key={c.id} href={href} className={`nx-item ${path === href ? "is-on" : ""}`} aria-current={path === href ? "page" : undefined} title={c.programme_name}><Users size={14} /><span>{c.name}</span></Link>; })}</> : null}
            <div className="nx-nav-h">Direct messages<button type="button" aria-label="New message" title="New message" onClick={() => newConversation({ kind: "message" })}><Plus size={13} /></button></div>
            {[...(dms.rows ?? [])].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")).map((d) => { const name = chanName(d.channel_id); if (!name) return null; const href = `/channels/${name}`; const n = path === href ? 0 : unreadMap[d.channel_id] ?? 0; return <Link key={d.channel_id} href={href} className={`nx-item ${path === href ? "is-on" : n ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined}><span className="nx-dot is-away" /><span>{personName(d.other_name, dmPeople.rows?.find((p) => p.user_id === d.other_id)?.role)}</span>{n ? <i>{n}</i> : null}</Link>; })}
            {dms.rows && !dms.rows.length ? <button type="button" className="nx-item" onClick={() => newConversation({ kind: "message" })}><Plus size={14} /><span>New message</span></button> : null}
          </> : <>
            {CHANNELS.map((c) => { const href = `/channels/${c.name}`; return <Link key={c.name} href={href} className={`nx-item ${path === href ? "is-on" : c.unread ? "is-unread" : ""}`} aria-current={path === href ? "page" : undefined}><Hash size={14} /><span>{c.name}</span>{c.unread && path !== href ? <i>{c.unread}</i> : null}</Link>; })}
            <div className="nx-nav-h">Direct messages<button type="button" aria-label="New message" title="New message" onClick={() => newConversation({ kind: "message" })}><Plus size={13} /></button></div>
            {DMS.map((d) => { const href = `/channels/${dmSlug(d.name)}`; return <Link key={d.name} href={href} className={`nx-item ${path === href ? "is-on" : ""}`} aria-current={path === href ? "page" : undefined}><span className={`nx-dot ${d.here ? "" : "is-away"}`} /><span>{d.name}</span></Link>; })}
          </>}
        </div>
        {live.org ? <Link href="/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> works inside {org.name}</span></Link> : live.ready && !live.signedIn ? <Link href="/sign-in?next=/home" className="nx-side-f"><Sparkles size={13} /><span>Sample data. <b>Sign in</b> to open your workspace</span></Link> : live.ready && live.signedIn ? <Link href="/start" className="nx-side-f"><Sparkles size={13} /><span>Sample data. <b>Join or start</b> an organisation to see your own</span></Link> : <Link href="/kaju" className="nx-side-f"><Sparkles size={13} /><span><b>Kaju</b> has 2 things for you to approve</span></Link>}
      </aside>

      <div className="nx-main">
        <header className={`nx-top ${back ? "has-back" : ""}`} data-title={titleGone ? "bar" : "page"}>
          {back ? <Back href={back.href} label={back.label} /> : null}
          <div className="nx-crumb">{crumb[1] ? <><Link href={back?.href ?? home} className="nx-hide-s">{crumb[0]}</Link><span className="nx-hide-s">/</span><b>{crumb[1]}</b></> : <b>{crumb[0]}</b>}</div>
          <div className="nx-top-r">
            <button type="button" className="nx-search" onClick={() => setCmd(true)} aria-keyshortcuts="Meta+K Control+K"><Search size={14} /><span>Search anything</span><kbd>⌘K</kbd></button>
            <button type="button" className="nx-ib nx-only-s" aria-label="Search" onClick={() => setCmd(true)}><Search size={18} /></button>
            <NeedsYou />
            <button type="button" className="nx-ib nx-only-s ph-theme" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={flip}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
            {path.startsWith("/kaju") ? null : <button type="button" className="nx-kaju nx-hide-s" aria-expanded={kaju.open} aria-keyshortcuts="Meta+J Control+J" title="Kaju (⌘J)" onClick={() => setKaju(!kaju.open)}><Sparkles size={14} /><span>Kaju</span></button>}
          </div>
        </header>
        <WorkTabs path={path} title={crumb[1]} home={home} />
        <OfflineBar />
        <main className={`nx-body ${flush ? "is-flush" : ""}`} id="nx-main" tabIndex={-1}>{live.failed && live.signedIn ? <div className="nx-page"><h1 className="nx-h1">Your workspace could not be read</h1><Failed error="StrayPaw could not reach your organisation's records, so nothing is shown rather than sample data. Check your connection and try again." retry={live.retry} /></div> : children}</main>
      </div>

      {cmdUsed ? <Command open={cmd} onClose={() => setCmd(false)} /> : null}
      <ToastHost />
      <ConversationHost />
      <JobWatch />
      {path.startsWith("/kaju") || !dockUsed ? null : <KajuDock crumb={crumb[1] ?? crumb[0]} />}
      <PhoneBar tabs={phoneTabs(kind, home)} on={on} plus={kind === "ngo" || kind === "clinic" || kind === "vet"} onPlus={() => setPlus(true)} onMenu={() => setMenu(true)} menuOpen={menu} unread={unread} />
      <PlusSheet open={plus} onClose={closePlus} kind={kind} onKaju={() => { if (path.startsWith("/kaju")) router.push("/kaju"); else setKaju(true); }} />
      <PhoneMenu open={menu} onClose={closeMenu} on={on} nav={nav} more={ws === "ngo" && !inChannel ? NGO_MORE : []} convs={convs} newConv={() => newConversation({ kind: "message" })}
        org={<OrgMenu shown={{ ...org, kind: ws === "kaju" ? "Kaju" : org.kind }} ws={ws} current={cur ?? null} />} theme={theme} flip={flip}
        settings={live.orgFor("ngo") ? "/ngo/settings" : "/settings"} kajuHome={!!live.org} />
    </div>
  );
}
