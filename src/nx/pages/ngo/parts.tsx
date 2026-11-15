"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { evidenceLink, isStoredEvidence } from "@/lib/abc";
import { Shell, type Ws } from "../../Shell";
import { Sample } from "../../ui";
import { TabBar } from "../../kit";
import { useLive, type Workspace } from "../../live";
import "../../css/ngo-setup.css";

/* The small parts the NGO setup pages share: who is reading (sample, signed in without an NGO, or a member and
   their role), tabs that keep their place in the address, a sample-mode action that opens the live demo, and one
   dense table with a preview drawer. */

export type Who = { ready: boolean; sample: boolean; ngo: Workspace | null; role: string | null; notNgo: boolean; userId: string | null; userName: string | null };
/** Sample when signed out or without an organisation; an NGO member's role otherwise. The database still decides. */
export function useWho(): Who {
  const live = useLive();
  const ngo = live.orgFor("ngo");
  return { ready: live.ready, sample: live.ready && !live.org, ngo: live.org ? ngo : null, role: ngo?.role ?? null, notNgo: live.ready && !!live.org && !ngo, userId: live.userId, userName: live.userName };
}

/** A tab per slug, read from and written to `?tab=` so a link (or a provider sending someone back) opens the right one. */
export function useTab<T extends string>(tabs: readonly { slug: string; label: T }[], initial?: string | null) {
  const pick = (s: string | null | undefined) => tabs.find((t) => t.slug === (s ?? "").split("?")[0])?.label ?? tabs[0].label;
  const [tab, set] = useState<T>(() => pick(initial));
  const change = useCallback((label: T) => {
    set(label);
    const slug = tabs.find((t) => t.label === label)?.slug ?? tabs[0].slug;
    try { const u = new URL(window.location.href); u.search = ""; if (slug !== tabs[0].slug) u.searchParams.set("tab", slug); window.history.replaceState(window.history.state, "", u.pathname + u.search); } catch {}
  }, [tabs]);
  return [tab, change] as const;
}

/** A page with a head and tabs. Actions live in each tab's own toolbar, where a phone can reach them. */
export function TabbedPage<T extends string>({ crumb, title, eyebrow, sub, sample, tabs, tab, onTab, id, children, ws = "ngo" }: { crumb: [string, string?]; title: string; eyebrow?: ReactNode; sub?: ReactNode; sample: boolean; tabs: T[]; tab: T; onTab: (t: T) => void; id: string; children: ReactNode; ws?: Ws }) {
  return (
    <Shell ws={ws} crumb={crumb}>
      <div className="nx-page ns-page" style={{ maxWidth: "none" }}>
        <div className="nx-head"><div>{eyebrow ? <p className="nx-eyebrow">{eyebrow}</p> : null}<h1 className="nx-h1">{title}{sample ? <Sample /> : null}</h1>{sub ? <p className="nx-sub">{sub}</p> : null}</div></div>
        <TabBar id={id} tabs={tabs} value={tab} onChange={onTab} label={`${title} sections`} />
        <div className="ns-body" role="tabpanel" aria-label={tab}>{children}</div>
      </div>
    </Shell>
  );
}

/** What a page says before it knows who is reading, or when the person's organisation is not an NGO. */
export function Holding({ crumb, title, text }: { crumb: [string, string?]; title?: string; text: ReactNode }) {
  return <Shell crumb={crumb}><div className="nx-page">{title ? <h1 className="nx-h1">{title}</h1> : null}<p className="nx-sub">{text}</p></div></Shell>;
}

/** In sample mode every action opens the live demo instead of doing nothing. */
export function TryLink({ children, quiet, small }: { children: ReactNode; quiet?: boolean; small?: boolean }) {
  return <Link href="/try" className={`nx-btn ${quiet ? "is-quiet" : ""} ${small ? "is-sm" : ""}`} title="Opens the live demo, where this works">{children}</Link>;
}

export function Tools({ children, end }: { children?: ReactNode; end?: ReactNode }) {
  return <div className="ns-tools"><div className="ns-tools-l">{children}</div>{end ? <div className="ns-tools-r">{end}</div> : null}</div>;
}

