import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { ResolveFigure } from "@/components/marketing/figures";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";

export const metadata = {
  title: "The network — one animal, one record",
  description:
    "How a sighting becomes an identified animal, and how that identity connects sightings, interventions, caregivers and outcomes across organisations.",
};

export default function TheNetworkPage() {
  const states = new Set(ORGS.map((o) => o.stateCode).filter(Boolean));

  return (
    <MarketingPage
      kicker="THE NETWORK"
      title="One animal."
      accent="One record."
      lede="A sighting on its own is an anecdote. The network is what turns scattered observations into a single animal with a history — one that survives the rescue, the handover, and the change of organisation."
      figure={<ResolveFigure />}
      next={[
        { label: "For NGOs", href: "/for-ngos", note: "The workspace your team would actually run on." },
        { label: "The data", href: "/the-data", note: "What the network already knows, state by state." },
        { label: "Open the map", href: "/map", note: "See the live record layer." },
      ]}
    >
      <Band
        tone="paper"
        kicker="HOW A RECORD FORMS"
        title="From a photo to a"
        accent="permanent identity."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Signal",
              body: "Someone reports an animal — a photo, a place, a condition. That is the whole barrier to entry, and it is deliberately that low.",
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
        kicker="WHY IT HAS TO BE SHARED"
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
            <p className="mk-body">
              StrayPaw is the shared layer, not a replacement for any of them.
              Organisations keep their own workflow, their own cases and their
              own data; what they gain is that the animal stays identifiable
              when it moves between them.
            </p>
          </div>
          <div className="mk-stats" style={{ marginTop: 0 }}>
            <Stat
              value={String(ORGS.length)}
              label="Named organisations in the directory"
              source="StrayPaw organisation register — each entry verified against a public presence"
            />
            <Stat
              value={`${states.size}`}
              label="States with at least one listed organisation"
              source={`Across ${STATES.length} states and union territories covered`}
            />
          </div>
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="WHAT THE RECORD CARRIES"
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
