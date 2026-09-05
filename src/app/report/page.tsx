"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, Loader2, Check, PawPrint, ArrowRight, ArrowLeft, Clock, LogIn, MapPin, Tag,
} from "lucide-react";
import { pawBurst } from "@/lib/celebrate";
import { MOOD_META, type MoodTag } from "@/lib/types";
import { nearestCity } from "@/lib/delhi";
import { readPhotoMeta, looksIndian, type PhotoMeta } from "@/lib/exif";
import { reverseGeocode } from "@/lib/delhi";
import { reportSighting } from "@/lib/actions";
import { LocationPicker } from "@/components/report/LocationPicker";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { AnimalMatch } from "@/components/report/AnimalMatch";

const MOODS = Object.keys(MOOD_META) as MoodTag[];
const STEPS = ["Photo", "Location", "Details", "Confirm"] as const;

type Status = "idle" | "submitting" | "done";

export default function ReportPage() {
  const { user, isAuthed, ready, openSignIn } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0); // 0..3
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [moods, setMoods] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  /* An animal the reporter recognises. Sent as a claim; review decides. */
  const [claimedDogId, setClaimedDogId] = useState<string | null>(null);

  const handleVerify = useCallback((t: string | null) => setToken(t), []);
  useEffect(() => { if (user?.email) setEmail((cur) => cur || user.email!); }, [user?.email]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPhoto(URL.createObjectURL(picked));
    pawBurst();

    /* The camera usually recorded where and when already. Reading it saves
       dragging a pin to a place the phone knew, and the result is shown so
       it can be corrected rather than silently trusted. */
    setReadingMeta(true);
    setMeta(null);
    try {
      const m = await readPhotoMeta(picked);
      setMeta(m);
      if (m.lat != null && m.lng != null && looksIndian(m.lat, m.lng)) {
        setCoords({ lat: m.lat, lng: m.lng });
        setZone(await reverseGeocode(m.lat, m.lng));
      }
    } finally {
      setReadingMeta(false);
    }
  }
  const [meta, setMeta] = useState<PhotoMeta | null>(null);
  const [readingMeta, setReadingMeta] = useState(false);

  function toggleMood(m: MoodTag) {
    setMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  const consentDone = c1 && c2 && c3;
  const canAdvance = step === 0 ? !!photo : step === 1 ? !!coords : true;
  const canSubmit = !!photo && !!coords && consentDone && status === "idle" && (!HAS_TURNSTILE || !!token);

  function next() { if (canAdvance) setStep((s) => Math.min(STEPS.length - 1, s + 1)); }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  async function submit() {
    if (!canSubmit || !coords) return;
    setStatus("submitting"); setError(null);
    try {
      await reportSighting({
        file, fallbackPhotoUrl: photo ?? undefined,
        lat: coords.lat, lng: coords.lng, zone: zone ?? nearestCity(coords.lat, coords.lng),
        nickname: nickname.trim(), moods, notes: notes.trim(),
        reporterName: user?.name ?? "", reporterEmail: email.trim() || undefined, token,
        claimedDogId,
      });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function resetForm() {
    setStep(0); setStatus("idle"); setPhoto(null); setFile(null); setCoords(null); setZone(null);
    setNickname(""); setMoods([]); setNotes(""); setEmail(user?.email ?? ""); setToken(null);
    setC1(false); setC2(false); setC3(false); setError(null); setClaimedDogId(null);
  }

  const field = "w-full rounded border border-bark-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Report a sighting</h1>
        <p className="mt-1 text-sm text-bark-500">
          {isAuthed ? <>Signed in as <span className="font-semibold text-bark-700 dark:text-bark-200">{user?.name}</span></> : "Reporting as a guest"}
        </p>
      </header>

      {/* progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-[12px] font-medium">
          <span className="text-paw-600 dark:text-paw-300">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <span className="text-bark-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
          <div className="h-full rounded-full bg-paw-500 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {ready && !isAuthed && step === 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded border border-status-hungry/30 bg-status-hungry/10 px-4 py-3">
          <p className="flex-1 text-sm text-bark-700 dark:text-bark-200">
            <span className="font-semibold">Heads up:</span> you can report without signing in, but you won&apos;t be able to edit it later from another device.
          </p>
          <button onClick={openSignIn} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paw-500 px-4 py-2 text-sm font-semibold text-white">
            <LogIn className="h-4 w-4" /> Sign in
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Step 0: photo ── */}
          {step === 0 && (
            <div>
              <StepTitle icon={<Camera className="h-4 w-4" />} title="Add a photo" hint="A clear photo helps NGOs identify and find the animal." />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Choose a photo of the animal" onChange={onPickPhoto} />
              {photo ? (
                <button onClick={() => fileRef.current?.click()} className="relative block aspect-square w-full overflow-hidden rounded bg-bark-100 dark:bg-bark-800">
                  <img src={photo} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
                  <img src={photo} alt="Selected animal" className="relative h-full w-full object-contain" />
                  <span className="absolute bottom-3 right-3 chip bg-black/60 text-white"><Camera className="h-3.5 w-3.5" /> Change</span>
                </button>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded border-2 border-dashed border-paw-300 bg-paw-50 text-paw-600 transition-colors hover:bg-paw-100 dark:border-paw-500/40 dark:bg-bark-800">
                  <Camera className="h-10 w-10" />
                  <span className="font-semibold">Take or upload a photo</span>
                  <span className="text-xs text-bark-400">Opens your camera or gallery</span>
                </button>
              )}

              {(readingMeta || meta) && (
                <div className="mt-3 rounded border border-black/[0.08] bg-bark-50 px-3.5 py-3 dark:border-white/10 dark:bg-bark-800">
                  {readingMeta ? (
                    <p className="flex items-center gap-2 text-[13px] font-medium text-bark-600 dark:text-bark-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Reading what the camera recorded…
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-bark-400">
                        From the photo
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[13px] text-bark-600 dark:text-bark-300">
                        <li className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-paw-500" />
                          {meta?.lat != null && meta?.lng != null
                            ? looksIndian(meta.lat, meta.lng)
                              ? "Location found — the map is set to it. Check it on the next step."
                              : "Location found, but it is outside India. Set it manually."
                            : "No location in this photo — you will set it on the next step."}
                        </li>
                        {meta?.takenAt && (
                          <li className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-paw-500" />
                            Taken {meta.takenAt.toLocaleString("en-IN", {
                              day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                            })}
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: location ── */}
          {step === 1 && (
            <div>
              <StepTitle icon={<MapPin className="h-4 w-4" />} title="Where is it?" hint="Search, use your current location, or drag the pin to be precise." />
              <LocationPicker value={coords} zone={zone} onChange={({ lat, lng, zone: z }) => { setCoords({ lat, lng }); setZone(z); }} />
            </div>
          )}

          {/* ── Step 2: details ── */}
          {step === 2 && (
            <div className="space-y-5">
              <StepTitle icon={<Tag className="h-4 w-4" />} title="A few details" hint="All optional, but they help. Skip anything you're unsure of." />
              <div>
                <label className="mb-2 block text-sm font-semibold">Nickname</label>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Bruno, Laali, Brownie" className={field} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => {
                    const active = moods.includes(m);
                    return (
                      <button key={m} onClick={() => toggleMood(m)} className={cn("chip border transition-all", active ? "border-paw-300 bg-paw-500 text-white" : "border-bark-200 bg-white text-bark-600 hover:border-paw-300 dark:bg-bark-900")}>
                        <span aria-hidden>{MOOD_META[m].emoji}</span> {MOOD_META[m].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {coords && (
                <AnimalMatch
                  lat={coords.lat}
                  lng={coords.lng}
                  value={claimedDogId}
                  onChange={setClaimedDogId}
                />
              )}
              <div>
                <label className="mb-2 block text-sm font-semibold">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Seen near the chai stall, limps slightly, very friendly." className={`${field} resize-none`} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Email me when it&apos;s live</label>
                <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} />
                <p className="mt-1.5 text-xs text-bark-400">We&apos;ll email you once it&apos;s approved and on the map. Only about your reports, no spam.</p>
              </div>
            </div>
          )}

          {/* ── Step 3: confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <StepTitle icon={<Check className="h-4 w-4" />} title="Confirm and submit" hint="A quick check before it goes to review." />
              <Consent checked={c1} onChange={setC1}>I have permission to upload this image.</Consent>
              <Consent checked={c2} onChange={setC2}>No private or sensitive information is visible in the photo.</Consent>
              <Consent checked={c3} onChange={setC3}>I understand content may be reviewed before publishing.</Consent>
              {HAS_TURNSTILE && (
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Turnstile onVerify={handleVerify} />
                  <p className="text-[10px] text-bark-400">A quick check to keep out spam, by Cloudflare Turnstile.</p>
                </div>
              )}
              {error && <p className="rounded bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">{error}</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* footer nav */}
      <div className="mt-7 flex gap-3">
        {step > 0 && (
          <button onClick={back} className="btn-ghost px-5 py-3.5"><ArrowLeft className="h-5 w-5" /> Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={!canAdvance} className="btn-primary flex-1 py-3.5 text-base">
            Next <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button onClick={submit} disabled={!canSubmit} className="btn-primary flex-1 py-3.5 text-base">
            {status === "submitting" ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting</> : <><PawPrint className="h-5 w-5" /> Submit sighting</>}
          </button>
        )}
      </div>
      {step === 0 && !photo && <p className="mt-2 text-center text-xs text-bark-400">Add a photo to continue.</p>}
      {step === 1 && !coords && <p className="mt-2 text-center text-xs text-bark-400">Set a location to continue.</p>}
      {step === 3 && !consentDone && <p className="mt-2 text-center text-xs text-bark-400">Please confirm all three to submit.</p>}

      {/* ── Success overlay ── */}
      <AnimatePresence>
        {status === "done" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-bark-950/60 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-warm dark:bg-bark-900">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
                <Clock className="h-9 w-9" />
              </motion.div>
              <h2 className="font-display text-2xl">Your sighting is pending review</h2>
              <p className="mt-2 text-sm text-bark-500">Thank you for helping track India&apos;s street animals. We&apos;ll publish it to the map once it clears a quick review.</p>
              <div className="mt-6 space-y-2">
                <Link href="/map" className="btn-primary w-full py-3">Back to the map <ArrowRight className="h-4 w-4" /></Link>
                <button onClick={resetForm} className="btn-ghost w-full py-3">Report another animal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">{icon}</span>
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-bark-500">{hint}</p>
    </div>
  );
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button onClick={() => onChange(!checked)} className={cn("flex w-full items-start gap-3 rounded border p-4 text-left text-sm transition-colors", checked ? "border-paw-300 bg-paw-50 dark:border-paw-500/40 dark:bg-bark-800" : "border-bark-200 bg-white dark:bg-bark-900")}>
      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors", checked ? "border-paw-500 bg-paw-500 text-white" : "border-bark-300")}>
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="text-bark-700 dark:text-bark-200">{children}</span>
    </button>
  );
}
