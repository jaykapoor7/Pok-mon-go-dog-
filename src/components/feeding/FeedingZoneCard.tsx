import Link from "next/link";
import { MapPin, Users, Clock } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { timeAgo } from "@/lib/utils";
import type { FeedingZone } from "@/lib/types";

export function FeedingZoneCard({ zone }: { zone: FeedingZone }) {
  return (
    <Link
      href={`/feeding/${zone.id}`}
      className="card card-interactive flex items-center gap-3 p-3"
    >
      <DogPhoto
        src={zone.photo_url ?? ""}
        alt={zone.name}
        seed={zone.id}
        className="h-16 w-16 shrink-0 rounded-2xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{zone.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-bark-500">
          {zone.zone && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {zone.zone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {zone.volunteer_count} {zone.volunteer_count === 1 ? "volunteer" : "volunteers"}
          </span>
        </div>
        {zone.last_fed_at && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-status-sterilised">
            <Clock className="h-3.5 w-3.5" /> Fed {timeAgo(zone.last_fed_at)}
          </p>
        )}
      </div>
    </Link>
  );
}
