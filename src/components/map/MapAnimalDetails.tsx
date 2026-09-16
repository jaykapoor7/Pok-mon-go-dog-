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
    <div className="relative grid grid-cols-[88px_1fr] gap-4 p-3.5 sm:grid-cols-[104px_1fr] sm:p-4">
      <div className="h-[112px] overflow-hidden rounded-xl bg-bark-100 sm:h-[132px]">
        <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="h-full w-full" />
      </div>

      <div className="min-w-0 pr-7">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[.1em] text-bark-400">
          <span className={dog.needs_help ? "text-status-injured" : "text-paw-600"}>{markerMetaFor(dog).label}</span>
          {dog.code && <><span>·</span><span>{dog.code}</span></>}
        </div>
        <h2 className="truncate text-lg font-semibold tracking-[-.035em] text-bark-950">{dogLabel(dog)}</h2>
        <p className="mt-0.5 truncate text-xs text-bark-500">{formatPlace(dog.zone, dog.city)}{distance ? ` · ${distance} away` : ""}</p>
        <p className="mt-1 text-[11px] text-bark-400">Last seen {timeAgo(dog.last_seen)}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-y border-black/[.07] py-2 text-[11px]">
          <span className="flex gap-1.5"><b className="font-medium text-bark-500">Sterilised</b><span className="font-semibold text-bark-800">{careLabel(dog.sterilisation_status, "sterilised", "not_sterilised")}</span></span>
          <span className="flex gap-1.5"><b className="font-medium text-bark-500">Vaccinated</b><span className="font-semibold text-bark-800">{careLabel(dog.vaccination_status, "vaccinated", "not_vaccinated")}</span></span>
        </div>

        <Link className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md bg-[#0b1e3d] px-3 text-xs font-semibold text-white transition hover:bg-[#17345d]" href={`/dog/${dog.id}`}>
          <Maximize2 size={14} /> Expand profile
        </Link>
      </div>

      <button className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-black/[.08] bg-white/80 text-bark-500 backdrop-blur hover:text-bark-900" type="button" onClick={onClose} aria-label="Close animal preview">
        <X size={16} />
      </button>
    </div>
  );
}
