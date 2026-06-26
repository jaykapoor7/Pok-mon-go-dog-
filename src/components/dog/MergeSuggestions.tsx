"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitMerge, Loader2, Check } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { isNgoMember, mergeDogs } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

type Suggestion = { dog: Dog; confidence: number; reason: string };

/**
 * "Possibly the same dog?" — anyone can open a candidate profile. Verified
 * partner NGOs additionally get a Merge action that folds the duplicate's
 * sightings into THIS profile's timeline (so one dog isn't split across
 * multiple profiles), via the merge_dogs RPC.
 */
export function MergeSuggestions({
  keepId,
  suggestions,
}: {
  keepId: string;
  suggestions: Suggestion[];
}) {
  const router = useRouter();
  const [canMerge, setCanMerge] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isNgoMember().then(setCanMerge).catch(() => {});
  }, []);

  async function merge(removeId: string) {
    if (!confirm("Merge this profile into the current one? Its sightings move here and the duplicate is removed.")) return;
    setBusyId(removeId);
    setError(null);
    try {
      const ok = await mergeDogs(keepId, removeId);
      if (!ok) {
        setError("Merge failed — partner-NGO access is required.");
        haptic("error");
        return;
      }
      haptic("success");
      setMergedIds((prev) => new Set(prev).add(removeId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed.");
      haptic("error");
    } finally {
      setBusyId(null);
    }
  }

  const visible = suggestions.filter((m) => !mergedIds.has(m.dog.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm font-medium text-status-injured">{error}</p>}
      {visible.map((m) => (
        <div
          key={m.dog.id}
          className="flex items-center gap-3 rounded-2xl border border-bark-100 p-2.5 dark:border-white/10"
        >
          <Link href={`/dog/${m.dog.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <DogPhoto src={m.dog.cover_photo} alt={dogLabel(m.dog)} seed={m.dog.id} className="h-12 w-12 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{dogLabel(m.dog)}</p>
              <p className="truncate text-xs text-bark-400">{m.reason}</p>
            </div>
          </Link>
          <span className="chip shrink-0 bg-status-sterilised/15 text-status-sterilised">
            {Math.round(m.confidence * 100)}%
          </span>
          {canMerge && (
            <button
              onClick={() => merge(m.dog.id)}
              disabled={busyId === m.dog.id}
              className="flex shrink-0 items-center gap-1 rounded-full bg-paw-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busyId === m.dog.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitMerge className="h-3.5 w-3.5" />
              )}
              Merge
            </button>
          )}
        </div>
      ))}
      {canMerge && (
        <p className="flex items-center gap-1 text-[11px] text-bark-400">
          <Check className="h-3 w-3" /> Merging moves the other profile&apos;s sightings into this one.
        </p>
      )}
    </div>
  );
}
