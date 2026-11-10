"use client";

/* For the public bite-help page: where to go (facilities and their latest
   confirmed services) and an optional notice to the programme. Nothing here
   assesses a wound or recommends treatment. */
import { useState, type FormEvent } from "react";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";

type Facility = { id: string; name: string; kind: string; ward: string | null; address: string | null; phone: string | null; hours: string | null; services: { service: string; status: string; verified_at: string; valid_until: string }[] };
type Pub = { programme: { name: string; city: string; illustrative: boolean; wards: string[] } | null; facilities: Facility[] };

const tone: Record<string, string> = { green: "#1f7a4d", amber: "#a86a0c", flame: "#c23a22", "": "#6b7486" };

export function BiteFinder({ slug }: { slug: string }) {
  const pub = useRead<Pub>(() => call<Pub>("oh_public_services", { p_programme_slug: slug }), `pub:${slug}`);
  if (pub.loading && !pub.data) return <p>Loading the list of centres…</p>;
  if (pub.error || !pub.data?.programme) return <p>Go to the nearest government hospital. The list of verified centres could not be loaded just now.</p>;
  const { programme, facilities } = pub.data;
  return (
    <div className="bf">
      {programme.illustrative ? <p className="bh-proto" role="note"><b>Illustrative demonstration.</b> These centres and their services are invented for the demo. Do not travel to them.</p> : null}
      <p>Centres in the {programme.name}. Each service shows what the centre itself last confirmed; an expired confirmation shows as <b>not verified</b>. Call ahead if you can.</p>
      <ul className="bf-list">
        {facilities.map((f) => (
          <li key={f.id} className="bf-item">
            <h3>{f.name}</h3>
            <p className="bf-meta">{[f.ward, f.address, f.hours].filter(Boolean).join(" · ")}{f.phone && /\d/.test(f.phone) ? <> · <a href={`tel:${f.phone.replace(/\s/g, "")}`}>{f.phone}</a></> : null}</p>
            <ul className="bf-svc">
              {["arv", "rig", "wound_care"].map((s) => {
                const v = f.services.find((x) => x.service === s), st = v?.status ?? "not_verified", c = SERVICE_STATUS[st];
                return <li key={s}><span>{SERVICE_LABEL[s]}</span><b style={{ color: tone[c.tone] }}>{c.label}</b>{v ? <small>{st === "not_verified" ? "last confirmed" : "confirmed"} {relDay(v.verified_at).toLowerCase()}</small> : null}</li>;
              })}
            </ul>
          </li>
        ))}
      </ul>
      <Notice slug={slug} wards={programme.wards} />
    </div>
  );
}

function Notice({ slug, wards }: { slug: string; wards: string[] }) {
  const [f, setF] = useState({ on: today(), ward: "", place: "", species: "dog", animal: "", phone: "", consent: false });
  const [busy, setBusy] = useState(false), [done, setDone] = useState<{ name: string; hours: string | null } | null>(null), [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ facility: { name: string; hours: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on, p_ward: f.ward || null, p_place: f.place || null, p_species: f.species, p_animal_description: f.animal || null, p_phone: f.consent ? f.phone : null, p_consent: f.consent });
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
        <label><span>Area</span><select value={f.ward} onChange={(e) => setF({ ...f, ward: e.target.value })}><option value="">Not sure</option>{wards.map((w) => <option key={w}>{w}</option>)}</select></label>
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
