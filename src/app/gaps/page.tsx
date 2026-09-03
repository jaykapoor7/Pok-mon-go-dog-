import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CoverageGap } from "@/components/site/vectors";
import {
  DELHI_ABC_COVERAGE,
  DELHI_POPULATION,
  UNKNOWNS,
  num,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Data gaps, StrayPaw",
  description:
    "What is genuinely unanswered about India's street animals, why it is unanswered, and what would resolve it.",
};

export default function GapsPage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / gaps</span>
          <h1>
            What nobody <em>knows.</em>
          </h1>
        </div>
        <Link href="/what-would-it-take" className="spa-cta">
          Cost an intervention <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        These are not gaps in our database. They are questions no published
        Indian source answers, at any geography. Each one is a study waiting for
        a funder.
      </p>

      {/* What IS established, so the gaps have a reference point. */}
      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>Delhi community dogs</span>
          <b>{num(DELHI_POPULATION.value)}</b>
          <small>{DELHI_POPULATION.year} survey · established</small>
        </div>
        <div className="spa-kpi">
          <span>Sterilisation coverage</span>
          <b>{Math.round(DELHI_ABC_COVERAGE.value * 100)}%</b>
          <small>{DELHI_ABC_COVERAGE.year} survey · established</small>
        </div>
        <div className="spa-kpi alert">
          <span>Open questions</span>
          <b>{String(UNKNOWNS.length).padStart(2, "0")}</b>
          <small>no published answer at any geography</small>
        </div>
      </div>

      <div className="gap-list">
        {UNKNOWNS.map((u) => (
          <article className="gap-open" key={u.id}>
            <h2>{u.question}</h2>
            <p className="gap-why">{u.why}</p>
            <dl className="gap-resolve">
              <div>
                <dt>Best available today</dt>
                <dd>{u.bestAvailable}</dd>
              </div>
              <div>
                <dt>What would answer it</dt>
                <dd className="answer">{u.resolvedBy}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <aside className="spa-note">
        <CoverageGap size={64} />
        <div>
          <b>Why this page has no numbers in it.</b> Filling these gaps with
          plausible estimates would make the page look more complete and be
          worth less. Two figures on this page are established and sourced; the
          rest is honestly blank, because that is the state of the evidence.
        </div>
      </aside>
    </AppShell>
  );
}
