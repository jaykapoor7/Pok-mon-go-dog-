import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { RESEARCH } from "@/lib/platform/research";
import { EDUCATION_PARTNERS } from "@/lib/platform/education";

export const dynamic = "force-static";
export const metadata = {
  title: "Education - StrayPaw",
  description:
    "Understand street-animal welfare, then act on it where you live. Sourced reading, a live local record, and teaching material from partner organisations.",
};

/* ════════════════════════════════════════════════════════════════════
   The education layer.

   Reporting, mapping and NGO case work all deal with an animal after
   something has happened to it. This is the side that runs before that,
   and it is the half StrayPaw is worst at: we hold records, we do not
   teach. So the area is built to carry other organisations' material
   rather than to publish our own, and the partner list is data.

   The spine is the route, not the library: understand the problem, look at
   your own ward, then do something there. A page of downloadable PDFs
   would be a worse version of every organisation's existing resources
   page, and would not connect to the rest of the product at all.
   ════════════════════════════════════════════════════════════════════ */

/** The route. Each step lands on a surface that already exists. */
const PATH = [
  {
    n: "01",
    title: "Understand what is actually going on",
    body: "Coexistence, Animal Birth Control, rabies, and what the law requires of a municipality. Written against named public documents, so it can be cited in a classroom rather than asserted.",
    href: "/learn",
    cta: "Read the material",
    meta: `${RESEARCH.length} sourced references`,
  },
  {
    n: "02",
    title: "Look at your own ward",
    body: "The animals recorded on your streets, with photographs and care status, and where nobody has checked, a record that says unknown rather than counting it as a no. The gaps are usually the more useful half.",
    href: "/map",
    cta: "Open the map",
    meta: "Every animal on the record, with its ward",
  },
  {
    n: "03",
    title: "Do something on that street",
    body: "Report an animal, follow what happens to it, join a feeding zone, or hand a local organisation a record it can act on. Reporting needs no account and works from a phone.",
    href: "/report",
    cta: "Report a sighting",
    meta: "No account required",
  },
];

export default function EducationPage() {
  return (
    <SitePage
      kicker="Education layer / before it becomes a case"
      title={<>Understand it, then <em>act where you live.</em></>}
      lede="Most of StrayPaw deals with an animal after something has happened to it. This is the part that runs before that. It is also the part we are least qualified to write, so it is built to carry teaching material from organisations that already do it well."
      divider={false}
      actions={
        <Link href="/learn" className="spa-cta">
          Start reading <ArrowUpRight size={14} />
        </Link>
      }
    >

      {/* ── The route. Ordered, because the order is the argument: reading
             without a local picture stays abstract, and acting without either
             is guesswork. ─────────────────────────────────────────────── */}
      <section className="edu-path" aria-label="How to use this">
        {PATH.map((s) => (
          <article key={s.n} className="edu-step">
            <b className="spa-mono">{s.n}</b>
            <div>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              <div className="edu-step-foot">
                <Link href={s.href} className="edu-link">
                  {s.cta} <ArrowUpRight size={13} />
                </Link>
                <span className="spa-mono">{s.meta}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ── Partners. A registry, because the plan is more than one. ─── */}
      <section className="edu-partners" aria-labelledby="edu-partners-title">
        <div className="edu-partners-head">
          <div>
            <span className="spa-mono">Teaching material</span>
            <h2 id="edu-partners-title">
              Written by people who teach, not by us.
            </h2>
            <p>
              StrayPaw holds the records and builds the software. Curriculum is
              a different craft, and the organisations below have been doing it
              for years. Their material sits here under their own name, and
              comes down if they ask.
            </p>
          </div>
          <Link
            href="/contact?subject=Education%20partnership"
            className="spa-cta"
          >
            Partner with us <ArrowUpRight size={14} />
          </Link>
        </div>

        <ul className="edu-partner-list">
          {EDUCATION_PARTNERS.map((p) => (
            <li key={p.id} className="edu-partner">
              <div className="edu-partner-top">
                <div>
                  <h3>{p.name}</h3>
                  <span className="spa-mono">
                    {p.fullName} · {p.city}
                  </span>
                </div>
              </div>
              <p>{p.summary}</p>
              <ul className="edu-programmes">
                {p.programmes.map((prog) => (
                  <li key={prog}>{prog}</li>
                ))}
              </ul>
              <div className="edu-partner-foot">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="edu-link"
                >
                  Their work at {p.source} <ExternalLink size={13} />
                </a>
              </div>
            </li>
          ))}
        </ul>

      </section>
    </SitePage>
  );
}
