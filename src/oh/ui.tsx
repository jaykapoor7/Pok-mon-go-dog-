"use client";

/* The few components every programme screen is built from.

   They are the page kit (src/ws/kit) under the names and props these pages
   have always used, so a hospital, a laboratory and a programme cell look
   like every other page in the workspace. What the kit does not have lives
   here: a row that carries an action, a choice among a few answers, a
   dialog for a short form, toasts, and the list of decisions. */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Building2, Check, ChevronRight, Gauge, GraduationCap, HeartPulse, Home, Info, Landmark, Microscope, PawPrint, Siren, Stethoscope, TriangleAlert, X } from "lucide-react";
import { Btn, Empty as KEmpty, Head as KHead, More, Note, Page as KPage, Section as KSection, Stats, Tag, type Stat as KStat } from "@/ws/kit";
import { call, fmtTime, showCount, ALERT_KIND, type Alert, type Count, type Kind } from "./data";
import "./oh.css";

export type Tone = "flame" | "amber" | "green" | "blue" | "violet" | "teal" | "plain";
const TONES = new Set(["flame", "amber", "green", "blue", "violet", "teal"]);
/** The labels in data.ts name their tone as a word, and "" for none. */
export const toneOf = (t?: string | null): Tone => (t && TONES.has(t) ? (t as Tone) : "plain");

/** Every programme page: the kit's page, and an honest line whenever the records shown are invented for a
    demonstration and the frame above is not already saying so. `narrow` is for a form or a document. */
export function Page({ children, illustrative, wide, narrow }: { children: ReactNode; illustrative?: boolean; wide?: boolean; narrow?: boolean }) {
  return (
    <KPage width={narrow ? "narrow" : wide ? "wide" : "default"} className="oh">
      {illustrative ? <div className="oh-sample"><Note tone="amber"><b>Illustrative demonstration.</b> Every record here is invented; no figure is a real programme figure.</Note></div> : null}
      {children}
    </KPage>
  );
}

const KIND_ICON: Record<Kind, typeof Home> = { state: Landmark, coordinator: Gauge, municipal: Building2, hospital: Stethoscope, clinic: HeartPulse, laboratory: Microscope, ngo: PawPrint, research: Activity, training: GraduationCap };
const KIND_TONE: Partial<Record<Kind, Tone>> = { hospital: "teal", clinic: "teal", laboratory: "violet", ngo: "blue", research: "green", training: "amber" };
export function Glyph({ kind, size = 14 }: { kind: Kind; size?: number }) { const I = KIND_ICON[kind] ?? Home; return <span className="k-row-i oh-glyph" data-kind={kind} data-tone={KIND_TONE[kind]} aria-hidden><I size={size} /></span>; }

/** The page's name, one sentence on what matters now, and at most two actions. */
export function Head({ eyebrow, title, lede, actions }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return <div className="oh-head"><KHead eyebrow={eyebrow} title={title} sum={lede} actions={actions} /></div>;
}

/** A status, in the kit's tag. `plain` is kept for callers; no tag carries a dot now. */
export function Chip({ tone, children }: { tone?: string; children: ReactNode; plain?: boolean }) {
  return <Tag tone={toneOf(tone)}>{children}</Tag>;
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

type FigureOpts = { note?: ReactNode; href?: string; tone?: string; suffix?: string };
/** One figure for the kit's strip, from a count as the database returned it. Unknown is "Not read" and a count
    under the programme's threshold is "Fewer than 5": neither is ever drawn as a number, and never as zero. */
export function figure(label: string, value: Count | string | undefined, o: FigureOpts = {}): KStat {
  const unknown = value === null || value === undefined, quiet = unknown || value === "<5";
  const shown = typeof value === "number" ? <Num v={value} /> : typeof value === "string" && value !== "<5" ? value : showCount(value as Count);
  const tone = toneOf(o.tone);
  return { label, value: quiet ? <span className="oh-unknown">{shown}</span> : <>{shown}{o.suffix ? <small className="oh-suffix">{o.suffix}</small> : null}</>, note: o.note, href: o.href, tone: quiet || tone === "plain" ? undefined : tone };
}
/** A count that opens what it counts. Unknown is "Not read", never zero. */
export function Stat({ label, value, note, href, tone, suffix }: { label: string; value: Count | string | undefined } & FigureOpts) {
  return <Stats items={[figure(label, value, { note, href, tone, suffix })]} />;
}

/** A part of a page. `id` keeps an address inside the page; `fold` makes it foldable (see the kit). */
export function Section({ title, note, action, children, id, fold, open, count }: { title: string; note?: ReactNode; action?: ReactNode; children: ReactNode; id?: string; fold?: string; open?: boolean; count?: number | string | null }) {
  const sec = <KSection title={title} note={note} action={action} fold={fold} open={open} count={count}>{children}</KSection>;
  return id ? <div className="oh-anchor" id={id}>{sec}</div> : sec;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <KEmpty title={title}>{children}</KEmpty>;
}

/** A read or a save that failed: what went wrong, and a way to try again. Never a zero in its place. */
export function Failed({ error, retry }: { error: string; retry?: () => void }) {
  return <Note tone="flame" action={retry ? <Btn small onClick={retry}>Try again</Btn> : undefined}>{error}</Note>;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return <div className="oh-loading" role="status" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <i key={i} className="oh-skel" style={{ ["--w" as string]: `${72 - (i % 3) * 14}%` }} />)}</div>;
}

