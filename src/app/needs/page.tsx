import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  OBJECTIVE_META,
  UNIT_COSTS,
  inr,
  needsRegister,
  num,
  type Objective,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Needs, StrayPaw",
  description:
    "The outstanding shortfall in every zone: how many animals still need reaching, and what closing that gap costs.",
};

const OBJECTIVES: Objective[] = ["sterilisation", "vaccination", "medical"];

export default async function NeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const sp = await searchParams;
  const objective: Objective = OBJECTIVES.includes(sp.for as Objective)
    ? (sp.for as Objective)
    : "sterilisation";

  const needs = needsRegister(objective);
  const totalAnimals = needs.reduce((s, n) => s + n.animals, 0);
  const totalCost = needs.reduce((s, n) => s + n.cost, 0);
  const cost = UNIT_COSTS[objective];

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
          Scope a zone <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        Every zone&apos;s shortfall against a 70% coverage target, largest first.
        This is the queue that funding gets pointed at.
      </p>

      <nav className="seg" aria-label="Objective">
        {OBJECTIVES.map((o) => (
          <Link
            key={o}
            href={`/needs?for=${o}`}
            className={o === objective ? "active" : ""}
            scroll={false}
          >
            {OBJECTIVE_META[o].label}
          </Link>
        ))}
      </nav>

      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>Animals to reach</span>
          <b>{num(totalAnimals)}</b>
          <small>across {needs.length} zones</small>
        </div>
        <div className="spa-kpi">
          <span>Cost to close</span>
          <b>{inr(totalCost)}</b>
          <small>
            at {inr(cost.amount)} {cost.unit}
          </small>
        </div>
        <div className="spa-kpi">
          <span>Largest single gap</span>
          <b>{needs[0] ? num(needs[0].animals) : "—"}</b>
          <small>{needs[0]?.zone.name ?? "none"}</small>
        </div>
      </div>

      <table className="dtable">
        <thead>
          <tr>
            <th>Zone</th>
            <th>District</th>
            <th className="r">Coverage</th>
            <th className="r">Animals</th>
            <th className="r">Cost</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {needs.map(({ zone, animals, cost: c }) => {
            const cov =
              objective === "vaccination" ? zone.vaccinated : zone.sterilised;
            return (
              <tr key={zone.code}>
                <td className="strong">{zone.name}</td>
                <td className="dim">{zone.district}</td>
                <td className="r">
                  {objective === "medical" ? "—" : `${Math.round(cov * 100)}%`}
                </td>
                <td className="r num">{num(animals)}</td>
                <td className="r num">{inr(c)}</td>
                <td className="r">
                  <Link href="/what-would-it-take" className="tlink">
                    Scope
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <aside className="spa-note">
        <div>
          <b>On these numbers.</b> The unit cost is real and sourced —{" "}
          {cost.source} ({cost.year}). The zone populations and coverage shares it
          multiplies are modelled, so treat totals as an order of magnitude for
          scoping, not a quotation.
        </div>
      </aside>
    </AppShell>
  );
}
