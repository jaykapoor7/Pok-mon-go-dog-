"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check, Search, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { createCase } from "@/lib/case-actions";
import { createAnimal } from "@/lib/animal-actions";
import { uploadPhoto } from "@/lib/actions";
import { getAllDogs } from "@/lib/data";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { CASE_CATEGORY_META, CASE_SEVERITY_META, SPECIES, type CaseCategory, type CaseSeverity, type Dog } from "@/lib/types";
import { cn, dogLabel } from "@/lib/utils";

const CATEGORIES = Object.keys(CASE_CATEGORY_META) as CaseCategory[];
const SEVERITIES: CaseSeverity[] = ["low", "normal", "high", "critical"];
const INPUT = "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function NewCaseForm({ presetDogId }: { presetDogId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [mode, setMode] = useState<"existing" | "new">(presetDogId ? "existing" : "existing");
  const [dogId, setDogId] = useState<string | null>(presetDogId ?? null);
  const [q, setQ] = useState("");

  // new-animal fields
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // case fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("");
  const [species, setSpecies] = useState("dog");
  const [category, setCategory] = useState<CaseCategory>("injury");
  const [severity, setSeverity] = useState<CaseSeverity>("normal");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getAllDogs().then(setDogs).catch(() => {}); }, []);

  const selectedDog = useMemo(() => dogs.find((d) => d.id === dogId) ?? null, [dogs, dogId]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return dogs.slice(0, 8);
    return dogs.filter((d) => dogLabel(d).toLowerCase().includes(t) || (d.zone ?? "").toLowerCase().includes(t) || (d.code ?? "").toLowerCase().includes(t)).slice(0, 10);
  }, [dogs, q]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setError(null);
    try { setPhoto(await uploadPhoto(f)); } catch { setError("Could not upload the photo."); } finally { setUploading(false); }
  }

  async function submit() {
    if (!user) { setError("Sign in to create a case."); return; }
    if (!title.trim()) { setError("Give the case a short title."); return; }
    if (mode === "existing" && !dogId) { setError("Pick an animal, or add a new one with a photo."); return; }
    if (mode === "new" && !photo) { setError("A photo is required to create a new animal profile."); return; }
    setBusy(true); setError(null);
    try {
      let linkedDogId = mode === "existing" ? dogId : null;
      const linkedZone = selectedDog?.zone ?? (zone.trim() || null);

      if (mode === "new") {
        const newId = await createAnimal({ name: name.trim() || undefined, species, zone: zone.trim() || undefined, coverPhoto: photo });
        if (newId && newId !== "demo-animal") linkedDogId = newId;
      }

      const id = await createCase(
        { title: title.trim(), description: description.trim(), dogId: linkedDogId, zone: linkedZone, severity, category, species },
        { id: user.id, name: user.name }
      );
      if (id && id !== "demo-case") router.push(`/partner/cases/${id}`);
      else router.push("/partner/cases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the case.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/partner/cases" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"><ArrowLeft className="h-4 w-4" /> Cases</Link>
      <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">New case</h1>
      <p className="mt-0.5 text-[13px] text-bark-500">Link the case to an animal in your registry, or add a new one with a photo.</p>

      {/* animal picker */}
      <div className="mt-6 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
        <div className="mb-3 flex gap-2">
          <button onClick={() => setMode("existing")} className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", mode === "existing" ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>Existing animal</button>
          <button onClick={() => { setMode("new"); setDogId(null); }} className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", mode === "new" ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>New animal</button>
        </div>

        {mode === "existing" ? (
          selectedDog ? (
            <div className="flex items-center gap-3 rounded-md border border-paw-200 bg-paw-50 p-2.5 dark:border-paw-500/30 dark:bg-paw-900/20">
              <DogPhoto src={selectedDog.cover_photo} alt="" seed={selectedDog.id} className="h-12 w-12 rounded-md" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{dogLabel(selectedDog)}</p><p className="truncate text-xs text-bark-400">{selectedDog.zone}</p></div>
              <button onClick={() => setDogId(null)} className="text-bark-400 hover:text-status-injured"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search animals by name, ID or area" className={cn(INPUT, "pl-9")} /></div>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {matches.length === 0 ? <p className="py-4 text-center text-[13px] text-bark-400">No matches. Add a new animal instead.</p> : matches.map((d) => (
                  <button key={d.id} onClick={() => setDogId(d.id)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
                    <DogPhoto src={d.cover_photo} alt="" seed={d.id} className="h-9 w-9 rounded-md" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{dogLabel(d)}</span><span className="block truncate text-xs text-bark-400">{d.zone}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={INPUT} />
              <div className="flex flex-wrap gap-1.5">
                {SPECIES.filter((s) => s.id !== "other").map((s) => (
                  <button key={s.id} onClick={() => setSpecies(s.id)} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium", species === s.id ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]")}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-medium text-bark-600 dark:border-white/[0.12] dark:text-bark-200">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : photo ? <Check className="h-4 w-4 text-status-vaccinated" /> : <Camera className="h-4 w-4" />} {photo ? "Photo added" : "Add photo *"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
              {photo && <img src={photo} alt="" className="h-12 w-12 rounded-md object-cover" />}
            </div>
            <p className="text-xs text-bark-400">A photo is required, it creates the animal&apos;s profile alongside this case.</p>
          </div>
        )}
      </div>

      {/* case fields */}
      <div className="mt-4 space-y-4 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title, e.g. Hind-leg injury" className={INPUT} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's going on? Condition, symptoms, context." className={cn(INPUT, "min-h-[80px] resize-y")} />
        <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Area / locality" className={INPUT} />
        <div>
          <p className="mb-1.5 text-xs font-medium text-bark-500">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium", category === c ? "bg-paw-500 text-white" : "text-bark-500 hover:bg-black/[0.04]")}>{CASE_CATEGORY_META[c].label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-bark-500">Severity</p>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button key={s} onClick={() => setSeverity(s)} className={cn("rounded-md px-2.5 py-1.5 text-[13px] font-medium", severity === s ? "bg-paw-500 text-white" : "text-bark-500 hover:bg-black/[0.04]")}>{CASE_SEVERITY_META[s].label}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>}

      <button onClick={submit} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-paw-500 py-3 text-sm font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create case
      </button>
    </div>
  );
}
