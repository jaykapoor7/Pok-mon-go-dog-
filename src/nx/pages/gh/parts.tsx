"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, MoreHorizontal, PenLine } from "lucide-react";
import { evidenceLink, isStoredEvidence } from "@/lib/abc";
import { Modal, Skeleton } from "../../kit";
import { Shell, type Ws } from "../../Shell";
import { Sheet } from "../../Phone";
import "../../css/govhealth.css";
import "../../css/ghphone.css";

/* Parts shared by the Government and Healthcare record pages. */

/** A decision recorded in a person's name: what will happen, who is signing, and an explicit tick before it is sent. */
export function SignedConfirm({ title, children, who, where, confirm = "Record decision", danger, busy, onConfirm, onClose, tick = "I have checked this and record the decision in my name." }: {
  title: string; children: ReactNode; who: string | null; where?: string | null; confirm?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void; tick?: string;
}) {
  const [ok, setOk] = useState(false);
  const id = useId();
  const now = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <Modal title={title} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className={`nx-btn ${danger ? "is-danger" : ""}`} disabled={!ok || busy} aria-disabled={!ok || busy} onClick={onConfirm}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}{confirm}</button></>}>
      <div className="nx-confirm">{children}</div>
      <div className="gh-signed"><PenLine size={14} /><div><b>{who ?? "You"}</b><small>{[where, now].filter(Boolean).join(" · ")}</small></div></div>
      <label className="gh-tick" htmlFor={id}><input id={id} type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} autoFocus /><span>{tick}</span></label>
    </Modal>
  );
}

/** In sample mode an action is a link to the live demo, never a button that does nothing. */
export function TryLink({ children, quiet, sm, keep, className }: { children: ReactNode; quiet?: boolean; sm?: boolean; keep?: boolean; className?: string }) {
  return <Link href="/try" className={`nx-btn ${quiet ? "is-quiet" : ""} ${sm ? "is-sm" : ""} ${keep ? "is-keep" : ""}${className ? ` ${className}` : ""}`} title="Opens the live demo, where this works">{children}</Link>;
}

/* ── Phone (docs/rebuild/MOBILE.md). Nothing below changes a desktop: the bar and the "About this" button are
   phone-only in govhealth.css, and the hook answers false until the page is in the browser. ── */

/** Marks a page as one of these workspaces, so their phone rules (ghphone.css) never reach another workspace's
    shared lists and fields once the stylesheet is loaded. Renders nothing visible. */
export const GhMark = () => <i className="gh-ws" hidden />;

/** True on a phone-width screen. False on the server and on the first paint, so hydration never differs. */
export function usePhone() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)"); const f = () => setOn(m.matches);
    f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f);
  }, []);
  return on;
}

/** An explanation that stays true but out of the way: inline on a desktop, behind "About this" on a phone. */
export function About({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className={`gh-about ${open ? "is-open" : ""}`}><button type="button" className="gh-about-b" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "About this"}</button><span id={id} className="gh-about-t">{children}</span></span>;
}

/** A record's actions on a phone: the main one (or two) at the thumb, everything else in a "More" sheet. On a desktop
    it shows nothing; the same actions stay where they are on the page (marked gh-desk, which a phone hides). */
export function ActBar({ children, more, label = "More actions" }: { children?: ReactNode; more?: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!children && !more) return null;
  return (
    <>
      <div className="gh-actbar" role="group" aria-label="Actions">
        {children}
        {more ? <button type="button" className="nx-btn is-quiet gh-actbar-m" aria-haspopup="dialog" aria-label={children ? "More actions" : undefined} onClick={() => setOpen(true)}><MoreHorizontal size={18} aria-hidden />{children ? null : "More"}</button> : null}
      </div>
      {/* The sheet sits outside the sticky bar, so the bar's layer never caps it under the phone bar. */}
      {more ? <Sheet open={open} onClose={() => setOpen(false)} label={label}>
        {/* Choosing an action closes the sheet; the action's own confirmation then rises in its place. */}
        <div className="gh-sheet-acts" onClick={(e) => { if ((e.target as HTMLElement).closest("a,button")) setOpen(false); }}>{more}</div>
      </Sheet> : null}
    </>
  );
}

export function Opening({ ws, crumb }: { ws: Ws; crumb: [string, string?] }) {
  return <Shell ws={ws} crumb={crumb}><div className="nx-page"><Skeleton rows={6} label="Opening" /></div></Shell>;
}

/** Opens one stored file through a link that expires in five minutes, fetched when the person asks for it. */
export function OpenFile({ url, children }: { url: string | null; children: ReactNode }) {
  const [err, setErr] = useState<string | null>(null);
  if (!url) return <span className="nx-t3">{children}</span>;
  if (!isStoredEvidence(url)) return <a className="gh-link" href={url} target="_blank" rel="noreferrer noopener">{children}<ExternalLink size={11} /></a>;
  const open = async () => {
    setErr(null);
    const tab = window.open("about:blank", "_blank");
    try { const link = await evidenceLink(url); if (tab) { tab.opener = null; tab.location.href = link; } else window.location.href = link; }
    catch (e) { tab?.close(); setErr((e as Error).message); }
  };
  return <><button type="button" className="gh-link" onClick={() => void open()}>{children}<ExternalLink size={11} /></button>{err ? <small className="gh-err" role="alert">{err}</small> : null}</>;
}

/** A small choice of a few options, as a radio group that reads as buttons. */
export function Seg<T extends string>({ label, value, options, onChange, name }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; name: string }) {
  return (
    <div className="gh-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <label key={v} className={value === v ? "is-on" : ""}><input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} /><span>{l}</span></label>)}
    </div>
  );
}

/** A labelled block in a record's side or main column. */
export function Block({ title, children, action, note }: { title: string; children: ReactNode; action?: ReactNode; note?: ReactNode }) {
  return <section className="gh-block"><div className="gh-block-h"><h3 className="nx-h3">{title}</h3>{action ? <span className="gh-block-a">{action}</span> : null}</div>{note ? <p className="gh-block-n">{note}</p> : null}{children}</section>;
}
