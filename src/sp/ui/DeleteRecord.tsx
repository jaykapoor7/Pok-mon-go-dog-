"use client";

/* Delete, visible on anything a person or Kaju added. A centred dialog asks
   once (never a popover that can spill over a card), a spinner shows while
   the database works, and a notice confirms the result: "Deleted · Undo" or
   "Not deleted · Try again". The record is archived and audited, and a
   coordinator can restore it for 30 days. The database decides who may
   delete what; its refusals are shown as plain sentences. */

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { notify } from "./Notice";

export type RemovableKind = "case" | "update" | "timeline" | "care" | "followup" | "evidence";

export function DeleteRecord({ kind, id, what, onDone, onRestored, compact = true }: { kind: RemovableKind; id: string; what: string; onDone?: () => void; onRestored?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = dlg.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);

  const remove = async () => {
    const db = getSupabase(); if (!db) { setErr("Not connected. Check the internet and try again."); return; }
    setBusy(true); setErr(null);
    const { data, error } = await db.rpc("remove_record", { p_kind: kind, p_id: id, p_reason: reason.trim() || null });
    setBusy(false);
    if (error) {
      const msg = /does not exist|not find/i.test(error.message) ? "Deleting is not switched on for this workspace yet." : error.message.replace(/\.?$/, ".");
      setErr(msg); notify({ tone: "error", text: `Not deleted. ${msg}` }); return;
    }
    setOpen(false); setReason("");
    const rid = String(data);
    notify({ tone: "ok", text: `Deleted ${what}.`, action: { label: "Undo", run: async () => {
      const { error: e } = await db.rpc("restore_record", { p_removed: rid });
      if (e) notify({ tone: "error", text: `Not restored. ${e.message}` }); else { notify({ tone: "ok", text: "Restored." }); (onRestored ?? onDone)?.(); }
    } } });
    onDone?.();
  };

  return (
    <>
      <button type="button" className={`dr-btn${compact ? " is-compact" : ""}`} onClick={() => { setErr(null); setOpen(true); }} aria-label={`Delete ${what}`} title={`Delete ${what}`}>
        <Trash2 size={15} aria-hidden />{!compact && <span>Delete</span>}
      </button>
      <dialog ref={dlg} className="dr-dlg" aria-label={`Delete ${what}`} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dlg.current && !busy) setOpen(false); }}>
        <div className="dr-card">
          <span className="dr-ico" aria-hidden><Trash2 size={18} /></span>
          <h2>Delete {what}?</h2>
          <p>It moves to removed records. A coordinator can restore it for 30 days.</p>
          <label className="dr-reason"><span>Reason <small>(optional)</small></span><textarea className="input" rows={2} maxLength={500} placeholder="For example: entered twice" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          {err && <p className="dr-err" role="alert">{err}</p>}
          <div className="dr-act">
            <button type="button" className="btn" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn dr-danger" disabled={busy} onClick={() => void remove()}>{busy ? <><Loader2 size={15} className="dr-spin" aria-hidden />Deleting…</> : "Delete"}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Kept for existing imports; the shared notice area now shows deletions. */
export function RemovedToast() { return null; }
