"use client";

/* ════════════════════════════════════════════════════════════════════
   Report an animal (/community/report): the citizen report that reaches
   organisations' inboxes. Two doors, then a few short questions, one per
   screen:

     I spotted an animal   photo · where · what you saw · send
     An animal needs help  where · what is wrong · photo · contact · send

   It sends exactly what the earlier form sent: the photo to the public
   "sightings" bucket, then POST /api/report (Turnstile-verified on the
   server) through reportSighting(). The receipt records submission,
   never acceptance by an organisation or a rescue. The draft is kept on
   this device (never the photo) until sent; offline is a visible draft,
   not a sent report; a second tap cannot send twice; a failure keeps
   every answer. A possible match to a known animal is a claim for
   review, never a merge.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Eye, LifeBuoy, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { reportSighting } from "@/lib/actions";
import { readPhotoMeta, looksIndian } from "@/lib/exif";
import { nearestCity, reverseGeocode } from "@/lib/delhi";
import { readVolunteer, type VolunteerSession } from "@/lib/volunteer";
import type { MoodTag } from "@/lib/types";
import { PinPicker } from "../map";
import { Ack } from "../kit";
import "./report.css";

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

/* The same key as the earlier form, so a draft started there carries over. */
const DRAFT = "sp2.report.draft";
type Draft = { door: Door | null; coords: { lat: number; lng: number } | null; zone: string | null; landmark: string; problem: Problem | null; walk: "yes" | "no" | "unsure" | null; seen: Seen[]; ear: Ear | null; notes: string; email: string; contactOk: boolean };
const blank: Draft = { door: null, coords: null, zone: null, landmark: "", problem: null, walk: null, seen: [], ear: null, notes: "", email: "", contactOk: false };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Report() {
  const { user } = useAuth();
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
  const [problems, setProblems] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<{ ref: string | null; at: string; dog: string | null } | null>(null);
  const [pickLabel, setPickLabel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRead = useRef(0);
  const sending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const set = useCallback((p: Partial<Draft>) => setD((x) => ({ ...x, ...p })), []);

  /* Restore a draft and read the link (?animal=, ?lat&lng, ?help=1). */
  useEffect(() => {
    try { const s = localStorage.getItem(DRAFT); if (s) { const v = JSON.parse(s) as Draft; if (v.door) { setD({ ...blank, ...v }); setRestored(true); if (v.zone) setPickLabel(v.zone); } } } catch { /* storage blocked */ }
    const q = new URLSearchParams(window.location.search);
    const a = q.get("animal");
    if (a && /^[0-9a-f-]{36}$/i.test(a)) setClaimed(a);
    const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
    if (q.get("lat") && q.get("lng") && looksIndian(lat, lng)) {
      const near = nearestCity(lat, lng);
      set({ coords: { lat, lng }, zone: near }); setPickLabel(near);
      reverseGeocode(lat, lng).then((z) => { setD((x) => (x.coords?.lat === lat && x.coords?.lng === lng ? { ...x, zone: z } : x)); setPickLabel(z); }).catch(() => {});
    }
    let drafted = false; try { drafted = !!localStorage.getItem(DRAFT); } catch { /* storage blocked */ }
    if (q.get("help") === "1" && !drafted) { set({ door: "help" }); setStep(FLOW.help[0]); }
    setVolunteer(readVolunteer());
  }, [set]);
  useEffect(() => { if (state === "sent") return; try { if (d.door) localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* storage blocked */ } }, [d, state]);
  useEffect(() => { if (user?.email) setD((x) => ({ ...x, email: x.email || user.email || "" })); }, [user?.email]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  /* Each new screen is announced by moving focus to its question. */
  const screen = state === "sent" ? "sent" : step;
  useEffect(() => { if (!moved.current) { moved.current = true; return; } heading.current?.focus(); }, [screen]);

  const help = d.door === "help";
  const flow = d.door ? FLOW[d.door] : [];
  const idx = step === "door" ? -1 : flow.indexOf(step);
  const go = (s: StepId) => { setProblems([]); setStep(s); };
  const next = () => go(flow[idx + 1] ?? "review");
  const back = () => go(idx <= 0 ? "door" : flow[idx - 1]);
  const choose = (door: Door) => { set({ door }); go(FLOW[door][0]); };

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.type && !/^image\//.test(f.type)) { setProblems(["That file is not a photo. Choose a JPG, PNG, WebP or HEIC image."]); return; }
    if (f.size > 8 * 1024 * 1024) { setProblems(["That photo is over 8 MB. Choose a smaller one, or take a new photo."]); return; }
    const version = ++photoRead.current;
    setProblems([]); setConsent(false); setFile(f); setPreview(URL.createObjectURL(f));
    try {
      const m = await readPhotoMeta(f);
      if (version !== photoRead.current || m.lat == null || m.lng == null || !looksIndian(m.lat, m.lng)) return;
      const coords = { lat: m.lat, lng: m.lng };
      setD((x) => (x.coords ? x : { ...x, coords, zone: nearestCity(coords.lat, coords.lng) }));
      setPickLabel((l) => l ?? nearestCity(coords.lat, coords.lng));
      reverseGeocode(coords.lat, coords.lng).then((zone) => setD((x) => (version === photoRead.current && x.coords?.lat === coords.lat && x.coords?.lng === coords.lng ? { ...x, zone } : x))).catch(() => {});
    } catch { /* no location in the photo */ }
  }
  const removePhoto = () => { photoRead.current++; setFile(null); setPreview(null); setConsent(false); };

  /* What is still missing before the report can be sent, in plain words. */
  const missing = (): { msg: string; at: StepId }[] => {
    const out: { msg: string; at: StepId }[] = [];
    if (!d.coords) out.push({ msg: "Pin where the animal is.", at: "where" });
    if (help && !d.problem) out.push({ msg: "Say what is wrong.", at: "problem" });
    if (help && d.problem === "other" && d.notes.trim().length < 4) out.push({ msg: "Describe the problem in a few words.", at: "problem" });
    if (!help && !d.ear) out.push({ msg: "Say what you saw of its ears.", at: "seen" });
    if (file && !consent) out.push({ msg: "Confirm the photo shows no person’s face, number plate or house number, or remove it.", at: "photo" });
    if (help && d.contactOk && !EMAIL.test(d.email.trim())) out.push({ msg: "Enter an email address an organisation can write to, or untick the contact box.", at: "contact" });
    if (HAS_TURNSTILE && !token) out.push({ msg: "Complete the check above the Send button.", at: "review" });
    return out;
  };

  /* Continue from one screen: the answer it asks for is checked here, and what is missing is said. */
  const proceed = () => {
    const p: string[] = [];
    if (step === "photo" && file && !consent) p.push("Tick the box to confirm the photo is safe to show, or remove the photo.");
    if (step === "where" && !d.coords) p.push("Pin the place first: search for a street or landmark, use where you are, or drag the map under the pin.");
    if (step === "seen" && !d.ear) p.push("Choose what you saw of its ears. “I couldn’t see” is a fine answer.");
    if (step === "problem" && !d.problem) p.push("Choose what is wrong with the animal.");
    if (step === "problem" && d.problem === "other" && d.notes.trim().length < 4) p.push("Say what is wrong in a few words.");
    if (step === "contact" && d.contactOk && !EMAIL.test(d.email.trim())) p.push("Enter a full email address, or untick the box.");
    setProblems(p);
    if (!p.length) next();
  };

  async function send() {
    if (sending.current) return;
    const m = missing();
    if (m.length || !d.coords) { setProblems(m.map((x) => x.msg)); setState("draft"); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setState("offline"); return; }
    sending.current = true; setState("pending"); setError(null); setProblems([]);
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
      setReceipt({ ref: r.sightingId, at: new Date().toISOString(), dog: r.dogId });
      setState("sent");
      try { localStorage.removeItem(DRAFT); } catch { /* storage blocked */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be sent.");
      setState("failed");
    } finally { sending.current = false; }
  }
  const restart = () => { setD(blank); setFile(null); setPreview(null); setConsent(false); setReceipt(null); setState("draft"); setStep("door"); setRestored(false); setProblems([]); setPickLabel(null); try { localStorage.removeItem(DRAFT); } catch { /* blocked */ } };

  if (state === "sent" && receipt) return <Receipt receipt={receipt} help={help} restart={restart} heading={heading} />;

  const err = problems.length > 0 && (
    <div className="rp-err" role="alert" id="rp-err">
      <b>{problems.length === 1 ? "One thing before you go on" : "Before you go on"}</b>
      <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
  const continueBtn = (labelText: string) => (
    <div className="rp-go"><button type="button" className="pb-btn is-primary rp-wide" onClick={proceed} aria-describedby={problems.length ? "rp-err" : undefined}>{labelText} <ArrowRight size={16} aria-hidden /></button></div>
  );

  return (
    <div className={`s4-wrap rp${step === "where" ? " is-where" : ""}`}>
      <div className="rp-form">
        <div className="rp-top">
          {step !== "door" ? <button type="button" className="pb-btn is-quiet rp-back" onClick={back}><ArrowLeft size={16} aria-hidden /> Back</button> : null}
          {d.door && step !== "door" && (
            <ol className="rp-steps" aria-label={`Step ${idx + 1} of ${flow.length}`}>
              {flow.map((s, i) => <li key={s} className={i < idx ? "is-done" : i === idx ? "is-now" : ""} aria-current={i === idx ? "step" : undefined}><span aria-hidden>{i + 1}</span>{STEP_LABEL[s]}</li>)}
            </ol>
          )}
        </div>

        <section className="rp-screen" key={step} aria-labelledby="rp-h">
          {step === "door" && (
            <>
              <p className="pb-eyebrow">Report an animal{d.zone ? ` · ${d.zone}` : ""}</p>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">What did you see?</h1>
              {restored && (
                <div className="pb-note is-blue rp-restored">
                  <div>A draft from earlier is kept on this device.</div>
                  <div className="pb-note-a"><button type="button" className="pb-btn is-primary is-s" onClick={() => go(FLOW[d.door!][0])}>Continue it</button><button type="button" className="pb-btn is-line is-s" onClick={restart}>Start fresh</button></div>
                </div>
              )}
              {claimed && <p className="pb-fine">You are reporting an animal already on the record. A reviewer checks it is the same animal; nothing is merged automatically.</p>}
              <div className="rp-doors">
                <button type="button" className="rp-door" onClick={() => choose("spotted")}><Eye size={24} aria-hidden /><b>I spotted an animal</b><span>Add an observation to the record. About a minute.</span></button>
                <button type="button" className="rp-door is-help" onClick={() => choose("help")}><LifeBuoy size={24} aria-hidden /><b>An animal needs help</b><span>Hurt, trapped, very weak, or puppies in danger.</span></button>
              </div>
              <p className="rp-truth">StrayPaw keeps the record and passes needs-help reports to organisations for review. It is not an emergency service and cannot promise anyone will come. If an animal is in immediate danger, <Link href="/community/help">call a local animal ambulance or vet</Link>.</p>
            </>
          )}

          {step === "photo" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">{help ? "A photo, if it is safe to take one" : "A photo helps the right animal be recognised"}</h1>
              <p className="rp-p">Optional. {help ? "Never approach a hurt or frightened animal to take it." : "A report without one still counts."}</p>
              <input ref={fileRef} id="rp-file" type="file" accept="image/*" capture="environment" className="pb-sr" onChange={pickPhoto} tabIndex={-1} aria-hidden />
              <button type="button" className={`rp-camera${preview ? " has-photo" : ""}`} onClick={() => fileRef.current?.click()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview ? <img src={preview} alt="Your photo" /> : <Camera size={32} aria-hidden />}
                <b>{preview ? "Retake or choose another" : "Take or choose a photo"}</b>
              </button>
              {preview && (
                <label className="pb-check rp-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setProblems([]); }} />
                  <span>I took this photo and it shows no person&rsquo;s face, number plate or house number. It may be shown on the animal&rsquo;s public record; photos that may show an injury start blurred.</span>
                </label>
              )}
              {preview && !consent && <p className="pb-fine" id="rp-consent-why">Tick the box above to use this photo, or remove it and continue without one.</p>}
              {err}
              <div className="rp-go">
                <button type="button" className="pb-btn is-primary rp-wide" onClick={proceed} disabled={!!preview && !consent} aria-describedby={preview && !consent ? "rp-consent-why" : undefined}>{preview ? "Use this photo" : "Continue without a photo"} <ArrowRight size={16} aria-hidden /></button>
                {preview && <button type="button" className="pb-btn is-line" onClick={removePhoto}><X size={16} aria-hidden /> Remove the photo</button>}
              </div>
            </>
          )}

          {step === "where" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">Where is the animal?</h1>
              <p className="rp-p">Search a street or landmark, use where you are, or drag the map until the pin is on the animal. Your exact point is seen only by reviewers and organisations; the public record shows the area, never the spot.</p>
              <PinPicker statusClass="rp2-where" value={d.coords} label={pickLabel} onLabel={setPickLabel} onPick={(p) => { set({ coords: { lat: p.lat, lng: p.lng }, zone: p.zone }); setProblems([]); }} />
              <div className="pb-field"><label htmlFor="rp-lm">A landmark people would know <span className="pb-opt">optional</span></label><input id="rp-lm" className="pb-input" value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder="Behind the tea stall, opposite the temple" /></div>
              {err}
              {continueBtn("This is the place")}
            </>
          )}

          {step === "seen" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">What did you see?</h1>
              <fieldset className="pb-field"><legend>How it seemed <span className="pb-opt">choose any</span></legend>
                <div className="pb-chips">{SEEN.map((s) => <button key={s.v} type="button" aria-pressed={d.seen.includes(s.v)} onClick={() => set({ seen: d.seen.includes(s.v) ? d.seen.filter((x) => x !== s.v) : [...d.seen, s.v] })}>{s.label}</button>)}</div>
              </fieldset>
              <fieldset className="pb-field choice"><legend>Its ears</legend>
                <div className="pb-choice">{EARS.map((e) => <label key={e.v}><input type="radio" name="ear" checked={d.ear === e.v} onChange={() => { set({ ear: e.v }); setProblems([]); }} /><span><b>{e.label}</b>{e.note && <small>{e.note}</small>}</span></label>)}</div>
              </fieldset>
              <div className="pb-field"><label htmlFor="rp-nt">Anything else <span className="pb-opt">optional</span></label><textarea id="rp-nt" className="pb-input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Colour, collar, the time you saw it" /></div>
              {err}
              {continueBtn("Continue")}
            </>
          )}

          {step === "problem" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">What is wrong?</h1>
              <fieldset className="pb-field"><legend className="pb-sr">The problem</legend>
                <div className="pb-choice rp-problems">{PROBLEMS.map((p) => <label key={p.v}><input type="radio" name="pb" checked={d.problem === p.v} onChange={() => { set({ problem: p.v }); setProblems([]); }} /><span><b>{p.label}</b><small>{p.note}</small></span></label>)}</div>
              </fieldset>
              <fieldset className="pb-field"><legend>Can it walk? <span className="pb-opt">optional</span></legend>
                <div className="pb-chips">{(["yes", "no", "unsure"] as const).map((w) => <button key={w} type="button" aria-pressed={d.walk === w} onClick={() => set({ walk: d.walk === w ? null : w })}>{w === "unsure" ? "Not sure" : w === "yes" ? "Yes" : "No"}</button>)}</div>
              </fieldset>
              <div className="pb-field"><label htmlFor="rp-nt2">In a few words {d.problem === "other" ? <span className="pb-opt">needed for “Something else”</span> : <span className="pb-opt">optional</span>}</label><textarea id="rp-nt2" className="pb-input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What you can see. Not a diagnosis." /></div>
              {err}
              {continueBtn("Continue")}
            </>
          )}

          {step === "contact" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">Can an organisation reach you?</h1>
              <p className="rp-p">Optional. Your contact is never public. It is used only to ask about this animal and to tell you how the report moves.</p>
              <label className="pb-check"><input type="checkbox" checked={d.contactOk} onChange={(e) => { set({ contactOk: e.target.checked }); setProblems([]); }} /><span>Yes, they may email me about this report.</span></label>
              {d.contactOk && <div className="pb-field"><label htmlFor="rp-em">Email</label><input id="rp-em" type="email" className="pb-input" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" inputMode="email" aria-invalid={problems.length > 0 && !EMAIL.test(d.email.trim()) ? true : undefined} /></div>}
              {err}
              {continueBtn("Continue")}
            </>
          )}

          {step === "review" && (
            <>
              <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">Ready to send</h1>
              <dl className="rp-review">
                <div><dt>Report</dt><dd>{help ? "Needs help" : "Sighting"} <button type="button" className="rp-change" onClick={() => go("door")}>Change<span className="pb-sr"> the kind of report</span></button></dd></div>
                {help && <div><dt>Problem</dt><dd>{PROBLEMS.find((p) => p.v === d.problem)?.label ?? <span className="rp-missing">Not given</span>}{d.walk ? ` · can walk: ${d.walk === "unsure" ? "not sure" : d.walk}` : ""} <button type="button" className="rp-change" onClick={() => go("problem")}>Change<span className="pb-sr"> the problem</span></button></dd></div>}
                {!help && <div><dt>Seen</dt><dd>{[...d.seen.map((s) => SEEN.find((x) => x.v === s)?.label), EARS.find((e) => e.v === d.ear)?.label].filter(Boolean).join(" · ") || <span className="rp-missing">Not given</span>} <button type="button" className="rp-change" onClick={() => go("seen")}>Change<span className="pb-sr"> what you saw</span></button></dd></div>}
                <div><dt>Where</dt><dd>{d.coords ? <>{d.zone ?? "Pinned"}{d.landmark ? ` · ${d.landmark}` : ""}</> : <span className="rp-missing">Not pinned</span>} <button type="button" className="rp-change" onClick={() => go("where")}>Change<span className="pb-sr"> the place</span></button></dd></div>
                <div><dt>Photo</dt><dd>{file ? (consent ? "Attached" : <span className="rp-missing">Attached, not confirmed safe to show</span>) : "None"} <button type="button" className="rp-change" onClick={() => go("photo")}>Change<span className="pb-sr"> the photo</span></button></dd></div>
                {help && <div><dt>Contact</dt><dd>{d.contactOk && d.email ? "By email, private" : "No contact"} <button type="button" className="rp-change" onClick={() => go("contact")}>Change<span className="pb-sr"> contact</span></button></dd></div>}
                {claimed && <div><dt>Animal</dt><dd>You said this is a known animal. A reviewer checks it; nothing is merged automatically. <button type="button" className="rp-change" onClick={() => setClaimed(null)}>Remove<span className="pb-sr"> the known animal</span></button></dd></div>}
                {volunteer && <div><dt>Reporting for</dt><dd>An organisation, as {volunteer.name}</dd></div>}
              </dl>
              {HAS_TURNSTILE && <div className="rp-check"><Turnstile onVerify={setToken} /></div>}
              {err}
              <div className="rp-go">
                <button type="button" className={`pb-btn ${help ? "is-flame" : "is-primary"} rp-wide`} onClick={send} disabled={state === "pending"} aria-describedby={problems.length ? "rp-err" : undefined}>{state === "pending" ? "Sending…" : "Send the report"}</button>
              </div>
              <div aria-live="polite">
                {state === "pending" && <Ack state="pending">Sending to StrayPaw. It is not sent until the record answers.</Ack>}
                {state === "offline" && <Ack state="offline">You are offline. The report is kept here as a draft and has not been sent. Send again when you are connected.</Ack>}
                {state === "failed" && <Ack state="failed">Not sent: {error} Your answers are kept; try again.</Ack>}
              </div>
              <p className="pb-fine">Sending shares the place, your answers and the photo with StrayPaw&rsquo;s reviewers and the organisations working nearby. Read how reports are handled in the <Link href="/privacy">privacy notice</Link>.</p>
            </>
          )}
        </section>
      </div>

      <aside className="rp-side" aria-label="Your report so far">
        <p className="rp-side-k">Your report so far</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img className="rp-side-pic" src={preview} alt="" /> : <span className="rp-side-pic is-none"><Camera size={20} aria-hidden /></span>}
        <dl>
          <div><dt>Report</dt><dd>{d.door === "help" ? "Needs help" : d.door === "spotted" ? "Sighting" : "Not chosen"}</dd></div>
          <div><dt>Where</dt><dd>{d.coords ? d.zone ?? "Pinned" : "Not pinned"}</dd></div>
          <div><dt>{help ? "Problem" : "Ears"}</dt><dd>{help ? PROBLEMS.find((p) => p.v === d.problem)?.label ?? "Not given" : EARS.find((e) => e.v === d.ear)?.label ?? "Not given"}</dd></div>
        </dl>
        <p>{state === "pending" ? "Sending…" : "A draft, kept on this device until you send. The photo is not kept in the draft."}</p>
      </aside>
    </div>
  );
}

