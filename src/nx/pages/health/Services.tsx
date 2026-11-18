"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, Phone } from "lucide-react";
import { SERVICE_LABEL, SERVICE_STATUS, call, fmtTime, select, useRead, type Area, type Place, type ServiceNow } from "@/oh/data";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Denied, Failed, Field, GeoField, Skeleton, useAct } from "../../kit";
import { useLive } from "../../live";
import type { Tone } from "../../fixtures";
import { ago, can, placeOf, usePlaces } from "../../data/govhealth";
import { About, Block, GhMark, Opening, Seg, TryLink } from "../gh/parts";

/* What this facility can provide today, as a named person confirms it for one to seven days at a time, and its
   public details. Patients, referring centres and the programme read these confirmations. An expired confirmation
   shows as "not confirmed recently", never as available. StrayPaw is not connected to any stock system, and a
   confirmation does not say the facility is open now. */

const OFFERED: Record<string, string[]> = { hospital: ["arv", "rig", "wound_care"], clinic: ["arv", "rig", "wound_care"], laboratory: ["rabies_testing"] };
type Status = ServiceNow & { organisation_id: string; verified_by_name: string | null };
type Org = { id: string; name: string; kind: string; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; listed_publicly: boolean; area_id: string | null };
const tone = (s: string | null): Tone => (s === "available" ? "ok" : s === "limited" ? "warn" : s === "unavailable" ? "bad" : "plain");
const iso = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const SAMPLE_STATUS: Status[] = [
  { organisation_id: "s", service: "arv", status: "available", note: "Mornings only on Sunday", verified_at: iso(0.2), valid_until: iso(-3), verified_by_name: "Duty medical officer" },
  { organisation_id: "s", service: "rig", status: "limited", note: "Supply expected Thursday", verified_at: iso(1), valid_until: iso(-2), verified_by_name: "Pharmacist" },
  { organisation_id: "s", service: "wound_care", status: "available", note: null, verified_at: iso(9), valid_until: iso(2), verified_by_name: "Nurse on duty" },
];

