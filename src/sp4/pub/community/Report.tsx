"use client";

/* ════════════════════════════════════════════════════════════════════
   Report an animal (/community/report): the citizen report that reaches
   organisations' inboxes, on one screen a thumb can finish in seconds:

     what is happening (one tap) · where (found, pinned or chosen) ·
     a photo (optional) · Send

   Words, a landmark, the animal's mood and a contact address are there
   but folded away. The map's "Report here" arrives with the place
   already pinned (?lat&lng), so a needs-help report is one tap and Send.

   It sends exactly what the step-by-step form sent: the photo to the
   public "sightings" bucket, then POST /api/report (Turnstile-verified
   and rate-limited on the server) through reportSighting(), with the
   same notes lines, moods and statuses. The receipt records submission,
   never acceptance by an organisation or a rescue. The draft is kept on
   this device (never the photo) until sent; offline is a visible,
   unsent draft that goes by itself when the signal is back while the
   page is open; a second tap cannot send twice; a failure keeps every
   answer. A possible match to a known animal is a claim for review,
   never a merge. The photo consent is still asked before a photo goes.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Crosshair, Map as MapIcon, Send, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { reportSighting } from "@/lib/actions";
import { readPhotoMeta, looksIndian } from "@/lib/exif";
import { describeSpot, nearestCity, reverseGeocode } from "@/lib/delhi";
import { locateMe } from "@/sp/atlas/locate";
import { readVolunteer, type VolunteerSession } from "@/lib/volunteer";
import type { MoodTag } from "@/lib/types";
import { CheckDraw } from "@/nx/motion";
import { PinPicker } from "../map";
import { Ack } from "../kit";
import "./report.css";

type Door = "spotted" | "help";
type Problem = "injured" | "vehicle" | "trapped" | "weak" | "puppies" | "other";
type Seen = "friendly" | "shy" | "puppies" | "hungry" | "sleeping";
type Ear = "sterilised" | "not_sterilised" | "unknown";

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

/* The same key and shape as the earlier form, so a draft started there carries over. */
const DRAFT = "sp2.report.draft";
type Draft = { door: Door | null; coords: { lat: number; lng: number } | null; zone: string | null; landmark: string; problem: Problem | null; walk: "yes" | "no" | "unsure" | null; seen: Seen[]; ear: Ear | null; notes: string; email: string; contactOk: boolean };
const blank: Draft = { door: null, coords: null, zone: null, landmark: "", problem: null, walk: null, seen: [], ear: null, notes: "", email: "", contactOk: false };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Sec = "what" | "where" | "photo" | "more" | "send";

