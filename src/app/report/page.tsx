"use client";

/* ════════════════════════════════════════════════════════════════════
   Report a dog: one question on the screen at a time, one tap each.

   Somebody reporting is standing in front of an animal, often with one
   hand free. Each screen asks one thing and moves on by itself the moment
   it is answered:

     1  Photo      take one, or "I can't take one" (a real answer)
     2  Where      found from the phone or the photo while step 1 is
                   answered; one tap to confirm, or change it on the map
     3  How is it  hurt, thin, puppies, fine
     4  Ear        notched, not notched, can't see ("can't see" is kept as
                   not examined, never as no)
     5  Send       the four answers on one card, each tappable to change,
                   the consent, and Send

   A name, notes, an email, a match to a known animal and reporting for an
   organisation are one optional link on the last screen, closed until
   opened. Vaccination is not asked: nobody can see it on a street.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Clock, Crosshair, HeartHandshake, Loader2, MapPin, PawPrint } from "lucide-react";
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
import "./report-x.css";

type Status = "idle" | "submitting" | "done";
type Condition = "injured" | "hungry" | "puppies" | "fine";
type Step = 0 | 1 | 2 | 3 | 4;

const CONDITIONS: { v: Condition; label: string; note: string }[] = [
  { v: "injured", label: "Hurt or sick", note: "Sent for review. Not an emergency service." },
  { v: "hungry", label: "Thin or hungry", note: "Food, and a check" },
  { v: "puppies", label: "Puppies", note: "A litter, or a mother" },
  { v: "fine", label: "Seems fine", note: "Adds to the record" },
];
const EARS: { v: SterilisationStatus; label: string; note: string }[] = [
  { v: "sterilised", label: "Notched", note: "A V-cut on one ear" },
  { v: "not_sterilised", label: "Not notched", note: "Both ears whole" },
  { v: "unknown", label: "Can't see", note: "Kept as not examined" },
];
const TITLES = ["Report a dog", "Where is the dog?", "How is it?", "Is an ear notched?", "Ready to share"];

export default function ReportPage() {
  const { user, isAuthed, ready, openSignIn } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [raw, setRaw] = useState<File | null>(null); // off the camera, while it is framed; never uploaded
  const [noPhoto, setNoPhoto] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [where, setWhere] = useState<"finding" | "found" | "photo" | "map" | "link" | "denied" | "abroad" | "idle">("idle");
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
  /* Coming back to change one answer returns straight to the last screen. */
  const [reviewing, setReviewing] = useState(false);

  const go = useCallback((to: Step) => {
    setStep((cur) => { setDir(to >= cur ? 1 : -1); return to; });
    window.scrollTo({ top: 0 });
  }, []);
  const answered = useCallback((from: Step) => {
    /* The funnel's existing steps: the photo, the place, and the details
       (both taps count as details, recorded once the ear is answered). */
    if (from === 0) track("report_photo_added");
    else if (from === 1) track("report_location_set");
    else if (from === 3) track("report_details_filled");
    go(reviewing ? 4 : ((from + 1) as Step));
  }, [go, reviewing]);

  const setPlace = useCallback(async (lat: number, lng: number, how: "found" | "photo" | "link") => {
    setCoords({ lat, lng }); setWhere(how);
    setZone(await reverseGeocode(lat, lng).catch(() => null));
  }, []);

  /* Where is found while the photo is being taken: from the link (someone
     pressed "report here" on the map or a profile), else from the phone. */
  /* Set when the person chooses the map while the phone is still looking. */
  const byHand = useRef(false);
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setWhere("map"); setEditPlace(true); return; }
    setWhere("finding");
    /* The browser's own timeout only starts once permission is given; a
       prompt left unanswered would spin here for ever. After 15 seconds the
       map takes over; a late answer is then ignored rather than moving a
       place the person may already have set by hand. */
    let late = false;
    byHand.current = false;
    const giveUp = window.setTimeout(() => {
      late = true;
      setWhere((w) => (w === "finding" ? "map" : w));
      setEditPlace(true);
    }, 15000);
    navigator.geolocation.getCurrentPosition(({ coords: c }) => {
      window.clearTimeout(giveUp);
      if (late || byHand.current) return;
      if (!looksIndian(c.latitude, c.longitude)) { setWhere("abroad"); setEditPlace(true); return; }
      setPlace(c.latitude, c.longitude, "found");
    }, () => { window.clearTimeout(giveUp); if (!late) { setWhere("map"); setEditPlace(true); } }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }, [setPlace]);

  useEffect(() => {
    setVolunteer(readVolunteer());
    track("report_started", {}, { once: true });
    const q = new URLSearchParams(window.location.search);
    const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
    const dog = q.get("dog");
    if (dog && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dog)) setClaimedDogId(dog);
    if (looksIndian(lat, lng)) setPlace(lat, lng, "link");
    else locate();
  }, [locate, setPlace]);
  useEffect(() => { if (user?.email) setEmail((cur) => cur || user.email!); }, [user?.email]);
  const handleVerify = useCallback((t: string | null) => setToken(t), []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setRaw(picked); setNoPhoto(false);
    e.target.value = "";
    /* The camera recorded where it stood, closer to the animal than the
       phone's fix a minute later. */
    try {
      const m = await readPhotoMeta(picked);
      if (m.lat != null && m.lng != null && looksIndian(m.lat, m.lng)) setPlace(m.lat, m.lng, "photo");
    } catch { /* no metadata */ }
  }

  const ready4 = !!coords && !!condition && !!ear;
  const hasPhoto = Boolean(file || photo);
  const canSubmit = ready4 && (!hasPhoto || consent) && status === "idle" && (!HAS_TURNSTILE || !!token);

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
    setConsent(false); setToken(null); setError(null); setMore(false); setReviewing(false); setEditPlace(false);
    go(0);
  }
  function back() {
    if (raw) { setRaw(null); return; }
    if (step === 0) { if (window.history.length > 1) router.back(); else router.push("/app"); return; }
    go((step - 1) as Step);
  }
  const edit = (to: Step) => { setReviewing(true); if (to === 1) setEditPlace(true); go(to); };

  const placeLine = zone || (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "");
  const condLabel = CONDITIONS.find((c) => c.v === condition)?.label;
  const earLabel = EARS.find((e) => e.v === ear)?.label;

  return (
    <div className="rq-wrap" data-ready={hydrated ? "1" : undefined}>
      <header className="rq-top">
        <button type="button" className="rq-back" onClick={back} aria-label={step === 0 && !raw ? "Leave the report" : "Back"}><ArrowLeft size={18} /></button>
        <ol className="rq-dots" aria-label={`Step ${step + 1} of 5`}>
          {TITLES.map((t, i) => <li key={t} aria-current={i === step ? "step" : undefined} className={i < step ? "is-done" : i === step ? "is-now" : ""}><span>{String(i + 1).padStart(2, "0")}</span><b>{["Photograph", "Location", "Condition", "Ear notch", "Review"][i]}</b></li>)}
        </ol>
        <span className="rq-count sys-mono">{step + 1}/5</span>
      </header>
      <aside className="rq-context"><p>Your report</p><dl><div><dt>Entry stage</dt><dd>{String(step + 1).padStart(2, "0")} / 05</dd></div><div><dt>Place</dt><dd>{zone || (coords ? "Location selected" : "Not recorded yet")}</dd></div><div><dt>Evidence</dt><dd>{file ? "Photograph attached" : "Photograph pending"}</dd></div><div><dt>State</dt><dd>Not submitted</dd></div></dl><p className="rq-context-evidence">Record what you can see. Unknown is a valid observation, not a failed answer.</p></aside>
      {!volunteer && <div className="rq-purpose">
        <span><HeartHandshake size={15} aria-hidden /> A shared care trail starts here</span>
        <small>About a minute · no account needed</small>
      </div>}
      {!volunteer && <p className="rq-orientation"><Link href="/">Main site</Link><span>·</span>Nothing is saved until you send.</p>}
      {volunteer && step === 0 && <p className="rq-for">Reporting for <b>{volunteer.orgName}</b> as {volunteer.name}</p>}

      <div className="rq report-form">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.section
            key={step}
            className="rq-screen"
            aria-labelledby="rq-title"
            custom={dir}
            initial={{ opacity: 0, x: reducedMotion ? 0 : 28 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -28 * dir }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <h1 id="rq-title">{TITLES[step]}</h1>

            {/* 1 · the photograph */}
            {step === 0 && (
              <>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="rq-file" aria-label="Choose a photo of the animal" onChange={onPickPhoto} />
                {raw ? (
                  <PhotoStudio file={raw} onCancel={() => { setRaw(null); fileRef.current?.click(); }} onDone={(edited, url) => { setFile(edited); setPhoto(url); setRaw(null); answered(0); }} />
                ) : (
                  <>
                    <p className="rq-kicker">You noticed them. We can carry it forward.</p>
                    <p className="rq-lede">A clear photo helps a care team recognise the right animal. A report without one still matters.</p>
                    <button type="button" className="rq-camera" onClick={() => fileRef.current?.click()}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="Your photo of the animal" />
                      ) : <Camera size={34} aria-hidden />}
                      <b>{photo ? "Retake" : "Take a photo"}</b>
                    </button>
                    {photo ? (
                      <button type="button" className="rq-next" onClick={() => answered(0)}>Use this photo <ArrowRight size={17} /></button>
                    ) : (
                      <button type="button" className="rq-skip" onClick={() => { setNoPhoto(true); answered(0); }}>I can&apos;t take one</button>
                    )}
                  </>
                )}
              </>
            )}

            {/* 2 · where */}
            {step === 1 && (
              <>
                {coords && !editPlace ? (
                  <>
                    <div className="rq-place">
                      <MapPin size={22} aria-hidden />
                      <span><b>{placeLine}</b><small>{where === "photo" ? "From your photo" : where === "found" ? "From your phone" : where === "link" ? "From the record or map" : "Selected on the map"}</small></span>
                    </div>
                    <label className="rq-landmark">
                      <span>A landmark people would know <em>optional</em></span>
                      <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Behind the tea stall, opposite the temple" />
                    </label>
                    <button type="button" className="rq-next" onClick={() => answered(1)}><Check size={17} /> That&apos;s right</button>
                    <button type="button" className="rq-skip" onClick={() => setEditPlace(true)}>Change</button>
                  </>
                ) : where === "finding" ? (
                  <>
                    <p className="rq-lede"><Loader2 size={16} className="rq-spin" aria-hidden /> Finding where you are…</p>
                    <button type="button" className="rq-skip" onClick={() => { byHand.current = true; setWhere("map"); setEditPlace(true); }}>Set it on the map instead</button>
                  </>
                ) : (
                  <>
                    {where === "abroad" && <p className="rq-warn">Your phone places you outside India. StrayPaw records India&apos;s street animals: set where the animal is on the map.</p>}
                    {where !== "found" && where !== "photo" && <button type="button" className="rq-chip" onClick={locate}><Crosshair size={15} /> Use where I am</button>}
                    <LocationPicker value={coords} zone={zone} onChange={({ lat, lng, zone: z }) => { setCoords({ lat, lng }); setZone(z); setWhere("map"); }} />
                    <button type="button" className="rq-next" disabled={!coords} onClick={() => { setEditPlace(false); answered(1); }}><Check size={17} /> This is the place</button>
                  </>
                )}
              </>
            )}

            {/* 3 · how it is */}
            {step === 2 && (
              <div className="rq-opts" role="radiogroup" aria-labelledby="rq-title">
                {CONDITIONS.map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={condition === o.v} className={`rq-opt ${condition === o.v ? "is-on" : ""} ${o.v === "injured" ? "is-hot" : ""}`}
                    onClick={() => { setCondition(o.v); answered(2); }}>
                    <b>{o.label}</b><small>{o.note}</small>
                  </button>
                ))}
              </div>
            )}

            {/* 4 · the ear */}
            {step === 3 && (
              <>
                <p className="rq-lede">A small V cut from the tip of one ear means it has been sterilised.</p>
                <div className="rq-opts" role="radiogroup" aria-labelledby="rq-title">
                  {EARS.map((o) => (
                    <button key={o.v} type="button" role="radio" aria-checked={ear === o.v} className={`rq-opt ${ear === o.v ? "is-on" : ""}`} onClick={() => { setEar(o.v); answered(3); }}>
                      <b>{o.label}</b><small>{o.note}</small>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 5 · check and send */}
            {step === 4 && (
              <>
                <ul className="rq-sum" aria-label="Your report">
                  <li><button type="button" onClick={() => edit(0)}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" />
                    ) : <span className="rq-sum-ic"><Camera size={16} /></span>}
                    <span><small>Photo</small><b>{photo ? "Added" : noPhoto ? "No photo" : "Not added"}</b></span><em>Change</em>
                  </button></li>
                  <li><button type="button" onClick={() => edit(1)}>
                    <span className="rq-sum-ic"><MapPin size={16} /></span>
                    <span><small>Where</small><b>{placeLine || "Not set"}{landmark ? ` · ${landmark}` : ""}</b></span><em>Change</em>
                  </button></li>
                  <li><button type="button" onClick={() => edit(2)} className={condition === "injured" ? "is-hot" : ""}>
                    <span className="rq-sum-ic"><PawPrint size={16} /></span>
                    <span><small>How it is</small><b>{condLabel ?? "Not answered"}</b></span><em>Change</em>
                  </button></li>
                  <li><button type="button" onClick={() => edit(3)}>
                    <span className="rq-sum-ic"><Check size={16} /></span>
                    <span><small>Ear</small><b>{earLabel ?? "Not answered"}</b></span><em>Change</em>
                  </button></li>
                </ul>
                <section className="rq-handoff" aria-label="What happens after you send">
                  <div><HeartHandshake size={18} aria-hidden /><b>What happens next</b></div>
                  <ol>
                    <li><i>01</i><span>Your report waits for a quick review before it is public.</span></li>
                    <li><i>02</i><span>Once accepted, it becomes a shared animal record on the map.</span></li>
                    <li><i>03</i><span>Care teams working nearby can take it into their field work.</span></li>
                  </ol>
                </section>
                {condition === "injured" && <p className="rq-urgent">Marked for urgent review. StrayPaw is not an emergency service and cannot promise a response time. If the dog is in immediate danger, call a local animal ambulance or emergency vet.</p>}

                <label className="rq-update">
                  <span><b>Get the link when this report is live</b><small>Optional. We only email you about this report.</small></span>
                  <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                </label>

                <div className="rq-more">
                  <button type="button" className="rq-more-btn" aria-expanded={more} onClick={() => setMore((m) => !m)}>Add a name or useful detail <span>optional</span> <ChevronDown size={16} aria-hidden /></button>
                  {more && (
                    <div className="rq-more-body">
                      {coords && <AnimalMatch lat={coords.lat} lng={coords.lng} value={claimedDogId} onChange={(id) => { setClaimedDogId(id); if (id) track("existing_animal_selected"); }} />}
                      <label className="rq-field"><span>A name people call it</span><input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Bruno, Laali, Brownie" /></label>
                      <label className="rq-field"><span>Anything else</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Limps on the back left leg, very friendly" /></label>
                      <ReportingFor volunteer={volunteer} onChange={setVolunteer} />
                      {hydrated && ready && !isAuthed && <p className="rq-signin">No account needed. <button type="button" className="rq-link" onClick={openSignIn}>Sign in</button> to edit this report later.</p>}
                    </div>
                  )}
                </div>

                {hasPhoto && <label className="rq-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>My photo shows no faces, homes or number plates, and I may share it.</span>
                </label>}
                {HAS_TURNSTILE && <div className="rq-human-check"><b>One last step</b><span>Before sending, complete the short human check below. It protects the shared record from spam.</span></div>}
                {HAS_TURNSTILE && <Turnstile onVerify={handleVerify} />}
                {error && <p className="rq-error">{error}</p>}
                <button type="button" className="rq-go" onClick={submit} disabled={!canSubmit}>
                  {status === "submitting" ? <><Loader2 size={18} className="rq-spin" /> Sending</> : <><PawPrint size={18} /> Send report</>}
                </button>
                {!ready4 && <p className="rq-left">Answer the questions above to send.</p>}
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {status === "done" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rq-done-wrap">
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} className="rq-done" role="dialog" aria-labelledby="rq-done-t">
              <span className="rq-done-ic"><Clock size={30} /></span>
              <h2 id="rq-done-t">Your report is in the care trail.</h2>
              <p>{condition === "injured" ? "It is marked for urgent review. " : ""}This device keeps your link while it is reviewed, then you can see it on the shared map.</p>
              <p className="rq-done-steps">Sent <span>→</span> Reviewed <span>→</span> Shared record</p>
              <Link href="/following" className="rq-go">Follow this report <ArrowRight size={16} /></Link>
              <button type="button" className="rq-link" onClick={reset}>Report another</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
