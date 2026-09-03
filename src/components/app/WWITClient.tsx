"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import {
  OBJECTIVE_META,
  UNIT_COSTS,
  ZONES,
  inr,
  num,
  whatWouldItTake,
  type Objective,
} from "@/lib/platform/network";

const OBJECTIVES = Object.keys(OBJECTIVE_META) as Objective[];

export function WWITClient() {
  const [zoneCode, setZoneCode] = useState(ZONES[2].code); // Narela — never surveyed
  const [objective, setObjective] = useState<Objective>("sterilisation");
  const [teams, setTeams] = useState(2);

  const zone = ZONES.find((z) => z.code === zoneCode)!;
  const plan = useMemo(
    () => whatWouldItTake(zone, objective, teams),
    [zone, objective, teams]
  );
  const cost = UNIT_COSTS[objective];
  const meta = OBJECTIVE_META[objective];

  return (
    <>
      {/* ── inputs ── */}
      <div className="wwit-controls">
        <label>
          <span>Geography</span>
          <select value={zoneCode} onChange={(e) => setZoneCode(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z.code} value={z.code}>
                {z.name} — {z.district}
              </option>
            ))}
          </select>
        </label>

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

        {objective !== "feeding" && (
          <label>
            <span>Field teams</span>
            <select value={teams} onChange={(e) => setTeams(Number(e.target.value))}>
              {[1, 2, 3, 4, 6].map((t) => (
                <option key={t} value={t}>
                  {t} team{t > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="wwit-question">{meta.question}</p>

      {plan.unsurveyed && (
        <div className="wwit-warn" role="note">
          <TriangleAlert size={15} />
          <span>
            <b>{zone.name} has never been surveyed.</b> Everything below rests on a
            projected population. The first thing this geography needs is a study,
            not a cheque.
          </span>
        </div>
      )}

      {/* ── the answer ── */}
      <div className="wwit-answer">
        <Figure
          label={`Animals to ${meta.verb}`}
          value={num(plan.animals)}
          sub={
            objective === "sterilisation" || objective === "vaccination"
              ? `to move coverage ${Math.round(plan.coverageNow * 100)}% → ${Math.round(plan.coverageTarget * 100)}%`
              : objective === "medical"
                ? "modelled share needing first-line treatment"
                : "every animal in the zone"
          }
        />
        <Figure
          label="Cost"
          value={inr(plan.cost)}
          sub={`${inr(plan.unitCost)} ${cost.unit}${objective === "feeding" ? " × 365 days" : ""}`}
          accent
        />
        <Figure
          label="Time"
          value={plan.months === 12 && objective === "feeding" ? "12 months" : `${plan.months} mo`}
          sub={objective === "feeding" ? "continuous" : `at ${teams} team${teams > 1 ? "s" : ""} in the field`}
        />
      </div>

      {/* ── how it was worked out ── */}
      <section className="wwit-method">
        <h2>How this was worked out</h2>
        <ol>
          <li>
            <b>Population.</b> {num(zone.population)} animals in {zone.name}.{" "}
            <em>Modelled</em> — no ward-level census exists for this zone.
          </li>
          {(objective === "sterilisation" || objective === "vaccination") && (
            <li>
              <b>Shortfall.</b> {Math.round(plan.coverageNow * 100)}% already
              covered, target {Math.round(plan.coverageTarget * 100)}%. WHO puts
              the canine-rabies herd-immunity threshold near 70%; ABC programmes
              aim at a comparable share to hold a population stable.
            </li>
          )}
          <li>
            <b>Unit cost.</b> {inr(plan.unitCost)} {cost.unit}.{" "}
            <span className="wwit-src">{cost.source} ({cost.year}).</span>
          </li>
          {objective !== "feeding" && (
            <li>
              <b>Throughput.</b> Field capacity per team per working month, from
              partner-reported camp records. Surgery is the binding constraint.
            </li>
          )}
        </ol>
      </section>

      {/* ── next step ── */}
      <div className="wwit-next">
        <div>
          <span className="spa-mono">Next step</span>
          <h3>
            {plan.unsurveyed
              ? "Fund a baseline study here"
              : "Scope this as a funded intervention"}
          </h3>
          <p>
            {plan.unsurveyed
              ? "A study establishes the real population and coverage, then the intervention estimate becomes an evidence-backed number rather than a projection."
              : "StrayPaw turns this into a study brief, a partner shortlist and a milestone schedule the funder can track to an outcome record."}
          </p>
        </div>
        <div className="wwit-next-actions">
          <Link href="/partner-apply" className="spa-cta">
            Start an initiative <ArrowUpRight size={14} />
          </Link>
          <Link href="/gaps" className="wwit-link">
            See where evidence is thinnest <ArrowUpRight size={13} />
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