export type GCol<R> = { label: string; width: string; render: (r: R) => ReactNode; keep?: boolean };
/** One dense table. The first column and any `keep` column stay on a phone; a row opens its preview. */
export function Grid<R>({ label, cols, rows, rowKey, rowLabel, onOpen, href, openKey, empty }: { label: string; cols: GCol<R>[]; rows: R[]; rowKey: (r: R) => string; rowLabel?: (r: R) => string; onOpen?: (r: R) => void; href?: (r: R) => string | null; openKey?: string | null; empty?: ReactNode }) {
  const tpl = cols.map((c) => c.width).join(" ");
  const cell = (c: GCol<R>, i: number) => (i === 0 || c.keep ? undefined : "nx-hide-s");
  return (
    <div className="nx-table ns-grid" role="table" aria-label={label}>
      <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: tpl }}>{cols.map((c, i) => <span key={c.label || i} role="columnheader" className={cell(c, i)}>{c.label}</span>)}</div>
      {rows.map((r) => {
        const inner = cols.map((c, i) => <span key={c.label || i} role="cell" className={cell(c, i)} style={{ minWidth: 0 }}>{c.render(r)}</span>);
        const to = href?.(r);
        return to
          ? <Link key={rowKey(r)} href={to} role="row" className="nx-tr" style={{ gridTemplateColumns: tpl }} aria-label={rowLabel ? `Open ${rowLabel(r)}` : undefined}>{inner}</Link>
          : onOpen
          ? <button key={rowKey(r)} type="button" role="row" className={`nx-tr ${openKey === rowKey(r) ? "is-sel" : ""}`} style={{ gridTemplateColumns: tpl }} onClick={() => onOpen(r)} aria-label={rowLabel ? `Open ${rowLabel(r)}` : undefined}>{inner}</button>
          : <div key={rowKey(r)} role="row" className="nx-tr" style={{ gridTemplateColumns: tpl }}>{inner}</div>;
      })}
      {!rows.length && empty ? <div className="ns-empty-row">{empty}</div> : null}
    </div>
  );
}

/** Views that narrow one list, drawn as ListPage draws them. */
export function Views<V extends string>({ id, views, value, onChange, end }: { id: string; views: { id: V; label: string; count?: number }[]; value: V; onChange: (v: V) => void; end?: ReactNode }) {
  const calm = useReducedMotion();
  return (
    <div className="nx-bar">
      <div className="nx-views" role="tablist" aria-label="Views">
        {views.map((v) => <button key={v.id} type="button" role="tab" aria-selected={value === v.id} className={`nx-view ${value === v.id ? "is-on" : ""}`} onClick={() => onChange(v.id)}>{value === v.id ? <motion.span layoutId={`ns-v-${id}`} className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}{v.count !== undefined ? <span className="nx-count">{v.count}</span> : null}</span></button>)}
      </div>
      {end}
    </div>
  );
}

/** A plain search box for a list, hidden on a phone as ListPage hides it. */
export function Find({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <label className="nx-find"><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search" aria-label={label} /></label>;
}

/** The preview drawer, as ListPage draws it. Escape closes it. Wrap it in AnimatePresence. */
export function Drawer({ head, title, sub, onClose, href, hrefLabel = "Open the full record", children }: { head: ReactNode; title: ReactNode; sub?: ReactNode; onClose: () => void; href?: string; hrefLabel?: string; children: ReactNode }) {
  const calm = useReducedMotion();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".nx-modal")) onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <motion.aside className="nx-drawer" role="dialog" aria-label={typeof title === "string" ? title : undefined} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
      <div className="nx-drawer-h"><span>{head}</span><span style={{ marginLeft: "auto" }} />{href ? <Link href={href} className="nx-ib" aria-label={hrefLabel}><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="nx-drawer-b">
        <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div></div>
        {children}
        {href ? <p style={{ marginTop: 18 }}><Link href={href} className="nx-btn is-quiet">{hrefLabel}</Link></p> : null}
      </div>
    </motion.aside>
  );
}

/** Yes, no and not recorded, side by side: a share never hides the unknown. */
export function Partition({ yes, no, unknown, yesLabel, noLabel }: { yes: number; no: number; unknown: number; yesLabel: string; noLabel: string }) {
  const total = yes + no + unknown;
  const w = (v: number) => (total ? `${(v / total) * 100}%` : "0%");
  return (
    <div className="ns-part">
      <span className="ns-part-bar" role="img" aria-label={`${yes} ${yesLabel}, ${no} ${noLabel}, ${unknown} not recorded`}><i className="is-yes" style={{ width: w(yes) }} /><i className="is-no" style={{ width: w(no) }} /><i className="is-unk" style={{ width: w(unknown) }} /></span>
      <span className="ns-part-k"><span><i className="is-yes" />{yes.toLocaleString("en-IN")} {yesLabel}</span><span><i className="is-no" />{no.toLocaleString("en-IN")} {noLabel}</span><span><i className="is-unk" />{unknown.toLocaleString("en-IN")} not recorded</span></span>
    </div>
  );
}

export const plural = (k: number, one: string, many = `${one}s`) => `${k.toLocaleString("en-IN")} ${k === 1 ? one : many}`;

/** Opens one evidence file. Stored files are read through a signed link that expires in five minutes, so the link
    is asked for when the person opens it, inside the click so a phone does not block the new tab. */
export function EvidenceLink({ url, children }: { url: string; children: ReactNode }) {
  const [err, setErr] = useState<string | null>(null);
  if (!isStoredEvidence(url)) return <a className="ns-link" href={url} target="_blank" rel="noreferrer noopener">{children}</a>;
  const open = async () => {
    setErr(null);
    const tab = window.open("about:blank", "_blank");
    try { const link = await evidenceLink(url); if (tab) { tab.opener = null; tab.location.href = link; } else window.location.href = link; }
    catch (e) { tab?.close(); setErr(e instanceof Error ? e.message : "You cannot open this file."); }
  };
  return <><button type="button" className="ns-link" onClick={() => void open()}>{children}</button>{err ? <small className="ns-note-bad" role="alert"> {err}</small> : null}</>;
}
