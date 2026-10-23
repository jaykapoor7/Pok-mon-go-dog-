"use client";

/* Trust console · the shared pieces: the record table, the inspector,
   honest read states, the receipt line, veiled photographs. */

import { useEffect, useState, type ReactNode } from "react";
import { Mail, Phone, X } from "lucide-react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { Ack, State } from "../../ui";
import { clock, type Read, type Receipt } from "./api";

/* ── the record table ─────────────────────────────────────────────── */
export type Col<T> = { key: string; head: string; cell: (row: T) => ReactNode; primary?: boolean; className?: string };

export function Table<T extends { id: string }>({ label, rows, cols, selected, onSelect, rowClass }: {
  label: string; rows: T[]; cols: Col<T>[]; selected: string | null; onSelect: (id: string) => void; rowClass?: (row: T) => string | undefined;
}) {
  return (
    <div className="cn-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="cn-table">
        <thead><tr>{cols.map((c) => <th key={c.key} scope="col" className={c.className}>{c.head}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} aria-selected={selected === r.id} className={rowClass?.(r)} onClick={() => onSelect(r.id)}>
              {cols.map((c) => c.primary
                ? <th key={c.key} scope="row" className={c.className}><button type="button" className="cn-open" onClick={(e) => { e.stopPropagation(); onSelect(r.id); }}>{c.cell(r)}</button></th>
                : <td key={c.key} className={c.className}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── honest read states ───────────────────────────────────────────── */
/** Renders the read's state when there is nothing to show yet; otherwise the children. */
export function Readout<T>({ read, what, onRetry, children }: { read: Read<T> | undefined; what: string; onRetry: () => void; children: (data: T) => ReactNode }) {
  if (!read || (read.state === "reading" && read.data === undefined)) {
    return <div className="cn-reading" role="status" aria-label={`Reading ${what}`}><span className="skel" /><span className="skel" /><span className="skel" /></div>;
  }
  if (read.state === "failed" && read.data === undefined) {
    return (
      <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={onRetry}>Read again</button>}>
        <p>The {what} could not be read{read.status ? ` (the server answered ${read.status})` : ""}. This is not the same as there being none.</p>
        <p className="mono small">{read.error}</p>
      </State>
    );
  }
  return <>{children(read.data as T)}</>;
}

/* ── the receipt line ─────────────────────────────────────────────── */
export type Pending = Receipt | "pending" | null;
export function ReceiptLine({ r }: { r: Pending }) {
  return (
    <div className="cn-receipt" aria-live="polite">
      {r === "pending" ? <Ack state="pending">Sending to the server…</Ack>
        : r?.ok ? <Ack state="saved">{r.what} · server answered {clock(r.at)}</Ack>
        : r ? <Ack state="failed">{r.error}</Ack> : null}
    </div>
  );
}
export function useReceipt() { return useState<Pending>(null); }

/* ── a section's working area: list on the left, inspector on the right ── */
export function Pane({ tools, receipt, inspector, idle, children }: { tools?: ReactNode; receipt: Pending; inspector: ReactNode | null; idle: string; children: ReactNode }) {
  return (
    <div className={`cn-pane${inspector ? " has-insp" : ""}`}>
      <div className="cn-list">
        {tools && <div className="cn-tools">{tools}</div>}
        <ReceiptLine r={receipt} />
        {children}
      </div>
      {inspector ?? <aside className="cn-insp is-idle" aria-label="Record inspector"><p className="k">Inspector</p><p className="small">{idle}</p></aside>}
    </div>
  );
}

/* ── the inspector ────────────────────────────────────────────────── */
export function Inspector({ kicker, title, onClose, children }: { kicker: string; title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <aside className="cn-insp" aria-label="Record inspector">
      <header className="cn-insp-head">
        <div><p className="k">{kicker}</p><h3 className="serif">{title}</h3></div>
        <button type="button" className="icon-btn cn-close" onClick={onClose} aria-label="Close the inspector"><X size={18} aria-hidden /></button>
      </header>
      <div className="cn-insp-body">{children}</div>
    </aside>
  );
}

/** A ledger row only when there is something to show; unknown is said, not hidden as "no". */
export function Line({ k, children }: { k: string; children: ReactNode }) {
  return <div><dt>{k}</dt><dd>{children}</dd></div>;
}

/* ── small cells ──────────────────────────────────────────────────── */
export function YesNo({ v, yes = "Yes", no = "No" }: { v: boolean | null | undefined; yes?: string; no?: string }) {
  if (v === null || v === undefined) return <span className="cn-unk">Not recorded</span>;
  return v ? <span className="cn-yes">{yes}</span> : <span className="cn-no">{no}</span>;
}

export function Contact({ value }: { value: string }) {
  const email = value.includes("@");
  return (
    <a className="link cn-contact" href={email ? `mailto:${value}` : `tel:${value.replace(/\s+/g, "")}`} onClick={(e) => e.stopPropagation()}>
      {email ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}{value}
    </a>
  );
}

/** A photograph that may show injury stays behind the shared SensitiveVeil. */
export function Photo({ src, sensitive, alt, size = "m" }: { src: string | null; sensitive: boolean; alt: string; size?: "s" | "m" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <div className={`cn-photo is-${size} is-none`} role="img" aria-label="No photograph recorded"><span>No photograph</span></div>;
  return (
    <div className={`cn-photo is-${size}`}>
      <SensitiveVeil sensitive={sensitive} id={src} compact={size === "s"}>
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </SensitiveVeil>
    </div>
  );
}

/** A destructive action asks once more, in place, before it is sent. */
export function Confirm({ label, confirm, busy, onConfirm }: { label: string; confirm: string; busy: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button type="button" className="btn is-s cn-danger" disabled={busy} onClick={() => setArmed(true)}>{label}</button>;
  return (
    <div className="cn-confirm" role="group" aria-label={label}>
      <p className="small">{confirm}</p>
      <div className="row" style={{ ["--g" as string]: "8px" }}>
        <button type="button" className="btn is-s is-flame" disabled={busy} onClick={() => { setArmed(false); onConfirm(); }}>Yes, {label.toLowerCase()}</button>
        <button type="button" className="btn is-s" onClick={() => setArmed(false)}>Keep it</button>
      </div>
    </div>
  );
}

/** A filter chip row with counts that are only shown once read. */
export function Filters<K extends string>({ label, value, options, onChange }: { label: string; value: K; options: { key: K; label: string; n?: number }[]; onChange: (k: K) => void }) {
  return (
    <div className="cn-filters" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" className="chip" aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}{o.n !== undefined && <span className="n">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="search cn-search">
      <span className="sr">{placeholder}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

/** Shown when a filter leaves nothing, as distinct from a section that holds nothing. */
export function NoneMatch({ onClear }: { onClear?: () => void }) {
  return <State title="Nothing matches this filter" action={onClear ? <button type="button" className="btn is-s" onClick={onClear}>Show everything</button> : undefined}><p>The records were read; none of them fit what is selected above.</p></State>;
}

export const lower = (s: string | null | undefined) => (s ?? "").toLowerCase();
