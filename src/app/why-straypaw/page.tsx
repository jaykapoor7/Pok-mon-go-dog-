import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { LoopFigure, CoverageBar } from "@/components/marketing/figures";
import { Reveal } from "@/components/site/Reveal";
import { UNKNOWNS, barrierCounts, BARRIER_META } from "@/lib/platform/network";
import { STATES } from "@/lib/platform/geography";
import { DATASETS } from "@/lib/platform/datasets";

export const metadata = {
  title: "Why StrayPaw, the coordination gap",
  description:
    "India's street-animal work is not short of effort. It is short of a shared record. StrayPaw is the layer that makes populations identifiable, observable and actionable.",
};

/** States with a published dog population, from the real sourced points. */
function statesWithPopulation() {
  const codes = new Set<string>();
  for (const ds of DATASETS) {
    for (const p of ds.points) {
      if (p.metric === "dog_population" && p.geo.level === "state") {
        codes.add(p.geo.code);
      }
    }
  }
  return codes.size;
}

export default function WhyStrayPawPage() {
  const counts = barrierCounts();
  const withPop = statesWithPopulation();

  return (
    <MarketingPage
      kicker="WHY STRAYPAW"
      title="The gap is not effort."
      accent="It is memory."
      lede="Thousands of people already do this work, municipal ABC programmes, rescue groups, vets, residents who feed the same dogs every evening. What none of them share is a record that survives the day it was written."
      figure={<LoopFigure />}
      next={[
        { label: "The network", href: "/the-network", note: "How one signal becomes a record that outlives the rescue." },
        { label: "For NGOs", href: "/for-ngos", note: "What the field workspace actually does." },
        { label: "The data", href: "/the-data", note: "What is known, and what nobody has looked at." },
      ]}
    >
      <Band
        tone="paper"
        kicker="THE PROBLEM, PRECISELY"
        title="A dog is treated, released, and becomes"
        accent="anonymous again."
      >
        <p className="mk-body">
          A street dog is caught, sterilised, ear-notched and returned. Six
          months later a different team, a different NGO, a different ward
          picks up the same animal and starts from nothing. The notch says a
          surgery happened; it cannot say when, by whom, with what outcome, or
          whether the vaccination is still in date.
        </p>
        <p className="mk-body">
          Multiply that by every animal in a city and the result is the state
          Indian street-animal work is actually in: enormous effort, almost no
          accumulated knowledge. Programmes cannot prove what they achieved.
          Funders cannot tell a working intervention from a busy one. And the
          same animal gets counted, or missed, many times over.
        </p>

        <div className="mk-stats">
          <Stat
            value={`${withPop} / ${STATES.length}`}
            label="States with a published street-dog population"
            source="Compiled from NAPRE state reporting, municipal censuses and Livestock Census baselines"
          />
          <Stat
            value={String(counts.withheld)}
            label="Questions where the data exists but is not published"
            source="StrayPaw evidence register, each entry names who holds it"
          />
          <Stat
            value={String(counts.neverMeasured)}
            label="Questions nobody has measured at all"
            source="StrayPaw evidence register"
          />
        </div>
      </Band>

      <Band
        tone="ink"
        kicker="WHAT ABSENCE LOOKS LIKE"
        title="Most of the map has never"
        accent="been looked at."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              A district with no sterilisation record is not a district without
              need. It is a district nobody has surveyed. StrayPaw treats that
              distinction as a product surface rather than a footnote, because
              it is where studies get scoped and money gets pointed.
            </p>
            <p className="mk-body">
              Each gap in the register names the barrier: whether the number was
              never collected, collected and withheld, or published at a
              resolution too coarse to act on. Those are three different
              problems with three different fixes.
            </p>
          </div>
          <figure>
            <CoverageBar
              known={withPop}
              total={STATES.length}
              label="states with a published population figure"
            />
            {/* The questions themselves, not a count of them. "Never
                measured, 2 questions" tells a reader nothing they can act on
                or check; the question and who holds the answer does. */}
            <div className="mk-list">
              {UNKNOWNS.map((u) => (
                <Reveal key={u.id}>
                  <div className="mk-row">
                    <b>{u.question}</b>
                    <span className="mk-tag">{BARRIER_META[u.barrier].short}</span>
                    <p>{u.heldBy ? `Held by ${u.heldBy}.` : "Nobody holds this."} {u.resolvedBy}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </figure>
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="WHAT WE ACTUALLY BUILD"
        title="Identity, record,"
        accent="measurement."
      >
        <p className="mk-body">
          Three things: a permanent identity for the animal, a shared record
          for the people working on it, and a measurement trail, so an
          intervention can be judged on what changed rather than what was
          spent.
        </p>
        <Steps
          items={[
            {
              n: "01",
              title: "Identity",
              body: "A permanent code per animal, readable by any ISO-compatible scanner clinics already own. Every record after it attaches to the code, not to a memory or a notebook.",
            },
            {
              n: "02",
              title: "Observation",
              body: "Residents, field teams and municipal sweeps all write to the same map. One animal accumulates one history instead of a dozen disconnected ones.",
            },
            {
              n: "03",
              title: "Measurement",
              body: "Coverage becomes a query rather than a survey. What a programme achieved can be checked against what it claimed, at ward resolution.",
            },
          ]}
        />
      </Band>
    </MarketingPage>
  );
}
