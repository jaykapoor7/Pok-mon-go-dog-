import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";
import { ResolveFigure } from "@/components/marketing/figures";
import { PartnerProof } from "@/components/marketing/PartnerProof";

export const metadata = {
  title: "For NGOs, better tools, same fieldwork",
  description:
    "Case management, an animal registry, medical tracking and a durable record of the work your team already does. Free for verified organisations.",
};

export default function ForNgosPage() {
  return (
    <MarketingPage
      title="Better tools."
      accent="Same fieldwork."
      lede="You already know how to run a catch, a surgery, a release. What usually breaks is everything around it: which animal this was, what was done last time, and how to show a funder any of it six months later."
      figure={<ResolveFigure />}
      next={[
        { label: "See public evidence", href: "/stories", note: "See how rescue, care, follow-up and outcomes stay attached to one animal." },
        { label: "Apply to partner", href: "/partner-apply", note: "Verification is free for animal-welfare organisations." },
        { label: "Already have access?", href: "/join", note: "Use the code issued to your organisation or team." },
      ]}
    >
      <Band tone="paper" title="The parts nobody funds," accent="but everybody needs.">
        <Steps
          items={[
            { n: "01", title: "Cases", body: "Community reports and team intakes become one working queue with assignment, follow-up and outcomes." },
            { n: "02", title: "Animal registry", body: "A durable StrayPaw identity keeps photos, locality, source IDs, cases and care history attached to the same animal." },
            { n: "03", title: "Care & projects", body: "Treatment, vaccination, ABC and flexible programme registers stay searchable instead of disappearing into separate sheets." },
            { n: "04", title: "Evidence", body: "Operational analytics, map patterns, evidence workbooks and government-ready reports come from the records your team already keeps." },
          ]}
        />
      </Band>

      <Band tone="ink" title="We do not want to run" accent="your programme.">
        <div className="mk-split">
          <div>
            <p className="mk-body">StrayPaw does not do fieldwork, compete for your grants, or sit between you and your funders. Local knowledge stays with the team doing the work.</p>
          </div>
        </div>
      </Band>

      <Band tone="bone" title="See the evidence." accent="Then bring your records.">
        <p className="mk-body">The public map, animal profiles and rescue stories are open to inspect. The NGO workspace is private because it contains operational records, imports, follow-ups and team activity.</p>
        <Steps
          items={[
            { n: "01", title: "See the public side", body: "Look at the map, animal histories, care records and outcomes to understand how field work becomes traceable evidence." },
            { n: "02", title: "Apply", body: "Tell us who you are and what area you cover. Verified organisations receive workspace access." },
            { n: "03", title: "Bring your records", body: "Inside the workspace, upload the spreadsheets and registers you already use. StrayPaw maps their sheets before anything is staged." },
          ]}
        />
        <PartnerProof />
      </Band>
    </MarketingPage>
  );
}
