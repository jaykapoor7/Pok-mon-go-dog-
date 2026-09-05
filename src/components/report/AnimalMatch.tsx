"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, PawPrint } from "lucide-react";
import { nearbyAnimals, type AnimalCandidate } from "@/lib/data";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════
   "Have you seen this one before?"

   This is where an observation becomes part of a longer record instead of
   a standalone report — and it is the one place the product could quietly
   start lying. Distance is the only signal available here; there is no
   model comparing coats. So the list is offered as a question, the answer
   defaults to "not one of these", and whatever the reporter picks is
   stored as a claim for review rather than as an identification.

   When a matcher exists it writes identity_method = 'cv_matched' and can
   pre-select an option here. Nothing else about this component changes.
   ════════════════════════════════════════════════════════════════════ */

function ago(iso: string | null) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "seen today";
  if (days === 1) return "seen yesterday";
  if (days < 30) return `seen ${days} days ago`;
  const months = Math.round(days / 30);
  return `seen ${months} month${months === 1 ? "" : "s"} ago`;
}

export function AnimalMatch({
  lat,
  lng,
  value,
  onChange,
}: {
  lat: number;
  lng: number;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [list, setList] = useState<AnimalCandidate[] | null>(null);

  useEffect(() => {
    let live = true;
    setList(null);
    nearbyAnimals(lat, lng, 300, 6)
      .then((r) => live && setList(r))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [lat, lng]);

  if (list === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-bark-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking for animals already recorded here…
      </div>
    );
  }

  /* Nothing recorded nearby is the ordinary case early on, and saying so is
     more useful than hiding the section — it tells the reporter they are the
     first person to write this street down. */
  if (list.length === 0) {
    return (
      <p className="rounded border border-dashed border-bark-200 px-4 py-3 text-xs text-bark-400 dark:border-white/10">
        No animals recorded near here yet. Yours will be the first on this
        stretch.
      </p>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">
        Have you seen this one before?
      </label>
      <p className="mb-2.5 text-xs text-bark-400">
        These are already recorded within 300 m. Only pick one if you are
        fairly sure it is the same animal — a reviewer checks it either way.
      </p>

      <div className="grid gap-2">
        {list.map((a) => {
          const on = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(on ? null : a.id)}
              aria-pressed={on}
              className={cn(
                "flex items-center gap-3 rounded border px-3 py-2.5 text-left transition-colors",
                on
                  ? "border-paw-400 bg-paw-50 dark:bg-paw-500/10"
                  : "border-bark-200 hover:border-paw-300 dark:border-white/10"
              )}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-bark-100 dark:bg-white/5">
                {a.cover_photo ? (
                  <Image
                    src={a.cover_photo}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <PawPrint className="absolute inset-0 m-auto h-4 w-4 text-bark-300" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {a.name?.trim() || "Unnamed animal"}
                </span>
                <span className="block text-xs text-bark-400">
                  {a.distance_m} m away
                  {a.last_seen ? ` · ${ago(a.last_seen)}` : ""}
                  {a.sightings_count && a.sightings_count > 1
                    ? ` · ${a.sightings_count} observations`
                    : ""}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border",
                  on
                    ? "border-paw-500 bg-paw-500"
                    : "border-bark-300 dark:border-white/20"
                )}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          "mt-2 w-full rounded border px-3 py-2.5 text-left text-sm transition-colors",
          value === null
            ? "border-paw-400 bg-paw-50 font-semibold dark:bg-paw-500/10"
            : "border-bark-200 text-bark-500 hover:border-paw-300 dark:border-white/10"
        )}
      >
        None of these — this is a different animal
      </button>
    </div>
  );
}
