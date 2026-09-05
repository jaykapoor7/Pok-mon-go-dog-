import {
  MarketingPage,
  Band,
  Steps,
  Stat,
} from "@/components/marketing/MarketingPage";
import { ResolveFigure } from "@/components/marketing/figures";
import { ORGS } from "@/lib/platform/orgs";

export const metadata = {
  title: "For NGOs, better tools, same fieldwork",
  description:
    "Case management, an animal registry, medical tracking and a durable record of the work your team already does. Free for verified organisations.",
};

export default function ForNgosPage() {
  return (
    <MarketingPage
      kicker="FOR NGOS AND FIELD TEAMS"
      title="Better tools."
      accent="Same fieldwork."
      lede="You already know how to run a catch, a surgery, a release. What usually breaks is everything around it: which animal this was, what was done last time, and how to show a funder any of it six months later."
      figure={<ResolveFigure />}
      next={[
        { label: "Open the workspace", href: "/partner/cases", note: "Look around it now, no account needed." },
        { label: "Apply to partner", href: "/partner-apply", note: "Verification is free for animal-welfare organisations." },
        { label: "Bring your records", href: "/partner/import", note: "Paper registers and WhatsApp threads, imported as they are." },
      ]}
    >
      <Band
        tone="paper"
        kicker="WHAT IT DOES"
        title="The parts nobody funds,"
        accent="but everybody needs."
      >
        <Steps
          items={[
            {
              n: "01",
              title: "Cases",
              body: "Community reports land in one queue sorted by severity. Claim, assign, work and resolve, with an activity timeline and follow-ups on every case.",
            },
            {
              n: "02",
              title: "Animal registry",
              body: "A living record per animal: identity, photos, location, medical history. It stays attached to the animal rather than to whoever saw it last.",
            },
            {
              n: "03",
              title: "Medical",
              body: "Vaccinations, deworming, sterilisations and wound care logged once. Coverage and herd-immunity figures are worked out for you.",
            },
            {
              n: "04",
              title: "Reporting",
              body: "The numbers a funder asks for, produced from the work you already recorded. Instead of reconstructed from memory at the end of a grant.",
            },
          ]}
        />
      </Band>

      <Band
        tone="ink"
        kicker="WHAT IT IS NOT"
        title="We do not want to run"
        accent="your programme."
      >
        <div className="mk-split">
          <div>
            <p className="mk-body">
              StrayPaw does not do fieldwork, does not compete for your grants,
              and does not sit between you and your funders. Local knowledge is
              the part that cannot be built remotely, and it is the part you
              already have.
            </p>
            <p className="mk-body">
              What we build is the layer underneath. Identity, records,
              measurement, so that the work you do is legible to the next
              organisation that meets the same animal, and provable to whoever
              paid for it.
            </p>
            <p className="mk-body">
              Your data stays yours. Case records resolve per organisation, so
              you see your own and nobody else&rsquo;s.
            </p>
          </div>
          <div className="mk-stats" style={{ marginTop: 0 }}>
            <Stat
              value={String(ORGS.length)}
              label="Organisations in the public directory"
              source="Each entry verified against a public presence, with contact and coverage area"
            />
            <Stat
              value="Free"
              label="For verified animal-welfare organisations"
              source="Verification exists to protect animal records, not to gate the product"
            />
          </div>
        </div>
      </Band>

      <Band
        tone="bone"
        kicker="GETTING STARTED"
        title="Look first."
        accent="Apply if it fits."
      >
        <p className="mk-body">
          The workspace is open to browse without an account, you can see
          exactly what your team would be working in before committing to
          anything. Case records stay empty until you sign in with a verified
          organisation account, at which point your own data populates it.
        </p>
        <Steps
          items={[
            { n: "01", title: "Look around", body: "Open the workspace and walk through cases, animals, field ops and medical." },
            { n: "02", title: "Apply", body: "Tell us who you are and what area you cover. We review every application personally." },
            { n: "03", title: "Bring your records", body: "Paper registers and WhatsApp logs can be imported, that is how most organisations arrive." },
          ]}
        />
      </Band>
    </MarketingPage>
  );
}
