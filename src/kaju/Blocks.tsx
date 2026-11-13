"use client";

/* What Kaju shows besides words, drawn by the app. Every block arrives as
   checked data (see sp3/ai/blocks.ts); nothing here renders markup or runs
   anything a model wrote. A block that fails the check is not drawn. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { fillBlanks, isBlock, type Blank, type Block } from "@/sp3/ai/blocks";
import "./blocks.css";

export function Blocks({ blocks, onSend, busy }: { blocks: unknown; onSend: (text: string) => void; busy: boolean }) {
  const list = useMemo(() => (Array.isArray(blocks) ? blocks.filter(isBlock).slice(0, 6) : []), [blocks]);
  if (!list.length) return null;
  return <div className="kb">{list.map((b, i) => <One key={i} b={b} onSend={onSend} busy={busy} />)}</div>;
}

function One({ b, onSend, busy }: { b: Block; onSend: (t: string) => void; busy: boolean }) {
  switch (b.kind) {
    case "stats": return <Figure title={b.title}><dl className="kb-stats">{b.items.map((s, i) => <div key={i} data-tone={s.tone}><dt>{s.label}</dt><dd>{s.value}</dd>{s.note ? <small>{s.note}</small> : null}</div>)}</dl></Figure>;
    case "table": return (
      <Figure title={b.title}>
        <div className="kb-scroll"><table className="kb-table"><thead><tr>{b.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => <tr key={i}>{r.cells.map((c, k) => <td key={k}>{k === 0 && r.href ? <Link href={r.href}>{c}</Link> : c}</td>)}</tr>)}</tbody></table></div>
        {b.more ? <p className="kb-more">and {b.more.toLocaleString("en-IN")} more</p> : null}
      </Figure>);
    case "compare": return (
      <Figure title={b.title}>
        <div className="kb-scroll"><table className="kb-table is-compare"><thead><tr><td />{b.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => <tr key={i}><th scope="row">{r.label}</th>{r.values.map((v, k) => <td key={k}>{v}</td>)}</tr>)}</tbody></table></div>
      </Figure>);
    case "chart": return <Figure title={b.title}><Chart b={b} /></Figure>;
    case "timeline": return <Figure title={b.title}><ol className="kb-time">{b.items.map((t, i) => <li key={i}><time>{t.when}</time><span>{t.href ? <Link href={t.href}>{t.label}</Link> : <b>{t.label}</b>}{t.note ? <small>{t.note}</small> : null}</span></li>)}</ol></Figure>;
    case "records": return <Figure title={b.title}><ul className="kb-recs">{b.items.map((r, i) => <li key={i}><Link href={r.href}><span><b>{r.label}</b>{r.meta ? <small>{r.meta}</small> : null}</span>{r.tag ? <i>{r.tag}</i> : null}<ArrowRight size={14} aria-hidden /></Link></li>)}</ul></Figure>;
    case "places": return <Figure title={b.title}><Places b={b} /></Figure>;
    case "blanks": return <Blanks b={b} onSend={onSend} busy={busy} />;
  }
}

function Figure({ title, children }: { title?: string; children: React.ReactNode }) {
  return <figure className="kb-fig">{title ? <figcaption>{title}</figcaption> : null}{children}</figure>;
}

/* One series, one colour, values labelled directly: a chart small enough to read in a conversation. */
function Chart({ b }: { b: Extract<Block, { kind: "chart" }> }) {
  const max = Math.max(1, ...b.points.map((p) => p.value));
  const W = 320, H = 120, n = b.points.length;
  const label = `${b.form === "bar" ? "Bar" : "Line"} chart${b.unit ? ` of ${b.unit}` : ""}: ${b.points.map((p) => `${p.label} ${p.value.toLocaleString("en-IN")}`).join(", ")}`;
  if (b.form === "bar" && n <= 8) return (
    <ul className="kb-bars" aria-label={label}>{b.points.map((p, i) => <li key={i}><span>{p.label}</span><i style={{ ["--v" as string]: `${(p.value / max) * 100}%` }} aria-hidden /><b>{p.value.toLocaleString("en-IN")}</b></li>)}</ul>);
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - 8) + 4), y = (v: number) => H - 4 - (v / max) * (H - 16);
  const top = b.points.reduce((a, p, i) => (p.value > b.points[a].value ? i : a), 0);
  return (
    <div className="kb-line">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
        <line x1="0" x2={W} y1={H - 4} y2={H - 4} className="kb-axis" />
        {b.form === "bar" ? b.points.map((p, i) => <rect key={i} x={x(i) - Math.max(1, (W / n) * 0.3)} width={Math.max(2, (W / n) * 0.6)} y={y(p.value)} height={H - 4 - y(p.value)} rx="1" className="kb-bar" />)
          : <polyline points={b.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} className="kb-path" />}
        {b.form === "line" ? <circle cx={x(top)} cy={y(b.points[top].value)} r="3" className="kb-dot" /> : null}
      </svg>
      <p><span>{b.points[0].label}</span><b>Highest: {b.points[top].value.toLocaleString("en-IN")}{b.unit ? ` ${b.unit}` : ""} ({b.points[top].label})</b><span>{b.points[n - 1].label}</span></p>
    </div>);
}

