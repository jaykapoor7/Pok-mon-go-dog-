import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DATASET_BY_METRIC } from "@/lib/platform/datasets";

/* ════════════════════════════════════════════════════════════════════
   What gets counted.

   What stood here was a second wall of dog photographs behind a
   sticky-scroll animation — the hero's idea again, at lower quality,
   over two thousand pixels of mostly empty navy. The hero already owns
   the photographs. Repeating them made the page feel like it had one
   thing to say.

   This says the other thing, and it is the argument the product is
   actually built on: what gets recorded is not what happens. India
   officially reported 54 suspected human rabies deaths in 2024. The
   peer-reviewed estimate for the same period is around nineteen
   thousand. Both numbers are real, both are cited below, and the
   distance between them is a surveillance gap rather than a disagreement
   about rabies.

   Every figure is read from the dataset rather than typed in, so the page
   cannot drift away from what the sources say. No photographs, no scroll
   animation, and about a fifth of the height.
   ════════════════════════════════════════════════════════════════════ */

const inCrore = (n: number) => `${(n / 10_000_000).toFixed(1)} crore`;

export function CountingGap({ onRecord }: { onRecord: number }) {
  const rabies = DATASET_BY_METRIC.get("human_rabies_deaths");
  const dogs = DATASET_BY_METRIC.get("dog_population");

  /* Lowest is what passive surveillance caught; highest is what the
     modelling says was really there. Picked by value rather than by
     position so adding a figure cannot silently reorder the argument. */
  const points = [...(rabies?.national ?? [])].sort((a, b) => a.value - b.value);
  const reported = points[0];
  const estimated = points[points.length - 1];
  const population = dogs?.national?.[0];

  if (!reported || !estimated) return null;

  const factor = Math.round(estimated.value / Math.max(reported.value, 1));

  return (
    <section className="cg" aria-labelledby="cg-title">
      <div className="cg-inner">
        <header className="cg-head">
          <span className="field-eyebrow">The counting problem</span>
          <h2 id="cg-title">
            What gets counted<br />
            <em>is not what happens.</em>
          </h2>
          <p>
            India has never enumerated its street animals, and the health
            record of living alongside them is thinner still. These two figures
            were published a year apart and describe the same country. One is
            what the surveillance system caught. The other is what researchers
            went out and measured.
          </p>
        </header>

        {/* The two figures, at the scale of the difference between them. */}
        <div className="cg-figures">
          <figure className="cg-fig">
            <b>{reported.value.toLocaleString("en-IN")}</b>
            <figcaption>
              <span>Officially reported, {reported.year}</span>
              <small>{reported.source}</small>
            </figcaption>
          </figure>

          <div className="cg-versus" aria-hidden>
            <span>{factor}×</span>
            <i />
          </div>

          <figure className="cg-fig is-real">
            <b>{estimated.value.toLocaleString("en-IN")}</b>
            <figcaption>
              <span>Actually estimated, {estimated.year}</span>
              <small>{estimated.source}</small>
            </figcaption>
          </figure>
        </div>

        <div className="cg-foot">
          <p className="cg-note">
            {estimated.note}
          </p>

          <div className="cg-close">
            <p>
              {population && (
                <>
                  Around <b>{inCrore(population.value)}</b> free-roaming dogs, on
                  the widest published estimate.{" "}
                </>
              )}
              {onRecord > 0 ? (
                <>
                  Against that, <b>{onRecord.toLocaleString("en-IN")}</b> animals
                  are on this record — each one with a photograph, a place, and
                  the name of whoever put it there.
                </>
              ) : (
                /* A database that is empty or unreachable should not be
                   narrated as a count of zero. */
                <>Every animal on this record has a photograph, a place, and the
                name of whoever put it there.</>
              )}{" "}
              That is the whole method. It only gets bigger the way it started.
            </p>
            <Link href="/evidence" className="cg-link">
              See what is known, state by state <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
