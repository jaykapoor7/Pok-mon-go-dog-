import Link from "next/link";
import { MarketingPage, Band, Steps } from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Data governance, StrayPaw",
  description:
    "What StrayPaw collects, what stays private, how long it is kept, and how to have something removed. Written in plain language against the DPDP Act, 2023.",
};

/* Institutional buyers ask for this before they ask about features, and a
   resident deserves it without having to ask at all. It describes what the
   product actually does today; anything not yet true is not listed here. */
export default function DataGovernancePage() {
  return (
    <MarketingPage
      title="What we hold,"
      accent="and what we don't."
      lede="StrayPaw is a public record of animals, not of people. This page says plainly what is collected, what is never published, how long it is kept and how to have something taken down. It is written against the Digital Personal Data Protection Act, 2023."
      next={[
        { label: "Read the privacy policy", href: "/privacy", note: "The formal version of this page." },
        { label: "Ask for a removal", href: "/report-content", note: "Flag a photo or record for review." },
        { label: "Talk to us", href: "/contact?subject=Data%20governance%20question", note: "For procurement and compliance questions." },
      ]}
    >
      <Band tone="paper" title="The animal is public." accent="The person is not.">
        <Steps
          items={[
            { n: "01", title: "Published", body: "The animal's record: photographs of the animal, an approximate locality, the case history, care given and the outcome. This is the point of the register." },
            { n: "02", title: "Approximate by design", body: "Locations are shown at locality precision, not as an exact pin, and structured data carries the locality only. A precise, machine-readable location for a living animal is not published." },
            { n: "03", title: "Never published", body: "Reporter names and email addresses, account identifiers, and an organisation's internal operational detail such as staff pay, rent or raw source workbooks. These are readable only by the service itself, enforced in the database rather than only in the interface." },
            { n: "04", title: "Not collected at all", body: "No advertising identifiers, no cross-site tracking, no third-party analytics tags. Product counts are first-party, carry no personal data, and honour Do Not Track." },
          ]}
        />
      </Band>

      <Band tone="bone" title="A street photograph" accent="can contain a person.">
        <p className="mk-body">
          A sighting photograph is taken in public and can include people who
          never chose to be on a public map. The report flow offers redaction
          before anything is published, so identifiable people can be obscured
          at the point of upload rather than after the fact, and the reporter
          is told in plain words that the photograph becomes part of a public
          record.
        </p>
      </Band>

      <Band tone="paper" title="A record is kept." accent="A person can leave.">
        <Steps
          items={[
            { n: "01", title: "Animal records persist", body: "The register's value is continuity: an animal's history has to outlast the people who recorded it, and corrections are appended rather than overwritten so the history stays auditable." },
            { n: "02", title: "Your own report", body: "The device that filed a sighting holds a token that lets it withdraw that sighting." },
            { n: "03", title: "Removal requests", body: "Anyone can ask for a photograph or a record to be reviewed and taken down, including a person who appears in a photograph they did not consent to. Requests go through the report-content route and are handled by a human." },
            { n: "04", title: "Accounts", body: "An account can be closed on request; the animal records it contributed remain, because they describe animals rather than the person who filed them." },
          ]}
        />
        <p className="mk-body">
          For a takedown, use <Link href="/report-content">report content</Link>.
          For anything else, including procurement and compliance review,{" "}
          <Link href="/contact?subject=Data%20governance%20question">contact us</Link>.
        </p>
      </Band>
    </MarketingPage>
  );
}
