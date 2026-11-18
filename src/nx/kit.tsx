"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DUR, EASE, SPRING } from "./motion/tokens";
import { AlertTriangle, Check as Tick, Loader2, LocateFixed, Lock, Paperclip, WifiOff, X } from "lucide-react";

/* The working parts every page shares: dialogs, fields, the receipt a person gets after an action (with Undo where it
   is safe), empty, loading, denied and offline states, record headers and tab bars. One set, so the whole app behaves
   the same way and a person learns it once. */

/* ── Errors in plain words ─────────────────────────────────────────── */

/** What went wrong, said so a person knows what to do. Database refusals keep their own wording, which is written for people. */
export function errText(e: unknown): string {
  const m = typeof e === "string" ? e : (e as { message?: string })?.message ?? "";
  const code = (e as { code?: string })?.code;
  if (/fetch|network|Failed to fetch|Load failed/i.test(m)) return "Could not reach StrayPaw. Nothing was changed. Check the connection and try again.";
  if (code === "42501" || /permission denied|row-level security/i.test(m)) return /^[A-Z]/.test(m) && !/permission denied|row-level/i.test(m) ? m : "You do not have permission to do that here.";
  if (/JWT|not authenticated|session/i.test(m)) return "Your session has ended. Sign in again; nothing was changed.";
  if (/function .* does not exist|Could not find the function|schema cache/i.test(m)) return "This part of StrayPaw is not set up on this database yet.";
  if (/violates (check|foreign key|not-null) constraint|invalid input syntax/i.test(m)) return "Some details are not valid. Check them and try again.";
  if (/duplicate key|unique constraint/i.test(m)) return "That already exists.";
  return m ? m.replace(/^ERROR:\s*/i, "").replace(/^./, (c) => c.toUpperCase()) : "Something went wrong. Nothing was changed. Try again.";
}

/* ── Receipts (toasts) ─────────────────────────────────────────────── */

export type Toast = { id: number; text: string; tone?: "ok" | "bad" | "plain"; undo?: () => unknown; href?: string; hrefLabel?: string };
let seq = 0;
/** Tell the person what just happened. Undo is offered only where the action can really be reversed. */
export function toast(t: Omit<Toast, "id">) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nx:toast", { detail: { ...t, id: ++seq } })); }

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  const calm = useReducedMotion();
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((cur) => [...cur.slice(-2), t]);
      window.setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), t.undo ? 8000 : t.tone === "bad" ? 9000 : 4500);
    };
    window.addEventListener("nx:toast", on); return () => window.removeEventListener("nx:toast", on);
  }, []);
  return (
    <div className="nx-toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div key={t.id} className={`nx-toast ${t.tone === "bad" ? "is-bad" : ""}`} initial={calm ? { opacity: 0 } : { opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: 6 }} transition={calm ? { duration: 0 } : SPRING.pop}>
            {t.tone === "bad" ? <AlertTriangle size={14} /> : t.tone === "ok" ? <motion.span initial={calm ? false : { scale: .6 }} animate={{ scale: 1 }} className="nx-toast-ok"><Tick size={12} strokeWidth={3} /></motion.span> : null}
            <span>{t.text}</span>
            {t.href ? <Link href={t.href} className="nx-toast-a">{t.hrefLabel ?? "Open"}</Link> : null}
            {t.undo ? <button type="button" className="nx-toast-a" onClick={async () => { setItems((cur) => cur.filter((x) => x.id !== t.id)); await t.undo!(); }}>Undo</button> : null}
            <button type="button" className="nx-toast-x" aria-label="Dismiss" onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type Outcome = { error?: unknown } | void | unknown;
/** Run one action at a time per key, say what happened, and keep the form's input if it failed. */
export function useAct() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T extends Outcome>(key: string, fn: () => Promise<T>, opts: { ok?: string | ((r: T) => string); undo?: (r: T) => unknown; href?: string; quiet?: boolean } = {}): Promise<{ ok: boolean; result?: T; error?: string }> => {
    if (busy) return { ok: false, error: "Wait for the last action to finish." };
    setBusy(key);
    try {
      const r = await fn();
      const err = r && typeof r === "object" && "error" in r ? (r as { error?: unknown }).error : null;
      if (err) { const text = errText(err); toast({ text, tone: "bad" }); return { ok: false, error: text }; }
      if (!opts.quiet && opts.ok) toast({ text: typeof opts.ok === "function" ? opts.ok(r) : opts.ok, tone: "ok", undo: opts.undo ? () => opts.undo!(r) : undefined, href: opts.href });
      return { ok: true, result: r };
    } catch (e) {
      const text = errText(e); toast({ text, tone: "bad" }); return { ok: false, error: text };
    } finally { setBusy(null); }
  }, [busy]);
  return { busy, run };
}

