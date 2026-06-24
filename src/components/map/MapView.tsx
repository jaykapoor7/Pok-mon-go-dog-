"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DogBottomSheet } from "@/components/map/DogBottomSheet";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  markerStateFor,
  MARKER_META,
  MARKER_ORDER,
  type MarkerState,
} from "@/lib/marker-state";
import { cn } from "@/lib/utils";
import type { Dog } from "@/lib/types";

type Filter = "all" | MarkerState;

export function MapView({
  dogs: allDogs,
  demoMode = false,
}: {
  dogs: Dog[];
  demoMode?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Dog | null>(null);
  const { requireAuth } = useAuth();
  const router = useRouter();

  const dogs = useMemo(
    () =>
      filter === "all"
        ? allDogs
        : allDogs.filter((d) => markerStateFor(d) === filter),
    [allDogs, filter]
  );

  function handleAction(dog: Dog, kind: "saw" | "fed") {
    celebrate();
    (kind === "fed" ? logFeed(dog.id) : logSeen(dog.id)).catch(() => {});
  }

  function report() {
    requireAuth(() => router.push("/report"));
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* state filter rail (sits just below the floating top bar) */}
      <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-20 px-3">
        <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            emoji="🗺️"
          />
          {MARKER_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={MARKER_META[s].label}
              emoji={MARKER_META[s].emoji}
            />
          ))}
        </div>
      </div>

      <MapCanvas dogs={dogs} onSelect={setSelected} />

      {/* subtle "Demo Mode Active" indicator */}
      {demoMode && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bark-900/80 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-md dark:bg-white/85 dark:text-bark-900">
            <span className="h-1.5 w-1.5 rounded-full bg-paw-400" />
            Demo Mode Active
          </span>
        </div>
      )}

      {/* count pill */}
      {allDogs.length > 0 && (
        <div className="absolute bottom-5 right-4 z-20">
          <span className="chip bg-bark-900/90 px-3.5 py-2 font-semibold text-white shadow-pop backdrop-blur-md dark:bg-white/90 dark:text-bark-900">
            {dogs.length} {dogs.length === 1 ? "dog" : "dogs"}
          </span>
        </div>
      )}

      {/* empty state */}
      {allDogs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="glass pointer-events-auto max-w-xs rounded-[28px] px-7 py-8 text-center shadow-pop">
            <h2 className="font-display text-xl font-bold tracking-tightest">
              No sightings yet
            </h2>
            <p className="mt-1.5 text-sm text-bark-500">Add the first one 🐕</p>
            <button onClick={report} className="btn-primary mt-5 px-5 py-3 text-sm">
              <PlusCircle className="h-4 w-4" /> Report a sighting
            </button>
          </div>
        </div>
      )}

      <DogBottomSheet
        dog={selected}
        onClose={() => setSelected(null)}
        onAction={handleAction}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "chip shrink-0 px-3.5 py-2 transition-[background-color,color,box-shadow] duration-150",
        active
          ? "bg-bark-900 text-white shadow-pop dark:bg-white dark:text-bark-900"
          : "glass text-bark-700 shadow-card hover:bg-white dark:text-bark-100"
      )}
    >
      <span aria-hidden className="opacity-90">
        {emoji}
      </span>
      {label}
    </button>
  );
}
