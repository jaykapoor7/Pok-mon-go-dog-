"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle, Map as MapIcon, List, ChevronRight } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DogBottomSheet } from "@/components/map/DogBottomSheet";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  markerStateFor,
  markerMetaFor,
  MARKER_META,
  MARKER_ORDER,
  fedRecently,
  type MarkerState,
} from "@/lib/marker-state";
import { cn, dogLabel, timeAgo, distanceMeters } from "@/lib/utils";
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
  const [view, setView] = useState<"map" | "list">("map");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const params = useSearchParams();
  const sLat = parseFloat(params.get("lat") ?? "");
  const sLng = parseFloat(params.get("lng") ?? "");
  const center = Number.isFinite(sLat) && Number.isFinite(sLng) ? { lat: sLat, lng: sLng } : null;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 6000 }
    );
  }, []);

  const counts = useMemo(() => {
    const c = { all: allDogs.length } as Record<string, number>;
    for (const s of MARKER_ORDER) c[s] = 0;
    for (const d of allDogs) c[markerStateFor(d)] = (c[markerStateFor(d)] ?? 0) + 1;
    return c;
  }, [allDogs]);

  const dogs = useMemo(
    () => (filter === "all" ? allDogs : allDogs.filter((d) => markerStateFor(d) === filter)),
    [allDogs, filter]
  );

  const listDogs = useMemo(() => {
    if (!coords) return dogs;
    return [...dogs].sort((a, b) => distanceMeters(coords, a) - distanceMeters(coords, b));
  }, [dogs, coords]);

  function handleAction(dog: Dog, kind: "saw" | "fed") {
    celebrate();
    (kind === "fed" ? logFeed(dog.id, user?.name) : logSeen(dog.id)).catch(() => {});
  }

  function fmtDist(d: number) {
    return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {/* filter rail + view toggle */}
      <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-20 flex items-start gap-2 px-3">
        <div className="no-scrollbar pointer-events-auto flex flex-1 gap-2 overflow-x-auto">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
          {MARKER_ORDER.map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={MARKER_META[s].label} color={MARKER_META[s].color} count={counts[s]} />
          ))}
          {feedingZones.length > 0 && view === "map" && (
            <FilterChip active={showFeeding} onClick={() => setShowFeeding((v) => !v)} label={`🥣 Feeding (${feedingZones.length})`} />
          )}
        </div>
        {/* Map / List toggle */}
        <div className="glass pointer-events-auto flex shrink-0 rounded-full p-1 shadow-card">
          <button onClick={() => setView("map")} aria-label="Map view" className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-colors", view === "map" ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500")}>
            <MapIcon className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} aria-label="List view" className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-colors", view === "list" ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "map" ? (
        <MapCanvas dogs={dogs} onSelect={setSelected} center={center} feedingZones={showFeeding ? feedingZones : []} />
      ) : (
        <div className="absolute inset-0 overflow-y-auto bg-paper pb-28 pt-[7.5rem] dark:bg-ink">
          <div className="mx-auto max-w-xl px-3">
            <p className="mb-3 px-1 text-[13px] text-bark-500">
              {listDogs.length} {listDogs.length === 1 ? "animal" : "animals"}{coords ? ", nearest first" : ""}
            </p>
            {listDogs.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-bark-500">No animals match this filter.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {listDogs.map((dog) => {
                  const meta = markerMetaFor(dog);
                  const dist = coords ? distanceMeters(coords, dog) : null;
                  return (
                    <li key={dog.id}>
                      <button onClick={() => setSelected(dog)} className="card card-interactive flex w-full items-center gap-3 p-2.5 text-left">
                        <div className="relative shrink-0">
                          <DogPhoto src={dog.cover_photo} alt="" seed={dog.id} className="h-16 w-16 rounded-2xl" />
                          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-bark-900" style={{ backgroundColor: meta.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-bark-900 dark:text-bark-50">{dogLabel(dog)}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-bark-500">
                            <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
                            <span>· {dog.zone}</span>
                            {dist != null && <span>· {fmtDist(dist)}</span>}
                          </p>
                          <p className="mt-0.5 text-[11px] text-bark-400">
                            Seen {timeAgo(dog.last_seen)}{fedRecently(dog) ? " · fed recently" : dog.needs_help ? " · needs help" : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-bark-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* empty state (map) */}
      {allDogs.length === 0 && view === "map" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="glass pointer-events-auto max-w-xs rounded-[28px] px-7 py-8 text-center shadow-pop">
            <h2 className="font-display text-xl font-bold tracking-tightest">No sightings yet</h2>
            <p className="mt-1.5 text-sm text-bark-500">Add the first one.</p>
            <button onClick={() => router.push("/report")} className="btn-primary mt-5 px-5 py-3 text-sm">
              <PlusCircle className="h-4 w-4" /> Report a sighting
            </button>
          </div>
        </div>
      )}

      <DogBottomSheet dog={selected} onClose={() => setSelected(null)} onAction={handleAction} coords={coords} />
    </div>
  );
}

function FilterChip({ active, onClick, label, color, count }: { active: boolean; onClick: () => void; label: string; color?: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "chip shrink-0 px-3.5 py-2 transition-[background-color,color,box-shadow] duration-150",
        active ? "bg-bark-900 text-white shadow-pop dark:bg-white dark:text-bark-900" : "glass text-bark-700 shadow-card hover:bg-white dark:text-bark-100"
      )}
    >
      {color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      {count != null && count > 0 && <span className={cn("ml-0.5 tabular-nums", active ? "opacity-70" : "text-bark-400")}>{count}</span>}
    </button>
  );
}
