"use client";

import dynamic from "next/dynamic";
import { PawPrint } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dog, FeedingZone } from "@/lib/types";
import type { MapApi } from "./MapLibreMap";
import type { WardFeatureCollection, WardMetric } from "@/lib/wards";

/* A bouncing paw print on an empty ground said "something is happening" and
   nothing else. Skeletons in the shape of the thing that is coming — the
   control stack, the legend, the counters — say what is arriving and stop the
   layout jumping when it does. */
const loading = () => (
  <div className="relative h-full w-full bg-muted/40" aria-busy="true">
    <span className="sr-only">Loading the map…</span>
    <div className="absolute left-4 top-4 flex flex-col gap-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="size-9 rounded-md" />
      ))}
    </div>
    <div className="absolute bottom-24 left-4 flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-36" />
    </div>
    <div className="absolute inset-x-0 bottom-0 flex gap-px border-t" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2 p-4">
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-sm text-muted-foreground">
      <PawPrint className="size-4 animate-pulse" aria-hidden />
      Tracking dogs…
    </div>
  </div>
);

/**
 * One engine, MapLibre against CARTO's keyless basemap. It touches `window`,
 * so it stays client-only.
 *
 * There were two engines: Mapbox when NEXT_PUBLIC_MAPBOX_TOKEN was set, and
 * MapLibre otherwise. They drifted, which is the trap two implementations of
 * one thing always are — the performance rewrite would have landed in only
 * one of them, and which one you got depended on an environment variable.
 * MapLibre needs no key and no billing account, so it is the one that stays.
 */
const MapEngine = dynamic(
  () => import("./MapLibreMap").then((m) => m.MapLibreMap),
  { ssr: false, loading }
);

export function MapCanvas(props: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  /** Extent of a searched area, framed in preference to center when given. */
  bounds?: [[number, number], [number, number]] | null;
  /** Static, chrome-less, non-interactive home preview (no controls/attribution). */
  preview?: boolean;
  /** Feeding-zone pins (community feeding spots) rendered alongside dogs. */
  feedingZones?: FeedingZone[];
  /** Handed the map's imperative controls once it has loaded. */
  onReady?: (api: MapApi) => void;
  /** Overlay showing what each state has actually published. */
  showGaps?: boolean;
  /** Ward polygons with their counts, shaded by wardMetric. */
  wards?: WardFeatureCollection | null;
  wardMetric?: WardMetric;
  onWardSelect?: (ward: Record<string, unknown> | null) => void;
  /** Id of the animal whose record is open, ringed on the map. */
  selectedId?: string | null;
}) {
  return <MapEngine {...props} />;
}