export function OurServices() {
  const live = useLive();
  const org = live.orgFor("healthcare");
  const pl = usePlaces(live.ready && !!live.org);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Facilities", "Our services"]} />;
  if (!live.org) return <View sample place={null} org={{ id: "s", name: "Teaching Hospital Anti-Rabies Clinic", kind: "hospital", address: "Hospital Road", phone: null, hours: "Every day, 8 am to 8 pm", lat: null, lng: null, listed_publicly: true, area_id: null }} />;
  const place = placeOf(pl.places, org?.org_id);
  if (!org || org.kind === "veterinary" || !OFFERED[org.kind] || !can(place, "confirm_service")) return (
    <Shell ws="health" crumb={["Facilities", "Our services"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Our services</h1>
      <Denied what="Services are confirmed by the facility's own staff" why={org && OFFERED[org.kind] ? `Your role at ${org.name} does not include confirming services.` : "Your account is not part of a hospital, health centre or laboratory."} back={{ href: "/health/facilities", label: "Back to facilities" }} /></div></Shell>
  );
  return <LiveServices place={place!} />;
}

function LiveServices({ place }: { place: Place }) {
  const o = useRead<Org[]>(() => select<Org>("oh_organisations", { id: place.organisation_id }, "id,name,kind,address,phone,hours,lat,lng,listed_publicly,area_id", 1), `nx-org:${place.organisation_id}`);
  if (o.loading && !o.data) return <Opening ws="health" crumb={["Facilities", "Our services"]} />;
  if (o.error) return <Shell ws="health" crumb={["Facilities", "Our services"]}><div className="nx-page"><Failed error={o.error} retry={o.reload} /></div></Shell>;
  const org = o.data?.[0] ?? { id: place.organisation_id, name: place.name, kind: place.kind, address: null, phone: null, hours: null, lat: null, lng: null, listed_publicly: false, area_id: null };
  return <View sample={false} place={place} org={org} reloadOrg={o.reload} />;
}

function View({ sample, place, org, reloadOrg }: { sample: boolean; place: Place | null; org: Org; reloadOrg?: () => void }) {
  const rows = useRead<Status[]>(() => select<Status>("oh_service_status", { organisation_id: org.id }, "organisation_id,service,status,note,verified_at,valid_until,verified_by_name", 200), `nx-svc:${org.id}`, !sample);
  const [open, setOpen] = useState<string | null>(null);
  const offered = OFFERED[org.kind] ?? [];
  const all = sample ? SAMPLE_STATUS : rows.data ?? [];
  const latest = (svc: string) => all.filter((r) => r.service === svc).sort((a, b) => b.verified_at.localeCompare(a.verified_at))[0];
  const state = (svc: string) => { const r = latest(svc); const expired = !!r && Date.parse(r.valid_until) < Date.now(); return { r, expired, st: !r ? null : expired ? "not_verified" : r.status }; };
  const stale = offered.filter((s) => { const x = state(s); return !x.st || x.st === "not_verified"; }).length;
  const details = sample || can(place, "manage") || can(place, "invite");
  return (
    <Shell ws="health" crumb={["Facilities", "Our services"]}>
      <div className="nx-page" style={{ maxWidth: 880 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{org.name}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Our services</h1>
          <p className="nx-sub">{!sample && !rows.data ? "Reading what was confirmed…" : stale ? <><b className="num">{stale}</b> of {offered.length} {stale === 1 ? "service needs" : "services need"} confirming. </> : "Every service is confirmed. "}<About>A confirmation lasts up to a week. Patients, referring centres and the programme see it with its date.</About><GhMark /></p></div></div>
        {rows.error ? <Failed error={rows.error} retry={rows.reload} /> : !sample && !rows.data ? <Skeleton rows={3} /> : (
          <Block title="What we can provide">
            <ul className="gh-list">{offered.map((svc) => { const { r, expired, st } = state(svc); return (
              <li key={svc} style={{ gridTemplateColumns: open === svc ? "minmax(0, 1fr)" : undefined }}>
                <div><b>{SERVICE_LABEL[svc] ?? svc}</b><small>{!r ? "Never confirmed" : expired ? `Last confirmed ${ago(r.verified_at)}; it expired ${ago(r.valid_until)}` : `Confirmed ${fmtTime(r.verified_at)}${r.verified_by_name ? ` by ${r.verified_by_name}` : ""}; valid until ${fmtTime(r.valid_until)}`}{r?.note && !expired ? ` · ${r.note}` : ""}</small></div>
                {open === svc ? <ConfirmPane org={org.id} service={svc} onClose={() => setOpen(null)} onDone={() => { setOpen(null); rows.reload(); }} /> : (
                  <span className="gh-row-a"><Chip tone={tone(st)}>{st ? SERVICE_STATUS[st]?.label ?? st : "Not confirmed"}</Chip>{sample ? <TryLink sm>Confirm today</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setOpen(svc)}>Confirm today</button>}</span>)}
              </li>); })}</ul>
            <p className="nx-note" style={{ marginTop: 12 }}><Info size={13} /><span>A confirmation is what a person here says is available. StrayPaw is not connected to any stock or supply system, and it does not say the facility is open at this moment.</span></p>
          </Block>)}
        {details ? <Details sample={sample} org={org} onSaved={() => reloadOrg?.()} /> : null}
      </div>
    </Shell>
  );
}

function ConfirmPane({ org, service, onClose, onDone }: { org: string; service: string; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<"available" | "limited" | "unavailable">("available");
  const [note, setNote] = useState(""), [days, setDays] = useState<"1" | "3" | "7">("1");
  const { busy, run } = useAct();
  const save = async () => { const r = await run(`svc:${service}`, () => call<{ alerted: number }>("oh_verify_service", { p_org: org, p_service: service, p_status: status, p_note: note.trim() || null, p_valid_days: Number(days) }), { ok: (x) => ((x as { data?: { alerted?: number } | null }).data?.alerted ? "Confirmed. Programme coordination has been told about the gap, so people can be referred." : "Confirmed. The public finder shows it now, with today's date.") }); if (r.ok) onDone(); };
  return (
    <div className="gh-pane" role="group" aria-label={`Confirm ${SERVICE_LABEL[service] ?? service}`}>
      <Seg name={`st-${service}`} label="What can you provide today?" value={status} onChange={setStatus} options={[["available", "Available"], ["limited", "Limited"], ["unavailable", "Not available"]]} />
      <Field label="Note (optional)"><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={status === "available" ? "For example: mornings only" : "For example: supply expected Thursday"} /></Field>
      <div className="nx-field"><span>Valid for</span><Seg name={`d-${service}`} label="Valid for" value={days} onChange={setDays} options={[["1", "Today"], ["3", "3 days"], ["7", "A week"]]} /></div>
      {status !== "available" ? <p className="gh-hint">Programme coordination is told when a service is limited or not available.</p> : null}
      <div className="gh-acts"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void save()}>Confirm</button><button type="button" className="nx-btn is-sm is-quiet" onClick={onClose}>Cancel</button></div>
    </div>
  );
}

function Details({ sample, org, onSaved }: { sample: boolean; org: Org; onSaved: () => void }) {
  const areas = useRead<Area[]>(() => call("oh_org_areas", { p_org: org.id }), `nx-areas:${org.id}`, !sample);
  const [f, setF] = useState({ address: org.address ?? "", phone: org.phone ?? "", hours: org.hours ?? "", lat: org.lat, lng: org.lng, listed: org.listed_publicly, area: org.area_id ?? "" });
  const { busy, run } = useAct();
  const ok = !f.listed || (f.lat !== null && f.lng !== null);
  const save = async () => {
    const before = { p_org: org.id, p_address: org.address, p_phone: org.phone, p_hours: org.hours, p_lat: org.lat, p_lng: org.lng, p_listed: org.listed_publicly, p_area: org.area_id };
    const r = await run("org", () => call("oh_set_organisation", { p_org: org.id, p_address: f.address.trim() || null, p_phone: f.phone.trim() || null, p_hours: f.hours.trim() || null, p_lat: f.lat, p_lng: f.lng, p_listed: f.listed, p_area: f.area || null }), { ok: "Details saved.", undo: () => call("oh_set_organisation", before).then(() => onSaved()) });
    if (r.ok) onSaved();
  };
  return (
    <Block title="Our details" note="Shown to referring centres, and to the public when the facility is listed.">
      <div className="nx-fields gh-fields">
        <Field label="Address" wide><input value={f.address} maxLength={300} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label="Phone"><input type="tel" inputMode="tel" value={f.phone} maxLength={40} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Hours" hint="As usually kept. It is not a promise the facility is open now."><input value={f.hours} maxLength={200} onChange={(e) => setF({ ...f, hours: e.target.value })} placeholder="For example: Mon to Sat, 9 am to 4 pm" /></Field>
        <Field label="Area"><select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">Not set</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <GeoField lat={f.lat} lng={f.lng} onChange={(lat, lng) => setF((s) => ({ ...s, lat, lng }))} />
      </div>
      <label className="gh-tick" style={{ marginTop: 8 }}><input type="checkbox" checked={f.listed} onChange={(e) => setF({ ...f, listed: e.target.checked })} /><span>List this facility on the public bite-help finder</span></label>
      {!ok ? <p className="gh-hint">A listed facility needs its location.</p> : null}
      {f.phone ? <p className="gh-hint"><Phone size={11} /> Shown as {f.phone}.</p> : null}
      <div className="gh-acts" style={{ marginTop: 10 }}>{sample ? <TryLink sm>Save details</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy || !ok} onClick={() => void save()}>Save details</button>}</div>
    </Block>
  );
}
