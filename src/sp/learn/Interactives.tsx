"use client";

/* ════════════════════════════════════════════════════════════════════
   The Academy's exercises. Each one is self-contained, works by touch and
   keyboard, gives feedback for every choice, and reports completion to
   the lesson with onDone. None of them reads or writes the record.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { Interactive } from "./content";
import { POST_BITE_STEPS } from "./content";

type P = { onDone: () => void };

export function Exercise({ id, onDone }: { id: Interactive } & P) {
  switch (id) {
    case "unknown-ledger": return <UnknownLedger onDone={onDone} />;
    case "precision": return <Precision onDone={onDone} />;
    case "units": return <Quiz onDone={onDone} items={UNITS} />;
    case "encounter": return <Quiz onDone={onDone} items={ENCOUNTER} />;
    case "bite-order": return <Order onDone={onDone} />;
    case "observe": return <Sort onDone={onDone} />;
    case "simulation": return <Simulation onDone={onDone} />;
    case "denominator": return <Quiz onDone={onDone} items={DENOM} multi />;
    case "practice-report": return <Practice onDone={onDone} />;
  }
}

/* ── Unknown is not zero ───────────────────────────────────────────── */
type S = "yes" | "no" | "unk";
const STREET: S[] = ["yes", "unk", "unk", "no", "yes", "unk", "unk", "yes", "unk", "no", "unk", "yes", "unk", "unk", "yes", "unk", "no", "unk", "yes", "unk"];
function UnknownLedger({ onDone }: P) {
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"known" | "asno" | "honest">("honest");
  const y = STREET.filter((s) => s === "yes").length, n = STREET.filter((s) => s === "no").length, u = STREET.length - y - n;
  const all = seen.size === STREET.length;
  const reveal = (i: number) => { const x = new Set(seen); x.add(i); setSeen(x); if (x.size === STREET.length) onDone(); };
  return (
    <div className="ex ex-ledger">
      <p className="ex-hint">Tap each animal to read its record. {all ? "All read." : `${STREET.length - seen.size} left.`}</p>
      <p className="ex-tally mono" aria-live="polite">
        <span className="is-yes">✓ {[...seen].filter((i) => STREET[i] === "yes").length} sterilised</span>
        <span className="is-no">✕ {[...seen].filter((i) => STREET[i] === "no").length} not</span>
        <span className="is-unknown">? {[...seen].filter((i) => STREET[i] === "unk").length} not recorded</span>
      </p>
      <div className="ex-dogs" role="group" aria-label="Twenty animals on one street">
        {STREET.map((s, i) => (
          <button key={i} type="button" className={`ex-dog is-${seen.has(i) ? s : "closed"}`} onClick={() => reveal(i)} aria-label={seen.has(i) ? `Animal ${i + 1}: ${s === "yes" ? "sterilised" : s === "no" ? "not sterilised" : "not recorded"}` : `Animal ${i + 1}, tap to read`}>
            <span aria-hidden>{seen.has(i) ? (s === "yes" ? "✓" : s === "no" ? "✕" : "?") : i + 1}</span>
          </button>
        ))}
      </div>
      {all && (
        <div className="ex-out">
          <div className="seg" role="group" aria-label="How to treat blanks">
            <button type="button" aria-pressed={mode === "asno"} onClick={() => setMode("asno")}>Blanks as “no”</button>
            <button type="button" aria-pressed={mode === "known"} onClick={() => setMode("known")}>Only the known</button>
            <button type="button" aria-pressed={mode === "honest"} onClick={() => setMode("honest")}>Say all three</button>
          </div>
          {/* The same twenty records, drawn three ways: watch what the blanks become. */}
          <div className={`ex-bar is-${mode}`} aria-hidden>
            <i className="is-yes" style={{ flexGrow: y }} />
            <i className="is-no" style={{ flexGrow: n }} />
            <i className="is-unknown" style={{ flexGrow: mode === "known" ? 0.0001 : u }} />
          </div>
          <p className="ex-big serif">{mode === "asno" ? `${Math.round((y / STREET.length) * 100)}% sterilised` : mode === "known" ? `${Math.round((y / (y + n)) * 100)}% of those recorded` : `${y} sterilised · ${n} not · ${u} not recorded`}</p>
          <p className="ex-fb">{mode === "asno" ? "Misleading: twelve animals nobody checked are counted as unsterilised. The programme looks like it failed." : mode === "known" ? "True, but only about eight animals. Without saying so, it sounds like the whole street." : "Honest: the reader can see how much is known before trusting the share."}</p>
        </div>
      )}
    </div>
  );
}

