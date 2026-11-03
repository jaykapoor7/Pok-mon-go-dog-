"use client";

/* Delete, visible on anything a person or Kaju added. The record is archived
   (never silently lost), the audit log records who deleted it and why, and a
   coordinator can restore it for 30 days. The database decides who may
   delete what; refusals come back as plain sentences and are shown as is. */

import { useEffect, useRef, useState } from "react";
import { Trash2, Undo2, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export type RemovableKind = "case" | "update" | "timeline" | "care" | "followup" | "evidence";
const REMOVED = "sp:record-removed";
type Removed = { rid: string; what: string; reload?: () => void };

export function DeleteRecord({ kind, id, what, onDone, compact = true }: { kind: RemovableKind; id: string; what: string; onDone?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    box.current?.querySelector<HTMLElement>("textarea")?.focus();
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);

  const remove = async () => {
    const db = getSupabase(); if (!db) { setErr("Not connected. Try again in a moment."); return; }
    setBusy(true); setErr(null);
    const { data, error } = await db.rpc("remove_record", { p_kind: kind, p_id: id, p_reason: reason.trim() || null });
    setBusy(false);
    if (error) { setErr(/remove_record|function/i.test(error.message) && /not find|does not exist/i.test(error.message) ? "Deleting is not switched on for this workspace yet." : error.message); return; }
    setOpen(false);
    window.dispatchEvent(new CustomEvent<Removed>(REMOVED, { detail: { rid: String(data), what, reload: onDone } }));
    onDone?.();
  };

  return (
    <div className="dr" ref={box}>
      <button type="button" className={`dr-btn${compact ? " is-compact" : ""}`} aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={`Delete ${what}`}>
        <Trash2 size={14} aria-hidden />{!compact && <span>Delete</span>}
      </button>
      {open && <div className="dr-pop" role="dialog" aria-label={`Delete ${what}`}>
        <p><b>Delete {what}?</b> It moves to removed records. A coordinator can restore it for 30 days.</p>
        <textarea className="input" rows={2} maxLength={500} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <p className="dr-err" role="alert">{err}</p>}
        <div className="dr-act">
          <button type="button" className="btn is-s" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" className="btn is-s dr-danger" disabled={busy} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete"}</button>
        </div>
      </div>}
    </div>
  );
}

/** One toast for the whole app: "Deleted. Undo" after any deletion. Mounted once in the shell. */
export function RemovedToast() {
  const [last, setLast] = useState<Removed | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t = 0;
    const on = (e: Event) => { const d = (e as CustomEvent<Removed>).detail; setLast(d); setMsg(null); window.clearTimeout(t); t = window.setTimeout(() => setLast(null), 9000); };
    window.addEventListener(REMOVED, on);
    return () => { window.removeEventListener(REMOVED, on); window.clearTimeout(t); };
  }, []);
  if (!last) return null;
  const undo = async () => {
    const db = getSupabase(); if (!db) return;
    const { error } = await db.rpc("restore_record", { p_removed: last.rid });
    if (error) { setMsg(error.message); return; }
    last.reload?.(); setMsg("Restored."); window.setTimeout(() => setLast(null), 1800);
  };
  return (
    <div className="dr-toast" role="status">
      <span>{msg ?? <>Deleted {last.what}.</>}</span>
      {!msg && <button type="button" onClick={() => void undo()}><Undo2 size={14} aria-hidden />Undo</button>}
      <button type="button" className="dr-x" aria-label="Dismiss" onClick={() => setLast(null)}><X size={14} aria-hidden /></button>
    </div>
  );
}
