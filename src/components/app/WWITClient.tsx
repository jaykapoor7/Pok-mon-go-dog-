"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
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

const OBJECTIVES = Object.keys(OBJECTIVE_META) as Objective[];

/* Scope is an explicit input, not a claim about where animals are. Nobody has
   published Delhi's ward-level distribution, so the tool asks rather than
   pretending to know. */
const SCOPES: { label: string; value: number }[] = [
  { label: "All of Delhi NCT", value: 1 },
  { label: "Half the city", value: 0.5 },
  { label: "A quarter of the city", value: 0.25 },
  { label: "One tenth of the city", value: 0.1 },
  { label: "One MCD zone (~1/12th)", value: 1 / 12 },
];

export function WWITClient() {
  const [objective, setObjective] = useState<Objective>("sterilisation");
  const [scope, setScope] = useState(1 / 12);
  const [teams, setTeams] = useState(2);

  const plan = useMemo(
    () => whatWouldItTake(objective, scope, teams),
    [objective, scope, teams]
  );
  const cost = UNIT_COSTS[objective];
  const meta = OBJECTIVE_META[objective];

  return (
    <>
      <div className="wwit-controls">
        <label>
          <span>Objective</span>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value as Objective)}
          >
            {OBJECTIVES.map((o) => (
              <option key={o} value={o}>
                {OBJECTIVE_META[o].label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Scope</span>
          <select value={scope} onChange={(e) => setScope(Number(e.target.value))}>
            {SCOPES.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Field teams</span>
          <select value={teams} onChange={(e) => setTeams(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 10].map((t) => (
              <option key={t} value={t}>
                {t} team{t > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="wwit-question">{meta.question}</p>

      {plan.baselineUnknown && (
        <div className="wwit-warn" role="note">
          <TriangleAlert size={15} />
          <span>
            <b>No published vaccination baseline exists for Delhi.</b> The
            2022-23 survey measured sterilisation, not vaccination, and ARV
            drives are run by several bodies without a shared register. This
            plan therefore assumes zero coverage — a ceiling, not an estimate.
            Establishing the real baseline is itself a study.
          </span>
        </div>
      )}

      <div className="wwit-answer">
        <Figure
          label={`Animals to ${meta.verb}`}
          value={num(plan.animals)}
          sub={`to move coverage ${Math.round(plan.coverageNow * 100)}% → ${Math.round(plan.coverageTarget * 100)}% across ${num(plan.population)} animals`}
        />
        <Figure
          label="Cost"
          value={inr(plan.cost)}
          sub={`${inr(plan.unitCost)} ${cost.unit}`}
          accent
        />
        <Figure
          label="Time"
          value={`${plan.months} mo`}
          sub={`at ${plan.teams} team${plan.teams > 1 ? "s" : ""} in the field`}
        />
      </div>

      <section className="wwit-method">
        <h2>Every number above, and where it comes from</h2>
        <ol>
          <li>
            <b>Population.</b> {num(DELHI_POPULATION.value)} community dogs
            across Delhi NCT, scaled to the scope you picked.{" "}
            <span className="wwit-src">
              {DELHI_POPULATION.source} ({DELHI_POPULATION.year}).
            </span>
          </li>
          <li>
            <b>Current coverage.</b>{" "}
            {plan.baselineUnknown ? (
              <>
                <em>Not published.</em> Assumed zero, which makes this figure an
                upper bound.
              </>
            ) : (
              <>
                {Math.round(DELHI_ABC_COVERAGE.value * 100)}% sterilised.{" "}
                <span className="wwit-src">
                  {DELHI_ABC_COVERAGE.source} ({DELHI_ABC_COVERAGE.year}).
                </span>
              </>
            )}
          </li>
          <li>
            <b>Target.</b> {Math.round(COVERAGE_TARGET.value * 100)}%.{" "}
            <span className="wwit-src">
              {COVERAGE_TARGET.source}.
            </span>
          </li>
          <li>
            <b>Unit cost.</b> {inr(plan.unitCost)} {cost.unit}.{" "}
            <span className="wwit-src">
              {cost.source} ({cost.year}).
            </span>
          </li>
          <li>
            <b>Scope.</b> Your input, not a finding. Delhi&apos;s ward-level
            distribution has never been published, so this tool cannot tell you
            which part of the city needs it most — only what a given share
            costs.
          </li>
        </ol>
      </section>

      <div className="wwit-next">
        <div>
          <span className="spa-mono">Next step</span>
          <h3>Turn the scope into a geography</h3>
          <p>
            The cost above is defensible. The <em>where</em> is not, and no
            amount of arithmetic fixes that — it takes fieldwork. A funded
            study establishes the ward-level baseline, and the same calculation
            then points at a real place.
          </p>
        </div>
        <div className="wwit-next-actions">
          <Link href="/contact?subject=Fund%20a%20baseline%20study" className="spa-cta">
            Fund a baseline study <ArrowUpRight size={14} />
          </Link>
          <Link href="/gaps" className="wwit-link">
            See what else is unknown <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
}

function Figure({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`wwit-figure ${accent ? "accent" : ""}`}>
      <span className="spa-mono">{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  );
}
