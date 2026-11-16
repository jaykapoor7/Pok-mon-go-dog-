"use client";

/* Bite help as a conversation: one short message at a time. First aid comes first, always. Then the person can tell
   Kaju what happened in their own words, typed or spoken: Kaju picks out the fields a clinic needs with fixed rules
   on the device (src/oh/biteIntake.ts), shows what it understood, and asks only for what is missing. The danger-sign
   question, the first aid and the advice to see a doctor are the same reviewed steps as before; nothing here
   assesses a wound or recommends treatment, and no AI model reads anything. The person confirms the notice before it
   is sent, exactly as the old form sent it. Location never leaves the device. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, LocateFixed, Mic, MicOff, Send, Sparkles } from "lucide-react";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";
import { readBite, type BiteDraft } from "./biteIntake";

type Facility = { id: string; name: string; kind: string; area: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; services: { service: string; status: string; verified_at: string; valid_until: string }[]; refers: { service: string; to: string; to_id: string }[] };
type Pub = { programme: { name: string; illustrative: boolean; areas: { id: string; name: string }[] } | null; facilities: Facility[] };
type At = "tell" | "emergency" | "urgent" | "care" | "when" | "date" | "area" | "animal" | "looks" | "place" | "call" | "phone" | "review" | "sending" | "done";
type Msg = { who: "bot" | "me"; body: ReactNode; tone?: "urgent" };
type Form = { on: string; area: string; place: string; species: string; animal: string; phone: string };

const tone: Record<string, string> = { green: "#1f7a4d", amber: "#a86a0c", flame: "#c23a22", "": "#6b7486" };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180, R = 6371;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
/** The words the guided demo offers with one click, when speaking is not possible. */
export const BITE_EXAMPLE = "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance.";
export const LOOKS_EXAMPLE = "Brown dog, no collar, usually near the bus stop on 100 Feet Road";
const dayWord = (iso: string) => iso === today() ? "Today" : iso === daysAgo(1) ? "Yesterday" : new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const WHO: Record<string, string> = { self: "You", someone: "Someone else", child: "A child" };
const ASKED: Record<string, string> = { when: "when it happened", where: "the area", animal: "which animal", looks: "what the animal looked like", danger: "danger signs" };

