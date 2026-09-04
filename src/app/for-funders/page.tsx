import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { FundingFigure } from "@/components/marketing/figures";
import { UNIT_COSTS, COVERAGE_TARGET, inr } from "@/lib/platform/network";

export const metadata = {
  title: "For funders — fund an outcome, not a hope",
  description:
    "Turn a CSR or grant budget into a scoped study, a named executing partner, a real unit cost and a measurable finish line.",
};

export default function ForFundersPage() {
  const ster = UNIT_COSTS.sterilisation;
  const vacc = UNIT_COSTS.vaccination;

  return (
    <MarketingPage
      kicker="FOR FUNDERS AND CSR TEAMS"
      title="Fund an outcome,"
      accent="not a hope."
      lede="Most animal-welfare giving buys activity: a number of surgeries, a number of camps. What it rarely buys is the ability to say afterwards whether the population actually changed. That is a measurement problem, and it is fixable."
      figure={<FundingFigure />}
      next={[
        { label: "Scope and cost a programme", href: "/what-would-it-take", note: "Pick a state and an objective; get real numbers." },
        { label: "How we run a study", href: "/research-standards", note: "Protocol, methods, indicators and what we publish." },
        { label: "Start a conversation", href: "/contact?subject=Fund%20a%20programme", note: "Tell us the geography and the objective." },
      ]}
    >
      <Band
        tone="paper"
        kicker="THE PROBLEM WITH MOST GIVING"
        title="Activity is easy to buy."
        accent="Change is not."
      >
        <p className="mk-body">
          Sterilisation only reduces a population if it clears a coverage
          threshold in a defined area. Below that threshold the animals you
          treat are replaced faster than you treat them, and the money produces
          real welfare benefit for individual dogs but no population effect at
          all. Both outcomes get reported the same way: as a count of surgeries.
        </p>
        <p className="mk-body">
          The distinction requires knowing the denominator — how many animals
          are in the area — and being able to check coverage afterwards. Neither
          is available for most of India today, which is why so much sincere
          funding cannot demonstrate what it achieved.
        </p>

        <div className="mk-stats">
          <Stat
            value={inr(ster.value)}
            label={`Per sterilisation — ${ster.unit}`}
            source={`${ster.source} (${ster.year})`}
          />
          <Stat
            value={inr(vacc.value)}
            label={`Per vaccination — ${vacc.unit}`}
            source={`${vacc.source} (${vacc.year})`}
          />
          <Stat
            value={`${Math.round(COVERAGE_TARGET.value * 100)}%`}
            label="Coverage threshold for population effect"
            source={COVERAGE_TARGET.source}
          />
        </div>
      </Band>

      <Band
        tone="ink"
        kicker="HOW A STRAYPAW PROGRAMME RUNS"
        title="A question, a partner,"
        accent="and a finish line."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Define",
              body: "You bring an objective and a geography. We turn it into a scoped question with a real denominator — or, where none exists, a baseline study to establish one first.",
            },
            {
              n: "02",
              title: "Cost",
              body: "Unit costs are published and sourced, not quoted. You see the arithmetic: animals, rate, duration, field teams, before anything is committed.",
            },
            {
              n: "03",
              title: "Execute",
              body: "A named local organisation does the fieldwork. StrayPaw supplies the study design, the data tooling and the record layer — we do not compete with the people doing the work.",
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
        kicker="WHAT YOU GET THAT YOU CANNOT GET TODAY"
        title="A number you could defend"
        accent="to an auditor."
      >
        <p className="mk-body">
          Every figure in a StrayPaw programme carries its source, its year and
          its confidence. Where a number does not exist, the register says so
          rather than estimating — because a plan built on an invented
          denominator is not a plan. That honesty is the point: it is what makes
          the numbers that <em>are</em> there worth trusting.
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
