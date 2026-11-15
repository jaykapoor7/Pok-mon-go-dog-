"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, Crosshair, Plus } from "lucide-react";
import type { OrgFeedingZone } from "@/lib/feeding-zones";
import { formatINR } from "@/lib/fundraisers";
import { FUNDRAISER_CATEGORIES, fundraiserCategory, type Fundraiser } from "@/lib/types";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { addFeedingSpot, readFeedingSpots, readFundraisers, startFundraiser } from "../../../data/ngo-programmes";
import { Confirm, Failed, Field, FilePick, Modal, Skeleton, day, errText, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import { Grid, Tools, TryLink, type GCol, type Who } from "../frame";
import { S_FEEDING, S_FUNDRAISERS } from "../sample";

/* Feeding spots and fundraising. Spots appear on the public map, where volunteers sign up; adding one needs its
   location captured on site (create_org_feeding_zone). Campaigns send donors to the organisation's own donation page
   and StrayPaw never holds the money (create_fundraiser, verified partners only: the database decides). */

const since = (iso: string) => { const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`; };
const late = (z: OrgFeedingZone) => !z.last_fed_at || Date.now() - Date.parse(z.last_fed_at) > 7 * 864e5;

export function FeedingTab({ who }: { who: Who }) {
  const r = useRead<OrgFeedingZone[]>(() => read(readFeedingSpots), "ns:feeding", !who.sample && !!who.ngo);
  const [adding, setAdding] = useState(false);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading your feeding spots" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} A failed read is never shown as no spots.`} retry={r.reload} />;
  const rows = who.sample ? S_FEEDING : r.data!;
  const stale = rows.filter(late).length;
  const cols: GCol<OrgFeedingZone>[] = [
    { label: "Spot", width: "minmax(0, 1.5fr)", render: (z) => <span className="nx-cell-main"><span><b>{z.name}</b><small>{z.description ?? z.zone ?? "No notes"}</small></span></span> },
    { label: "Locality", width: "minmax(0, 1fr)", render: (z) => <span className="nx-t2">{z.zone ?? "Not recorded"}</span> },
    { label: "Volunteers", width: "96px", render: (z) => <span className="num">{z.volunteer_count}</span> },
    { label: "Added", width: "110px", render: (z) => <span className="nx-t3">{day(z.created_at)}</span> },
    { label: "Last fed", width: "140px", keep: true, render: (z) => <Chip tone={late(z) ? "bad" : "ok"}>{z.last_fed_at ? since(z.last_fed_at) : "Never recorded"}</Chip> },
  ];
  return (
    <>
      <Tools end={<><Link className="nx-btn is-quiet is-sm" href="/community/feeding">The public map</Link>{who.sample ? <TryLink small><Plus size={13} />Add a feeding spot</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setAdding(true)}><Plus size={13} />Add a feeding spot</button>}</>}>
        <span className="ns-sum">{rows.length ? <><b>{rows.length}</b> feeding {rows.length === 1 ? "spot" : "spots"}{stale ? <>, <span className="ns-hot">{stale} not fed in 7 days</span></> : ", all fed in the last 7 days"}.</> : "Places your team feeds, shown on the public map for volunteers."}</span>
      </Tools>
      <Grid label="Feeding spots" cols={cols} rows={rows} rowKey={(z) => z.id} empty={<><b>No feeding spots yet</b><p>Add the places your team feeds. Each needs its location captured on site.</p></>} />
      {adding ? <AddSpot onClose={() => setAdding(false)} onDone={() => { setAdding(false); r.reload(); }} /> : null}
    </>
  );
}