function Receipt({ receipt, help, restart, heading }: { receipt: { ref: string | null; at: string; dog: string | null }; help: boolean; restart: () => void; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const ref = receipt.ref ? receipt.ref.slice(0, 8).toUpperCase() : null;
  const steps = help ? ["Received", "Under review", "Offered to an organisation", "Accepted by an organisation", "In progress", "Closed with an outcome"] : ["Received", "Reviewed", "On the animal's record"];
  return (
    <div className="s4-wrap rp is-done">
      <div className="rp-form">
        <section className="rp-screen" aria-labelledby="rp-h">
          <p className="pb-eyebrow">Receipt</p>
          <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">Received.</h1>
          <p className="rp-lede">{help ? "Your report reached StrayPaw. It now waits for review. No organisation has accepted it yet, and nobody has been sent." : "Your sighting reached StrayPaw and waits for a quick review before it joins the record."}</p>
          <dl className="rp-review">
            <div><dt>Reference</dt><dd className="rp-mono">{ref ?? "Recorded, reference pending"}</dd></div>
            <div><dt>Sent</dt><dd>{new Date(receipt.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div><dt>Status</dt><dd><span className="pb-tag is-green">Received by StrayPaw</span></dd></div>
          </dl>
          <ol className="rp-track" aria-label="How a report moves">{steps.map((s, i) => <li key={s} className={i === 0 ? "is-on" : ""}><i aria-hidden />{s}{i === 0 && <small>now</small>}</li>)}</ol>
          <p className="pb-fine">Each step is shown only when it really happens. Delivered to an organisation is not the same as accepted; accepted is not the same as treated.</p>
          <div className="rp-go">
            <Link className="pb-btn is-primary" href="/community/activity">Track it in My activity</Link>
            {receipt.dog && <Link className="pb-btn is-line" href={`/animal/${receipt.dog}`}>The animal&rsquo;s record</Link>}
            <button type="button" className="pb-btn is-quiet" onClick={restart}>Report another</button>
          </div>
          {help && <p className="rp-truth">If the animal is in immediate danger, do not wait for this report. <Link href="/community/help">Who to call now</Link>.</p>}
        </section>
      </div>
    </div>
  );
}
