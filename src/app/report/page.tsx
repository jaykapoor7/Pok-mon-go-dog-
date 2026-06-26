"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Loader2,
  Check,
  PawPrint,
  ArrowRight,
  ArrowLeft,
  Clock,
  LogIn,
} from "lucide-react";
import { pawBurst } from "@/lib/celebrate";
import { MOOD_META, type MoodTag } from "@/lib/types";
import { nearestCity } from "@/lib/delhi";
import { reportSighting } from "@/lib/actions";
import { LocationPicker } from "@/components/report/LocationPicker";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const MOODS = Object.keys(MOOD_META) as MoodTag[];
const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80&auto=format&fit=crop";

type Status = "idle" | "locating" | "submitting" | "done";

export default function ReportPage() {
  const { user, isAuthed, ready, openSignIn } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [moods, setMoods] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // consent (step 2)
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);

  const handleVerify = useCallback((t: string | null) => setToken(t), []);

  // Auth gate — viewing the map is open, but reporting needs a name.
  useEffect(() => {
    if (ready && !isAuthed) openSignIn();
  }, [ready, isAuthed, openSignIn]);

  if (ready && !isAuthed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-24 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-paw-100 text-paw-600">
          <LogIn className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">
          Sign in to report a dog
        </h1>
        <p className="mt-2 text-sm text-bark-500">
          Anyone can browse the map. To add and manage sightings, add a name
          first — no password needed.
        </p>
        <button onClick={openSignIn} className="btn-primary mt-5 px-6 py-3">
          <LogIn className="h-4 w-4" /> Sign in
        </button>
        <div className="mt-3">
          <Link href="/" className="text-sm font-medium text-bark-500 underline">
            Back to the map
          </Link>
        </div>
      </div>
    );
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setPhoto(URL.createObjectURL(picked));
      pawBurst();
    }
  }

  function useDemoPhoto() {
    setFile(null);
    setPhoto(SAMPLE_PHOTO);
    pawBurst();
  }


  function toggleMood(m: MoodTag) {
    setMoods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  const step1Done = !!photo && !!coords;
  const consentDone = c1 && c2 && c3;
  const canSubmit =
    step1Done && consentDone && status === "idle" && (!HAS_TURNSTILE || !!token);

  async function submit() {
    if (!canSubmit || !coords) return;
    setStatus("submitting");
    setError(null);
    try {
      await reportSighting({
        file,
        fallbackPhotoUrl: photo ?? undefined,
        lat: coords.lat,
        lng: coords.lng,
        zone: zone ?? nearestCity(coords.lat, coords.lng),
        nickname: nickname.trim(),
        moods,
        notes: notes.trim(),
        reporterName: user?.name ?? "",
        token,
      });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function resetForm() {
    setStep(1);
    setStatus("idle");
    setPhoto(null);
    setFile(null);
    setCoords(null);
    setZone(null);
    setNickname("");
    setMoods([]);
    setNotes("");
    setToken(null);
    setC1(false);
    setC2(false);
    setC3(false);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Report a sighting 🐾
        </h1>
        <p className="text-sm text-bark-500">
          Signed in as{" "}
          <span className="font-semibold text-bark-700 dark:text-bark-200">
            {user?.name}
          </span>
        </p>
      </header>

      {/* stepper */}
      <div className="mb-6 flex items-center gap-2">
        <StepDot n={1} label="Details" active={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-bark-200" />
        <StepDot n={2} label="Consent" active={step === 2} done={false} />
        <span className="h-px flex-1 bg-bark-200" />
        <StepDot n={3} label="Done" active={false} done={status === "done"} />
      </div>

      {/* ── Step 1: details ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* photo */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Photo</label>
            {/* No `capture` attribute → the picker offers camera OR gallery/files. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
            {photo ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="relative block aspect-square w-full overflow-hidden rounded-3xl"
              >
                <img src={photo} alt="Selected dog" className="h-full w-full object-cover" />
                <span className="absolute bottom-3 right-3 chip bg-black/60 text-white">
                  <Camera className="h-3.5 w-3.5" /> Change
                </span>
              </button>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-paw-300 bg-paw-50 text-paw-500 transition-colors hover:bg-paw-100 dark:bg-bark-800"
              >
                <Camera className="h-10 w-10" />
                <span className="font-semibold">Take or upload a photo</span>
                <span className="text-xs text-paw-400">Tap to open camera / gallery</span>
              </button>
            )}
            {!photo && (
              <button
                onClick={useDemoPhoto}
                className="mt-2 text-xs font-medium text-paw-600 underline"
              >
                No photo handy? Use a sample
              </button>
            )}
          </div>

          {/* location — search, current GPS, or drag the pin */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Location</label>
            <LocationPicker
              value={coords}
              zone={zone}
              onChange={({ lat, lng, zone: z }) => {
                setCoords({ lat, lng });
                setZone(z);
              }}
            />
          </div>

          {/* nickname */}
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Nickname <span className="font-normal text-bark-400">(optional)</span>
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Bruno, Laali, Brownie…"
              className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
            />
          </div>

          {/* tags */}
          <div>
            <label className="mb-2 block text-sm font-semibold">Tags</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const active = moods.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMood(m)}
                    className={cn(
                      "chip border transition-all",
                      active
                        ? "border-paw-300 bg-paw-500 text-white"
                        : "border-bark-200 bg-white text-bark-600 hover:border-paw-300"
                    )}
                  >
                    <span aria-hidden>{MOOD_META[m].emoji}</span>
                    {MOOD_META[m].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* notes */}
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Notes <span className="font-normal text-bark-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Seen near the chai stall, limps slightly, very friendly…"
              className="w-full resize-none rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!step1Done}
            className="btn-primary w-full py-4 text-base"
          >
            Continue <ArrowRight className="h-5 w-5" />
          </button>
          {!step1Done && (
            <p className="text-center text-xs text-bark-400">
              Add a photo and location to continue.
            </p>
          )}
        </div>
      )}

      {/* ── Step 2: consent ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-3">
            <Consent checked={c1} onChange={setC1}>
              I confirm I have permission to upload this image.
            </Consent>
            <Consent checked={c2} onChange={setC2}>
              No private or sensitive information is visible in the photo.
            </Consent>
            <Consent checked={c3} onChange={setC3}>
              I understand content may be reviewed before publishing.
            </Consent>
          </div>

          {HAS_TURNSTILE && (
            <div className="flex flex-col items-center gap-1">
              <Turnstile onVerify={handleVerify} />
              <p className="text-[10px] text-bark-400">
                A quick check to keep out spam — protected by Cloudflare Turnstile.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-2xl bg-status-injured/10 px-4 py-3 text-center text-sm font-medium text-status-injured">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost px-5 py-4">
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="btn-primary flex-1 py-4 text-base"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <PawPrint className="h-5 w-5" /> Submit sighting
                </>
              )}
            </button>
          </div>
          {!consentDone && (
            <p className="text-center text-xs text-bark-400">
              Please confirm all three to submit.
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: pending review ── */}
      <AnimatePresence>
        {status === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-bark-950/60 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-warm dark:bg-bark-900"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-paw-100 text-paw-600"
              >
                <Clock className="h-9 w-9" />
              </motion.div>
              <h2 className="font-display text-2xl font-extrabold">
                Your sighting is pending review
              </h2>
              <p className="mt-2 text-sm text-bark-500">
                Thank you for helping track India&apos;s street dogs. We&apos;ll
                publish it to the map once it clears a quick review.
              </p>
              <div className="mt-6 space-y-2">
                <Link href="/" className="btn-primary w-full py-3">
                  Back to the map <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={resetForm} className="btn-ghost w-full py-3">
                  Report another dog
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
          done
            ? "bg-status-vaccinated text-white"
            : active
              ? "bg-paw-500 text-white"
              : "bg-bark-200 text-bark-500"
        )}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <span
        className={cn(
          "text-xs font-medium",
          active ? "text-bark-800 dark:text-bark-100" : "text-bark-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Consent({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-colors",
        checked
          ? "border-paw-300 bg-paw-50 dark:bg-bark-800"
          : "border-bark-200 bg-white"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          checked ? "border-paw-500 bg-paw-500 text-white" : "border-bark-300"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="text-bark-700 dark:text-bark-200">{children}</span>
    </button>
  );
}
