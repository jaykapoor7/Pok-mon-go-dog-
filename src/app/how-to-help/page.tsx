import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { ResolveFigure, LoopFigure } from "@/components/marketing/figures";
import { Reveal } from "@/components/site/Reveal";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ORGS, statesWithOrgs } from "@/lib/platform/orgs";
import { STATE_BY_CODE } from "@/lib/platform/geography";
import { UNIT_COSTS, inr } from "@/lib/platform/network";

export const metadata = {
  title: "How you can help, StrayPaw",
  description:
    "Whether you have thirty seconds, a free weekend, an organisation or a budget: the specific thing that helps, and where it goes.",
};

const stateName = (code: string) => STATE_BY_CODE.get(code)?.name ?? code;

/* Ordered by effort, smallest first. Someone who can only do the first thing
   should not have to read past it. */
const WAYS = [
  {
    tag: "THIRTY SECONDS",
    title: "Report an animal you walk past",
    body: "A photo and a location is all a report needs. Most streets in India have no record of either.",
    cta: "Report a sighting",
    href: "/report",
  },
  {
    tag: "AN HOUR A WEEK",
    title: "Volunteer with an organisation near you",
    body: "Feeding rounds, shelter care, ABC camp support, fostering, transport. Filtered by the work you want to do and the state you are in, and you contact the organisation directly.",
    cta: "Find a route",
    href: "/get-involved",
  },
  {
    tag: "IF YOU RUN AN ORGANISATION",
    title: "Bring your records onto the map",
    body: "Cases, animal registry, medical logs and reporting, free for verified organisations, and your data stays yours. Paper registers and WhatsApp threads can be imported as they are.",
    cta: "See the workspace",
    href: "/for-ngos",
  },
  {
    tag: "IF YOU HOLD A BUDGET",
    title: "Fund a programme with a finish line",
    body: `Pick a geography and an objective and get the real arithmetic: animals, rate, duration. Sterilisation runs at ${inr(UNIT_COSTS.sterilisation.value)} per animal against the AWBI ceiling.`,
    cta: "Scope and cost one",
    href: "/for-funders",
  },
];

export default function HowToHelpPage() {
  const states = statesWithOrgs(stateName);

  return (
    <MarketingPage
      kicker="HOW YOU CAN HELP"
      title="Four ways in."
      accent="Start with any."
      lede="Most people want to help and stop at not knowing what would actually make a difference. These are the four things that do, ordered by how much they ask of you."
      figure={<ResolveFigure />}
      next={[
        { label: "Report an animal", href: "/report", note: "The fastest way to contribute something real." },
        { label: "Find a volunteering route", href: "/get-involved", note: `${ORGS.length} organisations across ${states.length} states.` },
        { label: "See what is missing", href: "/the-data", note: "Where the gaps are, and who holds the numbers." },
      ]}
    >
      <Band tone="paper" kicker="PICK ONE" title="What actually" accent="moves the needle.">
        <div className="mk-list">
          {WAYS.map((w) => (
            <Reveal key={w.href}>
              <div className="mk-row">
                <b>{w.title}</b>
                <span className="mk-tag">{w.tag}</span>
                <p>{w.body}</p>
                <Link href={w.href} className="sp-link" style={{ marginTop: 12 }}>
                  {w.cta} <ArrowUpRight size={14} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </Band>

      <Band
        tone="ink"
        kicker="WHY A SIGHTING COUNTS"
        title="One report is not"
        accent="a drop in the ocean."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              Reporting can feel pointless, one dog among millions. It is not,
              because the thing being built is a denominator. Coverage is a
              fraction, and without a count of what is there the numerator means
              nothing. Every sighting makes the bottom of that fraction real.
            </p>
            <p className="mk-body">
              A sterilisation programme cannot be judged without knowing how
              many animals were in the area to begin with. That is why most
              programmes in India cannot prove what they achieved, and why the
              least glamorous contribution, noticing an animal and logging it,
              is the one the rest depends on.
            </p>
          </div>
          <figure>
            <LoopFigure />
          </figure>
        </div>

        <div className="mk-stats">
          <Stat
            value={String(ORGS.length)}
            label="Organisations you can reach directly"
            source="StrayPaw directory, each verified against a public presence"
          />
          <Stat
            value={String(states.length)}
            label="States with a listed organisation"
            source="Filterable by the kind of work you want to do"
          />
          <Stat
            value={inr(UNIT_COSTS.sterilisation.value)}
            label="Cost of one sterilisation"
            source={`${UNIT_COSTS.sterilisation.source} (${UNIT_COSTS.sterilisation.year})`}
          />
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="WHAT NOT TO DO"
        title="Two things that feel"
        accent="helpful and are not."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Relocating a dog",
              body: "Territorial animals return, or die trying. Removing one opens the territory to an unsterilised animal from outside, which is why the ABC Rules require release at the point of capture.",
            },
            {
              n: "02",
              title: "Feeding without recording",
              body: "Feeding is genuinely valuable, caregivers know their animals better than anyone. Logging who you feed turns that knowledge into a record a vet or an ABC team can use.",
            },
          ]}
        />
      </Band>
    </MarketingPage>
  );
}
