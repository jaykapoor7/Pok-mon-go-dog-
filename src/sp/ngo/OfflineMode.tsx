"use client";
/* Offline mode: what this phone is holding for field work, and the controls
   for it. Records wait here, encrypted, until there is signal; Sync now sends
   them the same way field mode does (source and audit checked). */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Lock, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { archiveDraft, clearOfflineDevice, lockOffline, offlineUnlocked, putDraft, readDrafts, readSynced, type FieldDraft, type SyncedFieldRecord } from "@/lib/field/outbox";
import { submitFieldDraft } from "@/lib/field/sync";
import { NgoGate } from "./Gate";
import { OfflineStorage } from "./OfflineStorage";
import { useMembership } from "../shell/Shell";
import "./offline.css";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not yet");
const size = (b: number | null) => (b === null ? "—" : b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : `${(b / 1e6).toFixed(1)} MB`);

export function OfflineMode() {
  const { user } = useAuth();
  const mem = useMembership();
  const scope = user && mem.org ? `${user.id}:${mem.org.id}` : null;
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [synced, setSynced] = useState<SyncedFieldRecord[]>([]);
  const [used, setUsed] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { setOpen(!!scope && offlineUnlocked(scope)); }, [scope]);
  useEffect(() => { const on = () => setOnline(navigator.onLine); on(); window.addEventListener("online", on); window.addEventListener("offline", on); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", on); }; }, []);
  const read = useCallback(async () => {
    if (!scope) return;
    const [d, s] = await Promise.all([readDrafts(scope), readSynced(scope)]);
    setDrafts(d); setSynced(s);
    try { const e = await navigator.storage?.estimate(); setUsed(e?.usage ?? null); } catch { setUsed(null); }
  }, [scope]);
  useEffect(() => { if (open) void read().catch(() => setNote("Records on this phone could not be read.")); }, [open, read]);

  const sync = async () => {
    if (!scope || !user || !mem.org) return;
    setBusy(true); setNote(null);
    let ok = 0, failed = 0;
    for (const d of drafts) {
      try { const saved = await submitFieldDraft(d, user.id, mem.org.id); await archiveDraft(d, { id: d.id, scope, at: saved.confirmedAt, caseId: saved.caseId, dogId: saved.dogId, auditId: saved.audit_id, label: d.note.slice(0, 120) }); ok++; }
      catch (e) { await putDraft({ ...d, status: "failed", error: e instanceof Error ? e.message : "Not sent" }); failed++; }
    }
    await read().catch(() => {});
    setBusy(false);
    setNote(failed ? `${ok} synced, ${failed} could not be sent. They stay on this phone.` : ok ? `${ok} synced.` : "Nothing waiting.");
  };

  const last = synced.reduce<string | null>((m, r) => (!m || r.at > m ? r.at : m), null);
  return (
    <NgoGate title="Offline mode" lede="Field work without signal.">
      {!scope ? null : !open ? <OfflineStorage scope={scope} onUnlock={() => setOpen(true)} onPage /> : (
        <div className="ngo-page ofl">
          <header className="ngo-head"><h1>Offline mode</h1><p className="ngo-sum">Field records are saved encrypted on this phone and sync when there is signal.</p></header>
          <ul className="ofl-stats">
            <li><span>Waiting to sync</span><b>{drafts.length}</b></li>
            <li><span>Synced from this phone</span><b>{synced.length}</b></li>
            <li><span>Last sync</span><b style={{ fontSize: 15 }}>{when(last)}</b></li>
            <li><span>{online ? "Online" : "No signal"}</span><b style={{ fontSize: 15 }}>{size(used)} stored</b></li>
          </ul>
          <div className="ofl-acts">
            <button type="button" className="btn is-ink" disabled={busy || !online || !drafts.length} onClick={sync}><RefreshCw size={15} aria-hidden /> {busy ? "Syncing…" : "Sync now"}</button>
            <Link className="btn" href="/ngo/field">Open field mode <ArrowRight size={15} aria-hidden /></Link>
            <button type="button" className="btn" onClick={() => { lockOffline(); setOpen(false); }}><Lock size={15} aria-hidden /> Lock</button>
            <button type="button" className="btn is-quiet" disabled={busy} onClick={async () => { if (drafts.length && !window.confirm(`${drafts.length} records have not synced and will be lost. Remove them from this phone?`)) return; await clearOfflineDevice(scope); lockOffline(); setOpen(false); }}><Trash2 size={15} aria-hidden /> Remove from this phone</button>
          </div>
          {note && <p className="ofl-note" role="status">{note}</p>}
          {drafts.some((d) => d.status === "failed") && <p className="ofl-note">Records that failed keep their reason in field mode, where you can fix and resend them.</p>}
        </div>
      )}
    </NgoGate>
  );
}
