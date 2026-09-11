import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { dogLabel, timeAgo } from "@/lib/utils";
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
   that is promoted shows its own fields — where, when, and the two care
   statuses, which read "not checked" because nobody has checked them. The
   counts underneath are read from the database rather than typed in, so
   they cannot drift away from what is true.
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

  const careWord = (status: string | null | undefined, yes: string) =>
    status === "unknown" || !status ? "Not checked" : status === yes ? yes : "No";

  return (
    <section className="product-hero product-hero-wall" aria-labelledby="hero-title">
      <div className="product-hero-copy">
        <p className="field-eyebrow">The field record for India&apos;s street animals</p>
        <h1 id="hero-title">
          Every one of them is<br />
          <em>somebody&apos;s neighbour.</em>
        </h1>
        <p>
          A photo and a place become a record that a neighbour, a feeder and a
          field team can all return to — instead of starting again every time.
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
                {lead.last_seen ? ` · ${timeAgo(lead.last_seen)}` : ""}
              </span>
              <b>{dogLabel(lead)}</b>
              {/* The tally underneath says every animal here was reported
                  by somebody. This is that somebody, for the one animal
                  the page leads with. */}
              {lead.reporter && (
                <span className="hero-wall-by">Reported by {lead.reporter}</span>
              )}
              <dl>
                <div>
                  <dt>Sterilised</dt>
                  <dd className={lead.sterilisation_status === "unknown" ? "q" : ""}>
                    {careWord(lead.sterilisation_status, "sterilised") === "sterilised"
                      ? "Yes"
                      : careWord(lead.sterilisation_status, "sterilised")}
                  </dd>
                </div>
                <div>
                  <dt>Vaccinated</dt>
                  <dd className={lead.vaccination_status === "unknown" ? "q" : ""}>
                    {careWord(lead.vaccination_status, "vaccinated") === "vaccinated"
                      ? "Yes"
                      : careWord(lead.vaccination_status, "vaccinated")}
                  </dd>
                </div>
              </dl>
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
