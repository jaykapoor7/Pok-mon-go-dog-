"use client";

import dynamic from "next/dynamic";
import { PawPrint } from "lucide-react";
import type { Dog } from "@/lib/types";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

const loading = () => (
  <div className="flex h-full w-full items-center justify-center bg-paw-50">
    <div className="flex flex-col items-center gap-3 text-paw-400">
      <PawPrint className="h-8 w-8 animate-bounce" />
      <p className="text-sm font-medium">tracking dogs…</p>
    </div>
  </div>
);

/**
 * Map engines touch `window`, so they're client-only. We ship only ONE engine
 * to the browser: Mapbox when a token is configured, otherwise the keyless
 * MapLibre/OpenFreeMap map. The untaken `import()` is never fetched, so its
 * (large) chunk stays off the wire — a big perceived-load win.
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
  /** Slowly rotate the view when idle — used for the non-interactive home preview. */
  drift?: boolean;
}) {
  return <MapEngine {...props} />;
}
