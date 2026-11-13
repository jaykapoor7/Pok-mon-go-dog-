"use client";

/* Identifiers on an animal: ISO microchips, RFID tags, QR codes and printed
   tags. A handheld RFID or microchip reader types the number and Enter, so
   the field below works with any keyboard-mode scanner; phones that can read
   QR codes with the camera get a scan button. Every add and retire is a
   database function that checks the organisation and writes the audit log. */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useMembership } from "../shell/Shell";
import { Btn, Panel, Section } from "@/ws/kit";
import { Ack } from "../ui";
import "./ngo.css";
import "../abc/parts.k.css";
import "./Casefile.k.css";

export const ID_KINDS = { microchip: "Microchip", rfid_tag: "RFID tag", qr: "QR code", ear_tag: "Ear tag", collar_tag: "Collar tag" } as const;
type Kind = keyof typeof ID_KINDS;
type Row = { id: string; kind: Kind; value: string; note: string | null; created_at: string };

const norm = (v: string) => v.replace(/\s+/g, "").toUpperCase();
/** Plain checks before the database's own: ISO 11784/11785 chips are 15 digits; older chips 9–10 hex characters. */
export function identifierProblem(kind: Kind, raw: string): string | null {
  const v = norm(raw);
  if (v.length < 3) return "Enter at least 3 characters.";
  if (v.length > 64) return "That is longer than any identifier we store.";
  if (!/^[A-Z0-9._:/-]+$/.test(v)) return "Use letters, numbers and . _ : / - only.";
  if (kind === "microchip" && !/^([0-9]{15}|[0-9A-F]{9,10})$/.test(v)) return "A microchip number is 15 digits (ISO), or 9–10 characters on older chips.";
  return null;
}

export function Identifiers({ dogId }: { dogId: string }) {
  const mem = useMembership();
  const canRetire = ["admin", "coordinator", "veterinarian"].includes(mem.role ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<Kind>("microchip");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<{ ok: boolean; text: string } | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  const load = useCallback(async () => {
    const db = getSupabase(); if (!db) { setError("The record store is not configured."); return; }
    const r = await db.from("animal_identifiers").select("id,kind,value,note,created_at").eq("dog_id", dogId).is("retired_at", null).order("created_at", { ascending: true });
    if (r.error) { setError("Identifiers could not be read."); return; }
    setError(""); setRows((r.data ?? []) as Row[]);
  }, [dogId]);
  useEffect(() => { void load(); }, [load]);

  async function add(e?: React.FormEvent) {
    e?.preventDefault();
    const problem = identifierProblem(kind, value);
    if (problem) { setAck({ ok: false, text: problem }); return; }
    const db = getSupabase(); if (!db) return;
    setBusy(true); setAck(null);
    const r = await db.rpc("add_animal_identifier", { p_dog_id: dogId, p_kind: kind, p_value: value, p_note: note.trim() || null });
    setBusy(false);
    if (r.error) { setAck({ ok: false, text: r.error.message || "Not saved." }); return; }
    setAck({ ok: true, text: `${ID_KINDS[kind]} ${norm(value)} added.` }); setValue(""); setNote(""); setAdding(false);
    await load();
  }
  async function retire(id: string) {
    const db = getSupabase(); if (!db) return;
    if (!reason.trim()) { setAck({ ok: false, text: "Say why it is retired, for example a lost tag or a misread chip." }); return; }
    setBusy(true);
    const r = await db.rpc("retire_animal_identifier", { p_id: id, p_reason: reason.trim() });
    setBusy(false);
    if (r.error) { setAck({ ok: false, text: r.error.message || "Not retired." }); return; }
    setRetiring(null); setReason(""); setAck({ ok: true, text: "Identifier retired. It stays in the audit history." });
    await load();
  }

  return (
    <Section title="Identifiers" count={rows ? rows.length : null} action={!adding ? <Btn small onClick={() => setAdding(true)}>Add identifier</Btn> : undefined}>
      {error ? <p className="kx-said" data-tone="err" role="alert">{error} <Btn small onClick={() => void load()}>Read again</Btn></p>
        : rows === null ? <p className="kx-quiet" role="status">Reading identifiers…</p>
        : rows.length ? <Panel><ul className="k-rows">{rows.map((r) => (
          <li key={r.id}>
            <div className="k-row"><span className="k-row-t"><b className="kx-num">{r.value}</b><small>{ID_KINDS[r.kind]}{r.note ? ` · ${r.note}` : ""}</small></span>
              {canRetire && retiring !== r.id ? <span className="k-row-e"><Btn small variant="quiet" onClick={() => { setRetiring(r.id); setReason(""); }}>Retire</Btn></span> : null}</div>
            {canRetire && retiring === r.id ? <div className="idn-retire"><input className="kx-in" aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why retire it?" maxLength={200} /><Btn small disabled={busy} onClick={() => void retire(r.id)}>Retire</Btn><Btn small variant="quiet" onClick={() => { setRetiring(null); setReason(""); }}>Cancel</Btn></div> : null}
          </li>))}</ul></Panel>
        : <p className="kx-quiet">No microchip, tag or QR code yet.</p>}
      {adding ? <form className="kx-form idn-form" onSubmit={add}>
        <label className="kx-f"><span>Type</span><select className="kx-in" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{Object.entries(ID_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="kx-f"><span>Number</span><input className="kx-in" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "microchip" ? "985 141 000 123 456" : "Scan or type"} inputMode={kind === "microchip" ? "numeric" : "text"} autoComplete="off" spellCheck={false} maxLength={80} required /></label>
        <label className="kx-f"><span>Note (optional)</span><input className="kx-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Left shoulder, implanted at sterilisation" maxLength={200} /></label>
        <div className="kx-acts">
          <Btn type="submit" disabled={busy || !value.trim()}>{busy ? "Saving…" : "Add identifier"}</Btn>
          {canScan && <Btn onClick={() => { setKind("qr"); setScanning(true); }}>Scan QR</Btn>}
          <Btn variant="quiet" onClick={() => setAdding(false)}>Cancel</Btn>
        </div>
      </form> : null}
      <div aria-live="polite" className="idn-said">{ack && <Ack state={ack.ok ? "saved" : "failed"}>{ack.text}</Ack>}</div>
      {scanning && <QrScan onClose={() => setScanning(false)} onRead={(text) => { setScanning(false); setValue(text.slice(0, 64)); }} />}
    </Section>
  );
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Camera QR reading where the browser supports it (Chrome on Android, recent desktop Chrome). */
export function QrScan({ onRead, onClose }: { onRead: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState("Point the camera at the QR code.");
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, alive = true;
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Ctor) { setMsg("This browser cannot read QR codes with the camera. Type the code instead."); return; }
    const det = new Ctor({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s; if (video.current) { video.current.srcObject = s; void video.current.play(); }
      const tick = async () => {
        if (!alive || !video.current) return;
        try { const codes = await det.detect(video.current); if (codes[0]?.rawValue) { onRead(codes[0].rawValue); return; } } catch { /* keep looking */ }
        raf = requestAnimationFrame(() => void tick());
      };
      raf = requestAnimationFrame(() => void tick());
    }).catch(() => setMsg("Camera access was not allowed. Type the code instead."));
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onRead]);
  return (
    <div className="idn-scan" role="dialog" aria-modal="true" aria-label="Scan a QR code">
      <div className="idn-scan-in">
        <video ref={video} playsInline muted />
        <p>{msg}</p>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </div>
  );
}
