"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ExternalLink, Loader2, PenLine } from "lucide-react";
import { evidenceLink, isStoredEvidence } from "@/lib/abc";
import { Modal, Skeleton } from "../../kit";
import { Shell, type Ws } from "../../Shell";
import "../../css/govhealth.css";

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
export function TryLink({ children, quiet, sm, keep }: { children: ReactNode; quiet?: boolean; sm?: boolean; keep?: boolean }) {
  return <Link href="/try" className={`nx-btn ${quiet ? "is-quiet" : ""} ${sm ? "is-sm" : ""} ${keep ? "is-keep" : ""}`} title="Opens the live demo, where this works">{children}</Link>;
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
