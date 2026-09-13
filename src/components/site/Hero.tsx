import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { LiveTally } from "./LiveTally";
import { HeroRail } from "./HeroRail";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The hero.

   It used to be a drawn wireframe of a record — "Dog near Karol Bagh /
   Still being recorded / Ready for the next visit" — floating on a dotted
   grid. Three problems with that. It showed nothing that had happened, it
   carried no number, and it left the single most persuasive asset this
   product has sitting unused: photographs of actual street dogs, taken on
   actual streets, already in the database.

   So the hero is a photograph of one — Pinky, named, with her locality
   under her. It used to carry her two care statuses as well, both
   reading "Not checked", because for most animals nobody has. That is
   true and it belongs on her own record, but as the first thing a
   visitor reads about the first animal they meet it was two blanks under
   a photograph. The count underneath is read from the database rather
   than typed in, so it cannot drift away from what is true.

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
   done by the photograph beside it, which is the right division of
   labour: one real street dog, looked at properly, argues better than a
   sentence about her can.
   ════════════════════════════════════════════════════════════════════ */

export function Hero({ dogs, total }: { dogs: Dog[]; total: number }) {
  /* ONE SUBJECT, THEN THE REST.

     A static grid of eight more dogs used to sit beside Pinky, which
     turned the hero into a contact sheet: no single animal was the
     subject, and the tiles were whatever eight rows the query returned.

     Pinky is the centre now and the rest of the register follows her as
     a rail underneath — the same photographs, offered as a sequence you
     push along rather than a block that arrives all at once. See
     HeroRail for why that shape suits a register. */


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
            src="/pinky-bengaluru.jpg"
            alt="Pinky, a community dog reported in Bengaluru, Karnataka"
            width={1090}
            height={1040}
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
      </div>

      {/* Reads the live register. Draws nothing at all below two records,
          which is the correct picture of a young database rather than a
          rail of empty space. */}
      <HeroRail dogs={dogs} />
    </section>
  );
}
