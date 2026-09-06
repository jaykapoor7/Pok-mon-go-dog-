"use client";

import dynamic from "next/dynamic";
import { PawPrint } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dog, FeedingZone } from "@/lib/types";
import type { MapApi } from "./MapLibreMap";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

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
 * Map engines touch `window`, so they're client-only. We ship only ONE engine
 * to the browser: Mapbox when a token is configured, otherwise the keyless
 * MapLibre/OpenFreeMap map. The untaken `import()` is never fetched, so its
 * (large) chunk stays off the wire, a big perceived-load win.
 */
const MapEngine = dynamic(
  () =>
    HAS_TOKEN
      ? import("./MapboxMap").then((m) => m.MapboxMap)
      : import("./MapLibreMap").then((m) => m.MapLibreMap),
  { ssr: false, loading }
);

export function MapCanvas(props: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
  center?: { lat: number; lng: number } | null;
  /** Static, chrome-less, non-interactive home preview (no controls/attribution). */
  preview?: boolean;
  /** Feeding-zone pins (community feeding spots) rendered alongside dogs. */
  feedingZones?: FeedingZone[];
  /** Handed the map's imperative controls once it has loaded. */
  onReady?: (api: MapApi) => void;
  /** Overlay showing what each state has actually published. */
  showGaps?: boolean;
}) {
  return <MapEngine {...props} />;
}
