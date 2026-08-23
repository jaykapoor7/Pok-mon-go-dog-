"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Camera, Check, Crosshair, MapPin, Users } from "lucide-react";
import { getMyOrgFeedingZones, createOrgFeedingZone, type OrgFeedingZone } from "@/lib/feeding-zones";
import { uploadPhoto } from "@/lib/actions";
import { timeAgo } from "@/lib/utils";

const INPUT = "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function FeedingClient() {
  const [zones, setZones] = useState<OrgFeedingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => getMyOrgFeedingZones().then(setZones).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Feeding zones</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Spots your organisation feeds. They appear on the public map for volunteers to sign up.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
          <Plus className="h-4 w-4" /> Add feeding zone
        </button>
      </header>

      {creating && <CreateZone onDone={() => { setCreating(false); load(); }} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : zones.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-12 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No feeding zones yet. Add the spots your team covers.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <div key={z.id} className="overflow-hidden rounded-xl border border-black/[0.08] bg-white dark:border-white/[0.1] dark:bg-bark-900">
              {z.photo_url && <img src={z.photo_url} alt="" className="h-28 w-full object-cover" />}
              <div className="p-4">
                <p className="font-semibold text-bark-900 dark:text-bark-50">{z.name}</p>
                {z.zone && <p className="mt-0.5 flex items-center gap-1 text-xs text-bark-500"><MapPin className="h-3.5 w-3.5" /> {z.zone}</p>}
                {z.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-bark-600 dark:text-bark-300">{z.description}</p>}
                <div className="mt-3 flex items-center justify-between text-xs text-bark-400">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {z.volunteer_count} volunteer{z.volunteer_count === 1 ? "" : "s"}</span>
                  <span>{z.last_fed_at ? `Fed ${timeAgo(z.last_fed_at)}` : "Not fed yet"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateZone({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(f)); } catch { setError("Could not upload photo."); } finally { setUploading(false); }
  }
  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setError("Could not get your location."), { enableHighAccuracy: true, timeout: 8000 });
  }
  async function submit() {
    if (!name.trim()) { setError("Give the zone a name."); return; }
    if (!coords) { setError("Capture the location."); return; }
    setBusy(true); setError(null);
    try {
      await createOrgFeedingZone({ name: name.trim(), zone: zone.trim() || undefined, description: description.trim() || undefined, lat: coords.lat, lng: coords.lng, photoUrl: photo });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create."); } finally { setBusy(false); }
  }

  return (
    <div className="mb-5 space-y-3 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name, e.g. HKV market corner" className={INPUT} />
        <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Locality / area" className={INPUT} />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How many animals, feeding times, notes" className={`${INPUT} min-h-[60px] resize-y`} />
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={locate} className="flex items-center gap-2 rounded-md border border-black/[0.1] px-3 py-2.5 text-sm dark:border-white/[0.12]">
          <Crosshair className="h-4 w-4 text-paw-500" /> <span className={coords ? "text-bark-900 dark:text-bark-50" : "text-bark-400"}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Capture GPS *"}</span>
        </button>
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-medium text-bark-600 dark:border-white/[0.12] dark:text-bark-200">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : photo ? <Check className="h-4 w-4 text-status-vaccinated" /> : <Camera className="h-4 w-4" />} Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button onClick={submit} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create zone
        </button>
      </div>
      {error && <p className="text-sm font-medium text-status-injured">{error}</p>}
    </div>
  );
}
