import Link from "next/link";
import { ArrowUpRight, Wrench } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PreLaunch } from "@/components/app/PreLaunch";
import {
  COVERAGE_TARGET,
  OBJECTIVE_META,
  UNIT_COSTS,
  inr,
  num,
  whatWouldItTake,
  type Objective,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Interventions, StrayPaw",
  description:
    "Funded work on the ground. Nothing has been commissioned yet — this shows what the first one would look like.",
};

const OBJECTIVES: Objective[] = ["sterilisation", "vaccination"];

export default function InterventionsPage() {
  /* One MCD zone's worth — the smallest unit a first programme would
     realistically target. Derived from published city figures, not invented. */
  const ZONE_SHARE = 1 / 12;

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Action layer / interventions</span>
          <h1>
            What is <em>happening.</em>
          </h1>
        </div>
        <Link href="/partner-apply" className="spa-cta">
          Fund an intervention <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        Evidence becomes a funded programme with an owner, a budget and a
        finish line. Each one closes into an outcome record.
      </p>

      <PreLaunch
        Icon={Wrench}
        what="interventions"
        fills="An intervention appears here once a funder commits and a partner organisation takes it into the field."
        cta={{ href: "/what-would-it-take", label: "Cost one first" }}
      />

      <section className="queue">
        <h2 className="queue-head">
          <span className="spa-mono">Scale reference</span>
          What a first programme would cost
        </h2>
        <p className="queue-lede">
          One MCD zone&apos;s share of Delhi, to the WHO{" "}
          {Math.round(COVERAGE_TARGET.value * 100)}% threshold. Built from
          published population, coverage and unit-cost figures — see the
          sources on{" "}
          <Link href="/what-would-it-take" className="tlink">
            the scoping tool
          </Link>
          .
        </p>
        <div className="ref-grid">
          {OBJECTIVES.map((o) => {
            const plan = whatWouldItTake(o, ZONE_SHARE);
            const cost = UNIT_COSTS[o];
            return (
              <div className="ref-card" key={o}>
                <span className="spa-mono">{OBJECTIVE_META[o].label}</span>
                <b>{inr(plan.cost)}</b>
                <small>
                  {num(plan.animals)} animals · {plan.months} months at{" "}
                  {plan.teams} teams
                </small>
                <p className="ref-src spa-mono">
                  {plan.baselineUnknown
                    ? "Ceiling — no published vaccination baseline"
                    : `${inr(cost.value)} ${cost.unit} · ${cost.year}`}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
