"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

export function FieldMapPreview({ dogs }: { dogs: Dog[] }) {
  const [selected, setSelected] = useState<Dog | null>(null);
  const first = dogs.find(dog => Number.isFinite(dog.lat) && Number.isFinite(dog.lng));
  return (
    <div className="field-map-preview">
      <MapCanvas dogs={dogs} center={first ? { lat: first.lat, lng: first.lng } : { lat: 28.6139, lng: 77.209 }} onSelect={setSelected} selectedId={selected?.id} />
      <div className="field-map-place"><MapPin size={17}/><div><b>{first?.zone || "Explore India"}</b><span>{dogs.length ? "Recent animal records" : "Your next report starts here"}</span></div></div>
      {selected && <Link className="field-map-selected" href={`/dog/${selected.id}`}><div><b>{dogLabel(selected)}</b><span>{selected.zone || "View the animal record"}</span></div><ArrowUpRight size={18}/></Link>}
    </div>
  );
}
