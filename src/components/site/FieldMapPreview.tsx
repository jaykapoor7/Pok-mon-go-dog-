"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { dogLabel } from "@/lib/utils";
import { cityForPoints } from "@/lib/geo/cities";
import type { Dog } from "@/lib/types";

export function FieldMapPreview({ dogs, center, place, chrome = true }: { dogs: Dog[]; center?: { lat: number; lng: number } | null; place?: string; chrome?: boolean }) {
  const [selected, setSelected] = useState<Dog | null>(null);
  const located = dogs.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lng));
  const first = located[0];

  /* Frame every animal, not just the first one.
     Centring on dogs[0] put the camera at street zoom over a single record,
     so the product shot on the landing page was one marker in an empty
     field — which reads as an empty product rather than a populated one.
     A bounding box of everything located shows the actual spread, and the
     map works out its own zoom from the shape. */
  const bounds = located.length > 1
    ? ([
        [Math.min(...located.map(d => d.lng)), Math.min(...located.map(d => d.lat))],
        [Math.max(...located.map(d => d.lng)), Math.max(...located.map(d => d.lat))],
      ] as [[number, number], [number, number]])
    : null;

  return (
    <div className="field-map-preview">
      <MapCanvas
        dogs={dogs}
        bounds={center ? null : bounds}
        center={center ?? (bounds ? null : first ? { lat: first.lat, lng: first.lng } : { lat: 28.6139, lng: 77.209 })}
        onSelect={setSelected}
        selectedId={selected?.id}
      />
      {chrome && <div className="field-map-place"><MapPin size={17}/><div><b>{place || cityForPoints(located) || "Explore India"}</b><span>{dogs.length ? "Recent animal records" : "Your next report starts here"}</span></div></div>}
      {chrome && selected && <Link className="field-map-selected" href={`/dog/${selected.id}`}><div><b>{dogLabel(selected)}</b><span>{selected.zone || "View the animal record"}</span></div><ArrowUpRight size={18}/></Link>}
    </div>
  );
}
