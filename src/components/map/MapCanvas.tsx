"use client";

import dynamic from "next/dynamic";
import { PawPrint } from "lucide-react";
import type { Dog } from "@/lib/types";

// mapbox-gl touches `window`, so the map must be client-only.
const DogMap = dynamic(() => import("./DogMap").then((m) => m.DogMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paw-50">
      <div className="flex flex-col items-center gap-3 text-paw-400">
        <PawPrint className="h-8 w-8 animate-bounce" />
        <p className="text-sm font-medium">tracking dogs…</p>
      </div>
    </div>
  ),
});

export function MapCanvas(props: {
  dogs: Dog[];
  onSelect?: (dog: Dog) => void;
}) {
  return <DogMap {...props} />;
}
