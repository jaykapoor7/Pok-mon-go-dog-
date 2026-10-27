"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { careInbox, careInboxAct } from "@/lib/careos/inbox";
import type { CareInboxItem } from "@/lib/careos/contract";
import { getSupabase } from "@/lib/supabase";

export function CareosInbox() {
  const [items, setItems] = useState<CareInboxItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<CareInboxItem | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<{ action: string; note: string; created_at: string }[]>([]);
  const load = useCallback(async () => {
    const r = await careInbox();
    if (r.connected) { setItems(r.data); setSelected(current => current ? r.data.find(item => item.id === current.id) || null : null); setError(""); }
    else { setItems([]); setSelected(null); setError(r.reason === "not_deployed" ? "WhatsApp intake is not deployed in this environment." : "Your WhatsApp inbox could not be read. Check your NGO access."); }
  }, []);
  useEffect(() => {
    let disposed = false;
    const refresh = () => { if (!disposed && document.visibilityState === "visible") void load(); };
    void load(); const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);
  useEffect(() => { setReason(""); }, [selected?.id]);
  useEffect(() => {
    let current = true; setNotes([]);
    const db = getSupabase();
    if (selected?.linked_case_id && db) void db.rpc("careos_case_notes", { p_case_id: selected.linked_case_id }).then(({ data }) => { if (current) setNotes(data || []); });
    return () => { current = false; };
  }, [selected]);
  async function decide(type: "claim" | "dismiss") {
    if (!selected) return; setBusy(true);
    try {
      const r = await careInboxAct(type === "claim" ? { type, item_id: selected.id } : { type, item_id: selected.id, reason });
      if (r.connected) { setSelected(r.data); await load(); } else setError("Decision was not saved. Check permissions and retry.");
    } finally { setBusy(false); }
  }
  async function media(id: string) {
    const db = getSupabase(), session = await db?.auth.getSession();
    const token = session?.data.session?.access_token; if (!token) return;
    const r = await fetch(`/api/whatsapp/media/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) { setError("Private media could not be opened."); return; }
    const data = await r.json();
    // Open only the signed Supabase storage URL returned after the caller's NGO check.
    const u = new URL(data.url); const expected = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.invalid");
    if (u.origin === expected.origin && u.pathname.startsWith("/storage/v1/object/sign/careos-private/")) window.open(u.href, "_blank", "noopener,noreferrer");
  }
  return <div className="ib-grid">
    <section className="ib-list" aria-label="WhatsApp reports">
      <div className="wk-tools"><h2 className="h3">WhatsApp reports</h2><button type="button" className="chip" onClick={() => void load()}>Refresh</button></div>
      {error && <p role="alert">{error}</p>}
      {!error && !items.length && <p>No WhatsApp report is waiting in your organisation.</p>}
      <ul className="ib-rows">{items.map(item => <li className="ib-row" key={item.id}><button className="link" type="button" onClick={() => setSelected(item)}><strong>{item.text?.split("\n")[0]}</strong> · {item.urgency} · {item.status}</button><span>{item.text?.split("\n").slice(1).join("\n").slice(0, 160)}</span></li>)}</ul>
    </section>
    <aside className="ib-act" aria-label="Review WhatsApp report">
      {!selected ? <p>Choose a report to review its private evidence and decide whether your NGO can attend.</p> : <>
        <h2 className="h3">{selected.text?.split("\n")[0]}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{selected.text?.split("\n").slice(1).join("\n")}</p>
        {selected.location && <p>GPS: {selected.location.lat}, {selected.location.lng}</p>}
        {selected.media.map(m => <p key={m.id}><button type="button" className="link" onClick={() => void media(m.id)}>View private {m.kind} (may show injury)</button></p>)}
        {selected.status === "new" && <button type="button" className="btn is-ink" disabled={busy} onClick={() => void decide("claim")}>Accept this report</button>}
        {selected.linked_case_id && <p><Link className="link" href={`/ngo/cases/${selected.linked_case_id}`}>Open the shared case</Link></p>}
        {selected.status === "new" && <><label className="field"><span className="label">Reason this team cannot attend</span><textarea className="textarea" value={reason} onChange={e => setReason(e.target.value)} /></label><button type="button" className="btn is-s" disabled={busy || !reason.trim()} onClick={() => void decide("dismiss")}>Decline with this reason</button></>}
        {notes.length > 0 && <><h3 className="h3">Private staff notes</h3><ul>{notes.map((n, ix) => <li key={ix}>{n.action}: {n.note || "Recorded"}</li>)}</ul></>}
        <p className="small">Assignments, care, expenses and follow-ups share this case with individual staff WhatsApp messages.</p>
      </>}
    </aside>
  </div>;
}
