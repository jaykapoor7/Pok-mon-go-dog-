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

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { latLngToCell } from "h3-js";
import { Camera, Crosshair, Plus } from "lucide-react";
import type { OrgFeedingZone } from "@/lib/feeding-zones";
import { Btn, Empty, Head, More, Note, Page, Panel, Split, Table, Tag, type Col } from "@/ws/kit";
import { useMembership } from "../../shell/Shell";
import { AreaMap } from "../../atlas/AreaMap";
import { Ack, day, n, since } from "../../ui";
import { Reading } from "../../ui/Reading";
import { readOrgFeedingSpots, startOrgFeedingSpot } from "../../data/work-outreach";
import type { Receipt } from "../../data/work";
import { NgoGate } from "../Gate";
import "../org.k.css";

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
  const late = (z: OrgFeedingZone) => !z.last_fed_at || Date.now() - Date.parse(z.last_fed_at) > 7 * 86_400_000;
  const stale = rows.filter(late).length;

  const cols: Col<OrgFeedingZone>[] = [
    { key: "name", label: "Spot", width: "minmax(0, 1.6fr)", render: (z) => <>{z.name}{z.description ? <span className="og-tail">{z.description}</span> : null}</> },
    { key: "zone", label: "Locality", render: (z) => z.zone ?? <span className="og-nr">Not recorded</span> },
    { key: "vol", label: "Volunteers", width: "80px", align: "end", render: (z) => n(z.volunteer_count) },
    { key: "fed", label: "Last fed", width: "128px", keep: true, render: (z) => <Tag tone={late(z) ? "flame" : "green"}>{z.last_fed_at ? since(z.last_fed_at) : "Never recorded"}</Tag> },
    { key: "added", label: "Added", width: "104px", render: (z) => day(z.created_at) },
  ];

  return (
    <NgoGate title="Feeding spots" lede="The spots your organisation feeds, and who has offered to help. Members only.">
      <Page>
        <Head title="Drives"
          sum={load.state === "read" ? rows.length === 0 ? "Places your team feeds, shown on the public map for volunteers." : <><b>{n(rows.length)}</b> feeding spot{rows.length === 1 ? "" : "s"}{stale ? <>, <span className="is-hot">{n(stale)} not fed in 7 days</span></> : ", all fed in the last 7 days"}.</> : load.state === "failed" ? "Feeding spots were not read." : <Reading>Reading your organisation&rsquo;s feeding spots</Reading>}
          actions={<><Btn href="/community/feeding">The public map</Btn><Btn variant={adding ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={adding} onClick={() => setAdding((v) => !v)}>Add a feeding spot</Btn></>} />

        {adding && <Panel pad><AddSpot onDone={async (ok) => { if (ok) { setAdding(false); await read(); } }} onCancel={() => setAdding(false)} /></Panel>}

        {load.state === "failed" && <Note tone="flame" action={<Btn small onClick={() => void read()}>Try again</Btn>}>Didn&rsquo;t load. {load.error} A failed read is never shown as no spots.</Note>}
        {load.state === "reading" && <div className="og-skel" aria-busy="true"><i /><i /><i /></div>}
        {load.state === "read" && !rows.length && <Panel><Empty title="No feeding spots yet">Add the places your team feeds. Each needs its location captured on site.</Empty></Panel>}

        {load.state === "read" && rows.length > 0 && (
          <Split side={<aside className="fs-map" aria-label="Feeding spots by area">
            <AreaMap cells={cells} selected={sel} onPick={setSel} label="Feeding spots by area" ink="#4b7f4f" empty="No spot carries a location." />
            <p className="og-hint">Discs are areas (≈0.74 km²), sized by spots. Choose one to narrow the list.</p>
          </aside>}>
            {sel && <Note action={<Btn small onClick={() => setSel(null)}>Show all</Btn>}>Showing one area.</Note>}
            <Panel>
              <More items={shown} cap={12} noun="spots">{(part) => <Table label="Feeding spots" cols={cols} rows={part} rowKey={(z) => z.id} />}</More>
            </Panel>
          </Split>
        )}
      </Page>
    </NgoGate>
  );
}

function AddSpot({ onDone, onCancel }: { onDone: (ok: boolean) => void | Promise<void>; onCancel: () => void }) {
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
    <form className="og-form" onSubmit={submit} aria-label="Add a feeding spot">
      <label className="og-f"><span className="og-l">Name</span><input className="og-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Market corner, east gate" required /></label>
      <label className="og-f"><span className="og-l">Locality</span><input className="og-in" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Neighbourhood or area" /></label>
      <label className="og-f"><span className="og-l">Notes</span><textarea className="og-in" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How many animals, feeding times" /></label>
      <div className="og-go">
        <Btn onClick={locate} disabled={locating} icon={<Crosshair size={14} />}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : locating ? "Locating…" : "Capture location (required)"}</Btn>
        <label className="k-btn is-plain"><Camera size={14} aria-hidden /> {photo ? photo.name.slice(0, 24) : "Photo (optional)"}<input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
      </div>
      <div className="og-go">
        <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Add the spot"}</Btn><Btn onClick={onCancel} disabled={busy}>Cancel</Btn>
        {err && <Ack state="failed">{err}</Ack>}
        {r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">{r.error}</Ack>)}
      </div>
    </form>
  );
}
