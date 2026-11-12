import { Band, Figure, NextLinks, PageHead, S4Page, Steps, TwoTone } from "@/sp4/site/kit";
import { ResolveFigure } from "@/sp4/site/figures";
import "@/sp4/home/home4.css";

export const metadata = {
  title: "The network, StrayPaw",
  description:
    "How a sighting becomes an identified animal, and how that identity connects sightings, interventions, caregivers and outcomes across organisations.",
};

export default function TheNetworkPage() {

  return (
    <S4Page close={false}>
      <PageHead back
        title={<TwoTone a="One animal." b="One record." />}
        lede="A sighting on its own is an anecdote. The network is what turns scattered observations into a single animal with a history, one that survives the rescue, the handover, and the change of organisation."
      />
      <div className="s4-wrap"><Figure><ResolveFigure /></Figure></div>

      <Band title={<TwoTone a="From a photo to a" b="permanent identity." />}>
        <Steps
          items={[
            {
              t: "Signal",
              d: "Someone reports an animal: a photo, a place, a condition. That is all it takes to open a record.",
            },
            {
              t: "Corroboration",
              d: "Repeat sightings in the same area, matching appearance, get proposed as the same animal. Confirmation is a human decision, not an automatic merge.",
            },
            {
              t: "Identity",
              d: "Once chipped, the animal carries a 15-digit ISO code. Every entry after that attaches to the code, so the history holds across clinics and organisations.",
            },
            {
              t: "Outcome",
              d: "Sterilisation, vaccination, treatment and release all post back to the same record, with who did it and when. That is what makes coverage countable.",
            },
          ]}
        />
      </Band>

      <Band dark title={<TwoTone a="A record that only one org" b="can read is not a record." />}>
        <div className="s4-prose">
          <p>
            Street animals do not respect organisational boundaries. The dog
            one group sterilises is the dog another group treats for mange
            and a third feeds every evening. If each keeps its own notebook,
            the animal has three partial histories and nobody has the whole one.
          </p>
        </div>
      </Band>

      <Band title={<TwoTone a="Everything an intervention" b="needs to be judged." />}>
        <div className="s4-prose">
          <p>
            A closed record answers four questions, and it is not closed until it
            answers all four: where it happened, how many animals were actually
            treated rather than targeted, who paid, and who verified it. That is
            the difference between a report and evidence.
          </p>
        </div>
        <Steps
          plain
          items={[
            { t: "Geography", d: "Where the work happened, at ward resolution rather than city totals." },
            { t: "Reach", d: "Animals treated, not animals planned for." },
            { t: "Funding", d: "The amount, and the funder behind it." },
            { t: "Verification", d: "Who checked the outcome, and when." },
          ]}
        />
      </Band>

      <NextLinks
        items={[
          { label: "For NGOs", href: "/for-ngos", note: "The Field Workspace your team would run on." },
          { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
          { label: "Open the map", href: "/community", note: "See the live record layer." },
        ]}
      />
    </S4Page>
  );
}
