"use client";

/* ════════════════════════════════════════════════════════════════════
   Report a dog: one screen, answered in about ten seconds.

   Somebody reporting is standing in front of an animal. The screen asks
   only what a field team cannot work without, one question at a time,
   each lit in turn and folded to a single line once answered:

     1  a photograph (or, as a real answer, "no photo")
     2  where: taken from the phone or the photograph without asking, and
        shown so it can be corrected; a landmark if they know one
     3  how it is: hurt, thin, puppies, or fine
     4  its ear: notched, not notched, or can't see (the only sign of
        sterilisation a passer-by can read; "can't see" is recorded as
        not examined, never as no)

   Everything else a person may want to add (a name, notes, an email, a
   match to an animal already on the record, reporting for an
   organisation) waits under "More, if you like" and never blocks
   sending. Vaccination is not asked: nobody can see it on a street, and a
   guess would become a coverage figure.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Clock, Crosshair, Loader2, MapPin, PawPrint } from "lucide-react";
import type { MoodTag } from "@/lib/types";
import { nearestCity, reverseGeocode } from "@/lib/delhi";
import { readPhotoMeta, looksIndian } from "@/lib/exif";
import { reportSighting } from "@/lib/actions";
import { LocationPicker } from "@/components/report/LocationPicker";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { useAuth } from "@/components/auth/AuthProvider";
import { AnimalMatch } from "@/components/report/AnimalMatch";
import type { SterilisationStatus } from "@/components/report/ProgrammeStatus";
import { ReportingFor } from "@/components/report/ReportingFor";
import { PhotoStudio } from "@/components/report/PhotoStudio";
import { readVolunteer, type VolunteerSession } from "@/lib/volunteer";
import { track } from "@/lib/analytics";
import "./report.css";

type Status = "idle" | "submitting" | "done";
type Condition = "injured" | "hungry" | "puppies" | "fine";

const CONDITIONS: { v: Condition; label: string; note: string }[] = [
  { v: "injured", label: "Hurt or sick", note: "Someone should come" },
  { v: "hungry", label: "Thin or hungry", note: "Food, and a check" },
  { v: "puppies", label: "Puppies", note: "A litter, or a mother" },
  { v: "fine", label: "Seems fine", note: "Adds to the record" },
];
const EARS: { v: SterilisationStatus; label: string; note: string }[] = [
  { v: "sterilised", label: "Notched", note: "A V-cut on one ear" },
  { v: "not_sterilised", label: "Not notched", note: "Both ears whole" },
  { v: "unknown", label: "Can't see", note: "Recorded as not examined" },
];

export default function ReportPage() {
  const { user, isAuthed, ready, openSignIn } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  /* Auth resolves on the client only; anything that depends on it waits
     for this, so the first client render matches the server's. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [raw, setRaw] = useState<File | null>(null); // off the camera, while it is framed; never uploaded
  const [noPhoto, setNoPhoto] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [where, setWhere] = useState<"finding" | "found" | "photo" | "denied" | "abroad" | "idle">("idle");
  const [editPlace, setEditPlace] = useState(false);
  const [landmark, setLandmark] = useState("");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [ear, setEar] = useState<SterilisationStatus | null>(null);
  const [more, setMore] = useState(false);
  const [nickname, setNickname] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [claimedDogId, setClaimedDogId] = useState<string | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const setPlace = useCallback(async (lat: number, lng: number, how: "found" | "photo") => {
    setCoords({ lat, lng }); setWhere(how);
    setZone(await reverseGeocode(lat, lng).catch(() => null));
  }, []);

  /* Where: from the link (someone pressed "report here" on the map or a
     profile), else from the phone, straight away. They are standing at
     the place; asking them to find it on a map is where reports are lost. */
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setWhere("denied"); setEditPlace(true); return; }
    setWhere("finding");
    navigator.geolocation.getCurrentPosition(({ coords: c }) => {
      if (!looksIndian(c.latitude, c.longitude)) { setWhere("abroad"); setEditPlace(true); return; }
      setPlace(c.latitude, c.longitude, "found");
    }, () => { setWhere("denied"); setEditPlace(true); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }, [setPlace]);

  useEffect(() => {
    setVolunteer(readVolunteer());
    track("report_started", {}, { once: true });
    const q = new URLSearchParams(window.location.search);
    const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
    const dog = q.get("dog");
    if (dog && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dog)) setClaimedDogId(dog);
    if (looksIndian(lat, lng)) setPlace(lat, lng, "found");
    else locate();
  }, [locate, setPlace]);
  useEffect(() => { if (user?.email) setEmail((cur) => cur || user.email!); }, [user?.email]);
  const handleVerify = useCallback((t: string | null) => setToken(t), []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setRaw(picked); setPhoto(null); setFile(null); setNoPhoto(false);
    e.target.value = "";
    /* The camera usually recorded where it stood, which is closer to the
       animal than the phone's fix a minute later. */
    try {
      const m = await readPhotoMeta(picked);
      if (m.lat != null && m.lng != null && looksIndian(m.lat, m.lng)) setPlace(m.lat, m.lng, "photo");
    } catch { /* no metadata */ }
  }

  /* The questions, in order. The first unanswered one is lit. */
  const answered = { photo: !!photo || noPhoto, place: !!coords, how: !!condition, ear: !!ear };
  const order = ["photo", "place", "how", "ear"] as const;
  const now = order.find((k) => !answered[k]) ?? "send";
  const done = order.filter((k) => answered[k]).length;
  const canSubmit = answered.place && answered.how && answered.ear && consent && status === "idle" && (!HAS_TURNSTILE || !!token);

  /* Bring the next question up as each is answered. */
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const prev = useRef(now);
  useEffect(() => {
    if (prev.current === now) return;
    prev.current = now;
    const el = refs.current[now];
    if (el && !raw) el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }, [now, raw]);

  async function submit() {
    if (!canSubmit || !coords || !condition || !ear) return;
    setStatus("submitting"); setError(null);
    const moods: MoodTag[] = condition === "fine" ? [] : [condition];
    try {
      await reportSighting({
        file, fallbackPhotoUrl: photo ?? undefined,
        lat: coords.lat, lng: coords.lng, zone: zone ?? nearestCity(coords.lat, coords.lng),
        nickname: nickname.trim(), moods,
        notes: [landmark.trim() ? `Landmark: ${landmark.trim()}` : "", notes.trim()].filter(Boolean).join("\n"),
        reporterName: volunteer?.name || user?.name || "",
        reporterEmail: email.trim() || undefined, token,
        claimedDogId,
        sterilisationStatus: ear,
        vaccinationStatus: "unknown",
        inviteCode: volunteer?.code ?? null,
        volunteerName: volunteer?.name ?? null,
      });
      track("report_submitted", { claimed_repeat: Boolean(claimedDogId), photo: Boolean(file), condition });
      setStatus("done");
    } catch (e) {
      console.error(e);
      track("report_failed", { reason: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function reset() {
    setStatus("idle"); setPhoto(null); setFile(null); setRaw(null); setNoPhoto(false);
    setCondition(null); setEar(null); setLandmark(""); setNickname(""); setNotes(""); setClaimedDogId(null);
    setConsent(false); setToken(null); setError(null); setMore(false);
    window.scrollTo({ top: 0 });
  }
  function leave() {
    if (window.history.length > 1) router.back(); else router.push("/app");
  }

  const q = (k: (typeof order)[number]) => `rq-q ${answered[k] ? "is-done" : ""} ${now === k ? "is-now" : ""}`;
  const placeLine = zone || (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "");

  return (
    <div className="rq-wrap">
      <div className="report-back">
        <button type="button" onClick={leave}><ArrowLeft size={15} /> Back</button>
      </div>

      <div className="rq report-form">
        <header className="rq-head">
          <h1>Report a dog</h1>
          <p>Four quick answers. Anything you are not sure of has its own button.</p>
          <ol className="rq-dots" aria-label={`${done} of 4 answered`}>
            {order.map((k) => <li key={k} className={answered[k] ? "is-done" : now === k ? "is-now" : ""} />)}
          </ol>
          {volunteer && <p className="rq-for">Reporting for <b>{volunteer.orgName ?? "your organisation"}</b> as {volunteer.name}</p>}
        </header>

        {/* 1 · the photograph */}
        <section ref={(el) => { refs.current.photo = el; }} className={q("photo")} aria-labelledby="rq-photo">
          <h2 id="rq-photo"><span className="rq-n">1</span>Add a photo</h2>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="rq-file" aria-label="Choose a photo of the animal" onChange={onPickPhoto} />
          {raw ? (
            <PhotoStudio file={raw} onCancel={() => { setRaw(null); fileRef.current?.click(); }} onDone={(edited, url) => { setFile(edited); setPhoto(url); setRaw(null); }} />
          ) : photo ? (
            <div className="rq-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="The animal you photographed" />
              <button type="button" className="rq-link" onClick={() => fileRef.current?.click()}><Camera size={14} /> Retake</button>
            </div>
          ) : noPhoto ? (
            <p className="rq-sum">No photo <button type="button" className="rq-link" onClick={() => { setNoPhoto(false); fileRef.current?.click(); }}>Add one</button></p>
          ) : (
            <div className="rq-shoot">
              <button type="button" className="rq-camera" onClick={() => fileRef.current?.click()}>
                <Camera size={30} aria-hidden />
                <b>Take a photo</b>
                <small>Helps a field team recognise it</small>
              </button>
              <button type="button" className="rq-skip" onClick={() => setNoPhoto(true)}>I can&apos;t take one</button>
            </div>
          )}
        </section>

        {/* 2 · where */}
        <section ref={(el) => { refs.current.place = el; }} className={q("place")} aria-labelledby="rq-place">
          <h2 id="rq-place"><span className="rq-n">2</span>Where is it?</h2>
          {coords && !editPlace ? (
            <p className="rq-sum"><MapPin size={15} aria-hidden /><span><b>{placeLine}</b><small>{where === "photo" ? "From your photo" : "From your phone"}</small></span><button type="button" className="rq-link" onClick={() => setEditPlace(true)}>Change</button></p>
          ) : where === "finding" ? (
            <p className="rq-sum"><Loader2 size={15} className="rq-spin" aria-hidden /> Finding where you are…</p>
          ) : (
            <>
              {where === "abroad" && <p className="rq-warn">Your phone places you outside India. StrayPaw records India&apos;s street animals: set where the animal is on the map.</p>}
              {where === "denied" && <p className="rq-warn">Location is off. Allow it, or set the place on the map.</p>}
              {where !== "found" && where !== "photo" && <button type="button" className="rq-chip" onClick={locate}><Crosshair size={15} /> Use where I am</button>}
              <LocationPicker value={coords} zone={zone} onChange={({ lat, lng, zone: z }) => { setCoords({ lat, lng }); setZone(z); setWhere("found"); }} />
              {coords && <button type="button" className="rq-chip is-go" onClick={() => setEditPlace(false)}><Check size={15} /> This is the place</button>}
            </>
          )}
          {coords && (
            <label className="rq-landmark">
              <span>A landmark <em>helps most</em></span>
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Behind the tea stall, opposite the temple gate" />
            </label>
          )}
        </section>

        {/* 3 · how it is */}
        <section ref={(el) => { refs.current.how = el; }} className={q("how")} aria-labelledby="rq-how">
          <h2 id="rq-how"><span className="rq-n">3</span>How is it?</h2>
          <div className="rq-opts" role="radiogroup" aria-labelledby="rq-how">
            {CONDITIONS.map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={condition === o.v} className={`rq-opt ${condition === o.v ? "is-on" : ""} ${o.v === "injured" ? "is-hot" : ""}`} onClick={() => setCondition(o.v)}>
                <b>{o.label}</b><small>{o.note}</small>
              </button>
            ))}
          </div>
          {condition === "injured" && <p className="rq-urgent">It goes to the organisations nearby as needing help. If it is bleeding or cannot move, also call your local animal ambulance now.</p>}
        </section>

        {/* 4 · the ear */}
        <section ref={(el) => { refs.current.ear = el; }} className={q("ear")} aria-labelledby="rq-ear">
          <h2 id="rq-ear"><span className="rq-n">4</span>Is an ear notched?</h2>
          <div className="rq-opts is-three" role="radiogroup" aria-labelledby="rq-ear">
            {EARS.map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={ear === o.v} className={`rq-opt ${ear === o.v ? "is-on" : ""}`} onClick={() => setEar(o.v)}>
                <b>{o.label}</b><small>{o.note}</small>
              </button>
            ))}
          </div>
        </section>

        {/* More, never required */}
        <section className="rq-more">
          <button type="button" className="rq-more-btn" aria-expanded={more} onClick={() => setMore((m) => !m)}>More, if you like <ChevronDown size={16} aria-hidden /></button>
          {more && (
            <div className="rq-more-body">
              {coords && <AnimalMatch lat={coords.lat} lng={coords.lng} value={claimedDogId} onChange={(id) => { setClaimedDogId(id); if (id) track("existing_animal_selected"); }} />}
              <label className="rq-field"><span>A name people call it</span><input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Bruno, Laali, Brownie" /></label>
              <label className="rq-field"><span>Anything else</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Limps on the back left leg, very friendly" /></label>
              <label className="rq-field"><span>Email me when it is on the map</span><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></label>
              <ReportingFor volunteer={volunteer} onChange={setVolunteer} />
              {hydrated && ready && !isAuthed && <p className="rq-signin">No account needed. <button type="button" className="rq-link" onClick={openSignIn}>Sign in</button> to edit this report later.</p>}
            </div>
          )}
        </section>

        {/* Send */}
        <div ref={(el) => { refs.current.send = el; }} className={`rq-send ${raw ? "is-hidden" : ""} ${now === "send" ? "is-now" : ""}`}>
          <label className="rq-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>My photo shows no faces, homes or number plates, and I may share it.</span>
          </label>
          {HAS_TURNSTILE && now === "send" && <Turnstile onVerify={handleVerify} />}
          {error && <p className="rq-error">{error}</p>}
          <button type="button" className="rq-go" onClick={submit} disabled={!canSubmit}>
            {status === "submitting" ? <><Loader2 size={18} className="rq-spin" /> Sending</> : <><PawPrint size={18} /> Send report</>}
          </button>
          {now !== "send" && <p className="rq-left">{4 - done === 1 ? "One answer left" : `${4 - done} answers left`}</p>}
        </div>
      </div>

      <AnimatePresence>
        {status === "done" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rq-done-wrap">
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} className="rq-done" role="dialog" aria-labelledby="rq-done-t">
              <span className="rq-done-ic"><Clock size={30} /></span>
              <h2 id="rq-done-t">Sent. Thank you.</h2>
              <p>It is checked quickly, then it appears on the map{condition === "injured" ? " and goes to the organisations nearby as needing help" : ""}.</p>
              <Link href="/following" className="rq-go">See your reports <ArrowRight size={16} /></Link>
              <button type="button" className="rq-link" onClick={reset}>Report another</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
