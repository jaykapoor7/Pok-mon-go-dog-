"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { Dog, FeedingZone } from "@/lib/types";

type Filter = "all" | MarkerState;

export function MapView({
  dogs: allDogs,
  feedingZones = [],
}: {
  dogs: Dog[];
  feedingZones?: FeedingZone[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Dog | null>(null);
  const [showFeeding, setShowFeeding] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // A searched place (?lat&lng) recenters the map.
  const params = useSearchParams();
  const sLat = parseFloat(params.get("lat") ?? "");
  const sLng = parseFloat(params.get("lng") ?? "");
  const center =
    Number.isFinite(sLat) && Number.isFinite(sLng) ? { lat: sLat, lng: sLng } : null;

  const dogs = useMemo(
    () =>
      filter === "all"
        ? allDogs
        : allDogs.filter((d) => markerStateFor(d) === filter),
    [allDogs, filter]
  );

  function handleAction(dog: Dog, kind: "saw" | "fed") {
    celebrate();
    (kind === "fed" ? logFeed(dog.id, user?.name) : logSeen(dog.id)).catch(() => {});
  }

  function report() {
    // Reporting is open to guests (matches /report), so don't gate the FAB.
    router.push("/report");
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
          />
          {MARKER_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={MARKER_META[s].label}
              color={MARKER_META[s].color}
            />
          ))}
          {feedingZones.length > 0 && (
            <FilterChip
              active={showFeeding}
              onClick={() => setShowFeeding((v) => !v)}
              label={`🥣 Feeding zones (${feedingZones.length})`}
            />
          )}
        </div>
      </div>

      <MapCanvas
        dogs={dogs}
        onSelect={setSelected}
        center={center}
        feedingZones={showFeeding ? feedingZones : []}
      />

      {/* empty state */}
      {allDogs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="glass pointer-events-auto max-w-xs rounded-[28px] px-7 py-8 text-center shadow-pop">
            <h2 className="font-display text-xl font-bold tracking-tightest">
              No sightings yet
            </h2>
            <p className="mt-1.5 text-sm text-bark-500">Add the first one.</p>
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
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
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
      {color && (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
