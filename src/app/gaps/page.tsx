import Link from "next/link";
import { BackLink } from "@/components/app/BackLink";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StateExplorer, type StateRow } from "@/components/app/StateExplorer";
import { buildStateRows } from "@/lib/platform/stateRows";
import { BARRIER_META, UNKNOWNS, barrierCounts } from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "What is known, StrayPaw",
  description:
    "State-by-state street-dog population across India, what each state has published about coverage, and who is working there.",
};

export default function GapsPage() {
  const rows: StateRow[] = buildStateRows();
  const counts = barrierCounts();

  const totalPop = rows.reduce((s, r) => s + (r.population ?? 0), 0);
  const withCoverage = rows.filter((r) => r.abcCoverage !== null).length;

  return (
    <AppShell>
      <BackLink label="Back to the evidence" to="/evidence" />
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / what is known</span>
          <h1>
            The picture, <em>state by state.</em>
          </h1>
        </div>
        <Link href="/what-would-it-take" className="spa-cta">
          Cost an intervention <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        Street-dog population is published for most of India. What each state has
        measured beyond that varies enormously, select any state to see what it
        has released, and who is working there.
      </p>

      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>States covered</span>
          <b>{rows.length}</b>
          <small>with a published population figure</small>
        </div>
        <div className="spa-kpi">
          <span>Animals accounted for</span>
          <b>{(totalPop / 10000000).toFixed(1)} Cr</b>
          <small>summed across state estimates</small>
        </div>
        <div className="spa-kpi alert">
          <span>Published coverage</span>
          <b>
            {withCoverage}/{rows.length}
          </b>
          <small>states reporting sterilisation coverage</small>
        </div>
      </div>

      <StateExplorer rows={rows} />

      {/* The missing-data argument, kept short. It is one part of the
          picture, not the whole page. */}
      <section className="gap-brief">
        <div className="gap-brief-head">
          <div>
            <span className="spa-mono">Where StrayPaw comes in</span>
            <h2>
              {counts.withheld} of {counts.total} open questions are not
              measurement problems.
            </h2>
            <p>
              Somebody is already counting, municipal ABC returns, bite records
              at treatment points, vaccination drives. The number just never
              reaches anyone who could act on it. That is cheaper to fix than a
              study, and it is most of the work.
            </p>
          </div>
          <Link href="/contact?subject=Fund%20survey%20work%20in%20an%20uncovered%20state" className="spa-cta">
            Fund the work <ArrowUpRight size={14} />
          </Link>
        </div>

        <ul className="gap-brief-list">
          {UNKNOWNS.map((u) => {
            const b = BARRIER_META[u.barrier];
            return (
              <li key={u.id}>
                <span className="gap-brief-tag" style={{ color: b.tone, borderColor: b.tone }}>
                  {b.short}
                </span>
                <b>{u.question}</b>
                {u.heldBy && <small>Held by {u.heldBy}</small>}
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
