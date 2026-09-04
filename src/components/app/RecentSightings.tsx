import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, Radio } from "lucide-react";
import { formatPlace } from "@/lib/delhi";
import { timeAgo } from "@/lib/utils";
import type { Sighting } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   Recent sightings.

   These were single-line links — a note and a timestamp — which threw away
   almost everything a report carries. Each sighting already has a photo, a
   place, mood tags and a reporter, and the photo is the part that makes an
   animal feel like an animal rather than a row.
   ════════════════════════════════════════════════════════════════════ */

export function RecentSightings({ sightings }: { sightings: Sighting[] }) {
  if (sightings.length === 0) {
    return (
      <div className="panel-empty">
        <Radio size={26} strokeWidth={1.25} />
        <p>
          <b>Nothing yet.</b> The first sighting on this network will appear
          here. Add one now.
        </p>
        <Link href="/report" className="tlink">
          Report an animal <ArrowUpRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="rs">
      {sightings.map((s) => {
        const href = s.dog_id ? `/dog/${s.dog_id}` : "/map";
        const title = s.nickname?.trim() || "Street dog";
        return (
          <Link key={s.id} href={href} className="rs-card">
            <div className="rs-photo">
              {s.photo_url ? (
                <Image
                  src={s.photo_url}
                  alt=""
                  width={92}
                  height={92}
                  className="rs-img"
                  unoptimized
                />
              ) : (
                <span className="rs-noimg" aria-hidden="true">
                  <Radio size={16} strokeWidth={1.4} />
                </span>
              )}
            </div>

            <div className="rs-body">
              <b className="rs-title">{title}</b>
              <span className="rs-place">
                <MapPin size={11} strokeWidth={1.6} />
                {formatPlace(s.zone)}
              </span>
              {s.notes?.trim() && <p className="rs-note">{s.notes.trim()}</p>}
              {s.mood_tags?.length > 0 && (
                <span className="rs-tags">
                  {s.mood_tags.slice(0, 3).map((t) => (
                    <i key={t}>{t}</i>
                  ))}
                </span>
              )}
            </div>

            <span className="rs-time">{timeAgo(s.created_at)}</span>
          </Link>
        );
      })}
    </div>
  );
}
