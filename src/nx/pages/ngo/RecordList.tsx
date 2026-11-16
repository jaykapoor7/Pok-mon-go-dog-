"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Search, X } from "lucide-react";
import { Check, Sample } from "../../ui";
import { Failed, Skeleton } from "../../kit";
import "../../css/ngo-records.css";

/* One list of records: views that narrow it, search, a table and a drawer that previews a row. Like ListPage, but it
   sits inside a page (so a page can put tabs above it), it can let the database do the filtering, and the keyboard
   works as in the classic queue: j and k move between rows, Enter opens one, o opens its full record, Esc closes. */
export type RCol<R> = { label: string; width: string; render: (r: R) => ReactNode; hideOnPhone?: boolean };
export type RView<R> = { id: string; label: string; test?: (r: R) => boolean; count?: number | null };
export type RPreview = { title: ReactNode; sub?: ReactNode; body: ReactNode; href?: string; hrefLabel?: string };

export function RecordList<R>({ title, sub, eyebrow, action, sample, views, view: viewIn, onView, rows, rowKey, rowLabel, columns, search, query, onQuery, placeholder = "Search",
  tools, above, preview, loading, error, onRetry, empty, select, foot, hrefOf, id = "rl", serverSide, replace }: {
  title: string; sub: ReactNode; eyebrow?: ReactNode; action?: ReactNode; sample: boolean;
  views: RView<R>[]; view?: string; onView?: (id: string) => void; rows: R[]; rowKey: (r: R) => string; rowLabel: (r: R) => string; columns: RCol<R>[];
  search?: (r: R) => string; query?: string; onQuery?: (q: string) => void; placeholder?: string;
  tools?: ReactNode; above?: ReactNode; preview: (r: R, close: () => void) => RPreview; loading: boolean; error?: string | null; onRetry?: () => void;
  empty: { none: string; filtered?: string; hint?: ReactNode }; select?: { ids: Set<string>; toggle: (id: string) => void; label: (r: R) => string }; foot?: ReactNode; hrefOf?: (r: R) => string | undefined; id?: string;
  /** The rows are already the database's answer for the chosen view and search. */ serverSide?: boolean;
  /** Shown in place of the table (a map of the same records, say), under the same views, tools and search. */ replace?: ReactNode;
}) {
  const [viewOwn, setViewOwn] = useState(views[0]?.id ?? "");
  const view = viewIn ?? viewOwn;
  const setView = (v: string) => { if (onView) onView(v); else setViewOwn(v); };
  const [qOwn, setQOwn] = useState("");
  const q = query ?? qOwn;
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const cols = (select ? "28px " : "") + columns.map((c) => c.width).join(" ");
  const server = !!serverSide;
  const shown = useMemo(() => {
    if (server) return rows;
    const v = views.find((x) => x.id === view) ?? views[0]; const n = q.trim().toLowerCase();
    return rows.filter((r) => (!v?.test || v.test(r)) && (!n || !search || search(r).toLowerCase().includes(n)));
  }, [rows, views, view, q, search, server]);
  const open = rows.find((r) => rowKey(r) === openId) ?? null;
  const close = () => setOpenId(null);
  const p = open ? preview(open, close) : null;
  useEffect(() => { if (openId && !rows.some((r) => rowKey(r) === openId)) setOpenId(null); }, [rows, openId, rowKey]);

  /* The keyboard of the classic queue. Moving focus between row buttons means Enter opens natively. */
  const shownRef = useRef(shown); shownRef.current = shown;
  const openRef = useRef(openId); openRef.current = openId;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable=true], .nx-modal, .nx-cmd")) return;
      if (document.querySelector(".nx-modal, .nx-cmd-scrim")) return;
      if (e.key === "Escape") { if (openRef.current) { setOpenId(null); } return; }
      const list = shownRef.current; if (!list.length) return;
      const cur = t?.closest<HTMLElement>("[data-rk]")?.dataset.rk ?? openRef.current;
      const i = list.findIndex((r) => rowKey(r) === cur);
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const next = list[e.key === "j" ? Math.min(list.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)];
        const key = rowKey(next);
        box.current?.querySelector<HTMLElement>(`[data-rk="${CSS.escape(key)}"]`)?.focus();
        if (openRef.current) setOpenId(key);
      } else if (e.key === "o" && cur && hrefOf) { const r = list.find((x) => rowKey(x) === cur); const h = r && hrefOf(r); if (h) router.push(h); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [rowKey, hrefOf, router]);

  // A failed read with nothing read shows no counts, never zeros.
  const count = (v: RView<R>) => (error && !rows.length ? null : v.count !== undefined ? v.count : v.test ? rows.filter(v.test).length : null);
  return (
    <>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head">
          <div>{eyebrow ? <p className="nx-eyebrow">{eyebrow}{sample ? <Sample /> : null}</p> : null}<h1 className="nx-h1">{title}{sample && !eyebrow ? <Sample /> : null}</h1><p className="nx-sub">{sub}</p></div>
          {action}
        </div>
        {above}
        <div className="nx-bar">
          {views.length > 1 ? <div className="nx-views" role="tablist" aria-label="Views">
            {views.map((v) => { const n = count(v); return <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => { setView(v.id); setOpenId(null); }}>{view === v.id ? <motion.span layoutId={`nr-v-${id}`} className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}{n !== null && n !== undefined ? <span className="nx-count">{n}</span> : null}</span></button>; })}
          </div> : null}
          {tools}
          {search || onQuery ? <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => (onQuery ? onQuery(e.target.value) : setQOwn(e.target.value))} placeholder={placeholder} aria-label={`Search ${title.toLowerCase()}`} /></label> : null}
        </div>
        {replace ?? (error ? <Failed error={error} retry={onRetry} /> : (
          <div className="nx-table" role="group" aria-label={title} ref={box}>
            <div className="nx-tr nx-th" aria-hidden="true" style={{ gridTemplateColumns: cols }}>{select ? <span /> : null}{columns.map((c) => <span key={c.label} className={c.hideOnPhone ? "nx-hide-s" : undefined}>{c.label}</span>)}</div>
            {shown.map((r) => {
              const key = rowKey(r);
              const btn = (
                <button key={key} type="button" data-rk={key} className={`nx-tr ${openId === key ? "is-sel" : ""}`} style={{ gridTemplateColumns: select ? columns.map((c) => c.width).join(" ") : cols }} onClick={() => setOpenId(key)} aria-label={`Open ${rowLabel(r)}`}>
                  {columns.map((c) => <span key={c.label} className={c.hideOnPhone ? "nx-hide-s" : undefined} style={{ minWidth: 0 }}>{c.render(r)}</span>)}
                </button>
              );
              return select ? <div key={key} className={`nr-selrow ${select.ids.has(key) ? "is-picked" : ""}`}><Check done={select.ids.has(key)} onClick={() => select.toggle(key)} label={`${select.ids.has(key) ? "Unselect" : "Select"} ${select.label(r)}`} />{btn}</div> : btn;
            })}
            {loading ? <Skeleton rows={6} /> : !shown.length ? <div className="nr-none"><b>{rows.length || server ? empty.filtered ?? "Nothing in this view" : empty.none}</b>{!rows.length && !server && empty.hint ? <p>{empty.hint}</p> : rows.length || server ? <p>{server && !rows.length && empty.hint ? empty.hint : "Choose another view or clear the search."}</p> : null}</div> : null}
          </div>
        ))}
        {replace ? null : foot}
        {shown.length > 1 && !sample && !replace ? <p className="nr-keys nx-hide-s" aria-hidden><kbd>j</kbd><kbd>k</kbd> move · <kbd>Enter</kbd> open{hrefOf ? <> · <kbd>o</kbd> full record</> : null} · <kbd>Esc</kbd> close</p> : null}
      </div>
      <AnimatePresence>
        {open && p ? (
          <motion.aside key="d" className="nx-drawer nr-drawer" role="dialog" aria-label={rowLabel(open)} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span>{rowLabel(open)}</span><span style={{ marginLeft: "auto" }} />{p.href ? <Link href={p.href} className="nx-ib" aria-label={p.hrefLabel ?? "Open the full record"}><Maximize2 size={15} /></Link> : null}<button type="button" className="nx-ib" onClick={close} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><div><h1>{p.title}</h1>{p.sub ? <p>{p.sub}</p> : null}</div></div>
              {p.body}
              {p.href ? <p style={{ marginTop: 18 }}><Link href={p.href} className="nx-btn is-quiet">{p.hrefLabel ?? "Open the full record"}</Link></p> : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
