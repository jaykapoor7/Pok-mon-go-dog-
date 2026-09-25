import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";
import { FundingFigure } from "@/components/marketing/figures";

export const metadata = {
  title: "For funders, fund an outcome, not a hope",
  description:
    "Turn a CSR or grant budget into a scoped study, a named executing partner, a real unit cost and a measurable finish line.",
};

export default function ForFundersPage() {

  return (
    <MarketingPage
      title="Fund an outcome,"
      accent="not a hope."
      lede="Most animal-welfare giving buys activity: a number of surgeries, a number of camps. What it rarely buys is the ability to say afterwards whether the population actually changed. That is a measurement problem, and it is fixable."
      figure={<FundingFigure />}
      next={[
        { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
        { label: "How we run a study", href: "/research-standards", note: "Protocol, methods, indicators and what we publish." },
        { label: "Start a conversation", href: "/contact?subject=Fund%20a%20programme", note: "Tell us the geography and the objective." },
      ]}
    >
      <Band
        tone="paper"
        title="Activity is easy to buy."
        accent="Change is not."
      >
        <p className="mk-body">
          Sterilisation only reduces a population if it clears a coverage
          threshold in a defined area. Below it, animals are replaced faster
          than they are treated: real welfare benefit for individual dogs, no
          population effect. Both outcomes are reported the same way, as a
          count of surgeries.
        </p>

      </Band>

      <Band
        tone="ink"
        title="A question, a partner,"
        accent="and a finish line."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Define",
              body: "You bring an objective and a geography. We turn it into a scoped question with a real denominator, or, where none exists, a baseline study to establish one first.",
            },
            {
              n: "02",
              title: "Cost",
              body: "Unit costs are published and sourced, not quoted. You see the arithmetic: animals, rate, duration, field teams, before anything is committed.",
            },
            {
              n: "03",
              title: "Execute",
              body: "A named local organisation does the fieldwork. The study design, the data tooling and the record layer come from StrayPaw.",
            },
            {
              n: "04",
              title: "Verify",
              body: "Outcomes post to the animal records as they happen. At the end you get coverage measured against the baseline, not a count of activity.",
            },
          ]}
        />
      </Band>

      <Band
        tone="bone"
        title="A number you could defend"
        accent="to an auditor."
      >
        <p className="mk-body">
          Every figure in a StrayPaw programme carries its source, its year
          and its confidence, so an auditor can trace any of them back. Where a
          number does not exist, the register names who would hold it, and the
          proposal costs the study that would produce it.
        </p>
        <Steps
          items={[
            { n: "◦", title: "Sourced", body: "Population, coverage and unit cost each cite a published origin and year." },
            { n: "◦", title: "Scoped", body: "Ward-level geography where it exists; an explicit share of a state where it does not." },
            { n: "◦", title: "Attributable", body: "Outcomes tie to the animals your funding actually reached." },
          ]}
        />
      </Band>
    </MarketingPage>
  );
}
