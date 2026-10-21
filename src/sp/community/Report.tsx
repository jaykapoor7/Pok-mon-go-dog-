"use client";

/* ════════════════════════════════════════════════════════════════════
   Community · Report (decisions 008, 020, 043; FigJam "Adaptive
   reporting + tracking").

   Two doors, then a few short questions, one per screen, with a live
   draft beside them:

     I spotted an animal   photo · where · what you saw · send
     An animal needs help  where · what is wrong · photo · contact · send

   The receipt records submission, never NGO acceptance or a rescue. It
   shows the reference and timestamp, and the tracking states a report
   moves through, with only "received" lit. The draft is kept on this
   device (never the photo) until sent; offline is a visible draft, not a
   sent report; a second tap cannot send twice. A possible match to a
   known animal is a claim for review, never a merge.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Crosshair, Eye, LifeBuoy, Search, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { reportSighting } from "@/lib/actions";
import { readPhotoMeta, looksIndian } from "@/lib/exif";
import { nearestCity, reverseGeocode } from "@/lib/delhi";
import { readVolunteer, type VolunteerSession } from "@/lib/volunteer";
import type { MoodTag } from "@/lib/types";
import { ReportStage, type StageHandle } from "../map/ReportStage";
import { Ack } from "../ui";
import "./community.css";
import "../map/report.css";

type Door = "spotted" | "help";
type Problem = "injured" | "vehicle" | "trapped" | "weak" | "puppies" | "other";
type Seen = "friendly" | "shy" | "puppies" | "hungry" | "sleeping";
type Ear = "sterilised" | "not_sterilised" | "unknown";
type StepId = "door" | "photo" | "where" | "seen" | "problem" | "contact" | "review";
const FLOW: Record<Door, StepId[]> = { spotted: ["photo", "where", "seen", "review"], help: ["where", "problem", "photo", "contact", "review"] };
const STEP_LABEL: Record<StepId, string> = { door: "Start", photo: "Photo", where: "Where", seen: "What you saw", problem: "What is wrong", contact: "Contact", review: "Send" };

const PROBLEMS: { v: Problem; label: string; note: string }[] = [
  { v: "injured", label: "Hurt or sick", note: "A wound, a limp, bleeding, illness" },
  { v: "vehicle", label: "Hit by a vehicle", note: "Or lying near a road" },
  { v: "trapped", label: "Trapped or stuck", note: "Drain, wall, fence, rope" },
  { v: "weak", label: "Very thin or weak", note: "Not standing, not eating" },
  { v: "puppies", label: "Puppies in danger", note: "Alone, in traffic, in rain" },
  { v: "other", label: "Something else", note: "Say what in a few words" },
];
const SEEN: { v: Seen; label: string }[] = [{ v: "friendly", label: "Friendly" }, { v: "shy", label: "Shy or wary" }, { v: "puppies", label: "Puppies or a mother" }, { v: "hungry", label: "Thin or hungry" }, { v: "sleeping", label: "Resting" }];
const EARS: { v: Ear; label: string; note: string }[] = [
  { v: "sterilised", label: "An ear is notched", note: "A V-cut on one ear. A sign, not proof of surgery" },
  { v: "not_sterilised", label: "Both ears whole", note: "" },
  { v: "unknown", label: "I couldn't see", note: "Kept as not examined, never as no" },
];

const DRAFT = "sp2.report.draft";
type Draft = { door: Door | null; coords: { lat: number; lng: number } | null; zone: string | null; landmark: string; problem: Problem | null; walk: "yes" | "no" | "unsure" | null; seen: Seen[]; ear: Ear | null; notes: string; email: string; contactOk: boolean };
const blank: Draft = { door: null, coords: {lat:11.0102,lng:76.9504}, zone: "RS Puram, Coimbatore", landmark: "", problem: null, walk: null, seen: [], ear: null, notes: "", email: "", contactOk: false };

export function Report() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [d, setD] = useState<Draft>(blank);
  const [restored, setRestored] = useState(false);
  const [step, setStep] = useState<StepId>("door");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  const [state, setState] = useState<"draft" | "pending" | "failed" | "offline" | "sent">("draft");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ ref: string | null; at: string; dog: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRead = useRef(0);
  const stage = useRef<StageHandle>(null);
  const [pickLabel, setPickLabel] = useState<string | null>(null);
  const sending = useRef(false);
  const set = useCallback((p: Partial<Draft>) => setD((x) => ({ ...x, ...p })), []);

  /* Restore a draft and read the link (?animal=, ?lat&lng). */
  useEffect(() => {
    try { const s = localStorage.getItem(DRAFT); if (s) { const v = JSON.parse(s) as Draft; if (v.door) { setD({ ...blank, ...v }); setRestored(true); } } } catch { /* storage blocked */ }
    const q = new URLSearchParams(window.location.search);
    const a = q.get("animal");
    if (a && /^[0-9a-f-]{36}$/i.test(a)) setClaimed(a);
    const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
    if (looksIndian(lat, lng)) { set({ coords: { lat, lng }, zone: nearestCity(lat, lng) }); reverseGeocode(lat, lng).then((z) => setD(x => x.coords?.lat === lat && x.coords?.lng === lng ? { ...x, zone: z } : x)).catch(() => {}); }
    /* ?help=1 (from "If an animal needs help") opens the help door, unless a draft was restored. */
    let drafted = false; try { drafted = !!localStorage.getItem(DRAFT); } catch { /* storage blocked */ }
    if (q.get("help") === "1" && !drafted) { set({ door: "help" }); setStep(FLOW.help[0]); }
    setVolunteer(readVolunteer());
  }, [set]);
  useEffect(() => { if (state === "sent") return; try { if (d.door) localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* storage blocked */ } }, [d, state]);
  useEffect(() => { if (user?.email) set({ email: d.email || user.email }); }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const flow = d.door ? FLOW[d.door] : [];
  const idx = step === "door" ? -1 : flow.indexOf(step);
  const next = () => setStep(flow[idx + 1] ?? "review");
  const back = () => setStep(idx <= 0 ? "door" : flow[idx - 1]);
  const choose = (door: Door) => { set({ door }); setStep(FLOW[door][0]); };

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const version = ++photoRead.current;
    setConsent(false); setFile(f); setPreview(URL.createObjectURL(f));
    try {
      const m = await readPhotoMeta(f);
      if (version !== photoRead.current || m.lat == null || m.lng == null || !looksIndian(m.lat, m.lng)) return;
      const coords = { lat: m.lat, lng: m.lng };
      setD(x => x.coords ? x : { ...x, coords, zone: nearestCity(coords.lat, coords.lng) });
      reverseGeocode(coords.lat, coords.lng).then(zone => setD(x =>
        version === photoRead.current && x.coords?.lat === coords.lat && x.coords?.lng === coords.lng ? { ...x, zone } : x
      )).catch(() => {});
    } catch { /* no metadata */ }
  }

  const help = d.door === "help";
  const ready = !!d.coords && (help ? !!d.problem && (d.problem !== "other" || d.notes.trim().length > 3) : !!d.ear) && (!file || consent) && (!HAS_TURNSTILE || !!token);

  async function send() {
    if (!ready || !d.coords || sending.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { setState("offline"); return; }
    sending.current = true; setState("pending"); setError(null);
    const moods: MoodTag[] = help ? (["injured", "vehicle", "trapped"].includes(d.problem ?? "") ? ["injured"] : d.problem === "weak" ? ["hungry"] : d.problem === "puppies" ? ["puppies"] : []) : d.seen;
    const lines = [
      help ? `Needs help: ${PROBLEMS.find((p) => p.v === d.problem)?.label ?? ""}` : "Sighting",
      help && d.walk ? `Can it walk: ${d.walk === "unsure" ? "not sure" : d.walk}` : "",
      d.landmark.trim() ? `Landmark: ${d.landmark.trim()}` : "",
      d.notes.trim(),
    ].filter(Boolean).join("\n");
    try {
      const r = await reportSighting({
        file, lat: d.coords.lat, lng: d.coords.lng, zone: d.zone ?? nearestCity(d.coords.lat, d.coords.lng), moods, notes: lines,
        reporterName: volunteer?.name || user?.name || "", reporterEmail: d.contactOk && d.email.trim() ? d.email.trim() : undefined, token,
        claimedDogId: claimed, sterilisationStatus: help ? "unknown" : d.ear ?? "unknown", vaccinationStatus: "unknown",
        inviteCode: volunteer?.code ?? null, volunteerName: volunteer?.name ?? null,
      });
      setReceipt({ ref: (r as any).reference ?? r.sightingId, at: new Date().toISOString(), dog: r.dogId });
      setState("sent");
      try { localStorage.removeItem(DRAFT); } catch { /* storage blocked */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be sent.");
      setState("failed");
    } finally { sending.current = false; }
  }
  const restart = () => { setD(blank); setFile(null); setPreview(null); setConsent(false); setReceipt(null); setState("draft"); setStep("door"); setRestored(false); try { localStorage.removeItem(DRAFT); } catch { /* blocked */ } };

  if (state === "sent" && receipt) return <Receipt receipt={receipt} help={help} restart={restart} />;

  const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: reduce ? 0 : 0.15 } };

  return (
    <div className={`rp3${step === "where" ? " is-where" : ""}`}>
      <div className="rp3-form">
        <header className="rp-top">
          {step !== "door" ? <button type="button" className="icon-btn" onClick={back} aria-label="Back"><ArrowLeft size={18} /></button> : <span />}
          {d.door && <ol className="rp-steps" aria-label={`Step ${idx + 1} of ${flow.length}`}>{flow.map((s, i) => <li key={s} className={i < idx ? "is-done" : i === idx ? "is-now" : ""} aria-current={i === idx ? "step" : undefined}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{STEP_LABEL[s]}</li>)}</ol>}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={step} className="rp-screen" {...motionProps} aria-labelledby="rp-h">
            {step === "door" && (
              <>
                <p className="rp2-k">Report{d.zone ? ` · ${d.zone}` : ""}</p>
                <h1 id="rp-h" className="rp2-h">What did you see?</h1>
                {restored && <p className="rp-restored"><Ack state="draft">A draft from earlier is kept on this device.</Ack> <button type="button" className="btn is-ghost is-s" onClick={() => setStep(FLOW[d.door!][0])}>Continue it</button><button type="button" className="btn is-ghost is-s" onClick={restart}>Start fresh</button></p>}
                <div className="rp2-doors">
                  <button type="button" className="rp2-door" onClick={() => choose("spotted")}><Eye size={22} aria-hidden /><b>I spotted an animal</b><span>Add an observation to the record. About a minute.</span></button>
                  <button type="button" className="rp2-door is-help" onClick={() => choose("help")}><LifeBuoy size={22} aria-hidden /><b>An animal needs help</b><span>Hurt, trapped, very weak, or puppies in danger.</span></button>
                </div>
                <p className="rp-truth">StrayPaw keeps the record and passes needs-help reports to organisations for review. It is not an emergency service and cannot promise anyone will come. If an animal is in immediate danger, <Link className="link" href="/community/help">call a local animal ambulance or vet</Link>.</p>
              </>
            )}

            {step === "photo" && (
              <>
                <h1 id="rp-h" className="rp2-h">{help ? "A photo, if it is safe to take one" : "A photo helps the right animal be recognised"}</h1>
                <p className="body">Optional. {help ? "Never approach a hurt or frightened animal to take it." : "A report without one still counts."}</p>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr" onChange={pickPhoto} aria-label="Choose a photo" />
                <button type="button" className="btn is-s" onClick={async()=>{const blob=await fetch("/dogs/delhi/brown-on-ledge.jpg").then(r=>r.blob());setFile(new File([blob],"sample-dog.jpg",{type:"image/jpeg"}));setPreview("/dogs/delhi/brown-on-ledge.jpg");setConsent(true);}}>Attach sample photograph</button><button type="button" className="rp-camera" onClick={() => fileRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview ? <img src={preview} alt="Your photo" /> : <Camera size={32} aria-hidden />}
                  <b>{preview ? "Retake" : "Take or choose a photo"}</b>
                </button>
                {preview && <label className="rp-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>This sample photo shows no person&rsquo;s face, number plate or house number. It may be shown on the animal&rsquo;s public record; photos that may show an injury start blurred.</span></label>}
                <div className="row rp-go">
                  <button type="button" className="btn is-ink" onClick={next} disabled={!!preview && !consent}>{preview ? "Use this photo" : "Continue without a photo"} <ArrowRight size={16} aria-hidden /></button>
                  {preview && <button type="button" className="btn is-ghost" onClick={() => { photoRead.current++; setFile(null); setPreview(null); setConsent(false); }}><X size={15} aria-hidden /> Remove</button>}
                </div>
              </>
            )}

            {step === "where" && (
              <>
                <h1 id="rp-h" className="rp2-h">Where is the animal?</h1>
                <p className="body">Move the map until the pin is where the animal is. Your exact point is seen only by reviewers and organisations; the public record shows the area, never the spot.</p>
                <div className="row"><button type="button" className="btn is-s" onClick={()=>{set({coords:{lat:11.0102,lng:76.9504},zone:"RS Puram, Coimbatore"});setPickLabel("RS Puram, Coimbatore");stage.current?.fly(11.0102,76.9504);}}>RS Puram sample location</button></div><WhereTools onFly={(lat, lng) => stage.current?.fly(lat, lng)} />
                <p className="rp2-where" role="status">{pickLabel ? <>Pinned: <b>{pickLabel}</b></> : "Not pinned yet."}</p>
                <div className="field"><label htmlFor="lm">A landmark people would know <span className="small">optional</span></label><input id="lm" className="input" value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder="Behind the tea stall, opposite the temple" /></div>
                <div className="row rp-go"><button type="button" className="btn is-ink" onClick={next} disabled={!d.coords}>This is the place <ArrowRight size={16} aria-hidden /></button></div>
              </>
            )}

            {step === "seen" && (
              <>
                <h1 id="rp-h" className="rp2-h">What did you see?</h1>
                <fieldset className="rp-fs"><legend className="label">How it seemed <span className="small">choose any</span></legend>
                  <div className="row">{SEEN.map((s) => <button key={s.v} type="button" className="chip" aria-pressed={d.seen.includes(s.v)} onClick={() => set({ seen: d.seen.includes(s.v) ? d.seen.filter((x) => x !== s.v) : [...d.seen, s.v] })}>{s.label}</button>)}</div>
                </fieldset>
                <fieldset className="choice"><legend className="label">Its ears</legend>
                  {EARS.map((e) => <label key={e.v}><input type="radio" name="ear" checked={d.ear === e.v} onChange={() => set({ ear: e.v })} /><span><b>{e.label}</b>{e.note && <small>{e.note}</small>}</span></label>)}
                </fieldset>
                <div className="field"><label htmlFor="nt">Anything else <span className="small">optional</span></label><textarea id="nt" className="textarea" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Colour, collar, the time you saw it" /></div>
                <div className="row rp-go"><button type="button" className="btn is-ink" onClick={next} disabled={!d.ear}>Continue <ArrowRight size={16} aria-hidden /></button></div>
              </>
            )}

            {step === "problem" && (
              <>
                <h1 id="rp-h" className="rp2-h">What is wrong?</h1>
                <fieldset className="choice rp-problems"><legend className="sr">The problem</legend>
                  {PROBLEMS.map((p) => <label key={p.v}><input type="radio" name="pb" checked={d.problem === p.v} onChange={() => set({ problem: p.v })} /><span><b>{p.label}</b><small>{p.note}</small></span></label>)}
                </fieldset>
                <fieldset className="rp-fs"><legend className="label">Can it walk?</legend>
                  <div className="seg">{(["yes", "no", "unsure"] as const).map((w) => <button key={w} type="button" aria-pressed={d.walk === w} onClick={() => set({ walk: w })}>{w === "unsure" ? "Not sure" : w === "yes" ? "Yes" : "No"}</button>)}</div>
                </fieldset>
                <div className="field"><label htmlFor="nt2">In a few words {d.problem === "other" ? "" : <span className="small">optional</span>}</label><textarea id="nt2" className="textarea" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What you can see. Not a diagnosis." /></div>
                <div className="row rp-go"><button type="button" className="btn is-ink" onClick={next} disabled={!d.problem || (d.problem === "other" && d.notes.trim().length < 4)}>Continue <ArrowRight size={16} aria-hidden /></button></div>
              </>
            )}

            {step === "contact" && (
              <>
                <h1 id="rp-h" className="rp2-h">Can an organisation reach you?</h1>
                <p className="body">Optional. Your contact is never public. It is used only to ask about this animal and to tell you how the report moves.</p>
                <label className="rp-consent"><input type="checkbox" checked={d.contactOk} onChange={(e) => set({ contactOk: e.target.checked })} /><span>Yes, they may email me about this report.</span></label>
                {d.contactOk && <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" className="input" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" /></div>}
                <div className="row rp-go"><button type="button" className="btn is-ink" onClick={next}>Continue <ArrowRight size={16} aria-hidden /></button></div>
              </>
            )}

            {step === "review" && (
              <>
                <h1 id="rp-h" className="rp2-h">Ready to send</h1>
                <dl className="ledger rp-review">
                  <div><dt>Report</dt><dd>{help ? "Needs help" : "Sighting"} <button type="button" className="link" onClick={() => setStep("door")}>Change</button></dd></div>
                  {help && <div><dt>Problem</dt><dd>{PROBLEMS.find((p) => p.v === d.problem)?.label ?? "Not given"}{d.walk ? ` · can walk: ${d.walk === "unsure" ? "not sure" : d.walk}` : ""} <button type="button" className="link" onClick={() => setStep("problem")}>Change</button></dd></div>}
                  {!help && <div><dt>Seen</dt><dd>{[...d.seen.map((s) => SEEN.find((x) => x.v === s)?.label), EARS.find((e) => e.v === d.ear)?.label].filter(Boolean).join(" · ")} <button type="button" className="link" onClick={() => setStep("seen")}>Change</button></dd></div>}
                  <div><dt>Where</dt><dd>{d.zone ?? "Not set"}{d.landmark ? ` · ${d.landmark}` : ""} <button type="button" className="link" onClick={() => setStep("where")}>Change</button></dd></div>
                  <div><dt>Photo</dt><dd>{file ? "Attached" : "None"} <button type="button" className="link" onClick={() => setStep("photo")}>Change</button></dd></div>
                  {help && <div><dt>Contact</dt><dd>{d.contactOk && d.email ? "By email, private" : "No contact"}</dd></div>}
                  {claimed && <div><dt>Animal</dt><dd>You said this is a known animal. A reviewer checks it; nothing is merged automatically. <button type="button" className="link" onClick={() => setClaimed(null)}>Remove</button></dd></div>}
                </dl>
                {HAS_TURNSTILE && <Turnstile onVerify={setToken} />}
                <div className="row rp-go">
                  <button type="button" className={`btn ${help ? "is-flame" : "is-ink"}`} onClick={send} disabled={!ready || state === "pending"}>{state === "pending" ? "Sending…" : "Send the report"}</button>
                </div>
                <div aria-live="polite">
                  {state === "pending" && <Ack state="pending">Sending to StrayPaw. Not sent until the record answers.</Ack>}
                  {state === "offline" && <Ack state="offline">You are offline. The report is kept here as a draft and has not been sent. Send again when you are connected.</Ack>}
                  {state === "failed" && <Ack state="failed">Not sent: {error} Your answers are kept; try again.</Ack>}
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <aside className="rp3-side" aria-label="Your report so far">
        <div className="rp3-map">
          <ReportStage ref={stage} coords={d.coords} picking={step === "where"} onPick={(p) => { set({ coords: { lat: p.lat, lng: p.lng }, zone: p.zone }); setPickLabel(p.zone); }} onLabel={setPickLabel} />
          {step === "where" && <p className="rp3-maphint">{pickLabel ? <><b>{pickLabel}</b> · drag the map to move the pin</> : "Zoom in to the street, then drag the map under the pin."}</p>}
        </div>
        <div className="rp3-draft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" /> : <span className="rp3-ph"><Camera size={18} aria-hidden /></span>}
          <dl>
            <div><dt>Report</dt><dd>{d.door === "help" ? "Needs help" : d.door === "spotted" ? "Sighting" : "Not chosen"}</dd></div>
            <div><dt>Where</dt><dd>{d.zone ?? "Not set"}</dd></div>
            <div><dt>{help ? "Problem" : "Ears"}</dt><dd>{help ? PROBLEMS.find((p) => p.v === d.problem)?.label ?? "Not given" : EARS.find((e) => e.v === d.ear)?.label ?? "Not given"}</dd></div>
          </dl>
          <p>{state === "pending" ? "Sending…" : "Draft, kept on this device until you send. The photo is not kept in the draft."}</p>
        </div>
      </aside>
    </div>
  );
}

function Receipt({ receipt, help, restart }: { receipt: { ref: string | null; at: string; dog: string | null }; help: boolean; restart: () => void }) {
  const ref = receipt.ref ? receipt.ref.slice(0, 8).toUpperCase() : null;
  const steps = help ? ["Received", "Under review", "Offered to an organisation", "Accepted by an organisation", "In progress", "Closed with an outcome"] : ["Received", "Reviewed", "On the animal's record"];
  return (
    <div className="rp3 is-done">
      <div className="rp3-form">
        <p className="rp2-k">Receipt</p>
        <h1 className="rp2-h">Received.</h1>
        <p className="lede">{help ? "Your report reached StrayPaw. It now waits for review. No organisation has accepted it yet, and nobody has been sent." : "Your sighting reached StrayPaw and waits for a quick review before it joins the record."}</p>
        <dl className="ledger rp-receipt">
          <div><dt>Reference</dt><dd className="mono">{ref ?? "Recorded, reference pending"}</dd></div>
          <div><dt>Sent</dt><dd>{new Date(receipt.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
          <div><dt>Status</dt><dd><Ack state="saved">Received by StrayPaw</Ack></dd></div>
        </dl>
        <ol className="rp-track" aria-label="How a report moves">{steps.map((s, i) => <li key={s} className={i === 0 ? "is-on" : ""}><i aria-hidden />{s}{i === 0 && <small>now</small>}</li>)}</ol>
        <p className="small">Each step is shown only when it really happens. Delivered to an organisation is not the same as accepted; accepted is not the same as treated.</p>
        <div className="row"><Link className="btn is-ink" href="/community/activity">Track it in My Activity</Link>{receipt.dog && <Link className="btn" href={`/animal/${receipt.dog}`}>The animal&rsquo;s record</Link>}<button type="button" className="btn is-ghost" onClick={restart}>Report another</button></div>
        {help && <p className="rp-truth">If the animal is in immediate danger, do not wait for this report. <Link className="link" href="/community/help">Who to call now</Link>.</p>}
      </div>
    </div>
  );
}

/* Search a street or landmark in India (OpenStreetMap Nominatim), or use where you are. */
function WhereTools({ onFly }: { onFly: (lat: number, lng: number) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    const t = q.trim(); if (t.length < 3) { setHits([]); return; }
    const id = window.setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(t)}`, { headers: { Accept: "application/json" } })
        .then((r) => r.json()).then((d: { lat: string; lon: string; display_name: string }[]) => setHits(d.map((x) => ({ lat: +x.lat, lng: +x.lon, label: x.display_name })))).catch(() => setHits([]));
    }, 350);
    return () => window.clearTimeout(id);
  }, [q]);
  const here = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocating(false); onFly(coords.latitude, coords.longitude); }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 });
  };
  return (
    <div className="rp2-tools">
      <label className="rp2-search"><Search size={16} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a street, landmark or area" aria-label="Search a place" /></label>
      <button type="button" className="rp2-btn" onClick={here} disabled={locating}><Crosshair size={16} aria-hidden /> {locating ? "Finding you…" : "Where I am"}</button>
      {hits.length > 0 && <ul className="rp2-hits">{hits.map((h) => <li key={`${h.lat},${h.lng}`}><button type="button" onClick={() => { setQ(h.label.split(",").slice(0, 2).join(",")); setHits([]); onFly(h.lat, h.lng); }}>{h.label}</button></li>)}</ul>}
    </div>
  );
}

