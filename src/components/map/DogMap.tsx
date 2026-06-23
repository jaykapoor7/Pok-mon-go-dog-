"use client";

import { FallbackMap } from "./FallbackMap";
import { MapboxMap } from "./MapboxMap";
import type { Dog } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Chooses the live Mapbox map when a token is available, otherwise the
 * stylised fallback. Both share the same DogQuickCard interaction.
 */
export function DogMap({
  dogs,
  onAction,
}: {
  dogs: Dog[];
  onAction?: (dog: Dog, kind: "saw" | "fed") => void;
}) {
  if (TOKEN) {
    return <MapboxMap token={TOKEN} dogs={dogs} onAction={onAction} />;
  }
  return <FallbackMap dogs={dogs} onAction={onAction} />;
}
