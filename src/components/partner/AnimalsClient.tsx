"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Camera, Crosshair, Check } from "lucide-react";
import { getMyAnimals, createAnimal, type AnimalRow } from "@/lib/animal-actions";
import { uploadPhoto } from "@/lib/actions";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { SPECIES, speciesLabel, STATUS_META } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AnimalsClient() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => getMyAnimals().then(setAnimals).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const rows = animals.filter((a) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (a.name ?? "").toLowerCase().includes(t) || (a.code ?? "").toLowerCase().includes(t) || a.zone.toLowerCase().includes(t);
  });

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Animals</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Your organization&apos;s animal records — the longitudinal registry.</p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
          <Plus className="h-4 w-4" /> New animal
        </button>
      </header>

      {creating && <CreateAnimal onDone={() => { setCreating(false); load(); }} />}

      <div className="relative mb-3 sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search animals…" className="w-full rounded-md border border-black/[0.09] bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-16 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          No animals yet. Add your first record.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          <div className="hidden grid-cols-[40px_100px_1fr_120px_100px] items-center gap-3 border-b border-black/[0.08] bg-bark-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400 dark:border-white/[0.1] dark:bg-white/[0.02] sm:grid">
            <span></span><span>Code</span><span>Animal</span><span>Location</span><span className="text-right">Updated</span>
          </div>
          <ul>
            {rows.map((a) => {
              const st = STATUS_META[a.status as keyof typeof STATUS_META];
              return (
                <li key={a.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`/partner/animals/${a.id}`} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[40px_100px_1fr_120px_100px]">
                    <div className="h-8 w-8 overflow-hidden rounded-md bg-bark-100 dark:bg-bark-800">
                      <DogPhoto src={a.cover_photo} alt={a.name ?? "Animal"} seed={a.id} className="h-full w-full" />
                    </div>
                    <span className="hidden truncate text-[13px] font-medium tabular-nums text-bark-500 sm:block">{a.code ?? "—"}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{a.name || speciesLabel(a.species)}</p>
                      <p className="truncate text-[12px] text-bark-400 sm:hidden">{a.code ? `${a.code} · ` : ""}{a.zone}</p>
                    </div>
                    <span className="hidden truncate text-[13px] text-bark-500 sm:block">{a.zone || "—"}</span>
                    <span className="shrink-0 text-right text-[12px] tabular-nums text-bark-400">{timeAgo(a.last_seen)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function CreateAnimal({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [code, setCode] = useState("");
  const [zone, setZone] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const INPUT = "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try { setPhoto(await uploadPhoto(f)); } finally { setUploading(false); }
  }
  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }

  async function submit() {
    setBusy(true);
    try {
      const id = await createAnimal({ name: name.trim() || undefined, species, code: code.trim() || undefined, zone: zone.trim() || undefined, lat: coords?.lat ?? null, lng: coords?.lng ?? null, coverPhoto: photo, intakeNotes: notes.trim() || undefined });
      if (id && id !== "demo-animal") router.push(`/partner/animals/${id}`);
      else onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-5 space-y-3 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={INPUT} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Animal ID — e.g. DDS-00421" className={INPUT} />
      </div>
      <div className="flex flex-wrap gap-2">
        {SPECIES.filter((s) => s.id !== "other").map((s) => (
          <button key={s.id} onClick={() => setSpecies(s.id)} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium", species === s.id ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>{s.label}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Village / area" className={INPUT} />
        <button onClick={locate} className="flex items-center justify-between rounded-md border border-black/[0.1] px-3 py-2.5 text-sm dark:border-white/[0.12]">
          <span className={coords ? "text-bark-900 dark:text-bark-50" : "text-bark-400"}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Capture GPS"}</span>
          <Crosshair className="h-4 w-4 text-paw-500" />
        </button>
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Intake notes (optional)" className={cn(INPUT, "min-h-[60px] resize-y")} />
      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-medium text-bark-600 dark:border-white/[0.12] dark:text-bark-200">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : photo ? <Check className="h-4 w-4 text-status-vaccinated" /> : <Camera className="h-4 w-4" />} Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button onClick={submit} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create record
        </button>
      </div>
    </div>
  );
}
