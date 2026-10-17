"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Feeding spots (1.0 /partner/feeding).

   The spots the organisation feeds, on a map by area and in a register:
   who has volunteered, when a spot was last fed. Adding one captures
   the device's GPS (required, as in 1.0) and an optional photo, then
   calls create_org_feeding_zone; the page says "added" only when the
   database answers. Spots appear on the public map, where volunteers
   can sign up (/community/feeding).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { latLngToCell } from "h3-js";
import { Camera, Crosshair, Plus } from "lucide-react";
import type { OrgFeedingZone } from "@/lib/feeding-zones";
import { useMembership } from "../../shell/Shell";
import { AreaMap } from "../../atlas/AreaMap";
import { Ack, Method, State, day, n, since, PageBrief } from "../../ui";
import { readOrgFeedingSpots, startOrgFeedingSpot } from "../../data/work-outreach";
import type { Receipt } from "../../data/work";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./outreach.css";

type Load = { state: "reading" } | { state: "read"; rows: OrgFeedingZone[] } | { state: "failed"; error: string };

export function FeedingSpots() {
  const mem = useMembership();
  const [load, setLoad] = useState<Load>({ state: "reading" });
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const read = useCallback(async () => {
    setLoad({ state: "reading" });
    try { setLoad({ state: "read", rows: await readOrgFeedingSpots() }); }
    catch (e) { setLoad({ state: "failed", error: e instanceof Error ? e.message : "The record could not be reached." }); }
  }, []);
  useEffect(() => { if (mem.member) void read(); }, [mem.member, read]);

  const rows = useMemo(() => (load.state === "read" ? load.rows : []), [load]);
  const cells = useMemo(() => {
    const by = new Map<string, number>();
    for (const z of rows) if (Number.isFinite(z.lat) && Number.isFinite(z.lng)) { const h = latLngToCell(z.lat, z.lng, 8); by.set(h, (by.get(h) ?? 0) + 1); }
    return [...by.entries()].map(([h3, value]) => ({ h3, value, hot: 0, label: "feeding spots" }));
  }, [rows]);
  const cellOf = (z: OrgFeedingZone) => (Number.isFinite(z.lat) ? latLngToCell(z.lat, z.lng, 8) : null);
  const shown = sel ? rows.filter((z) => cellOf(z) === sel) : rows;
  const stale = rows.filter((z) => !z.last_fed_at || Date.now() - Date.parse(z.last_fed_at) > 7 * 86_400_000).length;

  return (
    <NgoGate title="Feeding spots" lede="The spots your organisation feeds, and who has offered to help. Members only.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">Field work · feeding</p><h1 className="serif">Feeding spots</h1></div>
          <p className="ngo-sum">{load.state === "read" ? <><b>{n(rows.length)}</b> spot{rows.length === 1 ? "" : "s"} · <b>{n(stale)}</b> not fed in the last 7 days, or never recorded as fed. They appear on the public map, where volunteers can sign up to help.</> : load.state === "failed" ? "Not read." : "Reading your organisation's feeding spots…"}</p>
          <div className="row" style={{ ["--g" as string]: "8px" }}>
            <button type="button" className="btn is-ink" aria-expanded={adding} onClick={() => setAdding((v) => !v)}><Plus size={15} aria-hidden /> Add a feeding spot</button>
            <Link className="btn" href="/community/feeding">The public map</Link>
          </div>
        </header>
        <PageBrief items={[["For", "The places your team feeds, and who offered to help there."], ["Watch", "Spots not fed in 7 days, or never recorded as fed."], ["Next", "Add a spot on site: the location is captured from your phone."], ["After", "It appears on the public feeding map, where volunteers can sign up."]]} />

        {adding && <AddSpot onDone={async (ok) => { if (ok) { setAdding(false); await read(); } }} />}

        {load.state === "failed" && <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={() => void read()}>Try again</button>}>{load.error} A failed read is never shown as no spots.</State>}
        {load.state === "reading" && <div className="stack" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 44 }} />)}</div>}
        {load.state === "read" && !rows.length && <State art="ngo-empty" title="No feeding spots yet" action={<button type="button" className="btn is-ink" onClick={() => setAdding(true)}>Add the first spot</button>}>Add the places your team feeds. Each needs its location captured on site.</State>}

        {load.state === "read" && rows.length > 0 && (
          <div className="ou-split">
            <section aria-label="Feeding spots register">
              <Method items={[["Spots", n(rows.length)], ["Last fed", "as volunteers and staff record it"], ["Place", "shown by area on the map"]]} />
              {sel && <button type="button" className="chip is-on" onClick={() => setSel(null)}>One area · show all</button>}
              <div className="or-scroll" role="region" aria-label="Feeding spots" tabIndex={0}>
                <table className="or-table">
                  <thead><tr><th scope="col">Spot</th><th scope="col">Locality</th><th scope="col">Volunteers</th><th scope="col">Last fed</th><th scope="col">Added</th></tr></thead>
                  <tbody>
                    {shown.map((z) => {
                      const late = !z.last_fed_at || Date.now() - Date.parse(z.last_fed_at) > 7 * 86_400_000;
                      return (
                        <tr key={z.id}>
                          <th scope="row"><b>{z.name}</b>{z.description && <small className="or-sub">{z.description}</small>}</th>
                          <td>{z.zone ?? <span className="pill is-unknown">Not recorded</span>}</td>
                          <td className="mono">{n(z.volunteer_count)}</td>
                          <td><span className={`pill ${late ? "is-urgent" : "is-care"}`}>{z.last_fed_at ? since(z.last_fed_at) : "Never recorded"}</span></td>
                          <td className="mono">{day(z.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <aside className="ou-map" aria-label="Feeding spots by area">
              <AreaMap cells={cells} selected={sel} onPick={setSel} label="Feeding spots by area" ink="#4b7f4f" empty="No spot carries a location." />
              <p className="small">Discs are areas (≈0.74 km²), sized by spots. Choose one to narrow the register.</p>
            </aside>
          </div>
        )}
      </div>
    </NgoGate>
  );
}

function AddSpot({ onDone }: { onDone: (ok: boolean) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [r, setR] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const locate = () => {
    setErr(null); setLocating(true);
    if (!navigator.geolocation) { setLocating(false); setErr("This device cannot share its location."); return; }
    navigator.geolocation.getCurrentPosition((p) => { setLocating(false); setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); }, () => { setLocating(false); setErr("Location was not shared. Allow it, then try again on site."); }, { enableHighAccuracy: true, timeout: 8000 });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Give the spot a name."); return; }
    if (!coords) { setErr("Capture the location on site first."); return; }
    setBusy(true); setErr(null);
    const x = await startOrgFeedingSpot({ name: name.trim(), zone: zone.trim(), description: description.trim(), lat: coords.lat, lng: coords.lng }, photo);
    setBusy(false); setR(x);
    await onDone(x.ok);
  };
  return (
    <form className="or-form" onSubmit={submit} aria-label="Add a feeding spot">
      <div className="ou-grid2">
        <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Market corner, east gate" required /></label>
        <label className="field"><span>Locality</span><input className="input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Neighbourhood or area" /></label>
      </div>
      <label className="field"><span>Notes</span><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How many animals, feeding times" /></label>
      <div className="row" style={{ ["--g" as string]: "8px" }}>
        <button type="button" className="btn" onClick={locate} disabled={locating}><Crosshair size={15} aria-hidden /> {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : locating ? "Locating…" : "Capture location (required)"}</button>
        <label className="btn"><Camera size={15} aria-hidden /> {photo ? photo.name.slice(0, 24) : "Photo (optional)"}<input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        <button type="submit" className="btn is-ink" disabled={busy}>{busy ? "Saving…" : "Add the spot"}</button>
      </div>
      {err && <Ack state="failed">{err}</Ack>}
      {r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">{r.error}</Ack>)}
    </form>
  );
}
