import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  INTERVENTIONS,
  OBJECTIVE_META,
  STATUS_META,
  ZONE_BY_CODE,
  inr,
  num,
} from "@/lib/platform/network";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Interventions, StrayPaw",
  description:
    "Funded work on the ground: what is planned, in the field, or closed — with the partner executing it and the budget behind it.",
};

export default function InterventionsPage() {
  const live = INTERVENTIONS.filter((i) => i.status === "in_field");
  const committed = INTERVENTIONS.filter((i) => i.status !== "seeking_funder");
  const reached = INTERVENTIONS.reduce((s, i) => s + i.animalsReached, 0);
  const budget = committed.reduce((s, i) => s + i.budget, 0);

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
        Evidence becomes a funded programme with an owner, a budget and a finish
        line. Each one closes into an outcome record.
      </p>

      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>In the field</span>
          <b>{String(live.length).padStart(2, "0")}</b>
          <small>running right now</small>
        </div>
        <div className="spa-kpi">
          <span>Animals reached</span>
          <b>{num(reached)}</b>
          <small>across all programmes</small>
        </div>
        <div className="spa-kpi">
          <span>Committed budget</span>
          <b>{inr(budget)}</b>
          <small>excludes unfunded proposals</small>
        </div>
      </div>

      <div className="iv-list">
        {INTERVENTIONS.map((iv) => {
          const zone = ZONE_BY_CODE.get(iv.zoneCode);
          const st = STATUS_META[iv.status];
          const pct = iv.animalsTarget
            ? Math.round((iv.animalsReached / iv.animalsTarget) * 100)
            : 0;
          return (
            <article className="iv-card" key={iv.id} style={{ borderTopColor: st.tone }}>
              <header>
                <div>
                  <h2>
                    {zone?.name ?? iv.zoneCode} · {OBJECTIVE_META[iv.objective].label}
                  </h2>
                  <span className="spa-mono dim">{iv.id}</span>
                </div>
                <span className="iv-status" style={{ color: st.tone, borderColor: st.tone }}>
                  {st.label}
                </span>
              </header>

              <div className="iv-progress">
                <div className="iv-bar" aria-hidden="true">
                  <i style={{ width: `${pct}%`, background: st.tone }} />
                </div>
                <span className="spa-mono">
                  {num(iv.animalsReached)} / {num(iv.animalsTarget)} animals · {pct}%
                </span>
              </div>

              <dl className="iv-facts">
                <div>
                  <dt>Partner</dt>
                  <dd>{iv.partner}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{inr(iv.budget)}</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{iv.opened}</dd>
                </div>
                <div>
                  <dt>{iv.closed ? "Closed" : "Status"}</dt>
                  <dd>{iv.closed ?? "Open"}</dd>
                </div>
              </dl>

              {iv.status === "complete" && (
                <Link href="/outcomes" className="tlink">
                  View outcome record <ArrowUpRight size={12} />
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <aside className="spa-note">
        <div>
          <b>On these records.</b> These are illustrative programme records showing
          the shape of the intervention layer. Budgets use the real published unit
          costs; the zone populations behind the targets are modelled.
        </div>
      </aside>
    </AppShell>
  );
}
