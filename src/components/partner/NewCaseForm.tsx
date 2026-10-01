Warning: truncated output (original token count: 3335)
Total output lines: 221

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check, Search, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PartnerWrite } from "@/components/partner/PartnerGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { createCase } from "@/lib/case-actions";
import { createAnimal } from "@/lib/animal-actions";
import { uploadPhoto } from "@/lib/actions";
import { getDogsByIds, searchDogs } from "@/lib/data";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { CASE_CATEGORY_META, CASE_SEVERITY_META, type CaseCategory, type CaseSeverity, type Dog } from "@/lib/types";
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
  const [picked, setPicked] = useState<Dog | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { searchDogs(q, q.trim() ? 10 : 8).then((rows) => { if (live) setDogs(rows); }).catch(() => {}); }, q.trim() ? 220 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    if (!dogId) { setPicked(null); return; }
    const inList = dogs.find((d) => d.id === dogId);
    if (inList) setPicked(inList);
    else getDogsByIds([dogId]).then((rows) => setPicked(rows[0] ?? null)).catch(() => {});
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
    if (!title.trim()) { setError("Give the case a short title."); return; }
    if (mode === "existing" && !dogId) { setError("Pick an animal, or add a new one with a photo."); return; }
    if (mode === "new" && !photo) { setError("A photo is required to create a new animal profile."); return; }
    setBusy(true); setError(null);
    try {
      let linkedDogId = mode === "existing" ? dogId : null;
      …1335 tokens truncated…k:border-white/[0.12] dark:text-bark-200">
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
