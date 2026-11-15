"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Maximize2, Pin, Search, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useLive } from "./live";
import { Field, Modal, toast } from "./kit";
import { Shell, type Ws } from "./Shell";
import { Sample } from "./ui";

/* One list page: a head, views that narrow one table, search, and a drawer that previews a row.
   Every rebuilt list uses this, so a person learns it once. */
export type Col<R> = { label: string; width: string; render: (r: R) => ReactNode; hideOnPhone?: boolean };
export type View<R> = { id: string; label: string; test: (r: R) => boolean };
export type Preview = { title: ReactNode; sub?: ReactNode; body: ReactNode; href?: string; hrefLabel?: string; hrefNote?: string };

export function ListPage<R>({ ws = "ngo", crumb, eyebrow, title, sub, action, sample, views, columns, rows, rowKey, rowLabel, search, preview, loading, note, empty, sort }: {
  ws?: Ws; crumb: [string, string?]; eyebrow?: ReactNode; title: string; sub: ReactNode; action?: ReactNode; sample: boolean;
  views: View<R>[]; columns: Col<R>[]; rows: R[]; rowKey: (r: R) => string; rowLabel: (r: R) => string; search?: (r: R) => string;
  preview: (r: R) => Preview; loading: boolean; note?: string | null; empty: { none: string; filtered?: string; hint?: string }; sort?: (a: R, b: R) => number;
}) {
  const path = usePathname();
  const live = useLive();
  const KEY = `nx.list:${path}`;
  const [view, setView] = useState(views[0].id);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  /* Coming back to a list finds it as it was left: the same view, search, open record and scroll. */
  useEffect(() => { try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { view?: string; q?: string; open?: string | null; top?: number } | null; if (v) { if (v.view && views.some((x) => x.id === v.view)) setView(v.view); if (typeof v.q === "string") setQ(v.q); if (v.open) setOpenId(v.open); if (v.top) window.setTimeout(() => { const m = document.getElementById("nx-main"); if (m) m.scrollTop = v.top!; }, 60); } } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY]);
  useEffect(() => { const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ view, q, open: openId, top: document.getElementById("nx-main")?.scrollTop ?? 0 })); } catch {} }; save(); return save; }, [KEY, view, q, openId]);
  /* Views a person saved for this page, stored with their account. */
  const [saved, setSaved] = useState<{ id: string; name: string; state: { view?: string; q?: string } }[]>([]);
  const [naming, setNaming] = useState<string | null>(null);
  const loadSaved = useCallback(() => { const db = getSupabase(); if (!db || !live.org) return; void db.from("nx_saved_views").select("id,name,state").eq("kind", "view").eq("page", path).order("created_at").then(({ data, error }) => { if (!error) setSaved((data ?? []) as typeof saved); }); }, [live.org, path]);
  useEffect(() => { loadSaved(); }, [loadSaved]);
  const saveView = async (name: string) => { const r = await getSupabase()!.from("nx_saved_views").insert({ org_id: live.org?.org_id ?? null, kind: "view", page: path, name: name.trim().slice(0, 80), state: { view, q } }); if (r.error) toast({ text: /does not exist|schema cache/i.test(r.error.message) ? "Saved views are not set up on this database yet." : r.error.message, tone: "bad" }); else { toast({ text: `Saved “${name.trim()}”.`, tone: "ok" }); loadSaved(); } };
  const removeView = async (id: string) => { await getSupabase()!.from("nx_saved_views").delete().eq("id", id); loadSaved(); };
  const pin = async (label: string, href: string) => { const r = await getSupabase()!.from("nx_saved_views").insert({ org_id: live.org?.org_id ?? null, kind: "pin", page: href, name: label.slice(0, 80) }); if (r.error) toast({ text: /does not exist|schema cache/i.test(r.error.message) ? "Pins are not set up on this database yet." : r.error.message, tone: "bad" }); else { toast({ text: `Pinned ${label} to the sidebar.`, tone: "ok" }); window.dispatchEvent(new Event("nx:pins")); } };
  const calm = useReducedMotion();
  const cols = columns.map((c) => c.width).join(" ");
  const shown = useMemo(() => { const v = views.find((x) => x.id === view) ?? views[0]; const n = q.trim().toLowerCase(); const out = rows.filter((r) => v.test(r) && (!n || !search || search(r).toLowerCase().includes(n))); return sort ? [...out].sort(sort) : out; }, [rows, views, view, q, search, sort]);
  const open = rows.find((r) => rowKey(r) === openId) ?? null;
  const p = open ? preview(open) : null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  return (
    <Shell ws={ws} crumb={crumb}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head">
          <div>{eyebrow ? <p className="nx-eyebrow">{eyebrow}{sample ? <Sample /> : null}</p> : null}<h1 className="nx-h1">{title}{sample && !eyebrow ? <Sample /> : null}</h1><p className="nx-sub">{sub}</p></div>
          {action}
        </div>
        <div className="nx-bar">
          {views.length > 1 ? <div className="nx-views" role="tablist" aria-label="Views">
            {views.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId={`nx-lp-${title}`} className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{rows.filter(v.test).length}</span></span></button>)}
          </div> : null}
          {saved.length ? <div className="nx-saved" aria-label="Saved views">{saved.map((v) => <span key={v.id} className={`nx-view is-saved ${v.state.view === view && (v.state.q ?? "") === q ? "is-on" : ""}`}><button type="button" onClick={() => { if (v.state.view && views.some((x) => x.id === v.state.view)) setView(v.state.view); setQ(v.state.q ?? ""); }}>{v.name}</button><button type="button" aria-label={`Remove saved view ${v.name}`} onClick={() => void removeView(v.id)}><X size={11} /></button></span>)}</div> : null}
          {search ? <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label={`Search ${title.toLowerCase()}`} /></label> : null}
          {live.org && !sample && (q.trim() || view !== views[0].id) ? <button type="button" className="nx-btn is-quiet is-sm nx-saveview" onClick={() => setNaming(views.find((x) => x.id === view)?.label + (q.trim() ? `: ${q.trim()}` : ""))}><Bookmark size={12} />Save view</button> : null}
        </div>
        {note ? <p className="nx-foot" role="status">{note}</p> : null}
        <div className="nx-table" role="table" aria-label={title}>
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: cols }}>{columns.map((c) => <span key={c.label} className={c.hideOnPhone ? "nx-hide-s" : undefined}>{c.label}</span>)}</div>
          {shown.map((r) => (
            <button key={rowKey(r)} type="button" role="row" className={`nx-tr ${openId === rowKey(r) ? "is-sel" : ""}`} style={{ gridTemplateColumns: cols }} onClick={() => setOpenId(rowKey(r))} aria-label={`Open ${rowLabel(r)}`}>
              {columns.map((c) => <span key={c.label} className={c.hideOnPhone ? "nx-hide-s" : undefined} style={{ minWidth: 0 }}>{c.render(r)}</span>)}
            </button>
          ))}
          {loading ? <p className="nx-sub" style={{ padding: "24px 0" }}>Reading…</p> : !shown.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{rows.length ? empty.filtered ?? "Nothing in this view" : empty.none}</b>{empty.hint && !rows.length ? <p style={{ marginTop: 4 }}>{empty.hint}</p> : rows.length ? <p style={{ marginTop: 4 }}>Choose another view or clear the search.</p> : null}</div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open && p ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={rowLabel(open)} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span>{rowLabel(open)}</span><span style={{ marginLeft: "auto" }} />{p.href && live.org && !sample ? <button type="button" className="nx-ib" aria-label={`Pin ${rowLabel(open)} to the sidebar`} title="Pin to the sidebar" onClick={() => void pin(rowLabel(open), p.href!)}><Pin size={15} /></button> : null}{p.href ? <Link href={p.href} className="nx-ib" aria-label={p.hrefLabel ?? "Open the full record"}><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{p.title}</h1>{p.sub ? <p>{p.sub}</p> : null}</div></div>
              {p.body}
              {p.href ? <><p style={{ marginTop: 18 }}><Link href={p.href} className="nx-btn is-quiet">{p.hrefLabel ?? "Open the full record"}</Link></p>{p.hrefNote ? <p className="nx-foot">{p.hrefNote}</p> : null}</> : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
      {naming !== null ? <Modal title="Save this view" onClose={() => setNaming(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setNaming(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!naming.trim()} onClick={() => { void saveView(naming); setNaming(null); }}>Save</button></>}>
        <Field label="Name" hint="Saved with your account. Only you see it."><input value={naming} maxLength={80} autoFocus onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && naming.trim()) { void saveView(naming); setNaming(null); } }} /></Field>
      </Modal> : null}
    </Shell>
  );
}
