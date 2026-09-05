import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { LoopFigure, ResolveFigure } from "@/components/marketing/figures";
import { Reveal } from "@/components/site/Reveal";
import { UNKNOWNS, barrierCounts } from "@/lib/platform/network";

export const metadata = {
  title: "Research standards, how StrayPaw runs a study",
  description:
    "Every StrayPaw study is hypothesis-driven, uses established population-estimation methods, reports against ICAM indicators, and is published whatever the result.",
};

/* The protocol every study follows, in the order it runs. This is the thing
   an institutional funder is actually asking to see: that there is a defined
   shape, and that the answer is not decided in advance. */
const PROTOCOL = [
  {
    n: "01",
    title: "Question",
    body: "A specific, answerable question tied to a named geography, not a theme. Registered before fieldwork begins, with the geography, timeframe and executing partner fixed.",
  },
  {
    n: "02",
    title: "Hypothesis",
    body: "A falsifiable statement with a direction and a magnitude, plus the null it is tested against. If no result could disprove it, it is not a hypothesis and does not proceed.",
  },
  {
    n: "03",
    title: "Design",
    body: "Sampling frame, unit of analysis, sample size and the reference method it will be compared against. Chosen before data collection, and published with the protocol.",
  },
  {
    n: "04",
    title: "Baseline",
    body: "The pre-intervention measurement. Without it there is no denominator, and coverage, the number that decides whether anything worked, cannot be computed at all.",
  },
  {
    n: "05",
    title: "Intervention",
    body: "Delivered by a named executing organisation against a defined protocol, with every action recorded to the individual animal rather than to a daily total.",
  },
  {
    n: "06",
    title: "Measurement",
    body: "Re-measurement using the same method as the baseline, at a stated interval, reported against indicators defined in advance.",
  },
  {
    n: "07",
    title: "Publication",
    body: "Results released whatever they show, including the protocol, the analysis and the limitations. A null result is published on the same terms as a positive one.",
  },
];

/* Methods StrayPaw uses, all established in the literature rather than
   invented here, which is the point for an institutional reviewer. */
const METHODS = [
  {
    title: "Photographic capture–recapture",
    tag: "POPULATION SIZE",
    body: "Mark–resight along fixed transects, the standard approach for estimating free-roaming dog populations. Individual identification comes from coat markings and, where animals are chipped, from the code itself.",
  },
  {
    title: "Fixed-route transect counts",
    tag: "DENSITY AND TREND",
    body: "Repeated counts along the same routes at the same time of day, giving a comparable index over time even where an absolute population estimate is not affordable.",
  },
  {
    title: "Individual-level record linkage",
    tag: "COVERAGE",
    body: "Sterilisation and vaccination status resolved to the animal rather than aggregated to a programme total, so coverage is counted rather than estimated.",
  },
  {
    title: "Reference-method validation",
    tag: "INSTRUMENT ACCURACY",
    body: "Community-reported data compared against a gold-standard count on the same ground, reporting agreement and error rather than asserting the cheaper method works.",
  },
];

