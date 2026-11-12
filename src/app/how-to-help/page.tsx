import { Band, Figure, NextLinks, PageHead, Rows, S4Page, Steps, TwoTone } from "@/sp4/site/kit";
import { ResolveFigure, LoopFigure } from "@/sp4/site/figures";
import { ORGS, statesWithOrgs } from "@/lib/platform/orgs";
import { STATE_BY_CODE } from "@/lib/platform/geography";
import { UNIT_COSTS, inr } from "@/lib/platform/network";
import "@/sp4/home/home4.css";

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
    href: "/community/report",
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
    cta: "See the Field Workspace",
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
    <S4Page close={false}>
      <PageHead back
        title={<TwoTone a="Four ways in." b="Start with any." />}
        lede="Most people want to help and stop at not knowing what would actually make a difference. These are the four things that do, ordered by how much they ask of you."
      />
      <div className="s4-wrap"><Figure><ResolveFigure /></Figure></div>

      <Band title={<TwoTone a="What actually" b="moves the needle." />}>
        <Rows items={WAYS.map((w) => ({ t: w.title, tag: w.tag, d: w.body, link: { href: w.href, label: w.cta } }))} />
      </Band>

      <Band dark title={<TwoTone a="One report is not" b="a drop in the ocean." />}>
        <div className="s4-split2">
          <div className="s4-prose">
            <p>
              Reporting can feel pointless, one dog among millions. It is not,
              because the thing being built is a denominator. Coverage is a
              fraction, and without a count of what is there the numerator means
              nothing. Every sighting makes the bottom of that fraction real.
            </p>
          </div>
          <Figure><LoopFigure /></Figure>
        </div>
      </Band>

      <Band title={<TwoTone a="Two things that feel" b="helpful and are not." />}>
        <Steps
          items={[
            {
              t: "Relocating a dog",
              d: "Territorial animals return, or die trying. Removing one opens the territory to an unsterilised animal from outside, which is why the ABC Rules require release at the point of capture.",
            },
            {
              t: "Feeding without recording",
              d: "Feeding is genuinely valuable, caregivers know their animals better than anyone. Logging who you feed turns that knowledge into a record a vet or an ABC team can use.",
            },
          ]}
        />
      </Band>

      <NextLinks
        items={[
          { label: "Report an animal", href: "/community/report", note: "The fastest way to contribute something real." },
          { label: "Find a volunteering route", href: "/get-involved", note: `${ORGS.length} organisations across ${states.length} states and union territories.` },
          { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
        ]}
      />
    </S4Page>
  );
}
