"use client";

/* Scan to find: a handheld reader types the number and Enter; phones can use
   the camera for QR codes. Your organisation's animals open directly; another
   organisation's identifier is reported only as registered elsewhere. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { NgoGate } from "./Gate";
import { QrScan } from "./Identifiers";
import "./ngo.css";

type Hit = { found: boolean; own?: boolean; dog_id?: string; straypaw_id?: string | null; name?: string | null; kind?: string };

export function ScanLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [hit, setHit] = useState<Hit | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  async function find(raw: string) {
    const v = raw.trim(); if (v.length < 3) return;
    const db = getSupabase(); if (!db) { setError("The record store is not configured."); return; }
    setBusy(true); setError(""); setHit(null);
    const r = await db.rpc("lookup_animal_identifier", { p_value: v });
    setBusy(false);
    if (r.error) { setError(r.error.message || "The lookup failed. Nothing was changed."); return; }
    const h = r.data as Hit; setHit(h);
    if (h.found && h.own && h.dog_id) router.push(`/ngo/animals/${h.dog_id}`);
  }

  return (
    <NgoGate title="Scan" lede="Find an animal by its microchip, RFID tag or QR code.">
      <div className="ngo-page scan">
        <header className="ngo-head"><h1>Scan to find an animal</h1><p className="ngo-sum">Scan a microchip, RFID tag or QR code, or type the number.</p></header>
        <form className="scan-form" onSubmit={(e) => { e.preventDefault(); void find(value); }}>
          <input ref={input} autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Scan or type an identifier" aria-label="Identifier" autoComplete="off" spellCheck={false} maxLength={80} />
          <button className="btn is-flame" type="submit" disabled={busy || value.trim().length < 3}>{busy ? "Finding…" : "Find"}</button>
          {canScan && <button className="btn" type="button" onClick={() => setCamera(true)}>Use camera</button>}
        </form>
        <div aria-live="polite" className="scan-out">
          {error && <p role="alert">{error}</p>}
          {hit && !hit.found && <p>No animal carries this identifier. <Link href="/ngo/animals">Search the register</Link> and add it from the animal&apos;s page.</p>}
          {hit?.found && !hit.own && <p>Registered with another organisation.</p>}
          {hit?.found && hit.own && <p>Opening {hit.name || hit.straypaw_id || "the animal"}…</p>}
        </div>
      </div>
      {camera && <QrScan onClose={() => { setCamera(false); input.current?.focus(); }} onRead={(t) => { setCamera(false); setValue(t); void find(t); }} />}
    </NgoGate>
  );
}
