import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  COVERAGE_TARGET,
  DELHI_ABC_COVERAGE,
  DELHI_POPULATION,
  OBJECTIVE_META,
  UNIT_COSTS,
  inr,
  num,
  whatWouldItTake,
  type Objective,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Needs, StrayPaw",
  description:
    "The outstanding shortfall against the WHO coverage threshold in Delhi, priced against published unit costs.",
};

const OBJECTIVES: Objective[] = ["sterilisation", "vaccination"];

export default function NeedsPage() {
  const plans = OBJECTIVES.map((o) => whatWouldItTake(o, 1));

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / needs</span>
          <h1>
            What is <em>outstanding.</em>
          </h1>
        </div>
        <Link href="/what-would-it-take" className="spa-cta">
          Scope a share <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        Delhi&apos;s shortfall against the WHO {Math.round(COVERAGE_TARGET.value * 100)}%
        coverage threshold, priced at published unit costs. City-wide only, no ward-level breakdown has ever been published.
      </p>

      <div className="need-cards">
        {plans.map((plan) => {
          const meta = OBJECTIVE_META[plan.objective];
          const cost = UNIT_COSTS[plan.objective];
          return (
            <article className="need-card" key={plan.objective}>
              <header>
                <h2>{meta.label}</h2>
                {plan.baselineUnknown && (
                  <span className="need-flag">Baseline unpublished</span>
                )}
              </header>

              <div className="need-figure">
                <b>{num(plan.animals)}</b>
                <span>animals still to {meta.verb}</span>
              </div>

              <div className="need-bar" aria-hidden="true">
                <i
                  className="have"
                  style={{ width: `${plan.coverageNow * 100}%` }}
                />
                <i
                  className="need"
                  style={{
                    width: `${(plan.coverageTarget - plan.coverageNow) * 100}%`,
                  }}
                />
              </div>
              <p className="need-legend spa-mono">
                <span className="key have" /> {Math.round(plan.coverageNow * 100)}% covered
                &nbsp;·&nbsp;
                <span className="key need" /> {Math.round((plan.coverageTarget - plan.coverageNow) * 100)}% to go
              </p>

              <dl className="need-facts">
                <div>
                  <dt>Cost to close</dt>
                  <dd className="big">{inr(plan.cost)}</dd>
                </div>
                <div>
                  <dt>Unit cost</dt>
                  <dd>
                    {inr(plan.unitCost)} {cost.unit}
                  </dd>
                </div>
              </dl>

              <p className="need-src spa-mono">
                {plan.baselineUnknown
                  ? "Assumes zero coverage, no published baseline exists, so this is a ceiling."
                  : `${DELHI_ABC_COVERAGE.source} (${DELHI_ABC_COVERAGE.year})`}
              </p>
            </article>
          );
        })}
      </div>

      <aside className="spa-note">
        <div>
          <b>What these figures can and cannot support.</b> The population
          ({num(DELHI_POPULATION.value)}), the sterilisation baseline
          ({Math.round(DELHI_ABC_COVERAGE.value * 100)}%), the {Math.round(COVERAGE_TARGET.value * 100)}%
          target and both unit costs are published and sourced, quote them.
          What they cannot tell you is <em>where</em> in Delhi to start. That
          takes a survey, and no one has published one at ward level.
        </div>
      </aside>
    </AppShell>
  );
}
