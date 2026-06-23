"use client";

import { FallbackMap } from "./FallbackMap";
import { MapboxMap } from "./MapboxMap";
import type { Dog } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Chooses the live Mapbox map when a token is available, otherwise the
 * interactive stylised fallback. Both bubble a tapped dog up via onSelect.
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
  return <FallbackMap dogs={dogs} onSelect={onSelect} />;
}
