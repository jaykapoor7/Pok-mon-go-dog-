"use client";

/* The few components every programme screen is built from. */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Building2, Check, Gauge, GraduationCap, HeartPulse, Home, Landmark, Microscope, PawPrint, Stethoscope, X } from "lucide-react";
import { call, fmtTime, showCount, ALERT_KIND, type Alert, type Count, type Kind } from "./data";
import "./oh.css";

/** Every programme page: one scope for the styles, toasts, and an honest
    strip whenever the records shown are invented for a demonstration. */
export function Page({ children, illustrative, wide }: { children: ReactNode; illustrative?: boolean; wide?: boolean }) {
  return (
    <div className="oh">
      <div className={`oh-page${wide ? " wide" : ""}`}>
        {illustrative ? <p className="oh-demo" role="note"><b>Illustrative demonstration.</b> Every record here is invented; no figure is a real programme figure.</p> : null}
        {children}
      </div>
    </div>
  );
}

const KIND_ICON: Record<Kind, typeof Home> = { state: Landmark, coordinator: Gauge, municipal: Building2, hospital: Stethoscope, clinic: HeartPulse, laboratory: Microscope, ngo: PawPrint, research: Activity, training: GraduationCap };
export function Glyph({ kind, size = 16 }: { kind: Kind; size?: number }) { const I = KIND_ICON[kind] ?? Home; return <span className="oh-glyph" data-kind={kind}><I size={size} aria-hidden /></span>; }

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

