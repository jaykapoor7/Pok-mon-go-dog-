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

export function MapView({ dogs: allDogs }: { dogs: Dog[] }) {
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

      {/* count pill */}
      {allDogs.length > 0 && (
        <div className="absolute bottom-4 right-3 z-20">
          <span className="chip bg-bark-900/85 text-white shadow-card">
            {dogs.length} {dogs.length === 1 ? "dog" : "dogs"}
          </span>
        </div>
      )}

      {/* empty state */}
      {allDogs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-xs rounded-3xl bg-white/95 p-6 text-center shadow-warm dark:bg-bark-900/95">
            <h2 className="font-display text-lg font-bold">
              No sightings yet
            </h2>
            <p className="mt-1 text-sm text-bark-500">Add the first one 🐕</p>
            <button onClick={report} className="btn-primary mt-4 px-5 py-2.5 text-sm">
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
        "chip shrink-0 border shadow-card transition-all",
        active
          ? "border-paw-300 bg-paw-500 text-white"
          : "border-white/60 bg-white/90 text-bark-700 hover:bg-white dark:border-bark-700 dark:bg-bark-800 dark:text-bark-100"
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
