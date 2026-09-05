import {
  MarketingPage,
  Band,
  Stat,
} from "@/components/marketing/MarketingPage";
import { CoverageBar, LoopFigure } from "@/components/marketing/figures";
import { Reveal } from "@/components/site/Reveal";
import { UNKNOWNS, BARRIER_META, barrierCounts } from "@/lib/platform/network";
import { STATES } from "@/lib/platform/geography";
import { DATASETS } from "@/lib/platform/datasets";
import { ORGS } from "@/lib/platform/orgs";

export const metadata = {
  title: "The data, what is known, and what is not",
  description:
    "Street-dog population, sterilisation coverage and organisational presence across India, with every gap named and attributed to whoever holds the missing number.",
};

function countFor(metric: string) {
  const codes = new Set<string>();
  for (const ds of DATASETS) {
    for (const p of ds.points) {
      if (p.metric === metric && p.geo.level === "state") codes.add(p.geo.code);
    }
  }
  return codes.size;
}

export default function TheDataPage() {
  const pop = countFor("dog_population");
  const abc = countFor("abc_coverage");
  const counts = barrierCounts();

  return (
    <MarketingPage
      kicker="THE DATA"
      title="What is known."
      accent="And what is not."
      lede="The state of the evidence on India's street animals. Where a figure exists it is cited; where it does not, the gap is named along with whoever holds the number."
      figure={<LoopFigure />}
      next={[
        { label: "State-by-state explorer", href: "/gaps", note: "Population, coverage and organisations per state." },
        { label: "Cost an intervention", href: "/what-would-it-take", note: "Turn any state into a scoped, costed plan." },
        { label: "Research standards", href: "/research-standards", note: "How a question becomes a published result." },
      ]}
    >
      <Band
        tone="paper"
        kicker="COVERAGE OF THE EVIDENCE ITSELF"
        title="Population is published."
        accent="Almost nothing else is."
      >
        <p className="mk-body">
          Nearly every state has some street-dog population figure, of varying
          quality and vintage. Sterilisation coverage, the number that decides
          whether a programme is working, is published for a handful. That
          asymmetry is the central fact of this field.
        </p>

        <CoverageBar
          known={pop}
          total={STATES.length}
          label="states with a published dog population"
        />
        <CoverageBar
          known={abc}
          total={STATES.length}
          label="states with published ABC coverage"
        />

        <div className="mk-stats">
          <Stat
            value={`${pop} / ${STATES.length}`}
            label="Population published"
            source="NAPRE state reporting, municipal censuses, Livestock Census baselines"
          />
          <Stat
            value={`${abc} / ${STATES.length}`}
            label="Sterilisation coverage published"
            source="State and municipal disclosures where they exist"
          />
          <Stat
            value={String(ORGS.length)}
            label="Organisations mapped"
            source="StrayPaw directory, verified against public presence"
          />
        </div>
      </Band>

      <Band
        tone="ink"
        kicker="THE GAPS, NAMED"
        title="Three different kinds"
        accent="of missing."
      >
        <p className="mk-body">
          &ldquo;No data&rdquo; hides three separate problems, and they need
          different fixes. A number nobody ever collected requires fieldwork. A
          number sitting in a monitoring committee&rsquo;s returns requires
          disclosure. A number published only as a city total requires
          re-release at a usable resolution. Every gap in the register is
          classified this way.
        </p>

        <div className="mk-list">
          {UNKNOWNS.map((u) => (
            <Reveal key={u.id}>
              <div className="mk-row">
                <b>{u.question}</b>
                <span className="mk-tag">{BARRIER_META[u.barrier].label}</span>
                <p>
                  <strong>Held by:</strong> {u.heldBy}
                  <br />
                  <strong>Best available today:</strong> {u.bestAvailable}
                  <br />
                  <strong>Resolved by:</strong> {u.resolvedBy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="THE EVIDENCE REGISTER"
        title="What is missing,"
        accent="and who has it."
      >
        <p className="mk-body">
          Each open question is listed with the body that holds or would hold
          the answer, and what it would take to close it. Several are open
          because the number exists and has not been released, which is a
          cheaper problem to fix than a missing measurement.
        </p>
        <div className="mk-stats">
          <Stat
            value={String(counts.total)}
            label="Open questions in the evidence register"
            source="Each with a named holder and a stated route to resolution"
          />
          <Stat
            value={String(counts.withheld)}
            label="Where the number exists but is unpublished"
            source="Disclosure would resolve these without new fieldwork"
          />
          <Stat
            value={String(counts.neverMeasured)}
            label="Never measured at all"
            source="These need funded study work to answer"
          />
        </div>
      </Band>
    </MarketingPage>
  );
}
