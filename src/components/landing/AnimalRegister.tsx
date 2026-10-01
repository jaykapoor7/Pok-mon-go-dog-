"use client";

/* Not a grid pretending to be a database: actual field records become a
   moving contact sheet. We only duplicate the bounded server sample for a
   seamless CSS loop; no browser-side fetches or randomisation. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Crosshair, MapPin } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (dog: RegisterFocus) => [cleanPlace(dog.zone), dog.city].filter(Boolean).join(" · ") || "India";

function markersFor(dog: RegisterFocus) {
  const markers: { label: string; tone: "blue" | "green" | "warm" }[] = [];
  if (dog.sterilisation?.toLowerCase().includes("steril")) markers.push({ label: "Sterilised", tone: "blue" });
  if (dog.vaccination?.toLowerCase().includes("vaccin")) markers.push({ label: "Vaccinated", tone: "green" });
  if (!markers.length) markers.push({ label: dog.sightings > 1 ? `${dog.sightings} sightings` : "On record", tone: "warm" });
  return markers.slice(0, 2);
}

function DogTile({ dog, duplicate }: { dog: RegisterFocus; duplicate: number }) {
  const markers = markersFor(dog);
  const record = dog.straypaw_id || "StrayPaw record";
  return (
    <li className="rx-tile" aria-hidden={duplicate > 0 || undefined}>
      <Link href={`/dog/${dog.id}`} className="rx-card" tabIndex={duplicate > 0 ? -1 : undefined} aria-label={`${record}, ${placeOf(dog)}`}>
        <div className="rx-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sized(dog.cover_photo, 640)} alt="" loading="lazy" />
          <span className="rx-corner rx-corner-top">Field record</span>
          <span className="rx-corner rx-corner-bottom"><MapPin size={11} aria-hidden /> {placeOf(dog)}</span>
        </div>
        <div className="rx-meta">
          <span className="rx-id sys-mono">{record}</span>
          <span className="rx-markers">{markers.map((marker) => <i key={marker.label} className={`is-${marker.tone}`}>{marker.label}</i>)}</span>
        </div>
      </Link>
    </li>
  );
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const dogs = data.cards.slice(0, 18);
  if (!dogs.length || total <= 0) return null;
  const rows = [0, 1, 2].map((offset) => dogs.filter((_, index) => index % 3 === offset));

  return (
    <section className={`rx ${calm ? "is-calm" : ""}`} aria-labelledby="rx-title">
      <div className="rx-grid" aria-hidden />
      <div className="rx-orbit rx-orbit-one" aria-hidden />
      <div className="rx-orbit rx-orbit-two" aria-hidden />
      <div className="rx-index" aria-hidden><span>RECORD / 01</span><span>PUBLIC FIELD ARCHIVE</span></div>

      <header className="rx-intro">
        <div className="rx-copy">
          <p className="rx-kicker sys-mono"><Crosshair size={13} aria-hidden /> The living register</p>
          <h2 id="rx-title">A city is not a number.<br /><em>It is every dog inside it.</em></h2>
          <p>Each photo becomes a shared record: a place, a history, and a starting point for care.</p>
        </div>
        <div className="rx-total" aria-label={`${fmt(total)} dogs on the StrayPaw register`}>
          <strong>{fmt(total)}</strong><span>dogs<br />on record</span>
          <Link href="/map" aria-label="Open the live map"><ArrowUpRight size={17} /></Link>
        </div>
      </header>

      <div className="rx-wall" aria-label={`${fmt(total)} dog profiles from the StrayPaw register`}>
        {rows.map((row, rowIndex) => <div className={`rx-track rx-track-${rowIndex + 1}`} key={rowIndex}>
          <ol className="rx-run" role="list">
            {[0, 1].flatMap((duplicate) => row.map((dog) => <DogTile key={`${dog.id}-${duplicate}`} dog={dog} duplicate={duplicate} />))}
          </ol>
        </div>)}
      </div>

      <div className="rx-caption"><span className="sys-mono">LIVE PROFILES · UPDATED FROM THE FIELD</span><span>Hover a record to hold it. <i>Open any profile to follow its story.</i></span></div>
    </section>
  );
}
