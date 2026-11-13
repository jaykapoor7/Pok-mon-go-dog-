"use client";

/* Small parts the animal and report pages share that the page kit does not have:
   one screen of a list at a time (so a long queue never becomes a long scroll),
   and a table whose rows open in place to show the rest of a record. */

import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Btn, type Col } from "@/ws/kit";
import "./parts.k.css";

export function pageOf<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const pg = Math.min(Math.max(0, page), pages - 1);
  return { pg, pages, slice: items.slice(pg * size, pg * size + size) };
}

export function Pager({ pg, pages, total, size, onPage }: { pg: number; pages: number; total: number; size: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="kx-pager">
      <Btn small disabled={pg === 0} onClick={() => onPage(pg - 1)}>Previous</Btn>
      <span aria-live="polite">{(pg * size + 1).toLocaleString("en-IN")}–{Math.min(total, (pg + 1) * size).toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}</span>
      <Btn small disabled={pg + 1 >= pages} onClick={() => onPage(pg + 1)}>Next</Btn>
    </div>
  );
}

/** Grey lines where rows will be, while a list is read. */
export function SkelRows({ n = 6, label }: { n?: number; label: string }) {
  return <div className="kx-skel" role="status" aria-label={label}>{Array.from({ length: n }, (_, i) => <i key={i} />)}</div>;
}

/** The kit's table, with rows that open in place: the row says what the record is, the opened part holds the rest. */
export function FoldTable<R>({ cols, rows, rowKey, label, open, onOpen, detail }: { cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string; label: string; open: string | null; onOpen: (key: string | null) => void; detail: (r: R) => ReactNode }) {
  const track = (c: Col<R>) => c.width ?? "minmax(0, 1fr)";
  const tracks = `${cols.map(track).join(" ")} 16px`;
  const phone = `${cols.filter((c, i) => i === 0 || c.keep).map(track).join(" ")} 16px`;
  return (
    <div className="k-table" role="table" aria-label={label} style={{ ["--k-cols" as string]: tracks, ["--k-cols-s" as string]: phone } as CSSProperties}>
      <div className="k-tr k-th" role="row">{cols.map((c, i) => <span key={c.key} role="columnheader" className={`${c.align === "end" ? "is-end" : ""}${i === 0 || c.keep ? "" : " is-wide"}`}>{c.label}</span>)}<span aria-hidden /></div>
      {rows.map((r) => {
        const k = rowKey(r), on = open === k;
        const toggle = (e: { target: EventTarget }) => { if ((e.target as HTMLElement).closest("a, button, select, input, textarea, label")) return; onOpen(on ? null : k); };
        return (
          <div key={k} className="kx-fold-g" role="rowgroup">
            <div className="k-tr is-click" role="row" tabIndex={0} aria-expanded={on} onClick={toggle} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(on ? null : k); } }}>
              {cols.map((c, i) => <span key={c.key} role="cell" className={`${c.align === "end" ? "is-end" : ""}${i === 0 ? " k-td-main" : ""}${i === 0 || c.keep ? "" : " is-wide"}`}>{c.render(r)}</span>)}
              <span role="cell" className="kx-fold-c"><ChevronRight size={14} aria-hidden /></span>
            </div>
            {on ? <div className="kx-fold-x" role="row"><div role="cell">{detail(r)}</div></div> : null}
          </div>
        );
      })}
    </div>
  );
}