/* ── Dialogs ───────────────────────────────────────────────────────── */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** A dialog that takes focus, keeps it inside, closes on Escape and gives focus back to what opened it. */
export function Modal({ title, onClose, children, wide, foot }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; foot?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const calm = useReducedMotion();
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>("[autofocus]") ?? box.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => { before?.focus?.(); };
  }, []);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  return (
    <div className="nx-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={key}>
      <motion.div ref={box} role="dialog" aria-modal="true" aria-labelledby={id} className={`nx-dlg ${wide ? "is-wide" : ""}`} initial={calm ? { opacity: 0 } : { opacity: 0, y: 8, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={calm ? { duration: 0 } : { duration: DUR.state, ease: EASE }}>
        <div className="nx-dlg-h"><h2 id={id}>{title}</h2><button type="button" className="nx-ib" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        <div className="nx-dlg-c">{children}</div>
        {foot ? <div className="nx-dlg-f">{foot}</div> : null}
      </motion.div>
    </div>
  );
}

/** Ask before something consequential, with a plain summary of what will happen. */
export function Confirm({ title, children, confirm = "Confirm", danger, busy, onConfirm, onClose }: { title: string; children: ReactNode; confirm?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className={`nx-btn ${danger ? "is-danger" : ""}`} disabled={busy} onClick={onConfirm} autoFocus>{busy ? <Loader2 size={13} className="nx-spin" /> : null}{confirm}</button></>}>
      <div className="nx-confirm">{children}</div>
    </Modal>
  );
}

/* ── Fields ────────────────────────────────────────────────────────── */