/* ── Areas, not spots ──────────────────────────────────────────────── */
const LEVELS = [
  { k: "Exact point", r: 4, say: "Where this animal was seen. Kept private on StrayPaw: it could lead someone to an animal or to the person who feeds it.", can: "Route a rescuer (privately)" },
  { k: "Area (≈0.74 km²)", r: 34, say: "How many records fall in this area. This is what public maps show.", can: "Compare neighbourhoods" },
  { k: "Locality name", r: 70, say: "A neighbourhood someone named. Its edges are fuzzy, so dots inside it are schematic.", can: "Say “in Peelamedu”" },
  { k: "City only", r: 120, say: "Only the city is known, as in some clinical registers. It cannot describe any street.", can: "Count for the whole city" },
];
function Precision({ onDone }: P) {
  const [i, setI] = useState(1);
  const [visited, setVisited] = useState<Set<number>>(new Set([1]));
  const go = (k: number) => { setI(k); const x = new Set(visited); x.add(k); setVisited(x); if (x.size === LEVELS.length) onDone(); };
  const L = LEVELS[i];
  return (
    <div className="ex ex-prec">
      <svg viewBox="0 0 300 260" className="ex-map" role="img" aria-label={`Placed as: ${L.k}`}>
        <rect width="300" height="260" fill="#f3ede4" />
        {[40, 90, 140, 190, 240].map((x) => <line key={x} x1={x} y1="0" x2={x - 30} y2="260" stroke="#e1cfa8" strokeWidth="6" />)}
        <path d="M0 150 C 80 130, 160 170, 300 140" stroke="#9fc2d6" strokeWidth="10" fill="none" />
        <circle cx="150" cy="130" r={L.r} fill="#2457ce" fillOpacity={i === 0 ? 1 : 0.18} stroke="#0b1e3d" strokeWidth="1.5" strokeDasharray={i >= 2 ? "5 4" : undefined} style={{ transition: "r .4s var(--ease, ease)" }} />
        <circle cx={154} cy={126} r={L.r + 6} fill="none" stroke="#f05b40" strokeOpacity=".7" strokeWidth="1.2" style={{ transition: "r .4s var(--ease, ease)" }} />
      </svg>
      <div className="ex-side">
        <div className="ex-steps" role="group" aria-label="How the record was placed">
          {LEVELS.map((l, k) => <button key={l.k} type="button" aria-pressed={i === k} onClick={() => go(k)} className={visited.has(k) ? "is-seen" : ""}>{l.k}</button>)}
        </div>
        <p className="ex-fb">{L.say}</p>
        <p className="small"><b>Supports:</b> {L.can}</p>
      </div>
    </div>
  );
}

