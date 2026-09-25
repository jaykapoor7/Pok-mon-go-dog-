import Link from "next/link";
import { MarketingPage, Band } from "@/components/marketing/MarketingPage";
import { getOperationalPartners } from "@/lib/partners";

export const metadata = {
  title: "About StrayPaw",
  description:
    "What StrayPaw is, how it is run, and how its records are kept: one shared record connecting sightings, field work and outcomes for India's street animals.",
};

export const dynamic = "force-dynamic";

/* Who keeps the record, stated as facts only. Nothing is shown here that
   has not been confirmed; questions the page cannot answer go to contact. */
export default async function AboutPage() {
  const partners = await getOperationalPartners();

  return (
    <MarketingPage
      title="Who keeps"
      accent="the record."
      lede="StrayPaw is one shared record connecting sightings, field work and outcomes for India's street animals. Residents report what they see, field teams work the cases, and what was done stays attached to the animal."
      next={[
        { label: "The register, counted", href: "/insights", note: "Every figure counted from the live record." },
        { label: "Why this exists", href: "/mission", note: "What the record is for, and its rules." },
        { label: "Contact", href: "/contact?subject=About%20StrayPaw", note: "Partnerships, press, registration and procurement." },
      ]}
    >
      <Band tone="paper" title="How it" accent="is run.">
        <ul className="mk-list">
          <li><b>Independent.</b> StrayPaw does not do field work, compete for grants or sit between an organisation and its funders.</li>
          <li><b>Free for organisations.</b> Verified animal-welfare organisations use the workspace at no cost.</li>
          <li><b>Records stay with the team.</b> Each organisation&apos;s workspace is private to its verified members; what it publishes is its choice.</li>
          <li><b>Public by default for animals, never for people.</b> The animal&apos;s record is open; the person who reported it is not.</li>
        </ul>
        <p className="mk-body">
          For registration, governance or procurement questions,{" "}
          <Link href="/contact?subject=Registration%20and%20governance">write to us</Link>.
        </p>
      </Band>

      <Band tone="paper" title="The teams" accent="doing the work.">
        {partners.length ? (
          <>
            <p className="mk-body">
              The organisations keeping their records on StrayPaw.
            </p>
            <ul className="mk-list">
              {partners.map((p) => (
                <li key={p.id}>
                  <b>{p.name}</b>
                  {p.city ? ` — ${p.city}${p.state ? `, ${p.state}` : ""}` : ""}
                  {p.mission ? `. ${p.mission}` : ""}
                </li>
              ))}
            </ul>
            <p className="mk-body">
              <Link href="/partners">All operational partners</Link> ·{" "}
              <Link href="/for-ngos">Bring your team&apos;s records in</Link>
            </p>
          </>
        ) : (
          <p className="mk-body">
            Partner organisations appear here as each one comes on to the
            register. <Link href="/for-ngos">Partnering is free for verified
            animal-welfare organisations</Link>.
          </p>
        )}
      </Band>

      <Band tone="bone" title="Privacy," accent="in short.">
        <p className="mk-body">
          The animal is public; the person is not. Reporter names and email
          addresses are never published, locations are shown at locality
          precision rather than as an exact pin, and no third-party tracking
          runs on this site. The full posture, including retention and how to
          have something removed, is on{" "}
          <Link href="/data-governance">data governance</Link>.
        </p>
      </Band>
    </MarketingPage>
  );
}
