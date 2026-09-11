"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, HelpCircle, MapPin } from "lucide-react";
import { dogLabel, timeAgo } from "@/lib/utils";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   What happens to one record, told with the record.

   What stood here was a drawing: a card labelled STREET ANIMAL, reading
   "Known by place, not a guess" and "Pin confirmed", floating on a dotted
   grid. It was handed the real animals and ignored them — the prop was
   literally named `_dogs`. So the page opened on photographs of actual
   dogs on actual streets and then, one scroll later, fell back to a
   mockup of a product. That gap is the whole complaint, and it is the
   same mistake the hero was rebuilt to fix, sitting directly underneath
   the hero.

   So this follows one animal that is really on the record, through the
   three depths the product actually has. Every field is read from her
   row. Where nothing is known the panel says so rather than tidying it
   away, because the unknowns are what the next person is for — and a
   product that showed only filled-in rows would be describing a database
   nobody has yet.
   ════════════════════════════════════════════════════════════════════ */

type Stage = {
  eyebrow: string;
  title: string;
  body: string;
  /** Rows for this depth, built from the animal's own record. */
  rows: (dog: Dog) => { label: string; value: string; known: boolean }[];
};

const STAGES: Stage[] = [
  {
    eyebrow: "Somebody stopped and took a photo",
    title: "A sighting becomes\na record.",
    body: "No account, no form to learn. A photograph and a place, from a phone, on the street where it happened — and from that moment there is something for the next person to add to.",
    rows: (dog) => [
      { label: "Photograph", value: "Filed", known: true },
      { label: "Where", value: dog.zone || "On record", known: Boolean(dog.zone) },
      { label: "When", value: dog.last_seen ? timeAgo(dog.last_seen) : "On record", known: Boolean(dog.last_seen) },
    ],
  },
  {
    eyebrow: "The next person does not start again",
    title: "The record is what\nthey come back to.",
    body: "A feeder who knows this dog, a neighbour who sees her on the same corner, a vet who treated her once. They add to one record rather than each keeping their own, so the history survives any one of them moving away.",
    rows: (dog) => [
      { label: "Sterilised", value: careWord(dog.sterilisation_status, "sterilised"), known: dog.sterilisation_status !== "unknown" && Boolean(dog.sterilisation_status) },
      { label: "Vaccinated", value: careWord(dog.vaccination_status, "vaccinated"), known: dog.vaccination_status !== "unknown" && Boolean(dog.vaccination_status) },
      { label: "Seen by", value: "Anyone who passes", known: true },
    ],
  },
  {
    eyebrow: "An organisation can act on it",
    title: "The gaps become\nthe work.",
    body: "A field team sees which animals on their streets have never been checked, and that is the list worth having. Work done goes back onto the same record, against this animal — not into a yearly total nobody can trace.",
    rows: (dog) => [
      { label: "Open a case", value: "One tap, on this animal", known: true },
      { label: "Care recorded", value: unknownCount(dog) === 0 ? "Against this record" : `${unknownCount(dog)} to check`, known: unknownCount(dog) === 0 },
      { label: "Who did it", value: "Named, and dated", known: true },
    ],
  },
];

function careWord(status: string | null | undefined, yes: string): string {
  if (!status || status === "unknown") return "Nobody has checked";
  return status === yes ? "Yes" : "No";
}

/** How many of the two care facts nobody has established yet. */
function unknownCount(dog: Dog): number {
  return [dog.sterilisation_status, dog.vaccination_status].filter(
    (s) => !s || s === "unknown"
  ).length;
}

export function RecordJourney({ dogs }: { dogs: Dog[] }) {
  const section = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);

  const withPhoto = dogs.filter((d) => d.cover_photo && d.cover_photo.length > 0);
  /* Not the animal the hero leads with. Showing her twice would read as
     the only photograph there is. */
  const subject = withPhoto[1] ?? withPhoto[0];
  const others = withPhoto.filter((d) => d.id !== subject?.id).slice(0, 5);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const span = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(0.999, -rect.top / span));
      setStage(Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length)));
    };
    /* Coalesced to a frame. The old one ran setState straight off the
       scroll event, which is a React render per scroll tick. */
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* Nothing on the record yet, so there is nothing truthful to show. The
     section removes itself rather than standing in with a drawing. */
  if (!subject) return null;

  const active = STAGES[stage];
  const rows = active.rows(subject);

  return (
    <section
      ref={section}
      className="rj"
      data-stage={stage}
      aria-label="What happens to one record on StrayPaw"
    >
      <div className="rj-sticky">
        <header className="rj-copy">
          <span className="field-eyebrow">{active.eyebrow}</span>
          <h2>
            {active.title.split("\n").map((line, i) => (
              <span key={line}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
          </h2>
          <p>{active.body}</p>

          <ol className="rj-rail" aria-label={`Step ${stage + 1} of ${STAGES.length}`}>
            {STAGES.map((s, i) => (
              <li key={s.eyebrow}>
                <button
                  type="button"
                  className={i === stage ? "on" : ""}
                  aria-current={i === stage ? "step" : undefined}
                  onClick={() => setStage(i)}
                >
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>{s.eyebrow}</span>
                </button>
              </li>
            ))}
          </ol>
        </header>

        <div className="rj-stage">
          <figure className="rj-photo">
            <Image
              src={subject.cover_photo}
              alt={`${dogLabel(subject)}, photographed on the street`}
              width={720}
              height={900}
              sizes="(max-width: 900px) 92vw, 42vw"
            />
            <figcaption>
              <span className="rj-place">
                <MapPin size={13} /> {subject.zone || "On record"}
              </span>
              <b>{dogLabel(subject)}</b>
            </figcaption>
          </figure>

          {/* The record and the other animals share one column beside the
              photograph. As separate grid items the strip fell to a second
              row and left a hole the height of the photo between them. */}
          <div className="rj-side">
          <aside className="rj-panel" aria-live="polite">
            <span className="rj-panel-head">On the record</span>
            <dl>
              {rows.map((row) => (
                <div key={row.label} className={row.known ? "" : "q"}>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.known ? <Check size={13} aria-hidden /> : <HelpCircle size={13} aria-hidden />}
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>

          {others.length > 0 && (
            <ul className="rj-strip" aria-label="Other animals on the record">
              {others.map((dog) => (
                <li key={dog.id}>
                  <Image
                    src={dog.cover_photo}
                    alt={`${dogLabel(dog)}, photographed on the street`}
                    width={160}
                    height={160}
                    sizes="9vw"
                  />
                </li>
              ))}
              <li className="rj-strip-more">
                <span>and the rest of them</span>
              </li>
            </ul>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
