"use client";

/* For the public bite-help page: where to go now. Centres the programme
   lists publicly, nearest first when the person shares their location, each
   with what the centre itself last confirmed and where it sends people for
   what it lacks. An optional notice tells the programme. Nothing here
   assesses a wound or recommends treatment. Location never leaves the device. */
import { useMemo, useState, type FormEvent } from "react";
import { LocateFixed } from "lucide-react";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";

type Facility = { id: string; name: string; kind: string; area: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; services: { service: string; status: string; verified_at: string; valid_until: string }[]; refers: { service: string; to: string; to_id: string }[] };
type Pub = { programme: { name: string; illustrative: boolean; areas: { id: string; name: string }[] } | null; facilities: Facility[] };

const tone: Record<string, string> = { green: "#1f7a4d", amber: "#a86a0c", flame: "#c23a22", "": "#6b7486" };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180, R = 6371;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export function BiteFinder({ slug }: { slug: string }) {
  const pub = useRead<Pub>(() => call<Pub>("oh_public_services", { p_programme_slug: slug }), `pub:${slug}`);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");
  const [need, setNeed] = useState<"any" | "arv" | "wound_care">("any");
  const list = useMemo(() => {
    const f = (pub.data?.facilities ?? []).filter((x) => need === "any" || x.services.some((s) => s.service === need && s.status === "available"));
    return f.map((x) => ({ ...x, d: me && x.lat !== null && x.lng !== null ? km(me, { lat: x.lat, lng: x.lng }) : null })).sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
  }, [pub.data, me, need]);
  const locate = () => {
    if (!navigator.geolocation) { setLocating("denied"); return; }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition((p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating("idle"); }, () => setLocating("denied"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  };
  if (pub.loading && !pub.data) return <p>Loading the list of centres…</p>;
  if (pub.error || !pub.data?.programme) return <p>Go to the nearest government hospital. The list of centres could not be loaded just now.</p>;
  const { programme } = pub.data;
  return (
    <div className="bf">
      {programme.illustrative ? <p className="bh-proto" role="note"><b>Illustrative demonstration.</b> These centres and their services are invented for the demo. Do not travel to them.</p> : null}
      <p>Centres in the {programme.name}. Each service shows what the centre itself last confirmed; an old confirmation shows as <b>not confirmed recently</b>. Call ahead if you can.</p>
      <div className="bf-tools">
        <button type="button" className="bf-locate" onClick={locate} disabled={locating === "busy"}><LocateFixed size={16} aria-hidden />{me ? "Nearest first" : locating === "busy" ? "Finding you…" : "Show nearest first"}</button>
        <label className="bf-need"><span>I need</span><select value={need} onChange={(e) => setNeed(e.target.value as typeof need)}><option value="any">Any centre</option><option value="wound_care">Wound washing now</option><option value="arv">Anti-rabies vaccine</option></select></label>
        {locating === "denied" ? <small>Location is off. The list is in name order.</small> : me ? <small>Your location stays on this phone.</small> : null}
      </div>
      {!list.length ? <p>No centre has confirmed that service recently. Go to the nearest government hospital.</p> : (
        <ul className="bf-list">
          {list.map((f) => (
            <li key={f.id} className="bf-item">
              <h3>{f.name}{f.d !== null ? <span className="bf-km">{f.d < 1 ? "under 1 km" : `${f.d.toFixed(1)} km`}</span> : null}</h3>
              <p className="bf-meta">{[f.area, f.address, f.hours].filter(Boolean).join(" · ")}{f.phone && /\d/.test(f.phone) ? <> · <a href={`tel:${f.phone.replace(/\s/g, "")}`}>{f.phone}</a></> : null}{f.lat !== null && f.lng !== null ? <> · <a href={`https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=17/${f.lat}/${f.lng}`} target="_blank" rel="noopener noreferrer">Map</a></> : null}</p>
              <ul className="bf-svc">
                {["wound_care", "arv", "rig"].filter((s) => s !== "rig" || f.services.some((x) => x.service === "rig") || f.refers.some((r) => r.service === "rig")).map((s) => {
                  const v = f.services.find((x) => x.service === s), ref = f.refers.find((r) => r.service === s);
                  const st = v?.status ?? (ref ? "refers" : "not_verified"), c = SERVICE_STATUS[st] ?? { label: "Refers elsewhere", tone: "" };
                  return <li key={s}><span>{SERVICE_LABEL[s]}</span><b style={{ color: tone[c.tone] }}>{c.label}</b>{v ? <small>{st === "not_verified" ? "last confirmed" : "confirmed"} {relDay(v.verified_at).toLowerCase()}</small> : ref ? <small>refers to {ref.to}</small> : null}</li>;
                })}
              </ul>
              {f.refers.length ? <p className="bf-meta">Sends people to {[...new Set(f.refers.map((r) => r.to))].join(", ")} for {[...new Set(f.refers.map((r) => SERVICE_LABEL[r.service].toLowerCase()))].join(" and ")}.</p> : null}
            </li>
          ))}
        </ul>
      )}
      <Notice slug={slug} areas={programme.areas} />
    </div>
  );
}

function Notice({ slug, areas }: { slug: string; areas: { id: string; name: string }[] }) {
  const [f, setF] = useState({ on: today(), area: "", place: "", species: "dog", animal: "", phone: "", consent: false });
  const [busy, setBusy] = useState(false), [done, setDone] = useState<{ name: string; hours: string | null } | null>(null), [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ facility: { name: string; hours: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on, p_area: f.area || null, p_place: f.place || null, p_species: f.species, p_animal_description: f.animal || null, p_phone: f.consent ? f.phone : null, p_consent: f.consent, p_lat: null, p_lng: null });
    setBusy(false);
    if (r.error) setErr(r.error); else setDone(r.data?.facility ?? { name: "the programme", hours: null });
  };
  if (done) return <div className="bf-done" role="status"><h3>Thank you. The programme has your notice.</h3><p>It has gone to <b>{done.name}</b>{done.hours ? ` (${done.hours})` : ""}. This is not an appointment: please still go to a hospital or anti-rabies clinic today.</p></div>;
  return (
    <form className="bf-form" onSubmit={submit}>
      <h3>Tell the programme about a bite</h3>
      <p>Optional. It helps the local team find the animal and lets a clinic call you. It is not a medical record and does not replace seeing a doctor.</p>
      <div className="bf-grid">
        <label><span>When</span><input type="date" value={f.on} min={new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)} max={today()} onChange={(e) => setF({ ...f, on: e.target.value })} required /></label>
        <label><span>Area</span><select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">Not sure</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label><span>Animal</span><select value={f.species} onChange={(e) => setF({ ...f, species: e.target.value })}>{Object.entries(SPECIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label><span>Where it happened</span><input value={f.place} maxLength={200} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="Landmark or street" /></label>
        <label className="wide"><span>What the animal looked like</span><input value={f.animal} maxLength={300} onChange={(e) => setF({ ...f, animal: e.target.value })} placeholder="Colour, size, collar" /></label>
      </div>
      <label className="bf-check"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /><span>A clinic may call me about this.</span></label>
      {f.consent ? <label className="bf-phone"><span>Phone</span><input type="tel" inputMode="tel" value={f.phone} pattern="[0-9+ ]{8,16}" onChange={(e) => setF({ ...f, phone: e.target.value })} required /></label> : null}
      {err ? <p className="bf-err" role="alert">{err}</p> : null}
      <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send notice"}</button>
      <p className="bf-small">Seen only by staff at the receiving clinic. Your phone is stored only if you tick the box.</p>
    </form>
  );
}
