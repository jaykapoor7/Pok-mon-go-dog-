import { AppShell } from "@/components/app/AppShell";
import { WWITClient } from "@/components/app/WWITClient";
import { STATES } from "@/lib/platform/geography";
import { DATASETS } from "@/lib/platform/datasets";
import type { PlanGeography } from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "What would it take? StrayPaw",
  description:
    "Turn a geographic problem into a costed, scheduled intervention anywhere in India: how many animals, what it costs, how long it takes, and who can execute it.",
};

/** Real, sourced points for one metric, keyed by state code. */
function pointsFor(metric: string) {
  const m = new Map<string, { value: number; source: string; year: number }>();
  for (const ds of DATASETS) {
    for (const p of ds.points) {
      if (p.metric === metric && p.geo.level === "state") {
        m.set(p.geo.code, { value: p.value, source: p.source, year: p.year });
      }
    }
  }
  return m;
}

export default function WhatWouldItTakePage() {
  const pop = pointsFor("dog_population");
  const abc = pointsFor("abc_coverage");

  /* Only states with a published population can be costed — the rest have no
     real number to multiply, and inventing one would make the whole tool a
     guess. Those states are named as a gap in the tool instead. */
  const geographies: PlanGeography[] = STATES.flatMap((st) => {
    const p = pop.get(st.code);
    if (!p) return [];
    const a = abc.get(st.code);
    return [{
      code: st.code,
      name: st.name,
      population: p.value,
      populationSource: p.source,
      populationYear: p.year,
      // abc_coverage is stored as a percentage; plans work in 0–1.
      coverage: a ? a.value / 100 : null,
      coverageSource: a ? `${a.source} (${a.year})` : null,
    }];
  }).sort((x, y) => y.population - x.population);

  const uncosted = STATES.length - geographies.length;

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Planning / scoping tool</span>
          <h1>
            What would it <em>take?</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        Pick a state and an objective. This turns it into the numbers a funder
        and an executing partner both need: how many animals, what it costs,
        how long it runs. Every figure is sourced, and where a state has
        published nothing the tool says so rather than filling the gap.
      </p>

      <WWITClient geographies={geographies} uncosted={uncosted} />
    </AppShell>
  );
}
