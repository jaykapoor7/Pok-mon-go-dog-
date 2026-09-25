import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";
import { LoopFigure, ResolveFigure } from "@/components/marketing/figures";
import { barrierCounts } from "@/lib/platform/network";

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
      title="A defined protocol."
      accent="Published either way."
      lede="Funders avoid this field because most work in it cannot say what would prove it wrong. Every StrayPaw study is falsifiable, measured against established methods, and published either way."
      figure={<LoopFigure />}
      next={[
        { label: "For funders", href: "/for-funders", note: "How a programme gets scoped, costed and verified." },
        { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
        { label: "Discuss a study", href: "/contact?subject=Research%20collaboration", note: "For investigators, funders and institutions." },
      ]}
    >
      <Band
        tone="paper"
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
          </div>
          <figure>
            <ResolveFigure />
          </figure>
        </div>

        <div className="mk-list">
          {METHODS.map((m) => (
            <div key={m.title} className="mk-row">
              <b>{m.title}</b>
              <span className="mk-tag">{m.tag}</span>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </Band>

      <Band
        tone="ink"
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
          </div>
        </div>

        <div className="mk-list">
          {[
            ["Protocol published before fieldwork", "Design, hypothesis and analysis plan fixed in advance and public."],
            ["Results published regardless of outcome", "A null result is released on the same terms as a positive one."],
            ["Limitations stated by us, not found by reviewers", "What the study cannot show is part of the study."],
            ["Underlying data available to the funder", "Aggregated openly; individual records available for verification."],
          ].map(([t, d]) => (
            <div key={t} className="mk-row">
              <b>{t}</b>
              <span className="mk-tag">COMMITMENT</span>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </Band>
    </MarketingPage>
  );
}
