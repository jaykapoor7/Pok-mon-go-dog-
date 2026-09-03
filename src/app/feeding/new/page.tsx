"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, Check, ArrowLeft, LogIn, Utensils } from "lucide-react";
import { nearestCity } from "@/lib/delhi";
import { uploadPhoto } from "@/lib/actions";
import { createFeedingZone } from "@/lib/feeding-actions";
import { LocationPicker } from "@/components/report/LocationPicker";
import { useAuth } from "@/components/auth/AuthProvider";

export default function NewFeedingZonePage() {
  const { user, isAuthed, ready, openSignIn } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setPhoto(URL.createObjectURL(picked));
    }
  }

  const canSubmit = name.trim().length > 0 && !!coords && !busy;

  async function submit() {
    if (!canSubmit || !coords) return;
    setBusy(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (file) photoUrl = await uploadPhoto(file);
      const actor = user ? { id: user.id, name: user.name } : null;
      const id = await createFeedingZone(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          zone: zone ?? nearestCity(coords.lat, coords.lng),
          lat: coords.lat,
          lng: coords.lng,
          photoUrl,
        },
        actor
      );
      router.push(id ? `/feeding/${id}` : "/feeding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this feeding zone.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6">
      <Link
        href="/feeding"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Feeding zones
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Add a feeding zone 🥣</h1>
        <p className="text-sm text-bark-500">
          Mark an existing spot the community feeds, so others can find it and cover it.
        </p>
      </header>

      {ready && !isAuthed && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded border border-status-hungry/30 bg-status-hungry/10 px-4 py-3">
          <p className="flex-1 text-sm text-bark-700 dark:text-bark-200">
            <span className="font-semibold">Heads up:</span> you can add a zone without
            signing in, but you won&apos;t be able to edit it later from another device.
          </p>
          <button
            onClick={openSignIn}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paw-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">Photo (optional)</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
          {photo ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="relative block aspect-video w-full overflow-hidden rounded"
            >
              <img src={photo} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-3 right-3 chip bg-black/60 text-white">
                <Camera className="h-3.5 w-3.5" /> Change
              </span>
            </button>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded border-2 border-dashed border-paw-300 bg-paw-50 text-paw-500 transition-colors hover:bg-paw-100 dark:bg-bark-800"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-semibold">Add a photo of the spot</span>
            </button>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Behind Lajpat Nagar market"
            className="w-full rounded border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Notes (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="How many dogs, best time to feed, access notes…"
            className="w-full resize-none rounded border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Location</label>
          <LocationPicker
            value={coords}
            onChange={(loc) => {
              setCoords({ lat: loc.lat, lng: loc.lng });
              setZone(loc.zone);
            }}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-status-injured/10 px-3 py-2 text-center text-sm font-medium text-status-injured">
            {error}
          </p>
        )}

        <button onClick={submit} disabled={!canSubmit} className="btn-primary w-full py-3.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
          {busy ? "Adding…" : "Add feeding zone"}
        </button>
        {name.trim() && !coords && (
          <p className="text-center text-xs text-bark-400">Pick a location to continue.</p>
        )}
      </div>
    </div>
  );
}