export default function ResearchStandardsPage() {
  const counts = barrierCounts();

  return (
    <MarketingPage
      kicker="RESEARCH STANDARDS"
      title="A defined protocol."
      accent="Published either way."
      lede="Institutional funders do not avoid this field because they doubt the need. They avoid it because most work here cannot say what it would take to be proven wrong. Every StrayPaw study is built to be falsifiable, measured against established methods, and published whatever it finds."
      figure={<LoopFigure />}
      next={[
        { label: "For funders", href: "/for-funders", note: "How a programme gets scoped, costed and verified." },
        { label: "What is unknown", href: "/the-data", note: "The open questions, and who holds each answer." },
        { label: "Discuss a study", href: "/contact?subject=Research%20collaboration", note: "For investigators, funders and institutions." },
      ]}
    >
      <Band
        tone="paper"
        kicker="THE PROTOCOL"
        title="Seven stages, in"
        accent="this order."
      >
        <p className="mk-body">
          The order matters more than any individual stage. A hypothesis
          written after the data is not a hypothesis, and a baseline taken
          after the intervention is not a baseline, both are the ordinary way
          this field produces numbers that cannot be relied on.
        </p>
        <Steps items={PROTOCOL} />
      </Band>

      <Band
        tone="ink"
        kicker="METHODS"
        title="Established methods,"
        accent="not invented ones."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              Nothing in the StrayPaw method set is novel, and that is
              deliberate. Free-roaming dog population estimation has a
              literature; a reviewer should be able to check our approach
              against it rather than take our word for anything.
            </p>
            <p className="mk-body">
              Where we do claim something new, that community-reported data can
              approximate a formal count at a fraction of the cost. It is
              stated as a hypothesis to be validated against the reference
              method, not as a property of the product.
            </p>
          </div>
          <figure>
            <ResolveFigure />
          </figure>
        </div>

        <div className="mk-list">
          {METHODS.map((m) => (
            <Reveal key={m.title}>
              <div className="mk-row">
                <b>{m.title}</b>
                <span className="mk-tag">{m.tag}</span>
                <p>{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="INDICATORS"
        title="Measured against a"
        accent="recognised framework."
      >
        <p className="mk-body">
          Outcomes are reported against the indicator guidance published by the{" "}
          <strong>International Companion Animal Management coalition
          (ICAM)</strong>, whose monitoring-and-evaluation framework is the
          reference standard for humane dog population management. Using an
          external framework matters: it means the measure of success was not
          chosen by the people being measured.
        </p>
        <p className="mk-body">
          ICAM&rsquo;s guidance covers the impact areas a dog population
          programme is expected to move, population size and density, animal
          welfare, rabies and other zoonoses, dog bites, shelter intake and
          euthanasia, and public attitudes, with recommended measurement
          methods for each. A StrayPaw study states which of these it is
          powered to detect a change in, and which it is not.
        </p>
        <Steps
          items={[
            {
              n: "◦",
              title: "Declared in advance",
              body: "Which indicators the study measures, and the size of change it can detect, are fixed before fieldwork.",
            },
            {
              n: "◦",
              title: "Externally defined",
              body: "Indicator definitions come from ICAM's published guidance rather than from us.",
            },
            {
              n: "◦",
              title: "Scoped honestly",
              body: "A study underpowered for an outcome says so, rather than reporting a movement it cannot attribute.",
            },
          ]}
        />
      </Band>

      <Band
        tone="ink"
        kicker="GOVERNANCE"
        title="Who approves it,"
        accent="and who checks it."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Institutional review",
              body: "Studies involving animal handling run under the ethics approval of the executing partner or an academic collaborator, to the standards their institution requires. StrayPaw does not self-certify this.",
            },
            {
              n: "02",
              title: "Named investigator",
              body: "Every study has a named principal investigator accountable for the design and the analysis, and a named executing organisation accountable for the fieldwork.",
            },
            {
              n: "03",
              title: "Data protection",
              body: "Animal records carry no personal data about reporters beyond what is needed to contact them. Precise locations are restricted, because publishing exact positions of street animals creates a welfare risk.",
            },
            {
              n: "04",
              title: "Declared interests",
              body: "The funder, the executing partner and any commercial relationship are stated on the study record. StrayPaw's own interest in the result is part of that disclosure.",
            },
          ]}
        />
      </Band>

      <Band
        tone="paper"
        kicker="PUBLICATION"
        title="Null results,"
        accent="published the same way."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              A funder&rsquo;s real risk in this sector is not that the work
              fails. It is that failure goes unreported, so the next programme
              repeats it. Publishing a null result is the cheapest thing that
              breaks that cycle.
            </p>
            <p className="mk-body">
              A study protocol is registered before fieldwork starts, so the
              analysis plan is on record whichever way the result goes. What
              the study could not show is reported alongside what it did.
            </p>
          </div>
          <div className="mk-stats" style={{ marginTop: 0 }}>
            <Stat
              value={String(counts.total)}
              label="Open questions in the evidence register"
              source="Each with a named holder and a stated route to resolution"
            />
            <Stat
              value={String(counts.withheld)}
              label="Answerable by disclosure, not new fieldwork"
              source="The cheapest research in this field is asking for what already exists"
            />
          </div>
        </div>

        <div className="mk-list">
          {[
            ["Protocol published before fieldwork", "Design, hypothesis and analysis plan fixed in advance and public."],
            ["Results published regardless of outcome", "A null result is released on the same terms as a positive one."],
            ["Limitations stated by us, not found by reviewers", "What the study cannot show is part of the study."],
            ["Underlying data available to the funder", "Aggregated openly; individual records available for verification."],
          ].map(([t, d]) => (
            <Reveal key={t}>
              <div className="mk-row">
                <b>{t}</b>
                <span className="mk-tag">COMMITMENT</span>
                <p>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Band>
    </MarketingPage>
  );
}