/** A choice among a few answers, all visible. */
export function Seg<T extends string>({ name, value, options, onChange, disabled, label }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean; label?: string }) {
  return (
    <div className="oh-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <label key={v}><input type="radio" name={name} value={v} checked={value === v} disabled={disabled} onChange={() => onChange(v)} /><span>{l}</span></label>
      ))}
    </div>
  );
}

/* ── rows that carry an action ────────────────────────────────────── */
/** A list of records as rows: what it is, one line about it, and the one thing to do. */
export function Rows({ children, label, id }: { children: ReactNode; label?: string; id?: string }) { return <ul className="k-rows oh-rows" aria-label={label} id={id}>{children}</ul>; }
/** One row. With `href` the name opens the record and the whole row is its target; the controls in `end` stay their own. */
export function Row({ href, icon, tone, title, meta, end, on }: { href?: string | null; icon?: ReactNode; tone?: Tone; title: ReactNode; meta?: ReactNode; end?: ReactNode; /** The row a map or a list beside it points at. */ on?: boolean }) {
  const text = <><b>{title}</b>{meta ? <small>{meta}</small> : null}</>;
  return (
    <li>
      <div className={`k-row oh-row${on ? " is-on" : ""}`}>
        {icon ? <span className="k-row-i" data-tone={tone} aria-hidden>{icon}</span> : null}
        {href ? <Link href={href} className="k-row-t oh-row-main oh-row-a">{text}</Link> : <span className="k-row-t oh-row-main">{text}</span>}
        {end ? <span className="k-row-e oh-row-meta">{end}</span> : null}
      </div>
    </li>
  );
}

/** A short form in a dialog: it opens over the page (or over a record in the peek), holds the focus, and closes
    with Escape, its Close button or a press outside it. */
export function Sheet({ title, note, onClose, children, foot }: { title: string; note?: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const prev = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>("input, select, textarea, button:not([aria-label='Close'])")?.focus();
    return () => { if (d.open) d.close(); prev?.focus?.(); };
  }, []);
  return (
    <dialog ref={ref} className="oh oh-sheet" aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="oh-sheet-head"><div><h2>{title}</h2>{note ? <p>{note}</p> : null}</div><button type="button" aria-label="Close" onClick={onClose}><X size={16} aria-hidden /></button></div>
      <div className="oh-sheet-body">{children}</div>
      {foot ? <div className="oh-sheet-foot">{foot}</div> : null}
    </dialog>
  );
}

/* One toast at a time: what happened, in a sentence. */
const ToastCtx = createContext<(text: string, tone?: "flame") => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ text: string; tone?: string } | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback((text: string, tone?: "flame") => { setT({ text, tone }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setT(null), 3600); }, []);
  return <ToastCtx.Provider value={show}>{children}<div className="oh" aria-live="polite">{t ? <div className="oh-toast" role="status" data-tone={t.tone} key={t.text}>{t.tone ? null : <Check size={14} aria-hidden />}{t.text}</div> : null}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/** Bars from real counts; suppressed counts are hatched and labelled. */