/* Where the places sit relative to each other. It is not a street map and says so; each place is also listed. */
function Places({ b }: { b: Extract<Block, { kind: "places" }> }) {
  const lats = b.points.map((p) => p.lat), lngs = b.points.map((p) => p.lng);
  const [a, c, d, e] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const max = Math.max(1, ...b.points.map((p) => p.value ?? 1));
  return (
    <div className="kb-places">
      {b.points.length > 1 ? <svg viewBox="0 0 200 120" role="img" aria-label={`${b.points.length} places, positioned relative to each other`}>{b.points.map((p, i) => <circle key={i} cx={10 + ((p.lng - d) / Math.max(1e-6, e - d)) * 180} cy={110 - ((p.lat - a) / Math.max(1e-6, c - a)) * 100} r={3 + ((p.value ?? 1) / max) * 5} className="kb-pin" />)}</svg> : null}
      <ul>{b.points.slice(0, 8).map((p, i) => <li key={i}><b>{p.label}</b>{p.value !== undefined ? <i>{p.value.toLocaleString("en-IN")}</i> : null}{p.note ? <small>{p.note}</small> : null}</li>)}</ul>
      {b.points.length > 1 ? <p className="kb-more">Positions are relative to each other, not a street map.</p> : null}
    </div>);
}

/* A sentence with blanks. Each blank opens the control that fits it; when the last one is filled the finished sentence goes back as the next request. */
function Blanks({ b, onSend, busy }: { b: Extract<Block, { kind: "blanks" }>; onSend: (t: string) => void; busy: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(b.blanks.filter((x) => x.value).map((x) => [x.id, x.value!])));
  const [open, setOpen] = useState<string | null>(() => b.blanks.find((x) => !x.value)?.id ?? null);
  const [sent, setSent] = useState(false);
  const touched = useRef(false);
  const left = b.blanks.filter((x) => !values[x.id]).length;
  const go = () => { if (sent || busy || left) return; setSent(true); onSend(fillBlanks(b, values)); };
  /* The person filled the last blank themselves: go on without another press. Blanks that arrived already filled wait for one. */
  useEffect(() => { if (!left && touched.current && !sent && !busy) { const t = window.setTimeout(go, 500); return () => window.clearTimeout(t); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, values]);
  const set = (id: string, v: string, close = true) => { touched.current = true; setValues((cur) => ({ ...cur, [id]: v })); if (close) setOpen(b.blanks.find((x) => x.id !== id && !values[x.id])?.id ?? null); };
  const cur = b.blanks.find((x) => x.id === open) ?? null;
  const count = ["", "the blank", "the two blanks", "the three blanks", "the four blanks", "the five blanks"][left] ?? "the blanks";
  return (
    <div className={`kb-blanks${sent ? " is-sent" : ""}`} role="group" aria-label="Fill in the blanks">
      {b.lead ? <p className="kb-lead">{b.lead}</p> : null}
      <p className="kb-sentence">{b.parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p}</span>;
        const x = b.blanks.find((y) => y.id === p.blank)!; const v = values[x.id];
        return <button key={i} type="button" className={`kb-blank${v ? " is-filled" : ""}`} aria-expanded={open === x.id} aria-label={v ? `${x.label}: ${v}. Change` : `Choose ${x.label}`} disabled={sent} onClick={() => setOpen(open === x.id ? null : x.id)}>{v || x.label}</button>;
      })}</p>
      {cur && !sent ? <Control key={cur.id} blank={cur} value={values[cur.id] ?? ""} onSet={(v, close) => set(cur.id, v, close)} /> : null}
      <p className="kb-foot" aria-live="polite">
        {sent ? <><Check size={14} aria-hidden /> Sent</> : left ? <>Fill in {count} and I will go on.</> : <button type="button" className="kb-go" onClick={go} disabled={busy}>Go on<ArrowRight size={14} aria-hidden /></button>}
        {b.note && !sent ? <small>{b.note}</small> : null}
      </p>
    </div>);
}

function Control({ blank, value, onSet }: { blank: Blank; value: string; onSet: (v: string, close?: boolean) => void }) {
  const [draft, setDraft] = useState(value || (blank.control === "range" ? String(blank.min ?? 0) : ""));
  const picked = useMemo(() => new Set(value ? value.split(", ") : []), [value]);
  if (blank.control === "choice") return <div className="kb-ctl" role="radiogroup" aria-label={blank.label}>{blank.options!.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onSet(o)}>{o}{value === o ? <Check size={14} aria-hidden /> : null}</button>)}</div>;
  if (blank.control === "multi") return (
    <div className="kb-ctl" role="group" aria-label={blank.label}>
      {blank.options!.map((o) => <button key={o} type="button" aria-pressed={picked.has(o)} onClick={() => { const n = new Set(picked); if (n.has(o)) n.delete(o); else n.add(o); onSet(blank.options!.filter((x) => n.has(x)).join(", "), false); }}>{o}</button>)}
      <button type="button" className="is-done" disabled={!picked.size} onClick={() => onSet(value)}>Done</button>
    </div>);
  if (blank.control === "range") return (
    <div className="kb-ctl is-range">
      <label><span>{blank.label}</span><input type="range" min={blank.min} max={blank.max} step={blank.step ?? 1} value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
      <b>{draft}{blank.unit ? ` ${blank.unit}` : ""}</b>
      <button type="button" className="is-done" onClick={() => onSet(`${draft}${blank.unit ? ` ${blank.unit}` : ""}`)}>Use this</button>
    </div>);
  return (
    <form className="kb-ctl is-text" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onSet(draft.trim().slice(0, 200)); }}>
      <label><span className="sr-only">{blank.label}</span><input type={blank.control === "date" ? "date" : "text"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={blank.label} maxLength={200} autoFocus /></label>
      <button type="submit" className="is-done" disabled={!draft.trim()}>Use this</button>
    </form>);
}
