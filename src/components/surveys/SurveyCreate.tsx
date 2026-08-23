"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check } from "lucide-react";
import { isNgoMember } from "@/lib/actions";
import { createSurvey } from "@/lib/survey-actions";
import { SPECIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-md border border-black/[0.1] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.12]";

export function SurveyCreate() {
  const router = useRouter();
  const [member, setMember] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [species, setSpecies] = useState("dog");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isNgoMember().then(setMember).catch(() => {});
  }, []);

  if (!member) return null;

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createSurvey(title.trim(), species, description.trim() || undefined);
      if (id && id !== "demo-survey") router.push(`/surveys/${id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create survey.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600"
      >
        <Plus className="h-4 w-4" /> New survey
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Survey title, e.g. Bengaluru Stray Dog Census 2026" className={INPUT} />
      <div className="flex flex-wrap gap-2">
        {SPECIES.filter((s) => s.id !== "other").map((s) => (
          <button
            key={s.id}
            onClick={() => setSpecies(s.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[13px] font-medium",
              species === s.id ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is being counted, and how (optional)." className={cn(INPUT, "min-h-[70px] resize-y")} />
      {error && <p className="text-sm text-status-injured">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-[13px] font-medium text-bark-500 hover:bg-black/[0.04]">Cancel</button>
      </div>
    </div>
  );
}