export function Field({ label, hint, children, wide }: { label: string; hint?: ReactNode; children: ReactNode; wide?: boolean }) {
  return <label className={`nx-field ${wide ? "is-wide" : ""}`}><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

/** Where something happened: typed coordinates, or the device's position on request (never without asking). */
export function GeoField({ lat, lng, onChange }: { lat: number | null; lng: number | null; onChange: (lat: number | null, lng: number | null, accuracy?: number) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "denied" | "none">("idle");
  const here = () => {
    if (!navigator.geolocation) { setState("none"); return; }
    setState("busy");
    navigator.geolocation.getCurrentPosition((p) => { setState("idle"); onChange(Math.round(p.coords.latitude * 1e6) / 1e6, Math.round(p.coords.longitude * 1e6) / 1e6, p.coords.accuracy); }, () => setState("denied"), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  const num = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return (
    <div className="nx-geo">
      <Field label="Latitude"><input inputMode="decimal" value={lat ?? ""} onChange={(e) => onChange(num(e.target.value), lng)} placeholder="12.9716" /></Field>
      <Field label="Longitude"><input inputMode="decimal" value={lng ?? ""} onChange={(e) => onChange(lat, num(e.target.value))} placeholder="77.5946" /></Field>
      <button type="button" className="nx-btn is-quiet" onClick={here} disabled={state === "busy"}>{state === "busy" ? <Loader2 size={13} className="nx-spin" /> : <LocateFixed size={13} />}Use my location</button>
      {state === "denied" ? <small className="nx-geo-n">Location was not shared. Type the coordinates instead.</small> : state === "none" ? <small className="nx-geo-n">This device cannot share its location.</small> : null}
    </div>
  );
}

export function FilePick({ label = "Attach a file", accept, multiple, onFiles, disabled }: { label?: string; accept?: string; multiple?: boolean; onFiles: (f: File[]) => void; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return <>
    <button type="button" className="nx-btn is-quiet" disabled={disabled} onClick={() => ref.current?.click()}><Paperclip size={13} />{label}</button>
    <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) onFiles(f); }} />
  </>;
}

/* ── States ────────────────────────────────────────────────────────── */

export function Empty({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return <div className="nx-empty"><b>{title}</b>{hint ? <p>{hint}</p> : null}{action ? <div className="nx-empty-a">{action}</div> : null}</div>;
}

/** Rows shaped like the table that is coming, so nothing jumps when it arrives. */
export function Skeleton({ rows = 6, label = "Reading" }: { rows?: number; label?: string }) {
  return <div className="nx-skel" role="status" aria-label={`${label}…`}>{Array.from({ length: rows }, (_, i) => <span key={i} style={{ width: `${88 - ((i * 17) % 34)}%` }} />)}</div>;
}

export function Denied({ what, why, back }: { what: string; why?: string; back?: { href: string; label: string } }) {
  return <div className="nx-empty is-denied"><Lock size={18} /><b>{what}</b><p>{why ?? "Your role in this organisation does not include it. The database refuses it either way."}</p>{back ? <Link href={back.href} className="nx-btn is-quiet">{back.label}</Link> : null}</div>;
}

export function Failed({ error, retry }: { error: string; retry?: () => void }) {
  return <div className="nx-empty is-bad" role="alert"><AlertTriangle size={18} /><b>Could not read this</b><p>{error}</p>{retry ? <button type="button" className="nx-btn is-quiet" onClick={retry}>Try again</button> : null}</div>;
}

/** Says so when the device is offline, and that work done now waits on this device until it reconnects. */
export function OfflineBar() {
  const [off, setOff] = useState(false);
  useEffect(() => { const s = () => setOff(!navigator.onLine); s(); window.addEventListener("online", s); window.addEventListener("offline", s); return () => { window.removeEventListener("online", s); window.removeEventListener("offline", s); }; }, []);
  if (!off) return null;
  return <div className="nx-offline" role="status"><WifiOff size={13} /><span>You are offline. Pages show what was last read. Field records wait on this device and are sent when you reconnect.</span></div>;
}

/* ── Records ───────────────────────────────────────────────────────── */

export function RecordHead({ av, title, sub, chips, actions }: { av?: ReactNode; title: ReactNode; sub?: ReactNode; chips?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="nx-rec-h">
      <div className="nx-rec-t">{av !== undefined ? <span className="nx-rec-av">{av}</span> : null}<div><h1>{title}</h1>{sub || chips ? <p>{sub}{chips}</p> : null}</div></div>
      {actions ? <div className={`nx-rec-acts ${av === undefined ? "is-flat" : ""}`}>{actions}</div> : null}
    </div>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange, id, label = "Sections" }: { tabs: (T | [T, number | undefined])[]; value: T; onChange: (t: T) => void; id: string; label?: string }) {
  const calm = useReducedMotion();
  const list = tabs.map((t) => (Array.isArray(t) ? t : [t, undefined] as [T, number | undefined]));
  return (
    <div className="nx-tabs" role="tablist" aria-label={label} onKeyDown={(e) => { const i = list.findIndex(([t]) => t === value); if (e.key === "ArrowRight") onChange(list[(i + 1) % list.length][0]); if (e.key === "ArrowLeft") onChange(list[(i - 1 + list.length) % list.length][0]); }}>
      {list.map(([t, n]) => <button key={t} type="button" role="tab" aria-selected={value === t} tabIndex={value === t ? 0 : -1} className={`nx-tab ${value === t ? "is-on" : ""}`} onClick={() => onChange(t)}>{t}{n ? <span className="nx-count">{n}</span> : null}{value === t ? <motion.span layoutId={`nx-tabline-${id}`} className="nx-tab-line" transition={calm ? { duration: 0 } : SPRING.glide} /> : null}</button>)}
    </div>
  );
}

export function Section({ title, count, action, children, id }: { title: string; count?: number; action?: ReactNode; children: ReactNode; id?: string }) {
  const hid = useId();
  return <section className="nx-sec" aria-labelledby={hid} id={id}><div className="nx-sec-h"><h2 id={hid}>{title}</h2>{count !== undefined ? <span className="nx-count">{count}</span> : null}{action ? <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>{action}</span> : null}</div>{children}</section>;
}

export function Props({ items }: { items: [string, ReactNode][] }) {
  return <dl className="nx-props">{items.filter(([, v]) => v !== undefined).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v ?? <span className="nx-t3">Not recorded</span>}</dd></div>)}</dl>;
}

export type TItem = { id: string; when: string; title: ReactNode; body?: ReactNode; tone?: "ok" | "accent" | "warn" | "bad"; who?: string | null; action?: ReactNode };
export function Timeline({ items, empty = "Nothing recorded yet." }: { items: TItem[]; empty?: string }) {
  if (!items.length) return <p className="nx-sub">{empty}</p>;
  return <ol className="nx-tl">{items.map((e) => <li key={e.id}><span className={`nx-tl-d ${e.tone ? `t-${e.tone}` : ""}`}>{e.tone === "ok" ? <Tick size={10} strokeWidth={3} /> : null}</span><div className="nx-tl-c"><b>{e.title}</b><small>{e.when}{e.who ? ` · ${e.who}` : ""}</small>{e.body ? <div className="nx-tl-b">{e.body}</div> : null}{e.action ? <div className="nx-tl-a">{e.action}</div> : null}</div></li>)}</ol>;
}

/* ── Formatting ────────────────────────────────────────────────────── */

export const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const dayTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
export const words = (v: string | null | undefined, none = "Not recorded") => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : none);
export const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-IN"));
export const todayIso = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
