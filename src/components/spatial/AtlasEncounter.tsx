"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { nameOf } from "./Portraits";

type Encounter = { id: string; name: string | null; cover_photo: string; zone: string | null; straypaw_id: string | null };

/** One real photographed record from a bounded, explicitly named city sample.
 * Missing photographs or unavailable data simply omit this editorial entry. */
export function AtlasEncounter({ city }: { city: string }) {
  const [animal, setAnimal] = useState<Encounter | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      const response = await fetch(`/api/spatial?kind=cells&city=${encodeURIComponent(city)}`, { signal: controller.signal });
      if (!response.ok) return;
      const { cells } = await response.json();
      const keys = (cells ?? []).slice(0, 3).map((cell: { h3_r8: string }) => cell.h3_r8);
      if (!keys.length) return;
      const records = await fetch(`/api/spatial/patch?cells=${keys.join(",")}`, { signal: controller.signal });
      if (!records.ok) return;
      const data = await records.json();
      setAnimal((data.animals ?? []).find((a: Encounter) => Boolean(a.cover_photo)) ?? null);
    }
    read().catch(() => {});
    return () => controller.abort();
  }, [city]);
  if (!animal) return null;
  return <Link className="atlas-encounter" href={`/dog/${animal.id}`}>
    <img src={animal.cover_photo} alt={nameOf(animal) ?? "An animal photographed in the register"} onError={() => setAnimal(null)} />
    <div><span>One life in the record / {city}</span><strong>{nameOf(animal) ?? animal.straypaw_id ?? "An individual record"}</strong><p>{animal.zone || city}</p><b>Read the history <ArrowUpRight size={14} /></b></div>
  </Link>;
}
