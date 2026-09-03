import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CoverageGap } from "@/components/site/vectors";
import { evidenceGaps, num } from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Data gaps, StrayPaw",
  description:
    "Where the evidence is thinnest. Zones ranked by how long since anyone surveyed them and how far coverage sits below target.",
};

export default function GapsPage() {
  const gaps = evidenceGaps();
  const never = gaps.filter((g) => g.staleDays === null).length;

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / gaps</span>
          <h1>
            What we <em>don&apos;t</em> know.
          </h1>
        </div>
        <Link href="/what-would-it-take" className="spa-cta">
          Scope an intervention <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        A zone with no sterilisation record is not a zone without need. It is a zone
        nobody has surveyed. Ranked by how little we can currently defend.
      </p>

      <div className="spa-kpis">
        <div className="spa-kpi alert">
          <span>Never surveyed</span>
          <b>{String(never).padStart(2, "0")}</b>
          <small>zones with no field baseline at all</small>
        </div>
        <div className="spa-kpi">
          <span>Zones tracked</span>
          <b>{gaps.length}</b>
          <small>MCD administrative zones</small>
        </div>
        <div className="spa-kpi">
          <span>Stale over 18 months</span>
          <b>{gaps.filter((g) => g.staleDays !== null && g.staleDays > 545).length}</b>
          <small>surveyed, but no longer current</small>
        </div>
      </div>

      <div className="gap-list">
        {gaps.map(({ zone, staleDays, severity, reason }) => (
          <article className="gap-row" key={zone.code}>
            <div className="gap-row-main">
              <div className="gap-row-head">
                <h2>{zone.name}</h2>
                <span className="spa-mono gap-zone">{zone.district}</span>
              </div>
              <p>{reason}</p>
              <div className="gap-meter" aria-hidden="true">
                <i style={{ width: `${Math.round(severity * 100)}%` }} />
              </div>
            </div>
            <dl className="gap-facts">
              <div>
                <dt>Last surveyed</dt>
                <dd className={staleDays === null ? "never" : ""}>
                  {staleDays === null ? "Never" : `${Math.floor(staleDays / 30)} mo ago`}
                </dd>
              </div>
              <div>
                <dt>Sterilised</dt>
                <dd>{Math.round(zone.sterilised * 100)}%</dd>
              </div>
              <div>
                <dt>Population</dt>
                <dd>{num(zone.population)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <aside className="spa-note">
        <CoverageGap size={64} />
        <div>
          <b>On these numbers.</b> Zone populations and coverage are modelled — India
          publishes no ward-level street-dog census, which is the gap itself. Zone
          names and districts are real MCD administrative units. Treat every figure
          here as a prompt to survey, not as a finding.
        </div>
      </aside>
    </AppShell>
  );
}
