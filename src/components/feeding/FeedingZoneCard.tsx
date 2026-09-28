import Link from "next/link";
import { ArrowUpRight, MapPin, Users, Clock } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { timeAgo } from "@/lib/utils";
import type { FeedingZone } from "@/lib/types";
import "./record.css";

export function FeedingZoneCard({ zone, index }: { zone: FeedingZone; index: number }) {
  return (
    <Link
      href={`/feeding/${zone.id}`}
      className="feed-record"
    >
      <span className="feed-record-index">{String(index + 1).padStart(2, "0")}</span>
      <DogPhoto
        src={zone.photo_url ?? ""}
        alt={zone.name}
        seed={zone.id}
        className="feed-record-photo"
      />
      <div className="feed-record-copy">
        <p>{zone.name}</p>
        <div className="feed-record-place">
          {zone.zone && (
            <span>
              <MapPin className="h-3.5 w-3.5" /> {zone.zone}
            </span>
          )}
        </div>
      </div>
      <div className="feed-record-status">
        <span><Users size={14} /> {zone.volunteer_count} {zone.volunteer_count === 1 ? "volunteer" : "volunteers"}</span>
        <span><Clock size={14} /> {zone.last_fed_at ? `Fed ${timeAgo(zone.last_fed_at)}` : "No check-in recorded"}</span>
      </div>
      <ArrowUpRight className="feed-record-arrow" size={18} aria-hidden />
    </Link>
  );
}
