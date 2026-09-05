"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Tent, Check } from "lucide-react";
import { getMyCamps, createVetCamp, setVetCampStatus } from "@/lib/camp-actions";
import { formatDate } from "@/lib/utils";
import type { VetCamp } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT = "rounded-md border border-black/[0.1] bg-transparent px-3 py-2 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function CampsSection() {
  const [camps, setCamps] = useState<VetCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => getMyCamps().then(setCamps).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Veterinary camps</h2>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Plan camp
        </button>
      </div>

      {adding && <AddCamp onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : camps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No camps planned yet.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {camps.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-0 dark:border-white/[0.06]">
              <Tent className="h-4 w-4 shrink-0 text-bark-300" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.name}</p>
                <p className="truncate text-[12px] text-bark-400">
                  {[c.village, c.district].filter(Boolean).join(", ") || "-"}{c.camp_date ? ` · ${formatDate(c.camp_date)}` : ""}
                </p>
              </div>
              <button
                onClick={() => setVetCampStatus(c.id, c.status === "done" ? "planned" : "done").then(load)}
                className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", c.status === "done" ? "bg-status-vaccinated/15 text-status-vaccinated" : "bg-status-hungry/15 text-status-hungry")}
              >
                {c.status === "done" ? "Done" : "Planned"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddCamp({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createVetCamp({ name: name.trim(), village: village.trim() || undefined, district: district.trim() || undefined, campDate: date || null });
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.1]">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camp name, e.g. Marathwada deworming camp" className={cn(INPUT, "w-full")} />
      <div className="flex flex-wrap gap-2">
        <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village" className={cn(INPUT, "min-w-0 flex-1")} />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className={cn(INPUT, "min-w-0 flex-1")} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
        <button onClick={submit} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
      </div>
    </div>
  );
}