/** A figure that appears at its true value and travels only when it changes. */
export function Num({ v }: { v: number }) {
  const [shown, setShown] = useState(v);
  const prev = useRef(v);
  useEffect(() => {
    const from = prev.current; prev.current = v;
    if (from === v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(v); return; }
    let raf = 0; const t0 = performance.now(), d = 520;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); setShown(Math.round(from + (v - from) * e)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <>{shown.toLocaleString("en-IN")}</>;
}

/** A count that opens what it counts. Unknown is "Not read", never zero. */
export function Stat({ label, value, note, href, tone, suffix }: { label: string; value: Count | string | undefined; note?: ReactNode; href?: string; tone?: string; suffix?: string }) {
  const unknown = value === null || value === undefined;
  const shown = typeof value === "string" && value !== "<5" ? value : showCount(value as Count);
  const body = (
    <>
      <dt>{label}</dt>
      <dd className={unknown || value === "<5" ? "oh-unknown" : undefined}>{typeof value === "number" ? <Num v={value} /> : shown}{!unknown && suffix ? <small>{suffix}</small> : null}</dd>
      {note ? <p>{note}</p> : null}
    </>
  );
  return href ? <Link className="oh-stat" href={href} data-tone={tone}>{body}</Link> : <div className="oh-stat" data-tone={tone}>{body}</div>;
}

export function Section({ title, note, action, children, id }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  const hid = id ?? `s-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="oh-sec" aria-labelledby={hid}>
      <div className="oh-sec-head"><h2 id={hid}>{title}</h2>{note ? <p>{note}</p> : null}{action}</div>
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

export function Seg<T extends string>({ name, value, options, onChange, disabled, label }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean; label?: string }) {
  return (
    <div className="oh-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <label key={v}><input type="radio" name={name} value={v} checked={value === v} disabled={disabled} onChange={() => onChange(v)} /><span>{l}</span></label>
      ))}
    </div>
  );
}

export function Sheet({ title, note, onClose, children, foot }: { title: string; note?: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([aria-label='Close'])")?.focus();
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
  return <ToastCtx.Provider value={show}>{children}<div className="oh" aria-live="polite">{t ? <div className="oh-toast" role="status" data-tone={t.tone} key={t.text}>{t.tone ? null : <Check size={15} aria-hidden />}{t.text}</div> : null}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/** Bars from real counts; suppressed counts are hatched and labelled. */
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

/** Alerts as decisions: what happened, where, the record it came from, and
    an acknowledgement that names who saw it. Nothing is decided for anyone. */
export function AlertList({ alerts, programmeId, onChange, canAck, hrefFor, limit }: { alerts: Alert[]; programmeId: string; onChange: () => void; canAck: boolean; hrefFor?: (a: Alert) => string | null; limit?: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const shown = limit ? alerts.slice(0, limit * 3) : alerts;
  if (!alerts.length) return <Empty title="Nothing needs a decision">No confirmed cases, gaps in treatment readiness or overdue work right now.</Empty>;
  const ack = async (a: Alert) => {
    setBusy(a.key);
    const r = await call("oh_ack_alert", { p_programme: programmeId, p_key: a.key, p_note: null });
    setBusy(null);
    if (r.error) toast(r.error, "flame"); else { toast("Marked as seen. Partners can see who acknowledged it."); onChange(); }
  };
  /* Same kind, several places: one decision with the places inside it. */
  const GROUP: Record<string, (n: number) => string> = {
    doses_overdue: (n) => `Doses past the date set at ${n} facilities`,
    coverage_below_target: (n) => `Vaccination below target in ${n} areas`,
    followups_overdue: (n) => `Follow-ups overdue at ${n} partners`,
    sample_waiting: (n) => `${n} samples waiting more than three days`,
    courses_completed: (n) => `Courses completed at ${n} facilities`,
    revaccination_due: (n) => `Dogs due for revaccination at ${n} partners`,
  };
  const rows: (Alert | { group: string; items: Alert[] })[] = [];
  for (const a of shown) {
    if (GROUP[a.kind] && shown.filter((x) => x.kind === a.kind).length > 1) {
      const g = rows.find((r) => "group" in r && r.group === a.kind) as { group: string; items: Alert[] } | undefined;
      if (g) g.items.push(a); else rows.push({ group: a.kind, items: [a] });
    } else rows.push(a);
  }
  return (
    <div className="oh-alerts" role="list">
      {rows.map((r) => {
        if ("group" in r) {
          const sev = r.items[0].severity, acked = r.items.every((x) => x.ack);
          return (
            <details key={r.group} className="oh-alert-group" role="listitem">
              <summary className="oh-alert" data-sev={sev} data-acked={acked ? "true" : undefined}>
                <i aria-hidden />
                <div><b>{GROUP[r.group](r.items.length)}</b><p>{r.items[0].detail}</p><small>{ALERT_KIND[r.group] ?? r.group} · show places</small></div>
                <div className="oh-alert-act">{hrefFor?.(r.items[0]) ? <Link className="oh-btn small" href={hrefFor(r.items[0])!}>Open</Link> : null}</div>
              </summary>
              <ul className="oh-alert-more">
                {r.items.map((x) => <li key={x.key}><span>{x.title}</span>{canAck && !x.ack ? <button type="button" className="oh-btn quiet small" disabled={busy === x.key} onClick={() => void ack(x)}>Mark as seen</button> : x.ack ? <span style={{ color: "var(--muted)" }}>Seen by {x.ack.by}</span> : null}</li>)}
              </ul>
            </details>
          );
        }
        const a = r, href = hrefFor?.(a) ?? null;
        return (
          <div key={a.key} className="oh-alert" data-sev={a.severity} data-acked={a.ack ? "true" : undefined} role="listitem">
            <i aria-hidden />
            <div>
              <b>{a.title}</b>
              <p>{a.detail}</p>
              <small>{ALERT_KIND[a.kind] ?? a.kind}{a.area ? ` · ${a.area}` : ""}{a.ack ? ` · Seen by ${a.ack.by ?? "a partner"}, ${fmtTime(a.ack.at)}` : ""}</small>
            </div>
            <div className="oh-alert-act">
              {href ? <Link className="oh-btn small" href={href}>Open</Link> : null}
              {canAck && !a.ack ? <button type="button" className="oh-btn quiet small" disabled={busy === a.key} onClick={() => void ack(a)}>Mark as seen</button> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
