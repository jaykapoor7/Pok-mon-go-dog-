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
import { SPECIES, speciesLabel, STATUS_META } from "@/lib/types";
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
      limit: 500,
    })
      .then(setAnimals)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ster, vacc, zone, from, to, needsOnly]);

  useEffect(() => { orgZones().then(setZones).catch(() => undefined); }, []);

  const rows = animals;
  const total = animals[0]?.total_count ?? 0;
  const filtered = Boolean(q || ster || vacc || zone || from || to || needsOnly);
  const clearAll = () => {
    setQ(""); setSter(""); setVacc(""); setZone(""); setFrom(""); setTo("");
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Animals</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Your organization&apos;s animal records, the longitudinal registry.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {animals.length > 0 && (
            <button
              onClick={() => downloadCsv("animals.csv", animals.map((a) => ({ code: a.code, name: a.name, species: a.species, status: a.status, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, location: a.zone, assignee: a.assignee_name, recorded_by: a.recorded_by, recorded_on: a.created_at, last_seen: a.last_seen })))}
              className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-semibold text-bark-600 hover:bg-black/[0.04] dark:border-white/[0.12] dark:text-bark-200"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          )}
          <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
            <Plus className="h-4 w-4" /> New animal
          </button>
        </div>
      </header>

      {creating && <CreateAnimal onDone={() => { setCreating(false); load(); }} />}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code or area…" aria-label="Search animals" className="min-h-[40px] w-full rounded-md border border-black/[0.09] bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]" />
        </div>
        <select aria-label="Sterilisation status" value={ster} onChange={(e) => setSter(e.target.value)} className={FILTER}>
          <option value="">Sterilisation: all</option>
          <option value="sterilised">Sterilised</option>
          <option value="not_sterilised">Not sterilised</option>
          <option value="unknown">Unknown</option>
        </select>
        <select aria-label="Vaccination status" value={vacc} onChange={(e) => setVacc(e.target.value)} className={FILTER}>
          <option value="">Rabies: all</option>
          <option value="vaccinated">Vaccinated</option>
          <option value="not_vaccinated">Not vaccinated</option>
          <option value="unknown">Unknown</option>
        </select>
        <select aria-label="Location" value={zone} onChange={(e) => setZone(e.target.value)} className={FILTER}>
          <option value="">Location: all</option>
          {zones.map((z) => (
            <option key={z.zone} value={z.zone}>{z.zone} ({z.n})</option>
          ))}
        </select>
        <input type="date" aria-label="Recorded from" value={from} onChange={(e) => setFrom(e.target.value)} className={FILTER} />
        <input type="date" aria-label="Recorded until" value={to} onChange={(e) => setTo(e.target.value)} className={FILTER} />
        {filtered && (
          <button onClick={clearAll} className="min-h-[40px] rounded-md px-2 text-[13px] font-semibold text-bark-500 hover:text-bark-900 dark:hover:text-bark-100">
            Clear
          </button>
        )}
      </div>

      {!loading && (
        <p className="mb-3 text-[12.5px] text-bark-500">
          {filtered
            ? `${total} matching ${total === 1 ? "animal" : "animals"}`
            : `${total} ${total === 1 ? "animal" : "animals"} on record`}
          {needsOnly ? " needing attention" : ""}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-16 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          {filtered
            ? "No animals match these filters."
            : "No animals yet. Add your first record."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          <div className="hidden grid-cols-[40px_92px_1fr_150px_128px_84px] items-center gap-3 border-b border-black/[0.08] bg-bark-50 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-bark-400 dark:border-white/[0.1] dark:bg-white/[0.02] sm:grid">
            <span></span><span>Code</span><span>Animal</span><span>Location</span><span>Programme</span><span className="text-right">Updated</span>
          </div>
          <ul>
            {rows.map((a) => {
              const st = STATUS_META[a.status as keyof typeof STATUS_META];
              return (
                <li key={a.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`/partner/animals/${a.id}`} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[40px_92px_1fr_150px_128px_84px]">
                    <div className="h-8 w-8 overflow-hidden rounded-md bg-bark-100 dark:bg-bark-800">
                      <DogPhoto src={a.cover_photo ?? ""} alt={a.name ?? "Animal"} seed={a.id} className="h-full w-full" />
                    </div>
                    <span className="hidden truncate text-[13px] font-medium tabular-nums text-bark-500 sm:block">{a.code ?? "-"}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{a.name || speciesLabel(a.species ?? "dog")}</p>
                      <p className="truncate text-[12px] text-bark-400 sm:hidden">{a.code ? `${a.code} · ` : ""}{a.zone}</p>
                      <span className="mt-1 flex gap-1 sm:hidden">
                        <StatusPill kind="ster" value={a.sterilisation_status} />
                        <StatusPill kind="vacc" value={a.vaccination_status} />
                      </span>
                    </div>
                    <span className="hidden truncate text-[13px] text-bark-500 sm:block">
                      {a.zone || "-"}
                      {a.recorded_by && (
                        <span className="block truncate text-[11.5px] text-bark-400">
                          by {a.recorded_by}
                        </span>
                      )}
                    </span>
                    <span className="hidden gap-1 sm:flex">
                      <StatusPill kind="ster" value={a.sterilisation_status} />
                      <StatusPill kind="vacc" value={a.vaccination_status} />
                    </span>
                    <span className="shrink-0 text-right text-[12px] tabular-nums text-bark-400">{timeAgo(a.last_seen ?? a.created_at)}</span>
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
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Animal ID, e.g. DDS-00421" className={INPUT} />
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
