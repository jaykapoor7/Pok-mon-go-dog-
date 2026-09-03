import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CoverageGap } from "@/components/site/vectors";
import {
  BARRIER_META,
  DELHI_ABC_COVERAGE,
  DELHI_POPULATION,
  UNKNOWNS,
  barrierCounts,
  num,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Data gaps, StrayPaw",
  description:
    "What is unanswered about India's street animals, why — and how much of it is not missing at all, but held somewhere and never released.",
};

export default function GapsPage() {
  const counts = barrierCounts();

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / gaps</span>
          <h1>
            Missing, or just <em>unreachable?</em>
          </h1>
        </div>
        <Link href="/what-would-it-take" className="spa-cta">
          Cost an intervention <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        &ldquo;There is no data&rdquo; is usually wrong. For most of these
        questions somebody is already counting — the number just never reaches
        anyone who could act on it. That is a different problem, with a cheaper
        fix, and it gets missed because both look identical from outside.
      </p>

      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>Held somewhere, not published</span>
          <b>{String(counts.withheld).padStart(2, "0")}</b>
          <small>of {counts.total} open questions</small>
        </div>
        <div className="spa-kpi alert">
          <span>Genuinely never measured</span>
          <b>{String(counts.neverMeasured).padStart(2, "0")}</b>
          <small>no record exists to release</small>
        </div>
        <div className="spa-kpi">
          <span>Established for Delhi</span>
          <b>{Math.round(DELHI_ABC_COVERAGE.value * 100)}%</b>
          <small>
            sterilised, of ~{num(DELHI_POPULATION.value)} dogs
          </small>
        </div>
      </div>

      <div className="gap-list">
        {UNKNOWNS.map((u) => {
          const barrier = BARRIER_META[u.barrier];
          return (
            <article
              className="gap-open"
              key={u.id}
              style={{ borderLeftColor: barrier.tone }}
            >
              <header className="gap-open-head">
                <h2>{u.question}</h2>
                <span
                  className="gap-barrier"
                  style={{ color: barrier.tone, borderColor: barrier.tone }}
                >
                  {barrier.label}
                </span>
              </header>

              {u.heldBy && (
                <p className="gap-held">
                  <span className="spa-mono">Held by</span>
                  {u.heldBy}
                </p>
              )}

              <p className="gap-why">{u.why}</p>

              <dl className="gap-resolve">
                <div>
                  <dt>Best available today</dt>
                  <dd>{u.bestAvailable}</dd>
                </div>
                <div>
                  <dt>{barrier.short}</dt>
                  <dd className="answer">{u.resolvedBy}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <section className="why-us">
        <h2>Why this is the thing to build</h2>
        <div className="why-grid">
          <div>
            <span className="spa-mono">The pattern</span>
            <p>
              Four of these six are not measurement problems. Somebody counted,
              filed it, and moved on. The count is real, and it is unreachable
              — which for a funder deciding where to put money is the same as it
              never having happened.
            </p>
          </div>
          <div>
            <span className="spa-mono">Why it stays broken</span>
            <p>
              Nobody&apos;s job is to join it up. A municipality has no reason
              to publish in a format a researcher can use. An NGO&apos;s
              vaccination count serves its own reporting. Each body is behaving
              reasonably; the aggregate is that no one can answer a basic
              question about a city.
            </p>
          </div>
          <div>
            <span className="spa-mono">What we do about it</span>
            <p>
              Two things, and they are different. Where the data is held, we go
              and get it, and publish it in a form that survives reuse. Where it
              was never measured, we help a funder commission the study — and
              the result lands in the same place, under the same schema, next to
              everything else.
            </p>
          </div>
        </div>
        <Link href="/partner-apply" className="spa-cta">
          Fund the first study <ArrowUpRight size={14} />
        </Link>
      </section>

      <aside className="spa-note">
        <CoverageGap size={64} />
        <div>
          <b>On the claims above.</b> Where a body is named as holding data,
          that follows from a statutory duty or a published programme — a
          municipality running a tendered ABC contract necessarily has surgery
          counts. It does not mean we have seen the file. Two figures on this
          page are established and sourced; the rest is honestly blank.
        </div>
      </aside>
    </AppShell>
  );
}