function AddSpot({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const [f, setF] = useState({ name: "", zone: "", description: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const locate = () => {
    setErr(null);
    if (!navigator.geolocation) { setErr("This device cannot share its location."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => { setLocating(false); setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); }, () => { setLocating(false); setErr("Location was not shared. Allow it, then try again on site."); }, { enableHighAccuracy: true, timeout: 8000 });
  };
  const save = () => void run("spot", () => addFeedingSpot({ name: f.name.trim(), zone: f.zone.trim(), description: f.description.trim(), lat: coords!.lat, lng: coords!.lng }, photo), { ok: "Feeding spot added. It shows on the public map." }).then((x) => { setAsking(false); if (x.ok) onDone(); });
  if (asking) return <Confirm title="Add this feeding spot" confirm="Add the spot" busy={busy === "spot"} onClose={() => setAsking(false)} onConfirm={save}><p>{f.name.trim()} at {coords!.lat.toFixed(4)}, {coords!.lng.toFixed(4)}{photo ? ", with a photo" : ""}. It appears on the public map, where volunteers can sign up to help.</p></Confirm>;
  return (
    <Modal title="Add a feeding spot" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!f.name.trim() || !coords} onClick={() => setAsking(true)}>Review</button></>}>
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Market corner, east gate" autoFocus /></Field>
      <Field label="Locality"><input value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="Neighbourhood or area" /></Field>
      <Field label="Notes"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="How many animals, feeding times" /></Field>
      <div className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button type="button" className="nx-btn is-quiet" onClick={locate} disabled={locating}><Crosshair size={13} />{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : locating ? "Locating…" : "Capture location (required)"}</button>
        <FilePick label={photo ? photo.name.slice(0, 24) : "Photo (optional)"} accept="image/*" onFiles={([file]) => setPhoto(file)} />
      </div>
      {err ? <p className="ns-note-bad" role="alert">{err}</p> : <p className="ns-small">Capture the location standing at the spot. It is required.</p>}
    </Modal>
  );
}

export const NEEDS = ["Emergency treatment", "Rescue operation", "Veterinary medicines", "Mobile veterinary ambulance", "Vaccination drive", "Rehabilitation"];
export function FundraisingTab({ who, title, caseId }: { who: Who; title?: string | null; caseId?: string | null }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead<Fundraiser[]>(() => read(() => readFundraisers(ngoId!)), `ns:fund:${ngoId}`, !who.sample && !!ngoId);
  const [making, setMaking] = useState<{ title: string } | null>(title || caseId ? { title: title ?? "" } : null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading your campaigns" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} Nothing is shown as none.`} retry={r.reload} />;
  const rows = who.sample ? S_FUNDRAISERS : r.data!;
  const active = rows.filter((x) => x.status === "active").length;
  const cols: GCol<Fundraiser>[] = [
    { label: "Campaign", width: "minmax(0, 1.6fr)", render: (c) => <span className="nx-cell-main"><span><b>{c.title}</b><small>{fundraiserCategory(c.category).label}{c.case_id ? " · linked to a case" : ""}</small></span></span> },
    { label: "Goal", width: "100px", render: (c) => <span className="num nx-t2">{c.goal_amount ? formatINR(c.goal_amount) : "No goal"}</span> },
    { label: "Raised (reported, not verified)", width: "190px", render: (c) => { const pct = c.goal_amount && c.raised_reported ? Math.min(100, Math.round((c.raised_reported / c.goal_amount) * 100)) : null; return <span className="num nx-t2">{c.raised_reported != null ? <>{formatINR(c.raised_reported)}{pct != null ? ` · ${pct}%` : ""}</> : "Not reported"}</span>; } },
    { label: "Needed by", width: "110px", render: (c) => <span className="nx-t3">{c.deadline ? day(c.deadline) : "No date"}</span> },
    { label: "Status", width: "96px", keep: true, render: (c) => <Chip tone={c.status === "active" ? "ok" : "plain"}>{c.status.replace(/^./, (x) => x.toUpperCase())}</Chip> },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />New campaign</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setMaking({ title: "" })}><Plus size={13} />New campaign</button>}>
        <span className="ns-sum"><b>{rows.length}</b> {rows.length === 1 ? "campaign" : "campaigns"}, <b>{active}</b> active. Donors pay you directly through your own link; StrayPaw never holds the money, and amounts raised are as you reported them.</span>
      </Tools>
      <Grid label="Your campaigns" cols={cols} rows={rows} rowKey={(c) => c.id} rowLabel={(c) => c.title} href={(c) => (who.sample ? null : `/fundraisers/${c.id}`)} empty={<><b>No campaigns yet</b><p>Start from a need below. You will need a donation link.</p></>} />
      <section className="ns-sec"><div className="nx-sec-h"><h2>Start from a need</h2></div>
        <div className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap", marginTop: 6 }}>{NEEDS.map((x) => who.sample ? <TryLink key={x} quiet small>{x}</TryLink> : <button key={x} type="button" className="nx-btn is-quiet is-sm" onClick={() => setMaking({ title: x })}>{x}</button>)}</div>
      </section>
      {making && who.ngo ? <NewCampaign initialTitle={making.title} caseId={caseId ?? null} actor={{ id: who.userId ?? "", name: who.userName ?? "" }} onClose={() => setMaking(null)} onDone={() => { setMaking(null); r.reload(); }} /> : null}
    </>
  );
}