export function Bars({ points, label }: { points: { x: string; n: Count }[]; label: string }) {
  const max = Math.max(5, ...points.map((p) => (typeof p.n === "number" ? p.n : 4)));
  if (!points.length) return <Empty title="Nothing recorded in this period" />;
  return (
    <figure className="oh-bars" aria-label={label}>
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

/** A share of a whole as a thin bar, with a tick where the target is. */
export function Meter({ value, target, label }: { value: number; target?: number; label: string }) {
  const pc = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
  return <span className="oh-meter" role="img" aria-label={label}><i style={{ width: pc(value) }} />{target !== undefined ? <u style={{ left: pc(target) }} /> : null}</span>;
}

const SEV: Record<Alert["severity"], { tone: Tone; icon: typeof Siren }> = { urgent: { tone: "flame", icon: Siren }, attention: { tone: "amber", icon: TriangleAlert }, info: { tone: "blue", icon: Info } };

/** Alerts as decisions: what happened, where, the record it came from, and
    an acknowledgement that names who saw it. Nothing is decided for anyone. */
export function AlertList({ alerts, programmeId, onChange, canAck, hrefFor, limit }: { alerts: Alert[]; programmeId: string; onChange: () => void; canAck: boolean; hrefFor?: (a: Alert) => string | null; limit?: number }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
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
  /* Several confirmed samples from one area are one decision too: a cluster, with each sample inside. */
  const keyOf = (a: Alert) => (a.kind === "positive_result" ? `positive_result|${a.title}` : a.kind);
  type Group = { group: string; kind: string; items: Alert[] };
  const rows: (Alert | Group)[] = [];
  for (const a of alerts) {
    if ((a.kind === "positive_result" || GROUP[a.kind]) && alerts.filter((x) => keyOf(x) === keyOf(a)).length > 1) {
      const g = rows.find((r) => "group" in r && r.group === keyOf(a)) as Group | undefined;
      if (g) g.items.push(a); else rows.push({ group: keyOf(a), kind: a.kind, items: [a] });
    } else rows.push(a);
  }
  const seenBtn = (x: Alert) => canAck && !x.ack ? <Btn small variant="quiet" disabled={busy === x.key} onClick={() => void ack(x)}>Mark as seen</Btn> : null;
  return (
    <More items={rows} cap={limit ?? 200} noun="decisions">
      {(shown) => (
        <ul className="k-rows oh-rows oh-decide">
          {shown.map((r) => {
            if ("group" in r) {
              const sev = SEV[r.items[0].severity] ?? SEV.info, Icon = sev.icon, acked = r.items.every((x) => x.ack), cluster = r.kind === "positive_result";
              const first = r.items[0].detail, rest = first.split(". ").slice(1).join(". ");
              return (
                <li key={r.group}>
                  <details className="oh-alert-group">
                    {/* The summary only opens and closes the group; a link inside it would be a control inside a control. */}
                    <summary className="k-row oh-row oh-alert" data-sev={r.items[0].severity} data-acked={acked ? "true" : undefined}>
                      <span className="k-row-i" data-tone={sev.tone} aria-hidden><Icon size={14} /></span>
                      <span className="k-row-t oh-row-main"><b>{cluster ? `${r.items[0].title} · ${r.items.length} samples` : GROUP[r.kind](r.items.length)}</b><small>{cluster ? rest || first : first}</small></span>
                      <span className="k-row-e oh-row-meta"><Tag>{ALERT_KIND[r.kind] ?? r.kind}</Tag><span className="oh-alert-fold">Show {cluster ? "samples" : "places"}<ChevronRight size={14} aria-hidden /></span></span>
                    </summary>
                    <ul className="oh-alert-more">
                      {!cluster && hrefFor?.(r.items[0]) ? <li className="oh-alert-open"><Btn small href={hrefFor(r.items[0])!}>Open</Btn></li> : null}
                      {r.items.map((x) => <li key={x.key}><span>{cluster ? x.detail.split(". ")[0] : x.title}</span>{cluster && hrefFor?.(x) ? <Btn small variant="quiet" href={hrefFor(x)!}>Open</Btn> : null}{canAck && !x.ack ? seenBtn(x) : x.ack ? <small>Seen by {x.ack.by}</small> : null}</li>)}
                    </ul>
                  </details>
                </li>
              );
            }
            const a = r, href = hrefFor?.(a) ?? null, sev = SEV[a.severity] ?? SEV.info, Icon = sev.icon;
            return (
              <li key={a.key}>
                <div className="k-row oh-row oh-alert" data-sev={a.severity} data-acked={a.ack ? "true" : undefined}>
                  <span className="k-row-i" data-tone={sev.tone} aria-hidden><Icon size={14} /></span>
                  <span className="k-row-t oh-row-main"><b>{a.title}</b><small>{a.detail}{a.ack ? ` · Seen by ${a.ack.by ?? "a partner"}, ${fmtTime(a.ack.at)}` : ""}</small></span>
                  <span className="k-row-e oh-row-meta">
                    <Tag>{ALERT_KIND[a.kind] ?? a.kind}{a.area ? ` · ${a.area}` : ""}</Tag>
                    {href ? <Btn small href={href}>Open</Btn> : null}
                    {seenBtn(a)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </More>
  );
}
