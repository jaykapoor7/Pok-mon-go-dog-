"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, PawPrint } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { Constellation } from "@/components/site/vectors";
import type { Dog } from "@/lib/types";
import { formatPlace } from "@/lib/delhi";
import { dogLabel } from "@/lib/utils";

export function FollowingClient({ dogs }: { dogs: Dog[] }) {
  const { ids } = useFollows();

  // Follows are kept on-device, so the list is resolved client-side against
  // the animals passed in from the server.
  const followed = dogs.filter((d) => ids.includes(String(d.id)));

  if (ids.length === 0) {
    /* An empty page teaches nothing. Animals that need attention, or have
       been seen most, give the viewer something real to follow straight
       away — drawn from the same records, never invented. */
    const suggestions = [...dogs]
      .sort((a, b) => {
        if (a.needs_help !== b.needs_help) return a.needs_help ? -1 : 1;
        return (b.sightings_count ?? 0) - (a.sightings_count ?? 0);
      })
      .slice(0, 6);

    return (
      <>
        <div className="spa-empty">
          <Constellation size={132} />
          <h2>Nothing followed yet</h2>
          <p>
            Follow an animal and it lands here, so you can check on it without
            hunting through the map. Follows are stored on this device — no
            account needed.
          </p>
          <Link href="/map" className="spa-cta">
            Open the living map <ArrowUpRight size={14} />
          </Link>
        </div>

        {suggestions.length > 0 && (
          <section className="fl-suggest">
            <div className="spa-panel-head">
              <b>Animals you could follow</b>
              <Link href="/map">
                See all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="fl-grid">
              {suggestions.map((d) => (
                <Link key={d.id} href={`/dog/${d.id}`} className="fl-card">
                  {/* The photo is what makes these read as animals rather
                      than rows — it is the reason to follow one. */}
                  <span className="fl-photo">
                    {d.cover_photo ? (
                      <Image
                        src={d.cover_photo}
                        alt=""
                        width={220}
                        height={140}
                        className="fl-img"
                        unoptimized
                      />
                    ) : (
                      <span className="fl-noimg" aria-hidden="true">
                        <PawPrint size={20} strokeWidth={1.4} />
                      </span>
                    )}
                    {d.needs_help && <i className="fl-badge">Needs help</i>}
                  </span>
                  <b>{dogLabel(d)}</b>
                  <span className="fl-place">{formatPlace(d.zone, d.city)}</span>
                  <span className="fl-meta">
                    {(d.sightings_count ?? 0) > 0 && (
                      <i>
                        {d.sightings_count} sighting
                        {d.sightings_count === 1 ? "" : "s"}
                      </i>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </>
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
        const place = formatPlace(dog.zone, dog.city);
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
