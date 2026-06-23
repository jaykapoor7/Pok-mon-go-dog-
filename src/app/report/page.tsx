"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  MapPin,
  Loader2,
  Check,
  PawPrint,
  ArrowRight,
  Crosshair,
} from "lucide-react";
import { celebrate, pawBurst } from "@/lib/celebrate";
import { MOOD_META, type MoodTag } from "@/lib/types";
import { nearestZone, DELHI_CENTER, DELHI_ZONES } from "@/lib/delhi";
import { reportSighting } from "@/lib/actions";
import { Turnstile, HAS_TURNSTILE } from "@/components/ui/Turnstile";
import { cn } from "@/lib/utils";

const MOODS = Object.keys(MOOD_META) as MoodTag[];
const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80&auto=format&fit=crop";

type Status = "idle" | "locating" | "submitting" | "done";

export default function ReportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [moods, setMoods] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [trust, setTrust] = useState(0);
  const [dogId, setDogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleVerify = useCallback((t: string | null) => setToken(t), []);

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

  function detectLocation() {
    setStatus("locating");
    const finish = (lat: number, lng: number) => {
      setCoords({ lat, lng });
      setZone(nearestZone(lat, lng));
      setStatus("idle");
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Permission denied / unavailable → drop a believable Delhi pin.
          const z = DELHI_ZONES[Math.floor(Math.random() * DELHI_ZONES.length)];
          finish(z.lat, z.lng);
        },
        { timeout: 6000 }
      );
    } else {
      finish(DELHI_CENTER.lat, DELHI_CENTER.lng);
    }
  }

  function toggleMood(m: MoodTag) {
    setMoods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  const canSubmit =
    !!photo && !!coords && status === "idle" && (!HAS_TURNSTILE || !!token);

  async function submit() {
    if (!canSubmit || !coords) return;
    setStatus("submitting");
    setError(null);

    try {
      const result = await reportSighting({
        file,
        fallbackPhotoUrl: photo ?? undefined,
        lat: coords.lat,
        lng: coords.lng,
        zone: zone ?? nearestZone(coords.lat, coords.lng),
        nickname: nickname.trim(),
        moods,
        notes: notes.trim(),
        reporterName: reporterName.trim(),
        token,
      });
      setTrust(result.trust);
      setDogId(result.dogId);
      setStatus("done");
      celebrate();
      setTimeout(pawBurst, 250);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
      setStatus("idle");
    }
  }

  function resetForm() {
    setStatus("idle");
    setPhoto(null);
    setFile(null);
    setCoords(null);
    setZone(null);
    setNickname("");
    setReporterName("");
    setMoods([]);
    setNotes("");
    setDogId(null);
    setError(null);
    setToken(null);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Report a Dog 🐾
        </h1>
        <p className="text-sm text-bark-500">
          Ten seconds to help track a street dog. Every detail builds the map.
        </p>
      </header>

      <div className="space-y-5">
        {/* photo */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-bark-700">
            Photo
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickPhoto}
          />
          <div className="relative">
            {photo ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="relative block aspect-square w-full overflow-hidden rounded-3xl"
              >
                <img
                  src={photo}
                  alt="Selected dog"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-3 right-3 chip bg-black/60 text-white">
                  <Camera className="h-3.5 w-3.5" /> Change
                </span>
              </button>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-paw-300 bg-paw-50 text-paw-500 transition-colors hover:bg-paw-100"
              >
                <Camera className="h-10 w-10" />
                <span className="font-semibold">Take or upload a photo</span>
                <span className="text-xs text-paw-400">
                  Tap to open camera / gallery
                </span>
              </button>
            )}
          </div>
          {!photo && (
            <button
              onClick={useDemoPhoto}
              className="mt-2 text-xs font-medium text-paw-600 underline"
            >
              No photo handy? Use a sample
            </button>
          )}
        </div>

        {/* location */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-bark-700">
            Location
          </label>
          {coords ? (
            <div className="flex items-center justify-between rounded-2xl bg-status-vaccinated/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-bark-700">
                <MapPin className="h-4 w-4 text-status-vaccinated" />
                {zone} · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
              <Check className="h-4 w-4 text-status-vaccinated" />
            </div>
          ) : (
            <button
              onClick={detectLocation}
              disabled={status === "locating"}
              className="btn-ghost w-full py-3"
            >
              {status === "locating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Locating…
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" /> Use my current location
                </>
              )}
            </button>
          )}
        </div>

        {/* nickname */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-bark-700">
            Nickname <span className="font-normal text-bark-400">(optional)</span>
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Bruno, Laali, Brownie…"
            className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
          />
        </div>

        {/* moods */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-bark-700">
            Mood &amp; tags
          </label>
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
          <label className="mb-2 block text-sm font-semibold text-bark-700">
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

        {/* your name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-bark-700">
            Your name{" "}
            <span className="font-normal text-bark-400">
              (optional — no login needed)
            </span>
          </label>
          <input
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="So we can credit your help"
            className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
          />
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

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn-primary w-full py-4 text-base"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Tracking dog…
            </>
          ) : (
            <>
              <PawPrint className="h-5 w-5" /> Submit sighting
            </>
          )}
        </button>
        {!canSubmit && status !== "submitting" && (
          <p className="text-center text-xs text-bark-400">
            Add a photo and location to submit.
          </p>
        )}
      </div>

      {/* success overlay */}
      <AnimatePresence>
        {status === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bark-950/60 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-warm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-paw-100 text-4xl"
              >
                🐾
              </motion.div>
              <h2 className="font-display text-2xl font-extrabold">
                You helped track a dog!
              </h2>
              <p className="mt-2 text-sm text-bark-600">
                {nickname ? `${nickname} is` : "This dog is"} now on the map. We
                matched your sighting and gave it a trust score of{" "}
                <span className="font-bold text-paw-600">{trust}/100</span>.
              </p>

              <div className="mt-6 space-y-2">
                {dogId ? (
                  <Link href={`/dog/${dogId}`} className="btn-primary w-full py-3">
                    View {nickname || "this dog"}&apos;s profile{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link href="/map" className="btn-primary w-full py-3">
                    See it on the map <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link href="/map" className="btn-ghost w-full py-3">
                  Explore the map
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