function NewCampaign({ initialTitle, caseId, actor, onClose, onDone }: { initialTitle: string; caseId: string | null; actor: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const [f, setF] = useState({ title: initialTitle, category: "bills", story: "", goal: "", url: "", deadline: "" });
  const [cover, setCover] = useState<File | null>(null);
  const [asking, setAsking] = useState(false);
  const url = (() => { const u = f.url.trim(); return !u ? "" : /^https?:\/\//i.test(u) ? u : `https://${u}`; })();
  const ok = !!f.title.trim() && !!url && !!actor.id;
  const save = () => void run("fund", () => startFundraiser({ title: f.title.trim(), story: f.story.trim(), category: f.category, goal: f.goal ? Math.max(0, parseInt(f.goal, 10) || 0) : null, donateUrl: url, deadline: f.deadline || null, caseId }, actor, cover), { ok: "Campaign published." }).then((x) => { setAsking(false); if (x.ok) onDone(); });
  if (asking) return <Confirm title="Publish this campaign" confirm="Publish campaign" busy={busy === "fund"} onClose={() => setAsking(false)} onConfirm={save}><p>&ldquo;{f.title.trim()}&rdquo; is public as soon as it is published. Donors are sent to {url}; StrayPaw never holds the money.</p><p>Only members of a verified partner organisation can publish. If yours is not verified, the database refuses it and nothing is published.</p></Confirm>;
  return (
    <Modal wide title="New campaign" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok} onClick={() => setAsking(true)}>Review</button></>}>
      {caseId ? <p className="nx-note"><span>Linked to <Link className="ns-link" href={`/next/ngo/cases/${caseId}`}>a case</Link>. The campaign will show on it.</span></p> : null}
      <div className="nx-fields">
        <Field label="Title" wide><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Clear pending vet bills for 30 rescues" autoFocus /></Field>
        <Field label="Category"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{FUNDRAISER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
        <Field label="Needed by (optional)"><input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <Field label="Your donation link" wide hint={url && url !== f.url.trim() ? `It will be saved as ${url}.` : "Where the money goes. Donors are sent here to pay you directly."}><input value={f.url} inputMode="url" onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="UPI, Razorpay, Milaap, Ketto or bank page" /></Field>
        <Field label="Goal in ₹ (optional)"><input type="number" min={0} inputMode="numeric" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
        <div style={{ display: "flex", alignItems: "end" }}><FilePick label={cover ? cover.name.slice(0, 24) : "Cover photo (optional)"} accept="image/*" onFiles={([file]) => setCover(file)} /></div>
        <Field label="Story" wide><textarea rows={4} value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} placeholder="What the funds are for, which dogs, and what happens if it is not raised." /></Field>
      </div>
      <p className="nx-note"><Camera size={13} /><span>The campaign is public once published. Any amount raised is shown as you report it, not verified. Only verified partner organisations can publish; the database refuses anyone else.</span></p>
    </Modal>
  );
}
