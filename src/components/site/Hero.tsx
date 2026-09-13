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

   NO BODY COPY. A paragraph stood under the headline explaining who
   would read the record afterwards — the woman who feeds her, the
   stranger who finds her limping, the vaccination round. It was true and
   it was four lines of prose in the one place on the site where nobody
   is reading yet. A hero is a photograph, a sentence and a way in; the
   explaining belongs to the sections below it, which is where it now
   lives. The short "no sign-up" line went with it for the same reason.

   THE HEADLINE went through several versions, and the pattern in what
   failed is worth keeping. "Now it is written down", "Now everyone does"
   and "Just nobody who can help her" were all variations on the same
   move: an opening observation followed by a turn. They read as a line
   of writing rather than as a product, and the turn either overclaimed
   (everyone does not know this dog) or restated the problem at the exact
   moment the reader is looking for what the thing IS.

   What stands now names the subject and then the promise: every stray
   animal in India, seen, tracked, cared for. The three verbs are the
   product's own three stages in order — a sighting, a record that
   persists, and care attached to it — so the line is a description of
   what the software does rather than a sentiment about dogs.

   A visitor knows the product in two seconds, and the emotional work is
   done by the twenty-two photographs sitting beside it, which is the
   right division of labour: a wall of real street dogs argues better
   than a sentence about them can.
   ════════════════════════════════════════════════════════════════════ */

export function Hero({ dogs, total }: { dogs: Dog[]; total: number }) {
  const withPhoto = dogs.filter((d) => d.cover_photo && d.cover_photo.length > 0);
  /* Pinky is the opening image by choice, not by the current ordering of a
     database query. The rest of the wall is still drawn from live StrayPaw
     records, but the hero starts with the dog Jay wants visitors to meet. */
  const wall = withPhoto.slice(0, 8);


  return (
    <section className="product-hero product-hero-wall" aria-labelledby="hero-title">
      <div className="product-hero-copy">
        <p className="field-eyebrow">The shared record for India&apos;s street animals</p>
        <h1 id="hero-title">
          Every stray animal in India.<br />
          {/* "cared for." is bound together. Left free, the line breaks
              after "cared" at 360px and drops a 45px "for." onto a line of
              its own under a 44px headline, which reads as a mistake. */}
          <em>Seen, tracked, cared&nbsp;for.</em>
        </h1>
        <div className="product-hero-actions">
          <Link href="/report" className="field-button">
            Report a sighting <ArrowUpRight size={19} />
          </Link>
          <Link href="/map" className="field-text-link">
            See the live map <ArrowUpRight size={17} />
          </Link>
        </div>
        <LiveTally initial={total} />
      </div>

      <div className="hero-wall" aria-label="Animals currently on the StrayPaw record">
        <figure className="hero-wall-lead">
          {/* A local launch image should not depend on the remote image
              optimizer at render time. This is deliberately a direct public
              asset: if the page can load, Pinky can load. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pinky-bengaluru.png"
            alt="Pinky, a community dog reported in Bengaluru, Karnataka"
            width={786}
            height={960}
            loading="eager"
            fetchPriority="high"
          />
          <figcaption>
            <span className="hero-wall-kicker">
              <MapPin size={13} /> Bengaluru, Karnataka
            </span>
            <b>Pinky</b>
          </figcaption>
        </figure>

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
