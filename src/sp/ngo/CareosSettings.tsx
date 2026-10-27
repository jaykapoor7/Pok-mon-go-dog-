"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export function CareosSettings() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("10");
  async function call(name: string, args: Record<string, unknown> = {}) {
    const db = getSupabase(); if (!db) { setMessage("Record store unavailable."); return null; }
    setBusy(true); setMessage("");
    try {
      const { data, error } = await db.rpc(name, args);
      if (error) { setMessage(error.code === "PGRST202" ? "WhatsApp backend is not deployed in this environment." : "Could not save. Check your permissions and input."); return null; }
      setMessage("Saved."); return data;
    } catch { setMessage("Could not save. Please retry."); return null; }
    finally { setBusy(false); }
  }
  return <section className="st-sec" aria-labelledby="careos-settings-title">
    <h2 className="h3" id="careos-settings-title">WhatsApp staff access</h2>
    <p className="small">Link your own WhatsApp number to your signed-in NGO membership. A link never grants a new role. Do not share the code.</p>
    <label className="field"><span className="label">Your number, including country code</span><input className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setCode(""); }} placeholder="91…" /></label>
    <div className="row">
      <button type="button" className="btn is-s" disabled={busy || !/^\d{7,15}$/.test(phone)} onClick={async () => { const data = await call("careos_staff_link_code", { p_phone: phone }); if (data?.code) setCode(data.code); }}>Create my link code</button>
      <button type="button" className="btn is-s" disabled={busy} onClick={async () => { await call("careos_staff_unlink"); setCode(""); }}>Unlink my phone</button>
    </div>
    {code && <p role="status">Send <code>LINK {code}</code> from that number to the configured StrayPaw WhatsApp number within 10 minutes.</p>}
    <h3 className="h3">Reporting area</h3>
    <p className="small">Team leads can enable intake within a radius of a GPS point. Reports outside participating areas wait privately and are never described as accepted.</p>
    <div className="st-two">
      <label className="field"><span className="label">Centre latitude</span><input className="input" type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} /></label>
      <label className="field"><span className="label">Centre longitude</span><input className="input" type="number" step="any" min="-180" max="180" value={lng} onChange={e => setLng(e.target.value)} /></label>
    </div>
    <label className="field"><span className="label">Radius in kilometres</span><input className="input" type="number" min="0.1" max="100" step="0.1" value={radius} onChange={e => setRadius(e.target.value)} /></label>
    <div className="row">{[true, false].map(enabled => <button key={String(enabled)} type="button" className="btn is-s" disabled={busy || !lat || !lng || !radius} onClick={() => void call("careos_configure_route", { p_lat: Number(lat), p_lng: Number(lng), p_radius_km: Number(radius), p_enabled: enabled })}>{enabled ? "Enable intake here" : "Pause intake here"}</button>)}</div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