export function Report() {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(blank);
  const [restored, setRestored] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  const [state, setState] = useState<"draft" | "pending" | "failed" | "offline" | "sent">("draft");
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<{ msg: string; at: Sec }[]>([]);
  const [receipt, setReceipt] = useState<{ ref: string | null; at: string; dog: string | null } | null>(null);
  const [pickLabel, setPickLabel] = useState<string | null>(null);
  const [map, setMap] = useState(false);
  const [locating, setLocating] = useState(false), [locErr, setLocErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const photoRead = useRef(0);
  const sending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const sec = useRef<Record<Sec, HTMLElement | null>>({ what: null, where: null, photo: null, more: null, send: null });
  const set = useCallback((p: Partial<Draft>) => setD((x) => ({ ...x, ...p })), []);

  /* A point from the phone or the map is named at once from the phone's own list, then from a map service. */
  const pin = useCallback((lat: number, lng: number) => {
    if (!looksIndian(lat, lng)) { setLocErr("That place is outside India. Choose it on the map."); setMap(true); return; }
    const near = nearestCity(lat, lng);
    setD((x) => ({ ...x, coords: { lat, lng }, zone: near })); setPickLabel(near); setLocErr(null);
    describeSpot(lat, lng).then(({ zone, street }) => { setD((x) => (x.coords?.lat === lat && x.coords?.lng === lng ? { ...x, zone } : x)); setPickLabel(street ? `${street}, ${zone}` : zone); }).catch(() => {});
  }, []);
  const here = useCallback(() => {
    setLocating(true); setLocErr(null);
    locateMe((lat, lng) => { setLocating(false); pin(lat, lng); }, (m) => { setLocating(false); setLocErr(m); setMap(true); });
  }, [pin]);

  /* Restore a draft and read the link (?animal=, ?lat&lng, ?help=1). */
  useEffect(() => {
    let draft: Draft | null = null;
    try { const s = localStorage.getItem(DRAFT); if (s) { const v = JSON.parse(s) as Draft; if (v.door) draft = { ...blank, ...v }; } } catch { /* storage blocked */ }
    if (draft) { setD(draft); setRestored(true); if (draft.zone) setPickLabel(draft.zone); }
    const q = new URLSearchParams(window.location.search);
    const a = q.get("animal");
    if (a && /^[0-9a-f-]{36}$/i.test(a)) setClaimed(a);
    const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
    const linked = !!q.get("lat") && !!q.get("lng") && looksIndian(lat, lng);
    if (linked) {
      const near = nearestCity(lat, lng);
      set({ coords: { lat, lng }, zone: near }); setPickLabel(near);
      reverseGeocode(lat, lng).then((z) => { setD((x) => (x.coords?.lat === lat && x.coords?.lng === lng ? { ...x, zone: z } : x)); setPickLabel(z); }).catch(() => {});
    }
    if (q.get("help") === "1" && !draft) set({ door: "help" });
    setVolunteer(readVolunteer());
    /* Where the person already lets this site know their location, it is found without asking; otherwise one tap. */
    if (!linked && !draft?.coords && navigator.permissions?.query) navigator.permissions.query({ name: "geolocation" as PermissionName }).then((p) => { if (p.state === "granted") here(); }).catch(() => {});
  }, [set, here]);
  useEffect(() => { if (state === "sent") return; try { if (d.door) localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* storage blocked */ } }, [d, state]);
  useEffect(() => { if (user?.email) setD((x) => ({ ...x, email: x.email || user.email || "" })); }, [user?.email]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (state === "sent") heading.current?.focus(); }, [state]);

  const help = d.door === "help";

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.type && !/^image\//.test(f.type)) { setProblems([{ msg: "That file is not a photo. Choose a JPG, PNG, WebP or HEIC image.", at: "photo" }]); return; }
    if (f.size > 8 * 1024 * 1024) { setProblems([{ msg: "That photo is over 8 MB. Choose a smaller one, or take a new photo.", at: "photo" }]); return; }
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

  /* What is still missing before the report can be sent, in plain words, each pointing at its part of the screen. */
  const missing = (): { msg: string; at: Sec }[] => {
    const out: { msg: string; at: Sec }[] = [];
    if (!d.door || (help && !d.problem)) out.push({ msg: "Say what is happening.", at: "what" });
    if (help && d.problem === "other" && d.notes.trim().length < 4) out.push({ msg: "Describe the problem in a few words.", at: "what" });
    if (d.door === "spotted" && !d.ear) out.push({ msg: "Say what you saw of its ears. “I couldn’t see” is a fine answer.", at: "what" });
    if (!d.coords) out.push({ msg: "Pin where the animal is: use where you are, or choose it on the map.", at: "where" });
    if (file && !consent) out.push({ msg: "Confirm the photo shows no person’s face, number plate or house number, or remove it.", at: "photo" });
    if (help && d.contactOk && !EMAIL.test(d.email.trim())) out.push({ msg: "Enter an email address an organisation can write to, or untick the contact box.", at: "more" });
    if (HAS_TURNSTILE && !token) out.push({ msg: "Complete the check above the Send button.", at: "send" });
    return out;
  };

  async function send() {
    if (sending.current) return;
    const m = missing();
    if (m.length || !d.coords) {
      setProblems(m); setState("draft");
      if (m[0]?.at === "more" && moreRef.current) moreRef.current.open = true;
      window.setTimeout(() => { const el = sec.current[m[0]?.at ?? "what"]; el?.scrollIntoView({ block: "center", behavior: "auto" }); el?.querySelector<HTMLElement>("button, input, textarea")?.focus({ preventScroll: true }); }, 0);
      return;
    }
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
  /* Offline, the report waits here; when the signal comes back while the page is open it is sent once, by itself. */
  const sendRef = useRef(send); sendRef.current = send;
  useEffect(() => {
    if (state !== "offline") return;
    const back = () => void sendRef.current();
    window.addEventListener("online", back); return () => window.removeEventListener("online", back);
  }, [state]);
  const restart = () => { setD(blank); setFile(null); setPreview(null); setConsent(false); setReceipt(null); setState("draft"); setRestored(false); setProblems([]); setPickLabel(null); setMap(false); setLocErr(null); try { localStorage.removeItem(DRAFT); } catch { /* blocked */ } window.scrollTo(0, 0); };

  if (state === "sent" && receipt) return <Receipt receipt={receipt} help={help} restart={restart} heading={heading} />;

  const errAt = (s: Sec) => { const p = problems.filter((x) => x.at === s); return p.length ? <p className="rp-miss" id={`rp-miss-${s}`} role="alert">{p.map((x) => x.msg).join(" ")}</p> : null; };
  const chooseHelp = (p: Problem) => { set({ door: "help", problem: p }); setProblems((x) => x.filter((y) => y.at !== "what")); };
  const chooseSeen = () => { set({ door: "spotted", problem: null }); setProblems((x) => x.filter((y) => y.at !== "what")); };
  const words = help && d.problem === "other";

  return (
    <div className="s4-wrap rpf">
      <div className="rp-form">
        <header className="rp-intro">
          <p className="pb-eyebrow">Report an animal{d.zone ? ` · ${d.zone}` : ""}</p>
          <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h">What did you see?</h1>
          <p className="rp-truth">StrayPaw keeps the record and passes needs-help reports to organisations for review. It is not an emergency service and cannot promise anyone will come. If an animal is in immediate danger, <Link href="/community/help">call a local animal ambulance or vet</Link>.</p>
        </header>
        {restored && (
          <div className="pb-note is-blue rp-restored">
            <div>Your answers from earlier are filled in below. They are kept on this device until you send.</div>
            <div className="pb-note-a"><button type="button" className="pb-btn is-line is-s" onClick={restart}>Start fresh</button></div>
          </div>
        )}
        {claimed && <p className="pb-fine">You are reporting an animal already on the record. A reviewer checks it is the same animal; nothing is merged automatically. <button type="button" className="rp-change" onClick={() => setClaimed(null)}>Not this animal</button></p>}

        <section className="rp-sec" ref={(el) => { sec.current.what = el; }} aria-labelledby="rp-what">
          <h2 id="rp-what" className="rp-q">What is happening?</h2>
          <div className="rp-tiles" role="radiogroup" aria-labelledby="rp-what" aria-describedby={problems.some((x) => x.at === "what") ? "rp-miss-what" : undefined}>
            {PROBLEMS.map((p) => <button key={p.v} type="button" role="radio" aria-checked={help && d.problem === p.v} className="rp-tile is-help" onClick={() => chooseHelp(p.v)}><b>{p.label}</b><small>{p.note}</small></button>)}
            <button type="button" role="radio" aria-checked={d.door === "spotted"} className="rp-tile is-seen" onClick={chooseSeen}><b>Just seen, it seems fine</b><small>Add a sighting to the record</small></button>
          </div>
          {d.door === "spotted" && (
            <div className="rp-sub">
              <h3 id="rp-ears" className="rp-q2">Its ears</h3>
              <div className="pb-chips rp-chips" role="radiogroup" aria-labelledby="rp-ears">{EARS.map((e) => <button key={e.v} type="button" role="radio" aria-checked={d.ear === e.v} onClick={() => { set({ ear: e.v }); setProblems((x) => x.filter((y) => y.at !== "what")); }}>{e.label}</button>)}</div>
              {d.ear && EARS.find((e) => e.v === d.ear)?.note ? <p className="pb-fine">{EARS.find((e) => e.v === d.ear)?.note}.</p> : null}
            </div>
          )}
          {words && <div className="pb-field"><label htmlFor="rp-nt">What is wrong, in a few words <span className="pb-opt">needed for “Something else”</span></label><textarea id="rp-nt" className="pb-input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What you can see. Not a diagnosis." rows={2} /></div>}
          {errAt("what")}
        </section>

        <section className="rp-sec" ref={(el) => { sec.current.where = el; }} aria-labelledby="rp-where">
          <h2 id="rp-where" className="rp-q">Where is it?</h2>
          {d.coords && !map ? (
            <div className="rp-pin is-on" role="status">
              <span><b>{pickLabel ?? d.zone ?? "Pinned"}</b><small>Only reviewers and organisations see the exact point; the public record shows the area.</small></span>
              <button type="button" className="pb-btn is-line" onClick={() => setMap(true)}><MapIcon size={16} aria-hidden />Change</button>
            </div>
          ) : !map ? (
            <div className="rp-where-a">
              <button type="button" className="pb-btn is-primary rp-big" onClick={here} disabled={locating} aria-describedby={problems.some((x) => x.at === "where") ? "rp-miss-where" : undefined}><Crosshair size={20} aria-hidden />{locating ? "Finding you…" : "Use where I am"}</button>
              <button type="button" className="pb-btn is-line rp-big" onClick={() => setMap(true)}><MapIcon size={20} aria-hidden />Choose on the map</button>
            </div>
          ) : null}
          {locErr ? <p className="pbm-warn" role="alert">{locErr}</p> : null}
          {map ? <>
            <PinPicker statusClass="rp2-where" value={d.coords} label={pickLabel} onLabel={setPickLabel} onPick={(p) => { set({ coords: { lat: p.lat, lng: p.lng }, zone: p.zone }); setProblems((x) => x.filter((y) => y.at !== "where")); }} />
            {d.coords ? <button type="button" className="pb-btn is-line rp-done-map" onClick={() => setMap(false)}>This is the place</button> : null}
          </> : null}
          {errAt("where")}
        </section>

        <section className="rp-sec" ref={(el) => { sec.current.photo = el; }} aria-labelledby="rp-photo">
          <h2 id="rp-photo" className="rp-q">A photo <span className="pb-opt">optional</span></h2>
          <input ref={fileRef} id="rp-file" type="file" accept="image/*" capture="environment" className="pb-sr" onChange={pickPhoto} tabIndex={-1} aria-hidden />
          <button type="button" className={`rp-camera${preview ? " has-photo" : ""}`} onClick={() => fileRef.current?.click()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Your photo" /> : <Camera size={28} aria-hidden />}
            <b>{preview ? "Retake or choose another" : "Take or choose a photo"}</b>
            {preview ? null : <small>{help ? "Only if it is safe. Never approach a hurt or frightened animal to take it." : "It helps the right animal be recognised."}</small>}
          </button>
          {preview && (
            <>
              <label className="pb-check rp-consent">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setProblems((x) => x.filter((y) => y.at !== "photo")); }} />
                <span>I took this photo and it shows no person&rsquo;s face, number plate or house number. It may be shown on the animal&rsquo;s public record; photos that may show an injury start blurred.</span>
              </label>
              <button type="button" className="pb-btn is-quiet rp-start" onClick={removePhoto}><X size={16} aria-hidden /> Remove the photo</button>
            </>
          )}
          {errAt("photo")}
        </section>

        <details className="rp-more" ref={(el) => { moreRef.current = el; sec.current.more = el; }}>
          <summary><span><b>{help ? "Add words, a landmark or your email" : "Add words, a landmark or how it seemed"}</b><small>Optional{d.notes.trim() || d.landmark.trim() || d.contactOk || d.seen.length || d.walk ? ` · ${[d.notes.trim() && !words && "words", d.landmark.trim() && "landmark", d.contactOk && "email", d.seen.length && "how it seemed", d.walk && "can it walk"].filter(Boolean).join(", ")}` : ""}</small></span><ChevronDown size={20} aria-hidden /></summary>
          <div className="rp-more-b">
            {!words && <div className="pb-field"><label htmlFor="rp-nt2">In a few words <span className="pb-opt">optional</span></label><textarea id="rp-nt2" className="pb-input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={help ? "What you can see. Not a diagnosis." : "Colour, collar, the time you saw it"} rows={2} /><p className="pb-fine">You can speak instead: use the microphone on your keyboard.</p></div>}
            <div className="pb-field"><label htmlFor="rp-lm">A landmark people would know <span className="pb-opt">optional</span></label><input id="rp-lm" className="pb-input" value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder="Behind the tea stall, opposite the temple" /></div>
            {help ? <>
              <fieldset className="pb-field"><legend>Can it walk? <span className="pb-opt">optional</span></legend>
                <div className="pb-chips">{(["yes", "no", "unsure"] as const).map((w) => <button key={w} type="button" aria-pressed={d.walk === w} onClick={() => set({ walk: d.walk === w ? null : w })}>{w === "unsure" ? "Not sure" : w === "yes" ? "Yes" : "No"}</button>)}</div>
              </fieldset>
              <div className="pb-field">
                <label className="pb-check"><input type="checkbox" checked={d.contactOk} onChange={(e) => { set({ contactOk: e.target.checked }); setProblems((x) => x.filter((y) => y.at !== "more")); }} /><span>An organisation may email me about this report. My contact is never public.</span></label>
                {d.contactOk && <><label htmlFor="rp-em" className="pb-sr">Email</label><input id="rp-em" type="email" className="pb-input" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" inputMode="email" placeholder="Email" aria-invalid={problems.some((x) => x.at === "more") ? true : undefined} /></>}
              </div>
            </> : (
              <fieldset className="pb-field"><legend>How it seemed <span className="pb-opt">choose any</span></legend>
                <div className="pb-chips">{SEEN.map((s) => <button key={s.v} type="button" aria-pressed={d.seen.includes(s.v)} onClick={() => set({ seen: d.seen.includes(s.v) ? d.seen.filter((x) => x !== s.v) : [...d.seen, s.v] })}>{s.label}</button>)}</div>
              </fieldset>
            )}
            {errAt("more")}
          </div>
        </details>

        <div className="rp-send" ref={(el) => { sec.current.send = el; }}>
          {HAS_TURNSTILE && <div className="rp-check"><Turnstile onVerify={setToken} /></div>}
          {errAt("send")}
          <div aria-live="polite" className="rp-live">
            {state === "pending" && <Ack state="pending">Sending to StrayPaw. It is not sent until the record answers.</Ack>}
            {state === "offline" && <Ack state="offline">You are offline, so it has not been sent. Your answers are kept on this phone; it sends by itself when the signal is back while this page is open{file ? " (the photo is kept only while the page is open)" : ""}.</Ack>}
            {state === "failed" && <Ack state="failed">Not sent: {error} Your answers are kept; try again.</Ack>}
          </div>
          <p className="pb-fine">Sending shares the place, your answers and the photo with StrayPaw&rsquo;s reviewers and the organisations working nearby{volunteer ? `, as ${volunteer.name} for an organisation` : ""}. Read how reports are handled in the <Link href="/privacy">privacy notice</Link>.</p>
        </div>
        <div className="rp-bar">
          <button type="button" className={`pb-btn ${help ? "is-flame" : "is-primary"} rp-big rp-go-send`} onClick={send} disabled={state === "pending"}><Send size={20} aria-hidden />{state === "pending" ? "Sending…" : "Send the report"}</button>
        </div>
      </div>
    </div>
  );
}

function Receipt({ receipt, help, restart, heading }: { receipt: { ref: string | null; at: string; dog: string | null }; help: boolean; restart: () => void; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const ref = receipt.ref ? receipt.ref.slice(0, 8).toUpperCase() : null;
  const steps = help ? ["Received", "Under review", "Offered to an organisation", "Accepted by an organisation", "In progress", "Closed with an outcome"] : ["Received", "Reviewed", "On the animal's record"];
  return (
    <div className="s4-wrap rpf is-done">
      <div className="rp-form">
        <section className="rp-screen" aria-labelledby="rp-h">
          <p className="pb-eyebrow">Receipt</p>
          <h1 id="rp-h" ref={heading} tabIndex={-1} className="rp-h"><span className="rp-tick" aria-hidden><CheckDraw size={28} stroke={2} /></span>Received.</h1>
          <p className="rp-lede" role="status">{help ? "Your report reached StrayPaw. It now waits for review. No organisation has accepted it yet, and nobody has been sent." : "Your sighting reached StrayPaw and waits for a quick review before it joins the record."}</p>
          <dl className="rp-review">
            <div><dt>Reference</dt><dd className="rp-mono">{ref ?? "Recorded, reference pending"}</dd></div>
            <div><dt>Sent</dt><dd>{new Date(receipt.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>
            <div><dt>Status</dt><dd><span className="pb-tag is-green">Received by StrayPaw</span></dd></div>
          </dl>
          <ol className="rp-track" aria-label="How a report moves">{steps.map((s, i) => <li key={s} className={i === 0 ? "is-on" : ""}><i aria-hidden />{s}{i === 0 && <small>now</small>}</li>)}</ol>
          <p className="pb-fine">Each step is shown only when it really happens. Delivered to an organisation is not the same as accepted; accepted is not the same as treated.</p>
          <div className="rp-go">
            <Link className="pb-btn is-primary rp-big" href="/community/activity">Track it in My activity</Link>
            {receipt.dog && <Link className="pb-btn is-line rp-big" href={`/animal/${receipt.dog}`}>The animal&rsquo;s record</Link>}
            <button type="button" className="pb-btn is-line rp-big" onClick={restart}>Report another</button>
          </div>
          {help && <p className="rp-truth">If the animal is in immediate danger, do not wait for this report. <Link href="/community/help">Who to call now</Link>.</p>}
        </section>
      </div>
    </div>
  );
}
