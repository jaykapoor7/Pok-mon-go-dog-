"use client";

import { MapboxMap } from "./MapboxMap";
import { MapLibreMap } from "./MapLibreMap";
import type { Dog } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Real, scrollable map. Uses Mapbox when a token is configured; otherwise a
 * keyless OpenStreetMap (MapLibre + OpenFreeMap) so a full Google-Maps-style
 * map always renders. Both bubble a tapped dog up via onSelect.
 */
export function DogMap({
  dogs,
  onSelect,
}: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
}) {
  if (TOKEN) {
    return <MapboxMap token={TOKEN} dogs={dogs} onSelect={onSelect} />;
  }
  return <MapLibreMap dogs={dogs} onSelect={onSelect} />;
}
