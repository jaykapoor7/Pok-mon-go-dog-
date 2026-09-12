import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { dogLabel } from "@/lib/utils";
import { LiveTally } from "./LiveTally";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The hero.

   It used to be a drawn wireframe of a record — "Dog near Karol Bagh /
   Still being recorded / Ready for the next visit" — floating on a dotted
   grid. Three problems with that. It showed nothing that had happened, it
   carried no number, and it left the single most persuasive asset this
   product has sitting unused: photographs of actual street dogs, taken on
   actual streets, already in the database.

   So the hero is the wall of them. Every tile is a real record. The one
   that is promoted carries where, when, and who filed it. It used to
   carry the two care statuses as well, both reading "Not checked",
   because for most animals nobody has. That is true and it belongs on
   the animal's own record, but as the first thing a visitor reads about
   the first animal they see it was two blanks under a photograph. The
   count underneath is read from the database rather than typed in, so it
   cannot drift away from what is true.
   ════════════════════════════════════════════════════════════════════ */

export function Hero({ dogs, total }: { dogs: Dog[]; total: number }) {
  const withPhoto = dogs.filter((d) => d.cover_photo && d.cover_photo.length > 0);
  /* Pinky leads when she is on the record. She is the animal this project
     is actually about, and a hero that opens on whichever row the database
     happened to return first is a hero nobody chose. */
  const pinky = withPhoto.find((d) => (d.name ?? "").trim().toLowerCase() === "pinky");
  const lead = pinky ?? withPhoto[0];
  const rest = withPhoto.filter((d) => d.id !== lead?.id);
  /* The lead occupies four cells of a four-column grid, so eight tiles
     complete three full rows with nothing left hanging. */
  const wall = rest.slice(0, 8);


  return (
    <section className="product-hero product-hero-wall" aria-labelledby="hero-title">
      <div className="product-hero-copy">
        <p className="field-eyebrow">The field record for India&apos;s street animals</p>
        <h1 id="hero-title">
          Somebody already knows this dog.<br />
          <em>Now it is written down.</em>
        </h1>
        <p>
          A photo and a place become a record that a neighbour, a feeder and a
          field team can all return to, instead of starting again every time.
        </p>

        <div className="product-hero-actions">
          <Link href="/report" className="field-button">
            Report a sighting <ArrowUpRight size={19} />
          </Link>
          <Link href="/map" className="field-text-link">
            See the live map <ArrowUpRight size={17} />
          </Link>
        </div>
        <p className="product-hero-note">
          A photo and a location are enough. No account required.
        </p>

        <LiveTally initial={total} />
      </div>

      <div className="hero-wall" aria-label="Animals currently on the StrayPaw record">
        {lead && (
          <figure className="hero-wall-lead">
            <Image
              src={lead.cover_photo}
              alt={`${dogLabel(lead)}, photographed on the street`}
              width={640}
              height={640}
              priority
              sizes="(max-width: 900px) 92vw, 38vw"
            />
            <figcaption>
              <span className="hero-wall-kicker">
                <MapPin size={13} /> {lead.zone || "On record"}
              </span>
              <b>{dogLabel(lead)}</b>
            </figcaption>
          </figure>
        )}

        <ul className="hero-wall-grid">
          {wall.map((dog) => (
            <li key={dog.id}>
              <Image
                src={dog.cover_photo}
                alt={`${dogLabel(dog)}, photographed on the street`}
                width={220}
                height={220}
                sizes="12vw"
              />
              <span>{dog.zone || "On record"}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
