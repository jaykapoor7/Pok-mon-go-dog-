"use client";

/* The few components every One Health screen is built from. */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { showCount, type Count } from "./data";

export function Head({ eyebrow, title, lede, actions }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="oh-head">
      <div>
        {eyebrow ? <p className="oh-eyebrow">{eyebrow}</p> : null}
        <h1 className="oh-title">{title}</h1>
        {lede ? <p className="oh-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="oh-actions">{actions}</div> : null}
    </header>
  );
}

export function Chip({ tone, children, plain }: { tone?: string; children: ReactNode; plain?: boolean }) {
  return <span className={`oh-chip${plain ? " plain" : ""}`} data-tone={tone || undefined}>{children}</span>;
}

/** A count that opens what it counts. Unknown is shown as "Not read", never zero. */
export function Stat({ label, value, note, href, tone, suffix }: { label: string; value: Count | string | undefined; note?: ReactNode; href?: string; tone?: string; suffix?: string }) {
  const unknown = value === null || value === undefined;
  const shown = typeof value === "string" && value !== "<5" ? value : showCount(value as Count);
  const body = (
    <>
      <dt>{label}</dt>
      <dd className={unknown || value === "<5" ? "oh-unknown" : undefined}>{shown}{!unknown && suffix ? <small>{suffix}</small> : null}</dd>
      {note ? <p>{note}</p> : null}
    </>
  );
  return href ? <Link className="oh-stat" href={href} data-tone={tone}>{body}</Link> : <div className="oh-stat" data-tone={tone}>{body}</div>;
}

export function Section({ title, note, action, children, id }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="oh-sec" aria-labelledby={id}>
      <div className="oh-sec-head"><h2 id={id}>{title}</h2>{note ? <p>{note}</p> : null}{action}</div>
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="oh-empty"><b>{title}</b>{children}</div>;
}

export function Failed({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="oh-error" role="alert">{error} {retry ? <button type="button" className="oh-btn quiet small" onClick={retry}>Try again</button> : null}</div>;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return <div aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="oh-skel" />)}</div>;
}

export function Seg<T extends string>({ name, value, options, onChange, disabled }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="oh-seg" role="radiogroup">
      {options.map(([v, label]) => (
        <label key={v}><input type="radio" name={name} value={v} checked={value === v} disabled={disabled} onChange={() => onChange(v)} /><span>{label}</span></label>
      ))}
    </div>
  );
}

export function Sheet({ title, note, onClose, children, foot }: { title: string; note?: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([aria-label='Close'])");
    first?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="oh-scrim" onClick={onClose} aria-hidden />
      <div className="oh-sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="oh-sheet-head"><div><h2>{title}</h2>{note ? <p>{note}</p> : null}</div><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="oh-sheet-body">{children}</div>
        {foot ? <div className="oh-sheet-foot">{foot}</div> : null}
      </div>
    </>
  );
}

/* One toast at a time: what happened, in a sentence. */
const ToastCtx = createContext<(text: string, tone?: "flame") => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ text: string; tone?: string } | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback((text: string, tone?: "flame") => { setT({ text, tone }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setT(null), 3600); }, []);
  return <ToastCtx.Provider value={show}>{children}{t ? <div className="oh-toast" role="status" data-tone={t.tone}>{t.text}</div> : null}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/** A ward chart: one bar per period; suppressed counts are drawn hatched and labelled. */
export function Bars({ points, label }: { points: { x: string; n: Count }[]; label: string }) {
  const max = Math.max(5, ...points.map((p) => (typeof p.n === "number" ? p.n : 4)));
  if (!points.length) return <Empty title="Nothing recorded in this period" />;
  return (
    <figure aria-label={label}>
      <div className="oh-chart">
        {points.map((p) => {
          const supp = p.n === "<5", v = typeof p.n === "number" ? p.n : supp ? 4 : 0;
          return <div key={p.x} title={`${p.x}: ${showCount(p.n)}`}><em>{supp ? "<5" : v}</em><i className={supp ? "supp" : undefined} style={{ height: `${Math.max(3, (v / max) * 100)}%` }} /></div>;
        })}
      </div>
      <div className="oh-chart-x" aria-hidden>{points.map((p) => <span key={p.x}>{p.x}</span>)}</div>
    </figure>
  );
}
