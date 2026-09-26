import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";
import { ResolveFigure } from "@/components/marketing/figures";

export const metadata = {
  title: "The network, one animal, one record",
  description:
    "How a sighting becomes an identified animal, and how that identity connects sightings, interventions, caregivers and outcomes across organisations.",
};

export default function TheNetworkPage() {

  return (
    <MarketingPage
      title="One animal."
      accent="One record."
      lede="A sighting on its own is an anecdote. The network is what turns scattered observations into a single animal with a history, one that survives the rescue, the handover, and the change of organisation."
      figure={<ResolveFigure />}
      next={[
        { label: "For NGOs", href: "/for-ngos", note: "The Field Workspace your team would run on." },
        { label: "Why this exists", href: "/evidence", note: "What is published, and what is missing." },
        { label: "Open the map", href: "/map", note: "See the live record layer." },
      ]}
    >
      <Band
        tone="paper"
        title="From a photo to a"
        accent="permanent identity."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Signal",
              body: "Someone reports an animal: a photo, a place, a condition. That is all it takes to open a record.",
            },
            {
              n: "02",
              title: "Corroboration",
              body: "Repeat sightings in the same area, matching appearance, get proposed as the same animal. Confirmation is a human decision, not an automatic merge.",
            },
            {
              n: "03",
              title: "Identity",
              body: "Once chipped, the animal carries a 15-digit ISO code. Every entry after that attaches to the code, so the history holds across clinics and organisations.",
            },
            {
              n: "04",
              title: "Outcome",
              body: "Sterilisation, vaccination, treatment and release all post back to the same record, with who did it and when. That is what makes coverage countable.",
            },
          ]}
        />
      </Band>

      <Band
        tone="ink"
        title="A record that only one org"
        accent="can read is not a record."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              Street animals do not respect organisational boundaries. The dog
              one group sterilises is the dog another group treats for mange
              and a third feeds every evening. If each keeps its own notebook,
              the animal has three partial histories and nobody has the whole one.
            </p>
          </div>
        </div>
      </Band>

      <Band
        tone="bone"
        title="Everything an intervention"
        accent="needs to be judged."
      >
        <p className="mk-body">
          A closed record answers four questions, and it is not closed until it
          answers all four: where it happened, how many animals were actually
          treated rather than targeted, who paid, and who verified it. That is
          the difference between a report and evidence.
        </p>
        <Steps
          items={[
            { n: "◦", title: "Geography", body: "Where the work happened, at ward resolution rather than city totals." },
            { n: "◦", title: "Reach", body: "Animals treated, not animals planned for." },
            { n: "◦", title: "Funding", body: "The amount, and the funder behind it." },
            { n: "◦", title: "Verification", body: "Who checked the outcome, and when." },
          ]}
        />
      </Band>
    </MarketingPage>
  );
}