/* ── Multiple choice with feedback ─────────────────────────────────── */
type Q = { q: string; opts: { t: string; ok: boolean; why: string }[] };
const UNITS: Q[] = [
  { q: "“Kaalu was seen near the temple four times this month.”", opts: [{ t: "Sightings", ok: true, why: "Four sightings of one animal." }, { t: "Animals", ok: false, why: "It is one animal; the four are sightings." }, { t: "Requests", ok: false, why: "Nobody asked for help, so no request." }] },
  { q: "“The organisation answered 2,160 calls for help in Coimbatore.”", opts: [{ t: "Requests", ok: true, why: "Calls for help are requests (cases). Several can be about the same animal." }, { t: "Animals", ok: false, why: "Many calls are about the same dog, and some about dogs never recorded." }, { t: "Care events", ok: false, why: "Not every request led to treatment." }] },
  { q: "“2,242 animal profiles are on the record.”", opts: [{ t: "Unique animals in the city", ok: false, why: "Profiles are what was recorded. One animal can have two profiles, and most animals have none." }, { t: "Animal profiles", ok: true, why: "Exactly that: records of animals, not a census." }] },
  { q: "“423 care records in twelve months.”", opts: [{ t: "Care events", ok: true, why: "Vaccinations, treatments and procedures, each one an event." }, { t: "Animals treated", ok: false, why: "One animal may have several care events." }] },
];
const ENCOUNTER: Q[] = [
  { q: "A dog you don't know walks towards you, ears back and tail low.", opts: [{ t: "Stand still, turn slightly sideways and let it pass", ok: true, why: "Calm and still tells the dog you are no threat." }, { t: "Run past it quickly", ok: false, why: "Running can trigger a chase." }, { t: "Bend down and reach out to pet it", ok: false, why: "Reaching over an uneasy dog can feel like a threat." }] },
  { q: "A mother dog is lying with puppies under a parked car.", opts: [{ t: "Keep your distance and walk around", ok: true, why: "Mothers protect puppies. Distance keeps everyone safe." }, { t: "Move the puppies somewhere safer", ok: false, why: "Moving puppies upsets the mother and can separate the family. Ask a local organisation instead." }] },
  { q: "A dog is barking at you from a gateway.", opts: [{ t: "Stop, avoid staring, and step back slowly", ok: true, why: "Giving space and not staring lowers the tension." }, { t: "Shout and throw something", ok: false, why: "Hitting or threatening a dog makes it more defensive next time, for you and for others." }] },
  { q: "You see a dog limping badly and crying.", opts: [{ t: "Keep back, note the place, and call a rescue helpline or report it", ok: true, why: "Injured animals can bite from pain. Trained rescuers should handle them." }, { t: "Pick it up and carry it home", ok: false, why: "An animal in pain may bite. Report it and let rescuers help." }] },
];
const DENOM: Q[] = [
  { q: "A drive recorded 118 dogs: 71 sterilised, 22 not, 25 not recorded. Nobody counted all the dogs in the ward. Which claims hold?", opts: [
    { t: "“The drive recorded 71 sterilised dogs.”", ok: true, why: "A count of what was recorded." },
    { t: "“Of dogs with a status, 76% were sterilised.”", ok: true, why: "True for the 93 with a status, if it says so." },
    { t: "“60% of the ward's dogs are sterilised.”", ok: false, why: "Needs the number of dogs in the ward, which nobody counted." },
    { t: "“The ward reached 70% coverage, enough to stabilise it.”", ok: false, why: "Coverage needs a population count, and stabilisation needs years of evidence." },
  ] },
];
function Quiz({ onDone, items, multi }: P & { items: Q[]; multi?: boolean }) {
  const [ans, setAns] = useState<Record<number, Set<number>>>({});
  const pick = (qi: number, oi: number) => {
    const cur = new Set(multi ? ans[qi] ?? [] : []); if (cur.has(oi) && multi) cur.delete(oi); else cur.add(oi);
    const next = { ...ans, [qi]: cur };
    setAns(next);
    if (items.every((q, i) => multi ? q.opts.every((o, k) => o.ok === !!next[i]?.has(k)) : q.opts.some((o, k) => o.ok && next[i]?.has(k)))) onDone();
  };
  return (
    <ol className="ex ex-quiz">
      <li className="ex-question-progress">{Object.keys(ans).length} of {items.length} answered{multi ? " · Choose every claim that holds" : ""}</li>
      {items.map((q, qi) => (
        <li key={qi}>
          <p className="ex-q"><span className="ex-qn">{qi + 1}</span>{q.q}</p>
          <div className="ex-opts" role="group" aria-label={`Question ${qi + 1}`}>
            {q.opts.map((o, oi) => { const on = ans[qi]?.has(oi); return (
              <button key={oi} type="button" aria-pressed={!!on} className={`ex-opt${on ? (o.ok ? " is-ok" : " is-no") : ""}`} onClick={() => pick(qi, oi)}>
                <span className="ex-mark" aria-hidden>{on ? (o.ok ? <Check size={14} /> : <X size={14} />) : null}</span><span>{o.t}{on && <small>{o.why}</small>}</span>
              </button>
            ); })}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Put steps in order ────────────────────────────────────────────── */
function Order({ onDone }: P) {
  const order = useMemo(() => [3, 0, 5, 2, 4, 1], []);
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const tap = (k: number) => {
    if (picked.includes(k)) return;
    if (k === picked.length) { const p = [...picked, k]; setPicked(p); setWrong(null); if (p.length === POST_BITE_STEPS.length) onDone(); }
    else setWrong(k);
  };
  return (
    <div className="ex ex-order">
      <p className="ex-hint">Tap the steps in the order you would do them.</p>
      <ol className="ex-done">{picked.map((k) => <li key={k}><Check size={14} aria-hidden /> {POST_BITE_STEPS[k]}</li>)}</ol>
      <div className="ex-opts">
        {order.filter((k) => !picked.includes(k)).map((k) => <button key={k} type="button" className={`ex-opt${wrong === k ? " is-no" : ""}`} onClick={() => tap(k)}><span className="ex-mark" aria-hidden>{wrong === k ? <X size={14} /> : null}</span><span>{POST_BITE_STEPS[k]}{wrong === k && <small>Not yet: something comes before this.</small>}</span></button>)}
      </div>
      {picked.length > 0 && <button type="button" className="btn is-ghost is-s" onClick={() => { setPicked([]); setWrong(null); }}><RotateCcw size={13} aria-hidden /> Start again</button>}
    </div>
  );
}

/* ── Observation or assumption ─────────────────────────────────────── */
const OBS = [
  { t: "Limping on the left back leg", see: true },
  { t: "It was hit by a car", see: false },
  { t: "Near the bus stop on MG Road, about 6 pm", see: true },
  { t: "Someone abandoned it", see: false },
  { t: "A V-shaped notch in the right ear", see: true },
  { t: "It has definitely been sterilised", see: false },
  { t: "Thin, ribs visible", see: true },
  { t: "It is aggressive", see: false },
];
function Sort({ onDone }: P) {
  const [a, setA] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState(0);
  const put = (i: number, see: boolean) => { const n = { ...a, [i]: see }; setA(n); if (OBS.every((o, k) => n[k] === o.see)) onDone(); };
  return (
    <ul className="ex ex-sort">
      <li className="ex-question-progress">Observation {current + 1} of {OBS.length}</li>
      {OBS.map((o, i) => i === current && (
        <li key={i} className={i in a ? (a[i] === o.see ? "is-ok" : "is-no") : ""}>
          <span>{o.t}</span>
          <span className="seg" role="group" aria-label={o.t}><button type="button" aria-pressed={a[i] === true} onClick={() => put(i, true)}>I can see it</button><button type="button" aria-pressed={a[i] === false} onClick={() => put(i, false)}>An assumption</button></span>
          {i in a && <small>{a[i] === o.see ? (o.see ? "Yes: anyone standing there could check it." : "Yes: nobody saw it happen. Leave it out or say it is unknown.") : o.see ? "You can see this, so it belongs in the report." : o.t.includes("notch") ? "" : "Nobody watched this happen; it is a guess."}{!o.see && o.t.includes("sterilised") ? " An ear notch is a sign, not proof." : ""}</small>}
        </li>
      ))}
      <li className="ex-question-nav"><button type="button" className="btn" disabled={current === 0} onClick={() => setCurrent(i => i - 1)}>Previous</button><button type="button" className="btn" disabled={current === OBS.length - 1} onClick={() => setCurrent(i => i + 1)}>Next observation</button></li>
    </ul>
  );
}

/* ── A model street (hypothetical) ─────────────────────────────────── */
function Simulation({ onDone }: P) {
  const [rate, setRate] = useState(30);
  const [arrive, setArrive] = useState(8);
  const [touched, setTouched] = useState(false);
  const run = (r: number) => {
    /* Invented, simplified rules: 100 dogs, half female; each fertile female
       raises 2 pups a year, a quarter of whom survive to adulthood; 15% of
       adults die or leave each year;
       `arrive` new unsterilised adults wander in; r% of fertile dogs are
       sterilised each year. */
    let fert = 100, ster = 0; const out = [100];
    for (let y = 0; y < 10; y++) {
      const pups = (fert / 2) * 2;
      fert = fert * 0.85 + pups * 0.25 + arrive; ster = ster * 0.85;
      const s = fert * (r / 100); fert -= s; ster += s;
      out.push(Math.round(fert + ster));
    }
    return out;
  };
  const a = run(rate), base = run(0), max = Math.max(...a, ...base);
  const path = (v: number[]) => v.map((p, i) => `${i ? "L" : "M"}${(i / 10) * 280 + 30} ${190 - (p / max) * 170}`).join(" ");
  return (
    <div className="ex ex-sim">
      <p className="ex-warn">A teaching model with made-up numbers. Not a forecast for any real place.</p>
      <svg viewBox="0 0 320 210" className="ex-chart" role="img" aria-label={`After ten years: ${a[10]} dogs with ${rate}% sterilised each year, ${base[10]} with none`}>
        <line x1="30" y1="190" x2="310" y2="190" stroke="#0b1e3d" />
        {[0, 5, 10].map((y) => <text key={y} x={(y / 10) * 280 + 30} y="204" fontSize="10" textAnchor="middle" fill="#5b6478">year {y}</text>)}
        <path d={path(base)} fill="none" stroke="#c0603c" strokeWidth="2" strokeDasharray="5 4" />
        <path d={path(a)} fill="none" stroke="#1f6f80" strokeWidth="3" />
        <path d={path(a)} fill="none" stroke="#f05b40" strokeWidth="1" opacity=".5" transform="translate(2 -2)" />
        <text x="300" y={190 - (base[10] / max) * 170 - 6} fontSize="10" textAnchor="end" fill="#c0603c">no sterilisation</text>
      </svg>
      <label className="ex-range"><span>Share of fertile dogs sterilised each year: <b>{rate}%</b></span><input type="range" min={0} max={90} step={5} value={rate} onChange={(e) => { setRate(Number(e.target.value)); if (!touched) { setTouched(true); onDone(); } }} /></label>
      <label className="ex-range"><span>New dogs arriving each year: <b>{arrive}</b></span><input type="range" min={0} max={30} step={1} value={arrive} onChange={(e) => setArrive(Number(e.target.value))} /></label>
      <p className="ex-fb">After ten years this model street has about <b>{a[10]}</b> dogs, against <b>{base[10]}</b> with no programme. {rate < 50 ? "At low coverage the population keeps growing, just more slowly." : arrive > 15 ? "Even high coverage struggles when many new animals keep arriving." : "High coverage sustained for years bends the curve down."}</p>
    </div>
  );
}

/* ── Practice report (never sends) ─────────────────────────────────── */
function Practice({ onDone }: P) {
  const [place, setPlace] = useState("");
  const [what, setWhat] = useState("");
  const [photo, setPhoto] = useState<"yes" | "no" | "">("");
  const [sent, setSent] = useState(false);
  const tips = [
    !place.trim() ? "Add a place someone else could find: a landmark and a road." : place.trim().length < 12 ? "Can you add a landmark?" : null,
    !what.trim() ? "Say what you saw." : /hit|abandon|aggressive|definitely|probably/i.test(what) ? "Some words here are guesses (hit, abandoned, probably…). Describe what you saw instead." : null,
    photo === "" ? "Say whether you could take a photo from a safe distance." : null,
  ].filter(Boolean) as string[];
  return (
    <form className="ex ex-practice" onSubmit={(e) => { e.preventDefault(); setSent(true); if (!tips.length) onDone(); }}>
      <p className="ex-warn">Practice copy: this form cannot send anything.</p>
      <label className="field"><span className="label">Where</span><input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Landmark and road" /></label>
      <label className="field"><span className="label">What you saw</span><textarea className="textarea" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Only what you could see" /></label>
      <fieldset className="field"><legend className="label">Photo from a safe distance?</legend><div className="seg"><button type="button" aria-pressed={photo === "yes"} onClick={() => setPhoto("yes")}>Yes</button><button type="button" aria-pressed={photo === "no"} onClick={() => setPhoto("no")}>Not safely</button></div></fieldset>
      <button type="submit" className="btn is-ink">Check my practice report</button>
      {sent && (tips.length ? <ul className="ex-tips">{tips.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="ex-fb"><Check size={14} aria-hidden /> A clear, useful report. In the real form you would now see a receipt marked “Received”, and later whether an organisation took it.</p>)}
    </form>
  );
}
