"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { Constellation } from "@/components/site/vectors";
import type { Dog } from "@/lib/types";

export function FollowingClient({ dogs }: { dogs: Dog[] }) {
  const { ids } = useFollows();

  // Follows are kept on-device, so the list is resolved client-side against
  // the animals passed in from the server.
  const followed = dogs.filter((d) => ids.includes(String(d.id)));

  if (ids.length === 0) {
    return (
      <div className="spa-empty">
        <Constellation size={132} />
        <h2>Nothing followed yet</h2>
        <p>
          Follow an animal and it lands here, so you can check on it without
          hunting through the map. Follows are stored on this device — no account
          needed.
        </p>
        <Link href="/map" className="spa-cta">
          Open the living map <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  if (followed.length === 0) {
    return (
      <div className="spa-empty">
        <Constellation size={132} />
        <h2>Followed records aren&apos;t loading</h2>
        <p>
          You follow {ids.length} record{ids.length > 1 ? "s" : ""} on this device,
          but none of them came back from the server. They may have been removed.
        </p>
        <Link href="/map" className="spa-cta">
          Back to the map <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="follow-grid">
      {followed.map((dog) => {
        const place = dog.zone || dog.city || "Location unknown";
        return (
          <Link href={`/dog/${dog.id}`} key={dog.id} className="follow-card">
            <div className="follow-photo">
              {dog.cover_photo ? (
                <Image
                  src={dog.cover_photo}
                  alt={dog.name ? `${dog.name}, in ${place}` : `A street dog in ${place}`}
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              ) : (
                <span className="spa-mono dim">No photo</span>
              )}
            </div>
            <div className="follow-body">
              {dog.name && <b>{dog.name}</b>}
              <span className="spa-mono dim">
                <MapPin size={11} /> {place}
              </span>
              <div className="follow-tags">
                {dog.sterilised && <span className="chip-mini">Sterilised</span>}
                {dog.vaccinated && <span className="chip-mini">Vaccinated</span>}
                {dog.needs_help && <span className="chip-mini urgent">Needs help</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