export function BiteChat({ slug }: { slug: string | null }) {
  const [at, setAt] = useState<At>("tell");
  const [log, setLog] = useState<Msg[]>([
    { who: "bot", body: <><b>Wash the wound now.</b> Soap and running water, for at least 15 minutes.</> },
    { who: "bot", body: <>Tell me what happened, in your own words. Type it or speak it: I will pick out what the clinic needs and ask for the rest.</> },
  ]);
  const [f, setF] = useState<Form>({ on: today(), area: "", place: "", species: "dog", animal: "", phone: "" });
  const [draft, setDraft] = useState<BiteDraft | null>(null);
  /* Fields the person has given, in their own words or by answering. Kaju asks only for the others. */
  const known = useRef<Set<"when" | "area" | "animal" | "looks" | "place">>(new Set());
  const [text, setText] = useState(""), [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const say = (me: ReactNode | null, ...bot: Msg[]) => setLog((l) => [...l, ...(me ? [{ who: "me" as const, body: me }] : []), ...bot]);
  useEffect(() => { if (log.length > 2) end.current?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [log.length, at]);
  const pub = useRead<Pub>(() => (slug ? call<Pub>("oh_public_services", { p_programme_slug: slug }) : Promise.resolve({ data: null, error: null })), `pub:${slug}`);
  const areas = pub.data?.programme?.areas ?? [];
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? null;

  const danger = (pre: ReactNode | null) => ({ who: "bot" as const, body: <>{pre}Is any of this true?<ul><li>Heavy bleeding, or a deep wound</li><li>Several bites, or bites on the face, head, neck or hands</li><li>A young child, or someone unwell or unable to care for themselves</li></ul></> });
  /* The person's own words, read by Kaju. */
  const tell = (words: string) => {
    const w = words.trim();
    if (!w) return;
    const d = readBite(w, areas);
    setDraft(d); setText("");
    const next = { ...f };
    if (d.on) { next.on = d.on; known.current.add("when"); }
    if (d.area) { next.area = d.area.id; known.current.add("area"); }
    if (d.species) { next.species = d.species; known.current.add("animal"); }
    if (d.looks) { next.animal = d.looks; known.current.add("looks"); }
    if (d.place) { next.place = d.place; known.current.add("place"); }
    setF(next);
    say(w, { who: "bot", body: <Understood d={d} /> }, danger(d.signs.length ? <>You mentioned {d.signs.join(", ")}. </> : null));
    setAt("emergency");
  };
  const care = (me: string) => { say(me, { who: "bot", body: <><b>See a doctor today,</b> even if the wound looks small or the animal seemed healthy. The doctor decides on vaccine.</> }, { who: "bot", body: slug ? <Centres slug={slug} /> : <>Go to the nearest government hospital. Verified centres will be listed here once the health department confirms them.</> }); setAt("care"); };
  /* What to ask next: only what the person has not told Kaju yet. */
  const QUESTION: Record<string, ReactNode> = { when: "When did it happen?", area: "Which area?", animal: "What animal was it?", looks: "What did the animal look like? Colour, size, a collar, any marks.", place: "Where can it be found? A landmark or street.", call: "May a clinic call you about this?" };
  const nextOf = (after: At, k: Set<string>): At => {
    const order: At[] = ["when", "area", "animal", "looks", "place", "call"];
    for (const s of order.slice(order.indexOf(after) + 1)) if (s === "call" || !k.has(s)) return s;
    return "call";
  };
  const askNext = (after: At, me: ReactNode, k = known.current) => { const n = nextOf(after, k); setText(""); say(me, { who: "bot", body: QUESTION[n] }); setAt(n); };
  const answered = (key: "when" | "area" | "animal" | "looks" | "place") => known.current.add(key);
  const review = (me: ReactNode | null, phone: string | null) => { say(me, { who: "bot", body: <Review f={f} phone={phone} areaName={areaName(f.area)} draft={draft} /> }); setF((x) => ({ ...x, phone: phone ?? "" })); setAt("review"); };
  const send = async () => {
    setAt("sending"); setErr(null);
    const phone = f.phone.trim() || null;
    const r = await call<{ facility: { name: string; hours: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on, p_area: f.area || null, p_place: f.place || null, p_species: f.species, p_animal_description: f.animal || null, p_phone: phone, p_consent: !!phone, p_lat: null, p_lng: null });
    if (r.error) { setErr(r.error); setAt("review"); return; }
    const to = r.data?.facility ?? { name: "the programme", hours: null };
    setSentTo(to.name);
    say("Send the notice", { who: "bot", body: <span data-tour="bite-sent"><b>Sent to {to.name}</b>{to.hours ? ` (${to.hours})` : ""}. This is not an appointment: still see a doctor today.</span> }); setAt("done");
  };

  const chips = (items: [string, () => void][]) => <div className="bc-chips">{items.map(([l, go]) => <button key={l} type="button" onClick={go}>{l}</button>)}</div>;
  const typed = (label: string, placeholder: string, onDone: (v: string) => void, opts?: { type?: string; skip?: boolean; example?: string }) => (
    <form className="bc-type" data-tour="bite-answer" onSubmit={(e) => { e.preventDefault(); if (text.trim() || opts?.skip !== false) onDone(text.trim()); }}>
      <input aria-label={label} type={opts?.type ?? "text"} inputMode={opts?.type === "tel" ? "tel" : undefined} pattern={opts?.type === "tel" ? "[0-9+ ]{8,16}" : undefined} required={opts?.skip === false} value={text} maxLength={200} placeholder={placeholder} onChange={(e) => setText(e.target.value)} autoFocus data-example={opts?.example} />
      {opts?.skip !== false && !text.trim() ? <button type="submit" className="is-quiet">Skip</button> : <button type="submit" aria-label="Send"><Send size={16} aria-hidden /></button>}
    </form>);

  /* Kaju matches the area against the programme's own list, so the report waits for it (a second at most). */
  const areasReady = !slug || !!pub.data || !!pub.error;
  const reply = at === "tell" ? <Tell ready={areasReady} text={text} setText={setText} onTell={tell} onSteps={() => { say("Answer step by step", danger(null)); setAt("emergency"); }} />
    : at === "emergency" ? chips([["Yes", () => { say("Yes", { who: "bot", tone: "urgent", body: <><b>Get emergency help now.</b> Call <a href="tel:108">108</a> for an ambulance, or <a href="tel:112">112</a>.</> }); setAt("urgent"); }], ["No, none of these", () => care("No, none of these")]])
    : at === "urgent" ? chips([["Where can I go?", () => care("Where can I go?")]])
    : at === "care" ? (slug ? chips([["Tell the programme about the animal", () => askNext("care", "Tell the programme about the animal")], ["What should I not do?", () => say("What should I not do?", { who: "bot", body: <>Do not<ul><li>put chilli, turmeric, oil, lime, herbs or any home remedy on the wound</li><li>wait to see whether the animal becomes ill</li><li>try to catch, hurt or kill the animal</li></ul></> })]]) : null)
    : at === "when" ? chips([["Today", () => { setF({ ...f, on: today() }); answered("when"); askNext("when", "Today"); }], ["Yesterday", () => { setF({ ...f, on: daysAgo(1) }); answered("when"); askNext("when", "Yesterday"); }], ["Earlier", () => setAt("date")]])
    : at === "date" ? <form className="bc-type" onSubmit={(e) => { e.preventDefault(); answered("when"); askNext("when", f.on); }}><input type="date" aria-label="The date it happened" value={f.on} min={daysAgo(30)} max={today()} onChange={(e) => setF({ ...f, on: e.target.value })} required /><button type="submit" aria-label="Send"><Send size={16} aria-hidden /></button></form>
    : at === "area" ? chips([...areas.map((a): [string, () => void] => [a.name, () => { setF({ ...f, area: a.id }); answered("area"); askNext("area", a.name); }]), ["Not sure", () => { answered("area"); askNext("area", "Not sure"); }]])
    : at === "animal" ? chips(Object.entries(SPECIES).map(([k, v]): [string, () => void] => [v, () => { setF({ ...f, species: k }); answered("animal"); askNext("animal", v); }]))
    : at === "looks" ? typed("What the animal looked like", "Colour, size, collar, marks", (v) => {
        /* A landmark said with the description ("…near the bus stop") answers the next question too. */
        const p = v ? readBite(v, areas).place : null;
        setF({ ...f, animal: v, ...(p && !f.place ? { place: p } : {}) }); answered("looks"); if (p) answered("place");
        askNext("looks", v || "Skip");
      }, { example: LOOKS_EXAMPLE })
    : at === "place" ? typed("Where it can be found", "Landmark or street", (v) => { setF({ ...f, place: v }); answered("place"); askNext("place", v || "Skip"); })
    : at === "call" ? chips([["Yes, call me", () => { say("Yes, call me", { who: "bot", body: "Your phone number?" }); setText(""); setAt("phone"); }], ["No, just send it", () => review("No, just send it", null)]])
    : at === "phone" ? typed("Phone", "Phone number", (v) => review(v, v), { type: "tel", skip: false })
    : at === "review" ? <div className="bc-chips" data-tour="bite-review-acts"><button type="button" className="is-go" onClick={() => void send()}><Check size={16} aria-hidden /> Send the notice</button><button type="button" onClick={() => { setDraft(null); known.current = new Set(); setF({ on: today(), area: "", place: "", species: "dog", animal: "", phone: "" }); say("Start again", { who: "bot", body: <>Tell me what happened, in your own words.</> }); setAt("tell"); }}>Start again</button></div>
    : at === "sending" ? <p className="bc-wait" role="status">Sending…</p> : null;

  return (
    <section className="bc" aria-label="Help after a bite" data-tour-state={at} data-sent-to={sentTo ?? undefined}>
      <ol className="bc-log" aria-live="polite">
        {log.map((m, i) => <li key={i} className={`bc-m is-${m.who}${m.tone ? ` is-${m.tone}` : ""}`}>{m.body}</li>)}
      </ol>
      {err ? <p className="bc-err" role="alert">{err}</p> : null}
      <div className="bc-reply">{reply}</div>
      <div ref={end} />
    </section>
  );
}

/* What Kaju understood from the person's words, field by field, with what it still needs. */
function Understood({ d }: { d: BiteDraft }) {
  const rows: [string, string | null][] = [
    ["What happened", d.kind ? ({ bite: "A bite", scratch: "A scratch", lick_broken_skin: "A lick on broken skin" } as Record<string, string>)[d.kind] : null],
    ["Animal", d.species ? `${SPECIES[d.species]}${d.ownership === "community" ? ", street or community" : d.ownership === "owned" ? ", someone's pet" : ""}` : null],
    ["Area", d.area?.name ?? null],
    ["Where", d.place],
    ["When", d.on ? `${dayWord(d.on)}${d.when ? ` (${d.when})` : ""}` : null],
    ["Who was hurt", d.person ? WHO[d.person] : null],
    ["Looking for", d.wantsCare ? "Medical help" : null],
  ];
  const still = d.missing.filter((m) => m !== "danger").map((m) => ASKED[m]);
  return (
    <div className="bk-read" data-tour="bite-understood">
      <p className="bk-h"><span className="bk-mark" aria-hidden><Sparkles size={12} /></span><b>What I understood</b><small>Read on this device, by fixed rules</small></p>
      <dl>{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="bk-still">{still.length ? <>Still needed: {still.join(", ")}. First, one safety question.</> : <>One safety question first.</>}</p>
    </div>
  );
}

/* The notice as it will be sent: the person checks it and presses Send. */
function Review({ f, phone, areaName, draft }: { f: Form; phone: string | null; areaName: string | null; draft: BiteDraft | null }) {
  return (
    <div className="bk-read is-review" data-tour="bite-review">
      <p className="bk-h"><span className="bk-mark" aria-hidden><Sparkles size={12} /></span><b>Your notice, ready to send</b><small>Check it first</small></p>
      <dl>
        <div><dt>When</dt><dd>{dayWord(f.on)}{draft?.when ? ` (${draft.when})` : ""}</dd></div>
        <div><dt>Area</dt><dd>{areaName ?? "Not given"}</dd></div>
        {f.place ? <div><dt>Where</dt><dd>{f.place}</dd></div> : null}
        <div><dt>Animal</dt><dd>{SPECIES[f.species] ?? f.species}</dd></div>
        <div><dt>Looked like</dt><dd>{f.animal || "Not given"}</dd></div>
        <div><dt>Call back</dt><dd>{phone ? `Yes, on ${phone}` : "No"}</dd></div>
      </dl>
      <p className="bk-still">It goes to the nearest anti-rabies centre in the programme, so they know before you arrive. Your name is not asked for.</p>
    </div>
  );
}

type Speech = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

/* The first answer: the person's own words, typed or spoken. Speaking uses the browser's own speech service. */
function Tell({ ready, text, setText, onTell, onSteps }: { ready: boolean; text: string; setText: (v: string) => void; onTell: (v: string) => void; onSteps: () => void }) {
  const [mic, setMic] = useState<"idle" | "on" | "none" | "denied" | "failed">("idle");
  const rec = useRef<Speech | null>(null);
  const base = useRef("");
  useEffect(() => () => rec.current?.abort(), []);
  const listen = () => {
    if (mic === "on") { rec.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) { setMic("none"); return; }
    const r = new SR();
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false;
    base.current = text ? `${text.trim()} ` : "";
    r.onresult = (e) => { let s = ""; for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; setText(`${base.current}${s}`.slice(0, 600)); };
    r.onerror = (e) => setMic(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" || e.error === "aborted" ? "idle" : "failed");
    r.onend = () => setMic((m) => (m === "on" ? "idle" : m));
    rec.current = r;
    try { r.start(); setMic("on"); } catch { setMic("failed"); }
  };
  const note = mic === "none" ? "Speaking is not available in this browser. Type instead, or use the example."
    : mic === "denied" ? "The microphone is blocked for this page. Allow it in the browser, or type instead."
      : mic === "failed" ? "Speech could not be turned into text just now. Type instead, or use the example." : null;
  return (
    <div className="bk-tell" data-tour="bite-tell">
      <form className="bk-box" onSubmit={(e) => { e.preventDefault(); if (ready) onTell(text); }}>
        <textarea aria-label="Tell Kaju what happened" rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: a stray dog bit my neighbour near the market this morning" data-example={BITE_EXAMPLE} />
        <div className="bk-acts">
          <button type="button" className={`bk-mic${mic === "on" ? " is-on" : ""}`} onClick={listen} aria-pressed={mic === "on"} aria-label={mic === "on" ? "Stop listening" : "Speak instead of typing"} data-tour="bite-mic">{mic === "denied" || mic === "none" ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}<span>{mic === "on" ? "Listening… tap to stop" : "Speak"}</span></button>
          <button type="button" className="bk-ex" onClick={() => setText(BITE_EXAMPLE)} data-tour="bite-example">Use an example</button>
          <button type="submit" className="bk-send" disabled={!text.trim() || !ready}><Send size={16} aria-hidden /> {ready ? "Tell Kaju" : "One moment…"}</button>
        </div>
      </form>
      <p className="bk-note" role={note ? "status" : undefined}>{note ?? <>Speaking uses your browser&apos;s speech service (in Chrome, Google&apos;s) to turn words into text, in English for now. Kaju reads the text on this device; nothing is sent until you confirm.</>}</p>
      <button type="button" className="bk-steps" onClick={onSteps}>Answer step by step instead</button>
    </div>
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
