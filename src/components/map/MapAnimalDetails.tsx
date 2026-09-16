"use client";

import Link from "next/link";
import { Maximize2, X } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { dogLabel, timeAgo } from "@/lib/utils";
import { formatPlace } from "@/lib/delhi";
import { markerMetaFor } from "@/lib/marker-state";
import type { Dog } from "@/lib/types";

function careLabel(value: string | undefined, yes: string, no: string) {
  if (value === yes) return "Recorded";
  if (value === no) return "No";
  return "Unknown";
}

export function MapAnimalDetails({ dog, distance, onClose }: { dog: Dog; distance: string | null; onClose: () => void }) {
  return (
    <div className="sp-map-mini-profile">
      <div className="sp-map-mini-photo">
        <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="h-full w-full" />
      </div>

      <div className="sp-map-mini-copy">
        <div className="sp-map-mini-topline">
          <span className={dog.needs_help ? "needs-help" : ""}>{markerMetaFor(dog).label}</span>
          {dog.code && <span>{dog.code}</span>}
        </div>
        <h2>{dogLabel(dog)}</h2>
        <p>{formatPlace(dog.zone, dog.city)}{distance ? ` · ${distance} away` : ""}</p>
        <p className="sp-map-mini-seen">Last seen {timeAgo(dog.last_seen)}</p>

        <div className="sp-map-mini-care" aria-label="Care status">
          <span><b>Sterilised</b>{careLabel(dog.sterilisation_status, "sterilised", "not_sterilised")}</span>
          <span><b>Vaccinated</b>{careLabel(dog.vaccination_status, "vaccinated", "not_vaccinated")}</span>
        </div>

        <Link className="sp-map-mini-expand" href={`/dog/${dog.id}`}>
          <Maximize2 size={15} /> Expand profile
        </Link>
      </div>

      <button className="sp-map-mini-close" type="button" onClick={onClose} aria-label="Close animal preview">
        <X size={17} />
      </button>
    </div>
  );
}
