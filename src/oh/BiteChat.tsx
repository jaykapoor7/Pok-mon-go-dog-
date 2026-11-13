"use client";

/* Bite help as a conversation: one short message at a time, answered with a
   tap. The steps are scripted, with the same reviewed wording the page had;
   nothing typed here is sent to an AI model, and nothing assesses a wound or
   recommends treatment. The optional notice goes to the programme exactly as
   the old form sent it. Location never leaves the device. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocateFixed, Send } from "lucide-react";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";

type Facility = { id: string; name: string; kind: string; area: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; services: { service: string; status: string; verified_at: string; valid_until: string }[]; refers: { service: string; to: string; to_id: string }[] };
type Pub = { programme: { name: string; illustrative: boolean; areas: { id: string; name: string }[] } | null; facilities: Facility[] };
type At = "emergency" | "urgent" | "care" | "when" | "date" | "area" | "animal" | "place" | "looks" | "call" | "phone" | "sending" | "done";
type Msg = { who: "bot" | "me"; body: ReactNode; tone?: "urgent" };

const tone: Record<string, string> = { green: "#1f7a4d", amber: "#a86a0c", flame: "#c23a22", "": "#6b7486" };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180, R = 6371;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export function BiteChat({ slug }: { slug: string | null }) {
  const [at, setAt] = useState<At>("emergency");
  const [log, setLog] = useState<Msg[]>([
    { who: "bot", body: <><b>Wash the wound now.</b> Soap and running water, for at least 15 minutes.</> },
    { who: "bot", body: <>Is any of this true?<ul><li>Heavy bleeding, or a deep wound</li><li>Several bites, or bites on the face, head, neck or hands</li><li>A young child, or someone unwell or unable to care for themselves</li></ul></> },
  ]);
  const [f, setF] = useState({ on: today(), area: "", place: "", species: "dog", animal: "", phone: "" });
  const [text, setText] = useState(""), [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const say = (me: ReactNode | null, ...bot: Msg[]) => setLog((l) => [...l, ...(me ? [{ who: "me" as const, body: me }] : []), ...bot]);
  useEffect(() => { if (log.length > 2) end.current?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [log.length, at]);

  const care = (me: string) => { say(me, { who: "bot", body: <><b>See a doctor today,</b> even if the wound looks small or the animal seemed healthy. The doctor decides on vaccine.</> }, { who: "bot", body: slug ? <Centres slug={slug} /> : <>Go to the nearest government hospital. Verified centres will be listed here once the health department confirms them.</> }); setAt("care"); };
  const send = async (phone: string | null) => {
    setAt("sending"); setErr(null);
    const r = await call<{ facility: { name: string; hours: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on, p_area: f.area || null, p_place: f.place || null, p_species: f.species, p_animal_description: f.animal || null, p_phone: phone, p_consent: !!phone, p_lat: null, p_lng: null });
    if (r.error) { setErr(r.error); setAt("call"); return; }
    const to = r.data?.facility ?? { name: "the programme", hours: null };
    say(null, { who: "bot", body: <><b>Sent to {to.name}</b>{to.hours ? ` (${to.hours})` : ""}. This is not an appointment: still see a doctor today.</> }); setAt("done");
  };
  const ask = (q: ReactNode, next: At, me: ReactNode) => { say(me, { who: "bot", body: q }); setText(""); setAt(next); };
  const pub = useRead<Pub>(() => (slug ? call<Pub>("oh_public_services", { p_programme_slug: slug }) : Promise.resolve({ data: null, error: null })), `pub:${slug}`);
  const areas = pub.data?.programme?.areas ?? [];

  const chips = (items: [string, () => void][]) => <div className="bc-chips">{items.map(([l, go]) => <button key={l} type="button" onClick={go}>{l}</button>)}</div>;
  const typed = (label: string, placeholder: string, onDone: (v: string) => void, opts?: { type?: string; skip?: boolean }) => (
    <form className="bc-type" onSubmit={(e) => { e.preventDefault(); if (text.trim() || opts?.skip !== false) onDone(text.trim()); }}>
      <input aria-label={label} type={opts?.type ?? "text"} inputMode={opts?.type === "tel" ? "tel" : undefined} pattern={opts?.type === "tel" ? "[0-9+ ]{8,16}" : undefined} required={opts?.skip === false} value={text} maxLength={200} placeholder={placeholder} onChange={(e) => setText(e.target.value)} autoFocus />
      {opts?.skip !== false && !text.trim() ? <button type="submit" className="is-quiet">Skip</button> : <button type="submit" aria-label="Send"><Send size={16} aria-hidden /></button>}
    </form>);

  const reply = at === "emergency" ? chips([["Yes", () => { say("Yes", { who: "bot", tone: "urgent", body: <><b>Get emergency help now.</b> Call <a href="tel:108">108</a> for an ambulance, or <a href="tel:112">112</a>.</> }); setAt("urgent"); }], ["No, none of these", () => care("No, none of these")]])
    : at === "urgent" ? chips([["Where can I go?", () => care("Where can I go?")]])
    : at === "care" ? (slug ? chips([["Tell the programme about the animal", () => ask("When did it happen?", "when", "Tell the programme about the animal")], ["What should I not do?", () => say("What should I not do?", { who: "bot", body: <>Do not<ul><li>put chilli, turmeric, oil, lime, herbs or any home remedy on the wound</li><li>wait to see whether the animal becomes ill</li><li>try to catch, hurt or kill the animal</li></ul></> })]]) : null)
    : at === "when" ? chips([["Today", () => { setF({ ...f, on: today() }); ask("Which area?", "area", "Today"); }], ["Yesterday", () => { setF({ ...f, on: daysAgo(1) }); ask("Which area?", "area", "Yesterday"); }], ["Earlier", () => setAt("date")]])
    : at === "date" ? <form className="bc-type" onSubmit={(e) => { e.preventDefault(); ask("Which area?", "area", f.on); }}><input type="date" aria-label="The date it happened" value={f.on} min={daysAgo(30)} max={today()} onChange={(e) => setF({ ...f, on: e.target.value })} required /><button type="submit" aria-label="Send"><Send size={16} aria-hidden /></button></form>
    : at === "area" ? chips([...areas.map((a): [string, () => void] => [a.name, () => { setF({ ...f, area: a.id }); ask("What animal was it?", "animal", a.name); }]), ["Not sure", () => ask("What animal was it?", "animal", "Not sure")]])
    : at === "animal" ? chips(Object.entries(SPECIES).map(([k, v]): [string, () => void] => [v, () => { setF({ ...f, species: k }); ask("Where did it happen? A landmark or street.", "place", v); }]))
    : at === "place" ? typed("Where it happened", "Landmark or street", (v) => { setF({ ...f, place: v }); ask("What did the animal look like?", "looks", v || "Skip"); })
    : at === "looks" ? typed("What the animal looked like", "Colour, size, collar", (v) => { setF({ ...f, animal: v }); ask("May a clinic call you about this?", "call", v || "Skip"); })
    : at === "call" ? chips([["Yes, call me", () => ask("Your phone number?", "phone", "Yes, call me")], ["No, just send it", () => { say("No, just send it"); void send(null); }]])
    : at === "phone" ? typed("Phone", "Phone number", (v) => { say(v); void send(v); }, { type: "tel", skip: false })
    : at === "sending" ? <p className="bc-wait" role="status">Sending…</p> : null;

  return (
    <section className="bc" aria-label="Help after a bite">
      <ol className="bc-log" aria-live="polite">
        {log.map((m, i) => <li key={i} className={`bc-m is-${m.who}${m.tone ? ` is-${m.tone}` : ""}`}>{m.body}</li>)}
      </ol>
      {err ? <p className="bc-err" role="alert">{err}</p> : null}
      <div className="bc-reply">{reply}</div>
      <div ref={end} />
    </section>
  );
}

/* Where to go: the centres the programme lists publicly, nearest first when the person shares their location. */
function Centres({ slug }: { slug: string }) {
  const pub = useRead<Pub>(() => call<Pub>("oh_public_services", { p_programme_slug: slug }), `pub:${slug}`);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");
  const [need, setNeed] = useState<"any" | "arv" | "wound_care">("any");
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const x = (pub.data?.facilities ?? []).filter((c) => need === "any" || c.services.some((s) => s.service === need && s.status === "available"));
    return x.map((c) => ({ ...c, d: me && c.lat !== null && c.lng !== null ? km(me, { lat: c.lat, lng: c.lng }) : null })).sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
  }, [pub.data, me, need]);
  const locate = () => {
    if (!navigator.geolocation) { setLocating("denied"); return; }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition((p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating("idle"); }, () => setLocating("denied"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  };
  if (pub.loading && !pub.data) return <>Finding centres…</>;
  if (pub.error || !pub.data?.programme) return <>Go to the nearest government hospital. The list of centres could not be loaded just now.</>;
  const shown = all ? list : list.slice(0, 3);
  return (
    <div className="bc-centres">
      {pub.data.programme.illustrative ? <p className="bc-demo" role="note"><b>Demonstration.</b> These centres are invented. Do not travel to them.</p> : null}
      <div className="bc-tools">
        <button type="button" onClick={locate} disabled={locating === "busy"}><LocateFixed size={16} aria-hidden />{me ? "Nearest first" : locating === "busy" ? "Finding you…" : "Show nearest first"}</button>
        <label><span>I need</span><select value={need} onChange={(e) => setNeed(e.target.value as typeof need)}><option value="any">Any centre</option><option value="wound_care">Wound washing now</option><option value="arv">Anti-rabies vaccine</option></select></label>
      </div>
      {locating === "denied" ? <small>Location is off. The list is in name order.</small> : null}
      {!list.length ? <p>No centre has confirmed that service recently. Go to the nearest government hospital.</p> : (
        <ul className="bc-list">
          {shown.map((c) => (
            <li key={c.id}>
              <h3>{c.name}{c.d !== null ? <span>{c.d < 1 ? "under 1 km" : `${c.d.toFixed(1)} km`}</span> : null}</h3>
              <p>{[c.area, c.hours].filter(Boolean).join(" · ")}{c.phone && /\d/.test(c.phone) ? <> · <a href={`tel:${c.phone.replace(/\s/g, "")}`}>Call</a></> : null}{c.lat !== null && c.lng !== null ? <> · <a href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`} target="_blank" rel="noopener noreferrer">Map</a></> : null}</p>
              <ul>
                {["wound_care", "arv", "rig"].filter((s) => s !== "rig" || c.services.some((x) => x.service === "rig") || c.refers.some((r) => r.service === "rig")).map((s) => {
                  const v = c.services.find((x) => x.service === s), ref = c.refers.find((r) => r.service === s);
                  const st = v?.status ?? (ref ? "refers" : "not_verified"), k = SERVICE_STATUS[st] ?? { label: "Refers elsewhere", tone: "" };
                  return <li key={s}><span>{SERVICE_LABEL[s]}</span><b style={{ color: tone[k.tone] }}>{k.label}</b>{st === "not_verified" && v ? <small>last confirmed {relDay(v.verified_at).toLowerCase()}</small> : ref ? <small>go to {ref.to}</small> : null}</li>;
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {list.length > 3 && !all ? <button type="button" className="bc-more" onClick={() => setAll(true)}>Show all {list.length} centres</button> : null}
    </div>
  );
}
