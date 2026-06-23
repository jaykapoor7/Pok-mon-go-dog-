"use client";

import { useState } from "react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { MoodChip } from "@/components/ui/Badges";
import { DeleteSightingButton } from "@/components/sighting/DeleteSightingButton";
import { timeAgo } from "@/lib/utils";
import type { Sighting } from "@/lib/types";

export function SightingTimeline({ sightings }: { sightings: Sighting[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const visible = sightings.filter((s) => !removed.has(s.id));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-bark-400">No sightings on record yet.</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-paw-100 pl-5">
      {visible.map((s) => (
        <li key={s.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-paw-400" />
          <div className="flex gap-3">
            <DogPhoto
              src={s.photo_url}
              alt="sighting"
              seed={s.id}
              className="h-16 w-16 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">
                  <span className="font-semibold">{s.user_name}</span>{" "}
                  <span className="text-bark-400">· {timeAgo(s.created_at)}</span>
                </p>
                <DeleteSightingButton
                  sightingId={s.id}
                  variant="text"
                  onDeleted={() =>
                    setRemoved((prev) => new Set(prev).add(s.id))
                  }
                />
              </div>
              <p className="text-xs text-bark-500">{s.zone}</p>
              {s.notes && <p className="mt-1 text-sm text-bark-700">{s.notes}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {s.mood_tags.map((m) => (
                  <MoodChip key={m} mood={m} />
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
