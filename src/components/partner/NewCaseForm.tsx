"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check, Search, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PartnerWrite } from "@/components/partner/PartnerGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { createCase } from "@/lib/case-actions";
import { createAnimal, searchMyAnimals, type AnimalRow } from "@/lib/animal-actions";
import { uploadPhoto } from "@/lib/actions";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { CASE_CATEGORY_META, CASE_SEVERITY_META, type CaseCategory, type CaseSeverity, } from "@/lib/types";
import { CITIES } from "@/lib/geo/cities";
import { cn, dogLabel } from "@/lib/utils";
import { DeskHeader } from "@/components/app/DeskHeader";

const CATEGORIES = Object.keys(CASE_CATEGORY_META) as CaseCategory[];
const SEVERITIES: CaseSeverity[] = ["low", "normal", "high", "critical"];
const INPUT = "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function NewCaseForm({ presetDogId }: { presetDogId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dogs, setDogs] = useState<AnimalRow[]>([]);
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
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  /* Dog-only platform: species is fixed, never chosen. */
  const species = "dog";
  const [category, setCategory] = useState<CaseCategory>("injury");
  const [severity, setSeverity] = useState<CaseSeverity>("normal");
  const [informerContact, setInformerContact] = useState("");
  const [hospital, setHospital] = useState("");
  const [costEstimate, setCostEstimate] = useState("");
  const [costSpent, setCostSpent] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The picker searches the register as you type — a bounded read, never
     the whole register sent to the browser. The chosen animal is kept so
     it stays selected when the search moves on. */
  const [picked, setPicked] = useState<AnimalRow | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { searchMyAnimals(q, q.trim() ? 10 : 8).then((rows) => { if (live) setDogs(rows); }).catch(() => { if (live) setError("Your organisation’s dogs could not be loaded. Try again."); }); }, q.trim() ? 220 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    if (!dogId) { setPicked(null); return; }
    const inList = dogs.find((d) => d.id === dogId);
    if (inList) { setPicked(inList); setCity(current => current || inList.city || ""); }
    else searchMyAnimals("", 1, dogId).then((rows) => { setPicked(rows[0] ?? null); setCity(current => current || rows[0]?.city || ""); }).catch(() => {});
  }, [dogId, dogs]);

  const selectedDog = picked;
  const matches = dogs;

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setError(null);
    try { setPhoto(await uploadPhoto(f)); } catch { setError("Could not upload the photo."); } finally { setUploading(false); }
  }

  async function submit() {
    if (!user) { setError("Sign in to create a case."); return; }
    if (!city.trim()) { setError("Choose the city for this incident."); return; }
    if (!title.trim()) { setError("Give the case a short title."); return; }
    if (mode === "existing" && (!dogId || !selectedDog)) { setError("Pick an animal, or add a new one with a photo."); return; }
    if (mode === "new" && !photo) { setError("A photo is required to create a new animal profile."); return; }
    setBusy(true); setError(null);
    try {
      const amount = (value: string, label: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value.replace(/,/g, ""));
        if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a valid non-negative amount.`);
        return parsed;
      };
      const lat = latitude.trim() ? Number(latitude) : null;
      const lng = longitude.trim() ? Number(longitude) : null;
      if ((lat === null) !== (lng === null) || (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng!) > 180))) throw new Error("Enter valid latitude and longitude together, or leave both blank.");
      const estimatedCost = amount(costEstimate, "Estimated treatment cost");
      const spentCost = amount(costSpent, "Amount spent");
      let linkedDogId = mode === "existing" ? dogId : null;
      /* The case carries the incident's own locality. If the worker typed one
         for this report, that wins — a new incident can be somewhere other than
         where the dog was last recorded. Fall back to the dog's zone only when
         nothing was typed. */
      const linkedZone = zone.trim() || selectedDog?.zone || null;

      if (mode === "new") {
        const newId = await createAnimal({ city: city.trim(), lat, lng, name: name.trim() || undefined, species, zone: zone.trim() || undefined, coverPhoto: photo });
        if (!newId || newId === "demo-animal") throw new Error("The dog profile could not be created. Your case has not been submitted.");
        linkedDogId = newId;
      }

      const id = await createCase(
        {
          city: city.trim(), lat, lng, title: title.trim(), description: description.trim(), dogId: linkedDogId, zone: linkedZone, severity, category, species,
          informerContact, hospital,
          costEstimate: estimatedCost,
          costSpent: spentCost,
        },
        { id: user.id, name: user.name }
      );
      if (id && id !== "demo-case") router.push(`/partner/cases/${id}`);
      else throw new Error("The case could not be saved. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the case.");
    } finally { setBusy(false); }
  }

  return (
    <div className="dk-form-page">
      <DeskHeader
        kicker="Records · new case"
        title="Open a rescue case"
        lede="Link it to an animal already on your record, or add a new one with a photo. The incident’s own locality is what gets saved."
        actions={<Link href="/partner/cases" className="dk-btn is-tint"><ArrowLeft size={15} /> Cases</Link>}
      />

      {/* Opening a case writes to the organisation's records, which the
          database refuses from anyone who is not an organisation member. Better
          to say so here than after the form has been filled in. */}
      <div className="mt-5">
        <PartnerWrite what="open a case">

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
              <button aria-label="Clear selected dog" onClick={() => setDogId(null)} className="text-bark-400 hover:text-status-injured"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" /><input aria-label="Search dogs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search animals by name, ID or area" className={cn(INPUT, "pl-9")} /></div>
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
            {/* StrayPaw is a dog-only platform, so a new animal is always a dog;
                no species picker is offered. */}
            <input aria-label="Dog name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={INPUT} />
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
        <input aria-label="Case title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title, e.g. Hind-leg injury" className={INPUT} />
        <textarea aria-label="Case description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's going on? Condition, symptoms, context." className={cn(INPUT, "min-h-[80px] resize-y")} />
        <label className="block text-sm">City<input aria-label="Incident city" list="case-cities" required value={city} onChange={(e) => setCity(e.target.value)} className={cn(INPUT, "mt-1")} /></label>
        <datalist id="case-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
        <input aria-label="Incident locality" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Area / locality" className={INPUT} />
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Latitude (optional)<input aria-label="Incident latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" className={cn(INPUT, "mt-1")} /></label><label className="text-sm">Longitude (optional)<input aria-label="Incident longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" className={cn(INPUT, "mt-1")} /></label></div>
        <p className="text-xs text-bark-500">Use the incident’s actual coordinates. Leave them blank when unknown; a locality alone does not create a map pin.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-bark-600 dark:text-bark-200">Informer / reporter contact
            <input value={informerContact} onChange={(e) => setInformerContact(e.target.value)} placeholder="Phone, WhatsApp or email (private)" className={cn(INPUT, "mt-1.5")} />
          </label>
          <label className="text-[13px] font-medium text-bark-600 dark:text-bark-200">Clinic / hospital
            <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Where treatment will happen" className={cn(INPUT, "mt-1.5")} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-bark-600 dark:text-bark-200">Estimated treatment cost (₹)
            <input value={costEstimate} inputMode="decimal" onChange={(e) => setCostEstimate(e.target.value)} placeholder="Optional" className={cn(INPUT, "mt-1.5")} />
          </label>
          <label className="text-[13px] font-medium text-bark-600 dark:text-bark-200">Amount spent (₹)
            <input value={costSpent} inputMode="decimal" onChange={(e) => setCostSpent(e.target.value)} placeholder="Optional" className={cn(INPUT, "mt-1.5")} />
          </label>
        </div>
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
        </PartnerWrite>
      </div>
    </div>
  );
}
