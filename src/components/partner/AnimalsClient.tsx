Warning: truncated output (original token count: 4294)
Total output lines: 296

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Camera, Crosshair, Check, Download } from "lucide-react";
import { createAnimal } from "@/lib/animal-actions";
import { orgAnimals, orgZones, type OrgAnimal } from "@/lib/programme";
import { useSearchParams } from "next/navigation";
import { uploadPhoto } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { speciesLabel, STATUS_META } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FILTER =
  "min-h-[40px] rounded-md border border-black/[0.09] bg-transparent px-2 text-[13px] outline-none focus:border-paw-400 dark:border-white/[0.12]";

/* Programme status, small enough to sit in a row and unambiguous at a
   glance. Unknown reads as neutral rather than negative: it is the absence
   of a check, not a failed one. */
function StatusPill({ kind, value }: { kind: "ster" | "vacc"; value: string }) {
  const positive = value === "sterilised" || value === "vaccinated";
  const negative = value === "not_sterilised" || value === "not_vaccinated";
  const letter = kind === "ster" ? "S" : "R";
  const label =
    kind === "ster"
      ? { sterilised: "Sterilised", not_sterilised: "Not sterilised", unknown: "Sterilisation unknown" }[value]
      : { vaccinated: "Vaccinated", not_vaccinated: "Not vaccinated", unknown: "Rabies status unknown" }[value];
  return (
    <span
      title={label}
      className={
        "inline-flex h-[19px] min-w-[19px] items-center justify-center rounded px-1 text-[11.5px] font-bold " +
        (positive
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          : negative
            ? "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
            : "bg-bark-100 text-bark-500 dark:bg-white/10 dark:text-bark-300")
      }
    >
      {letter}
      {positive ? "\u2713" : negative ? "\u2717" : "?"}
    </span>
  );
}

export function AnimalsClient() {
  const params = useSearchParams();
  const [animals, setAnimals] = useState<OrgAnimal[]>([]);
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;

  /* Filters start from the URL, so the dashboard figures can link straight
     to their own list and a filtered view can be shared or bookmarked. */
  const [ster, setSter] = useState<string>(params.get("ster") ?? "");
  const [vacc, setVacc] = useState<string>(params.get("vacc") ?? "");
  const [zone, setZone] = useState<string>(params.get("zone") ?? "");
  const [from, setFrom] = useState<string>(params.get("from") ?? "");
  const [to, setTo] = useState<string>(params.get("to") ?? "");
  const needsOnly = params.get("needs") === "1";

  /* Filtering happens in the database, against the same rows and columns the
     dashboard totals count. Filtering a page of results in the browser would
     make the two disagree the moment there are more animals than one page. */
  const load = () => {
    setLoading(true);
    return orgAnimals({
      search: q,
      ster: (ster || null) as OrgAnimal["sterilisation_status"] | null,
      vacc: (vacc || null) as OrgAnimal["vaccination_status"] | null,
      zone: zone || null,
      from: from ? new Date(from).toISOString() : null,
      // Inclusive of the end date: someone picking the 5th means that day.
      to: to ? new Date(new Date(to).getTime() + 86_400_000).toISOString() : null,
      needsHelp: needsOnly ? true : null,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(setAnimals)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeo…2294 tokens truncated…eRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const species = "dog";
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
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Your source ID / tag (optional)" className={INPUT} />
      </div>
      <p className="text-[13px] font-medium text-bark-500">Dog record</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Village / area" className={INPUT} />
        <button onClick={locate} className="flex items-center justify-between rounded-md border border-black/[0.1] px-3 py-2.5 text-sm dark:border-white/[0.12]" title="GPS makes this new profile appear on the public map immediately">
          <span className={coords ? "text-bark-900 dark:text-bark-50" : "text-bark-400"}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Capture GPS for map"}</span>
          <Crosshair className="h-4 w-4 text-paw-500" />
        </button>
      </div>
      {!coords && <p className="text-[12px] leading-relaxed text-bark-500">Profiles publish immediately. Add GPS to place this one on the public map; an area name alone is kept as an unpinned profile so StrayPaw never invents a location.</p>}
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
