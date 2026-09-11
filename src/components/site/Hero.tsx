import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { dogLabel, timeAgo } from "@/lib/utils";
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

export function Hero({
  dogs,
  total,
  localities,
  photographed,
}: {
  dogs: Dog[];
  total: number;
  /** Distinct zones with at least one record. */
  localities: number;
  /** Records carrying a photograph. */
  photographed: number;
}) {
  const withPhoto = dogs.filter((d) => d.cover_photo && d.cover_photo.length > 0);
  const lead = withPhoto[0];
  /* Twelve behind the promoted one: two full rows of six on a desktop and
     three of four on a phone, so the wall never ends on a ragged row. */
  const wall = withPhoto.slice(1, 13);

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

        {/* Counts of work done, not of data loaded.
            "641 districts mapped" was here and it was an overclaim: 641 is
            how many district boundaries are loaded, which is a shapefile,
            not coverage. Nobody has mapped animals in 641 districts. Same
            for the 200 Chennai ward outlines. Both were counting the atlas
            and calling it the survey.
            What is left is counted from records that actually exist: how
            many animals, and how many separate localities they sit in. */}
        <dl className="hero-counts">
          <div>
            <dt>{total > 0 ? total : "—"}</dt>
            <dd>animals on record</dd>
          </div>
          <div>
            <dt>{localities > 0 ? localities : "—"}</dt>
            <dd>{localities === 1 ? "locality covered" : "localities covered"}</dd>
          </div>
          <div>
            <dt>{photographed > 0 ? photographed : "—"}</dt>
            <dd>with a photograph on file</dd>
          </div>
        </dl>
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
